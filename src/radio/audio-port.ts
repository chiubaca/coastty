import { Audio } from "@opentui/core";
import type {
  AudioStreamErrorContext,
  AudioStreamMetadata,
  AudioStreamReconnectEvent,
  AudioStreamState,
  AudioStreamUrlOptions,
} from "@opentui/core";

export type AudioStreamStats = { readonly state: AudioStreamState };

export type AudioFailureEvidence = {
  readonly error: Error;
  readonly context?: AudioStreamErrorContext | { readonly action: string; readonly status?: number };
};

export type AudioStreamHandlers = {
  readonly metadata: (metadata: AudioStreamMetadata | null) => void;
  readonly reconnecting: (event: AudioStreamReconnectEvent) => void;
  readonly ended: () => void;
  readonly error: (evidence: AudioFailureEvidence) => void;
};

export interface AudioStreamPort {
  readonly closed: Promise<void>;
  readonly state: AudioStreamState;
  getStats(): AudioStreamStats;
  getMetadata(): AudioStreamMetadata | null;
  setVolume(volume: number): boolean;
  subscribe(handlers: AudioStreamHandlers): () => void;
  dispose(): void;
}

export interface AudioEnginePort {
  start(): boolean;
  stop(): boolean;
  playStreamUrl(url: string, options: AudioStreamUrlOptions): Promise<AudioStreamPort>;
  subscribeError(listener: (evidence: AudioFailureEvidence) => void): () => void;
  dispose(): void;
}

export interface AudioFactory {
  create(): AudioEnginePort;
}

function adaptStream(stream: Awaited<ReturnType<Audio["playStreamUrl"]>>): AudioStreamPort {
  return {
    closed: stream.closed,
    get state() {
      return stream.state;
    },
    getStats: () => stream.getStats(),
    getMetadata: () => stream.getMetadata(),
    setVolume: (volume) => stream.setVolume(volume),
    subscribe: (handlers) => {
      const onError = (error: Error, context: AudioStreamErrorContext) => handlers.error({ error, context });
      stream.on("metadata", handlers.metadata);
      stream.on("reconnecting", handlers.reconnecting);
      stream.on("ended", handlers.ended);
      stream.on("error", onError);
      return () => {
        stream.off("metadata", handlers.metadata);
        stream.off("reconnecting", handlers.reconnecting);
        stream.off("ended", handlers.ended);
        stream.off("error", onError);
      };
    },
    dispose: () => stream.dispose(),
  };
}

export const openTuiAudioFactory: AudioFactory = {
  create: () => {
    const audio = Audio.create({ autoStart: false });
    return {
      start: () => audio.start(),
      stop: () => audio.stop(),
      playStreamUrl: async (url, options) => adaptStream(await audio.playStreamUrl(url, options)),
      subscribeError: (listener) => {
        const onError = (error: Error, context: { readonly action: string; readonly status?: number }) => {
          listener({ error, context });
        };
        audio.on("error", onError);
        return () => audio.off("error", onError);
      },
      dispose: () => audio.dispose(),
    };
  },
};
