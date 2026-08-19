# Domain Docs

This is a single-context repo. Engineering skills consume domain documentation using these conventions.

## Before Exploring

- Read `CONTEXT.md` at the repo root when it exists.
- Read relevant architectural decisions under `docs/adr/` when they exist.
- If either location is absent, proceed silently. The domain-modeling skill creates it lazily when a term or architectural decision is resolved.

## File Structure

```text
/
|- CONTEXT.md
|- docs/adr/
`- src/
```

## Consumer Rules

- Use the glossary's canonical vocabulary in issue titles, hypotheses, tests, and implementation plans.
- Reconsider language missing from the glossary before adding a new domain term.
- Surface conflicts with an existing ADR explicitly rather than silently overriding it.
