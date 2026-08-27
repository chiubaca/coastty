import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { useEffect, useState } from "react";
import type { AppComponentProps } from "../types";
import { ASCII_ART_WALLPAPER, AsciiArtWallpaper, desktopWallpaperAtom } from "../../desktop/desktop-wallpaper";
import { windowFocusedAtom } from "../../desktop/window-manager";
import { CoasttyText } from "../../ui/coastty-text";
import { useTheme } from "../../ui/theme";

const GALLERY_DIRECTORY = fileURLToPath(new URL("../../assets/gallery/", import.meta.url));
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);

type GalleryImage = {
  readonly kind: "image";
  readonly name: string;
  readonly path: string;
};

type AsciiArtGalleryItem = {
  readonly kind: "ascii";
  readonly name: "ASCII-ART";
};

type GalleryItem = GalleryImage | AsciiArtGalleryItem;

const ASCII_ART_GALLERY_ITEM: AsciiArtGalleryItem = { kind: "ascii", name: "ASCII-ART" };

export async function loadGallery(): Promise<readonly GalleryItem[]> {
  const entries = await readdir(GALLERY_DIRECTORY, { withFileTypes: true });
  const images: readonly GalleryImage[] = entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry): GalleryImage => ({ kind: "image", name: entry.name, path: join(GALLERY_DIRECTORY, entry.name) }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return [ASCII_ART_GALLERY_ITEM, ...images];
}

export function ImageViewer({ appId, contentSize }: AppComponentProps) {
  const { theme: { colors } } = useTheme();
  const focused = useAtomValue(windowFocusedAtom(appId));
  const setWallpaper = useAtomSet(desktopWallpaperAtom);
  const [gallery, setGallery] = useState<readonly GalleryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const selected = gallery[selectedIndex];

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
    if (!selected || selected.kind === "ascii") {
      setLoading(false);
      return;
    }
    setLoading(true);
  }, [selected]);

  function selectImage(nextIndex: number) {
    if (gallery.length === 0) return;
    setSelectedIndex((nextIndex + gallery.length) % gallery.length);
  }

  function setAsWallpaper() {
    if (!selected) return;
    setWallpaper(selected.kind === "ascii" ? ASCII_ART_WALLPAPER : { kind: "image", path: selected.path });
  }

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "left" || key.sequence?.toLowerCase() === "h") selectImage(selectedIndex - 1);
    if (key.name === "right" || key.sequence?.toLowerCase() === "l") selectImage(selectedIndex + 1);
    if (key.sequence?.toLowerCase() === "w") setAsWallpaper();
  });

  return (
    <box flexGrow={1} minWidth={1} flexDirection="column" backgroundColor="#07030f">
      <box flexGrow={1} minHeight={4} backgroundColor="#07030f" overflow="hidden">
        {selected?.kind === "image" && <image flexGrow={1} minHeight={2} source={selected.path} fit="fit" onLoad={() => setLoading(false)} onError={() => setLoading(false)} />}
        {selected?.kind === "ascii" && <AsciiArtWallpaper width={contentSize.width} height={Math.max(0, contentSize.height - 1)} top={0} />}
        <box position="absolute" left={0} top={0} height={1} paddingX={1} backgroundColor="#07030f">
          <CoasttyText fg={colors.glow} attributes={TextAttributes.BOLD}>GALLERY LIGHTBOX</CoasttyText>
        </box>
        <box position="absolute" right={0} top={0} height={1} paddingX={1} backgroundColor="#07030f">
          <CoasttyText fg={colors.accent}>{gallery.length === 0 ? "0 / 0" : `${selectedIndex + 1} / ${gallery.length}`}</CoasttyText>
        </box>
        <box position="absolute" left={0} top="50%" width={4} height={3} justifyContent="center" alignItems="center" backgroundColor="#07030f" onMouseDown={() => selectImage(selectedIndex - 1)}>
          <CoasttyText fg={colors.highlight} attributes={TextAttributes.BOLD}>[&lt;]</CoasttyText>
        </box>
        <box position="absolute" right={0} top="50%" width={4} height={3} justifyContent="center" alignItems="center" backgroundColor="#07030f" onMouseDown={() => selectImage(selectedIndex + 1)}>
          <CoasttyText fg={colors.highlight} attributes={TextAttributes.BOLD}>[&gt;]</CoasttyText>
        </box>
        {loading && <CoasttyText position="absolute" left="50%" top="50%" fg={colors.glow}>LOADING IMAGE...</CoasttyText>}
        {!loading && !selected && <CoasttyText position="absolute" left="50%" top="50%" fg={colors.muted}>NO IMAGES FOUND</CoasttyText>}
      </box>
      <box height={1} paddingX={1} justifyContent="space-between" backgroundColor={colors.shadow}>
        <CoasttyText fg={colors.primary}>{selected?.name ?? "src/assets/gallery"}</CoasttyText>
        <box flexDirection="row" gap={1}>
          <CoasttyText fg={colors.muted}>LEFT/RIGHT: BROWSE</CoasttyText>
          <box paddingX={1} backgroundColor={colors.accent} onMouseDown={setAsWallpaper}>
            <CoasttyText fg={colors.background} attributes={TextAttributes.BOLD}>[W] SET WALLPAPER</CoasttyText>
          </box>
        </box>
      </box>
    </box>
  );
}
