import type { BoxRenderable } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { CoasttyText } from "../../ui/coastty-text";
import type { ThemeColors } from "../../ui/theme";
import { createMusicMotion, type MusicFrame } from "./visualizer-motion";

export function createAsciiStarfield(random = Math.random) {
  const glyphs = [".", "*", ".", "+", "'", ".", "*", "o"] as const;
  const cycle = () => ({
    duration: 2.8 + random() * 4.2,
    rest: 0.45 + random() * 2.8,
    brightness: 0.22 + random() * 0.13,
    warm: random() > 0.8,
  });
  const stars = Array.from({ length: 24 }, (_, id) => {
    const timing = cycle();
    return {
      ...timing, id, glyph: glyphs[id % glyphs.length]!,
      age: (random() - 0.25) * timing.duration,
      left: 0, top: 0, placed: false,
    };
  });
  let previousWidth = 0;
  let previousHeight = 0;

  return {
    update(music: MusicFrame, width: number, height: number, delta: number) {
      const seconds = Number.isFinite(delta) ? Math.max(0, Math.min(0.1, delta)) : 0;
      if (width !== previousWidth || height !== previousHeight) {
        stars.forEach((star) => { star.placed = false; });
        previousWidth = width;
        previousHeight = height;
      }
      if (width < 28 || height < 9) return [];
      const active = stars.slice(0, Math.min(stars.length, Math.max(4, Math.floor(width * height / 115))));
      for (const star of active) {
        star.age += seconds;
        if (star.age >= star.duration) {
          const overshoot = star.age - star.duration;
          Object.assign(star, cycle());
          star.age = overshoot - star.rest;
          star.glyph = glyphs[Math.floor(random() * glyphs.length)]!;
          star.placed = false;
        }
        if (star.placed) continue;
        // Relocate only between fades. Reserve even dark stars' cells so a new arrival
        // cannot abruptly hide a neighbour that is already shining.
        for (let attempt = 0; attempt < 32; attempt++) {
          const left = 2 + Math.floor(random() * (width - 4));
          const top = 1 + Math.floor(random() * (height - 2));
          const x = left / (width - 1) * 2 - 1;
          const y = top / (height - 1) * 2 - 1;
          if (x * x + y * y < 0.3) continue;
          if (active.some((other) => other !== star && other.placed
            && Math.abs(other.left - left) < 4 && Math.abs(other.top - top) < 2)) continue;
          star.left = left;
          star.top = top;
          star.placed = true;
          break;
        }
      }
      // Time drives independent twinkles even during silence; music only lifts their brightness.
      const shimmer = music.peak === 0 ? 0 : music.treble * 0.35 + music.peak * 0.12 + music.beat * 0.04;
      return active.filter((star) => star.placed).map((star) => ({
        id: star.id, left: star.left, top: star.top, glyph: star.glyph, warm: star.warm,
        opacity: star.age <= 0 ? 0 : Math.sin(Math.PI * star.age / star.duration) ** 2 * star.brightness * (1 + shimmer),
      }));
    },
  };
}

export function AsciiStarfield({ spectrum, colors }: { readonly spectrum: readonly number[]; readonly colors: ThemeColors }) {
  const renderer = useRenderer();
  const spectrumRef = useRef(spectrum);
  spectrumRef.current = spectrum;
  const [animation] = useState(() => ({ stars: createAsciiStarfield(), music: createMusicMotion("blob") }));
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [frame, setFrame] = useState<ReturnType<typeof animation.stars.update>>([]);

  useEffect(() => {
    setFrame(animation.stars.update(animation.music.update(spectrumRef.current, 0), size.width, size.height, 0));
    let elapsed = 0;
    const animate = async (delta: number) => {
      if (!Number.isFinite(delta) || delta <= 0) return;
      elapsed += delta;
      if (elapsed < 80) return;
      const seconds = elapsed / 1_000;
      elapsed = 0;
      const music = animation.music.update(spectrumRef.current, seconds);
      setFrame(animation.stars.update(music, size.width, size.height, seconds));
    };
    renderer.setFrameCallback(animate);
    return () => renderer.removeFrameCallback(animate);
  }, [animation, renderer, size]);

  return (
    <box
      position="absolute" top={1} bottom={0} left={0} right={0} overflow="hidden"
      live={size.width >= 28 && size.height >= 9}
      onSizeChange={function(this: BoxRenderable) {
        const { width, height } = this;
        setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
      }}
    >
      {frame.map((star) => (
        <CoasttyText
          key={star.id} position="absolute" left={star.left} top={star.top} width={1} height={1}
          fg={star.warm ? colors.highlight : colors.glowSoft} opacity={star.opacity}
        >
          {star.glyph}
        </CoasttyText>
      ))}
    </box>
  );
}
