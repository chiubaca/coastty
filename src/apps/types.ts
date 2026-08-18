import type { ComponentType } from "react";

export type AppScrollState = {
  position: number;
  size: number;
  viewportSize: number;
  scrollTo: (position: number) => void;
};

export type AppComponentProps = {
  appId: string;
  onScrollStateChange?: (state: AppScrollState | null) => void;
};

export type AppManifest = {
  id: string;
  title: string;
  icon: string;
  initialPosition: { left: number; top: number };
  initialSize: { width: number; height: number };
  contentPadding?: number;
  Component: ComponentType<AppComponentProps>;
};
