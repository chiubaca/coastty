import { LofiPlayer } from "./lofi-player";
import { TextEditor } from "./text-editor";
import { ThreeDemo } from "./three-demo";
import { ImageViewer } from "./image-viewer";
import { appIcon } from "./icons";
import type { AppManifest } from "./types";

export const apps: AppManifest[] = [
  {
    id: "lofi-player",
    title: "lofi.fm",
    icon: appIcon({ glyph: "starter", fallback: ">" }),
    initialPosition: { left: 12, top: 3 },
    initialSize: { width: 64, height: 22 },
    contentPadding: 0,
    Component: LofiPlayer,
  },
  {
    id: "text-editor",
    title: "TextEdit",
    icon: appIcon({ glyph: "file", fallback: "#" }),
    initialPosition: { left: 16, top: 4 },
    initialSize: { width: 62, height: 22 },
    contentPadding: 1,
    Component: TextEditor,
  },
  {
    id: "three-demo",
    title: "Three Demo",
    icon: appIcon({ glyph: "starter", fallback: "@" }),
    initialPosition: { left: 10, top: 3 },
    initialSize: { width: 66, height: 25 },
    contentPadding: 0,
    Component: ThreeDemo,
  },
  {
    id: "image-viewer",
    title: "Image Viewer",
    icon: appIcon({ glyph: "file", fallback: "*" }),
    initialPosition: { left: 8, top: 2 },
    initialSize: { width: 78, height: 28 },
    contentPadding: 0,
    Component: ImageViewer,
  },
];
