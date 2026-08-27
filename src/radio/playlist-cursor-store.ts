import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { PlaylistId } from "./playlists";

export type PlaylistCursor = {
  readonly version: 1;
  readonly playlistId: PlaylistId;
  readonly entryId: string;
  readonly trackId: string;
  readonly elapsedSeconds: number;
  readonly updatedAt: string;
};

export interface PlaylistCursorStore {
  load(playlistId: PlaylistId): Promise<PlaylistCursor | null>;
  save(cursor: PlaylistCursor): Promise<void>;
}

function isCursor(value: unknown, playlistId: PlaylistId): value is PlaylistCursor {
  if (typeof value !== "object" || value === null) return false;
  const cursor = value as Partial<PlaylistCursor>;
  return cursor.version === 1
    && cursor.playlistId === playlistId
    && typeof cursor.entryId === "string"
    && cursor.entryId.length > 0
    && typeof cursor.trackId === "string"
    && cursor.trackId.length > 0
    && typeof cursor.elapsedSeconds === "number"
    && Number.isFinite(cursor.elapsedSeconds)
    && cursor.elapsedSeconds >= 0
    && typeof cursor.updatedAt === "string"
    && Number.isFinite(Date.parse(cursor.updatedAt));
}

export function makeFilePlaylistCursorStore(directory: string): PlaylistCursorStore {
  const pathFor = (playlistId: PlaylistId) => join(directory, `${playlistId}.json`);
  return {
    async load(playlistId) {
      try {
        const value: unknown = JSON.parse(await readFile(pathFor(playlistId), "utf8"));
        return isCursor(value, playlistId) ? value : null;
      } catch {
        return null;
      }
    },
    async save(cursor) {
      await mkdir(directory, { recursive: true });
      const destination = pathFor(cursor.playlistId);
      const temporary = `${destination}.${process.pid}.${crypto.randomUUID()}.tmp`;
      try {
        await writeFile(temporary, `${JSON.stringify(cursor)}\n`, { encoding: "utf8", mode: 0o600 });
        await rename(temporary, destination);
      } catch (cause) {
        await unlink(temporary).catch(() => {});
        throw cause;
      }
    },
  };
}

export function makeMemoryPlaylistCursorStore(
  initial: readonly PlaylistCursor[] = [],
): PlaylistCursorStore & { readonly cursors: Map<PlaylistId, PlaylistCursor> } {
  const cursors = new Map(initial.map((cursor) => [cursor.playlistId, cursor]));
  return {
    cursors,
    load: async (playlistId) => cursors.get(playlistId) ?? null,
    save: async (cursor) => {
      cursors.set(cursor.playlistId, cursor);
    },
  };
}

export const playlistCursorStoreLive = makeFilePlaylistCursorStore(
  Bun.env.COASTTY_STATE_DIR ?? join(homedir(), ".coastty", "playlist-cursors"),
);
