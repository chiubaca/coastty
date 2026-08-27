import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext } from "@effect-atom/atom-react/RegistryContext";
import { createElement } from "react";
import { apps } from "../apps/registry";
import { ImageViewer } from "../apps/image-viewer";
import { buildDesktopWallpaper } from "../desktop/desktop-wallpaper";
import { ManagedWindow, windowManagerAtom, WindowCommand } from "../desktop/window-manager";
import { WindowFrame } from "../desktop/window-frame";
import { ThemeProvider } from "../ui/theme";

describe("image viewer", () => {
  test("fits the complete ASCII wallpaper inside its preview area", async () => {
    const app = apps.find((candidate) => candidate.id === "image-viewer")!;
    const { renderer, captureCharFrame, flush, waitForFrame } = await createTestRenderer({ width: 100, height: 40 });
    const root = createRoot(renderer);
    const registry = Registry.make();
    const window = new ManagedWindow({
      appId: app.id,
      title: app.title,
      left: app.initialPosition.left,
      top: app.initialPosition.top,
      width: app.initialSize.width,
      height: app.initialSize.height,
      zIndex: 1,
      minimized: false,
    });
    const expectedBottomRow = buildDesktopWallpaper(app.initialSize.width - 2, app.initialSize.height - 3)
      .findLast((layer) => layer.top === app.initialSize.height - 4)!;

    try {
      registry.set(windowManagerAtom, WindowCommand.Open({ app }));
      flushSync(() => root.render(createElement(
        RegistryContext.Provider,
        { value: registry },
        createElement(
          ThemeProvider,
          null,
          createElement(WindowFrame, { app, window, viewport: { width: 100, height: 40 } }),
        ),
      )));
      await flush();
      await waitForFrame((frame) => frame.includes("│ ASCII-ART"));

      expect(captureCharFrame()).toContain(expectedBottomRow.text);
    } finally {
      root.unmount();
      renderer.destroy();
      registry.dispose();
    }
  });
});
