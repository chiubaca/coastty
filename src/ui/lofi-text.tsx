import type { TextProps } from "@opentui/react";

export function LofiText({ children, ...props }: Omit<TextProps, "selectable">) {
  return <text {...props} selectable={false}>{children}</text>;
}
