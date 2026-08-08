# react

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

This project was created using `bun create tui`. [create-tui](https://git.new/create-tui) is the easiest way to get started with OpenTUI.
