import { LofiPlayer } from "./lofi-player";
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
    id: "test",
    title: "test",
    icon: appIcon({ glyph: "bug", fallback: "!" }),
    initialPosition: { left: 24, top: 5 },
    initialSize: { width: 46, height: 16 },
    Component: LofiPlayer,
  },
];
