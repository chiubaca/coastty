# Show Live Attribution and the Station Directory

Label: wayfinder:task
Parent: ../MAP.md
Status: closed
Assignee: OpenCode
Blocked by: 08-play-pause-nightwave-plaza-end-to-end.md

## Question

Implement the accepted Directory Deck in the production player using `LofiText`: honestly identify Nightwave Plaza as Vaporwave / Future Funk, normalize its ICY `StreamTitle` under the Station integration contract, show separate current artist and title fields with explicit unavailable states, and render four non-interactive Coming Soon slots that cannot be selected by mouse or keyboard. Add focused fixtures for valid, absent, and ambiguous Nightwave Plaza metadata while keeping provider logic out of React.

## Comments

### Resolution - 2026-08-19

Implemented in commit `04888f9`. The production Directory Deck uses `LofiText` throughout, identifies Nightwave Plaza as Vaporwave / Future Funk, and renders separate artist and title attribution from the Station integration's pure ICY `StreamTitle` normalizer. Missing metadata is explicit, ambiguous multi-delimiter values remain title-only, and four Coming Soon slots are visible but have no mouse or keyboard selection behavior.

Focused fixtures cover the observed valid Nightwave Plaza title, absent metadata, and ambiguous metadata without moving provider parsing into React.
