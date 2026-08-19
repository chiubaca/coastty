# Add Volume and Host Lifecycle Behavior

Label: wayfinder:task
Parent: ../MAP.md
Status: closed
Assignee: OpenCode
Blocked by: 10-handle-stream-recovery-and-playback-errors.md

## Question

Finish listener and host lifecycle behavior around the working stream: add equivalent mouse and keyboard volume controls with clamping, keep playback running while the window is minimized, Pause and release resources before the player closes or the desktop restarts, and dispose deterministically on process exit. Preserve the accepted compact control hierarchy and add focused checks for command and cleanup semantics where they are cheap and deterministic.

## Comments

### Resolution - 2026-08-19

Implemented in commit `04888f9`. Mouse and keyboard volume controls update a clamped in-memory value and the active native stream. Playback ownership remains in the top-level Effect scope, so minimizing the player does not stop audio. Closing the player and Desktop Restart use an acknowledged Pause command before removing controls, releasing the stream and output device; process-scope finalization rejects late commands, aborts pending work, awaits bounded cleanup, and disposes the engine.

Focused service and Atom bridge tests cover explicit startup, Playing and Paused transitions, stream and engine disposal, pending-open cleanup, command ordering, and rejection of post-shutdown commands.
