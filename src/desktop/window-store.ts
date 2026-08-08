import { createStore, type StoreApi } from "zustand/vanilla";
import type { StateCreator } from "zustand";
import type { AppManifest } from "../apps/types";

export type ManagedWindow = {
  appId: string;
  title: string;
  left: number;
  top: number;
  zIndex: number;
  minimized: boolean;
};

export type WindowManagerState = {
  windows: Record<string, ManagedWindow>;
  focusedAppId: string | null;
  nextZIndex: number;
  open: (app: AppManifest) => void;
  close: (appId: string) => void;
  minimize: (appId: string) => void;
  restore: (appId: string) => void;
  focus: (appId: string) => void;
  move: (appId: string, left: number, top: number) => void;
  setTitle: (appId: string, title: string) => void;
};

const createWindowState: StateCreator<WindowManagerState> = (set, get) => ({
  windows: {},
  focusedAppId: null,
  nextZIndex: 1,
  open: (app) => {
    const existing = get().windows[app.id];
    if (existing) {
      get().restore(app.id);
      return;
    }

    const zIndex = get().nextZIndex;
    set((state) => ({
      windows: {
        ...state.windows,
        [app.id]: {
          appId: app.id,
          title: app.title,
          left: app.initialPosition.left,
          top: app.initialPosition.top,
          zIndex,
          minimized: false,
        },
      },
      focusedAppId: app.id,
      nextZIndex: zIndex + 1,
    }));
  },
  close: (appId) => {
    set((state) => {
      const { [appId]: _, ...windows } = state.windows;
      return {
        windows,
        focusedAppId: state.focusedAppId === appId ? null : state.focusedAppId,
      };
    });
  },
  minimize: (appId) => {
    set((state) => {
      const window = state.windows[appId];
      if (!window) return state;
      return {
        windows: { ...state.windows, [appId]: { ...window, minimized: true } },
        focusedAppId: state.focusedAppId === appId ? null : state.focusedAppId,
      };
    });
  },
  restore: (appId) => {
    const window = get().windows[appId];
    if (!window) return;
    const zIndex = get().nextZIndex;
    set((state) => ({
      windows: { ...state.windows, [appId]: { ...window, minimized: false, zIndex } },
      focusedAppId: appId,
      nextZIndex: zIndex + 1,
    }));
  },
  focus: (appId) => {
    const window = get().windows[appId];
    if (!window || window.minimized) return;
    const zIndex = get().nextZIndex;
    set((state) => ({
      windows: { ...state.windows, [appId]: { ...window, zIndex } },
      focusedAppId: appId,
      nextZIndex: zIndex + 1,
    }));
  },
  move: (appId, left, top) => {
    set((state) => {
      const window = state.windows[appId];
      if (!window) return state;
      return { windows: { ...state.windows, [appId]: { ...window, left, top } } };
    });
  },
  setTitle: (appId, title) => {
    set((state) => {
      const window = state.windows[appId];
      if (!window) return state;
      return { windows: { ...state.windows, [appId]: { ...window, title } } };
    });
  },
});

export type WindowManager = StoreApi<WindowManagerState>;

export function createWindowManager(): WindowManager {
  return createStore(createWindowState);
}
