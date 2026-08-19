import { describe, expect, test } from "bun:test";
import { defaultStation, nightwavePlaza, normalizeNightwaveMetadata, stationCatalog } from "../radio/stations";

describe("Nightwave Plaza integration", () => {
  test("is the validated default direct MP3 Station", () => {
    expect(defaultStation).toBe(nightwavePlaza);
    expect(stationCatalog.integrations).toEqual([nightwavePlaza]);
    expect(nightwavePlaza).toMatchObject({
      id: "nightwave-plaza",
      name: "Nightwave Plaza",
      provider: "Nightwave Plaza",
      genre: "Vaporwave / Future Funk",
      stream: {
        url: "https://radio.plaza.one/mp3",
        format: "mp3",
        contentTypePolicy: "validate",
      },
      attribution: {
        stationIdentity: "required",
        currentArtistTitle: "required",
      },
    });
  });

  test("normalizes the observed artist and title attribution", () => {
    expect(normalizeNightwaveMetadata({
      format: "icy",
      headers: {},
      fields: { StreamTitle: "desert sand feels warm at night - 返答待ち" },
    })).toEqual({
      _tag: "Known",
      artist: "desert sand feels warm at night",
      title: "返答待ち",
    });
  });

  test("does not guess an artist boundary when metadata has multiple delimiters", () => {
    expect(normalizeNightwaveMetadata({
      format: "icy",
      headers: {},
      fields: { StreamTitle: "artist - title - remix" },
    })).toEqual({ _tag: "Partial", title: "artist - title - remix" });
    expect(normalizeNightwaveMetadata(null)).toEqual({ _tag: "Unavailable" });
  });
});
