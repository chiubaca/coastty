import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import { TextAttributes, type BoxRenderable, type KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import type { AppComponentProps } from "../types";
import { windowFocusedAtom, windowManagerAtom, WindowCommand } from "../../desktop/window-manager";
import { playbackCommandAtom, playbackStateAtom } from "../../radio/playback-atoms";
import {
  PlaybackCommand,
  type PlaybackCommand as PlaybackCommandType,
  type PlaybackSnapshot,
  type PlaybackStatus,
  type PlaylistChoice,
} from "../../radio/playback";
import { LofiText } from "../../ui/lofi-text";
import { themes, useTheme, type ThemeColors } from "../../ui/theme";

function canPausePlayback(status: PlaybackStatus) {
  return status === "Connecting"
    || status === "Buffering"
    || status === "Playing"
    || status === "Reconnecting";
}

export function playbackCommandForKey(key: Pick<KeyEvent, "name" | "sequence">, snapshot: PlaybackSnapshot) {
  const canPause = canPausePlayback(snapshot.status);
  if (key.name === "space") return canPause ? PlaybackCommand.Pause() : PlaybackCommand.Play();
  if (key.sequence === "+" || key.sequence === "=") return PlaybackCommand.SetVolume({ volume: snapshot.volume + 0.1 });
  if (key.sequence === "-") return PlaybackCommand.SetVolume({ volume: snapshot.volume - 0.1 });
  if ((key.name === "left" || key.sequence?.toLowerCase() === "b") && snapshot.selected._tag === "Playlist") {
    return PlaybackCommand.Previous();
  }
  if ((key.name === "right" || key.sequence?.toLowerCase() === "n") && snapshot.selected._tag === "Playlist") {
    return PlaybackCommand.Skip();
  }
  return null;
}

type SidebarSection = "radio" | "playlists";

type LofiPlayerViewProps = {
  readonly snapshot: PlaybackSnapshot;
  readonly dispatch: (command: PlaybackCommandType) => void;
  readonly colors?: ThemeColors;
  readonly focused?: boolean;
  readonly sidebarInitiallyOpen?: boolean;
};

function formatTrack(choice: PlaylistChoice, entryId: string | undefined) {
  return choice.tracks.find((track) => track.entryId === entryId);
}

function PlayerSidebar({
  snapshot,
  colors,
  section,
  browsePlaylist,
  setSection,
  setBrowsePlaylist,
  close,
  dispatch,
}: {
  readonly snapshot: PlaybackSnapshot;
  readonly colors: ThemeColors;
  readonly section: SidebarSection;
  readonly browsePlaylist: PlaylistChoice;
  readonly setSection: (section: SidebarSection) => void;
  readonly setBrowsePlaylist: (playlist: PlaylistChoice) => void;
  readonly close: () => void;
  readonly dispatch: (command: PlaybackCommandType) => void;
}) {
  return (
    <box width={29} flexShrink={0} flexDirection="column" backgroundColor={colors.background}>
      <box height={1} paddingLeft={1} flexDirection="row" backgroundColor={colors.shadow} onMouseDown={close}>
        <LofiText fg={colors.accent} attributes={TextAttributes.BOLD}>[-] LIBRARY</LofiText>
      </box>
      <box height={1} flexDirection="row">
        <box
          width={10}
          justifyContent="center"
          backgroundColor={section === "radio" ? colors.accent : colors.border}
          onMouseDown={() => setSection("radio")}
        >
          <LofiText fg={section === "radio" ? colors.background : colors.primary} attributes={TextAttributes.BOLD}>RADIO</LofiText>
        </box>
        <box
          flexGrow={1}
          justifyContent="center"
          backgroundColor={section === "playlists" ? colors.accent : colors.border}
          onMouseDown={() => setSection("playlists")}
        >
          <LofiText fg={section === "playlists" ? colors.background : colors.primary} attributes={TextAttributes.BOLD}>PLAYLISTS</LofiText>
        </box>
      </box>

      {section === "radio" ? (
        <box flexGrow={1} flexDirection="column">
          {snapshot.directory.stations.map((choice, index) => {
            const available = choice._tag === "Station";
            const selected = available && snapshot.selected._tag === "Station" && snapshot.selected.id === choice.id;
            return (
              <box
                key={choice.id}
                height={2}
                paddingLeft={1}
                justifyContent="center"
                backgroundColor={selected ? colors.shadow : colors.background}
                onMouseDown={available ? () => dispatch(PlaybackCommand.Select({ choice: { _tag: "Station", id: choice.id } })) : undefined}
              >
                <LofiText
                  fg={selected ? colors.glow : available ? colors.primary : colors.muted}
                  attributes={selected ? TextAttributes.BOLD : available ? undefined : TextAttributes.DIM}
                >
                  {selected ? ">" : " "} {String(index + 1).padStart(2, "0")} {choice.name.toUpperCase()}
                </LofiText>
              </box>
            );
          })}
        </box>
      ) : (
        <box flexGrow={1} flexDirection="column">
          {snapshot.directory.playlists.map((choice) => {
            const selected = snapshot.selected._tag === "Playlist" && snapshot.selected.id === choice.id;
            const browsing = browsePlaylist.id === choice.id;
            return (
              <box
                key={choice.id}
                height={1}
                paddingLeft={1}
                backgroundColor={browsing ? colors.shadow : colors.background}
                onMouseDown={choice.available ? () => {
                  setBrowsePlaylist(choice);
                  dispatch(PlaybackCommand.Select({ choice: { _tag: "Playlist", id: choice.id } }));
                } : undefined}
              >
                <LofiText
                  fg={selected ? colors.glow : choice.available ? colors.primary : colors.muted}
                  attributes={selected ? TextAttributes.BOLD : choice.available ? undefined : TextAttributes.DIM}
                >
                  {selected ? ">" : browsing ? "+" : " "} {choice.name.toUpperCase()}{choice.available ? `  ${choice.playableEntries}` : "  OFFLINE"}
                </LofiText>
              </box>
            );
          })}
          <box height={1} paddingLeft={1} backgroundColor={colors.border}>
            <LofiText fg={colors.accent} attributes={TextAttributes.BOLD}>TRACKS // {browsePlaylist.name.toUpperCase()}</LofiText>
          </box>
          <scrollbox flexGrow={1} backgroundColor={colors.background}>
            {browsePlaylist.tracks.map((track, index) => {
              const selected = snapshot.selected._tag === "Playlist"
                && snapshot.selected.id === browsePlaylist.id
                && snapshot.track?.entryId === track.entryId;
              return (
                <box
                  key={track.entryId}
                  height={1}
                  paddingLeft={1}
                  backgroundColor={selected ? colors.shadow : colors.background}
                  onMouseDown={() => dispatch(PlaybackCommand.SelectTrack({
                    playlistId: browsePlaylist.id,
                    entryId: track.entryId,
                  }))}
                >
                  <LofiText fg={selected ? colors.glow : colors.primary} attributes={selected ? TextAttributes.BOLD : undefined}>
                    {selected ? ">" : " "} {String(index + 1).padStart(2, "0")} {track.title ?? "UNTITLED"} - {track.artist ?? "UNKNOWN"}
                  </LofiText>
                </box>
              );
            })}
            {browsePlaylist.tracks.length === 0 ? (
              <box height={2} paddingLeft={1} justifyContent="center">
                <LofiText fg={colors.muted}>SCANNING PLAYLIST...</LofiText>
              </box>
            ) : null}
          </scrollbox>
        </box>
      )}
    </box>
  );
}

function Spectrum({ spectrum, colors }: { readonly spectrum: readonly number[]; readonly colors: ThemeColors }) {
  const values = spectrum.length > 0 ? spectrum : Array<number>(24).fill(0);
  return (
    <box flexGrow={1} minWidth={1} paddingX={1} paddingTop={1} flexDirection="row" alignItems="flex-end">
      {values.map((value, index) => (
        <box key={index} flexGrow={1} minWidth={1} height="100%" justifyContent="flex-end">
          <box
            width="100%"
            height={`${Math.max(5, Math.round(value * 100))}%`}
            backgroundColor={index % 5 === 0 ? colors.highlight : index % 2 === 0 ? colors.accent : colors.secondary}
          />
        </box>
      ))}
    </box>
  );
}

function formatTime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function PlaylistSeekBar({
  positionSeconds,
  durationSeconds,
  colors,
  dispatch,
}: {
  readonly positionSeconds: number;
  readonly durationSeconds: number;
  readonly colors: ThemeColors;
  readonly dispatch: (command: PlaybackCommandType) => void;
}) {
  const bar = useRef<BoxRenderable>(null);
  const progress = durationSeconds > 0 ? Math.max(0, Math.min(1, positionSeconds / durationSeconds)) : 0;

  return (
    <box height={1} paddingX={1} flexDirection="row" alignItems="center" backgroundColor={colors.background}>
      <box width={7} justifyContent="center">
        <LofiText fg={colors.primary}>{formatTime(positionSeconds)}</LofiText>
      </box>
      <box
        ref={bar}
        flexGrow={1}
        height={1}
        backgroundColor={colors.shadow}
        onMouseDown={(event) => {
          const track = bar.current;
          if (!track || track.width <= 0) return;
          const ratio = Math.max(0, Math.min(1, (event.x - track.screenX) / track.width));
          dispatch(PlaybackCommand.Seek({ positionSeconds: durationSeconds * ratio }));
        }}
      >
        <box width={`${progress * 100}%`} height={1} backgroundColor={colors.accent} />
      </box>
      <box width={7} justifyContent="center">
        <LofiText fg={colors.primary}>{formatTime(durationSeconds)}</LofiText>
      </box>
    </box>
  );
}

export function LofiPlayerView({
  snapshot,
  dispatch,
  colors = themes.phosphor.colors,
  focused = true,
  sidebarInitiallyOpen = false,
}: LofiPlayerViewProps) {
  const initialPlaylist = snapshot.selected._tag === "Playlist"
    ? snapshot.selected
    : snapshot.directory.playlists[0]!;
  const [sidebarOpen, setSidebarOpen] = useState(sidebarInitiallyOpen);
  const [section, setSection] = useState<SidebarSection>(snapshot.selected._tag === "Playlist" ? "playlists" : "radio");
  const [browsePlaylistId, setBrowsePlaylistId] = useState(initialPlaylist.id);
  const [marqueeOffset, setMarqueeOffset] = useState(0);
  const browsePlaylist = snapshot.directory.playlists.find((choice) => choice.id === browsePlaylistId)
    ?? initialPlaylist;
  const canPause = canPausePlayback(snapshot.status);
  const playlistSelected = snapshot.selected._tag === "Playlist";
  const artist = snapshot.track?.artist
    ?? (snapshot.attribution._tag === "Known" ? snapshot.attribution.artist : "UNKNOWN ARTIST");
  const title = snapshot.track?.title
    ?? (snapshot.attribution._tag === "Unavailable" ? snapshot.selected.name : snapshot.attribution.title);
  const nowPlaying = `${artist.toUpperCase()}  /  ${title.toUpperCase()}`;
  const marqueeCycle = `NOW PLAYING  //  ${nowPlaying}     `;
  const repeatedMarquee = marqueeCycle.repeat(5);
  const marquee = repeatedMarquee.slice(marqueeOffset) + repeatedMarquee.slice(0, marqueeOffset);

  useEffect(() => {
    setMarqueeOffset(0);
    const timer = setInterval(() => setMarqueeOffset((offset) => (offset + 1) % marqueeCycle.length), 160);
    return () => clearInterval(timer);
  }, [marqueeCycle]);

  useEffect(() => {
    if (snapshot.selected._tag !== "Playlist") return;
    setBrowsePlaylistId(snapshot.selected.id);
    setSection("playlists");
  }, [snapshot.selected]);

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "tab" || key.sequence?.toLowerCase() === "s") {
      setSidebarOpen((open) => !open);
      return;
    }
    if (sidebarOpen && key.sequence?.toLowerCase() === "r") {
      setSection("radio");
      return;
    }
    if (sidebarOpen && key.sequence?.toLowerCase() === "l") {
      setSection("playlists");
      return;
    }
    const command = playbackCommandForKey(key, snapshot);
    if (command) dispatch(command);
  });

  const togglePlayback = () => dispatch(canPause ? PlaybackCommand.Pause() : PlaybackCommand.Play());

  return (
    <box flexGrow={1} minWidth={1} flexDirection="column" backgroundColor={colors.background}>
      <box flexGrow={1} minHeight={1} flexDirection="row">
        {sidebarOpen ? (
          <PlayerSidebar
            snapshot={snapshot}
            colors={colors}
            section={section}
            browsePlaylist={browsePlaylist}
            setSection={setSection}
            setBrowsePlaylist={(playlist) => setBrowsePlaylistId(playlist.id)}
            close={() => setSidebarOpen(false)}
            dispatch={dispatch}
          />
        ) : null}
        <box flexGrow={1} minWidth={1} flexDirection="column" backgroundColor={colors.background}>
          <box height={1} paddingX={1} flexDirection="row" justifyContent="space-between">
            {!sidebarOpen ? (
              <box paddingX={1} backgroundColor={colors.shadow} onMouseDown={() => setSidebarOpen(true)}>
                <LofiText fg={colors.accent} attributes={TextAttributes.BOLD}>[+] LIBRARY</LofiText>
              </box>
            ) : <box />}
            <LofiText
              fg={snapshot.status === "Error" ? colors.highlight : colors.muted}
              attributes={snapshot.status === "Playing" ? TextAttributes.BOLD : TextAttributes.DIM}
            >
              {snapshot.status.toUpperCase()}
            </LofiText>
          </box>
          <Spectrum spectrum={snapshot.spectrum} colors={colors} />
        </box>
      </box>

      <box height={1} paddingLeft={1} backgroundColor={colors.shadow}>
        <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>{marquee}</LofiText>
      </box>
      {playlistSelected && snapshot.track ? (
        <PlaylistSeekBar
          positionSeconds={snapshot.positionSeconds}
          durationSeconds={snapshot.track.durationSeconds}
          colors={colors}
          dispatch={dispatch}
        />
      ) : null}
      <box height={1} flexDirection="row" justifyContent="center" backgroundColor={colors.border}>
        <box
          width={8}
          justifyContent="center"
          onMouseDown={playlistSelected ? () => dispatch(PlaybackCommand.Previous()) : undefined}
        >
          <LofiText fg={playlistSelected ? colors.accent : colors.muted}>|&lt; PREV</LofiText>
        </box>
        <LofiText fg={colors.muted}> | </LofiText>
        <box width={8} justifyContent="center" backgroundColor={colors.accent} onMouseDown={togglePlayback}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>
            {snapshot.status === "Error" ? "! RETRY" : canPause ? "|| PAUSE" : "> PLAY"}
          </LofiText>
        </box>
        <LofiText fg={colors.muted}> | </LofiText>
        <box
          width={8}
          justifyContent="center"
          onMouseDown={playlistSelected ? () => dispatch(PlaybackCommand.Skip()) : undefined}
        >
          <LofiText fg={playlistSelected ? colors.accent : colors.muted}>NEXT &gt;|</LofiText>
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

  return <LofiPlayerView snapshot={snapshot} dispatch={dispatchPlayback} colors={colors} focused={focused} />;
}
