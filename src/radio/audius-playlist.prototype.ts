import { Audio, type AudioStream } from "@opentui/core";
import {
  advanceRuntime,
  createRuntime,
  duplicateTrackIds,
  playableTracks,
  type PrototypePlaylist,
  type PrototypeRuntime,
  type PrototypeTrack,
} from "./audius-playlist.prototype-model";

// THROWAWAY PROTOTYPE QUESTION:
// Can the two chosen Audius Source Collections support fixed-order, device-resumable
// Playlists through the current Audius API and OpenTUI audio stack, including removal,
// range/resume, transition, mirror, URL-lifetime, concurrency, and failure behavior?

const API_BASE = "https://api.audius.co/v1";
const SOURCES = [
  {
    label: "Upbeat",
    url: "https://audius.co/chiubaca/playlist/hacker.fm-74460",
  },
  {
    label: "Lofi",
    url: "https://audius.co/chiubaca/playlist/hacker.fm-lo-fi-80501",
  },
] as const;

type RawTrack = {
  readonly id: string;
  readonly track_id: number;
  readonly title: string;
  readonly duration: number;
  readonly is_delete: boolean;
  readonly is_available: boolean;
  readonly is_streamable?: boolean;
  readonly stream: { readonly url?: string; readonly mirrors: readonly string[] };
  readonly user: {
    readonly name: string;
    readonly is_deactivated: boolean;
    readonly is_available: boolean;
  };
};

type RawPlaylist = {
  readonly id: string;
  readonly playlist_id: number;
  readonly playlist_name: string;
  readonly tracks: readonly RawTrack[];
  readonly playlist_contents: readonly {
    readonly track_id: string;
    readonly timestamp: number;
  }[];
};

type Collection = {
  readonly label: string;
  readonly canonicalUrl: string;
  readonly numericId: number;
  readonly playlist: PrototypePlaylist;
  readonly rawTracks: readonly RawTrack[];
};

type ProbeResult = {
  readonly name: string;
  readonly status: "PASS" | "FAIL" | "LIMIT";
  readonly detail: string;
};

type RangeResult = {
  readonly status: number;
  readonly bytes: number;
  readonly contentType: string | null;
  readonly contentRange: string | null;
  readonly totalBytes: number | null;
};

function apiHeaders(): Record<string, string> {
  const apiKey = Bun.env.AUDIUS_API_KEY;
  return apiKey ? { "x-api-key": apiKey } : {};
}

function unavailableReason(track: RawTrack): PrototypeTrack["unavailableReason"] {
  if (track.is_delete) return "deleted";
  if (track.user.is_deactivated) return "deactivated";
  if (!track.is_available || !track.user.is_available) return "unavailable";
  if (track.is_streamable !== true) return "unstreamable";
  return null;
}

async function fetchCollection(source: typeof SOURCES[number]): Promise<Collection> {
  const url = new URL(`${API_BASE}/resolve`);
  url.searchParams.set("url", source.url);
  const response = await fetch(url, { headers: apiHeaders(), redirect: "follow" });
  if (!response.ok) throw new Error(`${source.label} resolve returned ${response.status}`);
  const body = await response.json() as { readonly data?: readonly RawPlaylist[] };
  const raw = body.data?.[0];
  if (!raw) throw new Error(`${source.label} resolve returned no Playlist`);

  const tracks = raw.tracks.map((track, index): PrototypeTrack => ({
    entryId: `${track.id}:${raw.playlist_contents[index]?.timestamp ?? index}`,
    id: track.id,
    title: track.title,
    artist: track.user.name,
    durationSeconds: track.duration,
    unavailableReason: unavailableReason(track),
  }));

  return {
    label: source.label,
    canonicalUrl: source.url,
    numericId: raw.playlist_id,
    playlist: { id: raw.id, name: raw.playlist_name, tracks },
    rawTracks: raw.tracks,
  };
}

async function fetchCollections() {
  return Promise.all(SOURCES.map(fetchCollection));
}

function streamEndpoint(trackId: string, noRedirect = false) {
  const url = new URL(`${API_BASE}/tracks/${encodeURIComponent(trackId)}/stream`);
  url.searchParams.set("skip_play_count", "true");
  if (noRedirect) url.searchParams.set("no_redirect", "true");
  return url.toString();
}

async function fetchRange(url: string, start: number, end: number): Promise<RangeResult> {
  const response = await fetch(url, {
    headers: { ...apiHeaders(), Range: `bytes=${start}-${end}` },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  const requestedBytes = end - start + 1;
  const reader = response.body?.getReader();
  let bytes = 0;
  if (reader) {
    while (bytes < requestedBytes) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
    }
    await reader.cancel();
  }
  const contentRange = response.headers.get("content-range");
  const totalMatch = contentRange?.match(/\/(\d+)$/);
  return {
    status: response.status,
    bytes,
    contentType: response.headers.get("content-type"),
    contentRange,
    totalBytes: totalMatch?.[1] ? Number(totalMatch[1]) : null,
  };
}

async function getFreshStreamUrl(trackId: string) {
  const response = await fetch(streamEndpoint(trackId, true), {
    headers: apiHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`stream URL returned ${response.status}`);
  const body = await response.json() as { readonly data?: string };
  if (!body.data) throw new Error("stream URL response had no data");
  return body.data;
}

function mirrorUrl(streamUrl: string, mirror: string) {
  const candidate = new URL(streamUrl);
  const mirrorBase = new URL(mirror);
  candidate.protocol = mirrorBase.protocol;
  candidate.host = mirrorBase.host;
  return candidate.toString();
}

async function nativeDecode(track: PrototypeTrack, startByte = 0) {
  const audio = Audio.create({ autoStart: false });
  let stream: AudioStream | null = null;
  try {
    if (!audio.startMixer()) throw new Error("OpenTUI mixer did not start");
    stream = await audio.playStreamUrl(streamEndpoint(track.id), {
      format: "mp3",
      contentTypePolicy: "validate",
      request: startByte > 0
        ? { headers: { ...apiHeaders(), Range: `bytes=${startByte}-` } }
        : { headers: apiHeaders() },
      buffer: { capacityMs: 1_000, startupMs: 100, resumeMs: 100 },
    });

    let peak = 0;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const mixed = audio.mixFrames(4_800, 2);
      if (mixed) {
        for (const sample of mixed) peak = Math.max(peak, Math.abs(sample));
      }
      const stats = stream.getStats();
      if (stats.framesDecoded > 0n && peak > 0) {
        return `decoded=${stats.framesDecoded} frames, rate=${stats.sampleRate}, channels=${stats.channels}, peak=${peak.toFixed(3)}`;
      }
      await Bun.sleep(50);
    }
    const stats = stream.getStats();
    throw new Error(`no audible frames: state=${stats.state}, decoded=${stats.framesDecoded}, peak=${peak}`);
  } finally {
    stream?.dispose();
    audio.dispose();
  }
}

async function probe(name: string, operation: () => Promise<string>, expectedFailure = false): Promise<ProbeResult> {
  try {
    const detail = await operation();
    return { name, status: expectedFailure ? "FAIL" : "PASS", detail };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return { name, status: expectedFailure ? "PASS" : "FAIL", detail };
  }
}

async function runAudit(collections: readonly Collection[], onProgress?: (message: string) => void) {
  const results: ProbeResult[] = [];
  const allPlayable = collections.flatMap((collection) => playableTracks(collection.playlist));
  const first = allPlayable[0];
  const second = allPlayable[1];
  if (!first || !second) throw new Error("The collections did not contain two playable entries");
  const firstCollection = collections[0];
  const firstRaw = firstCollection?.rawTracks.find((track) => track.id === first.id);
  if (!firstRaw) throw new Error("Could not correlate the first playable track");

  onProgress?.("probing every collection entry");
  for (const collection of collections) {
    const candidates = collection.playlist.tracks.flatMap((track, index) =>
      track.unavailableReason === null ? [{ track, index }] : []
    );
    const successfulIndexes = new Set<number>();
    const failed: string[] = [];
    for (let offset = 0; offset < candidates.length; offset += 5) {
      const batch = candidates.slice(offset, offset + 5);
      await Promise.all(batch.map(async ({ track, index }) => {
        try {
          const range = await fetchRange(streamEndpoint(track.id), 0, 4_095);
          if (range.status === 206 && range.bytes === 4_096) successfulIndexes.add(index);
          else failed.push(`${track.id}=${range.status}/${range.bytes}`);
        } catch (cause) {
          failed.push(`${track.id}=error:${cause instanceof Error ? cause.message : String(cause)}`);
        }
      }));
      if (offset + 5 < candidates.length) await Bun.sleep(600);
    }

    const actuallyPlayable = candidates
      .filter(({ index }) => successfulIndexes.has(index))
      .map(({ track }) => track);
    const minutes = actuallyPlayable.reduce((total, track) => total + track.durationSeconds, 0) / 60;
    results.push({
      name: `${collection.label} playability scan`,
      status: failed.length === 0 ? "PASS" : "FAIL",
      detail: `${actuallyPlayable.length}/${candidates.length} provider-eligible entries returned 206${failed.length ? `; failed ${failed.join(", ")}` : ""}`,
    });
    results.push({
      name: `${collection.label} release floor`,
      status: actuallyPlayable.length >= 10 && minutes >= 45 ? "PASS" : "FAIL",
      detail: `${actuallyPlayable.length}/${collection.playlist.tracks.length} currently streamable entries, ${minutes.toFixed(1)} streamable minutes`,
    });

    const excluded = collection.playlist.tracks.flatMap((track, index) =>
      track.unavailableReason === null ? [] : [{ track, index }]
    );
    const excludedEvidence = await Promise.all(excluded.map(async ({ track }) => {
      try {
        const range = await fetchRange(streamEndpoint(track.id), 0, 1_023);
        return `${track.id}:${track.unavailableReason}=${range.status}`;
      } catch (cause) {
        return `${track.id}:${track.unavailableReason}=error:${cause instanceof Error ? cause.message : String(cause)}`;
      }
    }));
    const transportAccessible = excludedEvidence.filter((evidence) => /=(200|206)$/.test(evidence)).length;
    results.push({
      name: `${collection.label} excluded entries`,
      status: transportAccessible > 0 ? "LIMIT" : "PASS",
      detail: `all filtered by provider flags; ${transportAccessible}/${excluded.length} still served audio: ${excludedEvidence.join(", ")}`,
    });
  }

  const hiddenCollection = collections.find((collection) => collection.label === "Lofi");
  if (hiddenCollection) {
    const directByEncodedId = await fetch(`${API_BASE}/playlists/${hiddenCollection.playlist.id}`, { headers: apiHeaders() });
    const encodedBody = await directByEncodedId.json() as { readonly data?: readonly unknown[] };
    const directByNumericId = await fetch(`${API_BASE}/playlists/${hiddenCollection.numericId}`, { headers: apiHeaders() });
    results.push({
      name: "Hidden collection access path",
      status: "LIMIT",
      detail: `canonical resolve works; encoded ID returned ${directByEncodedId.status}/${encodedBody.data?.length ?? 0} rows, numeric ID returned ${directByNumericId.status}`,
    });
  }

  onProgress?.("probing byte ranges");
  const initialRange = await fetchRange(streamEndpoint(first.id), 0, 65_535);
  results.push({
    name: "HTTP byte range",
    status: initialRange.status === 206 && initialRange.bytes === 65_536 ? "PASS" : "FAIL",
    detail: `status=${initialRange.status}, bytes=${initialRange.bytes}, type=${initialRange.contentType}, range=${initialRange.contentRange}`,
  });

  const totalBytes = initialRange.totalBytes;
  const elapsedSeconds = Math.min(30, Math.floor(first.durationSeconds / 3));
  const estimatedOffset = totalBytes
    ? Math.floor(totalBytes * elapsedSeconds / first.durationSeconds)
    : 1_048_576;
  const resumedRange = await fetchRange(streamEndpoint(first.id), estimatedOffset, estimatedOffset + 65_535);
  results.push({
    name: "Elapsed-position byte mapping",
    status: resumedRange.status === 206 && resumedRange.bytes === 65_536 ? "LIMIT" : "FAIL",
    detail: `estimated ${elapsedSeconds}s -> byte ${estimatedOffset}; server accepted range, but MP3 byte ratio is not an exact time seek`,
  });

  onProgress?.("probing native decode");
  results.push(await probe("OpenTUI native decode", () => nativeDecode(first)));
  results.push(await probe("OpenTUI ranged decode", () => nativeDecode(first, estimatedOffset)));

  onProgress?.("probing fixed-order transition");
  results.push(await probe("Fixed-order transition", async () => {
    const firstEvidence = await nativeDecode(first);
    const secondEvidence = await nativeDecode(second);
    return `${first.title} -> ${second.title}; ${firstEvidence}; ${secondEvidence}`;
  }));

  onProgress?.("probing stream URL reuse");
  const urlReuse = await probe("Signed stream URL reuse", async () => {
    const streamUrl = await getFreshStreamUrl(first.id);
    await Bun.sleep(5_000);
    const range = await fetchRange(streamUrl, 0, 16_383);
    if (range.status !== 206) throw new Error(`reused URL returned ${range.status}`);
    const replacement = await getFreshStreamUrl(first.id);
    return `same URL worked after 5s; refreshed URL ${replacement === streamUrl ? "was unchanged" : "changed"}; expiry remains undocumented`;
  });
  results.push({ ...urlReuse, status: urlReuse.status === "PASS" ? "LIMIT" : urlReuse.status });

  onProgress?.("probing mirrors");
  const streamUrl = await getFreshStreamUrl(first.id);
  const mirrorResults = await Promise.all(firstRaw.stream.mirrors.map(async (mirror) => {
    try {
      const range = await fetchRange(mirrorUrl(streamUrl, mirror), 0, 16_383);
      return `${new URL(mirror).host}=${range.status}/${range.bytes}`;
    } catch (cause) {
      return `${new URL(mirror).host}=error:${cause instanceof Error ? cause.message : String(cause)}`;
    }
  }));
  results.push({
    name: "Content-node mirrors",
    status: mirrorResults.some((result) => result.includes("=206/16384")) ? "PASS" : "FAIL",
    detail: mirrorResults.join(", "),
  });

  onProgress?.("probing removals and failures");
  results.push(await probe("API failure", async () => {
    const response = await fetch(`${API_BASE}/tracks/not-a-real-track`, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) throw new Error(`unexpected success ${response.status}`);
    throw new Error(`expected API rejection ${response.status}`);
  }, true));

  results.push(await probe("Mirror failure", async () => {
    await fetchRange(mirrorUrl(streamUrl, "https://unreachable.invalid"), 0, 1_023);
    return "invalid mirror unexpectedly responded";
  }, true));

  onProgress?.("probing three concurrent listeners");
  const concurrent = await Promise.all([0, 1, 2].map(() => fetchRange(streamEndpoint(first.id), 0, 16_383)));
  results.push({
    name: "Three concurrent streams",
    status: concurrent.every((result) => result.status === 206 && result.bytes === 16_384) ? "PASS" : "FAIL",
    detail: concurrent.map((result) => `${result.status}/${result.bytes}`).join(", "),
  });

  for (const collection of collections) {
    const duplicates = duplicateTrackIds(collection.playlist);
    if (duplicates.length === 0) continue;
    const [trackId, count] = duplicates[0] ?? [];
    const runtime = createRuntime(collection.playlist, trackId ? { trackId, elapsedSeconds: 20 } : null);
    results.push({
      name: `${collection.label} identity-only cursor`,
      status: "LIMIT",
      detail: `${trackId} occurs ${count} times; ${runtime.transition}; source entry timestamps can disambiguate`,
    });
  }

  return results;
}

function verdict(results: readonly ProbeResult[]) {
  const failures = results.filter((result) => result.status === "FAIL");
  if (failures.length > 0) return `NO-GO: ${failures.map((result) => result.name).join(", ")}`;
  return "CONDITIONAL GO FOR PRD: transport and native playback work; exact elapsed resume, duplicate cursor identity, and URL-expiry policy remain design gates";
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const bold = "\x1b[1m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";

async function runInteractive(initialCollections: readonly Collection[]) {
  let collections = initialCollections;
  let playlistIndex = 0;
  let runtime: PrototypeRuntime = createRuntime(collections[0]!.playlist);
  let results: readonly ProbeResult[] = [];
  let busy = "";
  let audio: Audio | null = null;
  let stream: AudioStream | null = null;

  function selectedCollection() {
    return collections[playlistIndex]!;
  }

  function render() {
    console.clear();
    const collection = selectedCollection();
    const track = runtime.playableTracks[runtime.currentIndex];
    const playableSeconds = runtime.playableTracks.reduce((total, item) => total + item.durationSeconds, 0);
    console.log(`${bold}THROWAWAY AUDIUS PLAYLIST FEASIBILITY PROTOTYPE${reset}`);
    console.log(`${dim}Question: can Audius collections satisfy lofi.fm Playlist transport and playback gates?${reset}\n`);
    console.log(`${bold}Source Collection${reset}  ${collection.label} / ${collection.playlist.name} (${collection.playlist.id}, numeric ${collection.numericId})`);
    console.log(`${bold}Manifest${reset}           ${runtime.playableTracks.length}/${collection.playlist.tracks.length} playable, ${formatDuration(playableSeconds)}, ${duplicateTrackIds(collection.playlist).length} duplicate identities`);
    console.log(`${bold}Release floor${reset}      ${runtime.playableTracks.length >= 10 && playableSeconds >= 45 * 60 ? "PASS" : "FAIL"} (10 entries / 45:00)`);
    console.log(`${bold}Current entry${reset}      ${runtime.currentIndex + 1}/${runtime.playableTracks.length} ${track?.artist ?? "-"} - ${track?.title ?? "-"}`);
    console.log(`${bold}Track identity${reset}     ${track?.id ?? "-"}  ${dim}entry ${track?.entryId ?? "-"}${reset}`);
    console.log(`${bold}Cursor${reset}             ${runtime.cursor ? `${runtime.cursor.trackId} @ ${runtime.cursor.elapsedSeconds}s` : "none"}`);
    console.log(`${bold}Transition${reset}         ${runtime.transition}`);
    console.log(`${bold}Audio${reset}              ${stream?.getStats().state ?? "stopped"}${busy ? `  ${busy}` : ""}\n`);

    console.log(`${bold}Latest probes${reset}`);
    for (const result of results.slice(-8)) console.log(`${result.status.padEnd(5)} ${result.name}: ${result.detail}`);
    if (results.length === 0) console.log(`${dim}Run [a] for the complete live audit.${reset}`);
    console.log(`\n${bold}[h/l]${reset} collection  ${bold}[j/k]${reset} entry  ${bold}[p]${reset} play/stop  ${bold}[n]${reset} skip  ${bold}[c]${reset} restore cursor`);
    console.log(`${bold}[r]${reset} refresh API  ${bold}[a]${reset} full audit  ${bold}[q]${reset} quit`);
  }

  async function stopAudio() {
    stream?.dispose();
    stream = null;
    audio?.dispose();
    audio = null;
  }

  async function playCurrent() {
    if (stream) {
      await stopAudio();
      return;
    }
    const track = runtime.playableTracks[runtime.currentIndex];
    if (!track) return;
    audio = Audio.create({ autoStart: false });
    if (!audio.start()) throw new Error("No audio output device available");
    stream = await audio.playStreamUrl(streamEndpoint(track.id), {
      format: "mp3",
      contentTypePolicy: "validate",
      request: { headers: apiHeaders() },
      volume: 0.5,
    });
  }

  async function act(action: () => Promise<void>) {
    if (busy) return;
    try {
      busy = "working...";
      render();
      await action();
    } catch (cause) {
      results = [...results, {
        name: "Interactive action",
        status: "FAIL",
        detail: cause instanceof Error ? cause.message : String(cause),
      }];
    } finally {
      busy = "";
      render();
    }
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  render();

  process.stdin.on("data", (key: string) => {
    void act(async () => {
      if (key === "q" || key === "\u0003") {
        await stopAudio();
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.clear();
        process.exit(0);
      }
      if (key === "h" || key === "l") {
        await stopAudio();
        playlistIndex = (playlistIndex + (key === "h" ? -1 : 1) + collections.length) % collections.length;
        runtime = createRuntime(selectedCollection().playlist);
      }
      if (key === "j" || key === "k") {
        const delta = key === "j" ? 1 : -1;
        const length = runtime.playableTracks.length;
        if (length > 0) {
          const next = (runtime.currentIndex + delta + length) % length;
          const track = runtime.playableTracks[next]!;
          runtime = { ...runtime, currentIndex: next, cursor: { trackId: track.id, elapsedSeconds: 0 }, transition: "manually selected for probing" };
        }
      }
      if (key === "p") await playCurrent();
      if (key === "n") {
        await stopAudio();
        runtime = advanceRuntime(runtime, "skipped");
        await playCurrent();
      }
      if (key === "c" && runtime.cursor) runtime = createRuntime(selectedCollection().playlist, { ...runtime.cursor, elapsedSeconds: 20 });
      if (key === "r") {
        await stopAudio();
        const cursor = runtime.cursor;
        collections = await fetchCollections();
        runtime = createRuntime(selectedCollection().playlist, cursor);
      }
      if (key === "a") {
        await stopAudio();
        results = await runAudit(collections, (message) => {
          busy = message;
          render();
        });
      }
    });
  });
}

const collections = await fetchCollections();

if (process.argv.includes("--audit")) {
  const results = await runAudit(collections, (message) => console.error(`${dim}${message}${reset}`));
  for (const result of results) console.log(`${result.status.padEnd(5)} ${result.name}: ${result.detail}`);
  console.log(`\n${verdict(results)}`);
  process.exitCode = results.some((result) => result.status === "FAIL") ? 1 : 0;
} else {
  await runInteractive(collections);
}
