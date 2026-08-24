import { describe, expect, test } from "bun:test";
import { buildDesktopWallpaper, buildWallpaperBackdrop } from "../desktop/desktop-wallpaper";

describe("desktop wallpaper", () => {
  test("keeps a complete floating circular sun across viewport shapes", () => {
    const viewports = [
      [160, 30, 0.5],
      [100, 36, 0.5],
      [72, 36, 0.5],
      [50, 44, 0.5],
      [24, 14, 0.5],
      [16, 60, 0.5],
      [100, 36, 0.4],
      [100, 36, 0.7],
    ] as const;

    for (const [width, height, cellAspectRatio] of viewports) {
      const layers = buildDesktopWallpaper(width, height, cellAspectRatio);
      const horizon = layers.find((layer) => (
        layer.bold && layer.left === 0 && layer.text.length === width && /^[+-]+$/.test(layer.text)
      ));

      expect(horizon).toBeDefined();
      if (!horizon) continue;

      const sunRows = layers.filter((layer) => layer.bold && layer.top < horizon.top);
      const rowWidths = sunRows.map((layer) => layer.text.length);
      const widestPhysicalRow = Math.max(...rowWidths) * cellAspectRatio;

      expect(sunRows.length).toBeGreaterThan(1);
      expect(sunRows.map((layer) => layer.top)).toEqual(
        Array.from({ length: sunRows.length }, (_, index) => sunRows[0]!.top + index),
      );
      expect(rowWidths).toEqual([...rowWidths].reverse());
      expect(widestPhysicalRow).toBeWithin(sunRows.length - 1.5, sunRows.length + 1.5);
      expect(sunRows.every((layer) => (
        Math.abs(layer.left + (layer.text.length - 1) / 2 - (width - 1) / 2) <= 0.5
      ))).toBe(true);
      expect(sunRows.at(-1)!.top).toBeLessThan(horizon.top - 1);
    }
  });

  test("renders a lower-striped sun over an expanding perspective grid", () => {
    const width = 80;
    const height = 30;
    const layers = buildDesktopWallpaper(width, height);
    const horizon = layers.find((layer) => (
      layer.bold && layer.left === 0 && layer.text.length === width && /^[+-]+$/.test(layer.text)
    ));

    expect(horizon).toBeDefined();
    if (!horizon) return;

    const sunRows = layers.filter((layer) => layer.bold && layer.top < horizon.top);
    const stripeStart = Math.floor(sunRows.length * 0.75);
    const stripedRows = sunRows.slice(stripeStart);
    expect(sunRows[stripeStart - 1]?.text).toContain("@");
    expect(stripedRows.every((layer) => layer.text.includes("=") && !layer.text.includes("@"))).toBe(true);

    const horizonRayColumns = [...horizon.text].flatMap((glyph, index) => glyph === "+" ? [index] : []);
    expect(horizon.text).toContain("-");
    expect(horizonRayColumns.length).toBeGreaterThanOrEqual(5);
    expect(horizonRayColumns.at(-1)! - horizonRayColumns[0]!).toBeGreaterThanOrEqual(Math.floor(width * 0.45));

    const horizontalRows = layers
      .filter((layer) => layer.left === 0 && layer.text.length === width && /^[+-]+$/.test(layer.text))
      .map((layer) => layer.top)
      .sort((left, right) => left - right);
    const horizontalGaps = horizontalRows.slice(1).map((row, index) => row - horizontalRows[index]!);

    expect(horizontalRows[0]).toBe(horizon.top);
    expect(horizontalRows.length).toBeGreaterThanOrEqual(6);
    expect(horizontalGaps[0]).toBe(1);
    expect(horizontalGaps.some((gap) => gap > 1)).toBe(true);
    expect(horizontalGaps.every((gap, index) => index === 0 || gap >= horizontalGaps[index - 1]!)).toBe(true);
    expect(horizontalRows.some((row) => row >= height - 3)).toBe(false);
  });

  test("paints continuous sky and floor color depth behind the glyphs", () => {
    const backdrop = buildWallpaperBackdrop(29);
    const distinctColors = new Set(backdrop.map((row) => row.color));

    expect(backdrop).toHaveLength(29);
    expect(distinctColors.size).toBeGreaterThan(20);
    expect(backdrop[0]?.color).not.toBe(backdrop[16]?.color);
    expect(backdrop[16]?.color).not.toBe(backdrop[28]?.color);
  });

  test("stays within compact terminal dimensions", () => {
    const dimensions = [[32, 10], [13, 8], [1, 1]] as const;

    for (const [width, height] of dimensions) {
      const layers = buildDesktopWallpaper(width, height);
      expect(layers.every((layer) => layer.top >= 0 && layer.top < height)).toBe(true);
      expect(layers.every((layer) => layer.left >= 0 && layer.left + layer.text.length <= width)).toBe(true);
    }
  });
});
