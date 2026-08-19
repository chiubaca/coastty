import type { AudioStreamFormat, AudioStreamMetadata } from "@opentui/core";

export type Attribution =
  | { readonly _tag: "Known"; readonly artist: string; readonly title: string }
  | { readonly _tag: "Partial"; readonly title: string }
  | { readonly _tag: "Unavailable" };

export type PlaybackFailureCategory =
  | "Station unavailable"
  | "Unsupported stream"
  | "Playback device unavailable"
  | "Audio playback failed";

export type StationIntegration = {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly genre: string;
  readonly stream: {
    readonly url: string;
    readonly format: AudioStreamFormat;
    readonly contentTypePolicy: "validate";
  };
  readonly attribution: {
    readonly stationIdentity: "required";
    readonly currentArtistTitle: "required";
  };
  readonly classifyFailure?: (evidence: unknown) => PlaybackFailureCategory | undefined;
  readonly normalizeMetadata: (metadata: AudioStreamMetadata | null) => Attribution;
};

export type DirectoryEntry =
  | { readonly _tag: "Station"; readonly stationId: string }
  | { readonly _tag: "ComingSoon"; readonly id: string };

export function normalizeNightwaveMetadata(metadata: AudioStreamMetadata | null): Attribution {
  const streamTitle = metadata?.fields.StreamTitle?.trim();
  if (!streamTitle) return { _tag: "Unavailable" };

  const parts = streamTitle.split(" - ");
  if (parts.length !== 2) return { _tag: "Partial", title: streamTitle };

  const [artist, title] = parts.map((part) => part.trim());
  if (!artist || !title) return { _tag: "Unavailable" };
  return { _tag: "Known", artist, title };
}

export const nightwavePlaza: StationIntegration = Object.freeze({
  id: "nightwave-plaza",
  name: "Nightwave Plaza",
  provider: "Nightwave Plaza",
  genre: "Vaporwave / Future Funk",
  stream: Object.freeze({
    url: "https://radio.plaza.one/mp3",
    format: "mp3",
    contentTypePolicy: "validate",
  }),
  attribution: Object.freeze({
    stationIdentity: "required",
    currentArtistTitle: "required",
  }),
  normalizeMetadata: normalizeNightwaveMetadata,
});

function makeStationCatalog(
  integrations: readonly StationIntegration[],
  defaultStationId: string,
  directory: readonly DirectoryEntry[],
) {
  const integrationsById = new Map(integrations.map((station) => [station.id, station]));
  if (integrationsById.size !== integrations.length) throw new Error("Station ids must be unique");

  const defaultStation = integrationsById.get(defaultStationId);
  if (!defaultStation) throw new Error("The default Station must resolve to one integration");

  for (const entry of directory) {
    if (entry._tag === "Station" && !integrationsById.has(entry.stationId)) {
      throw new Error(`Directory Station ${entry.stationId} has no integration`);
    }
  }

  return Object.freeze({
    integrations: Object.freeze([...integrations]),
    defaultStationId,
    directory: Object.freeze([...directory]),
    defaultStation,
    resolve: (stationId: string) => integrationsById.get(stationId),
  });
}

export const stationCatalog = makeStationCatalog(
  [nightwavePlaza],
  nightwavePlaza.id,
  [
    { _tag: "Station", stationId: nightwavePlaza.id },
    { _tag: "ComingSoon", id: "coming-soon-1" },
    { _tag: "ComingSoon", id: "coming-soon-2" },
    { _tag: "ComingSoon", id: "coming-soon-3" },
    { _tag: "ComingSoon", id: "coming-soon-4" },
  ],
);

export const defaultStation = stationCatalog.defaultStation;
