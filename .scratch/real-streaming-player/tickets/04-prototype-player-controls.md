# Prototype the Player Controls

Label: wayfinder:prototype
Parent: ../MAP.md
Status: closed
Assignee: opencode
Blocked by: none

## Question

What compact retro-desktop player layout makes explicit play/pause, volume, Nightwave Plaza identity, required current artist/title attribution, connection/error feedback, and non-interactive `COMING SOON` expansion slots understandable within the existing COAST.FM window, with equivalent core keyboard and mouse operation and no controls that select an unavailable Station? Build a cheap interactive TUI prototype through the `prototype` and `opentui` skills, test it live with the human, and link the accepted artifact from the resolution.

## Comments

### Resolution - 2026-08-19

Accepted **D - Directory Deck** after live comparison of four interactive 46x16 layouts. Primary asset: [Player controls prototype](../../../src/apps/coastty-player/player-controls.prototype.tsx).

Use this interaction and information hierarchy:

- Keep all five Station choices continuously visible in a left-hand directory, with the Selected Station highlighted.
- Give the right-hand pane a strong display for the Selected Station, Playback Status, and compact listener-facing connection or terminal-error detail.
- Place one prominent context-sensitive Play/Pause control below the display; in Error it reads Retry.
- Place volume decrement, current percentage, and increment together below the primary control.
- Provide equivalent core input: Station rows are clickable and selectable with `1`-`5` or Up/Down; Play/Pause/Retry is clickable and bound to Space; volume controls are clickable and bound to `+`/`-`.
- Preserve the accepted lifecycle behavior in the prototype: changing Station during active playback shows Connecting, inactive selection does not start playback, and raw diagnostics stay out of the compact view.

Station names beyond Nightwave Plaza remain explicitly provisional. Metadata and provider attribution content remain deferred to the Station sourcing decision and should fit into this hierarchy without displacing Playback Status.

### Scope update - 2026-08-19

[Decide How to Resolve the Station Sourcing Gap](05-decide-station-sourcing-gap.md) narrowed this destination to Nightwave Plaza. Prototype one honestly identified Station and its required artist/title attribution; keep the layout compatible with later expansion without exposing disabled or mock Station choices.

### Reopened after concurrent scope change - 2026-08-19

The human superseded the final clause of the scope update: expose four non-interactive `COMING SOON` rows so the player establishes a visible expansion pattern, while Nightwave Plaza remains the only playable Station in this destination. The earlier Directory Deck resolution is superseded pending validation of that revision.

### Final resolution after scope reconciliation - 2026-08-19

Accepted the revised **D - Directory Deck**. Primary asset: [Player controls prototype](../../../src/apps/coastty-player/player-controls.prototype.tsx).

- Keep a left-hand expansion directory with Nightwave Plaza highlighted as the sole available Station and four dimmed, non-interactive `COMING SOON` rows.
- Treat that directory as Station identity and a visible expansion seam, not as a current Station-selection control. Keyboard numbers, Up/Down, and mouse clicks cannot select unavailable rows.
- Use the right-hand display for Nightwave Plaza identity, separate current artist and title attribution, Playback Status, and compact listener-facing connection or terminal-error detail.
- Stack a prominent context-sensitive Play/Pause/Retry control above volume decrement, current percentage, and increment.
- Give every current action equivalent input: Play/Pause/Retry is clickable and bound to Space; volume controls are clickable and bound to `+`/`-`.
- Keep provider-specific future Station behavior outside this visual decision; [Define the Extensible Station Integration Contract](07-define-extensible-station-integration-contract.md) will settle how a `COMING SOON` row becomes an available integration.
