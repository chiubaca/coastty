import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { RGBA } from "@opentui/core";
import { createRoot, flushSync } from "@opentui/react";
import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext } from "@effect-atom/atom-react/RegistryContext";
import { createElement } from "react";
import { aboutApp, apps, desktopApps } from "../apps/registry";
import { Desktop, desktopClockParts } from "../desktop/desktop";
import { themes, ThemeProvider } from "../ui/theme";

describe("desktop shell", () => {
  test("keeps About out of the desktop launcher", () => {
    expect(apps).toContain(aboutApp);
    expect(desktopApps).not.toContain(aboutApp);
  });

  test("formats the fixed-year date and a fixed-width clock with a blinking separator", () => {
    const morning = new Date(2026, 7, 25, 9, 5, 0);

    expect(desktopClockParts(morning, true)).toEqual({ date: "Tue 25 Aug 1985", time: "09:05" });
    expect(desktopClockParts(morning, false)).toEqual({ date: "Tue 25 Aug 1985", time: "09 05" });
  });

  test("navigates Settings and About from the Desktop tab order", async () => {
    const registry = Registry.make();
    const { renderer, mockInput, captureCharFrame, captureSpans, flush, waitForFrame } = await createTestRenderer({
      width: 100,
      height: 40,
    });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(
        RegistryContext.Provider,
        { value: registry },
        createElement(
          ThemeProvider,
          null,
          createElement(Desktop, { autoplay: false, onRestart: () => {} }),
        ),
      )));
      await flush();
      await waitForFrame((frame) => frame.includes("🌴  Desktop"));

      let topbar = captureCharFrame().split("\n")[0] ?? "";
      expect(topbar).toContain("Settings");
      expect(topbar).toContain("About");
      expect(captureCharFrame()).not.toContain("File   Edit   View   Special");
      const topbarSpans = captureSpans().lines[0]?.spans ?? [];
      const background = RGBA.fromHex(themes.arcade.colors.background);
      expect(topbarSpans.every((span) => span.bg.equals(background))).toBe(true);

      mockInput.pressTab();
      await flush();
      mockInput.pressEnter();
      await waitForFrame((frame) => frame.includes("[x] ARCADE RGB"));
      expect(captureCharFrame().split("\n")[1]).toContain("┌");

      mockInput.pressArrow("up");
      await flush();
      mockInput.pressEnter();
      await flush();
      mockInput.pressEnter();
      await waitForFrame((frame) => frame.includes("[x] AMBER CRT"));

      mockInput.pressEscape();
      await flush();
      mockInput.pressTab();
      await flush();
      mockInput.pressEnter();
      await waitForFrame((frame) => frame.includes("🌴  ABOUT"));
      topbar = captureCharFrame().split("\n")[0] ?? "";
      expect(topbar).not.toContain("Settings");
      expect(topbar).not.toContain("About");
      expect(captureCharFrame()).toContain("Lorem ipsum dolor sit amet");
    } finally {
      root.unmount();
      renderer.destroy();
      registry.dispose();
    }
  });
});
