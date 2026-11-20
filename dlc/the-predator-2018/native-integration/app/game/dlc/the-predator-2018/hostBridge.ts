/* THE_PREDATOR_2018_NATIVE_BRIDGE */
import {
  THE_PREDATOR_2018_INTEGRATION_CONTRACT,
  type ThePredator2018HostCommand,
} from "./integrationContract";

export type ThePredator2018CommandEnvelope = {
  source: "yautja-host";
  target: "the-predator-2018";
  id: string;
  command: ThePredator2018HostCommand;
  args: Record<string, unknown>;
};

let serial = 0;

export function createThePredator2018Command(
  command: ThePredator2018HostCommand,
  args: Record<string, unknown> = {},
): ThePredator2018CommandEnvelope {
  serial += 1;
  return {
    source: THE_PREDATOR_2018_INTEGRATION_CONTRACT.hostCommandSource,
    target: "the-predator-2018",
    id: `tp2018-${Date.now()}-${serial}`,
    command,
    args,
  };
}

export function isThePredator2018RuntimeMessage(value: unknown): value is {
  source: "the-predator-2018";
  protocol: 2;
  version: string;
  type: string;
  payload: Record<string, unknown>;
  ts: number;
} {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    message.source === "the-predator-2018" &&
    message.protocol === THE_PREDATOR_2018_INTEGRATION_CONTRACT.protocol &&
    typeof message.version === "string" &&
    typeof message.type === "string"
  );
}
