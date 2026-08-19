import { useAtomSet } from "@effect-atom/atom-react/Hooks";
import { pausePlaybackThenAtom } from "./playback-atoms";

export function usePlaybackLifecycle() {
  const pauseThen = useAtomSet(pausePlaybackThenAtom);

  return {
    pauseBeforeAppClose: (appId: string, close: () => void) => {
      if (appId === "lofi-player") pauseThen(close);
      else close();
    },
    pauseBeforeRestart: (restart: () => void) => {
      pauseThen(restart);
    },
  };
}
