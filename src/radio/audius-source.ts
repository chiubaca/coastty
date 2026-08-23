import type { PlaylistDefinition, PlaylistId } from "./playlists";

const API_BASE = "https://api.audius.co/v1";
export const PLAYLIST_MINIMUM_ENTRIES = 10;
export const PLAYLIST_MINIMUM_DURATION_SECONDS = 45 * 60;

class NonRetryableAudiusError extends Error {}

export type PlaylistEntry = {
  readonly entryId: string;
  readonly sourceCollectionId: string;
  readonly trackId: string;
  readonly sourceTimestamp: number;
  readonly position: number;
  readonly durationSeconds: number;
  readonly artist: string | null;
  readonly title: string | null;
  readonly audiusUrl: string | null;
  readonly mirrors: readonly string[];
};

export type PlaylistManifest = {
  readonly playlistId: PlaylistId;
  readonly sourceCollectionId: string;
  readonly sourceName: string;
  readonly entries: readonly PlaylistEntry[];
  readonly playableDurationSeconds: number;
  readonly available: boolean;
  readonly fetchedAt: number;
};

export type StreamCandidate = {
  readonly url: string;
  readonly mirror: string | null;
};

export interface AudiusSource {
  refresh(playlist: PlaylistDefinition, signal: AbortSignal): Promise<PlaylistManifest>;
  getStreamCandidates(entry: PlaylistEntry, signal: AbortSignal): Promise<readonly StreamCandidate[]>;
  getResumeOffset(candidate: StreamCandidate, entry: PlaylistEntry, elapsedSeconds: number, signal: AbortSignal): Promise<number | null>;
}

export function playlistAvailability(entries: readonly Pick<PlaylistEntry, "durationSeconds">[]) {
  const playableDurationSeconds = entries.reduce((total, entry) => total + entry.durationSeconds, 0);
  return {
    playableEntries: entries.length,
    playableDurationSeconds,
    available: entries.length >= PLAYLIST_MINIMUM_ENTRIES
      && playableDurationSeconds >= PLAYLIST_MINIMUM_DURATION_SECONDS,
  } as const;
}

type RawTrack = {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly duration?: unknown;
  readonly permalink?: unknown;
  readonly is_delete?: unknown;
  readonly is_available?: unknown;
  readonly is_streamable?: unknown;
  readonly stream?: { readonly mirrors?: unknown };
  readonly user?: {
    readonly name?: unknown;
    readonly is_deactivated?: unknown;
    readonly is_available?: unknown;
  };
};

type RawPlaylist = {
  readonly id?: unknown;
  readonly playlist_name?: unknown;
  readonly tracks?: unknown;
  readonly playlist_contents?: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function entryIdentity(sourceCollectionId: string, trackId: string, timestamp: number) {
  return [sourceCollectionId, trackId, String(timestamp)].map(encodeURIComponent).join(":");
}

function technicallyPlayable(track: RawTrack) {
  return track.is_delete !== true
    && track.user?.is_deactivated !== true
    && track.is_available === true
    && track.user?.is_available === true
    && track.is_streamable === true;
}

export function normalizeAudiusCollection(
  playlist: PlaylistDefinition,
  response: unknown,
  fetchedAt = Date.now(),
): PlaylistManifest {
  const root = asObject(response);
  const data = Array.isArray(root?.data) ? root.data : [];
  const raw = asObject(data[0]) as RawPlaylist | null;
  if (!raw) throw new Error(`${playlist.name} Source Collection returned no Playlist`);
  if (typeof raw.id !== "string" || !Array.isArray(raw.tracks) || !Array.isArray(raw.playlist_contents)) {
    throw new Error(`${playlist.name} Source Collection response was incomplete`);
  }

  const contents = raw.playlist_contents.map(asObject);
  const entries = raw.tracks.flatMap((value, position): PlaylistEntry[] => {
    const track = asObject(value) as RawTrack | null;
    const content = contents[position];
    if (!track || typeof track.id !== "string" || !technicallyPlayable(track)) return [];
    const timestamp = typeof content?.timestamp === "number" && Number.isFinite(content.timestamp)
      ? content.timestamp
      : null;
    const durationSeconds = typeof track.duration === "number" && Number.isFinite(track.duration) && track.duration > 0
      ? track.duration
      : null;
    if (timestamp === null || durationSeconds === null) return [];

    return [{
      entryId: entryIdentity(raw.id as string, track.id, timestamp),
      sourceCollectionId: raw.id as string,
      trackId: track.id,
      sourceTimestamp: timestamp,
      position,
      durationSeconds,
      artist: typeof track.user?.name === "string" && track.user.name.trim() ? track.user.name.trim() : null,
      title: typeof track.title === "string" && track.title.trim() ? track.title.trim() : null,
      audiusUrl: typeof track.permalink === "string" && track.permalink ? `https://audius.co${track.permalink}` : null,
      mirrors: Array.isArray(track.stream?.mirrors)
        ? track.stream.mirrors.filter((mirror): mirror is string => typeof mirror === "string")
        : [],
    }];
  });
  const availability = playlistAvailability(entries);

  return Object.freeze({
    playlistId: playlist.id,
    sourceCollectionId: raw.id,
    sourceName: typeof raw.playlist_name === "string" ? raw.playlist_name : playlist.name,
    entries: Object.freeze(entries),
    playableDurationSeconds: availability.playableDurationSeconds,
    available: availability.available,
    fetchedAt,
  });
}

function mirrorUrl(streamUrl: string, mirror: string) {
  const candidate = new URL(streamUrl);
  const mirrorBase = new URL(mirror);
  candidate.protocol = mirrorBase.protocol;
  candidate.host = mirrorBase.host;
  return candidate.toString();
}

export function makeAudiusSource(options: {
  readonly fetch?: typeof globalThis.fetch;
  readonly apiKey?: string;
  readonly now?: () => number;
  readonly maxAttempts?: number;
  readonly timeoutMs?: number;
} = {}): AudiusSource {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const headers = new Headers(options.apiKey ? { "x-api-key": options.apiKey } : undefined);
  const maxAttempts = options.maxAttempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 15_000;

  async function request(url: string, init: RequestInit, signal: AbortSignal) {
    let lastFailure: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const requestHeaders = new Headers(init.headers);
        headers.forEach((value, key) => requestHeaders.set(key, value));
        const response = await fetchImpl(url, {
          ...init,
          headers: requestHeaders,
          signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
        });
        if (response.ok) return response;
        const responseError = new Error(`Audius request returned ${response.status}`);
        lastFailure = responseError;
        if (response.status < 500 && response.status !== 429) {
          throw new NonRetryableAudiusError(responseError.message);
        }
      } catch (cause) {
        if (signal.aborted) throw cause;
        if (cause instanceof NonRetryableAudiusError) throw cause;
        lastFailure = cause;
      }
      if (attempt < maxAttempts) await Bun.sleep(250 * attempt);
    }
    throw lastFailure ?? new Error("Audius request failed");
  }

  return {
    async refresh(playlist, signal) {
      const url = new URL(`${API_BASE}/resolve`);
      url.searchParams.set("url", playlist.canonicalUrl);
      const response = await request(url.toString(), { redirect: "follow" }, signal);
      return normalizeAudiusCollection(playlist, await response.json(), options.now?.() ?? Date.now());
    },
    async getStreamCandidates(entry, signal) {
      const url = new URL(`${API_BASE}/tracks/${encodeURIComponent(entry.trackId)}/stream`);
      url.searchParams.set("skip_play_count", "true");
      url.searchParams.set("no_redirect", "true");
      const response = await request(url.toString(), {}, signal);
      const body = asObject(await response.json());
      if (typeof body?.data !== "string" || !body.data) throw new Error("Audius stream response had no URL");
      const candidates: StreamCandidate[] = [{ url: body.data, mirror: null }];
      for (const mirror of entry.mirrors) {
        try {
          const url = mirrorUrl(body.data, mirror);
          if (!candidates.some((candidate) => candidate.url === url)) candidates.push({ url, mirror });
        } catch {
          // Ignore malformed provider mirror metadata while retaining other candidates.
        }
      }
      return candidates;
    },
    async getResumeOffset(candidate, entry, elapsedSeconds, signal) {
      if (elapsedSeconds <= 0 || elapsedSeconds >= entry.durationSeconds) return null;
      const response = await request(candidate.url, { headers: { Range: "bytes=0-0" }, redirect: "follow" }, signal);
      if (response.status !== 206) {
        await response.body?.cancel();
        return null;
      }
      await response.body?.cancel();
      const match = response.headers.get("content-range")?.match(/\/(\d+)$/);
      const totalBytes = match?.[1] ? Number(match[1]) : NaN;
      if (!Number.isSafeInteger(totalBytes) || totalBytes <= 0) return null;
      return Math.floor(totalBytes * elapsedSeconds / entry.durationSeconds);
    },
  };
}

export const audiusSourceLive = makeAudiusSource({ apiKey: Bun.env.AUDIUS_API_KEY });
