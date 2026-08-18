import * as Atom from "@effect-atom/atom/Atom";
import { useAtomValue } from "@effect-atom/atom-react/Hooks";
import { LofiText } from "../ui/lofi-text";

export const DEFAULT_ACTION_STATUS = "DOUBLE CLICK TO OPEN";

export const actionStatusAtom = Atom.make(DEFAULT_ACTION_STATUS).pipe(
  Atom.keepAlive,
  Atom.withLabel("desktop/action-status"),
);

export function ActionStatus() {
  const action = useAtomValue(actionStatusAtom);

  return (
    <box position="absolute" right={1} bottom={1} zIndex={1000} height={1} paddingX={1} border borderColor="#39ff14" backgroundColor="#000d04">
      <LofiText fg="#7cff5b">{action}</LofiText>
    </box>
  );
}
