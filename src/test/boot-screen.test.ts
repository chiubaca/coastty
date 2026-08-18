import { describe, expect, test } from "bun:test";
import { BOOT_DURATION_MS, BOOT_TITLE, getBootFrame } from "../ui/boot-screen";

describe("getBootFrame", () => {
  test("reveals BIOS checks before the title", () => {
    expect(getBootFrame(0)).toMatchObject({ biosLineCount: 1, titleCharacterCount: 0 });
    expect(getBootFrame(520)).toMatchObject({ biosLineCount: 3, titleCharacterCount: 0 });
  });

  test("reveals the title from left to right", () => {
    const firstTitleFrame = getBootFrame(2_250);
    const laterTitleFrame = getBootFrame(2_630);

    expect(firstTitleFrame.titleCharacterCount).toBe(1);
    expect(laterTitleFrame.titleCharacterCount).toBe(11);
    expect(BOOT_TITLE.slice(0, laterTitleFrame.titleCharacterCount)).toBe("///////// L");
  });

  test("finishes only after the glow hold", () => {
    expect(getBootFrame(BOOT_DURATION_MS - 1).complete).toBe(false);
    expect(getBootFrame(BOOT_DURATION_MS).complete).toBe(true);
  });
});
