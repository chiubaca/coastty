// THROWAWAY PROTOTYPE: pure Playlist rules used by the Audius feasibility probe.

export type PrototypeTrack = {
  readonly entryId: string;
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly durationSeconds: number;
  readonly unavailableReason: "deleted" | "deactivated" | "unavailable" | "unstreamable" | null;
};

export type PrototypePlaylist = {
  readonly id: string;
  readonly name: string;
  readonly tracks: readonly PrototypeTrack[];
};

export type PrototypeCursor = {
  readonly trackId: string;
  readonly elapsedSeconds: number;
};

export type PrototypeRuntime = {
  readonly playlist: PrototypePlaylist;
  readonly playableTracks: readonly PrototypeTrack[];
  readonly currentIndex: number;
  readonly cursor: PrototypeCursor | null;
  readonly transition: string;
};

export function playableTracks(playlist: PrototypePlaylist) {
  return playlist.tracks.filter((track) => track.unavailableReason === null);
}

export function createRuntime(playlist: PrototypePlaylist, cursor: PrototypeCursor | null = null): PrototypeRuntime {
  const playable = playableTracks(playlist);
  const matchingIndexes = cursor
    ? playable.flatMap((track, index) => track.id === cursor.trackId ? [index] : [])
    : [];
  const currentIndex = matchingIndexes[0] ?? 0;

  return {
    playlist,
    playableTracks: playable,
    currentIndex,
    cursor: playable[currentIndex]
      ? { trackId: playable[currentIndex].id, elapsedSeconds: cursor?.elapsedSeconds ?? 0 }
      : null,
    transition: matchingIndexes.length > 1
      ? `restored first of ${matchingIndexes.length} entries sharing track identity ${cursor?.trackId}`
      : cursor && matchingIndexes.length === 0
        ? "stale cursor restarted at first playable entry"
        : cursor
          ? "restored surviving track identity"
          : "started at first playable entry",
  };
}

export function advanceRuntime(runtime: PrototypeRuntime, reason: "completed" | "skipped" | "failed") {
  if (runtime.playableTracks.length === 0) return runtime;
  const currentIndex = (runtime.currentIndex + 1) % runtime.playableTracks.length;
  const current = runtime.playableTracks[currentIndex];
  return {
    ...runtime,
    currentIndex,
    cursor: current ? { trackId: current.id, elapsedSeconds: 0 } : null,
    transition: `${reason} -> next playable entry${currentIndex === 0 ? " (looped)" : ""}`,
  };
}

export function duplicateTrackIds(playlist: PrototypePlaylist) {
  const counts = new Map<string, number>();
  for (const track of playableTracks(playlist)) counts.set(track.id, (counts.get(track.id) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1);
}
