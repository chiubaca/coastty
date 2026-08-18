import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext } from "@effect-atom/atom-react/RegistryContext";
import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { useState } from "react";
import { Desktop } from "./desktop/desktop";
import { OpenTui, OpenTuiLive } from "./runtime/open-tui";
import { BootScreen } from "./ui/boot-screen";
import { ThemeProvider } from "./ui/theme";

function LofiFm() {
  const [booted, setBooted] = useState(false);

  return booted
    ? <Desktop onRestart={() => setBooted(false)} />
    : <BootScreen onComplete={() => setBooted(true)} />;
}

const program = Effect.gen(function* () {
  const openTui = yield* OpenTui;
  const registry = yield* Registry.AtomRegistry;

  yield* openTui.mount(
    <RegistryContext.Provider value={registry}>
      <ThemeProvider>
        <LofiFm />
      </ThemeProvider>
    </RegistryContext.Provider>,
  );

  yield* openTui.closed;
});

const MainLive = Layer.mergeAll(Registry.layer, OpenTuiLive);

program.pipe(Effect.provide(MainLive), BunRuntime.runMain);
