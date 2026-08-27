import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import { createElement } from "react";
import { BOOT_DURATION_MS, BOOT_TITLE, BootScreen, getBootFrame } from "../ui/boot-screen";
import { ThemeProvider } from "../ui/theme";

describe("getBootFrame", () => {
  test("reveals BIOS checks before the title", () => {
    expect(getBootFrame(0)).toMatchObject({ biosLineCount: 1, biosComplete: false, titleVisible: false });
    expect(getBootFrame(780)).toMatchObject({ biosLineCount: 3, biosComplete: false, titleVisible: false });
    expect(getBootFrame(2_339)).toMatchObject({ biosLineCount: 6, biosComplete: false });
    expect(getBootFrame(2_340)).toMatchObject({ biosLineCount: 7, biosComplete: true });
  });

  test("shows the centered welcome title after startup", () => {
    expect(BOOT_TITLE).toBe("Welcome to Coastty OS");
    expect(getBootFrame(3_374).titleVisible).toBe(false);
    expect(getBootFrame(3_375).titleVisible).toBe(true);
  });

  test("finishes after the title glow", () => {
    expect(getBootFrame(BOOT_DURATION_MS - 1).complete).toBe(false);
    expect(getBootFrame(BOOT_DURATION_MS).complete).toBe(true);
  });
});

describe("BootScreen", () => {
  test("shows the halftone sunset logo during startup", async () => {
    const { renderer, flush, captureCharFrame } = await createTestRenderer({ width: 80, height: 24 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(
        ThemeProvider,
        null,
        createElement(BootScreen, { onComplete: () => {} }),
      )));
      await flush();

      const frame = captureCharFrame();
      expect(frame).toContain(".-+%@@@@%+-.");
      expect(frame).toContain("=============***=============");
      expect(frame).toContain("C O A S T T Y");
      expect(frame).not.toContain("░░");
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });
});
