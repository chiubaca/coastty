import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeFilePlaylistCursorStore, type PlaylistCursor } from "../radio/playlist-cursor-store";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "coastty-cursors-"));
  directories.push(directory);
  return { directory, store: makeFilePlaylistCursorStore(directory) };
}

const upbeatCursor: PlaylistCursor = {
  version: 1,
  playlistId: "upbeat",
  entryId: "collection:track:timestamp",
  trackId: "track",
  elapsedSeconds: 12.5,
  updatedAt: "2026-08-23T12:00:00.000Z",
};

describe("device-local Playlist cursor store", () => {
  test("atomically stores one minimal cursor per Playlist", async () => {
    const { directory, store } = await fixture();
    const lofiCursor: PlaylistCursor = { ...upbeatCursor, playlistId: "lofi", entryId: "lofi:track:timestamp" };

    await store.save(upbeatCursor);
    await store.save(lofiCursor);

    expect(await store.load("upbeat")).toEqual(upbeatCursor);
    expect(await store.load("lofi")).toEqual(lofiCursor);
    expect((await readdir(directory)).sort()).toEqual(["lofi.json", "upbeat.json"]);
    const persisted = await readFile(join(directory, "upbeat.json"), "utf8");
    expect(persisted).not.toContain("stream");
    expect(persisted).not.toContain("manifest");
    expect(persisted).not.toContain("https://");
  });

  test("ignores corrupt, unsupported, and incomplete cursor data", async () => {
    const { directory, store } = await fixture();
    await writeFile(join(directory, "upbeat.json"), "not json");
    expect(await store.load("upbeat")).toBeNull();

    await writeFile(join(directory, "upbeat.json"), JSON.stringify({ ...upbeatCursor, version: 2 }));
    expect(await store.load("upbeat")).toBeNull();

    await writeFile(join(directory, "upbeat.json"), JSON.stringify({ version: 1, playlistId: "upbeat" }));
    expect(await store.load("upbeat")).toBeNull();
  });
});
