import { describe, expect, test } from "bun:test";
import { buildDesktopWallpaper, buildWallpaperBackdrop } from "../desktop/desktop-wallpaper";

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
    expect(Math.max(...sunLayers.map((layer) => layer.text.length))).toBeGreaterThan(width * 0.5);
    expect(horizon).toBeDefined();
    expect(floorLayers.some((layer) => layer.text.includes("+"))).toBe(true);
    expect(floorLayers.some((layer) => layer.text.includes("-"))).toBe(true);
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
