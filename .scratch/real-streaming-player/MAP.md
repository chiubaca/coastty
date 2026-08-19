# Ship a Real Streaming lofi.fm Player

Label: wayfinder:map
Status: closed

## Destination

A working, cross-platform-designed lofi.fm player for the lawfully usable Nightwave Plaza stream that explicitly starts playback, honestly identifies the Station as vaporwave/future funk, shows its required current artist/title attribution, supports keyboard and mouse controls for play/pause and volume, and reports connection/error state. The UI shows Station identity without selection controls while the runtime remains extensible; playback is manually verified on macOS in Apple Terminal and one Kitty-capable terminal, with other supported platforms documented accurately as unverified.

## Notes

- Domain: terminal internet radio built with Bun, React, Effect, Effect Atom, and OpenTUI.
- Consult the `opentui` and `domain-modeling` skills in every session; use `research`, `prototype`, or `grilling` as named by each ticket.
- This effort overrides wayfinding's planning default: carry implementation and verification through the map until the working player reaches the destination.
- Playback starts only after an explicit listener action.
- Keep the app free and ad-free; Nightwave Plaza's stream-use permission is conditional on both.
- Preserve the existing retro-desktop visual language and `LofiText` convention.
- Design portably for OpenTUI's macOS, Linux, and Windows native audio targets; this environment can directly verify playback only on macOS.
- Keep automated verification lightweight: run the existing tests and typecheck, and add focused deterministic checks only where they cheaply support an implementation slice.

## Decisions so far

- [Choose Lawful and Dependable Stations](tickets/01-choose-lawful-dependable-stations.md) - Only Nightwave Plaza passed the legal and technical gates; the requested 4-6 exact-genre Station set needs a new sourcing decision.
- [Design the Streaming Audio Runtime](tickets/02-design-streaming-audio-runtime.md) - Own one generation-guarded stream in a top-level scoped Effect service and bridge immutable state and commands to React through Effect Atom.
- [Decide the Playback Lifecycle](tickets/03-decide-playback-lifecycle.md) - Explicit Play governs a seven-state lifecycle with bounded recovery; minimize continues playback, while Pause, close, Restart, terminal Error, and process exit have deliberate cleanup semantics.
- [Prototype the Player Controls](tickets/04-prototype-player-controls.md) - Use the Directory Deck with Nightwave Plaza and attribution beside stacked transport controls, plus non-interactive Coming Soon rows as the expansion seam.
- [Decide How to Resolve the Station Sourcing Gap](tickets/05-decide-station-sourcing-gap.md) - Ship one honestly framed Nightwave Plaza Station now, omit Station selection controls, and defer additional genres and providers to a later effort.
- [Define the Extensible Station Integration Contract](tickets/07-define-extensible-station-integration-contract.md) - Use a validated catalog of direct-stream integrations with pure metadata and failure adapters, keeping Coming Soon slots and all playback effects separate.
- [Play and Pause Nightwave Plaza End to End](tickets/08-play-pause-nightwave-plaza-end-to-end.md) - Shipped the real scoped player in `04888f9`; automated checks passed and playback was manually accepted in Apple Terminal and a Kitty-capable terminal.
- [Show Live Attribution and the Station Directory](tickets/09-show-live-attribution-and-station-directory.md) - Shipped the honest Directory Deck, pure ICY attribution normalization, explicit missing states, and non-interactive Coming Soon slots.
- [Handle Stream Recovery and Playback Errors](tickets/10-handle-stream-recovery-and-playback-errors.md) - Shipped bounded reconnect, Retry and friendly Error paths, generation guards, intentional cancellation, and retained diagnostics.
- [Add Volume and Host Lifecycle Behavior](tickets/11-add-volume-and-host-lifecycle-behavior.md) - Shipped clamped keyboard and mouse volume plus minimize, close, Restart, pending-open, and process-exit lifecycle behavior.
- [Verify and Document the Streaming Player](tickets/12-verify-and-document-streaming-player.md) - Passed automated checks and native endpoint smoke verification; the listener accepted audible playback and controls in Apple Terminal and a Kitty-capable terminal.

## Not yet specified

- None.

## Out of scope

- Downloads and offline playback.
- Listener-supplied stream URLs.
- Accounts, cloud sync, or cross-device preferences.
- Playback-output device selection.
- Advanced waveform or spectrum visualization.
- Additional Station sourcing and exact lofi hip-hop or melodic-techno coverage; pursue provider permissions and expansion as a later effort.
- [Define the Playback Verification Matrix](tickets/06-define-playback-verification-matrix.md) - A robust automated and fault-injection matrix is beyond this effort; use lightweight focused checks and two-terminal macOS manual acceptance instead.
