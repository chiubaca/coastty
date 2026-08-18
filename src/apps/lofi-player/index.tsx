import { TextAttributes } from "@opentui/core";
import { useAtomSet } from "@effect-atom/atom-react/Hooks";
import type { AppComponentProps } from "../types";
import { windowManagerAtom, WindowCommand } from "../../desktop/window-manager";
import { LofiText } from "../../ui/lofi-text";

export function LofiPlayer({ appId }: AppComponentProps) {
  const dispatchWindow = useAtomSet(windowManagerAtom);

  return (
    <box padding={2} flexGrow={1} flexDirection="column" gap={1}>
      <box
        onMouseDown={() =>
          dispatchWindow(WindowCommand.SetTitle({ appId, title: "lofi.fm - Night Bus Radio" }))
        }
      >
        <LofiText fg="#ffffff" attributes={TextAttributes.BOLD}>Night Bus Radio</LofiText>
      </box>
      <LofiText fg="#ffffff">rain on glass / side a</LofiText>
      <LofiText fg="#ffffff">[======----------]  2:14</LofiText>
      <LofiText fg="#ffffff" attributes={TextAttributes.DIM}>Click the station name to update the window title.</LofiText>
    </box>
  );
}
