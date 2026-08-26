import { TextAttributes } from "@opentui/core";
import type { AppComponentProps } from "../types";
import { LofiText } from "../../ui/lofi-text";
import { useTheme } from "../../ui/theme";

export function About(_props: AppComponentProps) {
  const { theme: { colors } } = useTheme();

  return (
    <box flexGrow={1} flexDirection="column" gap={1} backgroundColor={colors.background}>
      <LofiText fg={colors.highlight} attributes={TextAttributes.BOLD}>WAVE OS</LofiText>
      <LofiText fg={colors.glowSoft} wrapMode="word">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </LofiText>
      <LofiText fg={colors.primary} wrapMode="word">
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      </LofiText>
    </box>
  );
}
