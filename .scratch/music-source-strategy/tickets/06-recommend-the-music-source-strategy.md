# Recommend the Music Source Strategy

Label: wayfinder:grilling
Parent: ../MAP.md
Status: closed
Assignee: opencode
Blocked by: 02-rank-ready-made-station-sources.md, 05-rank-self-curated-music-sources.md

## Question

Given the ranked ready-made Station candidates and self-curated source and service combinations, what should lofi.fm use to get more music? Through a live grilling session, produce the final ranked dual-path recommendation, name the preferred and fallback options, state when no option meets the destination constraints, and make each recommendation's cost, rights uncertainty, attribution, metadata, reliability, musical fit, operational burden, and compatibility caveats explicit.

## Comments

### Resolution - 2026-08-19

No new source is unconditionally ship-ready. Use this ranked strategy:

1. **Adopt Audius conditionally as the next music source, using the operator's existing [Upbeat](https://audius.co/chiubaca/playlist/hacker.fm-74460) and [Lofi](https://audius.co/chiubaca/playlist/hacker.fm-lo-fi-80501) collections as co-primary Source Collections.** Each Source Collection produces a distinct listener-facing Playable Playlist that preserves its musical character. Each Playable Playlist continuously mirrors its Source Collection's membership and fixed order while skipping only deleted, deactivated, or currently unstreamable tracks; changes do not require separate approval. The observed Upbeat collection has 33 entries over 1 hour 57 minutes, including five deleted tracks; the hidden Lofi collection has 20 entries over 56 minutes, including three deleted tracks. Both require current API access and enough playable tracks before release.
2. **Keep FluxFM ChillHop queued as the preferred later ready-made Station investigation, not as a current integration.** It remains the best exact-genre Station lead and exposes a stable external-player MP3 URL, but its observed ICY title does not satisfy the existing integration contract's requirement for truthful current artist/title attribution. Nightwave Plaza remains the only recommended Station until that technical gate is cleared or the Station contract deliberately changes. Loca FM Melodic Techno and Nightride FM Chillsynth remain research-ranked technical alternatives, not active recommendations.
3. **If an Audius Playable Playlist fails a release gate, pause that Playlist rather than substitute another catalog or infrastructure path.** Gate Upbeat and Lofi independently, while treating shared Audius API or playback failures as blockers for both. Do not fall back to artist-direct files on R2, Radio.co, or another ready-made Station under this strategy. Reconsider sourcing in a fresh effort if the constraints or priorities change.

The Audius recommendation has these explicit conditions and tradeoffs:

- **Cost:** Audius currently publishes a free API tier of 10 requests per second and 500,000 requests per month. Higher-scale pricing requires contact. The low entry cost does not remove the cost of building and maintaining Playlist playback.
- **Rights uncertainty:** Rights, licensing, operator jurisdiction, and geographic legal analysis are intentionally outside this strategy and do not filter tracks or gate release. Every playable Source Collection entry is included regardless of license metadata.
- **Attribution and metadata:** Show artist, title, and Audius identity when the API supplies them, but missing attribution or rights metadata does not remove a playable track. Deleted and deactivated entries demonstrate that technical availability must still be refreshed rather than assumed.
- **Reliability:** Audius offers no SLA, may revoke API access, and relies on hosted stream and mirror behavior. Before release, test URL lifetime, range and elapsed-position resume, track transitions, removals, API and mirror failure, and listener concurrency.
- **Musical fit:** The two human-curated collections establish concrete upbeat and lofi intent more strongly than a broad catalog search. A Playable Playlist must contain at least 10 playable tracks and 45 minutes of playable runtime; falling below either floor makes that Playlist unavailable until it recovers.
- **Operational burden:** lofi.fm owns continuous collection refresh, playability filtering, failure handling, available attribution display, and device-local cursor state. The Audius Source Collections are authoritative for playable membership and order rather than one-time imports.
- **Compatibility:** Audius tracks do not fit the existing endless direct-stream Station contract. They require the distinct Playlist runtime already defined by this map: fixed-order looping, per-device pause and resume, forward skip, and a persisted local cursor without shuffle, seeking, previous-track navigation, accounts, or cloud sync. The cursor stores Audius track identity and elapsed position rather than only an index. A surviving playable track resumes and then follows the latest collection order; a stale cursor whose track was removed or became unplayable restarts at the first playable track.

Adoption is gated only on successful shared playback-behavior tests. Each Playable Playlist is then gated independently on usable API access to its Source Collection and the minimum of 10 playable tracks and 45 playable minutes. These are implementation and release checks, not unresolved source-strategy decisions.
