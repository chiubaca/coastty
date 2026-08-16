import { createContext, useContext, type ReactNode } from "react";
import { useStore } from "zustand";
import type { WindowManager, WindowManagerState } from "./window-store";

const WindowContext = createContext<string | null>(null);
const WindowManagerContext = createContext<WindowManager | null>(null);

export function WindowManagerProvider({ manager, children }: { manager: WindowManager; children: ReactNode }) {
  return <WindowManagerContext value={manager}>{children}</WindowManagerContext>;
}

export function WindowProvider({ appId, children }: { appId: string; children: ReactNode }) {
  return <WindowContext value={appId}>{children}</WindowContext>;
}

export function useWindowManager<T>(selector: (state: WindowManagerState) => T): T {
  const manager = useContext(WindowManagerContext);
  if (!manager) throw new Error("useWindowManager must be used inside a window manager");
  return useStore(manager, selector);
}

export function useWindow() {
  const appId = useContext(WindowContext);
  const manager = useContext(WindowManagerContext);
  if (!appId) throw new Error("useWindow must be used inside a window");
  if (!manager) throw new Error("useWindow must be used inside a window manager");
  const focused = useStore(manager, (state) => state.focusedAppId === appId);

  return {
    focused,
    minimize: () => manager.getState().minimize(appId),
    close: () => manager.getState().close(appId),
    setTitle: (title: string) => manager.getState().setTitle(appId, title),
  };
}
