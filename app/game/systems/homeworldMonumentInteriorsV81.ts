import type { HomeworldInteriorV64, HomeworldInteriorPropV64 } from './homeworldInteriorsV64';
import type { HomeworldInteriorPartitionV72, HomeworldInteriorZoneV72 } from './homeworldFunctionalInteriorsV72';
import type { HomeworldFurnitureArtIdV72, HomeworldFurnitureInstanceV72 } from './homeworldFurnitureV72';
import type { HomeworldInteriorDecorArtIdV76, HomeworldInteriorDecorInstanceV76 } from './homeworldInteriorDecorV76';
import type { HomeworldCivilianRoleV72 } from './homeworldIdentityV72';
import npcAdditionsV84 from '../data/homeworldNpcAdditionsV84.json';

export interface HomeworldMonumentInhabitantV81 {
  id: string; role: HomeworldCivilianRoleV72; label: string; x: number; y: number; facing: 1 | -1;
  interactive: false; motion: 'preserved-native-idle-no-new-gesture-clip';
}

export interface HomeworldMonumentLayoutV81 {
  version: 'V81';
  exteriorEnvelope: { width: number; depth: number };
  passages: readonly { id: string; x: number; y: number; width: number; orientation: 'horizontal' | 'vertical' }[];
  protectedAxis: { left: number; right: number; top: number; bottom: number };
  lore: 'original-public-complex-not-a-canonical-map';
  unavailable: readonly string[];
}

export const HOMEWORLD_MONUMENT_ENVELOPES_V81 = {
  'throne-audience': { width: 1100, depth: 700 },
  'rite-sanctum': { width: 850, depth: 500 },
} as const;

/** Two authored public complexes. These do not create a universal Yautja king,
 * change the existing court/rite dialogues or unlock private royal apartments.
 * Every coordinate is on the same local ground plane as the existing motor. */
export function homeworldMonumentInteriorV81(room: HomeworldInteriorV64): HomeworldInteriorV64 {
  if (room.buildingId !== 'throne-audience' && room.buildingId !== 'rite-sanctum') return room;
  const palace = room.buildingId === 'throne-audience';
  const envelope = HOMEWORLD_MONUMENT_ENVELOPES_V81[room.buildingId];
  const width = envelope.width - 32, depth = envelope.depth - 32;
  const title = palace ? 'Palais des clans · complexe public' : 'Conseil des Anciens · complexe public';
  const wall = (id: string, x: number, y: number, w: number, d: number): HomeworldInteriorPartitionV72 => ({
    id: `${room.buildingId}-v81-${id}`, x, y, width: w, depth: d,
    orientation: w > d ? 'horizontal' : 'vertical', cutawayHeight: 52,
  });
  const zone = (id: string, label: string, x: number, y: number, w: number, d: number): HomeworldInteriorZoneV72 => ({ id: `${room.buildingId}-v81-${id}`, label, x, y, width: w, depth: d });
  const zones = palace ? [
    zone('vestibule', 'Vestibule des délégations', 20, 500, 1028, 148),
    zone('guards', 'Galerie de la garde', 20, 280, 244, 200),
    zone('audience', 'Grande chambre d’audience', 290, 20, 488, 450),
    zone('prestige', 'Galerie des marques de clans', 804, 20, 244, 450),
    zone('annex', 'Annexe des porte-parole', 20, 20, 244, 240),
  ] : [
    zone('vestibule', 'Vestibule des consultations', 20, 340, 778, 108),
    zone('archive', 'Réserve des registres locaux', 20, 20, 220, 150),
    zone('quiet', 'Lieu de recueillement', 20, 206, 220, 106),
    zone('assembly', 'Chambre des représentants', 272, 20, 526, 292),
  ];
  const partitions = palace ? [
    wall('west-north', 272, 20, 16, 140), wall('west-south', 272, 360, 16, 120),
    wall('east-north', 780, 20, 16, 140), wall('east-south', 780, 360, 16, 120),
    wall('vestibule-west', 20, 480, 414, 16), wall('vestibule-east', 634, 480, 414, 16),
    wall('annex-west', 20, 264, 24, 16), wall('annex-east', 244, 264, 28, 16),
  ] : [
    wall('archive-north', 248, 20, 16, 60), wall('archive-south', 248, 280, 16, 40),
    wall('foyer-west', 20, 320, 289, 16), wall('foyer-east', 509, 320, 289, 16),
    wall('quiet-west', 20, 184, 14, 16), wall('quiet-east', 234, 184, 14, 16),
  ];
  const furniture: HomeworldFurnitureInstanceV72[] = [];
  const add = (id: string, artId: HomeworldFurnitureArtIdV72, x: number, y: number, scale: number) => furniture.push({ id, artId, x, y, scale });
  if (palace) {
    // Preserve the V72 identities and the exact V77 host/table contract.
    add('throne-audience-v72-role-west', 'ceremonial-seat', 534, 134, .95);
    add('throne-audience-v72-role-east', 'register-desk', 144, 104, .72);
    add('throne-audience-v72-foyer-light-west', 'resin-lantern', 70, 632, .8);
    add('throne-audience-v72-foyer-light-east', 'resin-lantern', 986, 594, .8);
    add('throne-audience-v72-banner-east', 'clan-banner', 680, 116, .8);
    add('throne-audience-v77-cntlip-table', 'meal-table', 410, 141, .62);
    add('throne-audience-v81-guard-rack', 'clothing-rack', 206, 452, .65);
    add('throne-audience-v81-guard-gong', 'training-gong', 174, 322, .65);
    add('throne-audience-v81-annex-registry', 'sealed-jars', 78, 180, .7);
    add('throne-audience-v81-annex-banner', 'clan-banner', 212, 154, .7);
    add('throne-audience-v81-gallery-standard', 'clan-banner', 920, 116, 1);
    add('throne-audience-v81-gallery-register', 'register-desk', 910, 282, .85);
    add('throne-audience-v81-gallery-lantern', 'resin-lantern', 1016, 352, .7);
    add('throne-audience-v81-east-waiting', 'stone-bench', 816, 618, .8);
  } else {
    add('rite-sanctum-v74-gong', 'training-gong', 164, 306, .65);
    add('rite-sanctum-v74-tenture', 'clan-banner', 706, 106, .85);
    add('rite-sanctum-v74-contenants', 'sealed-jars', 70, 260, .7);
    add('rite-sanctum-v74-veille', 'resin-lantern', 756, 422, .65);
    add('rite-sanctum-v81-archive-desk', 'register-desk', 136, 84, .65);
    add('rite-sanctum-v81-assembly-seat-west', 'ceremonial-seat', 404, 100, .75);
    add('rite-sanctum-v81-assembly-seat-east', 'ceremonial-seat', 610, 100, .75);
    add('rite-sanctum-v81-assembly-record', 'register-desk', 512, 160, .7);
    add('rite-sanctum-v81-consultation-bench', 'stone-bench', 144, 410, .65);
    add('rite-sanctum-v81-foyer-lantern', 'resin-lantern', 300, 426, .55);
  }
  const props: HomeworldInteriorPropV64[] = room.props.map((prop, i) => ({ ...prop,
    x: palace ? [398, 984, 90, 1000][i] : [72, 746][i],
    y: palace ? [552, 548, 228, 216][i] : [152, 252][i],
  }));
  const oldDecor = room.orientedDecorV76?.map((item, i) => ({ ...item,
    x: palace ? [42, 1020, 140, 676][i] : [36, 222, 736, 536][i],
    y: palace ? [384, 74, 598, 550][i] : [166, 74, 186, 430][i],
    purpose: `${title} · ${item.purpose.slice(item.purpose.indexOf(' · ') + 3)}`,
    placement: 'v81-authored-public-complex',
  }));
  const decor = (id: string, artId: HomeworldInteriorDecorArtIdV76, x: number, y: number, scale: number, purpose: string): HomeworldInteriorDecorInstanceV76 => ({
    id: `${room.buildingId}-v81-${id}`, artId, x, y, scale, solid: true, purpose: `${title} · ${purpose}`, placement: 'v81-authored-functional-lot',
  });
  const monumentDecorV81 = palace ? [
    decor('annex-lateral-cabinet', 'rack-lateral', 244, 220, .85, 'Documents locaux, sans nouvelle preuve ou action.'),
    decor('gallery-sealed-cases', 'chest-diagonal', 960, 426, .8, 'Contenants des délégations ; aucun trophée fictif accordé.'),
    decor('vestibule-travel-case', 'chest-diagonal', 1008, 642, .6, 'Bagages scellés hors du passage axial.'),
  ] : [
    decor('assembly-sealed-records', 'chest-diagonal', 754, 300, .65, 'Pièces de consultation rangées à l’écart des représentants.'),
  ];
  const passages = palace ? [
    { id: 'palace-central-procession', x: 534, y: 488, width: 200, orientation: 'horizontal' as const },
    { id: 'palace-guard-branch', x: 280, y: 320, width: 200, orientation: 'vertical' as const },
    { id: 'palace-gallery-branch', x: 788, y: 252, width: 200, orientation: 'vertical' as const },
    { id: 'palace-annex-branch', x: 144, y: 272, width: 200, orientation: 'horizontal' as const },
  ] : [
    { id: 'council-central-procession', x: 409, y: 328, width: 200, orientation: 'horizontal' as const },
    { id: 'council-record-branch', x: 256, y: 140, width: 200, orientation: 'vertical' as const },
    { id: 'council-quiet-branch', x: 134, y: 192, width: 200, orientation: 'horizontal' as const },
  ];
  const preserved = { ...room }; delete preserved.secondaryLayoutV74;
  const inhabitants: HomeworldMonumentInhabitantV81[] = palace ? [
    { id: 'palace-v81-guard-west', role: 'guard', label: 'Garde de l’aile publique', x: 394, y: 570, facing: 1, interactive: false, motion: 'preserved-native-idle-no-new-gesture-clip' },
    { id: 'palace-v81-guard-east', role: 'guard', label: 'Garde des délégations', x: 680, y: 566, facing: -1, interactive: false, motion: 'preserved-native-idle-no-new-gesture-clip' },
  ] : [
    { id: 'council-v81-archivist', role: 'archivist', label: 'Archiviste des registres locaux', x: 184, y: 110, facing: -1, interactive: false, motion: 'preserved-native-idle-no-new-gesture-clip' },
    { id: 'council-v81-herald', role: 'herald', label: 'Représentant d’un clan allié', x: 356, y: 174, facing: 1, interactive: false, motion: 'preserved-native-idle-no-new-gesture-clip' },
    { id: 'council-v81-rite-observer', role: 'rite-keeper', label: 'Ancien observateur des rites locaux', x: 654, y: 218, facing: -1, interactive: false, motion: 'preserved-native-idle-no-new-gesture-clip' },
  ];
  inhabitants.push(...npcAdditionsV84.interiors.filter(npc => npc.buildingId === room.buildingId).map(npc => ({
    id: npc.id, role: npc.fallbackRole as HomeworldCivilianRoleV72, label: npc.label,
    x: npc.x, y: npc.y, facing: npc.facing as 1 | -1,
    interactive: false as const, motion: 'preserved-native-idle-no-new-gesture-clip' as const,
  })));
  return { ...preserved, title, width, depth, props, furniture, zones, partitions,
    description: `${palace ? 'Vestibule, garde, grande chambre d’audience, galerie des marques et annexe des clans' : 'Vestibule, registres, recueillement et chambre des représentants'} reliés à pied. Composition originale pour ce jeu ; aucun nouveau rang, dossier, service ou accès royal n’est accordé. Les suites privées et les étages non produits restent hors de cette aile publique.`,
    spawn: { x: width / 2, y: depth - 72 }, exit: { x: width / 2, y: depth - 24 },
    points: room.points.map(point => ({ ...point, x: palace ? 534 : 512, y: palace ? 242 : 236 })),
    orientedDecorV76: oldDecor, monumentDecorV81, monumentInhabitantsV81: inhabitants,
    monumentLayoutV81: { version: 'V81', exteriorEnvelope: envelope, passages,
      protectedAxis: palace ? { left: 442, right: 626, top: 290, bottom: 646 } : { left: 317, right: 501, top: 266, bottom: 444 },
      lore: 'original-public-complex-not-a-canonical-map', unavailable: ['private-residential-suites', 'unproduced-upper-rooms'] },
  };
}

/** Stationary native inhabitants share real collision. No patrol, dialogue,
 * forged elder animation, faction service or save-owned reward is created. */
export function homeworldMonumentInhabitantTouchesV81(room: HomeworldInteriorV64, point: { x: number; y: number }, body: { halfWidth: number; halfDepth: number }) {
  return (room.monumentInhabitantsV81 ?? []).some(npc => Math.abs(point.x - npc.x) < 16 + body.halfWidth && Math.abs(point.y - npc.y) < 10 + body.halfDepth);
}
