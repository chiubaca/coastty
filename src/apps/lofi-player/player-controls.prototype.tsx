import { TextAttributes, createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { useState } from "react";
import { LofiText } from "../../ui/lofi-text";
import { ThemeProvider, type ThemeColors, useTheme } from "../../ui/theme";

// THROWAWAY PROTOTYPE: four 46x16 player layouts, switchable with [ and ].

const stations = [
  { id: 1, name: "Nightwave Plaza", shortName: "NIGHT", available: true },
  { id: 2, name: "COMING SOON", shortName: "SOON", available: false },
  { id: 3, name: "COMING SOON", shortName: "SOON", available: false },
  { id: 4, name: "COMING SOON", shortName: "SOON", available: false },
  { id: 5, name: "COMING SOON", shortName: "SOON", available: false },
] as const;

const statuses = [
  "Stopped",
  "Connecting",
  "Buffering",
  "Playing",
  "Paused",
  "Reconnecting",
  "Error",
] as const;

const variants = [
  { key: "A", name: "Deck" },
  { key: "B", name: "Directory" },
  { key: "C", name: "Tuner" },
  { key: "D", name: "Directory Deck" },
] as const;

type PlaybackStatus = (typeof statuses)[number];
type VariantKey = (typeof variants)[number]["key"];

type VariantProps = {
  readonly colors: ThemeColors;
  readonly selectedIndex: number;
  readonly status: PlaybackStatus;
  readonly volume: number;
  readonly selectStation: (index: number) => void;
  readonly togglePlayback: () => void;
  readonly adjustVolume: (delta: number) => void;
};

function isActive(status: PlaybackStatus) {
  return status === "Connecting"
    || status === "Buffering"
    || status === "Playing"
    || status === "Reconnecting";
}

function statusDetail(status: PlaybackStatus) {
  switch (status) {
    case "Stopped":
      return "READY - PLAY";
    case "Connecting":
      return "OPENING...";
    case "Buffering":
      return "BUFFERING...";
    case "Playing":
      return "LIVE AUDIO";
    case "Paused":
      return "SELECTION SAVED";
    case "Reconnecting":
      return "TRY 3/5 - 4s";
    case "Error":
      return "UNAVAILABLE";
  }
}

function playbackLabel(status: PlaybackStatus) {
  if (status === "Error") return "RETRY";
  return isActive(status) ? "PAUSE" : "PLAY";
}

export function VariantA({
  colors,
  selectedIndex,
  status,
  volume,
  selectStation,
  togglePlayback,
  adjustVolume,
}: VariantProps) {
  const station = stations[selectedIndex] ?? stations[0];

  return (
    <box flexGrow={1} flexDirection="column">
      <box height={5} border borderColor={colors.border} paddingX={1} flexDirection="column">
        <LofiText fg={colors.muted}>NOW TUNED</LofiText>
        <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>{station.name}</LofiText>
        <LofiText fg={status === "Error" ? colors.highlight : colors.accent}>
          {status.toUpperCase()} // {statusDetail(status)}
        </LofiText>
      </box>
      <box height={1} flexDirection="row">
        <box flexGrow={1} justifyContent="center" backgroundColor={colors.highlight} onMouseDown={togglePlayback}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>[ {playbackLabel(status)} ]</LofiText>
        </box>
        <box width={3} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => adjustVolume(-10)}>
          <LofiText fg={colors.accent}>[-]</LofiText>
        </box>
        <box width={9} justifyContent="center" backgroundColor={colors.border}>
          <LofiText fg={colors.glow}>{volume}%</LofiText>
        </box>
        <box width={3} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => adjustVolume(10)}>
          <LofiText fg={colors.accent}>[+]</LofiText>
        </box>
      </box>
      <LofiText fg={colors.muted}>STATION PRESETS</LofiText>
      <box flexGrow={1} flexDirection="row" flexWrap="wrap">
        {stations.map((candidate, index) => (
          <box
            key={candidate.id}
            width={index === stations.length - 1 ? 42 : 21}
            height={1}
            paddingLeft={1}
            backgroundColor={index === selectedIndex ? colors.accent : colors.shadow}
            onMouseDown={candidate.available ? () => selectStation(index) : undefined}
          >
            <LofiText
              fg={index === selectedIndex ? colors.background : candidate.available ? colors.primary : colors.muted}
              attributes={index === selectedIndex ? TextAttributes.BOLD : undefined}
            >
              {candidate.id}. {candidate.name}
            </LofiText>
          </box>
        ))}
      </box>
    </box>
  );
}

export function VariantB({
  colors,
  selectedIndex,
  status,
  volume,
  selectStation,
  togglePlayback,
  adjustVolume,
}: VariantProps) {
  const station = stations[selectedIndex] ?? stations[0];

  return (
    <box flexGrow={1} flexDirection="row">
      <box width={22} flexDirection="column" backgroundColor={colors.shadow}>
        <box height={1} justifyContent="center" backgroundColor={colors.border}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>STATIONS</LofiText>
        </box>
        {stations.map((candidate, index) => (
          <box
            key={candidate.id}
            height={2}
            paddingLeft={1}
            justifyContent="center"
            backgroundColor={index === selectedIndex ? colors.accent : colors.background}
            onMouseDown={candidate.available ? () => selectStation(index) : undefined}
          >
            <LofiText
              fg={index === selectedIndex ? colors.background : candidate.available ? colors.primary : colors.muted}
              attributes={index === selectedIndex ? TextAttributes.BOLD : undefined}
            >
              {index === selectedIndex ? ">" : " "} {candidate.id} {candidate.name}
            </LofiText>
          </box>
        ))}
      </box>
      <box flexGrow={1} flexDirection="column" paddingLeft={1}>
        <LofiText fg={colors.muted}>SELECTED</LofiText>
        <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>{station.name}</LofiText>
        <box height={3} marginTop={1} paddingX={1} backgroundColor={status === "Error" ? colors.border : colors.shadow}>
          <LofiText fg={colors.accent} attributes={TextAttributes.BOLD}>{status.toUpperCase()}</LofiText>
          <LofiText fg={colors.primary}>{statusDetail(status)}</LofiText>
        </box>
        <box height={1} marginTop={1} justifyContent="center" backgroundColor={colors.highlight} onMouseDown={togglePlayback}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>{playbackLabel(status)}</LofiText>
        </box>
        <box height={1} flexDirection="row">
          <box width={3} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => adjustVolume(-10)}>
            <LofiText fg={colors.accent}>-</LofiText>
          </box>
          <box flexGrow={1} justifyContent="center" backgroundColor={colors.border}>
            <LofiText fg={colors.glow}>VOL {volume}</LofiText>
          </box>
          <box width={3} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => adjustVolume(10)}>
            <LofiText fg={colors.accent}>+</LofiText>
          </box>
        </box>
      </box>
    </box>
  );
}

export function VariantC({
  colors,
  selectedIndex,
  status,
  volume,
  selectStation,
  togglePlayback,
  adjustVolume,
}: VariantProps) {
  const station = stations[selectedIndex] ?? stations[0];
  const meterWidth = Math.round(volume / 10);

  return (
    <box flexGrow={1} flexDirection="column">
      <box height={1} flexDirection="row" backgroundColor={colors.border}>
        <LofiText fg={colors.background} attributes={TextAttributes.BOLD}> SIGNAL BANK </LofiText>
        <LofiText fg={colors.highlight}> {status.toUpperCase()} </LofiText>
      </box>
      <box height={4} border borderColor={colors.border} paddingX={1} flexDirection="column">
        <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>{String(selectedIndex + 1).padStart(2, "0")} // {station.name}</LofiText>
        <LofiText fg={status === "Error" ? colors.highlight : colors.primary}>{statusDetail(status)}</LofiText>
      </box>
      <box height={1} flexDirection="row" gap={1}>
        {stations.map((candidate, index) => (
          <box
            key={candidate.id}
            width={7}
            flexGrow={1}
            justifyContent="center"
            backgroundColor={index === selectedIndex ? colors.accent : colors.shadow}
            onMouseDown={candidate.available ? () => selectStation(index) : undefined}
          >
            <LofiText
              fg={index === selectedIndex ? colors.background : candidate.available ? colors.primary : colors.muted}
              attributes={index === selectedIndex ? TextAttributes.BOLD : undefined}
            >
              {candidate.id}:{candidate.shortName}
            </LofiText>
          </box>
        ))}
      </box>
      <box height={2} marginTop={1} flexDirection="row">
        <box width={14} justifyContent="center" backgroundColor={colors.highlight} onMouseDown={togglePlayback}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>[{playbackLabel(status)}]</LofiText>
        </box>
        <box flexGrow={1} paddingLeft={1} flexDirection="column" backgroundColor={colors.shadow}>
          <LofiText fg={colors.primary}>OUTPUT {volume}%</LofiText>
          <LofiText fg={colors.accent}>[{"#".repeat(meterWidth)}{"-".repeat(10 - meterWidth)}]</LofiText>
        </box>
        <box width={3} justifyContent="center" backgroundColor={colors.border} onMouseDown={() => adjustVolume(-10)}>
          <LofiText fg={colors.highlight}>-</LofiText>
        </box>
        <box width={3} justifyContent="center" backgroundColor={colors.border} onMouseDown={() => adjustVolume(10)}>
          <LofiText fg={colors.highlight}>+</LofiText>
        </box>
      </box>
      <LofiText fg={colors.muted}>1-5 STATION  SPACE PLAY/PAUSE  +/- VOLUME</LofiText>
    </box>
  );
}

export function VariantD({
  colors,
  selectedIndex,
  status,
  volume,
  selectStation,
  togglePlayback,
  adjustVolume,
}: VariantProps) {
  const station = stations[selectedIndex] ?? stations[0];

  return (
    <box flexGrow={1} flexDirection="row">
      <box width={21} flexDirection="column" backgroundColor={colors.shadow}>
        <box height={1} justifyContent="center" backgroundColor={colors.border}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>STATIONS</LofiText>
        </box>
        {stations.map((candidate, index) => (
          <box
            key={candidate.id}
            height={2}
            paddingLeft={1}
            justifyContent="center"
            backgroundColor={index === selectedIndex ? colors.accent : colors.background}
            onMouseDown={candidate.available ? () => selectStation(index) : undefined}
          >
            <LofiText
              fg={index === selectedIndex ? colors.background : candidate.available ? colors.primary : colors.muted}
              attributes={index === selectedIndex ? TextAttributes.BOLD : undefined}
            >
              {index === selectedIndex ? ">" : " "} {candidate.id} {candidate.name}
            </LofiText>
          </box>
        ))}
      </box>
      <box flexGrow={1} paddingLeft={1} flexDirection="column">
        <box height={8} border borderColor={colors.border} paddingX={1} flexDirection="column">
          <LofiText fg={colors.muted}>NOW TUNED</LofiText>
          <LofiText fg={colors.glow} attributes={TextAttributes.BOLD}>{station.name}</LofiText>
          <LofiText fg={colors.primary}>ARTIST Sample</LofiText>
          <LofiText fg={colors.primary}>TITLE  Sample</LofiText>
          <LofiText fg={status === "Error" ? colors.highlight : colors.accent} attributes={TextAttributes.BOLD}>
            {status.toUpperCase()}
          </LofiText>
          <LofiText fg={colors.primary}>{statusDetail(status)}</LofiText>
        </box>
        <box height={1} marginTop={1} justifyContent="center" backgroundColor={colors.highlight} onMouseDown={togglePlayback}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>[ {playbackLabel(status)} ]</LofiText>
        </box>
        <box height={1} flexDirection="row">
          <box width={4} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => adjustVolume(-10)}>
            <LofiText fg={colors.accent}>[-]</LofiText>
          </box>
          <box flexGrow={1} justifyContent="center" backgroundColor={colors.border}>
            <LofiText fg={colors.glow}>VOL {volume}</LofiText>
          </box>
          <box width={4} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => adjustVolume(10)}>
            <LofiText fg={colors.accent}>[+]</LofiText>
          </box>
        </box>
      </box>
    </box>
  );
}

function PlayerControlsPrototype() {
  const renderer = useRenderer();
  const { theme: { colors } } = useTheme();
  const [variant, setVariant] = useState<VariantKey>("D");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<PlaybackStatus>("Stopped");
  const [volume, setVolume] = useState(60);

  function selectStation(index: number) {
    if (!stations[index]?.available) return;
    setSelectedIndex(index);
    if (isActive(status)) setStatus("Connecting");
  }

  function togglePlayback() {
    setStatus((current) => isActive(current) ? "Paused" : "Connecting");
  }

  function adjustVolume(delta: number) {
    setVolume((current) => Math.max(0, Math.min(100, current + delta)));
  }

  function cycleVariant(delta: number) {
    const currentIndex = variants.findIndex((candidate) => candidate.key === variant);
    setVariant(variants[(currentIndex + delta + variants.length) % variants.length]?.key ?? "A");
  }

  function cycleStatus() {
    setStatus((current) => {
      const currentIndex = statuses.indexOf(current);
      return statuses[(currentIndex + 1) % statuses.length] ?? "Stopped";
    });
  }

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy();
      return;
    }

    if (key.name === "tab" || key.sequence === "]") {
      cycleVariant(key.shift ? -1 : 1);
      return;
    }

    if (key.sequence === "[") {
      cycleVariant(-1);
      return;
    }

    const stationIndex = Number.parseInt(key.sequence, 10) - 1;
    if (stationIndex >= 0 && stationIndex < stations.length) {
      selectStation(stationIndex);
      return;
    }

    if (key.name === "up" || key.name === "down") {
      const delta = key.name === "up" ? -1 : 1;
      selectStation((selectedIndex + delta + stations.length) % stations.length);
      return;
    }

    if (key.name === "space") {
      togglePlayback();
      return;
    }

    if (key.sequence === "+" || key.sequence === "=") {
      adjustVolume(10);
      return;
    }

    if (key.sequence === "-") {
      adjustVolume(-10);
      return;
    }

    if (key.name === "s") cycleStatus();
    if (key.name === "e") setStatus("Error");
  });

  const props = { colors, selectedIndex, status, volume, selectStation, togglePlayback, adjustVolume };
  const selectedVariant = variants.find((candidate) => candidate.key === variant) ?? variants[0];

  return (
    <box flexGrow={1} backgroundColor={colors.background} alignItems="center" justifyContent="center">
      <LofiText position="absolute" top={1} fg={colors.muted} attributes={TextAttributes.DIM}>
        THROWAWAY PLAYER-CONTROLS PROTOTYPE // EXACT 46x16 WINDOW
      </LofiText>
      <box width={46} height={16} border borderColor={colors.accent} flexDirection="column" backgroundColor={colors.background}>
        <box height={1} flexDirection="row" backgroundColor={colors.border}>
          <box flexGrow={1} justifyContent="center">
            <LofiText fg={colors.accent} attributes={TextAttributes.BOLD}>lofi.fm - {stations[selectedIndex]?.name}</LofiText>
          </box>
          <LofiText fg={colors.accent}>[_][X]</LofiText>
        </box>
        <box flexGrow={1} padding={1}>
          {variant === "A" && <VariantA {...props} />}
          {variant === "B" && <VariantB {...props} />}
          {variant === "C" && <VariantC {...props} />}
          {variant === "D" && <VariantD {...props} />}
        </box>
      </box>
      <box position="absolute" bottom={2} left={2} right={2} height={1} flexDirection="row" justifyContent="center" gap={1}>
        <box width={3} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => cycleVariant(-1)}>
          <LofiText fg={colors.accent}>[</LofiText>
        </box>
        <box width={24} justifyContent="center" backgroundColor={colors.highlight}>
          <LofiText fg={colors.background} attributes={TextAttributes.BOLD}>{selectedVariant.key} - {selectedVariant.name}</LofiText>
        </box>
        <box width={3} justifyContent="center" backgroundColor={colors.shadow} onMouseDown={() => cycleVariant(1)}>
          <LofiText fg={colors.accent}>]</LofiText>
        </box>
      </box>
      <LofiText position="absolute" bottom={0} fg={colors.muted}>
        [/] OR TAB: VARIANT  S: STATUS  E: ERROR  ESC: EXIT
      </LofiText>
    </box>
  );
}

const renderer = await createCliRenderer({ enableMouseMovement: true });
createRoot(renderer).render(
  <ThemeProvider>
    <PlayerControlsPrototype />
  </ThemeProvider>,
);
