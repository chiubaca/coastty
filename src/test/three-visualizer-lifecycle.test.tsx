import { describe, expect, spyOn, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { CliRenderEvents } from "@opentui/core";
import { createRoot, flushSync } from "@opentui/react";
import { ThreeCliRenderer } from "@opentui/three";
import { StrictMode, useState } from "react";
import { MusicRenderable, ThreeVisualizer } from "../apps/coastty-player/three-visualizer";
import { themes } from "../ui/theme";

describe("ThreeVisualizer lifecycle", () => {
  test("renders GPU pixels and survives viewport changes", async () => {
    const { renderer, flush, resize, captureCharFrame } = await createTestRenderer({ width: 64, height: 20 });
    const root = createRoot(renderer);
    const errors = spyOn(console, "error");
    try {
      flushSync(() => root.render(<ThreeVisualizer kind="blob" spectrum={[]} colors={themes.phosphor.colors} />));
      for (const [width, height] of [[64, 20], [20, 10], [1, 1], [40, 12]] as const) {
        resize(width, height);
        await flush();
        const frame = captureCharFrame();
        expect(frame.split("\n").every((line) => line.length <= width)).toBe(true);
        if (height > 1) expect(frame).toMatch(/[▀▄▘▙▚▛▜▝▞▟]/);
      }
      expect(errors.mock.calls).toEqual([]);
    } finally {
      flushSync(() => root.unmount());
      renderer.destroy();
      errors.mockRestore();
    }
  });

  test("keeps a GPU readback alive through unmount and only then disposes it", async () => {
    const errors = spyOn(console, "error");
    const entered = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    const released = Promise.withResolvers<void>();
    const originalDraw = ThreeCliRenderer.prototype.drawScene;
    const draw = spyOn(ThreeCliRenderer.prototype, "drawScene").mockImplementation(async function(this: ThreeCliRenderer, ...args) {
      entered.resolve();
      await resume.promise;
      await originalDraw.apply(this, args);
    });
    const originalDestroy = ThreeCliRenderer.prototype.destroy;
    const destroy = spyOn(ThreeCliRenderer.prototype, "destroy").mockImplementation(function(this: ThreeCliRenderer) {
      originalDestroy.call(this);
      released.resolve();
    });
    const { renderer, renderOnce } = await createTestRenderer({ width: 40, height: 12 });
    const root = createRoot(renderer);
    try {
      flushSync(() => root.render(<ThreeVisualizer kind="blob" spectrum={[0.8]} colors={themes.phosphor.colors} />));
      const frame = renderOnce();
      await entered.promise;
      flushSync(() => root.unmount());
      expect(destroy).not.toHaveBeenCalled();
      resume.resolve();
      await frame;
      await released.promise;
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(errors.mock.calls).toEqual([]);
    } finally {
      resume.resolve();
      renderer.destroy();
      draw.mockRestore();
      destroy.mockRestore();
      errors.mockRestore();
    }
  });

  test("waits for in-flight initialization before releasing its engine", async () => {
    const errors = spyOn(console, "error");
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const released = Promise.withResolvers<void>();
    const init = ThreeCliRenderer.prototype.init;
    const initialize = spyOn(ThreeCliRenderer.prototype, "init").mockImplementation(async function(this: ThreeCliRenderer) {
      entered.resolve();
      await release.promise;
      await init.call(this);
    });
    const originalDestroy = ThreeCliRenderer.prototype.destroy;
    const destroy = spyOn(ThreeCliRenderer.prototype, "destroy").mockImplementation(function(this: ThreeCliRenderer) {
      originalDestroy.call(this);
      released.resolve();
    });
    const { renderer, renderOnce } = await createTestRenderer({ width: 40, height: 12 });
    const root = createRoot(renderer);
    try {
      flushSync(() => root.render(<ThreeVisualizer kind="blob" spectrum={[]} colors={themes.phosphor.colors} />));
      const frame = renderOnce();
      await entered.promise;
      flushSync(() => root.unmount());
      const destroyedDuringInit = destroy.mock.calls.length;
      release.resolve();
      await frame;
      await released.promise;
      expect(destroyedDuringInit).toBe(0);
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(errors.mock.calls).toEqual([]);
    } finally {
      release.resolve();
      renderer.destroy();
      initialize.mockRestore();
      destroy.mockRestore();
      errors.mockRestore();
    }
  });

  test("releases rendered scenes and scoped listeners when switching under StrictMode", async () => {
    const errors = spyOn(console, "error");
    const warnings = spyOn(console, "warn");
    const { renderer, flush } = await createTestRenderer({ width: 40, height: 12 });
    const root = createRoot(renderer);
    let select!: (kind: "bars" | "blob" | null) => void;
    function Harness() {
      const [kind, setKind] = useState<"bars" | "blob" | null>(null);
      select = setKind;
      return kind && <ThreeVisualizer kind={kind} spectrum={Array(24).fill(0)} colors={themes.phosphor.colors} />;
    }
    try {
      flushSync(() => root.render(<StrictMode><Harness /></StrictMode>));
      await flush();
      const originalListeners = renderer.listeners(CliRenderEvents.DESTROY);
      const originalDebugListeners = renderer.listeners(CliRenderEvents.DEBUG_OVERLAY_TOGGLE);
      for (let i = 0; i < 12; i++) {
        flushSync(() => select(i % 2 ? "bars" : "blob"));
        await flush();
        const surface = renderer.root.getChildren()[0]!.getChildren().find((child) => child instanceof MusicRenderable) as MusicRenderable;
        expect(surface.getScene()!.children.length).toBeGreaterThan(0);
        flushSync(() => select(null));
        await flush();
        expect(renderer.listeners(CliRenderEvents.DESTROY)).toEqual(originalListeners);
        expect(renderer.listeners(CliRenderEvents.DEBUG_OVERLAY_TOGGLE)).toEqual(originalDebugListeners);
      }
      expect(errors.mock.calls).toEqual([]);
      expect(warnings.mock.calls).toEqual([]);
    } finally {
      flushSync(() => root.unmount());
      renderer.destroy();
      errors.mockRestore();
      warnings.mockRestore();
    }
  });

  for (const unmountFirst of [true, false]) {
    test(`disposes before the engine when ${unmountFirst ? "async unmount precedes" : "still mounted during"} renderer.destroy`, async () => {
      const errors = spyOn(console, "error");
      const { renderer, flush } = await createTestRenderer({ width: 40, height: 12 });
      const root = createRoot(renderer);
      try {
        flushSync(() => root.render(
          <ThreeVisualizer kind="blob" spectrum={Array(24).fill(0)} colors={themes.phosphor.colors} />,
        ));
        await flush();
        if (unmountFirst) root.unmount();
        renderer.destroy();
        if (!unmountFirst) root.unmount();
        await Bun.sleep(20);
        expect(errors.mock.calls).toEqual([]);
      } finally {
        renderer.destroy();
        errors.mockRestore();
      }
    });
  }
});
