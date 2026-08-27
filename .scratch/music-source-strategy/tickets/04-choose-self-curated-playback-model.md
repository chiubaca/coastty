# Choose the Self-Curated Playback Model

Label: wayfinder:grilling
Parent: ../MAP.md
Status: closed
Assignee: opencode
Blocked by: 03-compare-self-curated-playback-models.md

## Question

After comparing shared continuously programmed and per-listener playback, which model or models should the final source recommendation carry forward for CoasTTY? Resolve the product meaning of self-curation through a live grilling and domain-modeling session, including whether the chosen listener-facing concept remains a Station or introduces a distinct canonical term.

## Comments

### Resolution - 2026-08-19

Carry both playback models into the final source recommendation as distinct candidate families, without committing CoasTTY to implementing either or both:

- A self-curated **Station** is one continuous program curated by the CoasTTY operator. All listeners join the same live position, and the existing Station vocabulary and playback semantics remain unchanged.
- A self-curated **Playlist** is an operator-curated finite collection in a fixed order. Each listener has an independent cursor persisted on their device, can pause, resume, and skip forward, and loops to the first track at the end. It does not provide previous-track navigation, seeking, shuffle, reordering, direct track selection, listener-supplied music, accounts, or cloud sync.

Here, "self-curated" means curated by the CoasTTY operator rather than by each listener. The source ranking must evaluate Station and Playlist paths separately because their catalog, playback-service, rights, reporting, state, and cost requirements differ. It may conclude that one model has no practical hobby-scale worldwide path; carrying both forward is an instruction to investigate both, not to force a positive recommendation.

The distinct Playlist concept is recorded in [`CONTEXT.md`](../../../CONTEXT.md). No new ticket is needed: [Rank Self-Curated Music Sources and Services](05-rank-self-curated-music-sources.md) already owns the now-sharpened comparison.
