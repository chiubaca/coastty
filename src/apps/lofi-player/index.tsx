import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect } from "react";
import type { AppComponentProps } from "../types";
import { windowFocusedAtom, windowManagerAtom, WindowCommand } from "../../desktop/window-manager";
import { playbackCommandAtom, playbackStateAtom } from "../../radio/playback-atoms";
import { PlaybackCommand, type PlaybackStatus } from "../../radio/playback";
import { stationCatalog } from "../../radio/stations";
import { LofiText } from "../../ui/lofi-text";
import { useTheme } from "../../ui/theme";

function canPausePlayback(status: PlaybackStatus) {
  return status === "Connecting"
    || status === "Buffering"
    || status === "Playing"
    || status === "Reconnecting";
}

function statusDetail(status: PlaybackStatus) {
  switch (status) {
    case "Stopped": return "READY - PRESS PLAY";
    case "Connecting": return "OPENING STREAM...";
    case "Buffering": return "BUFFERING AUDIO...";
    case "Playing": return "LIVE AUDIO";
    case "Paused": return "TUNING RETAINED";
    case "Reconnecting": return "RESTORING SIGNAL...";
    case "Error": return "PLAYBACK NEEDS ATTENTION";
  }
}

export function LofiPlayer({ appId }: AppComponentProps) {
  const { theme: { colors } } = useTheme();
  const snapshot = useAtomValue(playbackStateAtom);
  const focused = useAtomValue(windowFocusedAtom(appId));
  const dispatchPlayback = useAtomSet(playbackCommandAtom);
  const dispatchWindow = useAtomSet(windowManagerAtom);
  const volumePercent = Math.round(snapshot.volume * 100);
  const canPause = canPausePlayback(snapshot.status);
  const primaryLabel = snapshot.status === "Error" ? "RETRY" : canPause ? "PAUSE" : "PLAY";
  const artist = snapshot.attribution._tag === "Known" ? snapshot.attribution.artist : "Awaiting metadata";
  const title = snapshot.attribution._tag === "Unavailable" ? "Awaiting metadata" : snapshot.attribution.title;

  function togglePlayback() {
    dispatchPlayback(canPause ? PlaybackCommand.Pause() : PlaybackCommand.Play());
  }

  function adjustVolume(delta: number) {
    dispatchPlayback(PlaybackCommand.SetVolume({ volume: snapshot.volume + delta }));
  }

  useEffect(() => {
    dispatchWindow(WindowCommand.SetTitle({ appId, title: `lofi.fm - ${snapshot.station.name}` }));
  }, [appId, dispatchWindow, snapshot.station.name]);

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "space") togglePlayback();
    else if (key.sequence === "+" || key.sequence === "=") adjustVolume(0.1);
    else if (key.sequence === "-") adjustVolume(-0.1);
  });

  return (
    <box flexGrow={1} flexDirection="row">
      <box width={18} flexDirection="column" backgroundColor={colors.shadow}>
        <box height={1} justifyContent="center" backgroundColor={colors.border}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>STATIONS</LofiText>
        </box>
        {stationCatalog.directory.map((entry, index) => {
          const available = entry._tag === "Station";
          return (
            <box
              key={entry._tag === "Station" ? entry.stationId : entry.id}
              height={2}
              paddingLeft={1}
              justifyContent="center"
              backgroundColor={available ? colors.accent : colors.background}
            >
              <LofiText
                fg={available ? colors.background : colors.muted}
                attributes={available ? TextAttributes.BOLD : TextAttributes.DIM}
              >
                {available ? ">" : " "} {index + 1} {available ? "NIGHTWAVE" : "COMING SOON"}
              </LofiText>
            </box>
          );
        })}
      </box>

      <box flexGrow={1} paddingLeft={1} flexDirection="column">
        <box height={8} border borderColor={colors.border} paddingX={1} flexDirection="column">
          <LofiText fg={colors.muted}>{snapshot.station.provider} // {snapshot.station.genre}</LofiText>
          <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>{snapshot.station.name}</LofiText>
          <LofiText fg={colors.primary}>ARTIST {artist}</LofiText>
          <LofiText fg={colors.primary}>TITLE  {title}</LofiText>
          <LofiText
            fg={snapshot.status === "Error" ? colors.highlight : colors.accent}
            attributes={TextAttributes.BOLD}
          >
            {snapshot.status.toUpperCase()}
          </LofiText>
          <LofiText fg={colors.primary}>
            {snapshot.failure ?? (snapshot.reconnect
              ? `TRY ${snapshot.reconnect.attempt}/${snapshot.reconnect.maxRetries} - ${Math.ceil(snapshot.reconnect.delayMs / 1_000)}s`
              : statusDetail(snapshot.status))}
          </LofiText>
        </box>
        <box
          height={1}
          marginTop={1}
          justifyContent="center"
          backgroundColor={colors.highlight}
          onMouseDown={togglePlayback}
        >
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>[ {primaryLabel} ]</LofiText>
        </box>
        <box height={1} flexDirection="row">
          <box width={4} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => adjustVolume(-0.1)}>
            <LofiText fg={colors.accent}>[-]</LofiText>
          </box>
          <box flexGrow={1} justifyContent="center" backgroundColor={colors.border}>
            <LofiText fg={colors.glow}>VOL {volumePercent}%</LofiText>
          </box>
          <box width={4} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => adjustVolume(0.1)}>
            <LofiText fg={colors.accent}>[+]</LofiText>
          </box>
        </box>
      </box>
    </box>
  );
}
