import { Renderable, RGBA, type OptimizedBuffer, type RenderableOptions, type RenderContext } from "@opentui/core";
import { extend } from "@opentui/react";
import type { ThemeColors } from "../../ui/theme";
import { spectrumBands } from "./visualizer-motion";

type SpectrumProps = {
  readonly spectrum: readonly number[];
  readonly colors: ThemeColors;
};

const BAND_COUNT = 24;
const SETTLED = 0.001;
const PEAK_HOLD_SECONDS = 0.28;

type Band = { target: number; height: number; peak: number; hold: number };

function mix(from: RGBA, to: RGBA, amount: number): RGBA {
  return RGBA.fromValues(
    from.r + (to.r - from.r) * amount,
    from.g + (to.g - from.g) * amount,
    from.b + (to.b - from.b) * amount,
    1,
  );
}

type BarPaint = {
  readonly body: readonly RGBA[];
  readonly edge: readonly RGBA[];
  readonly reflection: readonly RGBA[];
  readonly cap: RGBA;
  readonly peak: RGBA;
};

/** A half-cell raster: terminal cells are pixels, not a tree of animated boxes. */
export class SpectrumRenderable extends Renderable {
  private readonly bands: Band[] = Array.from({ length: BAND_COUNT }, () => ({ target: 0, height: 0, peak: 0, hold: 0 }));
  private theme: ThemeColors;
  private background: RGBA;
  private paints: BarPaint[] = [];
  private paintKey = "";

  constructor(ctx: RenderContext, options: RenderableOptions & SpectrumProps) {
    super(ctx, { ...options, buffered: true });
    this.theme = options.colors;
    this.background = RGBA.fromHex(options.colors.background);
    this.spectrum = options.spectrum;
  }

  set spectrum(values: readonly number[]) {
    let changed = false;
    spectrumBands(values, BAND_COUNT).forEach((target, index) => {
      const band = this.bands[index]!;
      if (band.target !== target) changed = true;
      band.target = target;
    });
    if (changed) {
      this.live = true;
      this.requestRender();
    }
  }

  set colors(colors: ThemeColors) {
    this.theme = colors;
    this.background = RGBA.fromHex(colors.background);
    this.paintKey = "";
    this.requestRender();
  }

  protected override onUpdate(deltaTime: number) {
    if (!this.live) return;
    // Renderer deltas are milliseconds. Limit catch-up after a suspended window.
    const elapsed = Number.isFinite(deltaTime) ? Math.max(0, Math.min(100, deltaTime)) / 1_000 : 0;
    let moving = false;
    for (const band of this.bands) {
      const rate = band.target > band.height ? 24 : 5.5;
      band.height += (band.target - band.height) * (1 - Math.exp(-rate * elapsed));
      if (Math.abs(band.target - band.height) < SETTLED) band.height = band.target;

      if (band.height >= band.peak) {
        band.peak = band.height;
        band.hold = PEAK_HOLD_SECONDS;
      } else {
        const fallingTime = Math.max(0, elapsed - band.hold);
        band.hold = Math.max(0, band.hold - elapsed);
        band.peak = Math.max(band.height, band.peak - fallingTime * 0.65);
        if (band.peak - band.height < SETTLED) band.peak = band.height;
      }
      moving ||= band.height !== band.target || band.peak !== band.height;
    }
    // The core owns frame scheduling and releases live renderables on destroy.
    // A held constant signal, like silence, needs no animation once settled.
    this.live = moving;
    this.markDirty();
  }

  private preparePaint(count: number, barPixels: number, reflectionPixels: number) {
    const key = `${count}:${barPixels}:${reflectionPixels}`;
    if (this.paintKey === key) return;
    this.paintKey = key;
    const accent = RGBA.fromHex(this.theme.accent);
    const secondary = RGBA.fromHex(this.theme.secondary);
    const soft = RGBA.fromHex(this.theme.glowSoft);
    this.paints = Array.from({ length: count }, (_, index) => {
      // A continuous, restrained hue drift, not alternating rainbow stripes.
      const jewel = mix(accent, secondary, 0.24 * index / Math.max(1, count - 1));
      const body = Array.from({ length: barPixels }, (_, pixel) => {
        const elevation = pixel / Math.max(1, barPixels - 1);
        const lit = mix(jewel, soft, Math.pow(elevation, 2) * 0.28);
        return mix(this.background, lit, 0.3 + 0.65 * Math.pow(elevation, 0.7));
      });
      return {
        body,
        edge: body.map((color) => mix(this.background, color, 0.72)),
        cap: mix(jewel, soft, 0.8),
        peak: mix(this.background, mix(jewel, soft, 0.6), 0.38),
        reflection: Array.from({ length: reflectionPixels }, (_, pixel) =>
          mix(this.background, jewel, 0.12 * Math.pow(1 - pixel / Math.max(1, reflectionPixels), 3))),
      };
    });
  }

  protected override renderSelf(buffer: OptimizedBuffer) {
    if (!this.isDirty) return;
    buffer.clear(this.background);
    const width = this.width;
    const height = this.height;
    if (width < 1 || height < 1) return;

    const inset = width >= 8 ? 1 : 0;
    const available = width - inset * 2;
    const count = Math.min(BAND_COUNT, Math.max(1, Math.floor((available + 1) / 3)));
    const gap = count > 1 ? 1 : 0;
    const top = height >= 6 ? 1 : 0;
    const reflectionRows = height >= 6 ? Math.min(3, Math.floor(height * 0.2)) : 0;
    const barPixels = (height - top - reflectionRows) * 2;
    const reflectionPixels = reflectionRows * 2;
    this.preparePaint(count, barPixels, reflectionPixels);

    const levels = spectrumBands(this.bands.map((band) => band.height), count);
    const peaks = spectrumBands(this.bands.map((band) => band.peak), count);
    const baseline = (height - reflectionRows) * 2;

    for (let index = 0; index < count; index++) {
      const level = levels[index]!;
      const filled = Math.round(level * barPixels);
      const peak = Math.round(peaks[index]! * barPixels);
      if (filled === 0 && peak === 0) continue;
      const paint = this.paints[index]!;
      const left = inset + Math.floor(index * (available + gap) / count);
      const right = inset + Math.floor((index + 1) * (available + gap) / count) - gap;
      const reflected = Math.round(level * Math.max(0, reflectionPixels - 1));

      for (let x = left; x < right; x++) {
        const edge = right - left >= 3 && x === right - 1;
        const pixelColor = (y: number): RGBA => {
          const elevation = baseline - y - 1;
          if (elevation >= 0 && elevation < barPixels) {
            if (elevation === filled - 1) return paint.cap;
            if (elevation < filled) return (edge ? paint.edge : paint.body)[elevation]!;
            if (peak > filled + 1 && elevation === peak - 1) return paint.peak;
          }
          // One dark half-cell separates each bar from its compressed reflection.
          const depth = y - baseline - 1;
          if (depth >= 0 && depth < reflected) return paint.reflection[depth]!;
          return this.background;
        };
        for (let y = top; y < height; y++) {
          const upper = pixelColor(y * 2);
          const lower = pixelColor(y * 2 + 1);
          if (upper === this.background && lower === this.background) continue;
          // Block glyphs are raster primitives; there is no selectable text here.
          buffer.setCell(x, y, "▀", upper, lower);
        }
      }
    }
  }
}

declare module "@opentui/react" {
  interface OpenTUIComponents {
    coasttySpectrum: typeof SpectrumRenderable;
  }
}

extend({ coasttySpectrum: SpectrumRenderable });

export function Spectrum({ spectrum, colors }: SpectrumProps) {
  return <coasttySpectrum flexGrow={1} minWidth={1} minHeight={1} spectrum={spectrum} colors={colors} />;
}
