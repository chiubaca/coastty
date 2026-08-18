import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import { LofiText } from "./lofi-text";

export const BOOT_TITLE = "///////// LOFI.FM ////////////";

const BIOS_LINES = [
  "LOFI SYSTEMS ROM BIOS (C) 1995",
  "CPU: AUDIOWAVE 486DX2 @ 66MHz",
  "MEMORY TEST: 640K .............. OK",
  "AUDIO DEVICE: FM SYNTH ........ OK",
  "SCANNING NIGHT FREQUENCIES .... OK",
  "MOUNTING /DEV/MIXTAPE ......... OK",
  "STARTING WINDOW MANAGER ....... OK",
] as const;

const BIOS_LINE_INTERVAL_MS = 260;
const TITLE_START_MS = 2_250;
const TITLE_CHARACTER_INTERVAL_MS = 38;
const GLOW_INTERVAL_MS = 140;
const GLOW_DURATION_MS = 980;
const GLOW_START_MS = TITLE_START_MS + BOOT_TITLE.length * TITLE_CHARACTER_INTERVAL_MS;
export const BOOT_DURATION_MS = GLOW_START_MS + GLOW_DURATION_MS;

const TITLE_BRAND_START = BOOT_TITLE.indexOf("LOFI.FM");
const TITLE_BRAND_END = TITLE_BRAND_START + "LOFI.FM".length;
const GLOW_COLORS = ["#7cffc9", "#b9ffe8", "#ffffff", "#d8fff2"] as const;
const SPINNER = ["-", "\\", "|", "/"] as const;

export type BootFrame = {
  readonly biosLineCount: number;
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
    titleCharacterCount,
    glowStep: elapsed < GLOW_START_MS ? 0 : Math.floor((elapsed - GLOW_START_MS) / GLOW_INTERVAL_MS),
    complete: elapsed >= BOOT_DURATION_MS,
  };
}

type BootScreenProps = {
  readonly onComplete: () => void;
};

export function BootScreen({ onComplete }: BootScreenProps) {
  const { width } = useTerminalDimensions();
  const [elapsedMs, setElapsedMs] = useState(0);
  const compact = width < 68;
  const frame = getBootFrame(elapsedMs);
  const visibleTitle = BOOT_TITLE.slice(0, frame.titleCharacterCount);
  const prefix = visibleTitle.slice(0, TITLE_BRAND_START);
  const brand = visibleTitle.slice(TITLE_BRAND_START, TITLE_BRAND_END);
  const suffix = visibleTitle.slice(TITLE_BRAND_END);
  const isGlowing = elapsedMs >= GLOW_START_MS;
  const glowColor = GLOW_COLORS[frame.glowStep % GLOW_COLORS.length];
  const spinner = SPINNER[Math.floor(elapsedMs / 100) % SPINNER.length];

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= BOOT_DURATION_MS) {
        clearInterval(timer);
        onComplete();
        return;
      }
      setElapsedMs(elapsed);
    }, 32);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <box flexGrow={1} backgroundColor="#020706">
      <box position="absolute" top={1} right={compact ? 1 : 3} width={18}>
        <LofiText fg="#24594e">+----------------+</LofiText>
        <LofiText fg="#7cffc9" attributes={TextAttributes.BOLD}>| [] LOFI.FM    |</LofiText>
        <LofiText fg="#4ba58e">|    FM/OS  95  |</LofiText>
        <LofiText fg="#24594e">+----------------+</LofiText>
      </box>

      {elapsedMs < TITLE_START_MS ? (
        <box position="absolute" top={compact ? 7 : 3} left={compact ? 2 : 4}>
          {BIOS_LINES.slice(0, frame.biosLineCount).map((line, index) => (
            <LofiText
              key={line}
              fg={index === frame.biosLineCount - 1 ? "#a5ffe6" : "#5db49d"}
              attributes={index === 0 ? TextAttributes.BOLD : undefined}
            >
              {line}
            </LofiText>
          ))}
        </box>
      ) : (
        <box flexGrow={1} alignItems="center" justifyContent="center">
          <box height={3} width={BOOT_TITLE.length}>
            {isGlowing && (
              <>
                <LofiText position="absolute" top={0} fg="#174b40" attributes={TextAttributes.DIM}>
                  {BOOT_TITLE}
                </LofiText>
                <LofiText position="absolute" top={2} fg="#174b40" attributes={TextAttributes.DIM}>
                  {BOOT_TITLE}
                </LofiText>
              </>
            )}
            <LofiText position="absolute" top={1} fg="#3a806f">
              <span>{prefix}</span>
              <span fg={glowColor} attributes={TextAttributes.BOLD}>{brand}</span>
              <span>{suffix}</span>
            </LofiText>
          </box>
        </box>
      )}

      <LofiText position="absolute" left={compact ? 2 : 4} bottom={2} fg="#356c5e" attributes={TextAttributes.DIM}>
        {elapsedMs < TITLE_START_MS ? `${spinner} BOOTING FROM LOFI DISK` : "SIGNAL LOCKED // ENTERING DESKTOP"}
      </LofiText>
    </box>
  );
}
