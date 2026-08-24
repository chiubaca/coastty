import { TextAttributes } from "@opentui/core";
import { extend, useKeyboard, useTerminalDimensions } from "@opentui/react";
import { THREE, ThreeRenderable, TextureUtils } from "@opentui/three";
import { useAtomValue } from "@effect-atom/atom-react/Hooks";
import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { useEffect, useRef, useState } from "react";
import type { AppComponentProps } from "../types";
import { windowFocusedAtom } from "../../desktop/window-manager";
import { LofiText } from "../../ui/lofi-text";
import { useTheme } from "../../ui/theme";

declare module "@opentui/react" {
  interface OpenTUIComponents {
    three: typeof ThreeRenderable;
  }
}

extend({ three: ThreeRenderable });

const GALLERY_DIRECTORY = fileURLToPath(new URL("../../assets/gallery/", import.meta.url));
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);

type GalleryImage = {
  readonly name: string;
  readonly path: string;
};

export async function loadGallery(): Promise<readonly GalleryImage[]> {
  const entries = await readdir(GALLERY_DIRECTORY, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => ({ name: entry.name, path: join(GALLERY_DIRECTORY, entry.name) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

type LightboxScene = {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly image: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
};

function createLightboxScene(): LightboxScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07030f");
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.z = 2.4;
  const image = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#1c1031") }),
  );
  scene.add(image);
  return { scene, camera, image };
}

export function ImageViewer({ appId }: AppComponentProps) {
  const { theme: { colors } } = useTheme();
  const { width, height } = useTerminalDimensions();
  const focused = useAtomValue(windowFocusedAtom(appId));
  const [model] = useState(createLightboxScene);
  const canvas = useRef<ThreeRenderable>(null);
  const [gallery, setGallery] = useState<readonly GalleryImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageAspect, setImageAspect] = useState(1);
  const selected = gallery[selectedIndex];

  function fillViewport(aspect: number) {
    const viewportAspect = canvas.current?.aspectRatio ?? Math.max(0.5, width / Math.max(1, height * 2));
    const viewportHeight = 2.1;
    const viewportWidth = viewportHeight * viewportAspect;
    const imageWidth = aspect >= viewportAspect ? viewportHeight * aspect : viewportWidth;
    const imageHeight = aspect >= viewportAspect ? viewportHeight : viewportWidth / aspect;
    model.image.scale.set(imageWidth, imageHeight, 1);
  }

  useEffect(() => {
    fillViewport(imageAspect);
  }, [height, imageAspect, width]);

  useEffect(() => {
    let active = true;
    void loadGallery().then((images) => {
      if (!active) return;
      setGallery(images);
      setSelectedIndex(0);
      setLoading(images.length > 0);
    }).catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true);

    void TextureUtils.fromFile(selected.path).then((texture) => {
      if (!active) {
        texture?.dispose();
        return;
      }
      if (!texture) {
        setLoading(false);
        return;
      }
      const previous = model.image.material.map;
      const aspect = texture.image.width / texture.image.height;
      model.image.material.map = texture;
      model.image.material.color.set("#ffffff");
      model.image.material.needsUpdate = true;
      previous?.dispose();
      setImageAspect(aspect);
      setLoading(false);
    }).catch(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [model, selected]);

  function selectImage(nextIndex: number) {
    if (gallery.length === 0) return;
    setSelectedIndex((nextIndex + gallery.length) % gallery.length);
  }

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "left" || key.sequence?.toLowerCase() === "h") selectImage(selectedIndex - 1);
    if (key.name === "right" || key.sequence?.toLowerCase() === "l") selectImage(selectedIndex + 1);
    const index = Number(key.sequence) - 1;
    if (Number.isInteger(index) && index >= 0 && index < gallery.length) setSelectedIndex(index);
  });

  return (
    <box flexGrow={1} minWidth={1} flexDirection="column" backgroundColor="#07030f">
      <box flexGrow={1} minHeight={4} backgroundColor="#07030f">
        <three ref={canvas} flexGrow={1} minHeight={2} scene={model.scene} camera={model.camera} />
        <box position="absolute" left={0} top={0} height={1} paddingX={1} backgroundColor="#07030f">
          <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>GALLERY LIGHTBOX</LofiText>
        </box>
        <box position="absolute" right={0} top={0} height={1} paddingX={1} backgroundColor="#07030f">
          <LofiText fg={colors.accent}>{gallery.length === 0 ? "0 / 0" : `${selectedIndex + 1} / ${gallery.length}`}</LofiText>
        </box>
        <box position="absolute" left={0} top="50%" width={4} height={3} justifyContent="center" alignItems="center" backgroundColor="#07030f" onMouseDown={() => selectImage(selectedIndex - 1)}>
          <LofiText fg={colors.highlight} attributes={TextAttributes.BOLD}>[&lt;]</LofiText>
        </box>
        <box position="absolute" right={0} top="50%" width={4} height={3} justifyContent="center" alignItems="center" backgroundColor="#07030f" onMouseDown={() => selectImage(selectedIndex + 1)}>
          <LofiText fg={colors.highlight} attributes={TextAttributes.BOLD}>[&gt;]</LofiText>
        </box>
        {loading && <LofiText position="absolute" left="50%" top="50%" fg={colors.glow}>LOADING IMAGE...</LofiText>}
        {!loading && !selected && <LofiText position="absolute" left="50%" top="50%" fg={colors.muted}>NO IMAGES FOUND</LofiText>}
      </box>
      <box height={1} paddingX={1} justifyContent="space-between" backgroundColor={colors.shadow}>
        <LofiText fg={colors.primary}>{selected?.name ?? "src/assets/gallery"}</LofiText>
        <LofiText fg={colors.muted}>LEFT/RIGHT: BROWSE</LofiText>
      </box>
      <box height={1} flexDirection="row" backgroundColor={colors.border}>
        {gallery.map((image, index) => (
          <box key={image.name} flexGrow={1} justifyContent="center" backgroundColor={index === selectedIndex ? colors.accent : colors.border} onMouseDown={() => setSelectedIndex(index)}>
            <LofiText fg={index === selectedIndex ? colors.background : colors.primary} attributes={index === selectedIndex ? TextAttributes.BOLD : undefined}>
              [{index + 1}] {image.name.split(".")[0]}
            </LofiText>
          </box>
        ))}
      </box>
    </box>
  );
}
