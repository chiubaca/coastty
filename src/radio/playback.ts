import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Scope from "effect/Scope";
import * as SubscriptionRef from "effect/SubscriptionRef";
import {
  audiusSourceLive,
  playlistAvailability,
  type AudiusSource,
  type PlaylistEntry,
  type PlaylistManifest,
  type StreamCandidate,
} from "./audius-source";
import { openTuiAudioFactory, type AudioFactory, type AudioStreamPort } from "./audio-port";
import {
  playlistCursorStoreLive,
  type PlaylistCursor,
  type PlaylistCursorStore,
} from "./playlist-cursor-store";
import { playlistCatalog, resolvePlaylist, type PlaylistDefinition, type PlaylistId } from "./playlists";
import {
  defaultStation,
  stationCatalog,
  type Attribution,
  type PlaybackFailureCategory,
  type StationIntegration,
} from "./stations";

export type PlaybackStatus =
  | "Stopped"
  | "Connecting"
  | "Buffering"
  | "Playing"
  | "Paused"
  | "Reconnecting"
  | "Error";

export type PlaybackFailure = PlaybackFailureCategory
  | "Playlist unavailable"
  | "Track recovery in progress";

export type StationChoice = {
  readonly _tag: "Station";
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly genre: string;
  readonly available: true;
};

export type PlaylistTrack = {
  readonly entryId: string;
  readonly trackId: string;
  readonly artist: string | null;
  readonly title: string | null;
  readonly durationSeconds: number;
};

export type PlaylistChoice = {
  readonly _tag: "Playlist";
  readonly id: PlaylistId;
  readonly name: string;
  readonly provider: "Audius";
  readonly genre: string;
  readonly available: boolean;
  readonly playableEntries: number;
  readonly playableDurationSeconds: number;
  readonly tracks: readonly PlaylistTrack[];
};

export type PlaybackChoice = StationChoice | PlaylistChoice;
export type ComingSoonChoice = {
  readonly _tag: "ComingSoon";
  readonly id: string;
  readonly name: "Coming Soon";
  readonly available: false;
};
export type PlaybackChoiceIdentity =
  | { readonly _tag: "Station"; readonly id: string }
  | { readonly _tag: "Playlist"; readonly id: PlaylistId };

export type PlaybackTrack = {
  readonly entryId: string;
  readonly trackId: string;
  readonly artist: string | null;
  readonly title: string | null;
  readonly audiusUrl: string | null;
  readonly durationSeconds: number;
};

export type PlaybackSnapshot = {
  readonly selected: PlaybackChoice;
  readonly directory: {
    readonly stations: readonly (StationChoice | ComingSoonChoice)[];
    readonly playlists: readonly PlaylistChoice[];
  };
  readonly track: PlaybackTrack | null;
  readonly status: PlaybackStatus;
  readonly volume: number;
  readonly attribution: Attribution;
  readonly reconnect: { readonly attempt: number; readonly maxRetries: number; readonly delayMs: number } | null;
  readonly failure: PlaybackFailure | null;
  readonly spectrum: readonly number[];
  readonly positionSeconds: number;
};

export type PlaybackCommand = Data.TaggedEnum<{
  Select: { readonly choice: PlaybackChoiceIdentity };
  Play: {};
  Pause: {};
  Previous: {};
  Skip: {};
  SelectTrack: { readonly playlistId: PlaylistId; readonly entryId: string };
  Seek: { readonly positionSeconds: number };
  SetVolume: { readonly volume: number };
}>;

export const PlaybackCommand = Data.taggedEnum<PlaybackCommand>();

export type StreamingAudioService = {
  readonly state: SubscriptionRef.SubscriptionRef<PlaybackSnapshot>;
  readonly dispatch: (command: PlaybackCommand) => Effect.Effect<void>;
  readonly dispatchAndWait: (command: PlaybackCommand) => Effect.Effect<void>;
};

export class StreamingAudio extends Context.Tag("lofi-fm/StreamingAudio")<StreamingAudio, StreamingAudioService>() {}

const unavailable: Attribution = { _tag: "Unavailable" };

function stationChoice(station: StationIntegration): StationChoice {
  return {
    _tag: "Station",
    id: station.id,
    name: station.name,
    provider: station.provider,
    genre: station.genre,
    available: true,
  };
}

function emptyPlaylistChoice(playlist: PlaylistDefinition): PlaylistChoice {
  return {
    _tag: "Playlist",
    id: playlist.id,
    name: playlist.name,
    provider: playlist.provider,
    genre: playlist.genre,
    available: false,
    playableEntries: 0,
    playableDurationSeconds: 0,
    tracks: [],
  };
}

export const initialPlaybackSnapshot: PlaybackSnapshot = {
  selected: stationChoice(defaultStation),
  directory: {
    stations: stationCatalog.directory.map((entry) => entry._tag === "Station"
      ? stationChoice(stationCatalog.resolve(entry.stationId)!)
      : { _tag: "ComingSoon", id: entry.id, name: "Coming Soon", available: false }),
    playlists: playlistCatalog.map(emptyPlaylistChoice),
  },
  track: null,
  status: "Stopped",
  volume: 0.6,
  attribution: unavailable,
  reconnect: null,
  failure: null,
  spectrum: Array<number>(24).fill(0),
  positionSeconds: 0,
};

type StationAttempt = {
  readonly kind: "Station";
  readonly generation: number;
  readonly controller: AbortController;
  readonly station: StationIntegration;
  opening: Promise<AudioStreamPort | null> | null;
  stream: AudioStreamPort | null;
  unsubscribe: (() => void) | null;
  lastFailure: unknown;
};

type PlaylistAttempt = {
  readonly kind: "Playlist";
  readonly generation: number;
  readonly controller: AbortController;
  readonly playlist: PlaylistDefinition;
  readonly entry: PlaylistEntry;
  readonly candidates: readonly StreamCandidate[];
  candidateIndex: number;
  requestedElapsed: number;
  baseElapsed: number;
  lastSavedElapsed: number;
  usedRange: boolean;
  opening: Promise<AudioStreamPort | null> | null;
  stream: AudioStreamPort | null;
  unsubscribe: (() => void) | null;
  lastFailure: unknown;
};

type Attempt = StationAttempt | PlaylistAttempt;
type BoundaryReason = "completed" | "skipped" | "failed";

type Message =
  | { readonly _tag: "Command"; readonly command: PlaybackCommand; readonly complete?: () => void }
  | { readonly _tag: "ManifestLoaded"; readonly playlistId: PlaylistId; readonly manifest: PlaylistManifest }
  | { readonly _tag: "ManifestFailed"; readonly playlistId: PlaylistId; readonly cause: unknown }
  | { readonly _tag: "PlaylistStartReady"; readonly generation: number; readonly playlist: PlaylistDefinition; readonly manifest: PlaylistManifest | null; readonly cause?: unknown }
  | { readonly _tag: "PlaylistPrepared"; readonly generation: number; readonly playlist: PlaylistDefinition; readonly entry: PlaylistEntry; readonly candidates: readonly StreamCandidate[]; readonly elapsed: number }
  | { readonly _tag: "PlaylistPrepareFailed"; readonly generation: number; readonly cause: unknown }
  | { readonly _tag: "PlaylistOpened"; readonly generation: number; readonly stream: AudioStreamPort; readonly baseElapsed: number; readonly usedRange: boolean }
  | { readonly _tag: "Opened"; readonly generation: number; readonly stream: AudioStreamPort }
  | { readonly _tag: "OpenFailed"; readonly generation: number; readonly cause: unknown; readonly usedRange?: boolean }
  | { readonly _tag: "BoundaryReady"; readonly generation: number; readonly playlist: PlaylistDefinition; readonly previousEntryId: string; readonly reason: BoundaryReason; readonly manifest: PlaylistManifest | null; readonly cause?: unknown }
  | { readonly _tag: "Metadata"; readonly generation: number; readonly metadata: ReturnType<AudioStreamPort["getMetadata"]> }
  | { readonly _tag: "Reconnecting"; readonly generation: number; readonly attempt: number; readonly maxRetries: number; readonly delayMs: number }
  | { readonly _tag: "Ended"; readonly generation: number }
  | { readonly _tag: "StreamError"; readonly generation: number; readonly cause: unknown }
  | { readonly _tag: "EngineError"; readonly generation: number; readonly cause: unknown }
  | { readonly _tag: "VolumeFailed"; readonly generation: number }
  | { readonly _tag: "Poll" };

export type StreamingAudioOptions = {
  readonly source?: AudiusSource;
  readonly cursorStore?: PlaylistCursorStore;
  readonly now?: () => number;
  readonly checkpointSeconds?: number;
  readonly streamOpenTimeoutMs?: number;
  readonly playlistRefreshIntervalMs?: number;
};

function clampVolume(volume: number) {
  return Math.round(Math.max(0, Math.min(1, volume)) * 100) / 100;
}

function statusFromStream(stream: AudioStreamPort): PlaybackStatus {
  switch (stream.getStats().state) {
    case "initializing": return "Connecting";
    case "buffering": return "Buffering";
    case "playing": return "Playing";
    case "reconnecting": return "Reconnecting";
    case "ended":
    case "errored":
    case "disposed": return "Error";
  }
}

function failureContext(evidence: unknown): { readonly action?: string; readonly status?: number } | undefined {
  if (typeof evidence !== "object" || evidence === null) return undefined;
  if ("context" in evidence && typeof evidence.context === "object" && evidence.context !== null) {
    return evidence.context as { readonly action?: string; readonly status?: number };
  }
  return evidence as { readonly action?: string; readonly status?: number };
}

function classifyStationFailure(station: StationIntegration, evidence: unknown, fallback: PlaybackFailure): PlaybackFailure {
  const providerCategory = station.classifyFailure?.(evidence);
  if (providerCategory) return providerCategory;
  const context = failureContext(evidence);
  const error = typeof evidence === "object" && evidence !== null && "error" in evidence ? evidence.error : evidence;
  const message = error instanceof Error ? error.message : String(error);
  if (/content.?type|unsupported.*stream|demux|decoder/i.test(message) || context?.status === 415) return "Unsupported stream";
  switch (context?.action) {
    case "fetch":
    case "response":
    case "source":
    case "end":
    case "restart": return "Station unavailable";
    case "demuxer":
    case "decoder": return "Unsupported stream";
    case "start": return "Playback device unavailable";
    default: return fallback;
  }
}

function playlistAttribution(entry: PlaylistEntry): Attribution {
  if (entry.artist && entry.title) return { _tag: "Known", artist: entry.artist, title: entry.title };
  if (entry.title) return { _tag: "Partial", title: entry.title };
  return unavailable;
}

function trackSnapshot(entry: PlaylistEntry): PlaybackTrack {
  return {
    entryId: entry.entryId,
    trackId: entry.trackId,
    artist: entry.artist,
    title: entry.title,
    audiusUrl: entry.audiusUrl,
    durationSeconds: entry.durationSeconds,
  };
}

function waitUpTo<A>(promise: Promise<A>, durationMs: number): Promise<A | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), durationMs);
    promise.then(
      (value) => { clearTimeout(timeout); resolve(value); },
      () => { clearTimeout(timeout); resolve(null); },
    );
  });
}

function openWithTimeout(operation: Promise<AudioStreamPort>, durationMs: number) {
  return new Promise<AudioStreamPort>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Audius stream open timed out after ${durationMs}ms`));
    }, durationMs);
    operation.then(
      (stream) => {
        if (settled) {
          stream.dispose();
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(stream);
      },
      (cause) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(cause);
      },
    );
  });
}

export function makeStreamingAudio(
  factory: AudioFactory,
  options: StreamingAudioOptions = {},
): Effect.Effect<StreamingAudioService, never, Scope.Scope> {
  return Effect.gen(function* () {
    const source = options.source ?? audiusSourceLive;
    const cursorStore = options.cursorStore ?? playlistCursorStoreLive;
    const now = options.now ?? Date.now;
    const checkpointSeconds = options.checkpointSeconds ?? 5;
    const streamOpenTimeoutMs = options.streamOpenTimeoutMs ?? 15_000;
    const playlistRefreshIntervalMs = options.playlistRefreshIntervalMs ?? 60_000;
    const state = yield* SubscriptionRef.make(initialPlaybackSnapshot);
    const queue = yield* Queue.unbounded<Message>();
    const manifests = new Map<PlaylistId, PlaylistManifest>();
    const failedEntries = new Map<PlaylistId, Set<string>>(playlistCatalog.map((playlist) => [playlist.id, new Set()]));
    let engine: ReturnType<AudioFactory["create"]> | null = null;
    let unsubscribeEngine: (() => void) | null = null;
    let lastEngineFailure: unknown;
    let generation = 0;
    let attempt: Attempt | null = null;
    let acceptingCommands = true;

    const setState = (changes: Partial<PlaybackSnapshot>) =>
      SubscriptionRef.update(state, (current) => ({ ...current, ...changes }));

    const effectiveEntries = (playlistId: PlaylistId, manifest: PlaylistManifest) => {
      const failed = failedEntries.get(playlistId);
      return manifest.entries.filter((entry) => !failed?.has(entry.entryId));
    };

    const playlistChoice = (playlist: PlaylistDefinition): PlaylistChoice => {
      const manifest = manifests.get(playlist.id);
      if (!manifest) return emptyPlaylistChoice(playlist);
      const entries = effectiveEntries(playlist.id, manifest);
      const availability = playlistAvailability(entries);
      return {
        _tag: "Playlist",
        id: playlist.id,
        name: playlist.name,
        provider: playlist.provider,
        genre: playlist.genre,
        available: availability.available,
        playableEntries: availability.playableEntries,
        playableDurationSeconds: availability.playableDurationSeconds,
        tracks: entries.map((entry) => ({
          entryId: entry.entryId,
          trackId: entry.trackId,
          artist: entry.artist,
          title: entry.title,
          durationSeconds: entry.durationSeconds,
        })),
      };
    };

    const updateDirectory = Effect.gen(function* () {
      const snapshot = yield* SubscriptionRef.get(state);
      const playlists = playlistCatalog.map(playlistChoice);
      const selected = snapshot.selected._tag === "Playlist"
        ? playlists.find((choice) => choice.id === snapshot.selected.id) ?? snapshot.selected
        : snapshot.selected;
      yield* setState({ selected, directory: { ...snapshot.directory, playlists } });
    });

    const clearAttempt = () => {
      if (!attempt) return;
      attempt.controller.abort();
      attempt.unsubscribe?.();
      attempt.stream?.dispose();
      attempt = null;
    };

    const elapsedFor = (playlistAttempt: PlaylistAttempt) => {
      const stats = playlistAttempt.stream?.getStats();
      if (!stats || stats.sampleRate <= 0) return playlistAttempt.baseElapsed;
      return Math.min(
        playlistAttempt.entry.durationSeconds,
        playlistAttempt.baseElapsed + Number(stats.framesPlayed) / stats.sampleRate,
      );
    };

    const saveCursor = (playlistAttempt: PlaylistAttempt, elapsed = elapsedFor(playlistAttempt)) => {
      const cursor: PlaylistCursor = {
        version: 1,
        playlistId: playlistAttempt.playlist.id,
        entryId: playlistAttempt.entry.entryId,
        trackId: playlistAttempt.entry.trackId,
        elapsedSeconds: elapsed,
        updatedAt: new Date(now()).toISOString(),
      };
      playlistAttempt.lastSavedElapsed = elapsed;
      return Effect.tryPromise(() => cursorStore.save(cursor)).pipe(
        Effect.catchAll((cause) => Effect.logError("Could not save Playlist cursor", cause)),
      );
    };

    const saveEntryPosition = (playlist: PlaylistDefinition, entry: PlaylistEntry, elapsedSeconds: number) => Effect.tryPromise(() => cursorStore.save({
      version: 1,
      playlistId: playlist.id,
      entryId: entry.entryId,
      trackId: entry.trackId,
      elapsedSeconds,
      updatedAt: new Date(now()).toISOString(),
    })).pipe(Effect.catchAll((cause) => Effect.logError("Could not save Playlist cursor", cause)));
    const saveEntryStart = (playlist: PlaylistDefinition, entry: PlaylistEntry) => saveEntryPosition(playlist, entry, 0);

    const skipInactive = (playlist: PlaylistDefinition): Effect.Effect<void> => Effect.gen(function* () {
      const refreshed = yield* Effect.tryPromise(() => source.refresh(playlist, AbortSignal.timeout(45_000))).pipe(
        Effect.match({
          onFailure: () => null,
          onSuccess: (manifest) => manifest,
        }),
      );
      if (refreshed) {
        manifests.set(playlist.id, refreshed);
        failedEntries.get(playlist.id)?.clear();
        yield* updateDirectory;
      }
      const manifest = manifests.get(playlist.id);
      if (!manifest) return;
      const entries = effectiveEntries(playlist.id, manifest);
      if (entries.length === 0) return;
      const cursor = yield* Effect.tryPromise(() => cursorStore.load(playlist.id)).pipe(Effect.orElseSucceed(() => null));
      const currentIndex = cursor ? entries.findIndex((entry) => entry.entryId === cursor.entryId) : 0;
      const nextEntry = cursor && currentIndex < 0
        ? entries[0]!
        : entries[(currentIndex + 1) % entries.length]!;
      yield* saveEntryStart(playlist, nextEntry);
      yield* setState({
        track: trackSnapshot(nextEntry),
        attribution: playlistAttribution(nextEntry),
        reconnect: null,
        failure: null,
        positionSeconds: 0,
      });
    });

    const fail = (failure: PlaybackFailure, diagnostic?: unknown) => Effect.gen(function* () {
      clearAttempt();
      engine?.stop();
      if (diagnostic !== undefined) yield* Effect.logError("Streaming audio failure", diagnostic);
      yield* setState({ status: "Error", reconnect: null, failure, spectrum: Array<number>(24).fill(0) });
    });

    const renewEngineErrorSubscription = () => {
      if (!engine) return;
      unsubscribeEngine?.();
      const engineGeneration = generation;
      unsubscribeEngine = engine.subscribeError((cause) => {
        lastEngineFailure = cause;
        queue.unsafeOffer({ _tag: "EngineError", generation: engineGeneration, cause });
      });
    };

    const ensureEngine = (): Effect.Effect<boolean> => Effect.gen(function* () {
      if (!engine) {
        try {
          engine = factory.create();
        } catch (cause) {
          yield* fail("Audio playback failed", cause);
          return false;
        }
      }
      if (engine.playbackAvailable === false) {
        yield* fail("Playback device unavailable");
        return false;
      }
      renewEngineErrorSubscription();
      lastEngineFailure = undefined;
      if (!engine.start()) {
        yield* fail("Playback device unavailable", lastEngineFailure ?? new Error("Audio output device did not start"));
        return false;
      }
      return true;
    });

    const subscribeStream = (stream: AudioStreamPort, currentGeneration: number) => stream.subscribe({
      metadata: (metadata) => queue.unsafeOffer({ _tag: "Metadata", generation: currentGeneration, metadata }),
      reconnecting: (event) => queue.unsafeOffer({ _tag: "Reconnecting", generation: currentGeneration, ...event }),
      ended: () => queue.unsafeOffer({ _tag: "Ended", generation: currentGeneration }),
      error: (cause) => queue.unsafeOffer({ _tag: "StreamError", generation: currentGeneration, cause }),
    });

    const beginStation = (station: StationIntegration): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function* () {
      generation += 1;
      clearAttempt();
      yield* setState({ status: "Connecting", track: null, attribution: unavailable, reconnect: null, failure: null, positionSeconds: 0 });
      if (!(yield* ensureEngine())) return;
      const currentGeneration = generation;
      const controller = new AbortController();
      const snapshot = yield* SubscriptionRef.get(state);
      const opening = Promise.resolve().then(() => engine!.playStreamUrl(station.stream.url, {
        format: station.stream.format,
        contentTypePolicy: station.stream.contentTypePolicy,
        signal: controller.signal,
        volume: snapshot.volume,
        reconnect: { maxRetries: 5, initialDelayMs: 1_000, maxDelayMs: 15_000, backoffFactor: 2, retryOnEnd: true },
      }));
      attempt = {
        kind: "Station",
        generation: currentGeneration,
        controller,
        station,
        opening,
        stream: null,
        unsubscribe: null,
        lastFailure: undefined,
      };
      yield* Effect.forkScoped(Effect.tryPromise({ try: () => opening, catch: (cause) => cause }).pipe(
        Effect.matchEffect({
          onFailure: (cause) => queue.offer({ _tag: "OpenFailed", generation: currentGeneration, cause }),
          onSuccess: (stream) => queue.offer({ _tag: "Opened", generation: currentGeneration, stream }),
        }),
      ));
    });

    const openPlaylistCandidate = (playlistAttempt: PlaylistAttempt, forceStart = false) => {
      const candidate = playlistAttempt.candidates[playlistAttempt.candidateIndex];
      if (!candidate || !engine) {
        queue.unsafeOffer({ _tag: "OpenFailed", generation: playlistAttempt.generation, cause: new Error("No stream candidates") });
        return;
      }
      const requestedElapsed = forceStart ? 0 : playlistAttempt.requestedElapsed;
      let usedRange = false;
      const opening = (async () => {
        let offset: number | null = null;
        if (requestedElapsed > 0) {
          try {
            offset = await source.getResumeOffset(candidate, playlistAttempt.entry, requestedElapsed, playlistAttempt.controller.signal);
          } catch {
            offset = null;
          }
        }
        usedRange = offset !== null && offset > 0;
        const snapshot = await Effect.runPromise(SubscriptionRef.get(state));
        const stream = await openWithTimeout(engine!.playStreamUrl(candidate.url, {
          format: "mp3",
          contentTypePolicy: "validate",
          request: usedRange ? { headers: { Range: `bytes=${offset}-` } } : undefined,
          signal: AbortSignal.any([
            playlistAttempt.controller.signal,
            AbortSignal.timeout(streamOpenTimeoutMs),
          ]),
          volume: snapshot.volume,
        }), streamOpenTimeoutMs);
        return { stream, baseElapsed: usedRange ? requestedElapsed : 0, usedRange };
      })();
      playlistAttempt.opening = opening.then(
        ({ stream }) => stream,
        () => null,
      );
      opening.then(
        ({ stream, baseElapsed, usedRange }) => {
          if (!acceptingCommands) stream.dispose();
          else queue.unsafeOffer({
            _tag: "PlaylistOpened",
            generation: playlistAttempt.generation,
            stream,
            baseElapsed,
            usedRange,
          });
        },
        (cause) => queue.unsafeOffer({
          _tag: "OpenFailed",
          generation: playlistAttempt.generation,
          cause,
          usedRange,
        }),
      );
    };

    const prepareEntry = (
      playlist: PlaylistDefinition,
      entry: PlaylistEntry,
      elapsed: number,
      currentGeneration: number,
      controller: AbortController,
    ) => Effect.forkScoped(Effect.tryPromise({
      try: () => source.getStreamCandidates(entry, controller.signal),
      catch: (cause) => cause,
    }).pipe(Effect.matchEffect({
      onFailure: (cause) => queue.offer({ _tag: "PlaylistPrepareFailed", generation: currentGeneration, cause }),
      onSuccess: (candidates) => queue.offer({
        _tag: "PlaylistPrepared",
        generation: currentGeneration,
        playlist,
        entry,
        candidates,
        elapsed,
      }),
    })));

    const selectPlaylistEntry = (
      playlist: PlaylistDefinition,
      entry: PlaylistEntry,
      previousStatus: PlaybackStatus,
      elapsedSeconds = 0,
    ): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function* () {
      const active = ["Connecting", "Buffering", "Playing", "Reconnecting"].includes(previousStatus);
      generation += 1;
      clearAttempt();
      engine?.stop();
      yield* saveEntryPosition(playlist, entry, elapsedSeconds);
      yield* setState({
        selected: playlistChoice(playlist),
        track: trackSnapshot(entry),
        attribution: playlistAttribution(entry),
        status: active ? "Connecting" : previousStatus,
        reconnect: null,
        failure: null,
        spectrum: Array<number>(24).fill(0),
        positionSeconds: elapsedSeconds,
      });
      if (!active || !(yield* ensureEngine())) return;
      const controller = new AbortController();
      yield* prepareEntry(playlist, entry, elapsedSeconds, generation, controller);
    });

    const startPlaylistFromManifest = (
      playlist: PlaylistDefinition,
      currentGeneration: number,
      controller: AbortController,
    ): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function* () {
      const manifest = manifests.get(playlist.id);
      const entries = manifest ? effectiveEntries(playlist.id, manifest) : [];
      const choice = playlistChoice(playlist);
      if (!manifest || !choice.available || entries.length === 0) {
        yield* fail("Playlist unavailable");
        return;
      }
      yield* Effect.forkScoped(Effect.tryPromise(async () => {
        const cursor = await cursorStore.load(playlist.id);
        const restored = cursor ? entries.find((entry) => entry.entryId === cursor.entryId) : undefined;
        const entry = restored ?? entries[0]!;
        const elapsed = restored && cursor && cursor.elapsedSeconds < entry.durationSeconds ? cursor.elapsedSeconds : 0;
        const candidates = await source.getStreamCandidates(entry, controller.signal);
        return { entry, elapsed, candidates };
      }).pipe(Effect.matchEffect({
        onFailure: (cause) => queue.offer({ _tag: "PlaylistPrepareFailed", generation: currentGeneration, cause }),
        onSuccess: ({ entry, elapsed, candidates }) => queue.offer({
          _tag: "PlaylistPrepared",
          generation: currentGeneration,
          playlist,
          entry,
          candidates,
          elapsed,
        }),
      })));
    });

    const beginPlaylist = (playlist: PlaylistDefinition): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function* () {
      generation += 1;
      clearAttempt();
      yield* setState({ status: "Connecting", track: null, attribution: unavailable, reconnect: null, failure: null, positionSeconds: 0 });
      const manifest = manifests.get(playlist.id);
      if (!manifest) {
        yield* fail("Playlist unavailable");
        return;
      }
      if (!(yield* ensureEngine())) return;
      const currentGeneration = generation;
      const controller = new AbortController();
      if (playlistChoice(playlist).available && now() - manifest.fetchedAt < 60_000) {
        yield* startPlaylistFromManifest(playlist, currentGeneration, controller);
        return;
      }
      yield* Effect.forkScoped(Effect.tryPromise({
        try: () => source.refresh(playlist, controller.signal),
        catch: (cause) => cause,
      }).pipe(Effect.matchEffect({
        onFailure: (cause) => queue.offer({
          _tag: "PlaylistStartReady",
          generation: currentGeneration,
          playlist,
          manifest: null,
          cause,
        }),
        onSuccess: (refreshed) => queue.offer({
          _tag: "PlaylistStartReady",
          generation: currentGeneration,
          playlist,
          manifest: refreshed,
        }),
      })));
    });

    const beginSelected = (): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function* () {
      const snapshot = yield* SubscriptionRef.get(state);
      if (snapshot.selected._tag === "Station") {
        const station = stationCatalog.resolve(snapshot.selected.id);
        if (station) yield* beginStation(station);
        else yield* fail("Station unavailable");
      } else {
        const playlist = resolvePlaylist(snapshot.selected.id);
        if (playlist) yield* beginPlaylist(playlist);
        else yield* fail("Playlist unavailable");
      }
    });

    const beginBoundary = (playlistAttempt: PlaylistAttempt, reason: BoundaryReason): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function* () {
      yield* saveCursor(playlistAttempt);
      const playlist = playlistAttempt.playlist;
      const previousEntryId = playlistAttempt.entry.entryId;
      generation += 1;
      clearAttempt();
      renewEngineErrorSubscription();
      const currentGeneration = generation;
      const controller = new AbortController();
      yield* setState({ status: reason === "failed" ? "Reconnecting" : "Connecting", reconnect: null, failure: null, positionSeconds: 0 });
      yield* Effect.forkScoped(Effect.tryPromise({
        try: () => source.refresh(playlist, controller.signal),
        catch: (cause) => cause,
      }).pipe(Effect.matchEffect({
        onFailure: (cause) => queue.offer({
          _tag: "BoundaryReady",
          generation: currentGeneration,
          playlist,
          previousEntryId,
          reason,
          manifest: null,
          cause,
        }),
        onSuccess: (manifest) => queue.offer({
          _tag: "BoundaryReady",
          generation: currentGeneration,
          playlist,
          previousEntryId,
          reason,
          manifest,
        }),
      })));
    });

    const handle = (message: Message): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function* () {
      switch (message._tag) {
        case "Command": {
          const complete = message.complete ?? (() => {});
          switch (message.command._tag) {
            case "Select": {
              const snapshot = yield* SubscriptionRef.get(state);
              const station = message.command.choice._tag === "Station"
                ? stationCatalog.resolve(message.command.choice.id)
                : undefined;
              const playlist = message.command.choice._tag === "Playlist"
                ? resolvePlaylist(message.command.choice.id)
                : undefined;
              const next = station ? stationChoice(station) : playlist ? playlistChoice(playlist) : null;
              if (!next || !next.available || (next._tag === snapshot.selected._tag && next.id === snapshot.selected.id)) {
                complete();
                return;
              }
              const wasActive = ["Connecting", "Buffering", "Playing", "Reconnecting"].includes(snapshot.status);
              if (attempt?.kind === "Playlist") yield* saveCursor(attempt);
              generation += 1;
              clearAttempt();
              engine?.stop();
              yield* setState({
                selected: next,
                track: null,
                attribution: unavailable,
                reconnect: null,
                failure: null,
                status: wasActive ? "Connecting" : snapshot.status,
                spectrum: Array<number>(24).fill(0),
                positionSeconds: 0,
              });
              if (wasActive) yield* beginSelected();
              complete();
              return;
            }
            case "Play":
              yield* beginSelected();
              complete();
              return;
            case "Pause": {
              const snapshot = yield* SubscriptionRef.get(state);
              if (["Stopped", "Paused", "Error"].includes(snapshot.status)) {
                complete();
                return;
              }
              const positionSeconds = attempt?.kind === "Playlist" ? elapsedFor(attempt) : 0;
              if (attempt?.kind === "Playlist") yield* saveCursor(attempt, positionSeconds);
              const playlistPaused = snapshot.selected._tag === "Playlist";
              generation += 1;
              clearAttempt();
              engine?.stop();
              yield* setState({
                status: "Paused",
                track: playlistPaused ? snapshot.track : null,
                attribution: playlistPaused ? snapshot.attribution : unavailable,
                reconnect: null,
                failure: null,
                spectrum: Array<number>(24).fill(0),
                positionSeconds,
              });
              complete();
              return;
            }
            case "Previous": {
              const snapshot = yield* SubscriptionRef.get(state);
              if (snapshot.selected._tag !== "Playlist") {
                complete();
                return;
              }
              const playlist = resolvePlaylist(snapshot.selected.id);
              const manifest = playlist ? manifests.get(playlist.id) : undefined;
              const entries = manifest ? effectiveEntries(snapshot.selected.id, manifest) : [];
              if (!playlist || entries.length === 0) {
                complete();
                return;
              }
              if (attempt?.kind === "Playlist") yield* saveCursor(attempt);
              const cursor = snapshot.track ? null : yield* Effect.tryPromise(() => cursorStore.load(playlist.id)).pipe(Effect.orElseSucceed(() => null));
              const entryId = snapshot.track?.entryId ?? cursor?.entryId;
              const currentIndex = entryId ? entries.findIndex((entry) => entry.entryId === entryId) : 0;
              const previousIndex = currentIndex <= 0 ? entries.length - 1 : currentIndex - 1;
              yield* selectPlaylistEntry(playlist, entries[previousIndex]!, snapshot.status);
              complete();
              return;
            }
            case "Skip":
              if (attempt?.kind === "Playlist") {
                yield* beginBoundary(attempt, "skipped");
              } else {
                const snapshot = yield* SubscriptionRef.get(state);
                if (snapshot.selected._tag === "Playlist" && ["Stopped", "Paused"].includes(snapshot.status)) {
                  const playlist = resolvePlaylist(snapshot.selected.id);
                  if (playlist) yield* skipInactive(playlist);
                }
              }
              complete();
              return;
            case "SelectTrack": {
              const snapshot = yield* SubscriptionRef.get(state);
              const { playlistId, entryId } = message.command;
              const playlist = resolvePlaylist(playlistId);
              const manifest = playlist ? manifests.get(playlist.id) : undefined;
              const entry = manifest
                ? effectiveEntries(playlistId, manifest).find((candidate) => candidate.entryId === entryId)
                : undefined;
              if (!playlist || !entry) {
                complete();
                return;
              }
              if (attempt?.kind === "Playlist") yield* saveCursor(attempt);
              yield* selectPlaylistEntry(playlist, entry, snapshot.status);
              complete();
              return;
            }
            case "Seek": {
              const snapshot = yield* SubscriptionRef.get(state);
              if (snapshot.selected._tag !== "Playlist" || !snapshot.track) {
                complete();
                return;
              }
              const playlist = resolvePlaylist(snapshot.selected.id);
              const manifest = playlist ? manifests.get(playlist.id) : undefined;
              const entryId = snapshot.track.entryId;
              const entry = manifest
                ? effectiveEntries(snapshot.selected.id, manifest).find((candidate) => candidate.entryId === entryId)
                : undefined;
              if (!playlist || !entry) {
                complete();
                return;
              }
              const positionSeconds = Math.max(0, Math.min(Math.max(0, entry.durationSeconds - 0.1), message.command.positionSeconds));
              yield* selectPlaylistEntry(playlist, entry, snapshot.status, positionSeconds);
              complete();
              return;
            }
            case "SetVolume": {
              const volume = clampVolume(message.command.volume);
              if (attempt?.stream && !attempt.stream.setVolume(volume)) {
                const currentGeneration = attempt.generation;
                yield* Effect.forkScoped(Effect.sleep("10 millis").pipe(
                  Effect.andThen(Queue.offer(queue, { _tag: "VolumeFailed", generation: currentGeneration })),
                ));
                complete();
                return;
              }
              yield* setState({ volume });
              complete();
              return;
            }
          }
        }
        case "ManifestLoaded":
          manifests.set(message.playlistId, message.manifest);
          failedEntries.get(message.playlistId)?.clear();
          yield* updateDirectory;
          return;
        case "ManifestFailed":
          yield* Effect.logWarning(`Could not refresh ${message.playlistId} Playlist`, message.cause);
          return;
        case "PlaylistStartReady": {
          if (message.generation !== generation) return;
          if (message.manifest) {
            manifests.set(message.playlist.id, message.manifest);
            failedEntries.get(message.playlist.id)?.clear();
            yield* updateDirectory;
          } else if (message.cause) {
            yield* Effect.logWarning(`Could not refresh ${message.playlist.name} before playback`, message.cause);
          }
          yield* startPlaylistFromManifest(message.playlist, message.generation, new AbortController());
          return;
        }
        case "PlaylistPrepared": {
          if (message.generation !== generation) return;
          if (message.candidates.length === 0) {
            yield* fail("Playlist unavailable", new Error("Audius returned no stream candidates"));
            return;
          }
          const controller = new AbortController();
          attempt = {
            kind: "Playlist",
            generation: message.generation,
            controller,
            playlist: message.playlist,
            entry: message.entry,
            candidates: message.candidates,
            candidateIndex: 0,
            requestedElapsed: message.elapsed,
            baseElapsed: message.elapsed,
            lastSavedElapsed: message.elapsed,
            usedRange: false,
            opening: null,
            stream: null,
            unsubscribe: null,
            lastFailure: undefined,
          };
          yield* setState({
            track: trackSnapshot(message.entry),
            attribution: playlistAttribution(message.entry),
            positionSeconds: message.elapsed,
          });
          openPlaylistCandidate(attempt);
          return;
        }
        case "PlaylistPrepareFailed":
          if (message.generation === generation) yield* fail("Playlist unavailable", message.cause);
          return;
        case "Opened": {
          if (!attempt || attempt.kind !== "Station" || message.generation !== generation) {
            message.stream.dispose();
            return;
          }
          attempt.stream = message.stream;
          attempt.unsubscribe = subscribeStream(message.stream, message.generation);
          const status = statusFromStream(message.stream);
          yield* setState({
            status,
            attribution: status === "Playing" ? attempt.station.normalizeMetadata(message.stream.getMetadata()) : unavailable,
          });
          return;
        }
        case "PlaylistOpened": {
          if (!attempt || attempt.kind !== "Playlist" || message.generation !== generation) {
            message.stream.dispose();
            return;
          }
          attempt.stream = message.stream;
          attempt.baseElapsed = message.baseElapsed;
          attempt.lastSavedElapsed = message.baseElapsed;
          attempt.usedRange = message.usedRange;
          attempt.unsubscribe = subscribeStream(message.stream, message.generation);
          if (attempt.requestedElapsed > 0 && !message.usedRange) yield* saveCursor(attempt, 0);
          yield* setState({
            status: statusFromStream(message.stream),
            reconnect: null,
            failure: null,
            positionSeconds: message.baseElapsed,
          });
          return;
        }
        case "OpenFailed": {
          if (message.generation !== generation || !attempt || attempt.controller.signal.aborted) return;
          if (attempt.kind === "Station") {
            yield* fail(classifyStationFailure(attempt.station, message.cause, "Station unavailable"), message.cause);
            return;
          }
          attempt.lastFailure = message.cause;
          if (message.usedRange) {
            attempt.requestedElapsed = 0;
            yield* saveCursor(attempt, 0);
            openPlaylistCandidate(attempt, true);
            return;
          }
          attempt.candidateIndex += 1;
          if (attempt.candidateIndex < attempt.candidates.length) {
            yield* setState({
              status: "Reconnecting",
              reconnect: { attempt: attempt.candidateIndex + 1, maxRetries: attempt.candidates.length, delayMs: 0 },
              failure: "Track recovery in progress",
            });
            openPlaylistCandidate(attempt);
            return;
          }
          failedEntries.get(attempt.playlist.id)?.add(attempt.entry.entryId);
          yield* updateDirectory;
          if (!playlistChoice(attempt.playlist).available) {
            yield* fail("Playlist unavailable", message.cause);
            return;
          }
          yield* beginBoundary(attempt, "failed");
          return;
        }
        case "BoundaryReady": {
          if (message.generation !== generation) return;
          if (message.manifest) {
            manifests.set(message.playlist.id, message.manifest);
            failedEntries.get(message.playlist.id)?.clear();
          } else if (message.cause) {
            yield* Effect.logWarning(`Could not refresh ${message.playlist.name} at track boundary`, message.cause);
          }
          yield* updateDirectory;
          const manifest = manifests.get(message.playlist.id);
          const entries = manifest ? effectiveEntries(message.playlist.id, manifest) : [];
          if (!manifest || !playlistChoice(message.playlist).available || entries.length === 0) {
            yield* fail("Playlist unavailable", message.cause);
            return;
          }
          const previousIndex = entries.findIndex((entry) => entry.entryId === message.previousEntryId);
          const nextEntry = previousIndex < 0 ? entries[0]! : entries[(previousIndex + 1) % entries.length]!;
          yield* saveEntryStart(message.playlist, nextEntry);
          const controller = new AbortController();
          yield* prepareEntry(message.playlist, nextEntry, 0, generation, controller);
          return;
        }
        case "Metadata":
          if (message.generation === generation && attempt?.kind === "Station") {
            const snapshot = yield* SubscriptionRef.get(state);
            if (snapshot.status === "Playing") yield* setState({ attribution: attempt.station.normalizeMetadata(message.metadata) });
          }
          return;
        case "Reconnecting":
          if (message.generation === generation && attempt?.kind === "Station") {
            yield* setState({
              status: "Reconnecting",
              attribution: unavailable,
              reconnect: { attempt: message.attempt, maxRetries: message.maxRetries, delayMs: message.delayMs },
            });
          }
          return;
        case "Ended":
          if (message.generation !== generation || !attempt) return;
          if (attempt.kind === "Station") yield* fail("Station unavailable", new Error("Station stream ended"));
          else yield* beginBoundary(attempt, "completed");
          return;
        case "StreamError":
          if (message.generation !== generation || !attempt) return;
          if (attempt.kind === "Station") {
            yield* fail(classifyStationFailure(attempt.station, message.cause, "Audio playback failed"), message.cause);
          } else {
            const elapsed = elapsedFor(attempt);
            yield* saveCursor(attempt, elapsed);
            attempt.unsubscribe?.();
            attempt.stream?.dispose();
            attempt.stream = null;
            if (attempt.usedRange && failureContext(message.cause)?.action === "decoder") {
              attempt.requestedElapsed = 0;
              attempt.baseElapsed = 0;
              attempt.usedRange = false;
              yield* saveCursor(attempt, 0);
              openPlaylistCandidate(attempt, true);
              return;
            }
            attempt.requestedElapsed = elapsed;
            attempt.candidateIndex += 1;
            if (attempt.candidateIndex < attempt.candidates.length) {
              yield* setState({
                status: "Reconnecting",
                reconnect: { attempt: attempt.candidateIndex + 1, maxRetries: attempt.candidates.length, delayMs: 0 },
                failure: "Track recovery in progress",
              });
              openPlaylistCandidate(attempt);
            } else {
              failedEntries.get(attempt.playlist.id)?.add(attempt.entry.entryId);
              yield* updateDirectory;
              if (!playlistChoice(attempt.playlist).available) yield* fail("Playlist unavailable", message.cause);
              else yield* beginBoundary(attempt, "failed");
            }
          }
          return;
        case "EngineError":
          if (message.generation !== generation) return;
          if (attempt?.kind === "Station") yield* fail(classifyStationFailure(attempt.station, message.cause, "Audio playback failed"), message.cause);
          else if (attempt?.kind === "Playlist") yield* fail("Audio playback failed", message.cause);
          return;
        case "VolumeFailed":
          if (message.generation === generation && attempt) yield* fail("Audio playback failed", attempt.lastFailure ?? new Error("Native stream volume update failed"));
          return;
        case "Poll":
          if (!attempt?.stream) return;
          const status = statusFromStream(attempt.stream);
          if (status === "Error") {
            if (attempt.stream.getStats().state === "ended") {
              queue.unsafeOffer({ _tag: "Ended", generation: attempt.generation });
            } else {
              queue.unsafeOffer({ _tag: "StreamError", generation: attempt.generation, cause: new Error("Audio stream entered an error state") });
            }
            return;
          }
          const snapshot = yield* SubscriptionRef.get(state);
          const spectrum = status === "Playing"
            ? engine?.readSpectrum?.(24) ?? snapshot.spectrum
            : Array<number>(24).fill(0);
          const positionSeconds = attempt.kind === "Playlist" ? elapsedFor(attempt) : 0;
          const spectrumChanged = spectrum.some((value, index) => Math.abs(value - (snapshot.spectrum[index] ?? 0)) > 0.01);
          const positionChanged = Math.abs(positionSeconds - snapshot.positionSeconds) >= 0.05;
          if (status !== snapshot.status || spectrumChanged || positionChanged) {
            yield* setState({
              status,
              spectrum,
              positionSeconds,
              reconnect: status === "Reconnecting" ? snapshot.reconnect : null,
              attribution: attempt.kind === "Station"
                ? status === "Playing" ? attempt.station.normalizeMetadata(attempt.stream.getMetadata()) : unavailable
                : playlistAttribution(attempt.entry),
            });
          }
          if (attempt.kind === "Playlist" && status === "Playing") {
            const elapsed = elapsedFor(attempt);
            if (elapsed - attempt.lastSavedElapsed >= checkpointSeconds) yield* saveCursor(attempt, elapsed);
          }
          return;
      }
    });

    yield* Effect.addFinalizer(() => Effect.gen(function* () {
      acceptingCommands = false;
      if (attempt?.kind === "Playlist") yield* saveCursor(attempt);
      generation += 1;
      const closingAttempt = attempt;
      clearAttempt();
      yield* Queue.shutdown(queue);
      if (closingAttempt?.opening) {
        yield* Effect.tryPromise(async () => {
          const stream = closingAttempt.stream ?? await waitUpTo(closingAttempt.opening!, 1_000);
          if (!stream) return;
          stream.dispose();
          await waitUpTo(stream.closed, 1_000);
        }).pipe(Effect.ignore);
      }
      unsubscribeEngine?.();
      engine?.dispose();
    }));

    yield* Effect.forkScoped(Effect.forever(Queue.take(queue).pipe(Effect.flatMap(handle))));
    yield* Effect.forkScoped(Effect.forever(Effect.sleep("100 millis").pipe(Effect.andThen(Queue.offer(queue, { _tag: "Poll" })))));
    const refreshManifest = (playlist: PlaylistDefinition) => Effect.tryPromise({
        try: () => source.refresh(playlist, new AbortController().signal),
        catch: (cause) => cause,
      }).pipe(Effect.matchEffect({
        onFailure: (cause) => queue.offer({ _tag: "ManifestFailed", playlistId: playlist.id, cause }),
        onSuccess: (manifest) => queue.offer({ _tag: "ManifestLoaded", playlistId: playlist.id, manifest }),
      }));
    for (const playlist of playlistCatalog) {
      yield* Effect.forkScoped(refreshManifest(playlist));
    }
    yield* Effect.forkScoped(Effect.forever(
      Effect.sleep(`${playlistRefreshIntervalMs} millis`).pipe(
        Effect.andThen(Effect.suspend(() => Effect.forEach(
          playlistCatalog.filter((playlist) => !playlistChoice(playlist).available),
          refreshManifest,
          { concurrency: "unbounded" },
        ))),
      ),
    ));

    return {
      state,
      dispatch: (command) => Effect.sync(() => {
        if (acceptingCommands) queue.unsafeOffer({ _tag: "Command", command });
      }),
      dispatchAndWait: (command) => Effect.async<void>((resume) => {
        if (!acceptingCommands) {
          resume(Effect.void);
          return;
        }
        queue.unsafeOffer({ _tag: "Command", command, complete: () => resume(Effect.void) });
      }),
    };
  });
}

export const StreamingAudioLive = Layer.scoped(StreamingAudio, makeStreamingAudio(openTuiAudioFactory));
