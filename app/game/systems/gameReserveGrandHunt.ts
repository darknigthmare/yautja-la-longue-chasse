import type {GameReserveV109Behavior, GameReserveV109Definition, GameReserveV109Person} from './gameReserveExpeditionV109';
import {GAME_RESERVE_GRAND_LAYOUTS} from './gameReserveGrandHuntData';

/** V6 "grandes traques": longer, separately selected versions of the four reserves.
 * Twelve contiguous sectors, six groups, six aircraft and twenty-four adult armed combatants each.
 * Old V1–V5 checkpoints keep their own terrain; nothing is converted into a grand hunt. */
export const GAME_RESERVE_GRAND_IDS = ['vharuun-grand-hunt', 'avar-kesh-grand-hunt', 'khar-duun-grand-hunt', 'iskhel-grand-hunt'] as const;
export type GameReserveGrandId = typeof GAME_RESERVE_GRAND_IDS[number];
/** Farther groups crash with more damaged aircraft: their repairs are slower, so every group is still
 * present when a hunter walking from the western extraction can reach it (crossing the map takes ~84 s). */
export const GAME_RESERVE_GRAND_REPAIR_SCALE = (team: number) => 1 / (1 + 5 * team);
/** Hazard rules, shared by the simulation, the tactical notebook and the renderer. */
export const GAME_RESERVE_HAZARD_RULES = {
  slow: {hunterSpeed: .5, humanSpeed: .6, label: 'Terrain lent', detail: 'ralentit au sol le chasseur et les humains'},
  harm: {hunterDamage: 4, humanDamage: 3, interval: 45, label: 'Terrain blessant', detail: 'blesse au sol toutes les trois quarts de seconde'},
  alarm: {range: 520, alert: 300, label: 'Piège d’alerte', detail: 'révèle ta position aux humains proches quand tu y entres au sol'},
} as const;

const slug = (name: string) => name.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
function grandPeople(prefix: string, names: readonly string[], biome: GameReserveV109Definition['biome']): GameReserveV109Person[] {
  return names.map((name, index) => {
    const slot = index % 4, role = (['leader', 'technician', 'marksman', 'veteran'] as const)[slot], step = index % 16, team = Math.floor(index / 4) + 1;
    const behavior: GameReserveV109Behavior | undefined = slot === 0 ? 'carrier-escort' : slot === 3 ? biome === 'desert' ? 'cache-guard' : 'repair-cover' : undefined;
    const job = slot === 1 ? 'Mécanicien : transporte les composants puis répare son appareil.'
      : behavior === 'carrier-escort' ? 'Escorte un porteur proche et visible au lieu de chercher un second lot.'
      : behavior === 'cache-guard' ? 'Garde un dépôt connu tant que son groupe collecte encore.'
      : behavior === 'repair-cover' ? 'Couvre la réparation près d’un mécanicien réellement présent.'
      : 'Tireur : observe de loin et tire plus lentement.';
    const damage = team === 1 ? '' : ` Son appareil, plus endommagé, demande une longue réparation.`;
    return {id: `${prefix}-${slug(name)}`, name, role, art: slot === 2 ? 'sniper' : (index + (biome === 'ice' ? 1 : 0)) % 2 ? 'marine' : 'raider', behavior,
      description: `Adulte armé du groupe ${team}. ${job}${slot === 1 ? damage : ''}`,
      tactics: {sight: 300 + step * 9, speed: .88 + step * .013, carryingSpeed: .63 + step * .008,
        repair: (slot === 1 ? 2.55 + step * .013 : .42 + step * .017) * GAME_RESERVE_GRAND_REPAIR_SCALE(team - 1), shotCooldown: 112 + step * 3, witnessRange: 125 + step * 4, windup: 24}};
  });
}

export const GAME_RESERVE_GRAND_CATALOGUE: readonly GameReserveV109Definition[] = GAME_RESERVE_GRAND_IDS.map(id => {
  const data = GAME_RESERVE_GRAND_LAYOUTS[id];
  const prefix = data.sectors[0].id.replace(/-1$/, '');
  return {
    id, version: 6 as const, name: data.name, title: data.title, biome: data.biome, introduction: data.introduction,
    world: data.world, sectors: data.sectors, platforms: data.platforms, cover: data.cover, hazards: data.hazards, decor: data.decor,
    supplies: data.supplies, ships: data.ships, sites: data.sites, people: grandPeople(prefix, data.names, data.biome), factions: data.factions,
    cacheObjectives: data.cacheObjectives, mechanicGoal: data.mechanicGoal, interceptionGoal: data.interceptionGoal,
    art: {background: data.art.background.src, ledge: data.art.ledge.src, gantry: data.art.gantry.src, cover: data.art.cover.src},
    nativeArt: data.art,
  };
});
/** The ground strip under the hunter's feet, if any. Upper platforms are always safe. */
export function gameReserveHazardAt(definition: GameReserveV109Definition | null, x: number) {
  return definition?.hazards?.find(hazard => x >= hazard.x && x <= hazard.x + hazard.w) ?? null;
}
