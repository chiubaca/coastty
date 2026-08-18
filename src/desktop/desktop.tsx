import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useState } from "react";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { apps } from "../apps/registry";
import { focusedAppIdAtom, windowManagerAtom, windowsAtom, WindowCommand } from "./window-manager";
import { WindowFrame } from "./window-frame";

const DOUBLE_CLICK_MS = 350;

export function Desktop() {
  const { width, height } = useTerminalDimensions();
  const [selectedAppId, setSelectedAppId] = useState(apps[0]?.id ?? "");
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
  const [lastClick, setLastClick] = useState({ appId: "", at: 0 });
  const windows = useAtomValue(windowsAtom);
  const focusedAppId = useAtomValue(focusedAppIdAtom);
  const dispatchWindow = useAtomSet(windowManagerAtom);

  function activate(appId: string) {
    const app = apps.find((candidate) => candidate.id === appId);
    if (!app) return;
    const window = HashMap.get(windows, appId);
    if (Option.isNone(window)) dispatchWindow(WindowCommand.Open({ app }));
    else if (window.value.minimized) dispatchWindow(WindowCommand.Restore({ appId }));
    else dispatchWindow(WindowCommand.Focus({ appId }));
  }

  useKeyboard((key) => {
    const focusedWindow = Option.flatMap(focusedAppId, (appId) => HashMap.get(windows, appId));
    if (Option.isSome(focusedWindow)) return;

    const selectedIndex = Math.max(0, apps.findIndex((app) => app.id === selectedAppId));
    if (key.name === "tab" || key.name === "right" || key.name === "down") {
      const delta = key.shift ? -1 : 1;
      setSelectedAppId(apps[(selectedIndex + delta + apps.length) % apps.length]?.id ?? "");
    } else if (key.name === "left" || key.name === "up") {
      setSelectedAppId(apps[(selectedIndex - 1 + apps.length) % apps.length]?.id ?? "");
    } else if (key.name === "return" || key.name === "enter") {
      activate(selectedAppId);
    }
  });

  const minimizedApps = apps.filter((app) =>
    HashMap.get(windows, app.id).pipe(Option.exists((window) => window.minimized)),
  );

  return (
    <box backgroundColor="#000000" flexGrow={1}>
      <box height={1} paddingX={1} justifyContent="space-between" backgroundColor="#ffffff">
        <text selectable={false} fg="#000000" attributes={TextAttributes.BOLD}>[ Apple ]</text>
        <text selectable={false} fg="#000000">File   Edit   View   Special</text>
        <text selectable={false} fg="#000000">Monday  9:41 AM</text>
      </box>
      <text selectable={false} position="absolute" left={3} top={2} fg="#ffffff" attributes={TextAttributes.DIM}>Macintosh HD</text>

      {apps.map((app, index) => {
        const selected = app.id === selectedAppId;
        const hovered = app.id === hoveredAppId;
        return (
          <box
            key={app.id}
            position="absolute"
            left={3 + index * 12}
            top={5}
            width={app.title.length + 2}
            height={2}
            alignItems="center"
            backgroundColor={selected ? "#7cff5b" : hovered ? "#e0e0e0" : "#b8b8b8"}
            onMouseOver={() => setHoveredAppId(app.id)}
            onMouseOut={() => setHoveredAppId(null)}
            onMouseDown={() => {
              setSelectedAppId(app.id);
              const now = Date.now();
              if (lastClick.appId === app.id && now - lastClick.at < DOUBLE_CLICK_MS) activate(app.id);
              setLastClick({ appId: app.id, at: now });
            }}
          >
            <text selectable={false} fg="#000000" attributes={TextAttributes.BOLD}>{app.icon}</text>
            <text selectable={false} fg="#000000"> {app.title} </text>
          </box>
        );
      })}

      {apps.map((app) => {
        const window = HashMap.get(windows, app.id);
        return Option.isSome(window) && !window.value.minimized
          ? <WindowFrame key={app.id} app={app} window={window.value} viewport={{ width, height }} />
          : null;
      })}

      {minimizedApps.length > 0 && (
        <box position="absolute" left={0} right={0} bottom={0} height={3} paddingX={1} flexDirection="row" alignItems="center" gap={1} border borderColor="#ffffff">
          {minimizedApps.map((app) => (
            <box key={app.id} width={18} height={1} alignItems="center" justifyContent="center" backgroundColor="#ffffff" onMouseDown={() => dispatchWindow(WindowCommand.Restore({ appId: app.id }))}>
              <text selectable={false} fg="#000000">{app.title}</text>
            </box>
          ))}
        </box>
      )}
    </box>
  );
}
