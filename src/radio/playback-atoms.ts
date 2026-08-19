import * as Atom from "@effect-atom/atom/Atom";
import type * as Registry from "@effect-atom/atom/Registry";
import * as Effect from "effect/Effect";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import {
  initialPlaybackSnapshot,
  type PlaybackCommand,
  type PlaybackSnapshot,
  type StreamingAudioService,
} from "./playback";

type CommandSink = {
  readonly dispatch: (command: PlaybackCommand) => void;
  readonly pauseThen: (continuation: () => void) => void;
};

const playbackStateStorageAtom = Atom.make<PlaybackSnapshot>(initialPlaybackSnapshot).pipe(
  Atom.keepAlive,
  Atom.withLabel("radio/playback-state-storage"),
);

const playbackCommandSinkAtom = Atom.make<CommandSink>({ dispatch: () => {}, pauseThen: () => {} }).pipe(
  Atom.keepAlive,
  Atom.withLabel("radio/playback-command-sink"),
);

export const playbackStateAtom = Atom.map(playbackStateStorageAtom, (snapshot) => snapshot).pipe(
  Atom.withLabel("radio/playback-state"),
);

export const playbackCommandAtom = Atom.writable(
  (get) => get(playbackStateStorageAtom),
  (context, command: PlaybackCommand) => context.get(playbackCommandSinkAtom).dispatch(command),
).pipe(Atom.withLabel("radio/playback-command"));

export const pausePlaybackThenAtom = Atom.writable(
  (get) => get(playbackStateStorageAtom),
  (context, continuation: () => void) => context.get(playbackCommandSinkAtom).pauseThen(continuation),
).pipe(Atom.withLabel("radio/pause-playback-then"));

export function installPlaybackAtoms(
  registry: Registry.Registry,
  service: StreamingAudioService,
): Effect.Effect<void, never, Scope.Scope> {
  return Effect.gen(function* () {
    registry.set(playbackCommandSinkAtom, {
      dispatch: (command) => {
        Effect.runFork(service.dispatch(command));
      },
      pauseThen: (continuation) => {
        Effect.runFork(service.dispatchAndWait({ _tag: "Pause" }).pipe(
          Effect.andThen(Effect.sync(continuation)),
        ));
      },
    });

    yield* Effect.addFinalizer(() => Effect.sync(() => {
      registry.set(playbackCommandSinkAtom, { dispatch: () => {}, pauseThen: () => {} });
    }));

    yield* service.state.changes.pipe(
      Stream.runForEach((snapshot) => Effect.sync(() => registry.set(playbackStateStorageAtom, snapshot))),
      Effect.forkScoped,
    );
  });
}
