# Ship Audius Playable Playlists

Status: ready-for-agent

## Problem Statement

lofi.fm currently offers one live Station, Nightwave Plaza. A listener who wants more operator-curated music cannot choose the operator's existing upbeat and lofi Audius collections, retain a personal position in either collection, pause and resume a track, or skip forward through a fixed order.

The existing Station runtime cannot provide those behaviors. It opens one endless live URL, treats end-of-stream as failure, and rejoins the current live point after Pause. An Audius Playlist instead consists of finite tracks, has a listener-specific position, advances normally at the end of each track, and must continuously reflect an external Source Collection whose entries can be reordered, removed, deleted, deactivated, or become temporarily unstreamable.

The Audius feasibility prototype established that both chosen Source Collections currently clear their release floors and that Audius MP3 streams, HTTP byte ranges, mirrors, fixed-order transitions, and the OpenTUI native decoder are technically compatible. It also established constraints that production behavior must handle explicitly: provider flags can mark entries unavailable even while their URLs still serve audio, the hidden Lofi Source Collection is available only through canonical URL resolution, signed stream URLs change and have no documented lifetime, duplicate track identities occur in both collections, and a proportional MP3 byte range provides only best-effort elapsed-position restoration.

## Solution

Add two distinct listener-facing Playable Playlists, Upbeat and Lofi, backed by the operator's existing Audius Source Collections. Present them alongside Nightwave Plaza while keeping Playlist behavior separate from Station behavior.

Each Playlist will mirror its Source Collection's current membership and fixed order in memory, exclude entries that Audius marks deleted, deactivated, unavailable, or unstreamable, and immediately skip a track that fails across its available stream mirrors. Each Playlist is available only while it has at least 10 playable entries and 45 minutes of playable runtime.

A listener can select a Playlist, Play, Pause, resume near the saved elapsed position, adjust volume, and skip forward. Tracks advance automatically and the Playlist loops. The listener cannot select an individual track, seek, go backward, shuffle, reorder, or synchronize state through an account.

Each device keeps one versioned cursor per Playlist. The cursor identifies the exact Source Collection entry and elapsed position, rather than only an array index or Audius track identity. A surviving entry resumes and then follows the Source Collection's latest order. A removed, replaced, or currently unplayable entry causes the Playlist to restart at its first playable entry. Audio and Source Collection manifests remain session-only; every playback attempt obtains a fresh stream URL.

## User Stories

1. As a listener, I want to see Upbeat and Lofi as Playlists alongside Nightwave Plaza, so that I can choose between live radio and operator-curated finite music.
2. As a listener, I want Stations and Playlists to be visibly distinguished, so that I understand whether Pause rejoins a live point or preserves my personal position.
3. As a listener, I want each Playlist to retain its musical name and character, so that Upbeat and Lofi remain meaningful choices rather than one merged catalog.
4. As a listener, I want to select a Playlist while playback is stopped, so that I can decide what will play before starting audio.
5. As a listener, I want selecting a different available Station or Playlist during playback to switch immediately, so that the directory behaves consistently.
6. As a listener, I want my current Playlist cursor saved before switching away, so that I can later continue that Playlist.
7. As a listener, I want Play on a Playlist with no saved cursor to start its first playable entry, so that playback begins predictably.
8. As a listener, I want Play on a Playlist with a valid saved cursor to resume the same Source Collection entry near my saved elapsed position, so that I do not repeatedly restart long tracks.
9. As a listener, I want Pause to stop Playlist audio while retaining the current entry, elapsed position, and volume, so that I can continue later.
10. As a listener, I want closing and reopening lofi.fm to preserve each Playlist's cursor on this device, so that a process restart does not erase my listening position.
11. As a listener, I want an unexpected process exit to lose at most a small amount of elapsed progress, so that device-local resume remains useful after a crash.
12. As a listener, I want forward skip to move immediately to the next playable entry, so that I can pass a track without selecting another track directly.
13. As a listener, I want skip on the final playable entry to loop to the first playable entry, so that a Playlist can continue indefinitely.
14. As a listener, I want a completed track to advance to the next playable entry automatically, so that normal track completion is not presented as an error.
15. As a listener, I want the final track to advance to the first playable entry automatically, so that the fixed-order Playlist loops continuously.
16. As a listener, I want the Source Collection's relative order preserved after unavailable entries are removed, so that I hear the operator's intended sequence.
17. As a listener, I want duplicate occurrences of the same Audius track to remain in their intended positions, so that mirroring does not silently rewrite the Source Collection.
18. As a listener, I want a duplicate occurrence to resume at the occurrence I actually heard, so that restoring a cursor does not jump to an earlier copy of the same track.
19. As a listener, I want a track removed and later re-added by the operator to count as a new Source Collection entry, so that stale progress is not applied to a replacement occurrence.
20. As a listener, I want Source Collection additions, removals, and reordering to take effect at the next track boundary, so that the current track is not interrupted by routine curation.
21. As a listener, I want a current entry that no longer exists when I return to restart at the first playable entry, so that stale cursor data cannot strand playback.
22. As a listener, I want a current entry that has become deleted, deactivated, unavailable, or unstreamable to restart at the first playable entry, so that playback does not attempt disallowed content.
23. As a listener, I want a stream that fails during playback to try its available Audius mirrors before skipping, so that one unhealthy content node does not unnecessarily lose a track.
24. As a listener, I want a track that fails across all stream candidates to be skipped immediately, so that one bad entry does not stop the Playlist.
25. As a listener, I want repeated failures that leave too little playable music to make the Playlist unavailable, so that lofi.fm does not advertise a broken Playlist.
26. As a listener, I want an unavailable Upbeat Playlist not to disable Lofi when Lofi still passes its own release floor, so that independent collection problems remain isolated.
27. As a listener, I want a shared Audius API or playback failure to be represented consistently for both Playlists, so that retry behavior is understandable.
28. As a listener, I want a Playlist to become available again after a successful refresh restores its release floor, so that temporary provider problems do not require an application update.
29. As a listener, I want Connecting, Buffering, Playing, Paused, Reconnecting, and Error states to remain visible for Playlist playback, so that I know what the player is doing.
30. As a listener, I want Playlist failures described as Playlist or track availability problems rather than Station failures, so that error language matches the selected model.
31. As a listener, I want artist and title shown when Audius supplies them, so that I can identify the current track.
32. As a listener, I want Audius identified as the current provider, so that the source of the music is honest.
33. As a listener, I want playback to continue when optional artist or title metadata is missing, so that incomplete attribution does not make an otherwise playable entry unavailable.
34. As a listener, I want the current Playlist name to remain visible while a track plays, so that track metadata does not obscure which Playlist I selected.
35. As a listener, I want volume controls to work identically for Stations and Playlists, so that changing playback models does not change a basic control.
36. As a listener, I want the player to remember Playlist progress separately for Upbeat and Lofi, so that listening to one does not overwrite the other.
37. As a listener, I want Station Pause to retain its existing live behavior, so that adding Playlists does not turn Nightwave Plaza into on-demand audio.
38. As a listener, I do not want a previous-track action, so that the interface preserves forward-only Playlist semantics.
39. As a listener, I do not want a seek control, so that elapsed restoration remains a device behavior rather than on-demand navigation.
40. As a listener, I do not want shuffle or reordering controls, so that the operator's fixed order remains authoritative.
41. As a listener, I do not want direct track selection, so that the Playlist remains a limited-control listening experience rather than a catalog browser.
42. As a listener, I want corrupted or unsupported cursor data to fall back safely to the first playable entry, so that local state cannot prevent playback.
43. As a listener, I want resume to restart the same track from its beginning when ranged restoration cannot be decoded, so that an imprecise resume never becomes a terminal failure.
44. As an operator, I want the Audius Source Collections to remain authoritative, so that curation changes do not require a lofi.fm release.
45. As an operator, I want deleted and deactivated flags honored even when an old stream URL still serves bytes, so that provider state overrides transport reachability.
46. As an operator, I want each Playlist gated on at least 10 playable entries and 45 playable minutes, so that it has enough music to be listener-facing.
47. As an operator, I want Source Collection data cached only in memory for the active session, so that lofi.fm does not depend on stale persisted provider data.
48. As an operator, I want stream URLs acquired freshly and never stored in the device cursor, so that unknown signed URL lifetimes do not break later sessions.
49. As an operator, I want supported Audius production API access used for reads, so that the integration does not depend on deprecated discovery hosts.
50. As an operator, I want an optional read-only API key supplied through configuration rather than source code, so that higher rate limits can be used without embedding credentials.
51. As an operator, I want Source Collection refresh and stream requests bounded and retried rather than unbounded, so that Audius failures cannot create an infinite recovery loop.
52. As an operator, I want no fallback catalog substituted when an Audius Playlist fails its gate, so that the selected sourcing strategy remains explicit.
53. As a developer, I want Station and Playlist semantics represented as distinct playback choices behind one listener-facing playback service, so that shared controls do not blur their different lifecycle rules.
54. As a developer, I want commands and observable playback snapshots to remain the primary integration seam, so that behavior can be tested without a real network, filesystem, or audio device.
55. As a developer, I want Audius response normalization isolated from playback orchestration, so that provider fields can change without spreading through the player.
56. As a developer, I want device-local cursor storage behind a small interface, so that persistence behavior can be tested independently of the host filesystem.
57. As a developer, I want the native audio boundary to expose enough playback progress to maintain elapsed position, so that cursor updates reflect played audio rather than wall-clock buffering time.
58. As a developer, I want stale asynchronous stream and refresh events ignored after a selection or generation changes, so that old work cannot overwrite the current playback state.
59. As a developer, I want deterministic fixtures for duplicate entries, removals, mirror failures, and stale cursors, so that the difficult Playlist behavior remains regression-tested.
60. As a developer, I want the prototype retained only as linked primary evidence, so that throwaway probing code is not promoted into production architecture.

## Implementation Decisions

- Nightwave Plaza remains the default Selected Station and retains its existing Station contract. Upbeat and Lofi are added as distinct Playlist choices, not modeled as Station integrations.
- The player directory will visibly separate the Station section from the Playlist section. Available choices are interactive; a Playlist that fails its release floor remains visible as unavailable and cannot be selected for new playback.
- The listener-facing playback service remains the single high-level control surface. It accepts selection, Play, Pause, Set Volume, and forward Skip commands and publishes one observable snapshot covering the selected Station or Playlist, Playback Status, volume, attribution, recovery state, and listener-facing failure.
- Forward Skip is accepted only for a selected Playlist. Station playback ignores or does not expose that command. No previous, seek, shuffle, reorder, or direct-track command is introduced.
- Selecting another available choice while playback is active first captures the outgoing Playlist cursor, disposes its stream, and immediately begins the newly selected choice. Selecting while Stopped or Paused changes the selection without starting audio.
- Playlist orchestration is separate from endless Station orchestration beneath the shared playback service. End-of-stream is normal completion for a Playlist track and remains failure evidence for an endless Station stream.
- An Audius source adapter owns canonical Source Collection resolution, response normalization, fresh stream candidate acquisition, and provider-specific failure evidence. Playback logic consumes provider-neutral Playlist entries.
- Both Source Collections are loaded through their canonical Audius URLs using the current production API base. The hidden Lofi collection must use canonical resolution because direct encoded and numeric ID lookups returned 404 in the prototype.
- Read requests work anonymously under the current Audius API contract. When a read-only API key is configured, requests include it for the published higher limits. No API secret is required or stored.
- A normalized Source Collection entry includes the Source Collection identity, Audius track identity, source entry timestamp, fixed-order position, duration, available artist/title, Audius identity, and stream-candidate metadata needed for the active session.
- A stable entry identity is the composite of Source Collection identity, Audius track identity, and source entry timestamp. This preserves duplicate occurrences and treats removal followed by re-addition as a new entry. The domain glossary must be updated from a cursor stored only by track identity to a cursor stored by Source Collection entry identity.
- Relative Source Collection order is preserved exactly after filtering. Duplicate track identities are not deduplicated.
- An entry is excluded before streaming when the provider reports the track deleted, the uploader deactivated, the track or uploader unavailable, or the track not streamable. Stream URL presence never overrides those flags.
- Missing artist, title, rights, license, writer, publisher, label, ISRC, or territory metadata does not exclude a technically playable entry. Artist, title, and Audius identity are shown when supplied.
- Each Playlist is independently available only when its current normalized manifest contains at least 10 playable entries and at least 45 minutes of playable duration. Upbeat and Lofi can therefore differ in availability.
- Source Collection manifests live only in memory for the active application session. They are fetched at startup, refreshed before beginning a Playlist when stale, and refreshed at every track boundary. A successful refresh atomically replaces the prior in-memory manifest.
- Routine collection changes do not interrupt the current track. At the next boundary, the latest successful manifest determines the following entry.
- A transient refresh failure retains the last successful in-memory manifest for bounded recovery during the current session. If there is no successful manifest, or bounded shared API recovery is exhausted, the affected Playlist cannot start and enters Error.
- Tracks that fail all stream candidates are marked currently unstreamable in memory. The runtime immediately advances, recomputes the Playlist release floor, and stops with Playlist unavailable if the floor is no longer met. A later successful Source Collection refresh permits one fresh attempt rather than permanently blacklisting the track.
- Every track attempt obtains a fresh signed stream URL and its mirror list. Signed URLs, audio bytes, and Source Collection manifests are never persisted.
- Stream candidates are attempted in provider order with bounded retries. A content-node failure advances to the next advertised mirror; exhaustion marks that entry currently unstreamable and advances to the next playable entry.
- A cursor is stored separately for each Playlist as versioned device-local JSON. It contains Playlist identity, stable Source Collection entry identity, Audius track identity for diagnostics, elapsed seconds, and update time. It does not contain a stream URL, manifest, audio bytes, credentials, or array index.
- Cursor writes use atomic replacement. Corrupt, unknown-version, or incomplete state is ignored for that Playlist and replaced after playback starts from the first playable entry.
- Cursor progress is derived from audio frames actually played, not time spent Connecting or Buffering. The native audio boundary will expose played-frame and sample-rate evidence needed to calculate elapsed progress.
- Cursor state is captured on Pause, forward Skip, normal completion, stream failure, selection change, graceful shutdown, and periodically while Playing. The periodic checkpoint interval is five seconds, limiting ordinary crash loss without writing on every audio poll.
- On restore, an exact stable entry identity that remains playable resumes that entry. If it no longer exists or is not playable, playback starts at the latest manifest's first playable entry with zero elapsed time.
- Elapsed-position restoration is deliberately best-effort. The runtime obtains a fresh stream, discovers the current object length with a bounded range request, maps saved elapsed proportionally from provider duration to a byte offset, and requests audio from that range. This is internal resume behavior, not listener seeking.
- The resume target is within 10 seconds of the saved elapsed position for representative Audius tracks. If the server rejects the range, the decoder rejects the ranged MP3, or a reliable offset cannot be calculated, playback restarts the same surviving entry at zero and replaces the cursor rather than failing the Playlist.
- Pause followed by Play in the same session uses the same cursor restoration policy as a process restart. No in-memory decoder or audio buffer is retained while Paused.
- Forward Skip, normal completion, and exhausted track failure set the next entry's elapsed position to zero before opening it. Advancement wraps from the final playable entry to the first.
- The current entry is resolved against the latest manifest by stable entry identity before advancement. If it survives a reorder, the next entry is the one that follows it in the latest order.
- Playlist playback uses the existing Playback Status vocabulary. Connecting covers manifest/stream acquisition, Buffering covers decoder preparation, Playing means audible Playlist audio, Paused retains the cursor, Reconnecting covers bounded API or mirror recovery, and Error means listener action or provider recovery is required.
- Listener-facing failure categories will distinguish Playlist unavailable, track recovery in progress, unsupported stream, playback device unavailable, and general audio playback failure. Internal provider diagnostics remain available to logs without exposing signed URLs or credentials.
- The player shows Playlist name, Audius as provider, current artist/title when available, Playback Status, failure/recovery detail, Play/Pause, forward Skip, and volume. The window title uses the selected Station or Playlist name.
- The forward Skip control is visible only for a selected Playlist and has both a clickable control and a focused-player keyboard shortcut. Existing Space and volume shortcuts retain their meanings.
- The production implementation will absorb validated behavior, not prototype structure. The prototype's network calls, terminal shell, audit output, and proportional-offset experiment remain on the throwaway branch.
- Release requires the shared Playlist behavior suite to pass and each Source Collection to pass its own current API-access and 10-entry/45-minute gates. A failed Playlist is paused from release rather than replaced by another provider.

## Testing Decisions

- The primary test seam is the listener-facing playback service: dispatch commands and observe snapshots, opened stream candidates, cursor writes, and disposal through injected Audius source, native audio, and cursor-store dependencies. This is the highest seam that covers real lifecycle behavior without requiring the network, filesystem, or an audio device.
- Good tests assert externally observable behavior: selection, Playback Status, attribution, fixed order, looping, cursor outcomes, stream candidate order, recovery, and disposal. They do not assert private queue messages, polling implementation, Effect composition, exact helper names, or internal collection types.
- Existing streaming playback tests are prior art for scoped service construction, fake audio engines, command dispatch, asynchronous status observation, Pause disposal, and shutdown cleanup. Existing playback-atom tests are prior art for verifying the UI bridge through commands and snapshots.
- Existing Station integration tests remain the contract tests for Nightwave Plaza. They must continue passing unchanged in behavior, proving Playlist support does not alter Station metadata normalization or the default Station.
- Service tests cover selecting each Playlist while stopped, switching while active, independent cursors, Play, Pause, resume, volume, Skip, normal completion, looping, and Station behavior through the same high-level seam.
- Service tests cover source refresh at track boundaries, additions, removals, reorder, a surviving current entry, a stale current entry, and an unavailable current entry.
- Service tests include duplicate Audius track identities with distinct source entry timestamps and verify that restore and advancement use the exact occurrence.
- Service tests cover all playability flags independently and verify that a populated stream URL never overrides deleted, deactivated, unavailable, or unstreamable state.
- Service tests cover a missing artist, missing title, and missing optional rights metadata while preserving technical playability and available attribution.
- Service tests cover one failed primary stream followed by a successful mirror, all mirrors failing followed by forward advancement, repeated failures dropping below the release floor, and later refresh restoring availability.
- Service tests cover API failure before any manifest, transient refresh failure with an in-memory manifest, bounded recovery exhaustion, stale asynchronous completion after selection changes, and shared Audius failure affecting both Playlists.
- Service tests verify that normal Playlist end advances while normal Station end retains its existing unavailable/error behavior.
- Cursor tests use a fake store through the service seam for ordinary behavior and a small contract suite for the real device-local store. The contract suite covers atomic replacement, one cursor per Playlist, corrupt JSON, unknown versions, missing fields, and no persisted signed URLs or manifest data.
- Elapsed progress tests drive fake played-frame/sample-rate values and verify that buffering time is excluded, checkpoints occur at the five-second policy boundary, and transition writes reset elapsed time appropriately.
- Resume tests verify fresh URL acquisition, calculated Range request, successful ranged playback, restart-at-zero fallback after range rejection or decoder failure, and stale cursor restart at the first playable entry.
- A deterministic representative MP3 fixture with known time markers or frame structure verifies the 10-second resume tolerance without contacting Audius. The test observes decoded position or known frame boundaries rather than merely asserting the byte-offset formula.
- Audius adapter contract tests use captured, redacted fixtures representing the current public Upbeat collection, hidden Lofi collection, duplicate entries, deleted tracks, a deactivated uploader, missing metadata, and mirror lists. They assert normalized external behavior rather than the complete provider payload.
- UI-level tests verify that Station and Playlist sections are distinguishable, unavailable Playlists cannot be activated, Skip appears only for Playlists, current metadata and Audius identity render, and existing keyboard controls remain intact.
- Live Audius calls and real-device audio are not part of the deterministic unit suite. Before release, rerun the captured prototype audit or its production smoke-test successor to verify current collection floors, HTTP ranges, native decode, mirror behavior, fixed-order transition, and small representative concurrency.
- Tests must not depend on a real API key. A separate release smoke test may use the configured read-only key to validate production quota access without printing it.

## Out of Scope

- Adding FluxFM, another ready-made Station, artist-direct files, R2, Radio.co, Jamendo, or any fallback music source.
- Changing Nightwave Plaza's Station identity, stream, metadata contract, live Pause semantics, or default-selection status.
- Listener-created, imported, editable, or shareable Playlists.
- Individual track selection, previous-track navigation, listener seeking, shuffle, reordering, repeat-one, or queue editing.
- Accounts, authentication, cloud synchronization, cross-device cursor state, or social Audius actions.
- Offline playback, audio downloads, persistent audio caching, or persistent Source Collection manifests.
- Guaranteed sample-accurate or gapless resume and transitions. Resume has the explicit best-effort tolerance and fallback defined above.
- Rights, licensing, operator jurisdiction, geographic legal analysis, royalties, or filtering by license metadata.
- Usage analytics, royalty reporting, listening history, recommendations, favorites, reposts, comments, tips, or other Audius social features.
- Supporting arbitrary Audius collections or allowing listeners to enter an Audius URL.
- Multi-region load testing, an Audius SLA, or scale beyond the documented hobby limits and representative release smoke checks.
- Redesigning the entire lofi.fm window or desktop visual language beyond the controls and directory distinctions needed for Playlists.

## Further Notes

- The source strategy is recorded in `.scratch/music-source-strategy/tickets/06-recommend-the-music-source-strategy.md`.
- Canonical vocabulary is recorded in `CONTEXT.md`. The cursor wording there must be updated from track identity to Source Collection entry identity when implementation absorbs this PRD decision.
- Prototype primary source: branch `prototype/audius-playlist-feasibility`, commit `1ce2770`.
- Prototype commands on that branch are `bun run prototype:audius` for interactive playback and `bun run prototype:audius --audit` for the repeatable technical audit.
- Prototype evidence on 2026-08-19 found 28 currently streamable Upbeat entries totaling 102.2 minutes and 17 currently streamable Lofi entries totaling 51.2 minutes.
- Four of five excluded Upbeat entries and two of three excluded Lofi entries still served audio bytes, which is why provider availability flags are authoritative.
- Two of three sampled content mirrors succeeded while one returned 502. Three concurrent sampled streams succeeded.
- Anonymous reads worked and are documented by the current Audius OpenAPI description; production may configure a read-only key for higher limits.
