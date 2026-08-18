import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext } from "@effect-atom/atom-react/RegistryContext";
import { HashMap, Option } from "effect";
import { createElement } from "react";
import { WindowFrame } from "../desktop/window-frame";
import type { AppManifest } from "../apps/types";
import {
  initialWindowManagerState,
  reduceWindowManager,
  windowFocusedAtom,
  windowManagerAtom,
  WindowCommand,
} from "../desktop/window-manager";

const lofiApp: AppManifest = {
  id: "lofi-player",
  title: "lofi.fm",
  icon: "|====|",
  initialPosition: { left: 24, top: 5 },
  initialSize: { width: 46, height: 16 },
  Component: () => null,
};

function windowFrom(state: typeof initialWindowManagerState, appId = lofiApp.id) {
  return HashMap.get(state.windows, appId).pipe(Option.getOrThrow);
}

describe("window manager", () => {
  test("opens an app at its manifest defaults", () => {
    const state = reduceWindowManager(initialWindowManagerState, WindowCommand.Open({ app: lofiApp }));

    expect(windowFrom(state)).toMatchObject({
      left: 24,
      top: 5,
      title: "lofi.fm",
      minimized: false,
    });
    expect(state.focusedAppId).toEqual(Option.some(lofiApp.id));
  });

  test("minimize and restore preserve geometry while raising the window", () => {
    const opened = reduceWindowManager(initialWindowManagerState, WindowCommand.Open({ app: lofiApp }));
    const moved = reduceWindowManager(opened, WindowCommand.Move({ appId: lofiApp.id, left: 10, top: 8 }));
    const initialZIndex = windowFrom(moved).zIndex;
    const minimized = reduceWindowManager(moved, WindowCommand.Minimize({ appId: lofiApp.id }));
    const restored = reduceWindowManager(minimized, WindowCommand.Restore({ appId: lofiApp.id }));

    expect(windowFrom(restored)).toMatchObject({ left: 10, top: 8, minimized: false });
    expect(windowFrom(restored).zIndex).toBeGreaterThan(initialZIndex);
    expect(restored.focusedAppId).toEqual(Option.some(lofiApp.id));
  });

  test("close removes the window so reopening resets it to manifest defaults", () => {
    const commands = [
      WindowCommand.Open({ app: lofiApp }),
      WindowCommand.Move({ appId: lofiApp.id, left: 1, top: 1 }),
      WindowCommand.SetTitle({ appId: lofiApp.id, title: "other station" }),
      WindowCommand.Close({ appId: lofiApp.id }),
      WindowCommand.Open({ app: lofiApp }),
    ];
    const state = commands.reduce(reduceWindowManager, initialWindowManagerState);

    expect(windowFrom(state)).toMatchObject({ left: 24, top: 5, title: "lofi.fm" });
  });

  test("invalid commands and focus on a minimized window are no-ops", () => {
    const missing = reduceWindowManager(initialWindowManagerState, WindowCommand.Focus({ appId: "missing" }));
    expect(missing).toBe(initialWindowManagerState);

    const opened = reduceWindowManager(initialWindowManagerState, WindowCommand.Open({ app: lofiApp }));
    const minimized = reduceWindowManager(opened, WindowCommand.Minimize({ appId: lofiApp.id }));
    const focused = reduceWindowManager(minimized, WindowCommand.Focus({ appId: lofiApp.id }));
    expect(focused).toBe(minimized);
  });

  test("atom registries isolate application state", () => {
    const first = Registry.make();
    const second = Registry.make();

    try {
      first.set(windowManagerAtom, WindowCommand.Open({ app: lofiApp }));

      expect(HashMap.has(first.get(windowManagerAtom).windows, lofiApp.id)).toBe(true);
      expect(HashMap.has(second.get(windowManagerAtom).windows, lofiApp.id)).toBe(false);
    } finally {
      first.dispose();
      second.dispose();
    }
  });

  test("derived atoms publish focus changes", () => {
    const registry = Registry.make();
    const focusedValues: boolean[] = [];
    const unsubscribe = registry.subscribe(
      windowFocusedAtom(lofiApp.id),
      (focused) => focusedValues.push(focused),
      { immediate: true },
    );

    try {
      registry.set(windowManagerAtom, WindowCommand.Open({ app: lofiApp }));
      registry.set(windowManagerAtom, WindowCommand.Minimize({ appId: lofiApp.id }));

      expect(focusedValues).toEqual([false, true, false]);
    } finally {
      unsubscribe();
      registry.dispose();
    }
  });

  test("continues a title-bar drag when its first movement enters window content", async () => {
    const registry = Registry.make();
    const { renderer, mockMouse, flush } = await createTestRenderer({ width: 80, height: 24 });
    const window = reduceWindowManager(initialWindowManagerState, WindowCommand.Open({ app: lofiApp }));
    const root = createRoot(renderer);

    try {
      registry.set(windowManagerAtom, WindowCommand.Open({ app: lofiApp }));
      flushSync(() => {
        root.render(
          createElement(
            RegistryContext.Provider,
            { value: registry },
            createElement(WindowFrame, { app: lofiApp, window: windowFrom(window), viewport: { width: 80, height: 24 } }),
          ),
        );
      });
      await flush();

      await mockMouse.pressDown(26, 6);
      expect(windowFrom(registry.get(windowManagerAtom)).zIndex).toBe(3);
      await mockMouse.emitMouseEvent("drag", 26, 9);
      await mockMouse.release(26, 9);

      expect(windowFrom(registry.get(windowManagerAtom))).toMatchObject({ left: 24, top: 8 });
    } finally {
      root.unmount();
      renderer.destroy();
      registry.dispose();
    }
  });
});
