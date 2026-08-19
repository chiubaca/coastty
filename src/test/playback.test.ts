import { describe, expect, test } from "bun:test";
import { Effect, SubscriptionRef } from "effect";
import type {
  AudioEnginePort,
  AudioFactory,
  AudioStreamHandlers,
  AudioStreamPort,
  AudioStreamStats,
} from "../radio/audio-port";
import { PlaybackCommand, makeStreamingAudio, type StreamingAudioService } from "../radio/playback";

class FakeStream implements AudioStreamPort {
  readonly closed = Promise.resolve();
  state: AudioStreamStats["state"] = "buffering";
  disposed = false;
  volume = 0;

  getStats(): AudioStreamStats {
    return { state: this.state };
  }

  getMetadata() {
    return null;
  }

  setVolume(volume: number) {
    this.volume = volume;
    return true;
  }

  subscribe(_handlers: AudioStreamHandlers) {
    return () => {};
  }

  dispose() {
    this.disposed = true;
  }
}

class FakeEngine implements AudioEnginePort {
  readonly stream = new FakeStream();
  started = false;
  stopped = false;
  disposed = false;
  playCalls = 0;

  start() {
    this.started = true;
    this.stopped = false;
    return true;
  }

  stop() {
    this.started = false;
    this.stopped = true;
    return true;
  }

  async playStreamUrl() {
    this.playCalls += 1;
    return this.stream;
  }

  subscribeError() {
    return () => {};
  }

  dispose() {
    this.disposed = true;
  }
}

class PendingEngine implements AudioEnginePort {
  readonly stream = new FakeStream();
  disposed = false;

  start() {
    return true;
  }

  stop() {
    return true;
  }

  playStreamUrl(_url: string, options: Parameters<AudioEnginePort["playStreamUrl"]>[1]) {
    return new Promise<AudioStreamPort>((resolve) => {
      options.signal?.addEventListener("abort", () => resolve(this.stream), { once: true });
    });
  }

  subscribeError() {
    return () => {};
  }

  dispose() {
    this.disposed = true;
  }
}

describe("streaming audio", () => {
  test("starts only after Play and releases the stream and device on Pause", async () => {
    const engine = new FakeEngine();
    let playback: StreamingAudioService;
    let creates = 0;
    const factory: AudioFactory = {
      create: () => {
        creates += 1;
        return engine;
      },
    };

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      playback = yield* makeStreamingAudio(factory);

      expect(creates).toBe(0);
      expect((yield* SubscriptionRef.get(playback.state)).status).toBe("Stopped");

      yield* playback.dispatch(PlaybackCommand.Play());
      yield* Effect.sleep("10 millis");
      expect(creates).toBe(1);
      expect(engine.started).toBe(true);
      expect((yield* SubscriptionRef.get(playback.state)).status).toBe("Buffering");

      engine.stream.state = "playing";
      yield* Effect.sleep("150 millis");
      expect((yield* SubscriptionRef.get(playback.state)).status).toBe("Playing");

      yield* playback.dispatchAndWait(PlaybackCommand.Pause());
      expect((yield* SubscriptionRef.get(playback.state)).status).toBe("Paused");
      expect(engine.stream.disposed).toBe(true);
      expect(engine.stopped).toBe(true);

      yield* playback.dispatch(PlaybackCommand.Play());
      yield* Effect.sleep("10 millis");
      expect(creates).toBe(1);
    })));

    expect(engine.disposed).toBe(true);
    await Effect.runPromise(playback!.dispatch(PlaybackCommand.Play()));
    await Bun.sleep(10);
    expect(creates).toBe(1);
  });

  test("disposes a stream that finishes opening during scoped shutdown", async () => {
    const engine = new PendingEngine();

    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const playback = yield* makeStreamingAudio({ create: () => engine });
      yield* playback.dispatch(PlaybackCommand.Play());
      yield* Effect.sleep("10 millis");
    })));

    expect(engine.stream.disposed).toBe(true);
    expect(engine.disposed).toBe(true);
  });
});
