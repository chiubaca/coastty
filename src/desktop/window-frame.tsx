import { TextAttributes } from "@opentui/core";
import { createElement, useRef, useState } from "react";
import { useRenderer } from "@opentui/react";
import { useAtomSet } from "@effect-atom/atom-react/Hooks";
import type { AppManifest, AppScrollState } from "../apps/types";
import { usePlaybackLifecycle } from "../radio/playback-lifecycle";
import { type ManagedWindow, windowManagerAtom, WindowCommand } from "./window-manager";
import { CoasttyText } from "../ui/coastty-text";
import { useTheme } from "../ui/theme";

type Viewport = { width: number; height: number };
type HorizontalEdge = "left" | "right";
type VerticalEdge = "top" | "bottom";

const MIN_WINDOW_WIDTH = 12;
const MIN_WINDOW_HEIGHT = 6;

type WindowFrameProps = {
  readonly app: AppManifest;
  readonly window: ManagedWindow;
  readonly viewport: Viewport;
  readonly onInteract?: () => void;
};

export function WindowFrame({ app, window, viewport, onInteract }: WindowFrameProps) {
  const { theme: { colors } } = useTheme();
  const dragOffset = useRef<{ left: number; top: number } | null>(null);
  const resizeState = useRef<{
    readonly horizontal: HorizontalEdge;
    readonly vertical: VerticalEdge;
    readonly x: number;
    readonly y: number;
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrollbarHovered, setIsScrollbarHovered] = useState(false);
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const [scrollState, setScrollState] = useState<AppScrollState | null>(null);
  const renderer = useRenderer();
  const dispatchWindow = useAtomSet(windowManagerAtom);
  const playbackLifecycle = usePlaybackLifecycle();
  const maxLeft = Math.max(0, viewport.width - window.width);
  const maxTop = Math.max(1, viewport.height - 2);
  const left = Math.min(window.left, maxLeft);
  const top = Math.min(window.top, maxTop);
  const contentPadding = app.contentPadding ?? 1;
  const hasOverflow = scrollState !== null && scrollState.size > scrollState.viewportSize;
  const contentSize = {
    width: Math.max(0, window.width - 2 - contentPadding * 2 - (hasOverflow ? 3 : 0)),
    height: Math.max(0, window.height - 2 - contentPadding * 2),
  };
  const trackHeight = window.height - 2 - contentPadding * 2;
  const thumbHeight = hasOverflow
    ? Math.max(1, Math.min(trackHeight, Math.round((scrollState.viewportSize / scrollState.size) * trackHeight)))
    : 0;
  const maxScroll = hasOverflow ? scrollState.size - scrollState.viewportSize : 0;
  const thumbTop = hasOverflow && maxScroll > 0
    ? Math.round((scrollState.position / maxScroll) * (trackHeight - thumbHeight))
    : 0;

  function moveTo(x: number, y: number) {
    dispatchWindow(
      WindowCommand.Move({
        appId: app.id,
        left: Math.max(0, Math.min(maxLeft, x)),
        top: Math.max(1, Math.min(maxTop, y)),
      }),
    );
  }

  function startResize(horizontal: HorizontalEdge, vertical: VerticalEdge, x: number, y: number) {
    dispatchWindow(WindowCommand.Focus({ appId: app.id }));
    resizeState.current = { horizontal, vertical, x, y, left, top, width: window.width, height: window.height };
    setIsDragging(true);
  }

  function resizeTo(x: number, y: number) {
    const resize = resizeState.current;
    if (!resize) return;

    const right = resize.left + resize.width;
    const bottom = resize.top + resize.height;
    const nextLeft = resize.horizontal === "left"
      ? Math.min(right - MIN_WINDOW_WIDTH, Math.max(0, resize.left + x - resize.x))
      : resize.left;
    const nextTop = resize.vertical === "top"
      ? Math.min(bottom - MIN_WINDOW_HEIGHT, Math.max(1, resize.top + y - resize.y))
      : resize.top;
    const nextRight = resize.horizontal === "right"
      ? Math.max(nextLeft + MIN_WINDOW_WIDTH, Math.min(viewport.width, right + x - resize.x))
      : right;
    const nextBottom = resize.vertical === "bottom"
      ? Math.max(nextTop + MIN_WINDOW_HEIGHT, Math.min(viewport.height, bottom + y - resize.y))
      : bottom;

    dispatchWindow(WindowCommand.Resize({
      appId: app.id,
      left: nextLeft,
      top: nextTop,
      width: nextRight - nextLeft,
      height: nextBottom - nextTop,
    }));
  }

  return (
    <box
      position="absolute"
      left={left}
      top={top}
      width={window.width}
      height={window.height}
      zIndex={window.zIndex}
      backgroundColor={colors.background}
      flexDirection="column"
      onMouseDown={(event) => {
        event.stopPropagation();
        onInteract?.();
        dispatchWindow(WindowCommand.Focus({ appId: app.id }));
      }}
      onMouseDrag={(event) => {
        if (resizeState.current) resizeTo(event.x, event.y);
        else if (dragOffset.current) moveTo(event.x - dragOffset.current.left, event.y - dragOffset.current.top);
      }}
      onMouseDragEnd={() => {
        dragOffset.current = null;
        resizeState.current = null;
        setIsDragging(false);
        setIsScrollbarDragging(false);
        renderer.setMousePointer("default");
      }}
    >
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor={colors.accent}
        title={window.title}
        titleColor={colors.accent}
        titleAlignment="left"
        backgroundColor={colors.background}
        flexDirection="column"
      >
        <box flexGrow={1} flexDirection="row">
          <box flexGrow={1} padding={contentPadding}>
            {createElement(app.Component, { appId: app.id, contentSize, onScrollStateChange: setScrollState })}
          </box>
          {hasOverflow && <box width={3} paddingY={1} alignItems="center" flexDirection="column" backgroundColor={colors.shadow}>
            <box
              height={trackHeight}
              width={1}
              backgroundColor={colors.shadow}
              flexDirection="column"
              onMouseDown={(event) => {
                const relativeY = Math.max(0, Math.min(trackHeight - 1, event.y - (top + 1 + contentPadding)));
                const position = Math.round((relativeY / Math.max(1, trackHeight - 1)) * maxScroll);
                scrollState.scrollTo(position);
              }}
            >
              <box
                width={1}
                height={thumbHeight}
                marginTop={thumbTop}
                backgroundColor={isScrollbarDragging ? colors.accent : isScrollbarHovered ? colors.secondary : colors.border}
                onMouseOver={() => {
                  setIsScrollbarHovered(true);
                  renderer.setMousePointer("move");
                }}
                onMouseOut={() => {
                  if (!isScrollbarDragging) setIsScrollbarHovered(false);
                  renderer.setMousePointer("default");
                }}
                onMouseDown={() => setIsScrollbarDragging(true)}
                onMouseDrag={(event) => {
                  const relativeY = Math.max(0, Math.min(trackHeight - thumbHeight, event.y - (top + 1 + contentPadding)));
                  const position = Math.round((relativeY / Math.max(1, trackHeight - thumbHeight)) * maxScroll);
                  scrollState.scrollTo(position);
                }}
              />
            </box>
          </box>}
        </box>
      </box>
      <box
        position="absolute"
        left={0}
        top={0}
        width={window.width}
        height={1}
        flexDirection="row"
        onMouseOver={() => renderer.setMousePointer("move")}
        onMouseOut={() => renderer.setMousePointer("default")}
        onMouseDown={(event) => {
          dispatchWindow(WindowCommand.Focus({ appId: app.id }));
          dragOffset.current = { left: event.x - left, top: event.y - top };
          setIsDragging(true);
        }}
      >
        <box flexGrow={1} />
        <box
          width={3}
          height={1}
          onMouseDown={(event) => {
            event.stopPropagation();
            onInteract?.();
            dispatchWindow(WindowCommand.Minimize({ appId: app.id }));
          }}
        >
          <CoasttyText fg={colors.accent} attributes={TextAttributes.BOLD}>[_]</CoasttyText>
        </box>
        <box width={1} />
        <box
          width={3}
          height={1}
          onMouseDown={(event) => {
            event.stopPropagation();
            onInteract?.();
            playbackLifecycle.pauseBeforeAppClose(
              app.id,
              () => dispatchWindow(WindowCommand.Close({ appId: app.id })),
            );
          }}
        >
          <CoasttyText fg={colors.accent} attributes={TextAttributes.BOLD}>[X]</CoasttyText>
        </box>
        <box width={1} />
      </box>
      {/* Extend outward to capture the first drag event before it leaves the frame. */}
      {([
        { horizontal: "left", vertical: "top" },
        { horizontal: "right", vertical: "top" },
        { horizontal: "left", vertical: "bottom" },
        { horizontal: "right", vertical: "bottom" },
      ] as const).map(({ horizontal, vertical }) => (
        <box
          key={`${horizontal}-${vertical}`}
          position="absolute"
          left={horizontal === "left" ? -2 : window.width - 1}
          top={vertical === "top" ? -2 : window.height - 1}
          width={3}
          height={3}
          zIndex={1}
          onMouseOver={() => renderer.setMousePointer("move")}
          onMouseOut={() => {
            if (!resizeState.current) renderer.setMousePointer("default");
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
            onInteract?.();
            startResize(horizontal, vertical, event.x, event.y);
          }}
        />
      ))}
    </box>
  );
}
