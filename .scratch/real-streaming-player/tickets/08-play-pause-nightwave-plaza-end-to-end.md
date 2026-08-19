# Play and Pause Nightwave Plaza End to End

Label: wayfinder:task
Parent: ../MAP.md
Status: closed
Assignee: OpenCode
Blocked by: none

## Question

Implement the first working vertical slice from the production lofi.fm window to audible Nightwave Plaza playback: add the validated Station catalog and Nightwave Plaza direct-stream integration, own playback in the top-level scoped Effect runtime, bridge immutable state and commands through Effect Atom, and replace the placeholder player with explicit Play and Pause behavior. Cover Stopped, Connecting, Buffering, Playing, and Paused without autoplay; keep playback alive across minimize; reconcile the existing opening sound with the single-engine ownership decision; and add only focused deterministic checks that make this slice safe.

## Comments

### Resolution - 2026-08-19

Implemented in commit `04888f9`. The production player now uses a lazily created, top-level scoped OpenTUI audio engine to play the validated Nightwave Plaza HTTPS MP3 stream after explicit Play. Playback state and commands cross a registry-local Effect Atom bridge; the Directory Deck UI exposes Station identity, honest genre, ICY artist/title attribution, connection and failure state, keyboard and mouse Play/Pause and volume controls, and four non-interactive Coming Soon slots. Minimize preserves playback, while close and Restart wait for Pause; the separate component-owned opening sound was removed.

Automated acceptance passed with 20 tests, 50 assertions, a clean TypeScript typecheck, and a headless native smoke check that decoded the live stream and received `StreamTitle`. The listener manually confirmed the complete flow in Apple Terminal and a Kitty-capable terminal. Linux and Windows remain designed-supported but unverified.
