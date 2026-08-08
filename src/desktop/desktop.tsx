import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import { apps } from "../apps/registry";
import { ActionStatus, useActionStatus } from "./action-status";
import { useWindowManager } from "./window-context";
import { WindowFrame } from "./window-frame";

const DOUBLE_CLICK_MS = 350;

export function Desktop() {
  const { width, height } = useTerminalDimensions();
  const [selectedAppId, setSelectedAppId] = useState(apps[0]?.id ?? "");
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
  const [lastClick, setLastClick] = useState({ appId: "", at: 0 });
  const { setAction } = useActionStatus();
  const windows = useWindowManager((state) => state.windows);
  const focusedAppId = useWindowManager((state) => state.focusedAppId);
  const open = useWindowManager((state) => state.open);
  const close = useWindowManager((state) => state.close);
  const minimize = useWindowManager((state) => state.minimize);
  const restore = useWindowManager((state) => state.restore);
  const focus = useWindowManager((state) => state.focus);
  const move = useWindowManager((state) => state.move);

  useEffect(() => {
    setAction("DOUBLE CLICK TO OPEN");
  }, [selectedAppId, setAction]);

  function activate(appId: string) {
    const app = apps.find((candidate) => candidate.id === appId);
    if (!app) return;
    const window = windows[appId];
    if (!window) open(app);
    else if (window.minimized) restore(appId);
    else focus(appId);
  }

  useKeyboard((key) => {
    const focused = focusedAppId ? windows[focusedAppId] : undefined;
    if (key.ctrl && focused) {
      if (key.name === "m") return minimize(focused.appId);
      if (key.name === "w") return close(focused.appId);
      const step = key.shift ? 5 : 1;
      const direction = key.name === "left" ? [-step, 0] as const
        : key.name === "right" ? [step, 0] as const
          : key.name === "up" ? [0, -step] as const
            : key.name === "down" ? [0, step] as const
              : null;
      if (direction) {
        const app = apps.find((candidate) => candidate.id === focused.appId);
        if (!app) return;
        const maxLeft = Math.max(0, width - app.initialSize.width);
        const maxTop = Math.max(1, height - 2);
        move(focused.appId, Math.max(0, Math.min(maxLeft, focused.left + direction[0])), Math.max(1, Math.min(maxTop, focused.top + direction[1])));
        return;
      }
    }

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

  const minimizedApps = apps.filter((app) => windows[app.id]?.minimized);

  return (
    <box backgroundColor="#000000" flexGrow={1}>
      <box height={1} paddingX={1} justifyContent="space-between" backgroundColor="#ffffff">
        <text fg="#000000" attributes={TextAttributes.BOLD}>[ Apple ]</text>
        <text fg="#000000">File   Edit   View   Special</text>
        <text fg="#000000">Monday  9:41 AM</text>
      </box>
      <text position="absolute" left={3} top={2} fg="#ffffff" attributes={TextAttributes.DIM}>Macintosh HD</text>

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
            <text fg="#000000" attributes={TextAttributes.BOLD}>{app.icon}</text>
            <text fg="#000000"> {app.title} </text>
          </box>
        );
      })}

      {apps.map((app) => {
        const window = windows[app.id];
        return window && !window.minimized ? <WindowFrame key={app.id} app={app} window={window} viewport={{ width, height }} /> : null;
      })}

      {minimizedApps.length > 0 && (
        <box position="absolute" left={0} right={0} bottom={0} height={3} paddingX={1} flexDirection="row" alignItems="center" gap={1} border borderColor="#ffffff">
          {minimizedApps.map((app) => (
            <box key={app.id} width={18} height={1} alignItems="center" justifyContent="center" backgroundColor="#ffffff" onMouseDown={() => restore(app.id)}>
              <text fg="#000000">{app.title}</text>
            </box>
          ))}
        </box>
      )}
      <ActionStatus />
    </box>
  );
}
