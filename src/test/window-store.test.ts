import { describe, expect, test } from "bun:test";
import type { AppManifest } from "../apps/types";
import { createWindowManager } from "../desktop/window-store";

const lofiApp: AppManifest = {
  id: "lofi-player",
  title: "lofi.fm",
  icon: "|====|",
  initialPosition: { left: 24, top: 5 },
  initialSize: { width: 46, height: 16 },
  Component: () => null,
};

describe("window store", () => {
  test("opens an app at its manifest defaults", () => {
    const store = createWindowManager();
    store.getState().open(lofiApp);

    expect(store.getState().windows[lofiApp.id]).toMatchObject({
      left: 24,
      top: 5,
      title: "lofi.fm",
      minimized: false,
    });
    expect(store.getState().focusedAppId).toBe(lofiApp.id);
  });

  test("minimize and restore preserve geometry while raising the window", () => {
    const store = createWindowManager();
    store.getState().open(lofiApp);
    store.getState().move(lofiApp.id, 10, 8);
    const initialZIndex = store.getState().windows[lofiApp.id]?.zIndex;

    store.getState().minimize(lofiApp.id);
    store.getState().restore(lofiApp.id);

    expect(store.getState().windows[lofiApp.id]).toMatchObject({ left: 10, top: 8, minimized: false });
    expect(store.getState().windows[lofiApp.id]?.zIndex).toBeGreaterThan(initialZIndex ?? 0);
  });

  test("close removes the window so reopening resets it to manifest defaults", () => {
    const store = createWindowManager();
    store.getState().open(lofiApp);
    store.getState().move(lofiApp.id, 1, 1);
    store.getState().setTitle(lofiApp.id, "other station");
    store.getState().close(lofiApp.id);
    store.getState().open(lofiApp);

    expect(store.getState().windows[lofiApp.id]).toMatchObject({ left: 24, top: 5, title: "lofi.fm" });
  });

  test("managers keep desktop state isolated", () => {
    const firstManager = createWindowManager();
    const secondManager = createWindowManager();

    firstManager.getState().open(lofiApp);

    expect(firstManager.getState().windows[lofiApp.id]).toBeDefined();
    expect(secondManager.getState().windows[lofiApp.id]).toBeUndefined();
  });
});
