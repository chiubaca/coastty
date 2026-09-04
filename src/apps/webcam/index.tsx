import { TextAttributes } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useAtomValue } from "@effect-atom/atom-react/Hooks";
import { useEffect, useState } from "react";
import type { AppComponentProps } from "../types";
import { windowFocusedAtom } from "../../desktop/window-manager";
import { CoasttyText } from "../../ui/coastty-text";
import { useTheme } from "../../ui/theme";
import { frameToAscii } from "./ascii";
import { startWebcamCapture } from "./capture";

type WebcamStatus = "starting" | "live" | "stopped" | "error";
export type WebcamDisplayMode = "image" | "ascii";

export function nextWebcamDisplayMode(mode: WebcamDisplayMode): WebcamDisplayMode {
  return mode === "image" ? "ascii" : "image";
}

type WebcamProps = AppComponentProps & {
  readonly startCapture?: typeof startWebcamCapture;
};

export function AsciiCameraFrame({
  frame,
  width,
  height,
  cellAspectRatio,
  color,
}: {
  readonly frame: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly cellAspectRatio: number;
  readonly color: string;
}) {
  const rows = frameToAscii(frame, width, height, cellAspectRatio);

  return (
    <box id="webcam-ascii" position="absolute" left={0} top={0} width="100%" height="100%" overflow="hidden">
      {rows.map((row, top) => (
        <CoasttyText key={top} position="absolute" left={0} top={top} fg={color}>{row}</CoasttyText>
      ))}
    </box>
  );
}

export function Webcam({ appId, contentSize, startCapture = startWebcamCapture }: WebcamProps) {
  const { theme: { colors } } = useTheme();
  const renderer = useRenderer();
  const focused = useAtomValue(windowFocusedAtom(appId));
  const [enabled, setEnabled] = useState(true);
  const [frame, setFrame] = useState<Uint8Array | null>(null);
  const [status, setStatus] = useState<WebcamStatus>("starting");
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<WebcamDisplayMode>("image");
  const compact = contentSize.width < 48;
  const resolution = renderer.resolution;
  const cellAspectRatio = resolution && renderer.terminalWidth > 0 && renderer.terminalHeight > 0
    ? (resolution.width * renderer.terminalHeight) / (resolution.height * renderer.terminalWidth)
    : 0.5;
  const cameraHeight = Math.max(1, contentSize.height - 1);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const capture = startCapture({
      onFrame(nextFrame) {
        if (!active) return;
        setFrame(nextFrame);
        setStatus("live");
        setError(null);
      },
      onError(message) {
        if (!active) return;
        setEnabled(false);
        setStatus("error");
        setError(message);
      },
    });

    return () => {
      active = false;
      capture.stop();
    };
  }, [enabled, startCapture]);

  function toggleCamera() {
    if (enabled) {
      setEnabled(false);
      setFrame(null);
      setStatus("stopped");
      setError(null);
      return;
    }

    setFrame(null);
    setError(null);
    setStatus("starting");
    setEnabled(true);
  }

  function toggleDisplayMode() {
    setDisplayMode(nextWebcamDisplayMode);
  }

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "space") toggleCamera();
    else if (key.name.toLowerCase() === "a" || key.sequence?.toLowerCase() === "a") toggleDisplayMode();
    else return;
    key.preventDefault();
    key.stopPropagation();
  });

  const statusColor = status === "live"
    ? colors.highlight
    : status === "error"
    ? colors.accent
    : colors.muted;

  return (
    <box flexGrow={1} minWidth={1} flexDirection="column" backgroundColor="#050509">
      <box flexGrow={1} minHeight={4} overflow="hidden" justifyContent="center" alignItems="center" backgroundColor="#050509">
        {frame && displayMode === "image" && (
          <image
            id="webcam-frame"
            width="100%"
            flexGrow={1}
            minHeight={2}
            source={frame}
            fit="cover"
            onLoad={() => {
              if (!enabled) return;
              setStatus("live");
              setError(null);
            }}
            onError={() => {
              setStatus("error");
              setError("OpenTUI could not render the camera frame.");
            }}
          />
        )}
        {frame && displayMode === "ascii" && (
          <AsciiCameraFrame
            frame={frame}
            width={contentSize.width}
            height={cameraHeight}
            cellAspectRatio={cellAspectRatio}
            color={colors.glowSoft}
          />
        )}

        {!frame && !error && (
          <CoasttyText fg={colors.muted} attributes={TextAttributes.BOLD}>
            {enabled ? "OPENING CAMERA..." : "CAMERA OFF"}
          </CoasttyText>
        )}

        <box position="absolute" left={0} top={0} height={1} paddingX={1} backgroundColor="#050509">
          <CoasttyText fg={colors.glow} attributes={TextAttributes.BOLD}>COASTTY CAM</CoasttyText>
        </box>
        <box position="absolute" right={0} top={0} height={1} paddingX={1} backgroundColor="#050509">
          <CoasttyText fg={statusColor} attributes={TextAttributes.BOLD}>{status.toUpperCase()}</CoasttyText>
        </box>

        {error && (
          <box position="absolute" left={2} right={2} top="50%" minHeight={3} padding={1} justifyContent="center" backgroundColor={colors.shadow}>
            <CoasttyText fg={colors.accent} wrapMode="word">{error}</CoasttyText>
          </box>
        )}
      </box>

      <box height={1} paddingX={1} justifyContent="space-between" backgroundColor={colors.shadow}>
        <CoasttyText fg={colors.muted}>
          {compact ? status.toUpperCase() : `${displayMode === "ascii" ? "ASCII ART" : "IMAGE"}  /  6 FPS  /  NO AUDIO`}
        </CoasttyText>
        <box flexDirection="row" gap={1}>
          <box id="webcam-mode-toggle" paddingX={1} backgroundColor={colors.primary} onMouseDown={toggleDisplayMode}>
            <CoasttyText fg={colors.background} attributes={TextAttributes.BOLD}>
              {compact ? "[A]" : `[A] ${displayMode === "ascii" ? "IMAGE" : "ASCII"}`}
            </CoasttyText>
          </box>
          <box paddingX={1} backgroundColor={enabled ? colors.accent : colors.secondary} onMouseDown={toggleCamera}>
            <CoasttyText fg={colors.background} attributes={TextAttributes.BOLD}>
              {compact ? (enabled ? "[OFF]" : "[ON]") : `[SPACE] ${enabled ? "OFF" : "ON"}`}
            </CoasttyText>
          </box>
        </box>
      </box>
    </box>
  );
}
