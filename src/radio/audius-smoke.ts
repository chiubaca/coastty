import { Audio } from "@opentui/core";
import { makeAudiusSource, playlistAvailability, type PlaylistEntry } from "./audius-source";
import { playlistCatalog } from "./playlists";

const source = makeAudiusSource({ apiKey: Bun.env.AUDIUS_API_KEY });
let failed = false;

async function decode(entry: PlaylistEntry, signal: AbortSignal) {
  const candidate = (await source.getStreamCandidates(entry, signal))[0];
  if (!candidate) throw new Error("Audius returned no primary stream candidate");
  const audio = Audio.create({ autoStart: false });
  let stream: Awaited<ReturnType<Audio["playStreamUrl"]>> | null = null;
  try {
    if (!audio.startMixer()) throw new Error("native audio mixer did not start");
    stream = await audio.playStreamUrl(candidate.url, {
      format: "mp3",
      contentTypePolicy: "validate",
      signal,
      buffer: { capacityMs: 1_000, startupMs: 100, resumeMs: 100 },
    });
    for (let attempt = 0; attempt < 30; attempt += 1) {
      audio.mixFrames(4_800, 2);
      if (stream.getStats().framesDecoded > 0n) return;
      await Bun.sleep(50);
    }
    throw new Error("native decoder produced no frames");
  } finally {
    stream?.dispose();
    audio.dispose();
  }
}

for (const playlist of playlistCatalog) {
  try {
    const signal = AbortSignal.timeout(180_000);
    const manifest = await source.refresh(playlist, signal);
    const transportPlayable: PlaylistEntry[] = [];
    for (const entry of manifest.entries) {
      try {
        const primary = (await source.getStreamCandidates(entry, signal))[0];
        if (primary && await source.getResumeOffset(primary, entry, 1, signal) !== null) {
          transportPlayable.push(entry);
        }
      } catch {
        // The release floor is based on entries that pass both provider flags and transport probing.
      }
    }
    const gate = playlistAvailability(transportPlayable);
    if (!gate.available) {
      throw new Error(`${gate.playableEntries} entries / ${(gate.playableDurationSeconds / 60).toFixed(1)} minutes passed transport probing`);
    }

    const first = transportPlayable[0]!;
    const second = transportPlayable[1]!;
    const mirrorCandidates = (await source.getStreamCandidates(first, signal)).slice(1);
    const mirrorResults = await Promise.all(mirrorCandidates.map(async (candidate) => {
      try {
        return await source.getResumeOffset(candidate, first, 1, signal) !== null;
      } catch {
        return false;
      }
    }));
    if (mirrorResults.length === 0 || !mirrorResults.some(Boolean)) throw new Error("no advertised mirror accepted a byte range");

    const concurrent = await Promise.all(transportPlayable.slice(0, 3).map(async (entry) => {
      const primary = (await source.getStreamCandidates(entry, signal))[0];
      return primary ? source.getResumeOffset(primary, entry, 1, signal) : null;
    }));
    if (concurrent.some((offset) => offset === null)) throw new Error("representative concurrent streams failed");

    await decode(first, signal);
    await decode(second, signal);
    console.log(`PASS ${playlist.name}: ${gate.playableEntries} entries, ${(gate.playableDurationSeconds / 60).toFixed(1)} minutes, range/mirror/decode/transition/concurrency probes passed`);
  } catch (cause) {
    failed = true;
    console.error(`FAIL ${playlist.name}: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

if (failed) process.exitCode = 1;
