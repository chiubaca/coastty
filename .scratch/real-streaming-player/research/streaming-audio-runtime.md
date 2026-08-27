# Streaming Audio Runtime Research

Research ticket: `../tickets/02-design-streaming-audio-runtime.md`
Resolved against: `@opentui/core` 0.4.5, `effect` 3.22.1, `@effect-atom/atom` 0.7.0, `@effect-atom/atom-react` 0.7.0

## Executive recommendation

Own exactly one OpenTUI `Audio` engine in an application-level Effect `Layer.scoped` service. The service scope must be the same long-lived scope that currently owns the renderer and Atom registry, not a React component and not an Atom whose lifetime depends on subscribers. Prefer creating the engine lazily on the first explicit listener play action so native initialization failures can be published in the already-live player state; create it with `autoStart: false`, then call `audio.start()` as part of that same command. The layer registers cleanup before accepting commands and its finalizer must stop accepting commands, abort and dispose the active/pending stream, await bounded stream cleanup, remove listeners, and finally call `audio.dispose()` if creation succeeded.

Keep at most one logical playback attempt in the service. A playback attempt consists of a monotonically increasing generation, an `AbortController`, a pending `playStreamUrl()` operation, and, once OpenTUI exposes it, one `AudioStream`. Station switching must invalidate the generation and abort/dispose the previous attempt before opening the next one. Every promise continuation, native event callback, poll result, and reconnect notification must carry the generation and be ignored when stale.

Make an immutable, serializable `PlaybackSnapshot` the only observation boundary. Keep it in an Effect `SubscriptionRef` owned by the service. A scoped adapter mirrors snapshots into a private writable Effect Atom and installs a registry-local command sink behind a public writable command atom. React views use `useAtomValue`/`useAtomSet`; they never own or receive `Audio`, `AudioStream`, listeners, abort controllers, promises, or Effect runtimes. This matches the existing window-manager interaction style while ensuring that player unmounts caused by minimize, close, or ordinary renders cannot accidentally end playback.

Use OpenTUI's own URL-stream reconnection rather than adding a second Effect retry loop around it. `playStreamUrl()` in 0.4.5 already handles fetch cancellation, retry classification, exponential delays, `Retry-After`, reconnect events, decoder buffering, and ICY metadata. The service chooses the policy, translates events and polled stats into the snapshot, and decides when retry exhaustion becomes a terminal user-visible error.

The listener-visible meaning of stop/pause, window close, desktop restart, retry, and end-of-stream remains for ticket 03. The runtime boundary supports either policy through explicit commands; it must not infer playback policy from React mount/unmount.

## Current architecture findings

### Process and resource scope

- `src/index.tsx:19-32` runs one Effect program for the process. It acquires `OpenTui` and `AtomRegistry`, mounts one React root, then waits for `openTui.closed`. `BunRuntime.runMain` supplies the process entry point at `src/index.tsx:36`.
- `MainLive` currently merges `Registry.layer` and `OpenTuiLive` (`src/index.tsx:34`). This is the correct scope to extend with streaming-audio ownership: it lasts across React renders and is closed when the renderer/program exits.
- `OpenTuiLive` demonstrates the repository's intended native-resource pattern. It is a `Layer.scoped` (`src/runtime/open-tui.ts:22-62`), acquires the renderer with `Effect.acquireRelease` (`src/runtime/open-tui.ts:26-41`), and registers root cleanup as a finalizer (`src/runtime/open-tui.ts:47-51`). The audio service should use the same pattern.
- `Registry.layer` is itself scoped and calls `registry.dispose()` from its finalizer (`node_modules/@effect-atom/atom/src/Registry.ts:83-101`). The top-level scope therefore gives deterministic ordering/awaiting opportunities that a React cleanup does not.

### React and desktop lifecycle

- `Coastty` switches between boot and desktop trees with local React state (`src/index.tsx:11-17`). The desktop's Restart button only sets `booted` to false (`src/desktop/desktop.tsx:109-123`); it does **not** restart the Effect program, renderer, registry, or top-level layers.
- The player component is created only while its window exists and is not minimized (`src/desktop/desktop.tsx:156-161`). Minimizing therefore unmounts `CoasttyPlayer`; restoring creates it again. Closing also removes and unmounts it through `WindowCommand.Close` (`src/desktop/window-manager.ts:64-73`, `src/desktop/window-frame.tsx:102-107`). Component ownership would couple playback to window visibility.
- The current opening sound is component-owned in `Desktop`: an empty-dependency `useEffect` creates an `Audio`, starts it after an asynchronous file load, and disposes it on desktop unmount (`src/desktop/desktop.tsx:33-55`). That is tolerable for a one-shot boot sound, but it is specifically the wrong lifecycle for persistent radio playback. Desktop restart unmounts this effect, and cancellation is an ad hoc boolean rather than structured scope cleanup.
- `CoasttyPlayer` is currently a presentation stub with one window-manager command (`src/apps/coastty-player/index.tsx:8-25`). There is no current player state or runtime to preserve.

### Existing Atom patterns and tests

- Window state is a pure `Data.Class` reduced by a tagged command union (`src/desktop/window-manager.ts:8-145`). A private `Atom.make(...).pipe(Atom.keepAlive)` stores state, a writable atom dispatches commands, and derived atoms expose narrow read models (`src/desktop/window-manager.ts:147-171`). The playback UI adapter should preserve this shape, while leaving native effects inside the service.
- `useAtomValue` is backed by React `useSyncExternalStore` (`node_modules/@effect-atom/atom-react/src/Hooks.ts:28-57`). This is an appropriate push boundary for immutable playback snapshots.
- `useAtomSet` mounts its writable atom in a React effect (`node_modules/@effect-atom/atom-react/src/Hooks.ts:99-100`, `149-169`). This reinforces why the writable command atom must only be a bridge: component unmount must not own the actor or audio layer.
- Atom registries isolate values and dispose test state explicitly (`src/test/window-manager.test.ts:79-111`). OpenTUI React tests use `createTestRenderer`, mount a root, drive input, and explicitly unmount/destroy/dispose (`src/test/window-manager.test.ts:114-143`). Those are useful UI seams but do not provide an audio fake.
- Locked versions are exact despite the package manifest's OpenTUI caret: `bun.lock:28-30`, `62-80`, and `128` resolve Effect Atom 0.7.0, OpenTUI 0.4.5, and Effect 3.22.1.

## Proposed ownership and API boundary

### Service ownership

Add a conceptual `StreamingAudio` Effect service and `StreamingAudioLive` scoped layer beside `OpenTuiLive`.

The live layer owns:

- One `Audio` engine for its entire scope.
- One service command queue/actor fiber, forked with `Effect.forkScoped`.
- One `SubscriptionRef<PlaybackSnapshot>`.
- Zero or one active playback attempt.
- Engine event listeners and, while a stream exists, stream event listeners and a bounded-rate stats polling fiber.
- A small injected `AudioFactory`/port so service tests do not load a native library.

The layer must use `Audio.create({ autoStart: false })`. Prefer lazy creation inside the service actor on first `Play`, with a service-scope finalizer already registered against the optional engine slot. This keeps the service and its state available if native initialization throws, so the UI can display a typed failure and a later retry can attempt creation again. Once creation succeeds, reuse that engine until service shutdown. Do not use `autoStart: true`: OpenTUI starts the output device during creation in that mode, which would violate the map's explicit-action requirement (`node_modules/@opentui/core/index.bun.js:3797-3818`).

The service should expose effects and values, not native objects:

```ts
type PlaybackCommand =
  | { readonly _tag: "Play"; readonly station: Station }
  | { readonly _tag: "Stop" }
  | { readonly _tag: "SetVolume"; readonly volume: number }
  | { readonly _tag: "Retry" }

interface StreamingAudioService {
  readonly state: SubscriptionRef.SubscriptionRef<PlaybackSnapshot>
  readonly dispatch: (command: PlaybackCommand) => Effect.Effect<void, PlaybackCommandError>
}
```

`dispatch` should enqueue a command and return after acceptance. It should not wait for `playStreamUrl()` to become decoder-ready. This keeps UI command effects short and means unmounting a command atom cannot interrupt ownership work. The actor owns all mutable coordination. Internal startup/event/poll messages use the same queue and include their generation.

Do not export `Audio`, `AudioStream`, an `AbortController`, or setters that can bypass the actor. Do not make React synchronize multiple independent atoms into a coherent transport state. One snapshot update should represent one transport transition.

### Snapshot boundary

The exact listener-facing state names belong to ticket 03, but the runtime snapshot must keep intent and observation distinct so that ticket can decide behavior without changing ownership:

```ts
interface PlaybackSnapshot {
  readonly generation: number
  readonly intent: "idle" | "play" | "stop"
  readonly transport:
    | "idle"
    | "initializing"
    | "buffering"
    | "playing"
    | "reconnecting"
    | "ended"
    | "errored"
    | "disposed"
  readonly station: StationSummary | null
  readonly volume: number
  readonly metadata: StreamMetadata | null
  readonly stats: StreamStatsSummary | null
  readonly reconnect: { readonly attempt: number; readonly delayMs: number } | null
  readonly error: PlaybackFailure | null
}
```

Recommendations for this model:

- Keep Station configuration/domain data separate from transport metadata. The snapshot should carry a stable Station ID and display fallback, not duplicate secret/native connection state.
- Store normalized app volume in the chosen UI range (recommended `0..1`) and clamp before entering OpenTUI. Retain it when stopped and pass it as the initial stream volume on every new attempt.
- Keep diagnostics (`action`, HTTP/native status, decoder code, reconnect attempt, message) in a typed `PlaybackFailure`; expose a separate friendly message selector if needed.
- Include only stats the UI or diagnostics need. Do not push `bigint` counters into presentation unless used. Polling an unchanged snapshot should not trigger an Atom update.
- Clear metadata and reconnect details on every new generation. Never show a previous Station's ICY title while the next Station buffers.

## Effect and Effect Atom integration

### Recommended bridge

The service's `SubscriptionRef` is the Effect-side source of truth. Effect 3.22.1 defines a `SubscriptionRef` as a synchronized ref whose `changes` stream emits the current value and every update (`node_modules/effect/src/SubscriptionRef.ts:28-47`); it is created with `SubscriptionRef.make` (`node_modules/effect/src/SubscriptionRef.ts:180-186`).

Install a scoped UI adapter after both `StreamingAudio` and `AtomRegistry` are available:

1. Fork a scoped consumer of `service.state.changes` that writes each immutable snapshot to a private, registry-local writable Atom.
2. Install a registry-local command sink in a private Atom. The exported writable `playbackCommandAtom` follows the window-manager pattern but forwards its command to that sink. The adapter captures the top-level Effect runtime and the sink starts only the service's short `dispatch` effect; it does not perform networking or mutate native handles itself. Long-running startup remains in the service's scoped actor, not in this detached command invocation.
3. Reset the sink to a closed/no-op implementation in the adapter finalizer before service shutdown so late React input cannot enqueue against a closing runtime.
4. Export derived read atoms for the whole snapshot and narrow view concerns. React uses `useAtomValue` and `useAtomSet` exactly as it does for windows.

This bridge preserves registry isolation: different test registries can install different fake services, just as current window-manager tests demonstrate (`src/test/window-manager.test.ts:79-92`). It also avoids putting imperative native values in Atom state.

The bridge may instead be packaged as a small React context containing a stable `dispatch` function while state remains in Atom. That is slightly simpler, but a writable command atom is more consistent with the current repository and easier to test without React. In either form, the top-level Effect scope remains the owner.

### Why not make `Atom.runtime` the owner

Effect Atom 0.7.0 can construct a runtime from a `Layer`, expose effects with `runtime.fn`, and expose a `SubscriptionRef` with `runtime.subscriptionRef`/`runtime.subscribable` (`node_modules/@effect-atom/atom/src/Atom.ts:535-624`, `630-724`). This is a valid convenience for effects whose lifetime should follow an Atom graph.

It is not the recommended native ownership boundary here:

- Runtime atoms are lazy and subscriber/node lifetime participates in their scope (`node_modules/@effect-atom/atom/src/Atom.ts:652-681`). A player view disappearing must not determine native lifetime.
- `Atom.keepAlive` can pin such a node (`node_modules/@effect-atom/atom/src/Atom.ts:1413-1417`), but that makes a subtle Atom implementation detail responsible for audio ownership.
- Registry node removal runs Atom finalizers, and Effect Atom closes an effect atom's scope by starting `Scope.close` with `Effect.runFork` (`node_modules/@effect-atom/atom/src/Atom.ts:482-518`). The top-level Effect layer is a clearer place to await the service's shutdown protocol before process termination.

`Atom.runtime` remains reasonable for a bridge built from `Layer.succeed(StreamingAudio, alreadyOwnedService)`, because then it does not own the native resource. That option adds little over the fixed command/state adapter and should be used only if Result-valued command atoms are important to the final UI.

## Lifecycle and concurrency rules

### Engine lifecycle

1. Register the optional-engine finalizer during scoped service construction. On first explicit `Play`, create one engine with `autoStart: false`, store it, and attach the engine `error` listener before any fallible operation. If creation throws, publish the initialization error and leave the slot empty so an explicit retry can try again.
2. Do not call `startMixer()` in production. After successful creation, call `audio.start()` in that same explicit `Play`. A `false` result means no usable output device and must become an observable typed failure, not a silent no-op.
3. Once started, keep the engine alive across Station changes and ordinary UI lifecycle. Do not repeatedly create output devices.
4. Whether `Stop` also calls `audio.stop()` is a policy/performance choice for ticket 03. Disposing the active stream is sufficient to stop Station audio. Keeping the engine started makes later play faster; stopping releases the output device. Never use engine `stop()` as an assumed stream pause/resume primitive.
5. On scope shutdown, prevent new dispatch, abort the attempt, dispose the stream, await its `closed` promise with a short upper bound, interrupt poll/actor fibers through the scope, remove listeners, then call `audio.dispose()` in an uninterruptible finalizer.

Effect's `acquireRelease` guarantees that successful acquisition registers an uninterruptible release in the scope (`node_modules/effect/src/Effect.ts:10368-10395`). `forkScoped` keeps the command and polling fibers alive independently of the immediate command caller but interrupts them when the service scope closes (`node_modules/effect/src/Effect.ts:12340-12408`).

### Station switch protocol

For every `Play(station)` or Station-changing command:

1. Validate the Station/format and normalize volume before touching the current attempt.
2. Increment `generation` and publish the new Station with `initializing`, cleared metadata/error/reconnect fields.
3. Abort the old attempt controller. Abort listeners run synchronously; OpenTUI's stream abort listener calls `dispose()` (`node_modules/@opentui/core/index.bun.js:3007-3025`, `3097-3115`). If a stream object was exposed, also call its idempotent `dispose()` and detach service listeners.
4. Start the new attempt only after initiating old-attempt disposal. Do not wait without a bound for remote reader cleanup; OpenTUI bounds attempt cleanup internally while closing the native stream synchronously.
5. Call `audio.start()` if needed, then `audio.playStreamUrl(url, { signal, volume, format, buffer, reconnect, ... })` in a scoped startup fiber.
6. When the promise resolves, compare its generation. If stale, immediately dispose the returned stream and never publish it. If current, attach event listeners synchronously, publish `stream.getMetadata()`, start stats polling, and retain the stream.
7. When the promise rejects, ignore intentional aborts/stale generations. Normalize and publish only a current, non-abort failure.

`playStreamUrl()` resolves only after the native decoder advances its ready generation (`node_modules/@opentui/core/index.bun.js:3033-3047`, `3606-3624`). A switch can therefore occur while its promise is pending. Abort plus generation checking is mandatory; a boolean `cancelled` flag like the opening sound uses is insufficient for repeated switches.

OpenTUI queues metadata discovered before exposure and emits it asynchronously after `open()` resolves (`node_modules/@opentui/core/index.bun.js:3041-3047`, `3689-3707`). Attaching the metadata listener immediately in the promise continuation is expected to catch that event; reading `getMetadata()` at commit time is still required to avoid relying on event ordering.

### Event and polling rules

- Treat the actor as the only snapshot writer. Event handlers enqueue internal messages; they do not mutate state directly.
- Include generation and stream identity with all internal events. OpenTUI emits stream events asynchronously with timers (`node_modules/@opentui/core/index.bun.js:3699-3722`), so events from a just-disposed stream can arrive after a switch.
- Poll only while a current stream exists, at a UI-appropriate interval such as 100-250 ms. `AudioStream` has no buffering/playing state-change event; `getStats()` is the supported observation API.
- Poll immediately after stream commit and after reconnect notifications. Publish only changed values to avoid unnecessary terminal rendering.
- Stop polling on terminal error/end/disposal or generation change.
- Register an `error` listener on both `Audio` and exposed `AudioStream` immediately. Node-style `EventEmitter` gives the `error` event special behavior when unobserved.

## OpenTUI 0.4.5 API facts

The canonical OpenTUI audio document establishes the native miniaudio engine, lifecycle, errors, and output-device behavior:

- `Audio.create`, `start`, `stop`, `isStarted`, and `dispose` are the engine lifecycle (`/Users/chiubaca/.agents/skills/opentui/docs/core-concepts/audio.mdx:14-44`, `62-67`, `130-132`).
- `start()` returns `false` when no output device is available; `startMixer()` is the headless/test path (`audio.mdx:62-67`).
- Engine operations report failures by `false`/`null` and an `error` event with action/status context (`audio.mdx:130-132`).
- The engine supports macOS, Linux, and Windows through native miniaudio, but the local canonical page does not yet document streaming methods. The installed 0.4.5 declarations and source below are the primary authority for streaming behavior.

Exact installed streaming support:

- `Audio` exposes `playStream`, `playStreamUrl`, and `playStreamSource`; all return `Promise<AudioStream>` (`node_modules/@opentui/core/audio.d.ts:263-271`).
- Encoded stream formats are only `"mp3" | "flac"` (`audio.d.ts:33-34`). AAC, Ogg/Vorbis, Opus, HLS playlists, and arbitrary browser formats are not supported by this API in 0.4.5.
- URL streams accept Fetch request options, an abort signal, content-type policy, buffer thresholds, reconnect options, and metadata encoding (`audio.d.ts:63-105`). Direct body streams do not support built-in reconnect; custom connectors use `playStreamSource`.
- Public stream states are `initializing`, `buffering`, `playing`, `reconnecting`, `ended`, `errored`, and `disposed`. Stats include sample rate/channels, buffer occupancy/duration, byte/frame counters, underruns, and reconnect attempts (`audio.d.ts:106-119`).
- `AudioStream` exposes `state`, `getStats`, `getMetadata`, `setVolume`, `setPan`, `setGroup`, `dispose`, and `closed`; it has no pause, resume, seek, or explicit reconnect method (`audio.d.ts:176-243`).
- Stream events are `metadata`, `reconnecting`, `ended`, `error`, and `disposed`. There is no `buffering` or `playing` event (`audio.d.ts:120-145`). Poll `getStats()` for those state changes.
- URL fetches automatically request ICY metadata (`Icy-MetaData: 1`) and automatically choose an ICY demuxer from response headers (`node_modules/@opentui/core/index.bun.js:2894-2944`, `3981-4000`). Metadata contains headers and parsed fields and may be `null` (`audio.d.ts:120-125`, `139-145`).
- Default stream buffering is 2000 ms capacity, 1000 ms startup, and 1000 ms resume; the default format is MP3 (`node_modules/@opentui/core/index.bun.js:2778-2799`, `2864-2868`). These are implementation defaults, not necessarily product-optimal settings.
- Reconnection is opt-in by supplying `reconnect`. Its defaults are infinite retries, 1000 ms initial delay, 15000 ms maximum, factor 2, and `retryOnEnd: false` (`node_modules/@opentui/core/index.bun.js:2744-2776`). The product should choose explicit finite/infinite policy rather than inherit this accidentally.
- Built-in URL retry classification retries fetch failures, HTTP 408/425/429 and 5xx responses, and source read failures. It honors `Retry-After`; content-type policy failures and other non-retryable HTTP statuses terminate (`node_modules/@opentui/core/index.bun.js:2894-2938`, `3520-3604`). Decoder/native errors are terminal in this implementation (`node_modules/@opentui/core/index.bun.js:3578-3589`, `3637-3659`).
- Default URL content-type policy validates MP3 against `audio/mpeg`, `audio/mp3`, `application/octet-stream`, and `application/mp3`; FLAC has its own small allowlist (`node_modules/@opentui/core/index.bun.js:2878-2893`). Known Stations with incorrect headers may require a deliberate override, documented per Station.
- `Audio.dispose()` disposes all streams it owns, stops the mixer, destroys the native engine, and emits `disposed` (`node_modules/@opentui/core/index.bun.js:4199-4215`). Individual stream disposal aborts transport, synchronously closes the native stream, runs bounded source cleanup, emits `disposed`, and resolves `closed` (`node_modules/@opentui/core/index.bun.js:3097-3115`, `3437-3518`, `3727-3744`).
- Stream volume changes are supported with `setVolume(): boolean`; failure also emits stream error context (`node_modules/@opentui/core/index.bun.js:3067-3095`). The app should clamp its own UI range. The canonical page's documented `0..4` native clamp is stated for voice playback, not explicitly for streams (`audio.mdx:46-60`), so do not expose `0..4` as a product guarantee for streams.
- OpenTUI itself owns streams in the engine's internal set until termination/disposal (`node_modules/@opentui/core/index.bun.js:4009-4031`). The app still needs a single logical current-attempt invariant to avoid stale control and display.

## Error, reconnect, and metadata handling

### Error normalization

Normalize all failure paths into `PlaybackFailure` while retaining diagnostic context:

- Engine initialization: `AudioInitializationError.action` can be `resolveRenderLib`, `createAudioEngine`, or `start` (`node_modules/@opentui/core/audio.d.ts:166-175`).
- Output start: `audio.start() === false` plus the engine `error` event.
- Stream setup promise rejection: fetch, response validation, source, demuxer, create, or decoder failure before the stream is exposed.
- Exposed stream `error`: retain `AudioStreamErrorContext.action`, `status`, `errorCode`, and `attempt` (`audio.d.ts:126-145`).
- Poll failure or unknown native state.
- Command validation, such as unsupported format or out-of-range volume.

An intentional abort due to switch, stop, or shutdown is not a user-visible error. Preserve the last terminal error until retry/new play, but clear it when a new generation starts. Engine events that occur without a current stream should still be visible if they affect future playback.

### Reconnection

Configure reconnect once in `playStreamUrl`; do not wrap it in `Effect.retry`, which would create nested retry policies and could overlap streams. Translate `reconnecting` events to the snapshot, including attempt and delay. Continue polling because native state also becomes `reconnecting` and later returns to buffering/playing.

OpenTUI resets its consecutive retry counter once the decoder becomes ready while retaining total reconnect attempts in stats (`node_modules/@opentui/core/index.bun.js:3593-3623`). Ticket 03 should decide whether the user sees consecutive attempts, total attempts, or only a reconnecting label.

`retryOnEnd` is false by default. Internet radio responses may end cleanly during server rotation, so the Station research and lifecycle ticket must decide whether curated Stations opt into retry-on-end. A clean end without that option produces `ended`, not an error.

### Metadata

Use `playStreamUrl` automatic ICY handling for ordinary Stations. Map provider-specific fields such as `StreamTitle` into an app metadata type without assuming every Station supplies them. Keep the raw normalized fields only if diagnostics need them. Always provide Station-name fallback text.

Metadata is attempt-scoped:

- Clear it before a new connection.
- Accept `metadata` events only for the current generation.
- Handle `null` as removal, not as an error.
- Read `getMetadata()` when committing a newly exposed stream.
- Let ticket 01 determine which Stations actually emit ICY metadata and what attribution may be shown.

## Portability

- `@opentui/core` 0.4.5 ships optional native packages for Darwin arm64/x64, Linux arm64/x64 with glibc and musl, and Windows arm64/x64 (`node_modules/@opentui/core/package.json:77-85`; lock entries `bun.lock:64-78`). Do not import a target package directly or branch on operating system in the player service.
- Keep the adapter on public `@opentui/core` APIs. Do not depend on Zig status constants or private fields discovered in bundled source.
- Use `playStreamUrl`/global Fetch and URL strings. Avoid shell players, CoreAudio/AVFoundation commands, Linux-only ALSA flags, or Bun file APIs in the streaming path.
- The current application is Bun-based (`package.json:2-9`) and OpenTUI exports a Bun build. The canonical audio page says Node standalone executables are "Coming soon" (`audio.mdx:68-90`); do not claim compiled Node portability. This does not preclude supported native development/runtime targets through the package's normal exports.
- Network behavior, TLS roots, audio-device availability, and native package installation still vary by target. Only macOS can be audibly verified in this workspace, as the map notes. Document Linux/Windows as designed-supported until CI/manual evidence exists.
- Restrict curated Stations to direct MP3 or FLAC byte streams. Redirects handled by Fetch are acceptable; playlist documents and HLS must be resolved/rejected before entering the audio service.
- Keep device selection out of this boundary because the map explicitly excludes it. `audio.start()` failure must nevertheless produce a useful no-output-device state.

## Testing strategy

### Pure model and actor tests

Define a narrow injected port around only the OpenTUI methods/events used by the service. A fake factory should create a fake engine and controllable fake streams. Do not mock `@opentui/core` globally and do not require native audio for ordinary tests.

Cover at least:

- Engine is not created or started before explicit play, is reused after successful creation, and is disposed exactly once when the service scope closes. A thrown initialization leaves the service observable and can be retried without leaking an engine.
- Repeated React/Atom reads and component mount/unmount do not create or dispose the engine.
- Minimize-equivalent subscriber removal leaves the service and current stream alive.
- A Station switch aborts/disposes the previous attempt before accepting the next current stream.
- A slow first `playStreamUrl` resolves/rejects after a second selection; its stream is disposed and its metadata/error never reaches state.
- Events queued by an old stream after disposal are ignored by generation.
- Volume is clamped, retained while idle, passed to new streams, and sent to the current stream. A failed native volume update becomes a current-generation error/diagnostic according to the selected policy.
- Reconnecting, buffering, playing, ended, error, metadata, and null metadata produce coherent single-snapshot transitions.
- Stop and layer shutdown abort a pending startup as well as an exposed stream.
- Finalization remains bounded if a fake source's close never resolves.

Use Effect's scoped test execution and `TestClock` for service-owned actor/poll timing. OpenTUI's internal retry timers are outside the Effect clock, so fake reconnect events rather than sleeping through native implementation delays in unit tests.

### Atom bridge and React tests

- Create separate `Registry.make()` instances and install separate fake service bridges; prove state and commands remain isolated, following `src/test/window-manager.test.ts:79-111`.
- Subscribe to the public state atom and assert ordered snapshots from the fake service.
- Set the writable command atom and assert exactly one command reaches the fake service.
- Dispose the bridge/registry and assert commands are rejected/no-op and subscriptions are removed.
- With `createTestRenderer`, open, minimize, and restore the player window. Assert view state follows the Atom while the fake service's stream remains alive. UI tests should not instantiate native audio.

### OpenTUI integration and manual verification

- OpenTUI's installed `@opentui/core/testing` package provides renderer testing, not an audio backend fake; there are no installed audio tests or public fake engine under `node_modules/@opentui/core/tests`.
- For a platform-gated native smoke test, use `Audio.create({ autoStart: false })`, `startMixer()` (not an output device), and a small committed MP3/FLAC fixture delivered by a finite `AsyncIterable`. Assert setup, stats, end, disposal, and no leaked handle. This tests decode/mix without audible output, as the canonical docs recommend (`audio.mdx:62-67`).
- A deterministic local HTTP server can verify `playStreamUrl`, ICY headers/metadata, abort, reconnect classification, and clean end without relying on public Stations. Native decode still makes this an integration test.
- Perform final manual macOS checks with the selected real Stations: explicit start, audible switch, volume extrema, disconnect/reconnect, bad endpoint, minimize/restore, close behavior, desktop restart behavior, and process exit with no continued audio/hang.
- Record Linux and Windows as unverified unless run on those targets; typecheck and fake-port tests are not evidence of audible native playback.

## Alternatives and tradeoffs

### React component ownership: reject

Creating `Audio`/`AudioStream` in `CoasttyPlayer.useEffect` is superficially simple and resembles the opening sound. It is incorrect because minimizing and closing unmount the app (`src/desktop/desktop.tsx:156-161`), React development/reconciliation can repeat effect setup, asynchronous switch callbacks need manual cancellation, and process cleanup becomes indirect. It also makes playback policy an accidental consequence of view presence.

Owning it in `Desktop` avoids minimize unmount but still ends on the current Restart UI and couples a domain resource to presentation. It would also force prop/context plumbing and duplicate the existing Effect scope.

### Module singleton: reject

A module-level `const audio = Audio.create(...)` survives React renders but has no deterministic acquisition failure channel or scope finalizer, starts during import, complicates tests and hot reload, leaks across Atom registries, and can retain stale listeners/streams after a runtime restart. It is especially risky with Bun watch mode. A singleton is less code only by omitting lifecycle behavior the ticket requires.

### Effect scoped service: accept

This aligns with `OpenTuiLive`, gives typed acquisition/command failures, serializes concurrent commands, supports dependency injection, and guarantees a release path. It remains independent of React/window visibility and is portable because its live adapter uses only public OpenTUI APIs. The cost is a small service/bridge abstraction and explicit conversion of EventEmitter callbacks/promises into actor messages.

### Atom-owned scoped runtime: reject as owner, allow as adapter

`Atom.runtime(StreamingAudioLive)` plus `runtime.subscribable` and `runtime.fn` is concise. With a deliberately keep-alive state atom it could survive view unmount and registry disposal eventually closes it. However, native lifetime then depends on Atom graph details, startup is tied to first Atom evaluation, and registry disposal does not provide as explicit an awaited shutdown sequence as the top-level program scope. Use `Atom.runtime` only around an already top-level-owned service if command Result atoms materially improve the UI.

### State only in Effect Atom: reject

Letting native callbacks call `registry.set` directly removes one bridge stream, but it makes the transport service depend on a UI registry and weakens non-React testing/reuse. `SubscriptionRef` is the better Effect-side truth; the scoped adapter is small and makes ownership explicit.

### Separate Effect retry loop: reject

Wrapping `playStreamUrl` with `Effect.retry` would compete with OpenTUI's own reconnect state, abort controller, native stream restart, HTTP classification, and `Retry-After` support. It risks duplicate streams and misleading attempt counts. Configure one retry policy in OpenTUI and observe it.

### Recreate the engine for each Station: reject

This would churn output devices, increase switch latency, broaden failure windows, and discard engine-level settings. Reuse one engine and replace only the stream.

## Open questions deferred to playback-lifecycle ticket

Ticket 03 must decide these user-visible policies; this runtime can implement any of them without changing ownership:

- Does Play select-and-start immediately, or can Station selection be separate from play intent?
- Does "pause" dispose the stream and reconnect on resume, or stop/start the whole engine? OpenTUI 0.4.5 has no stream pause/resume API, so true buffered resume is not available.
- After `Stop`, should the engine remain started for fast resume or call `audio.stop()` to release the output device?
- Does minimizing continue playback? The recommended default is yes because minimize is view-only, but the lifecycle ticket owns the listener-facing rule.
- Does closing the player window continue playback, stop it, or leave a desktop-level playback indicator?
- Does the current desktop Restart button stop playback, preserve it through the boot screen, or explicitly rebuild the audio scope? It currently restarts only React content, not the runtime.
- What retry count/backoff and `retryOnEnd` policy applies, and what action moves terminal `errored` back to connecting?
- During Station switching, does failure leave the failed new Station selected, revert display to the old Station (which has already stopped), or remain stopped?
- Should volume changes apply while stopped and persist only in memory or beyond process lifetime?
- Which transport details are visible: buffering percentage, reconnect attempt/delay, underruns, terminal reason?
- Is ICY `StreamTitle` shown as track metadata, and how does provider attribution from ticket 01 coexist with it?
- What should a clean finite end mean for an internet-radio Station?

The runtime invariant should remain fixed regardless: view lifecycle never implicitly mutates playback; all policy enters as explicit `PlaybackCommand`s.

## Proposed resolution comment

Research complete: recommend one `Audio` engine in a top-level Effect scoped `StreamingAudio` service, with one generation-guarded/abortable `AudioStream` attempt managed by a scoped actor. Publish an immutable `SubscriptionRef` snapshot through a registry-local Effect Atom bridge and forward writable command-atom input to the service; React owns no native handles, so minimize/renders cannot stop playback. Use OpenTUI 0.4.5 `playStreamUrl` for MP3/FLAC, ICY metadata, abort, stats, volume, and one configured reconnect policy; poll stats for buffering/playing because those events do not exist. Finalize by aborting/disposing/awaiting the stream and disposing the engine. Listener-visible pause/close/restart/retry semantics are deferred to ticket 03. Asset: `../research/streaming-audio-runtime.md`.
