import { describe, expect, test } from "bun:test";
import { OptimizedBuffer, type CapturedSpan } from "@opentui/core";
import { createTestRenderer, ManualClock } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import { createElement } from "react";
import { Spectrum, SpectrumRenderable } from "../apps/coastty-player/spectrum";
import { themes } from "../ui/theme";

class TestSpectrum extends SpectrumRenderable {
  advance(milliseconds: number) {
    for (let remaining = milliseconds; remaining > 0; remaining -= 10) {
      this.onUpdate(Math.min(10, remaining));
    }
  }
}

async function fixture(spectrum: readonly number[] = []) {
  const { renderer } = await createTestRenderer({ width: 40, height: 10, clock: new ManualClock() });
  const view = new TestSpectrum(renderer, { width: 40, height: 10, spectrum, colors: themes.phosphor.colors });
  const buffer = OptimizedBuffer.create(40, 10, "wcwidth");
  return {
    view,
    frame() {
      view.render(buffer, 0);
      return new TextDecoder().decode(buffer.getRealCharBytes(true));
    },
    cell(x: number, y: number): CapturedSpan {
      view.render(buffer, 0);
      let column = 0;
      for (const span of buffer.getSpanLines()[y]!.spans) {
        column += span.width;
        if (column > x) return span;
      }
      throw new Error(`Missing cell ${x},${y}`);
    },
    dispose() {
      view.destroy();
      buffer.destroy();
      renderer.destroy();
    },
  };
}

const ink = (frame: string) => frame.replace(/\s/g, "").length;

describe("2D player spectrum", () => {
  test("silence and invalid bins stay empty without requesting live animation", async () => {
    const subject = await fixture();
    try {
      expect(subject.view.live).toBe(false);
      expect(subject.frame().trim()).toBe("");
      subject.view.spectrum = [0, -1, NaN, Infinity, -Infinity];
      subject.view.advance(2_000);
      expect(subject.view.live).toBe(false);
      expect(subject.frame().trim()).toBe("");
    } finally {
      subject.dispose();
    }
  });

  test("fast attack, slower release, finite peak hold, and exact silence settling", async () => {
    const subject = await fixture([1]);
    try {
      expect(subject.view.live).toBe(true);
      subject.view.advance(50);
      const attack = ink(subject.frame());
      subject.view.advance(1_000);
      const full = ink(subject.frame());
      expect(attack).toBeGreaterThan(0);
      expect(attack).toBeLessThan(full);
      expect(subject.view.live).toBe(false);

      subject.view.spectrum = [0];
      subject.view.advance(50);
      expect(ink(subject.frame())).toBeGreaterThan(attack);
      // The detached peak remains in the highest row while the body falls.
      expect(subject.frame().split("\n")[1]!.trim()).not.toBe("");
      subject.view.advance(600);
      expect(subject.frame().split("\n")[1]!.trim()).toBe("");
      subject.view.advance(3_000);
      expect(subject.frame().trim()).toBe("");
      expect(subject.view.live).toBe(false);
    } finally {
      subject.dispose();
    }
  });

  test("40×10 has graded jewel bodies, brighter caps, dark gutters and dim reflections", async () => {
    const subject = await fixture([1]);
    try {
      subject.view.advance(1_000);
      const brightness = (span: CapturedSpan) => span.fg.r + span.fg.g + span.fg.b;
      const cap = subject.cell(1, 1);
      const upperBody = subject.cell(1, 2);
      const lowerBody = subject.cell(1, 7);
      const reflection = subject.cell(1, 9);
      expect(brightness(cap)).toBeGreaterThan(brightness(upperBody));
      expect(brightness(upperBody)).toBeGreaterThan(brightness(lowerBody));
      expect(brightness(lowerBody)).toBeGreaterThan(brightness(reflection));
      expect(subject.cell(3, 7).text.trim()).toBe("");
      expect(subject.frame().split("\n")[0]!.trim()).toBe("");

      const oldCap = cap.fg.toString();
      subject.view.colors = themes.amber.colors;
      expect(subject.cell(1, 1).fg.toString()).not.toBe(oldCap);
      expect(subject.view.live).toBe(false);
    } finally {
      subject.dispose();
    }
  });

  test("a narrow analyser transient is not skipped when reducing bins", async () => {
    const values = Array<number>(96).fill(0);
    values[95] = 1;
    const subject = await fixture(values);
    try {
      subject.view.advance(1_000);
      const rows = subject.frame().split("\n");
      expect(ink(subject.frame())).toBeGreaterThan(0);
      expect(rows.every((row) => row.slice(0, 30).trim() === "")).toBe(true);
      subject.view.spectrum = [...values];
      expect(subject.view.live).toBe(false);
    } finally {
      subject.dispose();
    }
  });

  test("React integration resizes down to one cell and releases its live frame subscription", async () => {
    const { renderer, renderOnce, resize, captureCharFrame } = await createTestRenderer({
      width: 40, height: 10, clock: new ManualClock(),
    });
    const root = createRoot(renderer);
    try {
      flushSync(() => root.render(createElement(Spectrum, { spectrum: [1, 0.5, 0.8], colors: themes.arcade.colors })));
      await renderOnce();
      expect(renderer.root.liveCount).toBe(1);
      for (const [width, height] of [[1, 1], [7, 3], [80, 20], [40, 10]] as const) {
        resize(width, height);
        await renderOnce();
        const child = renderer.root.getChildren()[0]!;
        expect(child.width).toBe(width);
        expect(child.height).toBe(height);
        expect(captureCharFrame().split("\n").every((row) => row.length <= width)).toBe(true);
      }
      flushSync(() => root.render(null));
      expect(renderer.root.liveCount).toBe(0);
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });
});
