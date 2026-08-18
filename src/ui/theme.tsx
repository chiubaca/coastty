import { createContext, useContext, useState, type ReactNode } from "react";

const phosphorColors = {
  background: "#020706",
  shadow: "#174b40",
  border: "#24594e",
  muted: "#356c5e",
  subdued: "#3a806f",
  secondary: "#4ba58e",
  primary: "#5db49d",
  accent: "#7cffc9",
  highlight: "#a5ffe6",
  glow: "#b9ffe8",
  glowSoft: "#d8fff2",
  white: "#ffffff",
} as const;

export type ThemeColors = { readonly [Token in keyof typeof phosphorColors]: string };

type ThemeDefinition = {
  readonly label: string;
  readonly colors: ThemeColors;
};

export const themes = {
  phosphor: {
    label: "PHOSPHOR",
    colors: phosphorColors,
  },
  amber: {
    label: "AMBER CRT",
    colors: {
      background: "#090602",
      shadow: "#4a2505",
      border: "#6d3908",
      muted: "#80501a",
      subdued: "#995f1c",
      secondary: "#b87424",
      primary: "#d18a2c",
      accent: "#ffb52e",
      highlight: "#ffc85c",
      glow: "#ffda8a",
      glowSoft: "#ffedc2",
      white: "#ffffff",
    },
  },
  arcade: {
    label: "ARCADE RGB",
    colors: {
      background: "#090818",
      shadow: "#21183f",
      border: "#40306f",
      muted: "#75649c",
      subdued: "#835da8",
      secondary: "#b33e8f",
      primary: "#7868c7",
      accent: "#56e0e0",
      highlight: "#ffd166",
      glow: "#ff70b7",
      glowSoft: "#d7c7ff",
      white: "#ffffff",
    },
  },
} as const satisfies Record<string, ThemeDefinition>;

export type ThemeId = keyof typeof themes;

const THEME_ORDER = ["phosphor", "amber", "arcade"] as const satisfies readonly ThemeId[];

export function nextThemeId(themeId: ThemeId): ThemeId {
  const currentIndex = THEME_ORDER.indexOf(themeId);
  return THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length] ?? THEME_ORDER[0];
}

type ThemeContextValue = {
  readonly themeId: ThemeId;
  readonly theme: (typeof themes)[ThemeId];
  readonly cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeId: "phosphor",
  theme: themes.phosphor,
  cycleTheme: () => {},
});

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(THEME_ORDER[0]);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme: themes[themeId],
        cycleTheme: () => setThemeId(nextThemeId),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
