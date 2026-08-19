# Issue Tracker: Local Markdown

Issues and planning artifacts for this repo live as markdown files in `.scratch/`.

## Conventions

- One effort per directory: `.scratch/<effort-slug>/`.
- A PRD, when present, is `.scratch/<effort-slug>/PRD.md`.
- Implementation issues are `.scratch/<effort-slug>/issues/<NN>-<slug>.md`, numbered from `01`.
- Triage state is recorded as a `Status:` line near the top of each issue file.
- Comments and conversation history append under a `## Comments` heading.

## Publishing And Fetching

When a skill says to publish to the issue tracker, create a file under the appropriate effort directory. When a skill says to fetch a ticket, read the referenced path; the path is the ticket identity.

## Wayfinding Operations

- A wayfinding effort lives in `.scratch/<effort-slug>/`.
- The map issue is `MAP.md` and carries `Label: wayfinder:map` near the top.
- Child tickets live in `tickets/<NN>-<slug>.md` and carry one `wayfinder:<type>` label.
- Each ticket records `Parent: ../MAP.md`, `Status: open|closed`, and `Assignee: unassigned|<name>` near the top.
- Claim a ticket before work by replacing `Assignee: unassigned` with the developer's name.
- Dependencies are recorded as ticket paths on a `Blocked by:` line. Use `Blocked by: none` when there are no dependencies.
- Create all tickets before wiring dependencies so every dependency path exists.
- The frontier is the ordered set of open, unassigned child tickets whose `Blocked by` tickets are all closed.
- Record a resolution by appending it under `## Comments`, setting `Status: closed`, and adding a linked one-line gist to the map's `## Decisions so far` section.
- Open tickets are discovered from `tickets/`; do not duplicate their list in the map body.
