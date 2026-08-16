# lofi-fm

To install dependencies:

```bash
bun install
```

To run:

```bash
bun dev
```

## Icons

App icons use Nerd Font glyphs from `@kud/glyphs`. Install and select a Nerd Font
in the terminal profile, such as JetBrainsMono Nerd Font. On macOS with Homebrew:

```bash
brew install --cask font-jetbrains-mono-nerd-font
```

Use ASCII icons instead when the terminal does not have a Nerd Font selected:

```bash
LOFI_FM_ICON_VARIANT=ascii bun dev
```

## Effect architecture

The application uses Effect as its process runtime and Effect Atom for shared
reactive state:

- `src/index.tsx` assembles the application `Layer` and runs it with
  `BunRuntime.runMain`.
- `src/runtime/open-tui.ts` acquires OpenTUI in a `Scope`, exposes it through an
  Effect service, and guarantees renderer cleanup.
- `src/desktop/window-manager.ts` models window state with `Data.Class`,
  `HashMap`, and `Option`. Window operations are a `Data.TaggedEnum` interpreted
  by a pure reducer.
- Effect Atom owns shared window and action-status state. The application-scoped
  Atom registry is created by `Registry.layer` and passed to React through
  `RegistryContext`.
- React still owns ephemeral view state such as hover, drag, and editor state.
  These values have component lifetimes and do not belong in the shared runtime.

This project was created using `bun create tui`. [create-tui](https://git.new/create-tui) is the easiest way to get started with OpenTUI.
