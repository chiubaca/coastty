import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import { createElement } from "react";
import { apps } from "../apps/registry";
import { themes } from "../ui/theme";
import { DESKTOP_ICON_HEIGHT, DESKTOP_ICON_WIDTH, DesktopIcon, desktopIconPosition } from "../desktop/desktop-icon";

describe("desktop icon layout", () => {
  test("stacks a roomy desktop column along the right edge", () => {
    const positions = Array.from({ length: 4 }, (_, index) => desktopIconPosition(index, 80, 30));

    expect(positions).toEqual([
      { left: 64, top: 4 },
      { left: 64, top: 8 },
      { left: 64, top: 12 },
      { left: 64, top: 16 },
    ]);
    expect(positions.every((position) => (
      position.left >= 0
      && position.left + DESKTOP_ICON_WIDTH <= 80
      && position.top + DESKTOP_ICON_HEIGHT <= 30
    ))).toBe(true);
  });

  test("starts another column when the viewport is too short", () => {
    expect(Array.from({ length: 4 }, (_, index) => desktopIconPosition(index, 80, 14))).toEqual([
      { left: 64, top: 4 },
      { left: 64, top: 8 },
      { left: 48, top: 4 },
      { left: 48, top: 8 },
    ]);
  });

  test("keeps selected and unselected labels aligned without a shadow duplicate", async () => {
    const { renderer, flush, captureCharFrame } = await createTestRenderer({ width: 30, height: 10 });
    const root = createRoot(renderer);
    const app = apps[0]!;

    try {
      flushSync(() => root.render(createElement(DesktopIcon, {
        app,
        position: { left: 3, top: 2 },
        colors: themes.arcade.colors,
        selected: true,
        hovered: false,
        onMouseOver: () => {},
        onMouseOut: () => {},
        onMouseDown: () => {},
      })));
      await flush();

      const selectedFrame = captureCharFrame();
      flushSync(() => root.render(createElement(DesktopIcon, {
        app,
        position: { left: 3, top: 2 },
        colors: themes.arcade.colors,
        selected: false,
        hovered: false,
        onMouseOver: () => {},
        onMouseOut: () => {},
        onMouseDown: () => {},
      })));
      await flush();

      const unselectedFrame = captureCharFrame();
      expect(selectedFrame).toContain(app.icon);
      expect(selectedFrame.indexOf(app.title)).toBe(unselectedFrame.indexOf(app.title));
      expect(unselectedFrame).not.toContain(`${app.title}${app.title.at(-1)}`);
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });
});
