import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import { createElement } from "react";
import { LofiPlayerView, playbackCommandForKey } from "../apps/lofi-player";
import { initialPlaybackSnapshot, PlaybackCommand, type PlaybackCommand as PlaybackCommandType } from "../radio/playback";

describe("lofi player", () => {
  test("uses a collapsed visualizer canvas by default", async () => {
    const commands: PlaybackCommandType[] = [];
    const { renderer, flush, captureCharFrame } = await createTestRenderer({ width: 54, height: 14 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(LofiPlayerView, {
        snapshot: initialPlaybackSnapshot,
        dispatch: (command) => commands.push(command),
      })));
      await flush();

      let frame = captureCharFrame();
      expect(frame).toContain("[+] LIBRARY");
      expect(frame).toContain("NOW PLAYING");
      expect(frame).toContain("|< PREV");
      expect(frame).toContain("> PLAY");
      expect(frame).not.toContain("COMING SOON");
      expect(commands).toEqual([]);
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });

  test("reveals the radio directory and disables unavailable stations", async () => {
    const commands: PlaybackCommandType[] = [];
    const { renderer, mockMouse, flush, captureCharFrame } = await createTestRenderer({ width: 54, height: 14 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(LofiPlayerView, {
        snapshot: initialPlaybackSnapshot,
        dispatch: (command) => commands.push(command),
        sidebarInitiallyOpen: true,
      })));
      await flush();
      const frame = captureCharFrame();
      expect(frame).toContain("[-] LIBRARY");
      expect(frame).toContain("RADIO");
      expect(frame).toContain("PLAYLISTS");
      expect(frame).toContain("COMING SOON");

      await mockMouse.pressDown(5, 4);
      await mockMouse.release(5, 4);
      expect(commands).toEqual([]);
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });

  test("shows playlist songs, dispatches direct selection, and exposes both track directions", async () => {
    const commands: PlaybackCommandType[] = [];
    const tracks = [
      { entryId: "entry-1", trackId: "track-1", artist: "Audius Artist", title: "Audius Title", durationSeconds: 180 },
      { entryId: "entry-2", trackId: "track-2", artist: "Second Artist", title: "Second Song", durationSeconds: 200 },
    ];
    const upbeat = {
      ...initialPlaybackSnapshot.directory.playlists[0]!,
      available: true,
      playableEntries: tracks.length,
      playableDurationSeconds: 380,
      tracks,
    };
    const snapshot = {
      ...initialPlaybackSnapshot,
      selected: upbeat,
      directory: {
        ...initialPlaybackSnapshot.directory,
        playlists: [upbeat, initialPlaybackSnapshot.directory.playlists[1]!],
      },
      track: {
        entryId: "entry-1",
        trackId: "track-1",
        artist: "Audius Artist",
        title: "Audius Title",
        audiusUrl: "https://audius.co/track",
        durationSeconds: 180,
      },
      status: "Playing" as const,
      spectrum: Array.from({ length: 24 }, (_, index) => index / 24),
      positionSeconds: 45,
    };
    const { renderer, mockMouse, flush, captureCharFrame } = await createTestRenderer({ width: 54, height: 14 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(LofiPlayerView, {
        snapshot,
        dispatch: (command) => commands.push(command),
        sidebarInitiallyOpen: true,
      })));
      await flush();
      const frame = captureCharFrame();
      expect(frame).toContain("TRACKS // UPBEAT");
      expect(frame).toContain("AUDIUS TITLE");
      expect(frame).toContain("Second Song");
      expect(frame).toContain("|| PAUSE");
      expect(frame).toContain("NEXT >|");
      expect(frame).toContain("00:45");
      expect(frame).toContain("03:00");

      await mockMouse.pressDown(8, 6);
      await mockMouse.release(8, 6);
      expect(commands).toContainEqual(PlaybackCommand.SelectTrack({ playlistId: "upbeat", entryId: "entry-2" }));
      await mockMouse.pressDown(27, 12);
      await mockMouse.release(27, 12);
      expect(commands).toContainEqual(PlaybackCommand.Seek({ positionSeconds: 90 }));
      expect(playbackCommandForKey({ name: "left", sequence: "" }, snapshot)).toEqual(PlaybackCommand.Previous());
      expect(playbackCommandForKey({ name: "right", sequence: "" }, snapshot)).toEqual(PlaybackCommand.Skip());
      expect(playbackCommandForKey({ name: "left", sequence: "" }, initialPlaybackSnapshot)).toBeNull();
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });
});
