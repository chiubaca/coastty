import { useAtomSet, useAtomValue } from "@effect-atom/atom-react/Hooks";
import { TextAttributes, type BoxRenderable, type KeyEvent } from "@opentui/core";
import { extend, useKeyboard } from "@opentui/react";
import { THREE, ThreeRenderable } from "@opentui/three";
import { useEffect, useRef, useState } from "react";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { positionLocal, time, uniform, vec3 } from "three/tsl";
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
import { CoasttyText } from "../../ui/coastty-text";
import { themes, useTheme, type ThemeColors } from "../../ui/theme";

declare module "@opentui/react" {
  interface OpenTUIComponents {
    three: typeof ThreeRenderable;
  }
}

extend({ three: ThreeRenderable });

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
type Visualizer = "Bars" | "3D Blob";

export function visualizerForKey(key: Pick<KeyEvent, "sequence">): Visualizer | null {
  if (key.sequence === "1") return "Bars";
  if (key.sequence === "2") return "3D Blob";
  return null;
}

type CoasttyPlayerViewProps = {
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
        <CoasttyText fg={colors.accent} attributes={TextAttributes.BOLD}>[-] LIBRARY</CoasttyText>
      </box>
      <box height={1} flexDirection="row">
        <box
          width={10}
          justifyContent="center"
          backgroundColor={section === "radio" ? colors.accent : colors.border}
          onMouseDown={() => setSection("radio")}
        >
          <CoasttyText fg={section === "radio" ? colors.background : colors.primary} attributes={TextAttributes.BOLD}>RADIO</CoasttyText>
        </box>
        <box
          flexGrow={1}
          justifyContent="center"
          backgroundColor={section === "playlists" ? colors.accent : colors.border}
          onMouseDown={() => setSection("playlists")}
        >
          <CoasttyText fg={section === "playlists" ? colors.background : colors.primary} attributes={TextAttributes.BOLD}>PLAYLISTS</CoasttyText>
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
                <CoasttyText
                  fg={selected ? colors.glow : available ? colors.primary : colors.muted}
                  attributes={selected ? TextAttributes.BOLD : available ? undefined : TextAttributes.DIM}
                >
                  {selected ? ">" : " "} {String(index + 1).padStart(2, "0")} {choice.name.toUpperCase()}
                </CoasttyText>
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
                <CoasttyText
                  fg={selected ? colors.glow : choice.available ? colors.primary : colors.muted}
                  attributes={selected ? TextAttributes.BOLD : choice.available ? undefined : TextAttributes.DIM}
                >
                  {selected ? ">" : browsing ? "+" : " "} {choice.name.toUpperCase()}{choice.available ? `  ${choice.playableEntries}` : "  OFFLINE"}
                </CoasttyText>
              </box>
            );
          })}
          <box height={1} paddingLeft={1} backgroundColor={colors.border}>
            <CoasttyText fg={colors.accent} attributes={TextAttributes.BOLD}>TRACKS // {browsePlaylist.name.toUpperCase()}</CoasttyText>
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
                  <CoasttyText fg={selected ? colors.glow : colors.primary} attributes={selected ? TextAttributes.BOLD : undefined}>
                    {selected ? ">" : " "} {String(index + 1).padStart(2, "0")} {track.title ?? "UNTITLED"} - {track.artist ?? "UNKNOWN"}
                  </CoasttyText>
                </box>
              );
            })}
            {browsePlaylist.tracks.length === 0 ? (
              <box height={2} paddingLeft={1} justifyContent="center">
                <CoasttyText fg={colors.muted}>SCANNING PLAYLIST...</CoasttyText>
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

type BlobScene = {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly visual: THREE.Group;
  readonly material: InstanceType<typeof MeshStandardNodeMaterial>;
  readonly waveStrength: { value: number };
  readonly rimLight: THREE.PointLight;
};

type BlobLevels = {
  readonly bass: number;
  readonly mid: number;
  readonly treble: number;
  readonly peak: number;
};

type BlobMotion = {
  bass: number;
  mid: number;
  treble: number;
  peak: number;
  beat: number;
};

const BLOB_PINK = new THREE.Color("#ff4fa3");
const BLOB_VIOLET = new THREE.Color("#a78bfa");

function createBlobScene(): BlobScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  camera.position.set(0, 0.35, 2);
  camera.lookAt(0, 0, 0);

  const material = new MeshStandardNodeMaterial({
    color: BLOB_PINK,
    emissive: BLOB_PINK,
    emissiveIntensity: 0,
    metalness: 1,
    roughness: 0.7,
    wireframe: true,
    wireframeLinewidth: 2,
    opacity: 0.1,
    transparent: true,
  });
  const waveStrength = uniform(0);
  const wave = positionLocal.y.mul(4).add(time.mul(2.4)).sin().mul(0.16)
    .add(positionLocal.x.mul(3).add(time.mul(1.8)).cos().mul(0.1))
    .mul(waveStrength);
  material.positionNode = positionLocal.add(vec3(wave.mul(0.25), wave.mul(0.35), wave));

  const visual = new THREE.Group();
  visual.scale.setScalar(0.7);
  visual.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 5), material));
  scene.add(visual);

  scene.add(new THREE.AmbientLight(new THREE.Color("#7868c7"), 4));
  const keyLight = new THREE.DirectionalLight(new THREE.Color("#ffd166"), 8);
  keyLight.position.set(2.5, 3, 3);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(new THREE.Color("#ff70b7"), 8, 10);
  rimLight.position.set(-2.5, -1, 2);
  scene.add(rimLight);

  return { scene, camera, visual, material, waveStrength, rimLight };
}

export function blobWaveStrength(spectrum: readonly number[]) {
  return blobMusicLevels(spectrum).peak * 3;
}

export function blobMusicLevels(spectrum: readonly number[]): BlobLevels {
  const values = spectrum.map((value) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);
  const bandSize = Math.ceil(values.length / 3);
  const average = (start: number) => {
    const band = values.slice(start, start + bandSize);
    return band.length === 0 ? 0 : band.reduce((total, value) => total + value, 0) / band.length;
  };

  const peak = values.reduce((maximum, value) => Math.max(maximum, value), 0);
  return { bass: average(0), mid: average(bandSize), treble: average(bandSize * 2), peak };
}

function smooth(current: number, target: number) {
  return current + (target - current) * (target > current ? 0.7 : 0.12);
}

function BlobVisualizer({ spectrum, colors }: { readonly spectrum: readonly number[]; readonly colors: ThemeColors }) {
  const [model] = useState(createBlobScene);
  const wave = blobWaveStrength(spectrum);
  const motion = useRef<BlobMotion>({ ...blobMusicLevels(spectrum), beat: 0 });

  useEffect(() => {
    model.scene.background = new THREE.Color(colors.background);
  }, [colors.background, model]);

  useEffect(() => {
    const current = motion.current;
    const target = blobMusicLevels(spectrum);
    const bassRise = target.bass - current.bass;
    const beat = target.bass > 0.45 && bassRise > 0.05 ? Math.min(1, bassRise * 4) : 0;
    current.bass = target.bass === 0 ? 0 : smooth(current.bass, target.bass);
    current.mid = smooth(current.mid, target.mid);
    current.treble = smooth(current.treble, target.treble);
    current.peak = target.peak === 0 ? 0 : smooth(current.peak, target.peak);
    current.beat = smooth(current.beat, beat);

    model.waveStrength.value = current.peak * 3;
    model.visual.scale.setScalar(0.7 + current.bass * 0.25);
    model.material.emissiveIntensity = current.mid * 1.5;
    model.material.opacity = 0.1 + current.mid * 0.3;
    model.material.roughness = 0.7 - current.mid * 0.45;
    const colorMix = Math.min(1, (current.mid + current.treble) / 1.5);
    model.material.color.lerpColors(BLOB_PINK, BLOB_VIOLET, colorMix);
    model.material.emissive.lerpColors(BLOB_PINK, BLOB_VIOLET, colorMix);
    model.rimLight.intensity = 8 + current.treble * 22;

    const fov = 44 - current.beat * 5;
    if (model.camera.fov !== fov) {
      model.camera.fov = fov;
      model.camera.updateProjectionMatrix();
    }
    const rotation = 0.3 + current.treble * 0.9;
    model.visual.rotation.x += 0.012 * rotation;
    model.visual.rotation.y += 0.019 * rotation;
  }, [model, spectrum]);

  return (
    <box flexGrow={1} minHeight={1} backgroundColor={colors.background}>
      <three flexGrow={1} minHeight={1} scene={model.scene} camera={model.camera} />
      <box position="absolute" top={0} right={0} paddingX={1} backgroundColor={colors.shadow}>
        <CoasttyText fg={colors.glow} attributes={TextAttributes.BOLD}>WAVE {wave.toFixed(1)} / 3.0</CoasttyText>
      </box>
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
        <CoasttyText fg={colors.primary}>{formatTime(positionSeconds)}</CoasttyText>
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
        <CoasttyText fg={colors.primary}>{formatTime(durationSeconds)}</CoasttyText>
      </box>
    </box>
  );
}

export function CoasttyPlayerView({
  snapshot,
  dispatch,
  colors = themes.phosphor.colors,
  focused = true,
  sidebarInitiallyOpen = false,
}: CoasttyPlayerViewProps) {
  const initialPlaylist = snapshot.selected._tag === "Playlist"
    ? snapshot.selected
    : snapshot.directory.playlists[0]!;
  const [sidebarOpen, setSidebarOpen] = useState(sidebarInitiallyOpen);
  const [section, setSection] = useState<SidebarSection>(snapshot.selected._tag === "Playlist" ? "playlists" : "radio");
  const [browsePlaylistId, setBrowsePlaylistId] = useState(initialPlaylist.id);
  const [marqueeOffset, setMarqueeOffset] = useState(0);
  const [visualizer, setVisualizer] = useState<Visualizer>("3D Blob");
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
    const nextVisualizer = visualizerForKey(key);
    if (nextVisualizer) {
      setVisualizer(nextVisualizer);
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
                <CoasttyText fg={colors.accent} attributes={TextAttributes.BOLD}>[+] LIBRARY</CoasttyText>
              </box>
            ) : <box />}
            <CoasttyText
              fg={snapshot.status === "Error" ? colors.highlight : colors.muted}
              attributes={snapshot.status === "Playing" ? TextAttributes.BOLD : TextAttributes.DIM}
            >
              {snapshot.status.toUpperCase()}
            </CoasttyText>
          </box>
          {visualizer === "Bars"
            ? <Spectrum spectrum={snapshot.spectrum} colors={colors} />
            : <BlobVisualizer spectrum={snapshot.spectrum} colors={colors} />}
        </box>
      </box>

      <box height={1} paddingLeft={1} backgroundColor={colors.shadow}>
        <CoasttyText fg={colors.glow} attributes={TextAttributes.BOLD}>{marquee}</CoasttyText>
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
          <CoasttyText fg={playlistSelected ? colors.accent : colors.muted}>|&lt; PREV</CoasttyText>
        </box>
        <CoasttyText fg={colors.muted}> | </CoasttyText>
        <box width={8} justifyContent="center" backgroundColor={colors.accent} onMouseDown={togglePlayback}>
          <CoasttyText fg={colors.background} attributes={TextAttributes.BOLD}>
            {snapshot.status === "Error" ? "! RETRY" : canPause ? "|| PAUSE" : "> PLAY"}
          </CoasttyText>
        </box>
        <CoasttyText fg={colors.muted}> | </CoasttyText>
        <box
          width={8}
          justifyContent="center"
          onMouseDown={playlistSelected ? () => dispatch(PlaybackCommand.Skip()) : undefined}
        >
          <CoasttyText fg={playlistSelected ? colors.accent : colors.muted}>NEXT &gt;|</CoasttyText>
        </box>
      </box>
      <box height={1} flexDirection="row" backgroundColor={colors.shadow}>
        <box
          flexGrow={1}
          justifyContent="center"
          backgroundColor={visualizer === "Bars" ? colors.accent : colors.shadow}
          onMouseDown={() => setVisualizer("Bars")}
        >
          <CoasttyText fg={visualizer === "Bars" ? colors.background : colors.primary} attributes={visualizer === "Bars" ? TextAttributes.BOLD : undefined}>[1] BARS</CoasttyText>
        </box>
        <box
          flexGrow={1}
          justifyContent="center"
          backgroundColor={visualizer === "3D Blob" ? colors.accent : colors.shadow}
          onMouseDown={() => setVisualizer("3D Blob")}
        >
          <CoasttyText fg={visualizer === "3D Blob" ? colors.background : colors.primary} attributes={visualizer === "3D Blob" ? TextAttributes.BOLD : undefined}>[2] BLOB</CoasttyText>
        </box>
      </box>
    </box>
  );
}

export function CoasttyPlayer({ appId }: AppComponentProps) {
  const { theme: { colors } } = useTheme();
  const snapshot = useAtomValue(playbackStateAtom);
  const focused = useAtomValue(windowFocusedAtom(appId));
  const dispatchPlayback = useAtomSet(playbackCommandAtom);
  const dispatchWindow = useAtomSet(windowManagerAtom);

  useEffect(() => {
    dispatchWindow(WindowCommand.SetTitle({ appId, title: `COAST.FM - ${snapshot.selected.name}` }));
  }, [appId, dispatchWindow, snapshot.selected.name]);

  return <CoasttyPlayerView snapshot={snapshot} dispatch={dispatchPlayback} colors={colors} focused={focused} />;
}
