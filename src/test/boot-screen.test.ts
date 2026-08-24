import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import { createElement } from "react";
import { BOOT_DURATION_MS, BOOT_TITLE, BootScreen, getBootFrame } from "../ui/boot-screen";
import { ThemeProvider } from "../ui/theme";

describe("getBootFrame", () => {
  test("reveals BIOS checks before the title", () => {
    expect(getBootFrame(0)).toMatchObject({ biosLineCount: 1, biosComplete: false, titleCharacterCount: 0 });
    expect(getBootFrame(780)).toMatchObject({ biosLineCount: 3, biosComplete: false, titleCharacterCount: 0 });
    expect(getBootFrame(2_339)).toMatchObject({ biosLineCount: 6, biosComplete: false });
    expect(getBootFrame(2_340)).toMatchObject({ biosLineCount: 7, biosComplete: true });
  });

  test("reveals the title from left to right", () => {
    const firstTitleFrame = getBootFrame(3_375);
    const laterTitleFrame = getBootFrame(3_945);

    expect(firstTitleFrame.titleCharacterCount).toBe(1);
    expect(laterTitleFrame.titleCharacterCount).toBe(11);
    expect(BOOT_TITLE.slice(0, laterTitleFrame.titleCharacterCount)).toBe("////////// ");
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
      expect(frame).toContain("L O F I   8 5");
      expect(frame).not.toContain("░░");
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });
});
