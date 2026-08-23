import { expect, test } from "bun:test";
import { makeAudiusSource, type PlaylistEntry } from "../radio/audius-source";

const MPEG1_LAYER3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] as const;
const MPEG1_SAMPLE_RATES = [44_100, 48_000, 32_000] as const;

function frameBoundaries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33
    ? 10 + ((bytes[6]! & 0x7f) << 21) + ((bytes[7]! & 0x7f) << 14) + ((bytes[8]! & 0x7f) << 7) + (bytes[9]! & 0x7f)
    : 0;
  const boundaries: { offset: number; elapsedSeconds: number }[] = [];
  let elapsedSeconds = 0;
  while (offset + 4 <= bytes.length) {
    const header = view.getUint32(offset, false);
    const sync = header >>> 21;
    const version = (header >>> 19) & 0b11;
    const layer = (header >>> 17) & 0b11;
    const bitrate = MPEG1_LAYER3_BITRATES[(header >>> 12) & 0b1111];
    const sampleRate = MPEG1_SAMPLE_RATES[(header >>> 10) & 0b11];
    if (sync !== 0x7ff || version !== 0b11 || layer !== 0b01 || !bitrate || !sampleRate) break;
    boundaries.push({ offset, elapsedSeconds });
    offset += Math.floor(144_000 * bitrate / sampleRate) + ((header >>> 9) & 1);
    elapsedSeconds += 1_152 / sampleRate;
  }
  return { boundaries, durationSeconds: elapsedSeconds };
}

test("proportional MP3 restoration lands within ten seconds of saved elapsed time", async () => {
  const bytes = await Bun.file(new URL("../assets/opening.mp3", import.meta.url)).bytes();
  const parsed = frameBoundaries(bytes);
  expect(parsed.boundaries.length).toBeGreaterThan(100);
  const targetSeconds = 2.5;
  const source = makeAudiusSource({
    maxAttempts: 1,
    fetch: (async () => new Response(new Uint8Array([0]), {
      status: 206,
      headers: { "content-range": `bytes 0-0/${bytes.length}` },
    })) as unknown as typeof fetch,
  });
  const entry: PlaylistEntry = {
    entryId: "fixture:track:timestamp",
    sourceCollectionId: "fixture",
    trackId: "track",
    sourceTimestamp: 1,
    position: 0,
    durationSeconds: parsed.durationSeconds,
    artist: null,
    title: null,
    audiusUrl: null,
    mirrors: [],
  };

  const offset = await source.getResumeOffset(
    { url: "https://fixture.invalid/opening.mp3", mirror: null },
    entry,
    targetSeconds,
    new AbortController().signal,
  );
  const resumedFrame = parsed.boundaries.find((frame) => frame.offset >= (offset ?? 0));

  expect(offset).not.toBeNull();
  expect(resumedFrame).toBeDefined();
  expect(Math.abs(resumedFrame!.elapsedSeconds - targetSeconds)).toBeLessThan(10);
});
