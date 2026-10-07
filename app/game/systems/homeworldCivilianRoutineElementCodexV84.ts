import { HOMEWORLD_RESIDENTS_V77, homeworldLevelV77 } from './homeworldWorldV77';
import { HOMEWORLD_URBAN_EXTRAS_V78 } from './homeworldUrbanPopulationV78';
import { homeworldCivilianRoutineCodexV84 } from './homeworldCivilianRoutinesV84';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';

/** These routes already own world coordinates. Append after the legacy
 * placement mapper; neither the Port nor level elevation is applied twice.
 * A routine record describes the actual provider, not a second physical NPC. */
const routedResidentsV84 = [...HOMEWORLD_RESIDENTS_V77, ...HOMEWORLD_URBAN_EXTRAS_V78];
export const HOMEWORLD_CIVILIAN_ROUTINE_ELEMENT_CODEX_V84: readonly (HomeworldElementRecordV64 & { associatedElementIds: readonly string[] })[] =
  homeworldCivilianRoutineCodexV84(routedResidentsV84).map(routine => {
    const resident = routedResidentsV84.find(item => item.id === routine.residentId)!, start = routine.path[0] ?? { x: 0, y: 0 };
    return { id: routine.id, label: `Circuit · ${routine.label}`, category: 'panel' as const, districtId: routine.districtId,
      spaceId: routine.path.length ? 'world' : 'authoring:civilian-routine-v84',
      position: { x: start.x, y: start.y, z: homeworldLevelV77(resident.levelId).elevation },
      dimensions: { width: 0, depth: 0, height: 0 }, footprint: null, door: null, lore: 'original-adaptation' as const, asset: null, source: [],
      associatedElementIds: [routine.residentId, `district:${routine.districtId}`],
      constraints: [...routine.constraints,
        `Identité ${routine.residentId}, rôle historique ${routine.originalRole}, famille ${routine.family}, groupe ${routine.groupId ?? 'aucun groupe'}.`,
        `Niveau actuel ${resident.levelId} ; polyline monde ${JSON.stringify(routine.path)}, vitesse conservée ${routine.speedWorld} u/s.`,
        `${routine.endDescription} : ${routine.endHaltSeconds} s ; ${routine.startDescription} : ${routine.startHaltSeconds} s ; déphasage ${routine.phaseSeconds} s.`,
        `Clips sociaux nouveaux : ${routine.socialActionClipsAuthored}. Les haltes utilisent la présentation native existante, pas un nouveau geste de métier.`,
        ...('sourceResidentId' in resident ? [`Figurant urbain déjà monté, persona ${resident.sourceResidentId} ; non interactif, sans visite sauvegardée ni ajout à la recherche de dialogue.`] : []),
        'Fiche de circuit sans empreinte ou habitant dupliqué ; aucune position de rassemblement commune inventée.',
        'V84 implémentée, non vérifiée : aucun test, audit, compilation locale de validation ou examen navigateur de ces nouvelles temporalités exécuté.'] };
  });
