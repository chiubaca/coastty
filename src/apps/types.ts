import type { ComponentType } from "react";

export type AppManifest = {
  id: string;
  title: string;
  icon: string;
  initialPosition: { left: number; top: number };
  initialSize: { width: number; height: number };
  Component: ComponentType;
};
