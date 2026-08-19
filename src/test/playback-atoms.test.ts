import { expect, test } from "bun:test";
import * as Registry from "@effect-atom/atom/Registry";
import { Effect, SubscriptionRef } from "effect";
import {
  installPlaybackAtoms,
  pausePlaybackThenAtom,
  playbackCommandAtom,
  playbackStateAtom,
} from "../radio/playback-atoms";
import {
  initialPlaybackSnapshot,
  PlaybackCommand,
  type PlaybackCommand as PlaybackCommandType,
  type PlaybackSnapshot,
  type StreamingAudioService,
} from "../radio/playback";

test("playback atoms bridge registry-local state and commands", async () => {
  const registry = Registry.make();
  const commands: PlaybackCommandType[] = [];
  let commandsWhenContinued: PlaybackCommandType[] = [];

  try {
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const state = yield* SubscriptionRef.make(initialPlaybackSnapshot);
      const service: StreamingAudioService = {
        state,
        dispatch: (command) => Effect.sync(() => commands.push(command)),
        dispatchAndWait: (command) => Effect.sleep("5 millis").pipe(
          Effect.andThen(Effect.sync(() => commands.push(command))),
        ),
      };
      yield* installPlaybackAtoms(registry, service);

      registry.set(playbackCommandAtom, PlaybackCommand.Play());
      yield* Effect.sleep("10 millis");
      expect(commands).toEqual([PlaybackCommand.Play()]);

      registry.set(pausePlaybackThenAtom, () => {
        commandsWhenContinued = [...commands];
      });
      yield* Effect.sleep("10 millis");
      expect(commandsWhenContinued).toEqual([PlaybackCommand.Play(), PlaybackCommand.Pause()]);

      const playing: PlaybackSnapshot = { ...initialPlaybackSnapshot, status: "Playing" };
      yield* SubscriptionRef.set(state, playing);
      yield* Effect.sleep("10 millis");
      expect(registry.get(playbackStateAtom).status).toBe("Playing");
    })));
  } finally {
    registry.dispose();
  }
});
