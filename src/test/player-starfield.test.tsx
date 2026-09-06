import { describe, expect, test } from "bun:test";
import { TextRenderable } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import { AsciiStarfield, createAsciiStarfield } from "../apps/coastty-player/ascii-starfield";
import { createMusicMotion } from "../apps/coastty-player/visualizer-motion";
import { ThreeVisualizer } from "../apps/coastty-player/three-visualizer";
import { themes } from "../ui/theme";

function seededRandom(seed = 42) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

describe("ASCII background sparkles", () => {
  test("uses the requested glyphs, stays sparse, and keeps stars in unique cells", () => {
    const stars = createAsciiStarfield(seededRandom());
    const idle = createMusicMotion("blob").update([], 0);
    expect(new Set(stars.update(idle, 120, 40, 0).map((star) => star.glyph))).toEqual(new Set([".", "*", "+", "'", "o"]));
    for (const [width, height] of [[80, 28], [40, 12], [120, 40]] as const) {
      const frame = stars.update(idle, width, height, 0);
      expect(frame.length).toBeGreaterThan(0);
      expect(frame.length).toBeLessThanOrEqual(24);
      expect(new Set(frame.map((star) => `${star.left},${star.top}`)).size).toBe(frame.length);
      for (const star of frame) {
        expect(star.left).toBeGreaterThanOrEqual(0);
        expect(star.left).toBeLessThan(width);
        expect(star.top).toBeGreaterThanOrEqual(0);
        expect(star.top).toBeLessThan(height);
        const x = star.left / (width - 1) * 2 - 1;
        const y = star.top / (height - 1) * 2 - 1;
        expect(x * x + y * y).toBeGreaterThanOrEqual(0.3);
        expect(frame.every((other) => other.id === star.id || Math.abs(other.left - star.left) >= 4 || Math.abs(other.top - star.top) >= 2)).toBe(true);
      }
    }
    expect(stars.update(idle, 20, 8, 0)).toEqual([]);
  });

  test("music gently lifts brightness without synchronizing the stars' life cycles", () => {
    const quiet = createAsciiStarfield(seededRandom());
    const reactive = createAsciiStarfield(seededRandom());
    const silence = createMusicMotion("blob").update([], 0);
    const music = createMusicMotion("blob").update([0, 0, 0.8], 0.1);
    for (let i = 0; i < 150; i++) {
      const idle = quiet.update(silence, 80, 28, 0.1);
      const playing = reactive.update(music, 80, 28, 0.1);
      expect(playing.length).toBe(idle.length);
      playing.forEach((star, index) => {
        expect(star.opacity).toBeGreaterThanOrEqual(idle[index]!.opacity);
        expect(star.opacity).toBeLessThanOrEqual(idle[index]!.opacity * 1.51);
        expect(star.opacity).toBeLessThan(0.6);
        expect([star.left, star.top, star.glyph]).toEqual([idle[index]!.left, idle[index]!.top, idle[index]!.glyph]);
      });
    }
  });

  test("stars fade completely out and relocate only while dark, even during silence", () => {
    const field = createAsciiStarfield(seededRandom());
    const idle = createMusicMotion("blob").update([], 0);
    let previous = field.update(idle, 80, 28, 0);
    let faded = 0;
    let relocated = 0;
    let revived = 0;
    for (let i = 0; i < 200; i++) {
      const frame = field.update(idle, 80, 28, 0.1);
      for (const star of frame) {
        const before = previous.find((entry) => entry.id === star.id)!;
        if (before.opacity > 0 && star.opacity === 0) faded++;
        if (before.opacity === 0 && star.opacity > 0) revived++;
        if (before.left !== star.left || before.top !== star.top || before.glyph !== star.glyph) {
          expect(star.opacity).toBe(0);
          relocated++;
        }
        expect(Math.abs(star.opacity - before.opacity)).toBeLessThan(0.06);
      }
      previous = frame;
    }
    expect(faded).toBeGreaterThan(24);
    expect(relocated).toBeGreaterThan(24);
    expect(revived).toBeGreaterThan(24);
    expect(field.update(idle, 80, 28, NaN)).toEqual(previous);
  });

  test("twinkle timing is independent of render frame rate", () => {
    const idle = createMusicMotion("blob").update([], 0);
    const frames = [30, 60].map((fps) => {
      const field = createAsciiStarfield(seededRandom());
      field.update(idle, 80, 28, 0);
      for (let i = 0; i < fps; i++) field.update(idle, 80, 28, 1 / fps);
      return field.update(idle, 80, 28, 0);
    });
    frames[0]!.forEach((star, index) => {
      expect(star.opacity).toBeCloseTo(frames[1]![index]!.opacity, 6);
      expect([star.left, star.top]).toEqual([frames[1]![index]!.left, frames[1]![index]!.top]);
    });
  });

  test("renders real, non-selectable ASCII text and resizes cleanly", async () => {
    const { renderer, resize, captureCharFrame, waitForFrame } = await createTestRenderer({ width: 80, height: 28 });
    const root = createRoot(renderer);
    try {
      flushSync(() => root.render(<AsciiStarfield spectrum={[]} colors={themes.phosphor.colors} />));
      await waitForFrame((frame) => /[.*+'o]/.test(frame));
      const ink = captureCharFrame().replace(/\s/g, "");
      expect(ink.length).toBeGreaterThan(0);
      expect(ink).toMatch(/^[.*+'o]+$/);
      const field = renderer.root.getChildren()[0]!;
      expect(field.getChildren().every((child) => child instanceof TextRenderable && !child.selectable)).toBe(true);
      resize(20, 8);
      await waitForFrame((frame) => frame.trim() === "");
      expect(captureCharFrame().trim()).toBe("");
      resize(80, 28);
      await waitForFrame((frame) => /[.*+'o]/.test(frame));
      expect(captureCharFrame().replace(/\s/g, "")).toMatch(/^[.*+'o]+$/);
    } finally {
      flushSync(() => root.unmount());
      expect(renderer.root.liveCount).toBe(0);
      renderer.destroy();
    }
  });

  test("ASCII stars remain visible over the GPU background and only appear in blob mode", async () => {
    const { renderer, flush, captureCharFrame } = await createTestRenderer({ width: 80, height: 28 });
    const root = createRoot(renderer);
    try {
      flushSync(() => root.render(<ThreeVisualizer kind="blob" spectrum={[]} colors={themes.phosphor.colors} />));
      await flush();
      expect(captureCharFrame()).toMatch(/[.*+'o]/);
      expect(captureCharFrame()).toMatch(/[▀▄▘▙▚▛▜▝▞▟]/);
      flushSync(() => root.render(<ThreeVisualizer kind="bars" spectrum={[]} colors={themes.phosphor.colors} />));
      await flush();
      expect(captureCharFrame()).not.toMatch(/[.*+'o]/);
    } finally {
      flushSync(() => root.unmount());
      renderer.destroy();
    }
  });
});
