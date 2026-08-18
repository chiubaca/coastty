# Component Conventions

- Use `LofiText` from `src/ui/lofi-text.tsx` for all TUI text outside the TextEditor app. It disables text selection by default.
- Only use native `<text>` and `<textarea>` within `src/apps/text-editor/` for components that can select and edit text.
