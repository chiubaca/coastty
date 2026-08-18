import { describe, expect, test } from "bun:test";
import { nextThemeId, themes } from "../ui/theme";

describe("themes", () => {
  test("cycles through every theme and returns to phosphor", () => {
    expect(nextThemeId("phosphor")).toBe("amber");
    expect(nextThemeId("amber")).toBe("arcade");
    expect(nextThemeId("arcade")).toBe("phosphor");
  });

  test("keeps the semantic color contract across palettes", () => {
    const tokenNames = Object.keys(themes.phosphor.colors);

    expect(Object.keys(themes.amber.colors)).toEqual(tokenNames);
    expect(Object.keys(themes.arcade.colors)).toEqual(tokenNames);
  });
});
