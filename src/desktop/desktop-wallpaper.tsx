import { TextAttributes } from "@opentui/core";
import { extend, useRenderer } from "@opentui/react";
import { THREE, ThreeRenderable, TextureUtils } from "@opentui/three";
import * as Atom from "@effect-atom/atom/Atom";
import { useAtomValue } from "@effect-atom/atom-react/Hooks";
import { useEffect, useRef, useState } from "react";
import { CoasttyText } from "../ui/coastty-text";

declare module "@opentui/react" {
  interface OpenTUIComponents {
    three: typeof ThreeRenderable;
  }
}

extend({ three: ThreeRenderable });

const WALLPAPER_COLORS = {
  background: "#070316",
  horizon: "#ff4bc8",
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

const DEFAULT_CELL_ASPECT_RATIO = 0.5;

export type WallpaperSelection =
  | { readonly kind: "ascii" }
  | { readonly kind: "image"; readonly path: string };

export const ASCII_ART_WALLPAPER: WallpaperSelection = { kind: "ascii" };

const wallpaperStateAtom = Atom.make<WallpaperSelection>(ASCII_ART_WALLPAPER).pipe(
  Atom.keepAlive,
  Atom.withLabel("desktop/wallpaper-state"),
);

export const desktopWallpaperAtom = Atom.writable(
  (get) => get(wallpaperStateAtom),
  (context, wallpaper: WallpaperSelection) => context.set(wallpaperStateAtom, wallpaper),
).pipe(Atom.withLabel("desktop/wallpaper"));

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

type ImageWallpaperScene = {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly image: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
};

function createImageWallpaperScene(): ImageWallpaperScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(WALLPAPER_COLORS.background);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.z = 2.4;
  const image = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#1c1031") }),
  );
  scene.add(image);
  return { scene, camera, image };
}

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
  return Math.max(2, Math.min(height - 2, Math.round((height - 1) * 0.58)));
}

export function calculateSunGeometry(width: number, horizon: number, cellAspectRatio = DEFAULT_CELL_ASPECT_RATIO) {
  const aspectRatio = Math.max(0.25, Math.min(1, cellAspectRatio));
  const maxRadiusY = Math.floor(Math.min(horizon / 2, ((width - 1) * aspectRatio) / 2));
  if (maxRadiusY < 1) return null;

  const radiusY = Math.min(Math.round(horizon * 0.4), maxRadiusY);
  const horizonGap = Math.max(1, Math.round(radiusY * 0.17));
  const centerY = Math.max(radiusY, horizon - radiusY - horizonGap);
  return { centerY, radiusY, cellAspectRatio: aspectRatio } as const;
}

function ellipseHalfWidth(radiusY: number, distanceY: number, cellAspectRatio: number) {
  return Math.floor(Math.sqrt(Math.max(0, radiusY ** 2 - distanceY ** 2)) / cellAspectRatio);
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
  const edgeGlyphs = [".", "-", "=", "+", "*", "#", "%"];
  const edgeWidth = Math.min(edgeGlyphs.length, halfWidth + 1);
  return Array.from({ length: halfWidth * 2 + 1 }, (_, index) => {
    const edgeDistance = Math.min(index, halfWidth * 2 - index);
    if (edgeDistance < edgeWidth) return edgeGlyphs[edgeDistance];
    return striped ? "=" : "@";
  }).join("");
}

function reflectionRow(width: number, row: number, top: number, horizon: number) {
  const center = (width - 1) / 2;
  const depth = (row - top) / Math.max(1, horizon - top - 1);
  const spread = width * (0.18 + depth * 0.18);
  const glyphs = [".", ":", "=", ":", "."];
  return Array.from({ length: width }, (_, x) => {
    if (Math.abs(x - center) > spread) return " ";
    const hash = (x * 29 + row * 13) % 19;
    return hash < 5 ? glyphs[hash] ?? "." : " ";
  }).join("");
}

function gridRows(horizon: number, height: number) {
  const rows = new Set<number>();
  const lastRow = height - 4;
  let row = horizon;
  while (row <= Math.max(horizon, lastRow)) {
    rows.add(row);
    const progress = (row - horizon) / Math.max(1, lastRow - horizon);
    row += progress < 0.38 ? 1 : progress < 0.8 ? 2 : 3;
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
    chars.fill("-");
  }

  const center = (width - 1) / 2;
  const desiredRayCount = Math.max(5, Math.min(15, Math.floor(width / 10)));
  const rayCount = desiredRayCount % 2 === 0 ? Math.min(15, desiredRayCount + 1) : desiredRayCount;
  for (let index = 0; index < rayCount; index += 1) {
    const position = index / (rayCount - 1) * 2 - 1;
    const horizonX = center + position * width * 0.25;
    const bottomX = center + position * width * 0.6;
    const x = Math.round(horizonX + (bottomX - horizonX) * depth);
    if (x < 0 || x >= width) continue;
    chars[x] = "+";
  }

  return chars.join("");
}

export function buildDesktopWallpaper(
  width: number,
  height: number,
  cellAspectRatio = DEFAULT_CELL_ASPECT_RATIO,
): readonly WallpaperLayer[] {
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

  const sun = calculateSunGeometry(width, horizon, cellAspectRatio);
  if (sun) {
    const sunTop = sun.centerY - sun.radiusY;
    const sunBottom = Math.min(horizon, sun.centerY + sun.radiusY);
    for (let row = Math.max(0, sunTop); row < sunBottom; row += 1) {
      const distanceY = row + 0.5 - sun.centerY;
      const halfWidth = ellipseHalfWidth(sun.radiusY, distanceY, sun.cellAspectRatio);
      const progress = (row + 0.5 - sunTop) / (sun.radiusY * 2);
      const text = sunRow(halfWidth, progress >= 0.75);
      layers.push({
        left: Math.max(0, Math.floor(width / 2) - halfWidth),
        top: row,
        text,
        color: sunColor(progress),
        bold: true,
      });
    }

    for (let row = sunBottom; row < horizon; row += 1) {
      const depth = (row - sunBottom) / Math.max(1, horizon - sunBottom - 1);
      layers.push({
        left: 0,
        top: row,
        text: reflectionRow(width, row, sunBottom, horizon),
        color: gradientColor([[0, "#ff6d91"], [1, "#e832af"]], depth),
        dim: true,
      });
    }
  }

  const horizontalRows = gridRows(horizon, height);
  for (let row = horizon; row < height; row += 1) {
    layers.push({
      left: 0,
      top: row,
      text: gridRow(width, row, horizon, height, horizontalRows),
      color: row === horizon
        ? WALLPAPER_COLORS.horizon
        : gradientColor([[0, "#ff83d2"], [0.35, "#ff50c9"], [0.7, "#ff2cba"], [1, "#ff48d0"]], (row - horizon) / Math.max(1, height - horizon - 1)),
      bold: row === horizon,
    });
  }

  return layers;
}

export function AsciiArtWallpaper({ width, height, top = 1 }: {
  readonly width: number;
  readonly height: number;
  readonly top?: number;
}) {
  const renderer = useRenderer();
  const wallpaperHeight = Math.max(0, height - top);
  const cellAspectRatio = useRef<number | null>(null);
  if (cellAspectRatio.current === null) {
    const resolution = renderer.resolution;
    cellAspectRatio.current = resolution && renderer.terminalWidth > 0 && renderer.terminalHeight > 0
      ? (resolution.width * renderer.terminalHeight) / (resolution.height * renderer.terminalWidth)
      : DEFAULT_CELL_ASPECT_RATIO;
  }
  const backdrop = buildWallpaperBackdrop(wallpaperHeight);
  const layers = buildDesktopWallpaper(width, wallpaperHeight, cellAspectRatio.current);

  return (
    <box
      position="absolute"
      left={0}
      top={top}
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
        <CoasttyText
          key={`${layer.top}:${layer.left}:${index}`}
          position="absolute"
          left={layer.left}
          top={layer.top}
          fg={layer.color}
          attributes={(layer.dim ? TextAttributes.DIM : 0) | (layer.bold ? TextAttributes.BOLD : 0) || undefined}
        >
          {layer.text}
        </CoasttyText>
      ))}
    </box>
  );
}

function ImageWallpaper({ width, height, path }: { readonly width: number; readonly height: number; readonly path: string }) {
  const wallpaperHeight = Math.max(0, height - 1);
  const [model] = useState(createImageWallpaperScene);
  const canvas = useRef<ThreeRenderable>(null);
  const [imageAspect, setImageAspect] = useState(1);

  function fillViewport(aspect: number) {
    const viewportAspect = canvas.current?.aspectRatio ?? Math.max(0.5, width / Math.max(1, wallpaperHeight * 2));
    const viewportHeight = 2.1;
    const viewportWidth = viewportHeight * viewportAspect;
    const imageWidth = aspect >= viewportAspect ? viewportHeight * aspect : viewportWidth;
    const imageHeight = aspect >= viewportAspect ? viewportHeight : viewportWidth / aspect;
    model.image.scale.set(imageWidth, imageHeight, 1);
  }

  useEffect(() => {
    fillViewport(imageAspect);
  }, [height, imageAspect, width]);

  useEffect(() => () => {
    const texture = model.image.material.map;
    model.image.material.map = null;
    texture?.dispose();
  }, [model]);

  useEffect(() => {
    let active = true;

    void TextureUtils.fromFile(path).then((texture) => {
      if (!active) {
        texture?.dispose();
        return;
      }
      if (!texture) return;

      const previous = model.image.material.map;
      model.image.material.map = texture;
      model.image.material.color.set("#ffffff");
      model.image.material.needsUpdate = true;
      previous?.dispose();
      setImageAspect(texture.image.width / texture.image.height);
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [model, path]);

  return (
    <box
      position="absolute"
      left={0}
      top={1}
      width={width}
      height={wallpaperHeight}
      zIndex={-1}
      backgroundColor={WALLPAPER_COLORS.background}
      overflow="hidden"
    >
      <three ref={canvas} flexGrow={1} minHeight={1} scene={model.scene} camera={model.camera} />
    </box>
  );
}

export function DesktopWallpaper({ width, height }: { readonly width: number; readonly height: number }) {
  const wallpaper = useAtomValue(desktopWallpaperAtom);
  return wallpaper.kind === "image"
    ? <ImageWallpaper width={width} height={height} path={wallpaper.path} />
    : <AsciiArtWallpaper width={width} height={height} />;
}
