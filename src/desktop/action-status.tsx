import { createContext, useContext, useState, type ReactNode } from "react";

const DEFAULT_ACTION = "DOUBLE CLICK TO OPEN";

type ActionStatusValue = {
  action: string;
  setAction: (action: string) => void;
};

const ActionStatusContext = createContext<ActionStatusValue | null>(null);

export function ActionStatusProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState(DEFAULT_ACTION);
  return <ActionStatusContext value={{ action, setAction }}>{children}</ActionStatusContext>;
}

export function useActionStatus(): ActionStatusValue {
  const status = useContext(ActionStatusContext);
  if (!status) throw new Error("useActionStatus must be used inside an action status provider");
  return status;
}

export function ActionStatus() {
  const { action } = useActionStatus();

  return (
    <box position="absolute" right={1} bottom={1} zIndex={1000} height={1} paddingX={1} border borderColor="#39ff14" backgroundColor="#000d04">
      <text fg="#7cff5b">{action}</text>
    </box>
  );
}
