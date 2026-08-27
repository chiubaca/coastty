import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { aboutApp, apps, desktopApps } from "../apps/registry";
import { PlaybackCommand } from "../radio/playback";
import { playbackCommandAtom } from "../radio/playback-atoms";
import { usePlaybackLifecycle } from "../radio/playback-lifecycle";
import { CoasttyText } from "../ui/coastty-text";
import { themeOrder, themes, useTheme } from "../ui/theme";
import { focusedAppIdAtom, windowManagerAtom, windowsAtom, WindowCommand } from "./window-manager";
import { WindowFrame } from "./window-frame";
import { DesktopWallpaper } from "./desktop-wallpaper";
import { DESKTOP_ICON_HEIGHT, DESKTOP_ICON_WIDTH, DesktopIcon, desktopIconPosition } from "./desktop-icon";

// Desktop interaction and menu layout constants.
const DOUBLE_CLICK_MS = 350;
const SETTINGS_MENU_WIDTH = 20;
const DESKTOP_MENU_BAR_HEIGHT = 1;

type DesktopTarget = "settings" | "about" | `app:${string}`;

// Formats the local date with a fixed year and fixed-width 24-hour clock text.
export function desktopClockParts(date: Date, colonVisible: boolean) {
  return {
    date: `${date.toLocaleDateString("en-US", { weekday: "short" })} ${String(date.getDate()).padStart(2, "0")} ${date.toLocaleDateString("en-US", { month: "short" })} 1985`,
    time: `${String(date.getHours()).padStart(2, "0")}${colonVisible ? ":" : " "}${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

type DesktopProps = {
  readonly onRestart: () => void;
  readonly autoplay: boolean;
};

// Places the player near the bottom-left while keeping it below the topbar.
export function initialCoasttyPlayerPosition(viewportHeight: number, playerHeight: number) {
  return { left: 2, top: Math.max(1, viewportHeight - playerHeight - 2) };
}

export function Desktop({ onRestart, autoplay }: DesktopProps) {
  // Read the terminal dimensions and active color theme.
  const { width, height } = useTerminalDimensions();
  const { themeId, theme, setTheme } = useTheme();
  const { colors } = theme;

  // Track local pointer, keyboard, menu, clock, and double-click state.
  const [selectedAppId, setSelectedAppId] = useState(desktopApps[0]?.id ?? "");
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
  const [hoveredTopbarControl, setHoveredTopbarControl] = useState<"settings" | "about" | null>(null);
  const [desktopTarget, setDesktopTarget] = useState<DesktopTarget | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsItemIndex, setSettingsItemIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [lastClick, setLastClick] = useState({ appId: "", at: 0 });
  const startedPlayer = useRef(false);

  // Read and dispatch shared window-manager and playback state.
  const windows = useAtomValue(windowsAtom);
  const focusedAppId = useAtomValue(focusedAppIdAtom);
  const dispatchWindow = useAtomSet(windowManagerAtom);
  const dispatchPlayback = useAtomSet(playbackCommandAtom);
  const playbackLifecycle = usePlaybackLifecycle();

  // Resolve the focused menu owner and responsive topbar visibility.
  const menuOwner = Option.match(focusedAppId, {
    onNone: () => ({ kind: "desktop", name: "Desktop" }) as const,
    onSome: (appId) => ({
      kind: "app",
      appId,
      name: apps.find((app) => app.id === appId)?.title ?? "Desktop",
    }) as const,
  });
  const desktopFocused = menuOwner.kind === "desktop";
  const topbarLabel = `🌴  ${menuOwner.name}`;
  const showDesktopMenu = desktopFocused && width >= topbarLabel.length + 21;
  const showTime = desktopFocused
    ? showDesktopMenu && width >= topbarLabel.length + 27
    : width >= topbarLabel.length + 8;
  const showDate = showTime && width >= topbarLabel.length + (desktopFocused ? 44 : 25);
  const clock = desktopClockParts(now, now.getSeconds() % 2 === 0);
  const settingsMenuLeft = Math.max(0, Math.min(width - SETTINGS_MENU_WIDTH, topbarLabel.length + 3));

  // Open the player once when the desktop first mounts.
  useEffect(() => {
    if (startedPlayer.current) return;
    startedPlayer.current = true;
    const player = apps.find((app) => app.id === "coastty-player");
    if (!player) return;

    dispatchWindow(WindowCommand.Open({
      app: player,
      position: initialCoasttyPlayerPosition(height, player.initialSize.height),
    }));
    dispatchWindow(WindowCommand.FocusDesktop());
    if (autoplay) dispatchPlayback(PlaybackCommand.Play());
  }, [autoplay, dispatchPlayback, dispatchWindow, height]);

  // Refresh the clock twice per second so the separator blinks on time.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 500);
    return () => clearInterval(timer);
  }, []);

  // Clear Desktop controls whenever an app takes focus.
  useEffect(() => {
    if (Option.isSome(focusedAppId)) {
      setDesktopTarget(null);
      setSettingsOpen(false);
    }
  }, [focusedAppId]);

  // Close controls that no longer fit after a terminal resize.
  useEffect(() => {
    if (showDesktopMenu) return;
    setSettingsOpen(false);
    setDesktopTarget((target) => target === "settings" || target === "about" ? null : target);
  }, [showDesktopMenu]);

  // Open, restore, or focus an app through the window manager.
  function activate(appId: string) {
    const app = apps.find((candidate) => candidate.id === appId);
    if (!app) return;
    const window = HashMap.get(windows, appId);
    if (Option.isNone(window)) dispatchWindow(WindowCommand.Open({ app }));
    else if (window.value.minimized) dispatchWindow(WindowCommand.Restore({ appId }));
    else dispatchWindow(WindowCommand.Focus({ appId }));
  }

  // Move keyboard focus between topbar controls and desktop icons.
  function focusTarget(target: DesktopTarget) {
    setDesktopTarget(target);
    if (target.startsWith("app:")) setSelectedAppId(target.slice(4));
  }

  // Return focus to the Desktop without closing open windows.
  function focusDesktop() {
    setSettingsOpen(false);
    setDesktopTarget(null);
    dispatchWindow(WindowCommand.FocusDesktop());
  }

  // Toggle Settings and start its selection on the current theme.
  function toggleSettings() {
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    setSettingsItemIndex(themeOrder.indexOf(themeId));
    setSettingsOpen(true);
  }

  // Launch or focus the topbar-only About app.
  function openAbout() {
    setSettingsOpen(false);
    activate(aboutApp.id);
  }

  // Apply a selected theme or run the Restart menu action.
  function activateSettingsItem(index: number) {
    const selectedThemeId = themeOrder[index];
    setSettingsOpen(false);
    if (selectedThemeId) setTheme(selectedThemeId);
    else playbackLifecycle.pauseBeforeRestart(onRestart);
  }

  // Handle Settings navigation before the general Desktop keymap.
  useKeyboard((key) => {
    if (settingsOpen) {
      const itemCount = themeOrder.length + 1;
      if (key.name === "tab" || key.name === "down" || key.name === "up") {
        const delta = key.name === "up" || (key.name === "tab" && key.shift) ? -1 : 1;
        setSettingsItemIndex((index) => (index + delta + itemCount) % itemCount);
      } else if (key.name === "return" || key.name === "enter" || key.name === "space") {
        activateSettingsItem(settingsItemIndex);
      } else if (key.name === "escape") {
        setSettingsOpen(false);
      } else {
        return;
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    const focusedWindow = Option.flatMap(focusedAppId, (appId) => HashMap.get(windows, appId));
    if (Option.isSome(focusedWindow)) return;

    // Build the Desktop tab order from visible controls and app icons.
    const targets: DesktopTarget[] = [
      ...(showDesktopMenu ? ["settings", "about"] as const : []),
      ...desktopApps.map((app): DesktopTarget => `app:${app.id}`),
    ];
    const forward = key.name === "tab" || key.name === "right" || key.name === "down";
    const backward = key.name === "left" || key.name === "up";

    if (forward || backward) {
      const delta = backward || (key.name === "tab" && key.shift) ? -1 : 1;
      const targetIndex = desktopTarget === null ? (delta > 0 ? -1 : 0) : targets.indexOf(desktopTarget);
      const nextTarget = targets[(targetIndex + delta + targets.length) % targets.length];
      if (nextTarget) focusTarget(nextTarget);
    } else if (key.name === "return" || key.name === "enter" || key.name === "space") {
      if (desktopTarget === "settings") toggleSettings();
      else if (desktopTarget === "about") openAbout();
      else if (desktopTarget?.startsWith("app:")) activate(desktopTarget.slice(4));
      else activate(selectedAppId);
    } else {
      return;
    }
    key.preventDefault();
    key.stopPropagation();
  });

  // Derive minimized-window entries and topbar highlight states.
  const minimizedApps = apps.filter((app) =>
    HashMap.get(windows, app.id).pipe(Option.exists((window) => window.minimized)),
  );
  const settingsHighlighted = settingsOpen
    || hoveredTopbarControl === "settings"
    || (desktopFocused && desktopTarget === "settings");
  const aboutHighlighted = hoveredTopbarControl === "about"
    || (desktopFocused && desktopTarget === "about");

  return (
    <box backgroundColor={colors.background} flexGrow={1} onMouseDown={focusDesktop}>
      {/* Desktop background and wallpaper layers. */}
      <DesktopWallpaper width={width} height={height} />

      {/* Topbar identity, Desktop-owned controls, and live clock. */}
      <box
        height={DESKTOP_MENU_BAR_HEIGHT}
        flexDirection="row"
        onMouseDown={(event) => {
          event.stopPropagation();
          setSettingsOpen(false);
        }}
      >
        <CoasttyText fg={colors.highlight} attributes={TextAttributes.BOLD}>{topbarLabel}</CoasttyText>

        {/* Settings and About are visible only while Desktop owns the menu. */}
        {showDesktopMenu && <box flexDirection="row" marginLeft={2}>
          <box
            width={10}
            height={1}
            justifyContent="center"
            backgroundColor={settingsHighlighted ? colors.highlight : undefined}
            onMouseOver={() => setHoveredTopbarControl("settings")}
            onMouseOut={() => setHoveredTopbarControl(null)}
            onMouseDown={(event) => {
              event.stopPropagation();
              setDesktopTarget("settings");
              toggleSettings();
            }}
          >
            <CoasttyText fg={settingsHighlighted ? colors.background : colors.highlight}>
              Settings
            </CoasttyText>
          </box>
          <box
            width={7}
            height={1}
            justifyContent="center"
            backgroundColor={aboutHighlighted ? colors.highlight : undefined}
            onMouseOver={() => setHoveredTopbarControl("about")}
            onMouseOut={() => setHoveredTopbarControl(null)}
            onMouseDown={(event) => {
              event.stopPropagation();
              setDesktopTarget("about");
              openAbout();
            }}
          >
            <CoasttyText fg={aboutHighlighted ? colors.background : colors.highlight}>
              About
            </CoasttyText>
          </box>
        </box>}

        {/* Clock keeps the time visible and adds the full date when space allows. */}
        {showTime && <box height={1} marginLeft="auto">
          <CoasttyText fg={colors.highlight} attributes={TextAttributes.BOLD}>
            {showDate ? `${clock.date}  ${clock.time}` : clock.time}
          </CoasttyText>
        </box>}
      </box>

      {/* Launchable app icons arranged across the desktop. */}
      {width >= DESKTOP_ICON_WIDTH && height >= DESKTOP_ICON_HEIGHT + 1 && desktopApps.map((app, index) => {
        const selected = app.id === selectedAppId;
        const hovered = app.id === hoveredAppId;
        return (
          <DesktopIcon
            key={app.id}
            app={app}
            position={desktopIconPosition(index, width, height)}
            colors={colors}
            selected={selected}
            hovered={hovered}
            onMouseOver={() => setHoveredAppId(app.id)}
            onMouseOut={() => setHoveredAppId(null)}
            onMouseDown={() => {
              setSettingsOpen(false);
              dispatchWindow(WindowCommand.FocusDesktop());
              focusTarget(`app:${app.id}`);
              const now = Date.now();
              if (lastClick.appId === app.id && now - lastClick.at < DOUBLE_CLICK_MS) activate(app.id);
              setLastClick({ appId: app.id, at: now });
            }}
          />
        );
      })}

      {/* Open, non-minimized app windows. */}
      {apps.map((app) => {
        const window = HashMap.get(windows, app.id);
        return Option.isSome(window) && !window.value.minimized
          ? <WindowFrame key={app.id} app={app} window={window.value} viewport={{ width, height }} onInteract={() => setSettingsOpen(false)} />
          : null;
      })}

      {/* Settings dropdown with theme choices and Restart. */}
      {showDesktopMenu && settingsOpen && (
        <box
          position="absolute"
          left={settingsMenuLeft}
          top={DESKTOP_MENU_BAR_HEIGHT}
          width={SETTINGS_MENU_WIDTH}
          height={themeOrder.length + 3}
          zIndex={1_000_000}
          border
          borderColor={colors.accent}
          backgroundColor={colors.background}
          flexDirection="column"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {themeOrder.map((id, index) => {
            const selected = settingsItemIndex === index;
            return (
              <box
                key={id}
                height={1}
                paddingX={1}
                backgroundColor={selected ? colors.highlight : colors.background}
                onMouseOver={() => setSettingsItemIndex(index)}
                onMouseDown={() => activateSettingsItem(index)}
              >
                <CoasttyText
                  fg={selected ? colors.background : id === themeId ? colors.accent : colors.glowSoft}
                  attributes={selected || id === themeId ? TextAttributes.BOLD : undefined}
                >
                  [{id === themeId ? "x" : " "}] {themes[id].label}
                </CoasttyText>
              </box>
            );
          })}
          <box
            height={1}
            paddingX={1}
            backgroundColor={settingsItemIndex === themeOrder.length ? colors.highlight : colors.background}
            onMouseOver={() => setSettingsItemIndex(themeOrder.length)}
            onMouseDown={() => activateSettingsItem(themeOrder.length)}
          >
            <CoasttyText
              fg={settingsItemIndex === themeOrder.length ? colors.background : colors.accent}
              attributes={TextAttributes.BOLD}
            >
              Restart
            </CoasttyText>
          </box>
        </box>
      )}

      {/* Bottom dock for restoring minimized apps. */}
      {minimizedApps.length > 0 && (
        <box position="absolute" left={0} right={0} bottom={0} height={3} paddingX={1} flexDirection="row" alignItems="center" gap={1} border borderColor={colors.highlight}>
          {minimizedApps.map((app) => (
            <box key={app.id} width={18} height={1} alignItems="center" justifyContent="center" backgroundColor={colors.highlight} onMouseDown={(event) => {
              event.stopPropagation();
              setSettingsOpen(false);
              dispatchWindow(WindowCommand.Restore({ appId: app.id }));
            }}>
              <CoasttyText fg={colors.background}>{app.title}</CoasttyText>
            </box>
          ))}
        </box>
      )}
    </box>
  );
}
