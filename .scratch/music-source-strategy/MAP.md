# Recommend More Music Sources for CoasTTY

Label: wayfinder:map
Status: closed

## Destination

An evidence-backed, ranked source recommendation identifies practical hobby-scale paths for expanding CoasTTY through both ready-made Stations and self-curated music. It recommends at least one path for each or establishes why no path meets the constraints, compares shared live and per-listener playback where relevant, and makes cost, rights uncertainty, metadata, reliability, musical fit, and compatibility with the existing player visible.

## Notes

- Domain: a public, worldwide terminal radio experience focused on lofi, vaporwave, ambient, chillhop, chill-techno, and compatible low-attention adjacent music.
- Consult `CONTEXT.md` and the closed [Ship a Real Streaming COAST.FM Player](../real-streaming-player/MAP.md) map before working a ticket.
- Use the `research` skill for AFK investigations and the `grilling` and `domain-modeling` skills for HITL decisions.
- This effort follows wayfinding's planning default: produce a source recommendation, not implementation.
- Prefer free or hobby-scale sources and low-maintenance managed services; document material paid upgrades and scaling costs.
- A public direct stream URL is sufficient for recommendation consideration without affirmative third-party-app permission. Still report explicit prohibitions, provider terms, rights claims, attribution expectations, and legal uncertainty rather than presenting public reachability as a legal conclusion.
- The current operator is a UK-resident individual hobbyist, but choosing a durable operator jurisdiction and resolving legal obligations are out of scope. Recommendations must expose location-dependent uncertainty and must not claim to provide legal advice.
- Preserve honest provider identity and genre descriptions. Evaluate current artist/title metadata, but do not assume every source can satisfy the current Station integration contract.

## Decisions so far

- [Compare Self-Curated Playback Models](tickets/03-compare-self-curated-playback-models.md) - Shared Station playback best preserves today's live-radio contract and managed-service fit; independent Playlist playback adds personal control and cheap static delivery but broader rights, reporting, and runtime questions, so the model remains a human choice.
- [Rank Ready-Made Station Sources](tickets/02-rank-ready-made-station-sources.md) - FluxFM ChillHop is the best new exact-genre lead, with Loca, Nightride, and Ambient Sleeping Pill as backups, but none is ship-ready under current provider-use and metadata evidence.
- [Choose the Self-Curated Playback Model](tickets/04-choose-self-curated-playback-model.md) - Carry both operator-curated models forward: a communal live Station and a distinct fixed-order, device-resumable Playlist with limited controls.
- [Rank Self-Curated Music Sources and Services](tickets/05-rank-self-curated-music-sources.md) - No turnkey worldwide service passed; direct or audited-open catalogs plus Radio.co lead for a Station, while Audius OML/API leads a Playlist with direct-licensed files on R2 as fallback, all subject to explicit rights and feasibility gates.
- [Recommend the Music Source Strategy](tickets/06-recommend-the-music-source-strategy.md) - Conditionally adopt Audius using the existing Upbeat and Lofi collections as authoritative Source Collections for two continuously mirrored Playable Playlists; filter only technical unplayability, pause if technical gates fail, keep Nightwave Plaza as the sole Station, and queue FluxFM for later investigation.

## Not yet specified

- None.

## Out of scope

- Implementing Station integrations, playlist playback, broadcast infrastructure, player controls, or other runtime and UI changes.
- Acquiring a music catalog, signing service agreements, obtaining legal advice, or securing provider permissions.
- Operating the resulting stream, publishing a release, or producing original music.
- Provisioning shortlisted services, contacting providers or artists, auditing a releasable catalog, testing playback endpoints, and resolving launch-specific scaling or territory gates; this map identifies and ranks paths rather than clearing one for release.
- Listener-created or imported collections, on-demand Playlist navigation, accounts, and cloud-synced Playlist state.
- [Choose the Operator Jurisdiction](tickets/01-choose-operator-jurisdiction.md) - Choosing a durable jurisdiction and resolving jurisdiction-specific legal obligations are deferred until implementation or commercialization makes them necessary.
