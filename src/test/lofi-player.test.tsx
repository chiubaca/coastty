import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import { createElement } from "react";
import { LofiPlayerView, playbackCommandForKey } from "../apps/lofi-player";
import { initialPlaybackSnapshot, PlaybackCommand, type PlaybackCommand as PlaybackCommandType } from "../radio/playback";

describe("lofi player directory", () => {
  test("distinguishes Stations and Playlists and disables unavailable choices", async () => {
    const commands: PlaybackCommandType[] = [];
    const { renderer, mockMouse, flush, captureCharFrame } = await createTestRenderer({ width: 54, height: 14 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(LofiPlayerView, {
        snapshot: initialPlaybackSnapshot,
        dispatch: (command) => commands.push(command),
      })));
      await flush();

      const frame = captureCharFrame();
      expect(frame).toContain("STATION");
      expect(frame).toContain("PLAYLISTS");
      expect(frame).toContain("COMING SOON");
      expect(frame).toContain("UPBEAT [OFF]");
      expect(frame).not.toContain("NEXT : N");

      await mockMouse.pressDown(5, 7);
      await mockMouse.release(5, 7);
      expect(commands).toEqual([]);
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });

  test("shows Playlist attribution and exposes forward Skip only for a selected Playlist", async () => {
    const upbeat = {
      ...initialPlaybackSnapshot.directory.playlists[0]!,
      available: true,
      playableEntries: 10,
      playableDurationSeconds: 3_000,
    };
    const snapshot = {
      ...initialPlaybackSnapshot,
      selected: upbeat,
      directory: {
        ...initialPlaybackSnapshot.directory,
        playlists: [upbeat, initialPlaybackSnapshot.directory.playlists[1]!],
      },
      track: {
        entryId: "collection:track:timestamp",
        trackId: "track",
        artist: "Audius Artist",
        title: "Audius Title",
        audiusUrl: "https://audius.co/track",
      },
      status: "Playing" as const,
    };
    const { renderer, flush, captureCharFrame } = await createTestRenderer({ width: 54, height: 14 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(LofiPlayerView, { snapshot, dispatch: () => {} })));
      await flush();
      const frame = captureCharFrame();
      expect(frame).toContain("PLAYLIST // Audius");
      expect(frame).toContain("Upbeat");
      expect(frame).toContain("Audius Artist");
      expect(frame).toContain("Audius Title");
      expect(frame).toContain("NEXT : N");
      expect(playbackCommandForKey({ name: "n", sequence: "n" }, snapshot)).toEqual(PlaybackCommand.Skip());
      expect(playbackCommandForKey({ name: "n", sequence: "n" }, initialPlaybackSnapshot)).toBeNull();
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });
});
