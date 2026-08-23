import { describe, expect, test } from "bun:test";
import { makeAudiusSource, normalizeAudiusCollection } from "../radio/audius-source";
import { upbeatPlaylist } from "../radio/playlists";

function rawTrack(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    track_id: Number(id.replace(/\D/g, "")) || 1,
    title: `Title ${id}`,
    duration: 300,
    is_delete: false,
    is_available: true,
    is_streamable: true,
    stream: { mirrors: ["https://mirror-1.example", "https://mirror-2.example"] },
    user: {
      name: `Artist ${id}`,
      is_deactivated: false,
      is_available: true,
    },
    ...overrides,
  };
}

describe("Audius Source Collection normalization", () => {
  test("preserves playable occurrences and applies provider flags before the release floor", () => {
    const playable = Array.from({ length: 10 }, (_, index) => rawTrack(`track-${index + 1}`));
    const duplicate = rawTrack("track-1", { title: undefined, user: { name: undefined, is_deactivated: false, is_available: true } });
    const excluded = [
      rawTrack("deleted", { is_delete: true }),
      rawTrack("deactivated", { user: { name: "Artist", is_deactivated: true, is_available: true } }),
      rawTrack("track-unavailable", { is_available: false }),
      rawTrack("uploader-unavailable", { user: { name: "Artist", is_deactivated: false, is_available: false } }),
      rawTrack("unstreamable", { is_streamable: false }),
    ];
    const tracks = [...playable, duplicate, ...excluded];
    const timestamps = tracks.map((_, index) => 1_700_000_000 + index);

    const manifest = normalizeAudiusCollection(upbeatPlaylist, {
      data: [{
        id: "source-collection-id",
        playlist_name: "Hacker FM",
        tracks,
        playlist_contents: tracks.map((track, index) => ({
          track_id: (track as { id: string }).id,
          timestamp: timestamps[index],
        })),
      }],
    });

    expect(manifest.entries).toHaveLength(11);
    expect(manifest.entries.map((entry) => entry.trackId)).toEqual([
      "track-1", "track-2", "track-3", "track-4", "track-5", "track-6",
      "track-7", "track-8", "track-9", "track-10", "track-1",
    ]);
    expect(manifest.entries[0]?.entryId).not.toBe(manifest.entries[10]?.entryId);
    expect(manifest.entries[10]).toMatchObject({ artist: null, title: null });
    expect(manifest.available).toBe(true);
    expect(manifest.playableDurationSeconds).toBe(3_300);
  });

  test("rejects malformed provider responses", () => {
    expect(() => normalizeAudiusCollection(upbeatPlaylist, { data: [] })).toThrow("returned no Playlist");
  });

  test("uses canonical resolution, fresh stream URLs, provider mirror order, and proportional ranges", async () => {
    const requests: { url: string; headers: Headers }[] = [];
    let streamAttempt = 0;
    const tracks = Array.from({ length: 10 }, (_, index) => rawTrack(`track-${index + 1}`));
    const source = makeAudiusSource({
      apiKey: "read-only-key",
      maxAttempts: 1,
      fetch: (async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, headers: new Headers(init?.headers) });
        if (url.includes("/resolve")) {
          return Response.json({ data: [{
            id: "collection",
            playlist_name: "Upbeat",
            tracks,
            playlist_contents: tracks.map((track, index) => ({ track_id: track.id, timestamp: index + 1 })),
          }] });
        }
        if (url.includes("no_redirect=true")) {
          streamAttempt += 1;
          return Response.json({ data: `https://primary.example/audio.mp3?signature=${streamAttempt}` });
        }
        return new Response(new Uint8Array([0]), {
          status: 206,
          headers: { "content-range": "bytes 0-0/300000" },
        });
      }) as unknown as typeof fetch,
    });
    const signal = new AbortController().signal;

    const manifest = await source.refresh(upbeatPlaylist, signal);
    const entry = manifest.entries[0]!;
    const first = await source.getStreamCandidates(entry, signal);
    const second = await source.getStreamCandidates(entry, signal);
    const offset = await source.getResumeOffset(first[0]!, entry, 30, signal);

    expect(new URL(requests[0]!.url).searchParams.get("url")).toBe(upbeatPlaylist.canonicalUrl);
    expect(requests.every((request) => request.headers.get("x-api-key") === "read-only-key")).toBe(true);
    expect(first.map((candidate) => new URL(candidate.url).host)).toEqual([
      "primary.example", "mirror-1.example", "mirror-2.example",
    ]);
    expect(second[0]?.url).not.toBe(first[0]?.url);
    expect(offset).toBe(30_000);
  });

  test("does not retry non-retryable API responses", async () => {
    let requests = 0;
    const source = makeAudiusSource({
      maxAttempts: 3,
      fetch: (async () => {
        requests += 1;
        return new Response("missing", { status: 404 });
      }) as unknown as typeof fetch,
    });

    await expect(source.refresh(upbeatPlaylist, new AbortController().signal)).rejects.toThrow("404");
    expect(requests).toBe(1);
  });
});
