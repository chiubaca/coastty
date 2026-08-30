import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot, flushSync } from "@opentui/react";
import { createElement } from "react";
import {
  blobMusicLevels,
  blobWaveStrength,
  barHeights,
  CoasttyPlayerView,
  createTempoDetector,
  playbackCommandForKey,
  updateTempoDetector,
  visualizerForKey,
} from "../apps/coastty-player";
import { initialPlaybackSnapshot, PlaybackCommand, type PlaybackCommand as PlaybackCommandType } from "../radio/playback";

describe("COAST.FM player", () => {
  test("uses 3D Blob by default and shows a separate visualizer control pane", async () => {
    const commands: PlaybackCommandType[] = [];
    const { renderer, mockMouse, flush, captureCharFrame } = await createTestRenderer({ width: 54, height: 14 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(CoasttyPlayerView, {
        snapshot: initialPlaybackSnapshot,
        dispatch: (command) => commands.push(command),
      })));
      await flush();

      let frame = captureCharFrame();
      expect(frame).toContain("[+] LIBRARY");
      expect(frame).toContain("NOW PLAYING");
      expect(frame).toContain("|< PREV");
      expect(frame).toContain("> PLAY");
      expect(frame).toContain("[1] 2D BARS");
      expect(frame).toContain("[2] 3D BARS");
      expect(frame).toContain("[3] BLOB");
      expect(frame).toContain("WAVE 0.0 / 3.0");
      expect(frame).not.toContain("COMING SOON");
      expect(commands).toEqual([]);

      await mockMouse.pressDown(27, 13);
      await mockMouse.release(27, 13);
      await flush();
      frame = captureCharFrame();
      expect(frame).toContain("3D SPECTRUM");
      expect(frame).not.toContain("EXPORT CAMERA");
      expect(frame).not.toContain("PAN ");
      expect(frame).not.toContain("ROT ");
      expect(frame).not.toContain("WAVE 0.0 / 3.0");
    } finally {
      root.unmount();
      renderer.destroy();
    }
  });

  test("maps silent and loud spectrum data to the blob wave range", () => {
    expect(blobWaveStrength([])).toBe(0);
    expect(blobWaveStrength([0, 0, 0])).toBe(0);
    expect(blobWaveStrength([0.5, 0.2, 0.1])).toBe(1.5);
    expect(blobWaveStrength([1, 0.8, 0.2])).toBe(3);
    expect(blobWaveStrength([2])).toBe(3);
  });

  test("expands and sanitizes spectrum data for the 3D bars", () => {
    expect(barHeights([], 3)).toEqual([0, 0, 0]);
    expect(barHeights([0.2, 0.8], 4)).toEqual([0.2, 0.2, 0.8, 0.8]);
    expect(barHeights([-1, Number.NaN, 2], 3)).toEqual([0, 0, 1]);
  });

  test("separates the spectrum into bass, mid, and treble responses", () => {
    const levels = blobMusicLevels([
      ...Array<number>(8).fill(0.9),
      ...Array<number>(8).fill(0.6),
      ...Array<number>(8).fill(0.3),
    ]);

    expect(levels.bass).toBeCloseTo(0.9);
    expect(levels.mid).toBeCloseTo(0.6);
    expect(levels.treble).toBeCloseTo(0.3);
    expect(levels.peak).toBeCloseTo(0.9);
  });

  test("uses the strongest frequency band for waviness", () => {
    const levels = blobMusicLevels([
      1, ...Array<number>(7).fill(0),
      ...Array<number>(8).fill(0.4),
      ...Array<number>(8).fill(0.2),
    ]);

    expect(levels.bass).toBeCloseTo(0.125);
    expect(levels.peak).toBeCloseTo(0.4);
  });

  test("infers tempo from spaced bass onsets", () => {
    let detector = createTempoDetector();
    for (let timestamp = 0; timestamp <= 2_500; timestamp += 100) {
      detector = updateTempoDetector(detector, timestamp % 500 === 0 ? 0.85 : 0.1, timestamp);
    }

    expect(detector.bpm).toBeCloseTo(120);
  });

  test("resets a stale tempo estimate", () => {
    const detector = updateTempoDetector(createTempoDetector(), 0.85, 0);
    expect(updateTempoDetector(detector, 0.1, 4_100).bpm).toBeNull();
  });

  test("maps the visualizer shortcuts", () => {
    expect(visualizerForKey({ sequence: "1" })).toBe("2D Bars");
    expect(visualizerForKey({ sequence: "2" })).toBe("3D Bars");
    expect(visualizerForKey({ sequence: "3" })).toBe("3D Blob");
    expect(visualizerForKey({ sequence: "b" })).toBeNull();
  });

  test("reveals the radio directory and disables unavailable stations", async () => {
    const commands: PlaybackCommandType[] = [];
    const { renderer, mockMouse, flush, captureCharFrame } = await createTestRenderer({ width: 54, height: 14 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(CoasttyPlayerView, {
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
      spectrum: Array<number>(24).fill(0),
      positionSeconds: 45,
    };
    const { renderer, mockMouse, flush, captureCharFrame } = await createTestRenderer({ width: 54, height: 14 });
    const root = createRoot(renderer);

    try {
      flushSync(() => root.render(createElement(CoasttyPlayerView, {
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
      await mockMouse.pressDown(27, 11);
      await mockMouse.release(27, 11);
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
