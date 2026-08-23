import { TextAttributes } from "@opentui/core";
import { LofiText } from "../ui/lofi-text";

const WALLPAPER_COLORS = {
  background: "#070316",
  horizon: "#ffd0ec",
} as const;

type ColorStop = readonly [position: number, color: string];

const SKY_BACKGROUND_STOPS = [
  [0, "#09051f"],
  [0.24, "#17072f"],
  [0.5, "#2d0b49"],
  [0.75, "#55105e"],
  [1, "#8a174f"],
] as const satisfies readonly ColorStop[];

const FLOOR_BACKGROUND_STOPS = [
  [0, "#3b073c"],
  [0.16, "#310638"],
  [0.42, "#23062f"],
  [0.72, "#160522"],
  [1, "#0a0419"],
] as const satisfies readonly ColorStop[];

const SUN_STOPS = [
  [0, "#fff9b0"],
  [0.1, "#ffe66a"],
  [0.26, "#ffc33f"],
  [0.43, "#ff902f"],
  [0.6, "#ff633f"],
  [0.76, "#ff4568"],
  [0.9, "#ff288f"],
  [1, "#ff159f"],
] as const satisfies readonly ColorStop[];

export type WallpaperLayer = {
  readonly left: number;
  readonly top: number;
  readonly text: string;
  readonly color: string;
  readonly dim?: boolean;
  readonly bold?: boolean;
};

export type WallpaperBackdrop = {
  readonly top: number;
  readonly color: string;
};

function interpolateHex(from: string, to: string, progress: number) {
  const fromValue = Number.parseInt(from.slice(1), 16);
  const toValue = Number.parseInt(to.slice(1), 16);
  const channel = (shift: number) => Math.round(
    ((fromValue >> shift) & 0xff) + (((toValue >> shift) & 0xff) - ((fromValue >> shift) & 0xff)) * progress,
  );
  return `#${[channel(16), channel(8), channel(0)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function gradientColor(stops: readonly ColorStop[], progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const upperIndex = stops.findIndex(([position]) => position >= clamped);
  if (upperIndex <= 0) return stops[0]?.[1] ?? WALLPAPER_COLORS.background;
  const [upperPosition, upperColor] = stops[upperIndex] ?? stops[stops.length - 1]!;
  const [lowerPosition, lowerColor] = stops[upperIndex - 1] ?? stops[0]!;
  return interpolateHex(lowerColor, upperColor, (clamped - lowerPosition) / (upperPosition - lowerPosition));
}

function wallpaperHorizon(height: number) {
  return Math.max(2, Math.min(height - 2, Math.round(height * 0.58)));
}

export function buildWallpaperBackdrop(height: number): readonly WallpaperBackdrop[] {
  if (height < 1) return [];
  if (height < 4) {
    return Array.from({ length: height }, (_, top) => ({ top, color: gradientColor(SKY_BACKGROUND_STOPS, top / Math.max(1, height - 1)) }));
  }

  const horizon = wallpaperHorizon(height);
  return Array.from({ length: height }, (_, top) => ({
    top,
    color: top <= horizon
      ? gradientColor(SKY_BACKGROUND_STOPS, top / horizon)
      : gradientColor(FLOOR_BACKGROUND_STOPS, (top - horizon) / Math.max(1, height - horizon - 1)),
  }));
}

function dottedRow(width: number, offset: number) {
  return Array.from({ length: width }, (_, x) => (x >= offset && (x - offset) % 4 === 0 ? "." : " ")).join("");
}

function hazeRow(width: number, row: number, horizon: number) {
  const center = (width - 1) / 2;
  const strength = Math.max(0, 1 - Math.abs(row - horizon) / 7);
  const spread = width * (0.24 + strength * 0.28);
  const glyphs = [".", ":", ".", ":", "*"];

  return Array.from({ length: width }, (_, x) => {
    if (Math.abs(x - center) > spread) return " ";
    const hash = (x * 17 + row * 31) % 23;
    return hash < 2 + Math.round(strength * 4) ? glyphs[hash % glyphs.length] ?? "." : " ";
  }).join("");
}

function sunColor(progress: number) {
  return gradientColor(SUN_STOPS, progress);
}

function sunRow(halfWidth: number, striped: boolean) {
  const edgeGlyphs = [".", ":", "*", "#"];
  const edgeWidth = Math.min(edgeGlyphs.length, Math.max(1, halfWidth - 1));
  return Array.from({ length: halfWidth * 2 + 1 }, (_, index) => {
    const edgeDistance = Math.min(index, halfWidth * 2 - index);
    if (edgeDistance < edgeWidth) return edgeGlyphs[edgeDistance];
    return striped ? "=" : "@";
  }).join("");
}

function sunHaloRow(halfWidth: number) {
  const shell = ". :*";
  return `${shell}${" ".repeat(halfWidth * 2 + 1)}${[...shell].reverse().join("")}`;
}

function reflectionRow(width: number, row: number, horizon: number, height: number) {
  const center = (width - 1) / 2;
  const depth = (row - horizon) / Math.max(1, height - horizon - 1);
  const spread = width * (0.06 + depth * 0.2);
  const glyphs = [".", ":", "=", ":", "."];
  return Array.from({ length: width }, (_, x) => {
    if (Math.abs(x - center) > spread) return " ";
    const hash = (x * 29 + row * 13) % 19;
    return hash < 5 ? glyphs[hash] ?? "." : " ";
  }).join("");
}

function gridRows(horizon: number, height: number) {
  const rows = new Set<number>([horizon]);
  let offset = 1;
  let gap = 1;
  while (horizon + offset < height) {
    rows.add(horizon + offset);
    gap += 1;
    offset += gap;
  }
  return rows;
}

function gridRow(
  width: number,
  row: number,
  horizon: number,
  height: number,
  horizontalRows: ReadonlySet<number>,
) {
  const chars = Array.from({ length: width }, () => " ");
  const floorHeight = Math.max(1, height - horizon - 1);
  const depth = (row - horizon) / floorHeight;

  if (horizontalRows.has(row)) {
    for (let x = 0; x < width; x += 1) chars[x] = x % 12 < 10 ? "-" : " ";
  }

  const center = (width - 1) / 2;
  const desiredRayCount = Math.max(5, Math.min(11, Math.floor(width / 10)));
  const rayCount = desiredRayCount % 2 === 0 ? Math.min(11, desiredRayCount + 1) : desiredRayCount;
  for (let index = 0; index < rayCount; index += 1) {
    const bottomX = index * (width - 1) / (rayCount - 1);
    const x = Math.round(center + (bottomX - center) * depth);
    if (x < 0 || x >= width) continue;
    if (horizontalRows.has(row)) chars[x] = "+";
    else if (Math.abs(bottomX - center) < 1) chars[x] = "|";
    else chars[x] = bottomX < center ? "/" : "\\";
  }

  return chars.join("");
}

export function buildDesktopWallpaper(width: number, height: number): readonly WallpaperLayer[] {
  if (width < 1 || height < 1) return [];

  const layers: WallpaperLayer[] = [];
  if (width < 12 || height < 4) {
    return Array.from({ length: height }, (_, row) => ({
      left: 0,
      top: row,
      text: dottedRow(width, (row * 3 + Math.floor(row / 3)) % 4),
      color: "#8f5be0",
      dim: true,
    }));
  }

  const horizon = wallpaperHorizon(height);

  for (let row = 0; row <= horizon; row += 1) {
    layers.push({
      left: 0,
      top: row,
      text: dottedRow(width, (row * 3 + Math.floor(row / 3)) % 4),
      color: gradientColor([[0, "#7133d4"], [0.55, "#a93bdb"], [1, "#f24ab5"]], row / horizon),
      dim: true,
    });
  }

  for (let row = Math.max(0, horizon - 6); row <= Math.min(height - 1, horizon + 2); row += 1) {
    const hazeProgress = (row - (horizon - 6)) / 8;
    layers.push({
      left: 0,
      top: row,
      text: hazeRow(width, row, horizon),
      color: gradientColor([[0, "#9a2db2"], [0.7, "#ff6ca9"], [1, "#c92b91"]], hazeProgress),
      dim: true,
    });
  }

  const radiusY = Math.max(2, Math.min(Math.floor(horizon / 2), Math.round(horizon * 0.35)));
  const centerY = horizon - radiusY;
  const radiusX = Math.max(2, Math.min(Math.floor((width - 1) / 2), Math.round(width * 0.29), Math.round(radiusY * 3.8)));
  for (let row = Math.max(0, centerY - radiusY); row < horizon; row += 1) {
    const normalizedY = (row - centerY + 0.45) / radiusY;
    const halfWidth = Math.max(1, Math.round(radiusX * Math.sqrt(Math.max(0, 1 - normalizedY ** 2))));
    const progress = (row - (centerY - radiusY)) / Math.max(1, radiusY * 2);
    const striped = progress > 0.58;
    const text = sunRow(halfWidth, striped);
    const haloText = sunHaloRow(halfWidth);
    const haloOverflow = Math.max(0, haloText.length - width);
    const visibleHaloText = haloText.slice(Math.floor(haloOverflow / 2), haloText.length - Math.ceil(haloOverflow / 2));
    layers.push({
      left: Math.max(0, Math.floor((width - visibleHaloText.length) / 2)),
      top: row,
      text: visibleHaloText,
      color: gradientColor([[0, "#ff9b62"], [0.55, "#ff4f86"], [1, "#df2fc0"]], progress),
      dim: true,
    });
    layers.push({
      left: Math.max(0, Math.floor((width - text.length) / 2)),
      top: row,
      text,
      color: sunColor(progress),
      bold: true,
    });
  }

  for (let row = horizon + 1; row < Math.min(height, horizon + Math.max(4, Math.round((height - horizon) * 0.45))); row += 1) {
    const depth = (row - horizon) / Math.max(1, height - horizon - 1);
    layers.push({
      left: 0,
      top: row,
      text: reflectionRow(width, row, horizon, height),
      color: gradientColor([[0, "#ff9168"], [0.35, "#ff5f8c"], [1, "#d52aa8"]], depth),
      dim: true,
    });
  }

  const horizontalRows = gridRows(horizon, height);
  for (let row = horizon; row < height; row += 1) {
    layers.push({
      left: 0,
      top: row,
      text: row === horizon ? "=".repeat(width) : gridRow(width, row, horizon, height, horizontalRows),
      color: row === horizon
        ? WALLPAPER_COLORS.horizon
        : gradientColor([[0, "#ff83d2"], [0.35, "#ff50c9"], [0.7, "#ff2cba"], [1, "#ff48d0"]], (row - horizon) / Math.max(1, height - horizon - 1)),
      bold: row === horizon,
    });
  }

  return layers;
}

export function DesktopWallpaper({ width, height }: { readonly width: number; readonly height: number }) {
  const wallpaperHeight = Math.max(0, height - 1);
  const backdrop = buildWallpaperBackdrop(wallpaperHeight);
  const layers = buildDesktopWallpaper(width, wallpaperHeight);

  return (
    <box
      position="absolute"
      left={0}
      top={1}
      width={width}
      height={wallpaperHeight}
      backgroundColor={WALLPAPER_COLORS.background}
      overflow="hidden"
    >
      {backdrop.map((row) => (
        <box
          key={`backdrop:${row.top}`}
          position="absolute"
          left={0}
          top={row.top}
          width={width}
          height={1}
          backgroundColor={row.color}
        />
      ))}
      {layers.map((layer, index) => (
        <LofiText
          key={`${layer.top}:${layer.left}:${index}`}
          position="absolute"
          left={layer.left}
          top={layer.top}
          fg={layer.color}
          attributes={(layer.dim ? TextAttributes.DIM : 0) | (layer.bold ? TextAttributes.BOLD : 0) || undefined}
        >
          {layer.text}
        </LofiText>
      ))}
    </box>
  );
}
