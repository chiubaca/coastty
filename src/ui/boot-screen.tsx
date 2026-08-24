import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import { LofiText } from "./lofi-text";
import { useTheme } from "./theme";

export const BOOT_TITLE = "//////////  L O F I . F M  //////////";

const BIOS_LINES = [
  "LOFI SYSTEMS ROM BIOS (C) 1995",
  "CPU: AUDIOWAVE 486DX2 @ 66MHz",
  "MEMORY TEST: 640K .............. OK",
  "AUDIO DEVICE: FM SYNTH ........ OK",
  "SCANNING NIGHT FREQUENCIES .... OK",
  "MOUNTING /DEV/MIXTAPE ......... OK",
  "STARTING WINDOW MANAGER ....... OK",
] as const;

const BIOS_LINE_INTERVAL_MS = 390;
const TITLE_START_MS = 3_375;
const TITLE_CHARACTER_INTERVAL_MS = 57;
const GLOW_INTERVAL_MS = 210;
const GLOW_DURATION_MS = 1_470;
const ENTRY_FADE_INTERVAL_MS = 180;
const ENTRY_FADE_STEPS = 4;
const ENTRY_PULSE_INTERVAL_MS = 240;
const GLOW_START_MS = TITLE_START_MS + BOOT_TITLE.length * TITLE_CHARACTER_INTERVAL_MS;
export const BOOT_DURATION_MS = GLOW_START_MS + GLOW_DURATION_MS;

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
  { row: "L O F I   8 5", shade: 6 },
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
  readonly titleCharacterCount: number;
  readonly glowStep: number;
  readonly complete: boolean;
};

export function getBootFrame(elapsedMs: number): BootFrame {
  const elapsed = Math.max(0, elapsedMs);
  const titleCharacterCount = Math.min(
    BOOT_TITLE.length,
    Math.max(0, Math.floor((elapsed - TITLE_START_MS) / TITLE_CHARACTER_INTERVAL_MS) + 1),
  );

  return {
    biosLineCount: Math.min(BIOS_LINES.length, Math.floor(elapsed / BIOS_LINE_INTERVAL_MS) + 1),
    biosComplete: elapsed >= (BIOS_LINES.length - 1) * BIOS_LINE_INTERVAL_MS,
    titleCharacterCount,
    glowStep: elapsed < GLOW_START_MS ? 0 : Math.floor((elapsed - GLOW_START_MS) / GLOW_INTERVAL_MS),
    complete: elapsed >= BOOT_DURATION_MS,
  };
}

type BootScreenProps = {
  readonly onComplete: () => void;
};

export function BootScreen({ onComplete }: BootScreenProps) {
  const { width, height } = useTerminalDimensions();
  const { themeId, theme: { colors } } = useTheme();
  const [elapsedMs, setElapsedMs] = useState(0);
  const compact = width < 68;
  const frame = getBootFrame(elapsedMs);
  const titleGlyphCount = Math.min(10, Math.max(0, frame.titleCharacterCount - 1));
  const titleGlyphs = "/".repeat(titleGlyphCount);
  const expandedTitle = `${titleGlyphs}  L O F I . F M  ${titleGlyphs}`;
  const titleVisible = elapsedMs >= TITLE_START_MS;
  const entryPrompt = "[CLICK TO ENTER]";
  const entryPulseColors = [colors.subdued, colors.accent, colors.glow, colors.white, colors.glow, colors.accent] as const;
  const entryAgeMs = Math.max(0, elapsedMs - BOOT_DURATION_MS);
  const entryFadeColors = [colors.shadow, colors.muted, colors.secondary, colors.subdued] as const;
  const entryFadeStep = Math.min(ENTRY_FADE_STEPS - 1, Math.floor(entryAgeMs / ENTRY_FADE_INTERVAL_MS));
  const entryPulseStep = Math.max(0, Math.floor((entryAgeMs - ENTRY_FADE_STEPS * ENTRY_FADE_INTERVAL_MS) / ENTRY_PULSE_INTERVAL_MS));
  const entryColor = entryAgeMs < ENTRY_FADE_STEPS * ENTRY_FADE_INTERVAL_MS
    ? entryFadeColors[entryFadeStep]
    : entryPulseColors[entryPulseStep % entryPulseColors.length];
  const glowColors = [colors.accent, colors.glow, colors.white, colors.glowSoft] as const;
  const glowColor = glowColors[frame.glowStep % glowColors.length];
  const spinner = SPINNER[Math.floor(elapsedMs / 150) % SPINNER.length];
  const logoStacksWithBios = width < BOOT_LOGO_WIDTH + 46;
  const showBootLogo = !frame.biosComplete && width >= BOOT_LOGO_WIDTH;
  const bootLogoColors = themeId === "arcade"
    ? ARCADE_BOOT_LOGO_COLORS
    : [colors.highlight, colors.accent, colors.accent, colors.primary, colors.primary, colors.secondary, colors.subdued];

  function enterDesktop() {
    if (frame.complete) onComplete();
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
            <LofiText key={index} fg={bootLogoColors[shade]} attributes={TextAttributes.BOLD}>
              {`${" ".repeat(Math.floor((BOOT_LOGO_WIDTH - row.length) / 2))}${row}`}
            </LofiText>
          ))}
        </box>
      )}

      {elapsedMs < TITLE_START_MS && (
        <box position="absolute" top={logoStacksWithBios ? BOOT_LOGO.length + 3 : 3} left={compact ? 2 : 4}>
          {BIOS_LINES.slice(0, frame.biosLineCount).map((line, index) => (
            <LofiText
              key={line}
              fg={index === frame.biosLineCount - 1 ? colors.highlight : colors.primary}
              attributes={index === 0 ? TextAttributes.BOLD : undefined}
            >
              {line}
            </LofiText>
          ))}
        </box>
      )}

      {titleVisible && (
        <box flexGrow={1} alignItems="center" justifyContent="center">
          <box height={3} width={Math.max(expandedTitle.length, entryPrompt.length)} alignItems="center" justifyContent="center">
            <LofiText position="absolute" top={0} fg={colors.shadow} attributes={TextAttributes.DIM}>
              {expandedTitle}
            </LofiText>
            <LofiText position="absolute" top={1} fg={glowColor} attributes={TextAttributes.BOLD}>
              {expandedTitle}
            </LofiText>
            <LofiText position="absolute" top={2} fg={colors.shadow} attributes={TextAttributes.DIM}>
              {expandedTitle}
            </LofiText>
            {frame.complete && (
              <>
                <LofiText position="absolute" top={4} fg={colors.shadow} attributes={TextAttributes.DIM}>
                  {entryPrompt}
                </LofiText>
                <LofiText position="absolute" top={5} fg={entryColor} attributes={TextAttributes.BOLD}>
                  {entryPrompt}
                </LofiText>
                <LofiText position="absolute" top={6} fg={colors.shadow} attributes={TextAttributes.DIM}>
                  {entryPrompt}
                </LofiText>
              </>
            )}
          </box>
        </box>
      )}

      {!frame.complete && (
        <LofiText position="absolute" left={compact ? 2 : 4} bottom={2} fg={colors.muted} attributes={TextAttributes.DIM}>
          {elapsedMs < TITLE_START_MS
            ? `${spinner} BOOTING FROM LOFI DISK`
            : "SIGNAL LOCKED // CALIBRATING DISPLAY"}
        </LofiText>
      )}
    </box>
  );
}
