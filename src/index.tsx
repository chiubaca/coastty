import * as Registry from "@effect-atom/atom/Registry";
import { RegistryContext } from "@effect-atom/atom-react/RegistryContext";
import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { Desktop } from "./desktop/desktop";
import { OpenTui, OpenTuiLive } from "./runtime/open-tui";

const program = Effect.gen(function* () {
  const openTui = yield* OpenTui;
  const registry = yield* Registry.AtomRegistry;

  yield* openTui.mount(
    <RegistryContext.Provider value={registry}>
      <Desktop />
    </RegistryContext.Provider>,
  );

  yield* openTui.closed;
});

const MainLive = Layer.mergeAll(Registry.layer, OpenTuiLive);

program.pipe(Effect.provide(MainLive), BunRuntime.runMain);
