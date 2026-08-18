import { TextAttributes } from "@opentui/core";
import { useAtomSet } from "@effect-atom/atom-react/Hooks";
import type { AppComponentProps } from "../types";
import { windowManagerAtom, WindowCommand } from "../../desktop/window-manager";
import { LofiText } from "../../ui/lofi-text";
import { useTheme } from "../../ui/theme";

export function LofiPlayer({ appId }: AppComponentProps) {
  const { theme: { colors } } = useTheme();
  const dispatchWindow = useAtomSet(windowManagerAtom);

  return (
    <box flexGrow={1} flexDirection="column" gap={1}>
      <box
        onMouseDown={() =>
          dispatchWindow(WindowCommand.SetTitle({ appId, title: "lofi.fm - Night Bus Radio" }))
        }
      >
        <LofiText fg={colors.highlight} attributes={TextAttributes.BOLD}>Night Bus Radio</LofiText>
      </box>
      <LofiText fg={colors.primary}>rain on glass / side a</LofiText>
      <LofiText fg={colors.accent}>[======----------]  2:14</LofiText>
      <LofiText fg={colors.muted} attributes={TextAttributes.DIM}>Click the station name to update the window title.</LofiText>
    </box>
  );
}
