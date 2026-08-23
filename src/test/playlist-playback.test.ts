import { describe, expect, test } from "bun:test";
import { Effect, SubscriptionRef } from "effect";
import type { AudiusSource, PlaylistEntry, PlaylistManifest, StreamCandidate } from "../radio/audius-source";
import type { AudioEnginePort, AudioFactory, AudioStreamHandlers, AudioStreamPort, AudioStreamStats } from "../radio/audio-port";
import { makeMemoryPlaylistCursorStore, type PlaylistCursor } from "../radio/playlist-cursor-store";
import { makeStreamingAudio, PlaybackCommand, type PlaybackSnapshot, type StreamingAudioService } from "../radio/playback";
import type { PlaylistDefinition, PlaylistId } from "../radio/playlists";

function entries(prefix: string): PlaylistEntry[] {
  return Array.from({ length: 10 }, (_, index) => ({
    entryId: `collection:${prefix}-${index}:${1_700_000_000 + index}`,
    sourceCollectionId: "collection",
    trackId: index === 0 || index === 9 ? `${prefix}-duplicate` : `${prefix}-${index}`,
    sourceTimestamp: 1_700_000_000 + index,
    position: index,
    durationSeconds: 300,
    artist: `Artist ${index}`,
    title: `Title ${index}`,
    audiusUrl: `https://audius.co/track/${prefix}-${index}`,
    mirrors: ["https://mirror.example"],
  }));
}

function manifest(playlistId: PlaylistId, playlistEntries = entries(playlistId)): PlaylistManifest {
  return {
    playlistId,
    sourceCollectionId: "collection",
    sourceName: playlistId,
    entries: playlistEntries,
    playableDurationSeconds: playlistEntries.reduce((total, entry) => total + entry.durationSeconds, 0),
    available: playlistEntries.length >= 10,
    fetchedAt: Date.now(),
  };
}

class FakeSource implements AudiusSource {
  manifests = new Map<PlaylistId, PlaylistManifest>([["upbeat", manifest("upbeat")], ["lofi", manifest("lofi")]]);
  streamRequests: string[] = [];
  refreshes = new Map<PlaylistId, number>();
  refreshFailures = new Map<PlaylistId, number>();

  async refresh(playlist: PlaylistDefinition) {
    this.refreshes.set(playlist.id, (this.refreshes.get(playlist.id) ?? 0) + 1);
    const failures = this.refreshFailures.get(playlist.id) ?? 0;
    if (failures > 0) {
      this.refreshFailures.set(playlist.id, failures - 1);
      throw new Error("temporary API failure");
    }
    return this.manifests.get(playlist.id)!;
  }

  async getStreamCandidates(entry: PlaylistEntry): Promise<readonly StreamCandidate[]> {
    this.streamRequests.push(entry.entryId);
    const attempt = this.streamRequests.length;
    return [
      { url: `https://primary.example/${entry.trackId}?attempt=${attempt}`, mirror: null },
      { url: `https://mirror.example/${entry.trackId}?attempt=${attempt}`, mirror: "https://mirror.example" },
    ];
  }

  async getResumeOffset(_candidate: StreamCandidate, _entry: PlaylistEntry, elapsedSeconds: number) {
    return elapsedSeconds > 0 ? 1_024 : null;
  }
}

class FakeStream implements AudioStreamPort {
  readonly closed = Promise.resolve();
  state: AudioStreamStats["state"] = "buffering";
  stats: AudioStreamStats = {
    state: "buffering",
    sampleRate: 48_000,
    channels: 2,
    bufferedFrames: 0,
    capacityFrames: 48_000,
    bufferedDurationMs: 0,
    bytesReceived: 0n,
    framesDecoded: 0n,
    framesPlayed: 0n,
    underruns: 0,
    reconnectAttempts: 0,
  };
  disposed = false;
  handlers: AudioStreamHandlers | null = null;

  getStats() {
    return { ...this.stats, state: this.state };
  }
  getMetadata() { return null; }
  setVolume() { return true; }
  subscribe(handlers: AudioStreamHandlers) {
    this.handlers = handlers;
    return () => { this.handlers = null; };
  }
  dispose() { this.disposed = true; }
  end() { this.state = "ended"; this.handlers?.ended(); }
  fail() { this.state = "errored"; this.handlers?.error({ error: new Error("content node failed"), context: { action: "fetch", status: 502 } }); }
  failDecoder() { this.state = "errored"; this.handlers?.error({ error: new Error("decoder rejected range"), context: { action: "decoder" } }); }
}

class FakeEngine implements AudioEnginePort {
  streams: FakeStream[] = [];
  calls: { url: string; options: Parameters<AudioEnginePort["playStreamUrl"]>[1] }[] = [];
  failUrls = new Set<string>();
  hangUrls = new Set<string>();

  start() { return true; }
  stop() { return true; }
  async playStreamUrl(url: string, options: Parameters<AudioEnginePort["playStreamUrl"]>[1]) {
    this.calls.push({ url, options });
    if ([...this.hangUrls].some((part) => url.includes(part))) return await new Promise<AudioStreamPort>(() => {});
    if ([...this.failUrls].some((part) => url.includes(part))) throw new Error("candidate failed");
    const stream = new FakeStream();
    this.streams.push(stream);
    return stream;
  }
  subscribeError() { return () => {}; }
  dispose() {}
}

function waitFor(
  playback: StreamingAudioService,
  predicate: (snapshot: PlaybackSnapshot) => boolean,
): Effect.Effect<PlaybackSnapshot> {
  return Effect.gen(function* () {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const snapshot = yield* SubscriptionRef.get(playback.state);
      if (predicate(snapshot)) return snapshot;
      yield* Effect.sleep("10 millis");
    }
    throw new Error("Playback state did not settle");
  });
}

describe("Playable Playlist playback", () => {
  test("selects while stopped, resumes the exact entry, checkpoints played frames, and skips forward", async () => {
    const source = new FakeSource();
    const engine = new FakeEngine();
    const cursorStore = makeMemoryPlaylistCursorStore();

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio({ create: () => engine }, { source, cursorStore });
      yield* waitFor(playback, (snapshot) => snapshot.directory.playlists.every((item) => item.available));
      expect((yield* SubscriptionRef.get(playback.state)).directory.playlists[0]?.tracks).toHaveLength(10);

      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      let snapshot = yield* SubscriptionRef.get(playback.state);
      expect(snapshot.selected).toMatchObject({ _tag: "Playlist", id: "upbeat" });
      expect(snapshot.status).toBe("Stopped");

      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      snapshot = yield* waitFor(playback, (state) => state.status === "Buffering");
      expect(snapshot.track?.entryId).toBe(manifest("upbeat").entries[0]?.entryId);
      expect(engine.calls[0]?.url).toContain("upbeat-duplicate");

      const stream = engine.streams[0]!;
      stream.state = "playing";
      stream.stats = { ...stream.stats, framesPlayed: 240_000n };
      yield* waitFor(playback, (state) => state.status === "Playing");
      yield* Effect.sleep("120 millis");
      yield* playback.dispatchAndWait(PlaybackCommand.Pause());
      expect(cursorStore.cursors.get("upbeat")?.elapsedSeconds).toBe(5);
      expect((yield* SubscriptionRef.get(playback.state)).track?.entryId).toBe(manifest("upbeat").entries[0]?.entryId);

      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      yield* waitFor(playback, (state) => state.status === "Buffering");
      expect(engine.calls[1]?.url).toContain("attempt=2");
      expect(new Headers(engine.calls[1]?.options.request?.headers).get("Range")).toBe("bytes=1024-");

      engine.streams[1]!.failDecoder();
      yield* waitFor(playback, () => engine.calls.length === 3);
      expect(new Headers(engine.calls[2]?.options.request?.headers).get("Range")).toBeNull();
      expect(new URL(engine.calls[2]!.url).host).toBe("primary.example");

      yield* playback.dispatchAndWait(PlaybackCommand.Skip());
      snapshot = yield* waitFor(playback, (state) => state.track?.entryId === manifest("upbeat").entries[1]?.entryId);
      expect(snapshot.track?.title).toBe("Title 1");
      expect(cursorStore.cursors.get("upbeat")?.elapsedSeconds).toBe(0);

      yield* playback.dispatchAndWait(PlaybackCommand.Previous());
      snapshot = yield* waitFor(playback, (state) => state.track?.entryId === manifest("upbeat").entries[0]?.entryId);
      expect(snapshot.track?.title).toBe("Title 0");

      const selectedEntry = manifest("upbeat").entries[4]!;
      yield* playback.dispatchAndWait(PlaybackCommand.SelectTrack({ playlistId: "upbeat", entryId: selectedEntry.entryId }));
      snapshot = yield* waitFor(playback, (state) => state.track?.entryId === selectedEntry.entryId);
      expect(snapshot.track?.title).toBe("Title 4");

      const callsBeforeSeek = engine.calls.length;
      yield* playback.dispatchAndWait(PlaybackCommand.Seek({ positionSeconds: 150 }));
      snapshot = yield* SubscriptionRef.get(playback.state);
      expect(snapshot.positionSeconds).toBe(150);
      expect(snapshot.track?.entryId).toBe(selectedEntry.entryId);
      expect(cursorStore.cursors.get("upbeat")?.elapsedSeconds).toBe(150);
      yield* waitFor(playback, () => engine.calls.length > callsBeforeSeek);
      expect(new Headers(engine.calls.at(-1)?.options.request?.headers).get("Range")).toBe("bytes=1024-");
    })));
  });

  test("tries mirrors, advances on normal completion, and loops from the latest order", async () => {
    const source = new FakeSource();
    const engine = new FakeEngine();
    engine.failUrls.add("primary.example");
    const currentManifest = manifest("upbeat");
    const finalEntry = currentManifest.entries[9]!;
    const cursor: PlaylistCursor = {
      version: 1,
      playlistId: "upbeat",
      entryId: finalEntry.entryId,
      trackId: finalEntry.trackId,
      elapsedSeconds: 0,
      updatedAt: "2026-08-23T12:00:00.000Z",
    };

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio(
        { create: () => engine },
        { source, cursorStore: makeMemoryPlaylistCursorStore([cursor]) },
      );
      yield* waitFor(playback, (snapshot) => snapshot.directory.playlists[0]?.available === true);
      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      let snapshot = yield* waitFor(playback, (state) => state.status === "Buffering");
      expect(snapshot.track?.entryId).toBe(finalEntry.entryId);
      expect(engine.calls.slice(0, 2).map((call) => new URL(call.url).host)).toEqual([
        "primary.example", "mirror.example",
      ]);

      engine.streams[0]!.end();
      snapshot = yield* waitFor(playback, (state) => state.track?.entryId === currentManifest.entries[0]?.entryId);
      expect(snapshot.track?.entryId).toBe(currentManifest.entries[0]?.entryId);
    })));
  });

  test("refreshes a stale manifest before Play and restarts a stale cursor at the first entry", async () => {
    const source = new FakeSource();
    const staleManifest = { ...manifest("upbeat"), fetchedAt: 0 };
    source.manifests.set("upbeat", staleManifest);
    const staleCursor: PlaylistCursor = {
      version: 1,
      playlistId: "upbeat",
      entryId: "removed:entry:identity",
      trackId: "removed-track",
      elapsedSeconds: 100,
      updatedAt: "2026-08-23T12:00:00.000Z",
    };
    const engine = new FakeEngine();

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio(
        { create: () => engine },
        { source, cursorStore: makeMemoryPlaylistCursorStore([staleCursor]), now: () => 120_000 },
      );
      yield* waitFor(playback, (snapshot) => snapshot.directory.playlists[0]?.available === true);
      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      const snapshot = yield* waitFor(playback, (state) => state.status === "Buffering");

      expect(source.refreshes.get("upbeat")).toBe(2);
      expect(snapshot.track?.entryId).toBe(staleManifest.entries[0]?.entryId);
      expect(engine.calls[0]?.options.request).toBeUndefined();
    })));
  });

  test("uses the latest order after completion and preserves an exact duplicate occurrence", async () => {
    const source = new FakeSource();
    const original = manifest("upbeat");
    const duplicate = original.entries[9]!;
    const cursor: PlaylistCursor = {
      version: 1,
      playlistId: "upbeat",
      entryId: duplicate.entryId,
      trackId: duplicate.trackId,
      elapsedSeconds: 0,
      updatedAt: "2026-08-23T12:00:00.000Z",
    };
    const engine = new FakeEngine();

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio(
        { create: () => engine },
        { source, cursorStore: makeMemoryPlaylistCursorStore([cursor]) },
      );
      yield* waitFor(playback, (snapshot) => snapshot.directory.playlists[0]?.available === true);
      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      let snapshot = yield* waitFor(playback, (state) => state.status === "Buffering");
      expect(snapshot.track?.entryId).toBe(duplicate.entryId);

      const latestEntries = [original.entries[0]!, duplicate, original.entries[4]!, ...original.entries.slice(1, 4), ...original.entries.slice(5, 9)];
      source.manifests.set("upbeat", manifest("upbeat", latestEntries));
      engine.streams[0]!.end();
      snapshot = yield* waitFor(playback, (state) => state.track?.entryId === original.entries[4]?.entryId);
      expect(snapshot.track?.entryId).toBe(original.entries[4]?.entryId);
    })));
  });

  test("skips an entry after all mirrors fail and becomes unavailable below its own floor", async () => {
    const source = new FakeSource();
    const elevenEntries = [...entries("upbeat"), {
      ...entries("upbeat")[1]!,
      entryId: "collection:upbeat-extra:1700000100",
      trackId: "upbeat-extra",
      sourceTimestamp: 1_700_000_100,
      position: 10,
    }];
    source.manifests.set("upbeat", manifest("upbeat", elevenEntries));
    const engine = new FakeEngine();
    engine.failUrls.add("upbeat-duplicate");

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio(
        { create: () => engine },
        { source, cursorStore: makeMemoryPlaylistCursorStore() },
      );
      yield* waitFor(playback, (snapshot) => snapshot.directory.playlists[0]?.playableEntries === 11);
      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      const advanced = yield* waitFor(playback, (state) => state.track?.entryId === elevenEntries[1]?.entryId);
      expect(advanced.status).toBe("Buffering");
      expect(engine.calls.slice(0, 2).map((call) => new URL(call.url).host)).toEqual([
        "primary.example", "mirror.example",
      ]);
    })));

    const floorSource = new FakeSource();
    const floorEngine = new FakeEngine();
    floorEngine.failUrls.add("upbeat-duplicate");
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio(
        { create: () => floorEngine },
        { source: floorSource, cursorStore: makeMemoryPlaylistCursorStore() },
      );
      yield* waitFor(playback, (snapshot) => snapshot.directory.playlists[0]?.available === true);
      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      const failed = yield* waitFor(playback, (state) => state.status === "Error");
      expect(failed.failure).toBe("Playlist unavailable");
      expect(failed.directory.playlists[0]?.available).toBe(false);
      expect(failed.directory.playlists[1]?.available).toBe(true);

      floorEngine.failUrls.clear();
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      const recovered = yield* waitFor(playback, (state) => state.status === "Buffering");
      expect(recovered.directory.playlists[0]?.available).toBe(true);
    })));
  });

  test("switches immediately while active and retains independent Playlist cursors", async () => {
    const source = new FakeSource();
    const engine = new FakeEngine();
    const cursorStore = makeMemoryPlaylistCursorStore();

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio({ create: () => engine }, { source, cursorStore });
      yield* waitFor(playback, (snapshot) => snapshot.directory.playlists.every((item) => item.available));
      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      yield* waitFor(playback, (state) => state.status === "Buffering");
      engine.streams[0]!.state = "playing";
      engine.streams[0]!.stats = { ...engine.streams[0]!.stats, framesPlayed: 144_000n };
      yield* waitFor(playback, (state) => state.status === "Playing");

      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "lofi" } }));
      let snapshot = yield* waitFor(playback, (state) => state.track?.entryId === manifest("lofi").entries[0]?.entryId);
      expect(snapshot.selected).toMatchObject({ _tag: "Playlist", id: "lofi" });
      expect(cursorStore.cursors.get("upbeat")?.elapsedSeconds).toBe(3);
      expect(engine.streams[0]!.disposed).toBe(true);

      engine.streams[1]!.state = "playing";
      engine.streams[1]!.stats = { ...engine.streams[1]!.stats, framesPlayed: 96_000n };
      yield* waitFor(playback, (state) => state.status === "Playing");
      yield* playback.dispatchAndWait(PlaybackCommand.Pause());
      expect(cursorStore.cursors.get("lofi")?.elapsedSeconds).toBe(2);

      const callsBeforeSelection = engine.calls.length;
      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      snapshot = yield* SubscriptionRef.get(playback.state);
      expect(snapshot.status).toBe("Paused");
      expect(engine.calls).toHaveLength(callsBeforeSelection);
      const upbeatManifest = manifest("upbeat");
      source.manifests.set("upbeat", manifest("upbeat", [
        upbeatManifest.entries[0]!,
        upbeatManifest.entries[4]!,
        ...upbeatManifest.entries.slice(1, 4),
        ...upbeatManifest.entries.slice(5),
      ]));
      yield* playback.dispatchAndWait(PlaybackCommand.Skip());
      expect(cursorStore.cursors.get("upbeat")?.entryId).toBe(upbeatManifest.entries[4]?.entryId);
      expect(engine.calls).toHaveLength(callsBeforeSelection);
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      yield* waitFor(playback, (state) => state.status === "Buffering");
      expect(new Headers(engine.calls.at(-1)?.options.request?.headers).get("Range")).toBeNull();
    })));
  });

  test("bounds a hanging primary stream request and continues with its mirror", async () => {
    const source = new FakeSource();
    const engine = new FakeEngine();
    engine.hangUrls.add("primary.example");

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio(
        { create: () => engine },
        { source, cursorStore: makeMemoryPlaylistCursorStore(), streamOpenTimeoutMs: 10 },
      );
      yield* waitFor(playback, (snapshot) => snapshot.directory.playlists[0]?.available === true);
      yield* playback.dispatchAndWait(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: "upbeat" } }));
      yield* playback.dispatchAndWait(PlaybackCommand.Play());
      yield* waitFor(playback, (state) => state.status === "Buffering");
      expect(engine.calls.slice(0, 2).map((call) => new URL(call.url).host)).toEqual([
        "primary.example", "mirror.example",
      ]);
    })));
  });

  test("periodically restores a Playlist after its startup refresh fails", async () => {
    const source = new FakeSource();
    source.refreshFailures.set("upbeat", 1);

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio(
        { create: () => new FakeEngine() },
        {
          source,
          cursorStore: makeMemoryPlaylistCursorStore(),
          playlistRefreshIntervalMs: 20,
        },
      );
      const initial = yield* waitFor(playback, (snapshot) => snapshot.directory.playlists[1]?.available === true);
      expect(initial.directory.playlists[0]?.available).toBe(false);
      const recovered = yield* waitFor(playback, (snapshot) => snapshot.directory.playlists[0]?.available === true);
      expect(recovered.directory.playlists[0]?.available).toBe(true);
      expect(source.refreshes.get("upbeat")).toBeGreaterThanOrEqual(2);
    })));
  });
});
