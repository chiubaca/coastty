import { describe, expect, test } from "bun:test";
import { appIcon } from "../apps/icons";

describe("appIcon", () => {
  test("uses a Nerd Font glyph by default", () => {
    expect(appIcon({ glyph: "starter", fallback: ">" }, true)).toBe("");
  });

  test("uses the ASCII fallback when requested", () => {
    expect(appIcon({ glyph: "starter", fallback: ">" }, false)).toBe(">");
  });
});
