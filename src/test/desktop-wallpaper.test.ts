import { describe, expect, test } from "bun:test";
import { buildDesktopWallpaper, buildWallpaperBackdrop, calculateSunGeometry } from "../desktop/desktop-wallpaper";

describe("desktop wallpaper", () => {
  test("builds a centered sun above a perspective grid", () => {
    const width = 80;
    const height = 29;
    const layers = buildDesktopWallpaper(width, height);
    const sunLayers = layers.filter((layer) => layer.text.includes("@"));
    const horizon = layers.find((layer) => layer.text === "=".repeat(width));
    const floorLayers = layers.filter((layer) => layer.top > (horizon?.top ?? height));

    expect(sunLayers.length).toBeGreaterThan(3);
    expect(sunLayers.every((layer) => Math.abs(layer.left + layer.text.length / 2 - width / 2) < 1)).toBe(true);
    expect(horizon).toBeDefined();
    expect(floorLayers.some((layer) => layer.text.includes("+"))).toBe(true);
    expect(floorLayers.some((layer) => layer.text.includes("-"))).toBe(true);
  });

  test("keeps the sun physically circular across viewport shapes", () => {
    const viewports = [[160, 30], [100, 36], [72, 36], [50, 44], [24, 14], [16, 60]] as const;
    const cellAspectRatio = 0.5;

    for (const [width, height] of viewports) {
      const layers = buildDesktopWallpaper(width, height, cellAspectRatio);
      const horizon = layers.find((layer) => layer.text === "=".repeat(width));
      const geometry = calculateSunGeometry(width, horizon?.top ?? 0, cellAspectRatio);
      const sunLayers = layers.filter((layer) => layer.bold && layer.top < (horizon?.top ?? 0));
      const widestSunRow = Math.max(...sunLayers.map((layer) => layer.text.length));
      const physicalWidth = widestSunRow * cellAspectRatio;

      expect(horizon).toBeDefined();
      expect(sunLayers.length).toBeGreaterThan(1);
      expect(Math.abs(physicalWidth - (geometry?.radiusY ?? 0) * 2)).toBeLessThanOrEqual(1.5);
      expect(sunLayers.every((layer) => Math.abs(layer.left + layer.text.length / 2 - width / 2) < 1)).toBe(true);
    }
  });

  test("adapts the circle to measured terminal cell proportions", () => {
    const width = 100;
    const height = 36;

    for (const aspectRatio of [0.4, 0.5, 0.7]) {
      const layers = buildDesktopWallpaper(width, height, aspectRatio);
      const horizon = layers.find((layer) => layer.text === "=".repeat(width));
      const geometry = calculateSunGeometry(width, horizon?.top ?? 0, aspectRatio);
      const sunLayers = layers.filter((layer) => layer.bold && layer.top < (horizon?.top ?? 0));

      expect(geometry).not.toBeNull();
      expect(sunLayers.length).toBe((horizon?.top ?? 0) - ((geometry?.centerY ?? 0) - (geometry?.radiusY ?? 0)));
      for (const layer of sunLayers) {
        const distanceY = layer.top + 0.5 - (geometry?.centerY ?? 0);
        const expectedHalfWidth = Math.floor(
          Math.sqrt(Math.max(0, (geometry?.radiusY ?? 0) ** 2 - distanceY ** 2)) / aspectRatio,
        );
        expect(layer.text.length).toBe(expectedHalfWidth * 2 + 1);
      }
    }

    const widthConstrained = calculateSunGeometry(16, 35, 0.5);
    expect(widthConstrained?.radiusY).toBe(3);
  });

  test("sets the sun into the horizon while preserving its circular geometry", () => {
    const horizon = 20;
    const geometry = calculateSunGeometry(100, horizon, 0.5);

    expect(geometry).not.toBeNull();
    expect((geometry?.centerY ?? 0) + (geometry?.radiusY ?? 0)).toBeGreaterThan(horizon);
    expect(horizon - ((geometry?.centerY ?? 0) - (geometry?.radiusY ?? 0))).toBeLessThan((geometry?.radiusY ?? 0) * 2);
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
