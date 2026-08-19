import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import { LofiText } from "./lofi-text";
import { useTheme } from "./theme";

const BOOT_BRAND = "LOFI.FM";
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
const GLITCH_INTERVAL_MS = 180;
const GLITCH_DURATION_MS = 2_100;
const ENTRY_GLYPH_INTERVAL_MS = 150;
const ENTRY_GLYPH_COUNT = 7;
const ENTRY_PULSE_INTERVAL_MS = 240;
const GLOW_START_MS = TITLE_START_MS + BOOT_TITLE.length * TITLE_CHARACTER_INTERVAL_MS;
const GLITCH_START_MS = GLOW_START_MS + GLOW_DURATION_MS;
export const BOOT_DURATION_MS = GLITCH_START_MS + GLITCH_DURATION_MS;

const SPINNER = ["-", "\\", "|", "/"] as const;

export type BootFrame = {
  readonly biosLineCount: number;
  readonly titleCharacterCount: number;
  readonly glowStep: number;
  readonly glitchStep: number;
  readonly glitching: boolean;
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
    titleCharacterCount,
    glowStep: elapsed < GLOW_START_MS ? 0 : Math.floor((elapsed - GLOW_START_MS) / GLOW_INTERVAL_MS),
    glitchStep: elapsed < GLITCH_START_MS ? 0 : Math.floor((elapsed - GLITCH_START_MS) / GLITCH_INTERVAL_MS),
    glitching: elapsed >= GLITCH_START_MS && elapsed < BOOT_DURATION_MS,
    complete: elapsed >= BOOT_DURATION_MS,
  };
}

function randomFromSeed(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  return value - Math.floor(value);
}

function getGlitchFragments(step: number, width: number, height: number) {
  const maxLeft = Math.max(1, width - 1);
  const maxTop = Math.max(1, height - 1);

  return Array.from({ length: BOOT_BRAND.length * 2 }, (_, index) => ({
    character: BOOT_BRAND[index % BOOT_BRAND.length],
    left: Math.floor(randomFromSeed(step * 31 + index * 2 + 1) * maxLeft),
    top: Math.floor(randomFromSeed(step * 47 + index * 2 + 2) * maxTop),
    ghost: index >= BOOT_TITLE.length,
  }));
}

type BootScreenProps = {
  readonly onComplete: () => void;
};

export function BootScreen({ onComplete }: BootScreenProps) {
  const { width, height } = useTerminalDimensions();
  const { theme: { colors } } = useTheme();
  const [elapsedMs, setElapsedMs] = useState(0);
  const compact = width < 68;
  const frame = getBootFrame(elapsedMs);
  const titleGlyphCount = Math.min(10, Math.max(0, frame.titleCharacterCount - 1));
  const titleGlyphs = "/".repeat(titleGlyphCount);
  const expandedTitle = `${titleGlyphs}  L O F I . F M  ${titleGlyphs}`;
  const titleVisible = elapsedMs >= TITLE_START_MS && !frame.glitching && !frame.complete;
  const entryGlyphCount = Math.min(
    compact ? 3 : ENTRY_GLYPH_COUNT,
    Math.max(0, Math.floor((elapsedMs - BOOT_DURATION_MS) / ENTRY_GLYPH_INTERVAL_MS) + 1),
  );
  const entryGlyphs = "/".repeat(entryGlyphCount);
  const entryPrompt = `${entryGlyphs} [ CLICK TO ENTER ] ${entryGlyphs}`;
  const entryPulseColors = [colors.subdued, colors.accent, colors.glow, colors.white, colors.glow, colors.accent] as const;
  const entryPulseStep = Math.max(0, Math.floor((elapsedMs - BOOT_DURATION_MS) / ENTRY_PULSE_INTERVAL_MS));
  const entryPulseColor = entryPulseColors[entryPulseStep % entryPulseColors.length];
  const glowColors = [colors.accent, colors.glow, colors.white, colors.glowSoft] as const;
  const glowColor = glowColors[frame.glowStep % glowColors.length];
  const spinner = SPINNER[Math.floor(elapsedMs / 150) % SPINNER.length];
  const glitchFragments = frame.glitching ? getGlitchFragments(frame.glitchStep, width, height) : [];

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
      {!frame.complete && (
        <box position="absolute" top={1} right={compact ? 1 : 3} width={18}>
          <LofiText fg={colors.border}>+----------------+</LofiText>
          <LofiText fg={colors.accent} attributes={TextAttributes.BOLD}>| [] LOFI.FM    |</LofiText>
          <LofiText fg={colors.secondary}>|    FM/OS  95  |</LofiText>
          <LofiText fg={colors.border}>+----------------+</LofiText>
        </box>
      )}

      {elapsedMs < TITLE_START_MS && (
        <box position="absolute" top={compact ? 7 : 3} left={compact ? 2 : 4}>
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
          <box height={3} width={expandedTitle.length} alignItems="center" justifyContent="center">
            <LofiText position="absolute" top={0} fg={colors.shadow} attributes={TextAttributes.DIM}>
              {expandedTitle}
            </LofiText>
            <LofiText position="absolute" top={1} fg={glowColor} attributes={TextAttributes.BOLD}>
              {expandedTitle}
            </LofiText>
            <LofiText position="absolute" top={2} fg={colors.shadow} attributes={TextAttributes.DIM}>
              {expandedTitle}
            </LofiText>
          </box>
        </box>
      )}

      {glitchFragments.map((fragment, index) => (
        <LofiText
          key={index}
          position="absolute"
          left={fragment.left}
          top={fragment.top}
          fg={fragment.ghost ? colors.shadow : glowColors[(index + frame.glitchStep) % glowColors.length]}
          attributes={fragment.ghost ? TextAttributes.DIM : TextAttributes.BOLD}
        >
          {fragment.character}
        </LofiText>
      ))}

      {frame.complete && (
        <box flexGrow={1} alignItems="center" justifyContent="center">
          <box height={3} width={entryPrompt.length} alignItems="center" justifyContent="center">
            <LofiText position="absolute" top={0} fg={colors.shadow} attributes={TextAttributes.DIM}>
              {entryPrompt}
            </LofiText>
            <LofiText position="absolute" top={1} fg={colors.subdued} attributes={TextAttributes.BOLD}>
              <span>{entryGlyphs} </span>
              <span fg={entryPulseColor} attributes={TextAttributes.BOLD}>[ CLICK TO ENTER ]</span>
              <span> {entryGlyphs}</span>
            </LofiText>
            <LofiText position="absolute" top={2} fg={colors.shadow} attributes={TextAttributes.DIM}>
              {entryPrompt}
            </LofiText>
          </box>
        </box>
      )}

      {!frame.complete && (
        <LofiText position="absolute" left={compact ? 2 : 4} bottom={2} fg={colors.muted} attributes={TextAttributes.DIM}>
          {elapsedMs < TITLE_START_MS
            ? `${spinner} BOOTING FROM LOFI DISK`
            : frame.glitching
              ? "SIGNAL BREAK // RECONSTRUCTING IDENTITY"
              : "SIGNAL LOCKED // CALIBRATING DISPLAY"}
        </LofiText>
      )}
    </box>
  );
}
