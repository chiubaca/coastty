# Component Conventions

- Use `LofiText` from `src/ui/lofi-text.tsx` for all TUI text outside the TextEditor app. It disables text selection by default.
- Only use native `<text>` and `<textarea>` within `src/apps/text-editor/` for components that can select and edit text.

## Agent skills

### Issue tracker

Issues are tracked as local markdown under `.scratch/`; external pull requests are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-state triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. See `docs/agents/domain.md`.
