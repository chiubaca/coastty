# CoasTTY

To install dependencies:

```bash
bun install
```

To run:

```bash
bun dev
```

## Releases

Pushing a version tag publishes standalone executables for macOS (Apple Silicon
and Intel) and Linux (ARM64 and x64). End users can run these binaries without
installing Bun:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Install the latest release with:

```bash
curl -fsSL https://github.com/chiubaca/coastty/releases/latest/download/install.sh | sh
```

The installer places Coastty in `~/.local/bin` and adds that directory to your
shell's PATH when needed.

Start directly on the desktop instead of showing the boot sequence:

```bash
bun dev --skip-boot-sequence
```

Audius reads work anonymously. Set the optional `AUDIUS_API_KEY` environment
variable to use a read-only key for higher published limits. Playlist cursors
are stored under `~/.coastty/playlist-cursors`; set `COASTTY_STATE_DIR` to use a
different device-local cursor directory.

## Icons

App icons use Nerd Font glyphs from `@kud/glyphs`. Install and select a Nerd Font
in the terminal profile, such as JetBrainsMono Nerd Font. On macOS with Homebrew:

```bash
brew install --cask font-jetbrains-mono-nerd-font
```

Use ASCII icons instead when the terminal does not have a Nerd Font selected:

```bash
COASTTY_ICON_VARIANT=ascii bun dev
```

## Webcam

The Camera app streams mirrored JPEG frames from FFmpeg directly into OpenTUI.
Install FFmpeg before opening it. On macOS with Homebrew:

```bash
brew install ffmpeg
```

macOS will ask for camera access for the terminal running Coastty. The app uses
camera `0` on macOS and `/dev/video0` on Linux by default. Override the FFmpeg
input device when needed:

```bash
COASTTY_CAMERA_DEVICE="1:none" bun dev
```

Press `A` in the Camera app to toggle its live ASCII-art mode. Press `Space` to
turn camera capture on or off.

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
