import { LofiPlayer } from "./lofi-player";
import { TextEditor } from "./text-editor";
import { appIcon } from "./icons";
import type { AppManifest } from "./types";

export const apps: AppManifest[] = [
  {
    id: "lofi-player",
    title: "lofi.fm",
    icon: appIcon({ glyph: "starter", fallback: ">" }),
    initialPosition: { left: 24, top: 5 },
    initialSize: { width: 46, height: 16 },
    Component: LofiPlayer,
  },
  {
    id: "text-editor",
    title: "TextEdit",
    icon: appIcon({ glyph: "file", fallback: "#" }),
    initialPosition: { left: 16, top: 4 },
    initialSize: { width: 62, height: 22 },
    contentPadding: 0,
    Component: TextEditor,
  },
];
