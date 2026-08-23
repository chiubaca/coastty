import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import { TextAttributes, type KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect } from "react";
import type { AppComponentProps } from "../types";
import { windowFocusedAtom, windowManagerAtom, WindowCommand } from "../../desktop/window-manager";
import { playbackCommandAtom, playbackStateAtom } from "../../radio/playback-atoms";
import {
  PlaybackCommand,
  type PlaybackCommand as PlaybackCommandType,
  type PlaybackSnapshot,
  type PlaybackStatus,
} from "../../radio/playback";
import { LofiText } from "../../ui/lofi-text";
import { themes, useTheme, type ThemeColors } from "../../ui/theme";

function canPausePlayback(status: PlaybackStatus) {
  return status === "Connecting"
    || status === "Buffering"
    || status === "Playing"
    || status === "Reconnecting";
}

function statusDetail(snapshot: PlaybackSnapshot) {
  switch (snapshot.status) {
    case "Stopped": return "READY - PRESS PLAY";
    case "Connecting": return snapshot.selected._tag === "Playlist" ? "OPENING TRACK..." : "OPENING STREAM...";
    case "Buffering": return "BUFFERING AUDIO...";
    case "Playing": return snapshot.selected._tag === "Playlist" ? "PLAYLIST AUDIO" : "LIVE AUDIO";
    case "Paused": return snapshot.selected._tag === "Playlist" ? "POSITION RETAINED" : "TUNING RETAINED";
    case "Reconnecting": return snapshot.selected._tag === "Playlist" ? "TRYING AUDIUS MIRROR..." : "RESTORING SIGNAL...";
    case "Error": return "PLAYBACK NEEDS ATTENTION";
  }
}

export function playbackCommandForKey(key: Pick<KeyEvent, "name" | "sequence">, snapshot: PlaybackSnapshot) {
  const canPause = canPausePlayback(snapshot.status);
  if (key.name === "space") return canPause ? PlaybackCommand.Pause() : PlaybackCommand.Play();
  if (key.sequence === "+" || key.sequence === "=") return PlaybackCommand.SetVolume({ volume: snapshot.volume + 0.1 });
  if (key.sequence === "-") return PlaybackCommand.SetVolume({ volume: snapshot.volume - 0.1 });
  if (key.sequence?.toLowerCase() === "n" && snapshot.selected._tag === "Playlist") return PlaybackCommand.Skip();
  return null;
}

type LofiPlayerViewProps = {
  readonly snapshot: PlaybackSnapshot;
  readonly dispatch: (command: PlaybackCommandType) => void;
  readonly colors?: ThemeColors;
};

export function LofiPlayerView({ snapshot, dispatch, colors = themes.phosphor.colors }: LofiPlayerViewProps) {
  const volumePercent = Math.round(snapshot.volume * 100);
  const canPause = canPausePlayback(snapshot.status);
  const primaryLabel = snapshot.status === "Error" ? "RETRY" : canPause ? "PAUSE" : "PLAY";
  const artist = snapshot.track?.artist
    ?? (snapshot.attribution._tag === "Known" ? snapshot.attribution.artist : "Awaiting metadata");
  const title = snapshot.track?.title
    ?? (snapshot.attribution._tag === "Unavailable" ? "Awaiting metadata" : snapshot.attribution.title);

  const togglePlayback = () => dispatch(canPause ? PlaybackCommand.Pause() : PlaybackCommand.Play());
  const adjustVolume = (delta: number) => dispatch(PlaybackCommand.SetVolume({ volume: snapshot.volume + delta }));

  return (
    <box flexGrow={1} flexDirection="row">
      <box width={19} flexDirection="column" backgroundColor={colors.shadow}>
        <box height={1} justifyContent="center" backgroundColor={colors.border}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>STATION</LofiText>
        </box>
        {snapshot.directory.stations.map((choice, index) => {
          const available = choice._tag === "Station";
          const selected = available && snapshot.selected._tag === "Station" && snapshot.selected.id === choice.id;
          return (
            <box
              key={choice.id}
              height={1}
              paddingLeft={1}
              justifyContent="center"
              backgroundColor={selected ? colors.accent : available ? colors.shadow : colors.background}
              onMouseDown={available ? () => dispatch(PlaybackCommand.Select({ choice: { _tag: "Station", id: choice.id } })) : undefined}
            >
              <LofiText
                fg={selected ? colors.background : available ? colors.primary : colors.muted}
                attributes={selected ? TextAttributes.BOLD : available ? undefined : TextAttributes.DIM}
              >
                {selected ? ">" : " "} {index + 1} {choice.name.toUpperCase()}
              </LofiText>
            </box>
          );
        })}
        <box height={1} justifyContent="center" backgroundColor={colors.border}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>PLAYLISTS</LofiText>
        </box>
        {snapshot.directory.playlists.map((choice, index) => {
          const selected = snapshot.selected._tag === "Playlist" && snapshot.selected.id === choice.id;
          return (
            <box
              key={choice.id}
              height={1}
              paddingLeft={1}
              justifyContent="center"
              backgroundColor={selected ? colors.accent : choice.available ? colors.shadow : colors.background}
              onMouseDown={choice.available ? () => dispatch(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: choice.id } })) : undefined}
            >
              <LofiText
                fg={selected ? colors.background : choice.available ? colors.primary : colors.muted}
                attributes={selected ? TextAttributes.BOLD : choice.available ? undefined : TextAttributes.DIM}
              >
                {selected ? ">" : " "} {index + 1} {choice.name.toUpperCase()}{choice.available ? "" : " [OFF]"}
              </LofiText>
            </box>
          );
        })}
      </box>

      <box flexGrow={1} paddingLeft={1} flexDirection="column">
        <box height={8} border borderColor={colors.border} paddingX={1} flexDirection="column">
          <LofiText fg={colors.muted}>{snapshot.selected._tag.toUpperCase()} // {snapshot.selected.provider}</LofiText>
          <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>{snapshot.selected.name}</LofiText>
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
              : statusDetail(snapshot))}
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
        {snapshot.selected._tag === "Playlist" ? (
          <box height={1} justifyContent="center" backgroundColor={colors.accent} onMouseDown={() => dispatch(PlaybackCommand.Skip())}>
            <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>[ NEXT : N ]</LofiText>
          </box>
        ) : null}
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

export function LofiPlayer({ appId }: AppComponentProps) {
  const { theme: { colors } } = useTheme();
  const snapshot = useAtomValue(playbackStateAtom);
  const focused = useAtomValue(windowFocusedAtom(appId));
  const dispatchPlayback = useAtomSet(playbackCommandAtom);
  const dispatchWindow = useAtomSet(windowManagerAtom);

  useEffect(() => {
    dispatchWindow(WindowCommand.SetTitle({ appId, title: `lofi.fm - ${snapshot.selected.name}` }));
  }, [appId, dispatchWindow, snapshot.selected.name]);

  useKeyboard((key) => {
    if (!focused) return;
    const command = playbackCommandForKey(key, snapshot);
    if (command) dispatchPlayback(command);
  });

  return <LofiPlayerView snapshot={snapshot} dispatch={dispatchPlayback} colors={colors} />;
}
