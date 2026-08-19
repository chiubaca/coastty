# Handle Stream Recovery and Playback Errors

Label: wayfinder:task
Parent: ../MAP.md
Status: closed
Assignee: OpenCode
Blocked by: 09-show-live-attribution-and-station-directory.md

## Question

Complete the decided Reconnecting and Error paths end to end: apply the bounded shared reconnect policy, generation guards, intentional-cancellation rules, generic failure mapping plus optional pure Station refinement, listener-facing error detail, and Retry behavior. Ensure stale attempts and metadata cannot overwrite the current snapshot, preserve raw diagnostics outside the compact UI, and add focused deterministic checks without expanding into the out-of-scope fault-injection matrix.

## Comments

### Resolution - 2026-08-19

Implemented in commit `04888f9`. The scoped playback actor uses generation-guarded attempts, aborts intentional cancellations without surfacing them as failures, and configures OpenTUI's bounded five-attempt reconnect policy with exponential delays, `Retry-After` handling, and clean-end recovery. Reconnecting progress and the four agreed listener-facing failure categories are published in the immutable snapshot; Play becomes Retry in Error.

Stale stream, metadata, error, and polling messages are rejected by generation. Shared and optional Station failure classification remain pure, while native diagnostics are retained through Effect logging outside the compact UI.
