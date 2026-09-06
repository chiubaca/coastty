import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { useEffect, useState } from "react";
import { CoasttyText } from "../../ui/coastty-text";
import { themes, themeOrder } from "../../ui/theme";
import { Spectrum } from "./spectrum";
import { ThreeVisualizer } from "./three-visualizer";

// Deliberately synthetic input for comparing motion and silence without a live stream.
function fixtureSpectrum(seconds: number) {
  return Array.from({ length: 24 }, (_, band) => {
    const kick = Math.exp(-(seconds % 0.5) * 14) * Math.exp(-band / 5);
    const melody = (0.5 + 0.5 * Math.sin(band * 0.65 - seconds * 2)) * 0.48;
    const hat = Math.exp(-(seconds % 0.25) * 30) * (band / 24) * 0.3;
    return Math.min(1, 0.06 + kick * 0.75 + melody + hat);
  });
}

function Preview() {
  const renderer = useRenderer();
  const [mode, setMode] = useState("3");
  const [themeIndex, setThemeIndex] = useState(0);
  const [silent, setSilent] = useState(false);
  const [spectrum, setSpectrum] = useState<readonly number[]>([]);
  const colors = themes[themeOrder[themeIndex]!].colors;
  useEffect(() => {
    if (silent) {
      setSpectrum([]);
      return;
    }
    const started = performance.now();
    const timer = setInterval(() => setSpectrum(fixtureSpectrum((performance.now() - started) / 1_000)), 40);
    return () => clearInterval(timer);
  }, [silent]);
  useKeyboard((key) => {
    if (["1", "2", "3"].includes(key.sequence)) setMode(key.sequence);
    if (key.name === "space") setSilent((value) => !value);
    if (key.sequence === "t") setThemeIndex((index) => (index + 1) % themeOrder.length);
    if (key.name === "escape") renderer.destroy();
  });
  return (
    <box flexGrow={1} backgroundColor={colors.background} flexDirection="column">
      <CoasttyText fg={colors.muted}>VISUALIZER STUDIO / SIMULATED AUDIO{silent ? " / SILENT" : " / 120 BPM"}</CoasttyText>
      {mode === "1" ? <Spectrum spectrum={spectrum} colors={colors} />
        : <ThreeVisualizer key={mode} kind={mode === "2" ? "bars" : "blob"} spectrum={spectrum} colors={colors} />}
      <CoasttyText fg={colors.primary}>1 SPECTRUM · 2 PRISM · 3 NACRE · T THEME · SPACE SILENCE · ESC EXIT</CoasttyText>
    </box>
  );
}

const renderer = await createCliRenderer({ targetFps: 30 });
createRoot(renderer).render(<Preview />);
