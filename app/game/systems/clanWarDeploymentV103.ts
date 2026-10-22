import { CLAN_WAR_PARAMETERS_V85 as P, type WarFactionIdV85 } from "./clanWarV85Data";
import type { WarBudgetV85, WarCombatantV85 } from "./clanWarV85";
import type { GeneratedWarPlanetV103 } from "./clanWarPlanetGeneratorV103";

/** A declared exercise balance, separate from the historical Korthas workbook.
 * Both forces can guard the largest region or the whole corridor and retain a
 * mobile reserve. Individuals are created only when a new front is opened. */
export function warDeploymentV103(planet: GeneratedWarPlanetV103) {
  const { strategy } = planet.procedural;
  const neutrals = planet.definitions.filter(site => site.initialController === "CON-F03");
  const forceCount = Math.min(Math.floor((300 - neutrals.length) / 2), Math.max(18,
    ...planet.regions.map(region => region.territoryIds.length + 10),
    planet.regions.length + 12, strategy.objectiveCorridor.length + 10));
  const combatants: WarCombatantV85[] = [];
  const stocks: Record<string, WarBudgetV85> = {};
  for (const factionId of ["CON-F01", "CON-F02"] as const) {
    const ids = strategy.startingTerritoryIds[factionId];
    const frontier = ids.filter(id => planet.definitions.find(site => site.id === id)!.neighbors
      .some(neighbor => !ids.includes(neighbor)));
    const departures = frontier.length ? frontier : [strategy.headquarters[factionId]];
    for (let index = 0; index < forceCount; index++) {
      const garrison = index < ids.length;
      const territoryId = garrison ? ids[index] : departures[Math.floor((index - ids.length) / 8) % departures.length];
      const specialist = index - ids.length;
      combatants.push({
        id: `${factionId === "CON-F01" ? "P" : "F"}${String(index + 1).padStart(2, "0")}`,
        unitTypeId: factionId === "CON-F01" && !garrison ? ["RTS-U02", "RTS-U13", "RTS-U15", "RTS-U18"][specialist] ?? "RTS-U01" : "RTS-U01",
        factionId, territoryId, status: "fit", xp: 0, garrison, trainingUntilTurn: null,
      });
    }
    const upkeep = Math.ceil(ids.length / P.MAINT_C) + Math.ceil(forceCount / P.MAINT_A);
    const total: WarBudgetV85 = { s: 12 * upkeep + 6 * ids.length, m: Math.max(16, forceCount), i: Math.max(12, Math.ceil(planet.territories.length / 3)) };
    ids.forEach((id, index) => {
      stocks[id] = Object.fromEntries((["s", "m", "i"] as const).map(key => [key,
        Math.floor(total[key] / ids.length) + (index < total[key] % ids.length ? 1 : 0),
      ])) as unknown as WarBudgetV85;
    });
  }
  for (const site of neutrals) combatants.push({ id: `N-${site.id}`, unitTypeId: "RTS-U01", factionId: "CON-F03" as WarFactionIdV85,
    territoryId: site.id, status: "fit", xp: 0, garrison: true, trainingUntilTurn: null });
  return { forceCount, combatants, stocks };
}
