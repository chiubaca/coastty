import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext } from "@effect-atom/atom-react/RegistryContext";
import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { useState } from "react";
import { Desktop } from "./desktop/desktop";
import { installPlaybackAtoms } from "./radio/playback-atoms";
import { StreamingAudio, StreamingAudioLive } from "./radio/playback";
import { OpenTui, OpenTuiLive } from "./runtime/open-tui";
import { BootScreen } from "./ui/boot-screen";
import { ThemeProvider } from "./ui/theme";

const skipBootSequence = process.argv.includes("--skip-boot-sequence");

function Coastty() {
  const [booted, setBooted] = useState(skipBootSequence);
  const [autoplay, setAutoplay] = useState(true);

  return booted
    ? <Desktop autoplay={autoplay} onRestart={() => setBooted(false)} />
    : <BootScreen onComplete={(musicOn) => {
      setAutoplay(musicOn);
      setBooted(true);
    }} />;
}

const program = Effect.scoped(Effect.gen(function* () {
  const openTui = yield* OpenTui;
  const registry = yield* Registry.AtomRegistry;
  const playback = yield* StreamingAudio;

  yield* installPlaybackAtoms(registry, playback);

  yield* openTui.mount(
    <RegistryContext.Provider value={registry}>
      <ThemeProvider>
        <Coastty />
      </ThemeProvider>
    </RegistryContext.Provider>,
  );

  yield* openTui.closed;
}));

const MainLive = Layer.mergeAll(Registry.layer, OpenTuiLive, StreamingAudioLive);

program.pipe(Effect.provide(MainLive), BunRuntime.runMain);
