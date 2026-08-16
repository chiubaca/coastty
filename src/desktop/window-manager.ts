import * as Atom from "@effect-atom/atom/Atom";
import * as Data from "effect/Data";
import * as HashMap from "effect/HashMap";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import type { AppManifest } from "../apps/types";

export class ManagedWindow extends Data.Class<{
  readonly appId: string;
  readonly title: string;
  readonly left: number;
  readonly top: number;
  readonly zIndex: number;
  readonly minimized: boolean;
}> {}

export class WindowManagerState extends Data.Class<{
  readonly windows: HashMap.HashMap<string, ManagedWindow>;
  readonly focusedAppId: Option.Option<string>;
  readonly nextZIndex: number;
}> {}

export type WindowCommand = Data.TaggedEnum<{
  Open: { readonly app: AppManifest };
  Close: { readonly appId: string };
  Minimize: { readonly appId: string };
  Restore: { readonly appId: string };
  Focus: { readonly appId: string };
  Move: { readonly appId: string; readonly left: number; readonly top: number };
  SetTitle: { readonly appId: string; readonly title: string };
}>;

export const WindowCommand = Data.taggedEnum<WindowCommand>();

export const initialWindowManagerState = new WindowManagerState({
  windows: HashMap.empty(),
  focusedAppId: Option.none(),
  nextZIndex: 1,
});

function updateState(state: WindowManagerState, changes: Partial<WindowManagerState>): WindowManagerState {
  return new WindowManagerState({ ...state, ...changes });
}

function openWindow(state: WindowManagerState, app: AppManifest): WindowManagerState {
  if (HashMap.has(state.windows, app.id)) return restoreWindow(state, app.id);

  const window = new ManagedWindow({
    appId: app.id,
    title: app.title,
    left: app.initialPosition.left,
    top: app.initialPosition.top,
    zIndex: state.nextZIndex,
    minimized: false,
  });

  return updateState(state, {
    windows: HashMap.set(state.windows, app.id, window),
    focusedAppId: Option.some(app.id),
    nextZIndex: state.nextZIndex + 1,
  });
}

function closeWindow(state: WindowManagerState, appId: string): WindowManagerState {
  if (!HashMap.has(state.windows, appId)) return state;

  return updateState(state, {
    windows: HashMap.remove(state.windows, appId),
    focusedAppId: Option.exists(state.focusedAppId, (focusedId) => focusedId === appId)
      ? Option.none()
      : state.focusedAppId,
  });
}

function minimizeWindow(state: WindowManagerState, appId: string): WindowManagerState {
  const maybeWindow = HashMap.get(state.windows, appId);
  if (Option.isNone(maybeWindow)) return state;

  return updateState(state, {
    windows: HashMap.set(state.windows, appId, new ManagedWindow({ ...maybeWindow.value, minimized: true })),
    focusedAppId: Option.exists(state.focusedAppId, (focusedId) => focusedId === appId)
      ? Option.none()
      : state.focusedAppId,
  });
}

function restoreWindow(state: WindowManagerState, appId: string): WindowManagerState {
  const maybeWindow = HashMap.get(state.windows, appId);
  if (Option.isNone(maybeWindow)) return state;

  return updateState(state, {
    windows: HashMap.set(
      state.windows,
      appId,
      new ManagedWindow({ ...maybeWindow.value, minimized: false, zIndex: state.nextZIndex }),
    ),
    focusedAppId: Option.some(appId),
    nextZIndex: state.nextZIndex + 1,
  });
}

function focusWindow(state: WindowManagerState, appId: string): WindowManagerState {
  const maybeWindow = HashMap.get(state.windows, appId);
  if (Option.isNone(maybeWindow) || maybeWindow.value.minimized) return state;

  return updateState(state, {
    windows: HashMap.set(
      state.windows,
      appId,
      new ManagedWindow({ ...maybeWindow.value, zIndex: state.nextZIndex }),
    ),
    focusedAppId: Option.some(appId),
    nextZIndex: state.nextZIndex + 1,
  });
}

function moveWindow(state: WindowManagerState, appId: string, left: number, top: number): WindowManagerState {
  const maybeWindow = HashMap.get(state.windows, appId);
  if (Option.isNone(maybeWindow)) return state;

  return updateState(state, {
    windows: HashMap.set(state.windows, appId, new ManagedWindow({ ...maybeWindow.value, left, top })),
  });
}

function setWindowTitle(state: WindowManagerState, appId: string, title: string): WindowManagerState {
  const maybeWindow = HashMap.get(state.windows, appId);
  if (Option.isNone(maybeWindow)) return state;

  return updateState(state, {
    windows: HashMap.set(state.windows, appId, new ManagedWindow({ ...maybeWindow.value, title })),
  });
}

export function reduceWindowManager(state: WindowManagerState, command: WindowCommand): WindowManagerState {
  return Match.valueTags(command, {
    Open: ({ app }) => openWindow(state, app),
    Close: ({ appId }) => closeWindow(state, appId),
    Minimize: ({ appId }) => minimizeWindow(state, appId),
    Restore: ({ appId }) => restoreWindow(state, appId),
    Focus: ({ appId }) => focusWindow(state, appId),
    Move: ({ appId, left, top }) => moveWindow(state, appId, left, top),
    SetTitle: ({ appId, title }) => setWindowTitle(state, appId, title),
  });
}

const windowStateAtom = Atom.make(initialWindowManagerState).pipe(
  Atom.keepAlive,
  Atom.withLabel("desktop/window-state"),
);

export const windowManagerAtom = Atom.writable(
  (get) => get(windowStateAtom),
  (context, command: WindowCommand) => {
    context.set(windowStateAtom, reduceWindowManager(context.get(windowStateAtom), command));
  },
).pipe(Atom.withLabel("desktop/window-manager"));

export const windowsAtom = Atom.map(windowStateAtom, (state) => state.windows).pipe(
  Atom.withLabel("desktop/windows"),
);

export const focusedAppIdAtom = Atom.map(windowStateAtom, (state) => state.focusedAppId).pipe(
  Atom.withLabel("desktop/focused-app-id"),
);

export const windowFocusedAtom = Atom.family((appId: string) =>
  Atom.make((get) => Option.contains(get(focusedAppIdAtom), appId)).pipe(
    Atom.withLabel(`desktop/window-focused/${appId}`),
  ),
);
