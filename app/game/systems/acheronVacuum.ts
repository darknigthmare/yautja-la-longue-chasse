export const ACHERON_VACUUM_MISSION = "ruins-ancient-guardian";

interface Point {
  x: number;
  y: number;
}

interface Body extends Point {
  width: number;
  height: number;
}

interface Support extends Point {
  width: number;
}

interface VacuumSignalInput {
  receiver: Body;
  hunter: Body;
  grounded: boolean;
  speed: number;
  recentImpact: number;
  directContact?: boolean;
  energyEmission: number;
  energyObstructed: boolean;
  floorY: number;
  platforms: readonly Support[];
}

export type AcheronSignalKind = "vibration" | "energy" | "contact";

export interface AcheronSignal {
  kind: AcheronSignalKind;
  strength: number;
}

export const ACHERON_SIGNAL_LABELS: Readonly<Record<AcheronSignalKind, string>> = {
  vibration: "Vibration repérée par la sentinelle",
  energy: "Signature énergétique repérée",
  contact: "Contact direct",
};

const ATTACHMENT_TOLERANCE = 5;
const FLOOR = Symbol("continuous floor");

const clampUnit = (value: number) => Math.max(0, Math.min(1, value));

function contactSupport(body: Body, floorY: number, platforms: readonly Support[]) {
  const x = body.x + body.width / 2;
  const y = body.y + body.height;
  return platforms.find((platform) =>
    Math.abs(platform.y - y) <= ATTACHMENT_TOLERANCE &&
    x >= platform.x && x <= platform.x + platform.width
  ) ?? (Math.abs(floorY - y) <= ATTACHMENT_TOLERANCE ? FLOOR : null);
}

export function acheronReceivedSignal(input: VacuumSignalInput): AcheronSignal | null {
  const { hunter, receiver } = input;
  const dx = hunter.x + hunter.width / 2 - receiver.x - receiver.width / 2;
  const dy = hunter.y + hunter.height / 2 - receiver.y - receiver.height / 2;
  if (input.directContact || (
    Math.abs(dx) <= (hunter.width + receiver.width) / 2 &&
    Math.abs(dy) <= (hunter.height + receiver.height) / 2
  )) {
    return { kind: "contact", strength: 1 };
  }

  const hunterSupport = input.grounded
    ? contactSupport(hunter, input.floorY, input.platforms)
    : null;
  const sameSupport = hunterSupport !== null &&
    hunterSupport === contactSupport(receiver, input.floorY, input.platforms);
  const footfall = clampUnit((Math.abs(input.speed) - 58) / 215);
  const vibration = sameSupport
    ? Math.max(footfall, clampUnit(input.recentImpact)) * clampUnit(1 - Math.abs(dx) / 640)
    : 0;
  const energy = input.energyObstructed
    ? 0
    : clampUnit(input.energyEmission) * clampUnit(1 - Math.hypot(dx, dy) / 920);

  if (energy >= 0.16 && energy > vibration) return { kind: "energy", strength: energy };
  if (vibration >= 0.16) return { kind: "vibration", strength: vibration };
  return null;
}
