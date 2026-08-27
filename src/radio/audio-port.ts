import { Audio } from "@opentui/core";
import type {
  AudioStreamErrorContext,
  AudioStreamMetadata,
  AudioStreamReconnectEvent,
  AudioStreamState,
  AudioStreamUrlOptions,
} from "@opentui/core";

export type AudioStreamStats = {
  readonly state: AudioStreamState;
  readonly sampleRate: number;
  readonly channels: number;
  readonly bufferedFrames: number;
  readonly capacityFrames: number;
  readonly bufferedDurationMs: number;
  readonly bytesReceived: bigint;
  readonly framesDecoded: bigint;
  readonly framesPlayed: bigint;
  readonly underruns: number;
  readonly reconnectAttempts: number;
};

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
  readonly playbackAvailable?: boolean;
  start(): boolean;
  stop(): boolean;
  playStreamUrl(url: string, options: AudioStreamUrlOptions): Promise<AudioStreamPort>;
  readSpectrum?(bands: number): readonly number[];
  subscribeError(listener: (evidence: AudioFailureEvidence) => void): () => void;
  dispose(): void;
}

function spectrumFromFrames(frames: Float32Array, bands: number, sampleRate = 48_000) {
  if (frames.length === 0) return Array<number>(bands).fill(0);
  const spectrum: number[] = [];
  const minFrequency = 60;
  const maxFrequency = 12_000;

  for (let band = 0; band < bands; band += 1) {
    const progress = bands === 1 ? 0 : band / (bands - 1);
    const frequency = minFrequency * Math.pow(maxFrequency / minFrequency, progress);
    const angularStep = 2 * Math.PI * frequency / sampleRate;
    let real = 0;
    let imaginary = 0;

    for (let frame = 0; frame < frames.length; frame += 1) {
      const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * frame / Math.max(1, frames.length - 1));
      const sample = (frames[frame] ?? 0) * window;
      real += sample * Math.cos(angularStep * frame);
      imaginary -= sample * Math.sin(angularStep * frame);
    }

    const magnitude = 4 * Math.hypot(real, imaginary) / frames.length;
    spectrum.push(Math.min(1, Math.sqrt(magnitude) * 1.35));
  }

  return spectrum;
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
    const playbackDevices = audio.listPlaybackDevices();
    const tapEnabled = audio.enableTap(8_192);
    let previousSpectrum: readonly number[] = [];
    return {
      playbackAvailable: playbackDevices === null
        ? undefined
        : playbackDevices.some((device) => device.isDefault),
      start: () => audio.start(),
      stop: () => audio.stop(),
      playStreamUrl: async (url, options) => adaptStream(await audio.playStreamUrl(url, options)),
      readSpectrum: (bands) => {
        const tapped = tapEnabled ? audio.readTapFrames(2_048, 1) : null;
        const next = tapped && tapped.framesRead > 0
          ? spectrumFromFrames(tapped.frames, bands)
          : Array<number>(bands).fill(0);
        previousSpectrum = next.map((value, index) => Math.max(value, (previousSpectrum[index] ?? 0) * 0.72));
        return previousSpectrum;
      },
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
