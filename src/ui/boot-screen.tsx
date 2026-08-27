import { measureText, TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import { CoasttyText } from "./coastty-text";
import { useTheme } from "./theme";

const BOOT_GREETING = "Welcome to";
const BOOT_WORD = "Coastty OS";
export const BOOT_TITLE = `${BOOT_GREETING} ${BOOT_WORD}`;
const BOOT_WORD_FONT = "tiny";
const BOOT_WORD_SIZE = measureText({ text: BOOT_WORD, font: BOOT_WORD_FONT });

const BIOS_LINES = [
  "COASTTY SYSTEMS ROM BIOS (C) 1995",
  "CPU: AUDIOWAVE 486DX2 @ 66MHz",
  "MEMORY TEST: 640K .............. OK",
  "AUDIO DEVICE: FM SYNTH ........ OK",
  "SCANNING NIGHT FREQUENCIES .... OK",
  "MOUNTING /DEV/MIXTAPE ......... OK",
  "STARTING WINDOW MANAGER ....... OK",
] as const;

const BIOS_LINE_INTERVAL_MS = 390;
const TITLE_START_MS = 3_375;
const TITLE_HOLD_DURATION_MS = 1_470;
const ENTRY_BRACKET_INTERVAL_MS = 480;
export const BOOT_DURATION_MS = TITLE_START_MS + TITLE_HOLD_DURATION_MS;

const SPINNER = ["-", "\\", "|", "/"] as const;

const BOOT_LOGO = [
  { row: `.-+%${"@".repeat(4)}%+-.`, shade: 0 },
  { row: `.-+*%${"@".repeat(12)}%*+-.`, shade: 1 },
  { row: `.-+*%${"@".repeat(16)}%*+-.`, shade: 2 },
  { row: `=+*%${"@".repeat(21)}%*+=`, shade: 4 },
  { row: `@#${"@".repeat(25)}#@`, shade: 5 },
  { row: "=".repeat(29), shade: 5 },
  { row: `${"=".repeat(13)}***${"=".repeat(13)}`, shade: 5 },
  { row: "=".repeat(23), shade: 6 },
  { row: " ", shade: 6 },
  { row: "C O A S T T Y", shade: 6 },
] as const;

const BOOT_LOGO_WIDTH = 29;
const ARCADE_BOOT_LOGO_COLORS = [
  "#ff9a3c",
  "#ff7448",
  "#ff4e64",
  "#ff317f",
  "#ff1aa1",
  "#f014bd",
  "#c62bd8",
] as const;

export type BootFrame = {
  readonly biosLineCount: number;
  readonly biosComplete: boolean;
  readonly titleVisible: boolean;
  readonly complete: boolean;
};

export function getBootFrame(elapsedMs: number): BootFrame {
  const elapsed = Math.max(0, elapsedMs);

  return {
    biosLineCount: Math.min(BIOS_LINES.length, Math.floor(elapsed / BIOS_LINE_INTERVAL_MS) + 1),
    biosComplete: elapsed >= (BIOS_LINES.length - 1) * BIOS_LINE_INTERVAL_MS,
    titleVisible: elapsed >= TITLE_START_MS,
    complete: elapsed >= BOOT_DURATION_MS,
  };
}

type BootScreenProps = {
  readonly onComplete: (musicOn: boolean) => void;
};

export function BootScreen({ onComplete }: BootScreenProps) {
  const { width, height } = useTerminalDimensions();
  const { themeId, theme: { colors } } = useTheme();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const compact = width < 68;
  const frame = getBootFrame(elapsedMs);
  const entryAgeMs = Math.max(0, elapsedMs - BOOT_DURATION_MS);
  const entryBracketCount = Math.floor(entryAgeMs / ENTRY_BRACKET_INTERVAL_MS) % 4;
  const entryBrackets = "[ ".repeat(entryBracketCount);
  const entryPrompt = `${entryBrackets}CLICK TO ENTER${" ]".repeat(entryBracketCount)}`;
  const spinner = SPINNER[Math.floor(elapsedMs / 150) % SPINNER.length];
  const logoStacksWithBios = width < BOOT_LOGO_WIDTH + 46;
  const showBootLogo = !frame.biosComplete && width >= BOOT_LOGO_WIDTH;
  const bootLogoColors = themeId === "arcade"
    ? ARCADE_BOOT_LOGO_COLORS
    : [colors.highlight, colors.accent, colors.accent, colors.primary, colors.primary, colors.secondary, colors.subdued];

  function enterDesktop() {
    if (frame.complete) onComplete(musicOn);
  }

  useKeyboard((key) => {
    if (key.name === "return" || key.name === "enter" || key.name === "space") enterDesktop();
  });

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
    }, 32);

    return () => clearInterval(timer);
  }, []);

  return (
    <box flexGrow={1} backgroundColor={colors.background} onMouseDown={enterDesktop}>
      {showBootLogo && (
        <box position="absolute" top={1} right={width === BOOT_LOGO_WIDTH ? 0 : compact ? 1 : 3} width={BOOT_LOGO_WIDTH}>
          {BOOT_LOGO.map(({ row, shade }, index) => (
            <CoasttyText key={index} fg={bootLogoColors[shade]} attributes={TextAttributes.BOLD}>
              {`${" ".repeat(Math.floor((BOOT_LOGO_WIDTH - row.length) / 2))}${row}`}
            </CoasttyText>
          ))}
        </box>
      )}

      {elapsedMs < TITLE_START_MS && (
        <box position="absolute" top={logoStacksWithBios ? BOOT_LOGO.length + 3 : 3} left={compact ? 2 : 4}>
          {BIOS_LINES.slice(0, frame.biosLineCount).map((line, index) => (
            <CoasttyText
              key={line}
              fg={index === frame.biosLineCount - 1 ? colors.highlight : colors.primary}
              attributes={index === 0 ? TextAttributes.BOLD : undefined}
            >
              {line}
            </CoasttyText>
          ))}
        </box>
      )}

      {frame.titleVisible && (
        <box flexGrow={1} alignItems="center" justifyContent="center">
          <box width={BOOT_WORD_SIZE.width} flexDirection="column" alignItems="center">
            <CoasttyText fg={colors.accent} attributes={TextAttributes.BOLD}>{BOOT_GREETING}</CoasttyText>
            <box height={1} />
            <ascii-font text={BOOT_WORD} font={BOOT_WORD_FONT} color={colors.accent} selectable={false} />
            <box height={1} />
            <box height={3} flexDirection="column" alignItems="center">
              {frame.complete && (
                <>
                <CoasttyText fg={colors.shadow} attributes={TextAttributes.DIM}>
                  {entryPrompt}
                </CoasttyText>
                <CoasttyText fg={colors.accent} attributes={TextAttributes.BOLD}>
                  {entryPrompt}
                </CoasttyText>
                <CoasttyText fg={colors.shadow} attributes={TextAttributes.DIM}>
                  {entryPrompt}
                </CoasttyText>
                </>
              )}
            </box>
          </box>
        </box>
      )}

      {!frame.complete && (
        <CoasttyText position="absolute" left={compact ? 2 : 4} bottom={2} fg={colors.muted} attributes={TextAttributes.DIM}>
          {elapsedMs < TITLE_START_MS
            ? `${spinner} BOOTING FROM COASTTY DISK`
            : "SIGNAL LOCKED // CALIBRATING DISPLAY"}
        </CoasttyText>
      )}

      {frame.complete && (
        <box position="absolute" right={compact ? 1 : 3} bottom={2} height={1} flexDirection="row" backgroundColor={colors.shadow}>
          <box
            paddingX={1}
            backgroundColor={musicOn ? colors.accent : colors.shadow}
            onMouseDown={(event) => {
              event.stopPropagation();
              setMusicOn(true);
            }}
          >
            <CoasttyText fg={musicOn ? colors.background : colors.primary} attributes={musicOn ? TextAttributes.BOLD : undefined}>MUSIC ON</CoasttyText>
          </box>
          <CoasttyText fg={colors.muted}> / </CoasttyText>
          <box
            paddingX={1}
            backgroundColor={!musicOn ? colors.accent : colors.shadow}
            onMouseDown={(event) => {
              event.stopPropagation();
              setMusicOn(false);
            }}
          >
            <CoasttyText fg={!musicOn ? colors.background : colors.primary} attributes={!musicOn ? TextAttributes.BOLD : undefined}>MUSIC OFF</CoasttyText>
          </box>
        </box>
      )}
    </box>
  );
}
