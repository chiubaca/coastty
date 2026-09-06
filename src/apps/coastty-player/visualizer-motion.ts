export const BAR_COUNT = 24;

export type MusicFrame = ReturnType<ReturnType<typeof createMusicMotion>["update"]>;

export function barHeights(spectrum: readonly number[], count = BAR_COUNT) {
  const values = spectrum.map((value) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);
  if (values.length === 0) return Array<number>(count).fill(0);
  return Array.from({ length: count }, (_, index) => values[Math.min(values.length - 1, Math.floor(index * values.length / count))]!);
}

export function blobMusicLevels(spectrum: readonly number[]) {
  const values = barHeights(spectrum, spectrum.length);
  const bandSize = Math.ceil(values.length / 3);
  const average = (start: number) => {
    const band = values.slice(start, start + bandSize);
    return band.length === 0 ? 0 : band.reduce((total, value) => total + value, 0) / band.length;
  };
  const bass = average(0);
  const mid = average(bandSize);
  const treble = average(bandSize * 2);
  return { bass, mid, treble, peak: Math.max(bass, mid, treble) };
}

export function spectrumBands(spectrum: readonly number[], count: number) {
  const values = barHeights(spectrum, spectrum.length);
  return Array.from({ length: count }, (_, index) => {
    if (values.length === 0) return 0;
    const start = index * values.length / count;
    const end = (index + 1) * values.length / count;
    let squares = 0;
    // Weight partial bins so narrow transients survive at every viewport width.
    for (let i = Math.floor(start); i < Math.ceil(end); i++) {
      const overlap = Math.min(end, i + 1) - Math.max(start, i);
      squares += (values[i] ?? 0) ** 2 * overlap;
    }
    return Math.sqrt(squares / (end - start));
  });
}

export function smooth(current: number, target: number, seconds: number, rise = 16, fall = 3) {
  if (target === 0 && current < 0.003) return 0;
  return current + (target - current) * (1 - Math.exp(-(target > current ? rise : fall) * seconds));
}

export function createMusicMotion(kind: "bars" | "blob" = "bars") {
  const responsive = kind === "blob";
  // Lift quiet musical detail without amplifying the noise floor or flattening loud passages.
  const lift = (value: number) => Math.pow(Math.max(0, (value - 0.012) / 0.988), 0.65);
  const heights = Array<number>(BAR_COUNT).fill(0);
  let levels = blobMusicLevels([]);
  let previousBass = 0;
  let baseline = 0;
  let cooldown = 0;
  let beat = 0;
  let phase = 0;
  return {
    update(spectrum: readonly number[], delta: number) {
      const seconds = Number.isFinite(delta) ? Math.max(0, Math.min(0.1, delta)) : 0;
      const bands = spectrumBands(spectrum, BAR_COUNT);
      const [bass = 0, mid = 0, treble = 0] = spectrumBands(spectrum, 3).map(lift);
      const target = responsive ? { bass, mid, treble, peak: Math.max(bass, mid, treble) } : blobMusicLevels(spectrum);
      cooldown = Math.max(0, cooldown - seconds);
      baseline = smooth(baseline, target.bass, seconds, 2, 2);
      // An onset is an impulse, never a latched target: a held bass note must not keep pulsing.
      const flux = target.bass - previousBass;
      const onset = seconds > 0 && cooldown === 0
        && target.bass > Math.max(responsive ? 0.09 : 0.25, baseline + (responsive ? 0.025 : 0.08))
        && flux > (responsive ? 0.025 : 0.06);
      beat = onset ? Math.min(1, flux * 2.5 + (responsive ? 0.3 : 0)) : beat * Math.exp(-seconds * 5);
      if (onset) cooldown = responsive ? 0.18 : 0.22;
      if (seconds > 0) previousBass = target.bass;
      const envelope = (current: number, value: number) => smooth(current, value, seconds, responsive ? 28 : 16, responsive ? 7 : 3);
      levels = {
        bass: envelope(levels.bass, target.bass),
        mid: envelope(levels.mid, target.mid),
        treble: envelope(levels.treble, target.treble),
        peak: envelope(levels.peak, target.peak),
      };
      heights.forEach((height, i) => {
        heights[i] = smooth(height, responsive ? lift(bands[i]!) : bands[i]!, seconds, responsive ? 30 : 20, responsive ? 8 : 4);
      });
      phase += seconds * levels.peak;
      return { ...levels, beat, phase, onset, heights, seconds };
    },
  };
}
