import { CoasttyPlayer } from "./coastty-player";
import { TextEditor } from "./text-editor";
import { ThreeDemo } from "./three-demo";
import { ImageViewer } from "./image-viewer";
import { About } from "./about";
import { appIcon } from "./icons";
import type { AppManifest } from "./types";

export const desktopApps: AppManifest[] = [
  {
    id: "coastty-player",
    title: "COAST.FM",
    icon: appIcon({ glyph: "starter", fallback: ">" }),
    initialPosition: { left: 12, top: 3 },
    initialSize: { width: 60, height: 24 },
    contentPadding: 0,
    Component: CoasttyPlayer,
  },
  {
    id: "text-editor",
    title: "TEXTEDIT",
    icon: appIcon({ glyph: "edit", fallback: "#" }),
    initialPosition: { left: 16, top: 4 },
    initialSize: { width: 62, height: 22 },
    contentPadding: 1,
    Component: TextEditor,
  },
  {
    id: "3D",
    title: "3D-VIEW",
    icon: appIcon({ glyph: "computer", fallback: "@" }),
    initialPosition: { left: 10, top: 3 },
    initialSize: { width: 66, height: 25 },
    contentPadding: 0,
    Component: ThreeDemo,
  },
  {
    id: "image-viewer",
    title: "IMAGE-VIEW",
    icon: appIcon({ glyph: "palette", fallback: "*" }),
    initialPosition: { left: 8, top: 2 },
    initialSize: { width: 78, height: 28 },
    contentPadding: 0,
    Component: ImageViewer,
  },
];

export const aboutApp: AppManifest = {
  id: "about",
  title: "ABOUT",
  icon: "i",
  initialPosition: { left: 6, top: 3 },
  initialSize: { width: 48, height: 12 },
  contentPadding: 1,
  Component: About,
};

export const systemApps: AppManifest[] = [aboutApp];
export const apps: AppManifest[] = [...desktopApps, ...systemApps];
