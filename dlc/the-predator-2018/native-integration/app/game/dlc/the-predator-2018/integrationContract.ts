/* THE_PREDATOR_2018_NATIVE_BRIDGE */
export const THE_PREDATOR_2018_INTEGRATION_CONTRACT = {
  route: "/dlc/the-predator-2018",
  saveKey: "yautja.dlc.the-predator-2018.v5",
  hostMirrorKey: "yautja.dlc.the-predator-2018.host-mirror.v5",
  protocol: 2,
  hostCampaignSlots: false,
  huntCanvasFusion: false,
  eventName: "yautja:the-predator-2018",
  iframeMessageSource: "the-predator-2018",
  hostCommandSource: "yautja-host",
  emittedEvents: [
    "ready",
    "migration",
    "checkpoint",
    "room-enter",
    "objective-phase",
    "secondary-complete",
    "reinforcement-wave",
    "boss-telegraph",
    "squad-order",
    "scene-start",
    "scene-complete",
    "campaign-complete",
    "mirror-complete",
    "command-ack",
  ],
  acceptedCommands: [
    "snapshot",
    "start",
    "resume",
    "pause",
    "difficulty",
    "squad-order",
  ],
  hostAssets: [
    "/game/sprites/v43/pit-arenas/arena-110-the-predator-2018-stargazer-lab/p0-depth.png",
    "/game/sprites/v43/pit-arenas/arena-111-the-predator-2018-school-field/p0-depth.png",
    "/game/sprites/v43/pit-arenas/arena-112-the-predator-2018-forest-crash/p0-depth.png",
  ],
} as const;

export type ThePredator2018HostEvent =
  (typeof THE_PREDATOR_2018_INTEGRATION_CONTRACT.emittedEvents)[number];
export type ThePredator2018HostCommand =
  (typeof THE_PREDATOR_2018_INTEGRATION_CONTRACT.acceptedCommands)[number];

export type ThePredator2018BridgeMessage = {
  source: "the-predator-2018";
  protocol: 2;
  version: string;
  type: ThePredator2018HostEvent;
  payload: Record<string, unknown>;
  ts: number;
};

/**
 * v0.5 bridge contract.
 *
 * Le runtime peut maintenant recevoir des commandes explicites du conteneur
 * Next.js et publier davantage d'événements tactiques. Le miroir hôte reste en
 * sessionStorage : il ne fusionne ni les cinq slots de campagne ni HuntCanvas.
 */
export type ThePredator2018IntegrationContract =
  typeof THE_PREDATOR_2018_INTEGRATION_CONTRACT;
