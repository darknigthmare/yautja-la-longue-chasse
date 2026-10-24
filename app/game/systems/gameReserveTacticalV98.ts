import { GAME_RESERVE_EXPEDITION_V108_SITES } from "./gameReserveExpeditionV108";
import { gameReserveV66People, gameReserveV66Ships, gameReserveV66Supplies, gameReserveV66Interaction, gameReserveV66InteractionDuration, gameReserveV66LineClear, gameReserveV66Sector, gameReserveV66Sectors, gameReserveV66World, type GameReserveV66State } from "./gameReserveV66";
import { GAME_RESERVE_LOOKOUT_V104_SURVEY } from "./gameReserveLookoutV104";
import { GAME_RESERVE_EXPEDITION_V107_SITES } from "./gameReserveExpeditionV107";

/** A read-only field notebook: distant, unobserved enemies and repairs never become global intelligence. */
export function gameReserveTacticalV98(state: GameReserveV66State) {
  const people = gameReserveV66People(state), shipDefinitions = gameReserveV66Ships(state), supplies = gameReserveV66Supplies(state);
  const interaction = state.status === "active" ? gameReserveV66Interaction(state) : { kind: "none", target: -1, ticks: 0 } as const;
  const duration = gameReserveV66InteractionDuration(interaction.kind);
  const channelTicks = state.channel.kind === interaction.kind && state.channel.target === interaction.target ? state.channel.ticks : 0;
  const launching = interaction.kind === "sabotage" && state.ships[interaction.target].launch !== null;
  const sites = state.version === 4 ? GAME_RESERVE_EXPEDITION_V108_SITES : GAME_RESERVE_EXPEDITION_V107_SITES;
  const surveyDetail = (state.version === 3 || state.version === 4) && interaction.kind === "survey" ? sites[interaction.target].description + " Maintenir Interagir 2 s au poste, immobile et exposé. Puis rejoindre physiquement l’extraction à l’ouest." : "Maintenir Interagir 2 s sur la plateforme haute, immobile et exposé. Puis rejoindre physiquement l’extraction à l’ouest.";
  const action = {
    kind: interaction.kind,
    title: state.status !== "active" ? "Expédition close" : interaction.kind === "return" ? "Point de retour" : interaction.kind === "trophy" ? "Prélèvement à portée" : interaction.kind === "cache" ? "Neutraliser un lot du dépôt" : interaction.kind === "survey" ? state.version === 3 || state.version === 4 ? sites[interaction.target].name : "Relever les repères des Balises" : interaction.kind === "sabotage" ? launching ? "Intercepter le décollage" : "Endommager le circuit" : "Rejoindre la piste",
    detail: state.status !== "active" ? "Le carnet conserve le dernier état de cette sortie." : interaction.kind === "return" ? "Maintenir Interagir 1 s pour terminer la sortie." : interaction.kind === "trophy" ? "Maintenir Interagir 3 s, immobile et exposé." : interaction.kind === "cache" ? "Maintenir Interagir 2 s au sol. Un lot devient inutilisable ; les composants déjà emportés restent sur leurs porteurs." : interaction.kind === "survey" ? surveyDetail : interaction.kind === "sabotage" ? launching ? "Maintenir Interagir 1,5 s avant le départ. Les passagers ressortiront à la rampe." : "Maintenir Interagir 1,5 s. Les pièces restent sur place et les survivants pourront réparer." : "Observer les traces, rejoindre un dépôt ou un appareil, ou retrouver l’extraction à gauche.",
    progress: duration ? channelTicks / duration : 0,
    remaining: duration ? Math.ceil((duration - channelTicks) / 6) / 10 : 0,
  };
  const ships = state.ships.map((ship, index) => {
    const definition = shipDefinitions[index];
    // Exact preparation is inspected at the ground ramp, within physical interaction range.
    // A familiar sector, an offscreen hull or an audible motor never reveals its inventory.
    const inspected = Math.abs(state.player.x - definition.x) < 75 && state.player.y >= 433;
    // Motor start/departure are explicit audible log events, including outside the current sector.
    const phase = ship.departedAt !== null ? "departed" : ship.launch !== null ? "boarding" : inspected ? "repairing" : "unknown";
    return {
      id: definition.id, name: definition.name, x: definition.x,
      sector: gameReserveV66Sector(definition.x, state).name, phase,
      countdown: ship.launch !== null && ship.departedAt === null ? Math.max(0, Math.ceil((900 - state.tick + ship.launch) / 60)) : null,
      parts: inspected ? Math.min(3, ship.parts) : null,
      repair: inspected ? Math.floor(ship.repair / 36) : null,
      aboard: inspected ? state.humans.filter(human => human.team === index && human.status === "boarded").length : null,
      intercepted: ship.interception !== undefined,
    };
  });
  const contacts = state.humans.flatMap((human, index) => {
    if (human.status !== "active" || Math.abs(human.x - state.player.x) >= 330 || !gameReserveV66LineClear(state.player.x, state.player.y - 55, human.x, 385, state)) return [];
    return [{ id: human.id, name: human.identified ? people[index].name : "Combattant non identifié", description: human.identified ? people[index].description : "Maintenir Observer pour identifier son rôle.", carrying: human.carrying, recovering: human.recovering !== undefined }];
  });
  const caches = supplies.map((x, index) => ({ index, sector: gameReserveV66Sector(x, state).name,
    remaining: Math.abs(state.player.x - x) < 45 && state.player.y >= 433 ? state.supplies[index] : null,
    denied: state.deniedSupplies?.[index] ?? 0 }));
  return {
    action, ships, contacts, caches, denied: caches.reduce((sum, cache) => sum + cache.denied, 0),
    worldWidth: gameReserveV66World(state).width,
    lookout: state.version === 2 ? { ...state.lookout, x: GAME_RESERVE_LOOKOUT_V104_SURVEY.x, y: GAME_RESERVE_LOOKOUT_V104_SURVEY.y } : null,
    route: state.version === 4 ? sites.map((site, index) => ({ ...site, ...state.routeV108.siteRecords[index] })) : state.version === 3 ? GAME_RESERVE_EXPEDITION_V107_SITES.map((site, index) => ({ ...site, ...state.routeV107.siteRecords[index] })) : null,
    sectors: gameReserveV66Sectors(state).map((sector, index) => ({ ...sector, visited: state.visited.includes(index), current: gameReserveV66Sector(state.player.x, state).id === sector.id })),
  };
}
