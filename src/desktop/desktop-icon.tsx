import { TextAttributes } from "@opentui/core";
import type { AppManifest } from "../apps/types";
import { LofiText } from "../ui/lofi-text";
import type { ThemeColors } from "../ui/theme";

export const DESKTOP_ICON_WIDTH = 14;
export const DESKTOP_ICON_HEIGHT = 4;

type DesktopIconPosition = {
  readonly left: number;
  readonly top: number;
};

type DesktopIconProps = {
  readonly app: AppManifest;
  readonly position: DesktopIconPosition;
  readonly colors: ThemeColors;
  readonly selected: boolean;
  readonly hovered: boolean;
  readonly onMouseOver: () => void;
  readonly onMouseOut: () => void;
  readonly onMouseDown: () => void;
};

// Fixed tiles fit the current launcher set; add paging and display-width-aware label truncation before scaling it further.
export function desktopIconPosition(index: number, width: number, height: number): DesktopIconPosition {
  const firstTop = Math.max(1, Math.min(4, height - DESKTOP_ICON_HEIGHT));
  const rowsPerColumn = Math.max(1, Math.floor(Math.max(0, height - firstTop) / DESKTOP_ICON_HEIGHT));
  const column = Math.floor(index / rowsPerColumn);
  const row = index % rowsPerColumn;
  const rightAlignedLeft = width - DESKTOP_ICON_WIDTH - 2 - column * (DESKTOP_ICON_WIDTH + 2);

  return {
    left: Math.min(
      Math.max(0, width - DESKTOP_ICON_WIDTH),
      Math.max(0, rightAlignedLeft),
    ),
    top: firstTop + row * DESKTOP_ICON_HEIGHT,
  };
}

export function DesktopIcon({
  app,
  position,
  colors,
  selected,
  hovered,
  onMouseOver,
  onMouseOut,
  onMouseDown,
}: DesktopIconProps) {
  const labelWidth = app.title.length + 2;
  const labelLeft = Math.floor((DESKTOP_ICON_WIDTH - labelWidth) / 2);
  const baseColor = selected || hovered ? colors.highlight : colors.primary;

  return (
    <box
      position="absolute"
      left={position.left}
      top={position.top}
      width={DESKTOP_ICON_WIDTH}
      height={DESKTOP_ICON_HEIGHT}
      alignItems="center"
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onMouseDown={onMouseDown}
    >
      <box width={3} height={2} position="relative">
        <LofiText position="absolute" left={2} top={1} fg={colors.shadow} attributes={TextAttributes.DIM}>{app.icon}</LofiText>
        <LofiText position="absolute" left={1} fg={baseColor} attributes={TextAttributes.BOLD}>{app.icon}</LofiText>
      </box>
      <box width={DESKTOP_ICON_WIDTH} height={1} position="relative">
        {selected
          ? <box position="absolute" left={labelLeft} width={labelWidth} height={1} alignItems="center" backgroundColor={colors.accent}>
              <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>{app.title}</LofiText>
            </box>
          : <LofiText position="absolute" left={labelLeft + 1} fg={hovered ? colors.glow : colors.glowSoft} attributes={hovered ? TextAttributes.BOLD : undefined}>{app.title}</LofiText>}
      </box>
    </box>
  );
}
