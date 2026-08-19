# Define the Extensible Station Integration Contract

Label: wayfinder:grilling
Parent: ../MAP.md
Status: closed
Assignee: OpenCode
Blocked by: 02-design-streaming-audio-runtime.md, 04-prototype-player-controls.md, 05-decide-station-sourcing-gap.md

## Question

What provider-agnostic Station integration contract should let Nightwave Plaza now, and separately integrated lawful Stations later, supply stream setup, identity and genre, metadata and attribution behavior, availability, provider-specific failure mapping, and test fixtures without leaking provider logic into the shared Playback Status lifecycle or React controls? Decide the data-versus-code extension boundary and how a non-interactive `COMING SOON` row becomes an available Station.

## Comments

### Resolution - 2026-08-19

Use three separate concepts:

- A **Station integration** is a complete, lawfully reviewed Station definition.
- The **Station catalog** is the immutable registry of those integrations and the default Station.
- A **directory entry** is either a reference to an available Station or a `ComingSoon` slot. A temporary outage never changes an available Station into a Coming Soon slot.

Keep the provider boundary deliberately narrow. A Station integration contains stable identity (`id`, display name, provider name, and honest genre label), a direct HTTPS MP3 or FLAC setup, an attribution policy, a pure metadata normalizer, and an optional pure provider-failure classifier. It does not contain effectful stream discovery, React code, native audio handles, retry policy, or Playback Status transitions. Add a more capable source abstraction only when a lawfully approved Station actually requires one.

The shared scoped playback runtime owns engine and output-device lifecycle, stream opening, generation guards, cancellation, reconnect policy, volume, stats polling, cleanup, the seven-state Playback Status lifecycle, and generic failure classification. It resolves integrations by stable Station id and publishes only immutable Station identity, normalized attribution, Playback Status, friendly failure category, and commands through Effect Atom. React never receives provider callbacks or OpenTUI objects.

Normalize attribution to an explicit `Known`, `Partial`, or `Unavailable` value. Nightwave Plaza uses only ICY `StreamTitle`; do not add status-API polling. Split a value containing exactly one ` - ` delimiter into trimmed artist and title. If it contains multiple delimiters, preserve the whole value as title-only rather than guessing the artist boundary. Missing or malformed metadata is not a playback failure. Clear unavailable fields during Connecting, Buffering, Reconnecting, and Paused instead of retaining stale attribution.

Provider-specific failure classification may only refine raw evidence into one of the four existing listener-facing categories: Station unavailable, Unsupported stream, Playback device unavailable, or Audio playback failed. It cannot invent categories or control retryability; unrecognized evidence falls through to the shared classifier.

Nightwave Plaza's integration uses `https://radio.plaza.one/mp3`, format `mp3`, normal content-type validation, identity `Nightwave Plaza`, and genre `Vaporwave / Future Funk`. Its provider identity and current artist/title attribution are required while playback is active. Keep legal evidence in reviewable documentation rather than encoding a misleading `lawful: true` boolean.

A Coming Soon slot becomes available only through one reviewed catalog change: confirm lawful sourcing and attribution conditions, add the complete integration, then replace one `ComingSoon` entry with an available Station reference. Validate that every available entry and the default Station resolve to exactly one integration. Runtime endpoint health does not control catalog availability.

Keep deterministic fixtures next to each provider adapter, outside the runtime contract. Nightwave Plaza needs focused cases for one valid observed `StreamTitle`, null or missing metadata, a multi-delimiter value, and its exact HTTPS/MP3 setup. Shared fake-runtime fixtures cover generic audio failures; do not build the broad fault-injection matrix already ruled out of scope.
