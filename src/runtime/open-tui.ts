import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ReactNode } from "react";

export class OpenTuiError extends Data.TaggedError("OpenTuiError")<{
  readonly operation: "initialize" | "create-root" | "mount";
  readonly cause: unknown;
}> {}

type OpenTuiService = {
  readonly mount: (node: ReactNode) => Effect.Effect<void, OpenTuiError>;
  readonly closed: Effect.Effect<void>;
};

export class OpenTui extends Context.Tag("lofi-fm/OpenTui")<OpenTui, OpenTuiService>() {}

export const OpenTuiLive = Layer.scoped(
  OpenTui,
  Effect.gen(function* () {
    const closed = yield* Deferred.make<void>();
    const renderer = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          createCliRenderer({
            enableMouseMovement: true,
            onDestroy: () => {
              Effect.runSync(Deferred.succeed(closed, undefined));
            },
          }),
        catch: (cause) => new OpenTuiError({ operation: "initialize", cause }),
      }),
      (renderer) =>
        Effect.sync(() => {
          if (!renderer.isDestroyed) renderer.destroy();
        }).pipe(Effect.andThen(Deferred.await(closed))),
    );
    const root = yield* Effect.try({
      try: () => createRoot(renderer),
      catch: (cause) => new OpenTuiError({ operation: "create-root", cause }),
    });

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        if (!renderer.isDestroyed) root.unmount();
      }),
    );

    return {
      mount: (node) =>
        Effect.try({
          try: () => root.render(node),
          catch: (cause) => new OpenTuiError({ operation: "mount", cause }),
        }),
      closed: Deferred.await(closed),
    } satisfies OpenTuiService;
  }),
);
