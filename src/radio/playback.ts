import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Scope from "effect/Scope";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { openTuiAudioFactory, type AudioFactory, type AudioStreamPort } from "./audio-port";
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

export type PlaybackFailure = PlaybackFailureCategory;

export type PlaybackSnapshot = {
  readonly station: Pick<StationIntegration, "id" | "name" | "provider" | "genre">;
  readonly status: PlaybackStatus;
  readonly volume: number;
  readonly attribution: Attribution;
  readonly reconnect: { readonly attempt: number; readonly maxRetries: number; readonly delayMs: number } | null;
  readonly failure: PlaybackFailure | null;
};

export type PlaybackCommand = Data.TaggedEnum<{
  Play: {};
  Pause: {};
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

export const initialPlaybackSnapshot: PlaybackSnapshot = {
  station: defaultStation,
  status: "Stopped",
  volume: 0.6,
  attribution: unavailable,
  reconnect: null,
  failure: null,
};

type Attempt = {
  readonly generation: number;
  readonly controller: AbortController;
  readonly station: StationIntegration;
  readonly opening: Promise<AudioStreamPort>;
  stream: AudioStreamPort | null;
  unsubscribe: (() => void) | null;
  lastFailure: unknown;
};

type Message =
  | { readonly _tag: "Command"; readonly command: PlaybackCommand; readonly complete?: () => void }
  | { readonly _tag: "Opened"; readonly generation: number; readonly stream: AudioStreamPort }
  | { readonly _tag: "OpenFailed"; readonly generation: number; readonly cause: unknown }
  | { readonly _tag: "Metadata"; readonly generation: number; readonly metadata: ReturnType<AudioStreamPort["getMetadata"]> }
  | { readonly _tag: "Reconnecting"; readonly generation: number; readonly attempt: number; readonly maxRetries: number; readonly delayMs: number }
  | { readonly _tag: "Ended"; readonly generation: number }
  | { readonly _tag: "StreamError"; readonly generation: number; readonly cause: unknown }
  | { readonly _tag: "EngineError"; readonly cause: unknown }
  | { readonly _tag: "VolumeFailed"; readonly generation: number }
  | { readonly _tag: "Poll" };

function clampVolume(volume: number) {
  return Math.round(Math.max(0, Math.min(1, volume)) * 100) / 100;
}

function waitUpTo<A>(promise: Promise<A>, durationMs: number): Promise<A | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), durationMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      () => {
        clearTimeout(timeout);
        resolve(null);
      },
    );
  });
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

function classifyFailure(
  station: StationIntegration,
  evidence: unknown,
  fallback: PlaybackFailure,
): PlaybackFailure {
  const providerCategory = station.classifyFailure?.(evidence);
  if (providerCategory) return providerCategory;

  const context = failureContext(evidence);
  const error = typeof evidence === "object" && evidence !== null && "error" in evidence
    ? evidence.error
    : evidence;
  const message = error instanceof Error ? error.message : String(error);
  if (/content.?type|unsupported.*stream|demux|decoder/i.test(message) || context?.status === 415) {
    return "Unsupported stream";
  }

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

export function makeStreamingAudio(factory: AudioFactory): Effect.Effect<StreamingAudioService, never, Scope.Scope> {
  return Effect.gen(function* () {
    const state = yield* SubscriptionRef.make(initialPlaybackSnapshot);
    const queue = yield* Queue.unbounded<Message>();
    let engine: ReturnType<AudioFactory["create"]> | null = null;
    let unsubscribeEngine: (() => void) | null = null;
    let lastEngineFailure: unknown;
    let generation = 0;
    let attempt: Attempt | null = null;
    let acceptingCommands = true;

    const setState = (changes: Partial<PlaybackSnapshot>) =>
      SubscriptionRef.update(state, (current) => ({ ...current, ...changes }));

    const clearAttempt = () => {
      if (!attempt) return;
      attempt.controller.abort();
      attempt.unsubscribe?.();
      attempt.stream?.dispose();
      attempt = null;
    };

    const fail = (failure: PlaybackFailure, diagnostic?: unknown) => Effect.gen(function* () {
      clearAttempt();
      engine?.stop();
      if (diagnostic !== undefined) yield* Effect.logError("Streaming audio failure", diagnostic);
      yield* setState({ status: "Error", attribution: unavailable, reconnect: null, failure });
    });

    const handle = (message: Message): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function* () {
      switch (message._tag) {
        case "Command": {
          const complete = message.complete ?? (() => {});
          switch (message.command._tag) {
            case "Play": {
              generation += 1;
              clearAttempt();
              yield* setState({ status: "Connecting", attribution: unavailable, reconnect: null, failure: null });
              const selected = yield* SubscriptionRef.get(state);
              const station = stationCatalog.resolve(selected.station.id);
              if (!station) {
                yield* fail("Station unavailable", new Error(`Unknown Station: ${selected.station.id}`));
                complete();
                return;
              }

              if (!engine) {
                try {
                  engine = factory.create();
                  unsubscribeEngine = engine.subscribeError((cause) => {
                    lastEngineFailure = cause;
                    queue.unsafeOffer({ _tag: "EngineError", cause });
                  });
                } catch (cause) {
                  yield* fail("Audio playback failed", cause);
                  complete();
                  return;
                }
              }

              lastEngineFailure = undefined;
              if (!engine.start()) {
                yield* fail(
                  "Playback device unavailable",
                  lastEngineFailure ?? new Error("Audio output device did not start"),
                );
                complete();
                return;
              }

              const currentGeneration = generation;
              const controller = new AbortController();
              const snapshot = yield* SubscriptionRef.get(state);
              const opening = Promise.resolve().then(() => engine!.playStreamUrl(station.stream.url, {
                format: station.stream.format,
                contentTypePolicy: station.stream.contentTypePolicy,
                signal: controller.signal,
                volume: snapshot.volume,
                reconnect: {
                  maxRetries: 5,
                  initialDelayMs: 1_000,
                  maxDelayMs: 15_000,
                  backoffFactor: 2,
                  retryOnEnd: true,
                },
              }));
              attempt = {
                generation: currentGeneration,
                controller,
                station,
                opening,
                stream: null,
                unsubscribe: null,
                lastFailure: undefined,
              };
              yield* Effect.forkScoped(
                Effect.tryPromise({
                  try: () => opening,
                  catch: (cause) => cause,
                }).pipe(
                  Effect.matchEffect({
                    onFailure: (cause) => queue.offer({ _tag: "OpenFailed", generation: currentGeneration, cause }),
                    onSuccess: (stream) => queue.offer({ _tag: "Opened", generation: currentGeneration, stream }),
                  }),
                ),
              );
              complete();
              return;
            }
            case "Pause": {
              const snapshot = yield* SubscriptionRef.get(state);
              if (snapshot.status === "Stopped" || snapshot.status === "Paused" || snapshot.status === "Error") {
                complete();
                return;
              }
              generation += 1;
              clearAttempt();
              engine?.stop();
              yield* setState({ status: "Paused", attribution: unavailable, reconnect: null, failure: null });
              complete();
              return;
            }
            case "SetVolume": {
              const volume = clampVolume(message.command.volume);
              if (attempt?.stream && !attempt.stream.setVolume(volume)) {
                const currentGeneration = attempt.generation;
                yield* Effect.forkScoped(
                  Effect.sleep("10 millis").pipe(
                    Effect.andThen(Queue.offer(queue, { _tag: "VolumeFailed", generation: currentGeneration })),
                  ),
                );
                complete();
                return;
              }
              yield* setState({ volume });
              complete();
              return;
            }
          }
        }
        case "Opened": {
          if (!attempt || message.generation !== generation || attempt.generation !== message.generation) {
            message.stream.dispose();
            return;
          }
          attempt.stream = message.stream;
          attempt.unsubscribe = message.stream.subscribe({
            metadata: (metadata) => queue.unsafeOffer({ _tag: "Metadata", generation: message.generation, metadata }),
            reconnecting: (event) => queue.unsafeOffer({ _tag: "Reconnecting", generation: message.generation, ...event }),
            ended: () => queue.unsafeOffer({ _tag: "Ended", generation: message.generation }),
            error: (cause) => {
              if (attempt?.generation === message.generation) attempt.lastFailure = cause;
              queue.unsafeOffer({ _tag: "StreamError", generation: message.generation, cause });
            },
          });
          const status = statusFromStream(message.stream);
          yield* setState({
            status,
            attribution: status === "Playing"
              ? attempt.station.normalizeMetadata(message.stream.getMetadata())
              : unavailable,
          });
          return;
        }
        case "OpenFailed":
          if (message.generation === generation && attempt && !attempt.controller.signal.aborted) {
            yield* fail(classifyFailure(attempt.station, message.cause, "Station unavailable"), message.cause);
          }
          return;
        case "Metadata":
          if (message.generation === generation && attempt) {
            const snapshot = yield* SubscriptionRef.get(state);
            if (snapshot.status === "Playing") {
              yield* setState({ attribution: attempt.station.normalizeMetadata(message.metadata) });
            }
          }
          return;
        case "Reconnecting":
          if (message.generation === generation) {
            yield* setState({
              status: "Reconnecting",
              attribution: unavailable,
              reconnect: { attempt: message.attempt, maxRetries: message.maxRetries, delayMs: message.delayMs },
            });
          }
          return;
        case "Ended":
          if (message.generation === generation) yield* fail("Station unavailable", new Error("Station stream ended"));
          return;
        case "StreamError":
          if (message.generation === generation && attempt) {
            yield* fail(classifyFailure(attempt.station, message.cause, "Audio playback failed"), message.cause);
          }
          return;
        case "EngineError":
          if (attempt) {
            yield* fail(classifyFailure(attempt.station, message.cause, "Audio playback failed"), message.cause);
          }
          return;
        case "VolumeFailed":
          if (message.generation === generation && attempt) {
            yield* fail(
              "Audio playback failed",
              attempt.lastFailure ?? new Error("Native stream volume update failed"),
            );
          }
          return;
        case "Poll":
          if (attempt?.stream) {
            const status = statusFromStream(attempt.stream);
            const snapshot = yield* SubscriptionRef.get(state);
            if (status !== snapshot.status && status !== "Error") {
              yield* setState({
                status,
                reconnect: status === "Reconnecting" ? snapshot.reconnect : null,
                attribution: status === "Playing"
                  ? attempt.station.normalizeMetadata(attempt.stream.getMetadata())
                  : unavailable,
              });
            }
          }
          return;
      }
    });

    yield* Effect.addFinalizer(() => Effect.gen(function* () {
      acceptingCommands = false;
      generation += 1;
      const closingAttempt = attempt;
      clearAttempt();
      yield* Queue.shutdown(queue);
      if (closingAttempt) {
        yield* Effect.tryPromise(async () => {
          const stream = closingAttempt.stream
            ?? await waitUpTo(closingAttempt.opening, 1_000);
          if (!stream) return;
          stream.dispose();
          await waitUpTo(stream.closed, 1_000);
        }).pipe(
          Effect.ignore,
        );
      }
      unsubscribeEngine?.();
      engine?.dispose();
    }));

    yield* Effect.forkScoped(Effect.forever(Queue.take(queue).pipe(Effect.flatMap(handle))));
    yield* Effect.forkScoped(Effect.forever(Effect.sleep("100 millis").pipe(Effect.andThen(Queue.offer(queue, { _tag: "Poll" })))));

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
        queue.unsafeOffer({
          _tag: "Command",
          command,
          complete: () => resume(Effect.void),
        });
      }),
    };
  });
}

export const StreamingAudioLive = Layer.scoped(StreamingAudio, makeStreamingAudio(openTuiAudioFactory));
