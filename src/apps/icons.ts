import { glyph, type GlyphName } from "@kud/glyphs";

type AppIcon = {
  glyph: GlyphName;
  fallback: string;
};

export function appIcon(icon: AppIcon, useNerdFont = process.env.LOFI_FM_ICON_VARIANT !== "ascii"): string {
  return useNerdFont ? glyph(icon.glyph, "nerd") || icon.fallback : icon.fallback;
}
