import type { HomeworldResidentV69 } from './homeworldLifeV69';

export type HomeworldCivilianRoutineFamilyV84 = 'artisan' | 'courier' | 'archives' | 'guard' | 'household' | 'apprentice' | 'visitor';
export type HomeworldCivilianRoutinePhaseV84 = 'outbound' | 'end-halt' | 'return' | 'start-halt';
type ResidentV84 = HomeworldResidentV69 & { readonly levelId?: string; readonly civilianRole?: string };

/** These group names describe original local teams on their existing routes.
 * They do not invent a shared gathering socket, new service or social clip. */
export const HOMEWORLD_CIVILIAN_ROUTINE_GROUPS_V84 = [
  { id: 'forge-team', label: 'Équipe des outils et des parures', districtId: 'forges',
    memberIds: ['resident-forges-1', 'resident-forges-2', 'resident-forges-3', 'resident-forges-4', 'resident-v69-forges-1', 'resident-v69-forges-2', 'resident-v69-forges-3'] },
  { id: 'quay-relay', label: 'Relais de cargaisons du quai', districtId: 'port',
    memberIds: ['resident-port-1', 'resident-port-3', 'resident-v69-port-2'] },
  { id: 'memory-readers', label: 'Lecteurs et copistes de la mémoire', districtId: 'memory',
    memberIds: ['resident-memory-1', 'resident-memory-2', 'resident-memory-3', 'resident-v69-memory-1', 'resident-v69-memory-2', 'resident-v69-memory-3'] },
  { id: 'evidence-watch', label: 'Relève de garde des dossiers', districtId: 'enforcers',
    memberIds: ['resident-enforcers-2', 'resident-v69-enforcers-2'] },
] as const;

const beats = {
  artisan: { end: 'Halte de l’artisan · attend la remise des outils', start: 'Retour de l’atelier · attend sa prochaine tâche', endExtra: 11, startExtra: 4 },
  courier: { end: 'Halte du relais · attend le destinataire', start: 'Retour du courrier · attend un nouveau départ', endExtra: 7, startExtra: 3 },
  archives: { end: 'Halte de consultation · attend la fin d’un récit', start: 'Retour des archives · attend le prochain relevé', endExtra: 16, startExtra: 9 },
  guard: { end: 'Halte de veille · observe son secteur', start: 'Retour de patrouille · attend la relève', endExtra: 6, startExtra: 12 },
  household: { end: 'Halte du foyer · attend un visiteur', start: 'Retour du foyer · laisse libre le passage', endExtra: 12, startExtra: 8 },
  apprentice: { end: 'Halte de la cohorte · attend les consignes', start: 'Retour du parcours · attend son prochain passage', endExtra: 10, startExtra: 5 },
  visitor: { end: 'Halte du quartier · observe les lieux', start: 'Retour de visite · attend avant de repartir', endExtra: 7, startExtra: 6 },
} as const;

function stableSeed(value: string): number {
  let seed = 0;
  for (const c of value) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  return seed;
}

function familyFor(resident: ResidentV84): HomeworldCivilianRoutineFamilyV84 {
  // The original persona wins over a re-hashed visual costume. No existing
  // identity, occupation, morph, named character or native garment is changed.
  const role = resident.role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/forge|poliss|minerai|armuri|parur|grave|tiss|ajust|materiau|outils|repar/.test(role)) return 'artisan';
  if (/courrier|messag|porteur|porteuse|convoyeur|emissaire/.test(role)) return 'courier';
  if (/archiv|copist|conserv|lecteur|lectrice|marques|recits|temoin/.test(role)) return 'archives';
  if (/garde|gardien|guette|patrouille|inspection|inspectrice/.test(role)) return 'guard';
  if (/foyer|soin|delegation|hote/.test(role)) return 'household';
  if (/apprenti|aspirant|eleve|instruct|cohorte|parcours/.test(role) || resident.morphId === 'young') return 'apprentice';
  return resident.districtId === 'memory' ? 'archives' : 'visitor';
}

export function homeworldCivilianRoutineV84(resident: ResidentV84) {
  const family = familyFor(resident), beat = beats[family], seed = stableSeed(`${resident.id}:${resident.name ?? ''}`);
  const baseline = Number.isFinite(resident.dwellSeconds) ? Math.max(0, resident.dwellSeconds) : 0;
  const group = HOMEWORLD_CIVILIAN_ROUTINE_GROUPS_V84.find(item => (item.memberIds as readonly string[]).includes(resident.id));
  return { family, groupId: group?.id ?? null, groupLabel: group?.label ?? null,
    endHaltSeconds: baseline + beat.endExtra + (seed % 9) * .7,
    startHaltSeconds: baseline + beat.startExtra + (Math.floor(seed / 17) % 11) * .53,
    phaseSeconds: (Number.isFinite(resident.phaseSeconds) ? resident.phaseSeconds : 0) + (seed % 97) / 11,
    endLabel: beat.end, startLabel: beat.start,
    lore: 'original-local-clan-routine' as const };
}

/** One deterministic provider for the real polyline, renderer, proximity and
 * existing occupancy. Halts happen only at an existing route end, never at an
 * invented furniture socket or an unsupported point beside the route. */
export function homeworldCivilianPoseV84(resident: ResidentV84, seconds: number) {
  const routine = homeworldCivilianRoutineV84(resident);
  const start = resident.path[0] ?? { x: 0, y: 0 }, end = resident.path.at(-1) ?? start;
  const lengths = resident.path.slice(1).map((point, i) => Math.hypot(point.x - resident.path[i].x, point.y - resident.path[i].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const speed = Number.isFinite(resident.speed) && resident.speed > 0 ? resident.speed : 0;
  if (!total || !speed) return { ...start, facing: 1 as const, moving: false, progress: 0,
    phase: 'start-halt' as HomeworldCivilianRoutinePhaseV84, phaseLabel: routine.startLabel,
    routineFamily: routine.family, groupId: routine.groupId, dwellRemainingSeconds: 0, motionSeconds: 0 };
  const travel = total / speed, cycle = travel * 2 + routine.endHaltSeconds + routine.startHaltSeconds;
  const now = (Number.isFinite(seconds) ? Math.max(0, seconds) : 0) + routine.phaseSeconds;
  const time = ((now % cycle) + cycle) % cycle;
  let distance: number, phase: HomeworldCivilianRoutinePhaseV84, motionSeconds: number, dwellRemainingSeconds = 0;
  if (time < travel) { phase = 'outbound'; distance = time * speed; motionSeconds = time; }
  else if (time < travel + routine.endHaltSeconds) {
    phase = 'end-halt'; distance = total; motionSeconds = travel; dwellRemainingSeconds = travel + routine.endHaltSeconds - time;
  } else if (time < travel * 2 + routine.endHaltSeconds) {
    phase = 'return'; motionSeconds = time - travel - routine.endHaltSeconds; distance = total - motionSeconds * speed;
  } else {
    phase = 'start-halt'; distance = 0; motionSeconds = travel; dwellRemainingSeconds = cycle - time;
  }
  let remaining = Math.max(0, Math.min(total, distance)), index = 0;
  while (index < lengths.length - 1 && remaining > lengths[index]) remaining -= lengths[index++];
  const a = resident.path[index] ?? start, b = resident.path[index + 1] ?? end;
  const fraction = lengths[index] > 0 ? Math.max(0, Math.min(1, remaining / lengths[index])) : 0;
  const goingBack = phase === 'return' || phase === 'start-halt';
  const facing = ((b.x >= a.x ? 1 : -1) * (goingBack ? -1 : 1)) as 1 | -1;
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction,
    facing, moving: phase === 'outbound' || phase === 'return', progress: distance / total,
    phase, phaseLabel: phase === 'end-halt' ? routine.endLabel : phase === 'start-halt' ? routine.startLabel
      : goingBack ? 'Retour sur son circuit' : 'Déplacement sur son circuit',
    routineFamily: routine.family, groupId: routine.groupId, dwellRemainingSeconds, motionSeconds };
}

/** Read-only records use the caller's already-transformed world coordinates.
 * In particular this never translates the Port a second time. */
export function homeworldCivilianRoutineCodexV84(residents: readonly ResidentV84[]) {
  return residents.map(resident => {
    const routine = homeworldCivilianRoutineV84(resident);
    return { id: `civilian-routine-v84:${resident.id}`, residentId: resident.id,
      label: resident.name ?? resident.role, districtId: resident.districtId, levelId: resident.levelId ?? null,
      originalRole: resident.role, groupId: routine.groupId, family: routine.family,
      path: resident.path.map(point => ({ ...point })), speedWorld: resident.speed,
      endHaltSeconds: routine.endHaltSeconds, startHaltSeconds: routine.startHaltSeconds, phaseSeconds: routine.phaseSeconds,
      endDescription: routine.endLabel, startDescription: routine.startLabel,
      lore: routine.lore, socialActionClipsAuthored: 0,
      constraints: ['Haltes sur les deux extrémités déjà autorisées du trajet ; aucun nouveau seuil, accès ou obstacle.',
        'Même pose pour rendu, recherche de dialogue et occupancy existante ; temps issu uniquement de la cité active.',
        'Identité, costume et vitesse préservés ; groupes de métier locaux, sans rassemblement spatial inventé.',
        'Cellules natives de marche et portrait de halte existants ; pas de geste social, rotation ou bobbing ajouté.',
        'Aucun rang, gain, service, quête, visite sauvegardée ou progression de campagne créé par cette routine.'] };
  });
}
