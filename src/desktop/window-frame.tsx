import { TextAttributes } from "@opentui/core";
import { createElement, useRef, useState } from "react";
import { useRenderer } from "@opentui/react";
import { useAtomSet } from "@effect-atom/atom-react/Hooks";
import type { AppManifest } from "../apps/types";
import { actionStatusAtom, DEFAULT_ACTION_STATUS } from "./action-status";
import { type ManagedWindow, windowManagerAtom, WindowCommand } from "./window-manager";
import { LofiText } from "../ui/lofi-text";

type Viewport = { width: number; height: number };

export function WindowFrame({ app, window, viewport }: { app: AppManifest; window: ManagedWindow; viewport: Viewport }) {
  const dragOffset = useRef<{ left: number; top: number } | null>(null);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const renderer = useRenderer();
  const setAction = useAtomSet(actionStatusAtom);
  const dispatchWindow = useAtomSet(windowManagerAtom);
  const maxLeft = Math.max(0, viewport.width - app.initialSize.width);
  const maxTop = Math.max(1, viewport.height - 2);
  const left = Math.min(window.left, maxLeft);
  const top = Math.min(window.top, maxTop);

  function moveTo(x: number, y: number) {
    dispatchWindow(
      WindowCommand.Move({
        appId: app.id,
        left: Math.max(0, Math.min(maxLeft, x)),
        top: Math.max(1, Math.min(maxTop, y)),
      }),
    );
  }

  return (
    <box
      position="absolute"
      left={left}
      top={top}
      width={app.initialSize.width}
      height={app.initialSize.height}
      zIndex={window.zIndex}
      backgroundColor="#000000"
      flexDirection="column"
      onMouseDown={() => dispatchWindow(WindowCommand.Focus({ appId: app.id }))}
    >
      <box
        flexGrow={1}
        border
        borderStyle="single"
        borderColor="#39ff14"
        backgroundColor="#000d04"
        flexDirection="column"
      >
        <box
          height={1}
          backgroundColor={isDragging ? "#39ff14" : isTitleHovered ? "#0c7a22" : "#145c22"}
          onMouseOver={() => {
            setIsTitleHovered(true);
            setAction("DRAG TO REPOSITION");
            renderer.setMousePointer("move");
          }}
          onMouseOut={() => {
            if (!isDragging) setIsTitleHovered(false);
            if (!isDragging) setAction(DEFAULT_ACTION_STATUS);
            renderer.setMousePointer("default");
          }}
          onMouseDown={(event) => {
            dispatchWindow(WindowCommand.Focus({ appId: app.id }));
            dragOffset.current = { left: event.x - left, top: event.y - top };
            setIsDragging(true);
          }}
          onMouseDrag={(event) => {
            if (dragOffset.current) moveTo(event.x - dragOffset.current.left, event.y - dragOffset.current.top);
          }}
          onMouseDragEnd={() => {
            dragOffset.current = null;
            setIsDragging(false);
          }}
        >
          <box height={1} paddingX={1} flexDirection="row" alignItems="center">
            <box flexGrow={1} height={1} alignItems="center" justifyContent="center">
              <LofiText fg={isDragging ? "#000d04" : "#7cff5b"} attributes={TextAttributes.BOLD}>{window.title}</LofiText>
            </box>
            <box width={4} height={1} alignItems="center" justifyContent="center" backgroundColor="#062b0d" onMouseDown={(event) => {
              event.stopPropagation();
              dispatchWindow(WindowCommand.Minimize({ appId: app.id }));
            }}>
              <LofiText fg="#7cff5b" attributes={TextAttributes.BOLD}>[_]</LofiText>
            </box>
            <box width={4} height={1} marginLeft={1} alignItems="center" justifyContent="center" backgroundColor="#062b0d" onMouseDown={(event) => {
              event.stopPropagation();
              dispatchWindow(WindowCommand.Close({ appId: app.id }));
            }}>
              <LofiText fg="#7cff5b" attributes={TextAttributes.BOLD}>[X]</LofiText>
            </box>
          </box>
        </box>
        <box flexGrow={1} flexDirection="row">
          <box flexGrow={1} padding={1}>
            {createElement(app.Component, { appId: app.id })}
          </box>
          <box width={3} paddingY={1} alignItems="center" flexDirection="column" backgroundColor="#031807">
            <box flexGrow={1} width={1} backgroundColor="#0c7a22" flexDirection="column">
              <box width={1} height={3} alignItems="center" justifyContent="center" backgroundColor="#39ff14">
                <LofiText fg="#062b0d">▓</LofiText>
              </box>
            </box>
          </box>
        </box>
      </box>
    </box>
  );
}
