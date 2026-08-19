# Design the Streaming Audio Runtime

Label: wayfinder:research
Parent: ../MAP.md
Status: closed
Assignee: runtime-research-agent
Blocked by: none

## Question

How should OpenTUI's native streaming audio engine be owned, scoped, and exposed through the existing Effect runtime, Effect Atom state, and React views so playback survives ordinary renders, cleans up deterministically, reports stream state and errors, supports reconnection and volume changes, and remains portable across OpenTUI's supported native targets? Capture the recommended boundary and rejected alternatives in a linked research asset.

## Comments

### Resolution - 2026-08-19

Research asset: [Streaming Audio Runtime Research](../research/streaming-audio-runtime.md).

Own one lazily initialized OpenTUI `Audio` engine in a top-level scoped Effect service. A scoped actor serializes one generation-guarded, abortable `AudioStream`; a `SubscriptionRef` snapshot is mirrored through a registry-local Effect Atom adapter, and React receives only immutable state and commands. Use OpenTUI's MP3/FLAC URL streaming, ICY metadata, volume, stats polling, and one configured reconnect policy. Listener-visible pause, close, restart, and retry semantics remain with [Decide the Playback Lifecycle](03-decide-playback-lifecycle.md).
