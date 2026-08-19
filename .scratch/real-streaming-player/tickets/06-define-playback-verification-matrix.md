# Define the Playback Verification Matrix

Label: wayfinder:grilling
Parent: ../MAP.md
Status: closed
Assignee: opencode
Blocked by: 04-prototype-player-controls.md

## Question

Which automated checks and macOS manual scenarios must demonstrate explicit start, Nightwave Plaza playback and attribution, play/pause, volume, connection and bounded recovery states, terminal Error behavior, cleanup, and keyboard/mouse equivalence, while documenting Linux and Windows support without claiming unperformed playback verification?

## Comments

### Closed as out of scope - 2026-08-19

The human chose not to define or build a robust automated playback verification suite in this effort. Keep verification lightweight: run the existing test and typecheck commands, add focused deterministic checks where they are cheap and directly support an implementation slice, and manually accept the real Nightwave Plaza path on macOS in Apple Terminal plus one named, versioned Kitty-capable terminal. Do not add a fault-injection harness solely to exercise recovery and terminal Error states.

Linux and Windows remain designed-for but unverified playback targets and must be documented without implying they were run.
