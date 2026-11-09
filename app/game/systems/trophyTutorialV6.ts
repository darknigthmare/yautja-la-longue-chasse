/** TR-M01..03 / BUILD5-09 of the cumulative V6 bible. This is a local
 * pedagogical object, never a harvested trophy, promotion or reward claim.
 * SaveGame remains the only durable owner; this module performs no I/O. */
export interface TrophyTutorialPointV6 { x: number; y: number }
export type TrophyTutorialStationIdV6 = 'cabinet' | 'field' | 'packing' | 'admission' | 'inspection' | 'stabilizer' | 'engraving';
export type TrophyTutorialObjectLocationV6 = 'field' | 'carried-to-packing' | 'packing' | 'carried-to-admission' | 'admission' | 'carried-to-inspection' | 'inspection' | 'carried-to-stabilizer' | 'stabilizer' | 'carried-to-engraving' | 'engraving' | 'carried-to-cabinet' | 'cabinet';
export interface TrophyTutorialStationV6 { id: TrophyTutorialStationIdV6; label: string; point: TrophyTutorialPointV6 }
export interface TrophyTutorialStepV6 { number: number; mission: 'TR-M01' | 'TR-M02' | 'TR-M03'; station: TrophyTutorialStationIdV6; title: string; instruction: string; reply: string }
export const TROPHY_TUTORIAL_METRICS_V6 = Object.freeze({ width: 1200, height: 650, actorRadius: 13, speed: 220, reach: 52, maxFrameSeconds: 0.05 });
export const TROPHY_TUTORIAL_STATIONS_V6: readonly TrophyTutorialStationV6[] = [
  { id: 'cabinet', label: 'Niche et cabinet', point: { x: 140, y: 430 } },
  { id: 'field', label: 'Relevé de découverte', point: { x: 350, y: 530 } },
  { id: 'packing', label: 'Berceau de transport', point: { x: 550, y: 430 } },
  { id: 'admission', label: 'Rail d’admission', point: { x: 770, y: 530 } },
  { id: 'inspection', label: 'Table d’examen', point: { x: 1000, y: 430 } },
  { id: 'stabilizer', label: 'Support de montage', point: { x: 1020, y: 550 } },
  { id: 'engraving', label: 'Lumière et plaque', point: { x: 600, y: 550 } },
];
const step = (number: number, station: TrophyTutorialStationIdV6, title: string, instruction: string, reply: string): TrophyTutorialStepV6 => ({ number, mission: number <= 6 ? 'TR-M01' : number <= 12 ? 'TR-M02' : 'TR-M03', station, title, instruction, reply });
export const TROPHY_TUTORIAL_STEPS_V6: readonly TrophyTutorialStepV6[] = [
  step(1, 'cabinet', 'Une place encore vide', 'Ouvre la niche, repère les deux rails puis règle une marge suffisante.', 'La niche a des rails et une marge. Nous y reviendrons quand le support sera prêt.'),
  step(2, 'field', 'Un contexte dans le cadre', 'Cadre ensemble le modèle, le sol et le repère fixe. Aucun combat n’est supposé.', 'L’objet, le sol et le repère fixe sont dans la même vue.'),
  step(3, 'field', 'Ce qui se voit', 'Relève uniquement la marque visible et le repère du sol.', 'Tu as relevé ce qui se voit ; le reste reste sans récit.'),
  step(4, 'packing', 'Le bon berceau', 'Choisis un berceau ajusté au modèle, sans le comprimer ni masquer sa marque.', 'Ce berceau suit le gabarit de l’objet sans lui cacher sa marque.'),
  step(5, 'packing', 'Deux appuis', 'Place les attaches sur les appuis latéraux ; garde la marque centrale dégagée.', 'Les appuis portent. La trace que tu veux montrer est encore visible.'),
  step(6, 'packing', 'Provenance et transport', 'Insère la provenance du modèle, ferme le contenant puis porte-le au rail d’admission.', 'La provenance accompagne le contenant. Nous pouvons le porter à l’atelier.'),
  step(7, 'admission', 'Le rail d’admission', 'Après le transport, glisse la caisse jusqu’au bout du rail en gardant la source visible.', 'La source reste lisible sur le rail d’admission.'),
  step(8, 'admission', 'Un signal inconnu', 'Le contrôle fictif reste inconnu. Conserve l’original fermé et poursuis sur le modèle pédagogique.', 'Lis le résultat affiché. Un signal inconnu reste inconnu ; le modèle demeure disponible.'),
  step(9, 'inspection', 'Trois faces à examiner', 'Tourne le modèle pour observer face, profil et revers.', 'Face, profil et revers ont chacun leur vue.'),
  step(10, 'inspection', 'Garder l’état initial', 'Repère la zone fragile et la marque narrative, puis conserve leur état initial.', 'L’état initial est gardé avec la zone fragile et la marque narrative.'),
  step(11, 'inspection', 'Une fibre détachable', 'Soulève seulement la fibre prévue, puis conserve-la avec son index de provenance.', 'La fibre détachable prévue est conservée avec son origine.'),
  step(12, 'stabilizer', 'Stabiliser sans effacer', 'Règle les appuis et aligne le motif du stabilisateur fictif.', 'Les appuis et les motifs du stabilisateur sont alignés.'),
  step(13, 'stabilizer', 'Pièces déjà séparées', 'Réunis les trois pièces numérotées du modèle dans leur ordre. Ne casse aucun original.', 'Les pièces autorisées se rejoignent ; aucun original intact n’a été cassé pour l’exercice.'),
  step(14, 'stabilizer', 'Une base équilibrée', 'Choisis une base compatible puis centre son équilibre.', 'La base tient dans cette pose, avec son équilibre visible.'),
  step(15, 'engraving', 'La lumière rasante', 'Oriente la lumière pour faire apparaître la marque sans recouvrir le reste.', 'La lumière révèle la marque sans recouvrir le reste.'),
  step(16, 'engraving', 'Un récit à sa mesure', 'Compose une plaque amovible avec les seuls indices observés. L’âge demeure une question.', 'La plaque reste amovible et dit ce que les indices permettent.'),
  step(17, 'cabinet', 'Porter jusqu’au cabinet', 'Porte le berceau jusqu’à la niche, puis verrouille les deux rails.', 'Le berceau a rejoint le cabinet. Nous éprouvons les rails à cette place.'),
  step(18, 'cabinet', 'Fermer, vérifier, rouvrir', 'Ferme le cabinet, vérifie la marge, rouvre puis confirme l’exposition.', 'La fermeture, la marge et la réouverture sont vérifiées. L’exposition est complète.'),
];
export interface TrophyTutorialGestureV6 { step: number; values: Record<string, unknown>; partial?: 'view' }
export interface TrophyTutorialEventV6 extends TrophyTutorialGestureV6 { actor: TrophyTutorialPointV6 & { facing: -1 | 1 }; walked: number }
export interface TrophyTutorialStateV6 {
  version: 1; owner: string; revision: number; completedSteps: number;
  actor: TrophyTutorialPointV6 & { facing: -1 | 1 }; walked: number;
  objectId: string; objectLocation: TrophyTutorialObjectLocationV6;
  events: TrophyTutorialEventV6[];
}
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const distance = (a: TrophyTutorialPointV6, b: TrophyTutorialPointV6) => Math.hypot(a.x - b.x, a.y - b.y);
const ownerValid = (owner: unknown): owner is string => typeof owner === 'string' && owner.length <= 128 && Number.isFinite(Date.parse(owner));
export function trophyTutorialStationV6(id: TrophyTutorialStationIdV6): TrophyTutorialStationV6 { return TROPHY_TUTORIAL_STATIONS_V6.find(s => s.id === id)!; }
export function trophyTutorialStepV6(state: TrophyTutorialStateV6) { return TROPHY_TUTORIAL_STEPS_V6[state.completedSteps] ?? null; }
export function trophyTutorialObservedViewsV6(state: TrophyTutorialStateV6): string[] {
  return state.events.filter(event => event.step === 9 && event.partial === 'view').map(event => String(event.values.view));
}
export function trophyTutorialObjectLocationV6(completed: number): TrophyTutorialObjectLocationV6 {
  if (completed < 3) return 'field';
  if (completed === 3) return 'carried-to-packing';
  if (completed <= 5) return 'packing';
  if (completed === 6) return 'carried-to-admission';
  if (completed === 7) return 'admission';
  if (completed === 8) return 'carried-to-inspection';
  if (completed <= 10) return 'inspection';
  if (completed === 11) return 'carried-to-stabilizer';
  if (completed <= 13) return 'stabilizer';
  if (completed === 14) return 'carried-to-engraving';
  if (completed === 15) return 'engraving';
  if (completed === 16) return 'carried-to-cabinet';
  return 'cabinet';
}
export function createTrophyTutorialV6(owner: string): TrophyTutorialStateV6 {
  if (!ownerValid(owner)) throw new Error('Le tutoriel exige un propriétaire de campagne valide.');
  return { version: 1, owner, revision: 0, completedSteps: 0, actor: { x: 140, y: 535, facing: 1 }, walked: 0,
    objectId: `tutorial-model:${owner}`, objectLocation: 'field', events: [] };
}
/** Footprints are independent of the decorative workbench/roof alpha. */
export const TROPHY_TUTORIAL_FOOTPRINTS_V6 = [
  { x: 77, y: 345, width: 126, height: 50 }, { x: 492, y: 345, width: 116, height: 50 },
  { x: 944, y: 345, width: 116, height: 50 }, { x: 715, y: 455, width: 110, height: 38 },
] as const;
export function trophyTutorialWalkableV6(p: TrophyTutorialPointV6): boolean {
  const r = TROPHY_TUTORIAL_METRICS_V6.actorRadius;
  return finite(p.x) && finite(p.y) && p.x >= 40 + r && p.x <= 1160 - r && p.y >= 360 + r && p.y <= 615 - r &&
    !TROPHY_TUTORIAL_FOOTPRINTS_V6.some(b => p.x + r > b.x && p.x - r < b.x + b.width && p.y + r > b.y && p.y - r < b.y + b.height);
}
export function stepTrophyTutorialV6(state: TrophyTutorialStateV6, input: TrophyTutorialPointV6, seconds: number): TrophyTutorialStateV6 {
  if (!finite(seconds) || seconds <= 0 || !finite(input.x) || !finite(input.y) || !trophyTutorialWalkableV6(state.actor)) return state;
  const magnitude = Math.hypot(input.x, input.y);
  if (!finite(magnitude) || !magnitude) return state;
  const dt = Math.min(seconds, TROPHY_TUTORIAL_METRICS_V6.maxFrameSeconds), divisor = Math.max(1, magnitude);
  const dx = input.x / divisor * TROPHY_TUTORIAL_METRICS_V6.speed * dt, dy = input.y / divisor * TROPHY_TUTORIAL_METRICS_V6.speed * dt;
  let p = { x: state.actor.x, y: state.actor.y };
  const substeps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
  for (let n = 0; n < substeps; n++) {
    const x = { x: p.x + dx / substeps, y: p.y }; if (trophyTutorialWalkableV6(x)) p = x;
    const y = { x: p.x, y: p.y + dy / substeps }; if (trophyTutorialWalkableV6(y)) p = y;
  }
  const moved = distance(p, state.actor);
  return moved < 0.00001 ? state : { ...state, actor: { ...p, facing: dx > 0 ? 1 : dx < 0 ? -1 : state.actor.facing }, walked: state.walked + moved };
}
export function trophyTutorialInReachV6(state: TrophyTutorialStateV6): boolean {
  const target = trophyTutorialStepV6(state);
  return !!target && trophyTutorialWalkableV6(state.actor) && distance(state.actor, trophyTutorialStationV6(target.station).point) <= TROPHY_TUTORIAL_METRICS_V6.reach;
}
function clearLine(a: TrophyTutorialPointV6, b: TrophyTutorialPointV6) {
  const samples = Math.max(1, Math.ceil(distance(a, b) / 4));
  for (let i = 0; i <= samples; i++) if (!trophyTutorialWalkableV6({ x: a.x + (b.x - a.x) * i / samples, y: a.y + (b.y - a.y) * i / samples })) return false;
  return true;
}
export function planTrophyTutorialPathV6(state: TrophyTutorialStateV6, target: TrophyTutorialPointV6): TrophyTutorialPointV6[] {
  if (!trophyTutorialWalkableV6(state.actor) || !trophyTutorialWalkableV6(target)) return [];
  if (clearLine(state.actor, target)) return [target];
  const nodes: TrophyTutorialPointV6[] = [state.actor, target];
  for (let x = 60; x <= 1140; x += 20) for (let y = 380; y <= 600; y += 20) if (trophyTutorialWalkableV6({ x, y })) nodes.push({ x, y });
  const queue = [0], parents = new Map<number, number | null>([[0, null]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const id = queue[cursor], p = nodes[id];
    if (clearLine(p, target)) {
      const path = [target]; let at: number | null = id;
      while (at !== null) { if (at !== 0) path.push(nodes[at]); at = parents.get(at)!; }
      return path.reverse();
    }
    for (let i = 2; i < nodes.length; i++) if (!parents.has(i) && distance(p, nodes[i]) <= 30 && clearLine(p, nodes[i])) { parents.set(i, id); queue.push(i); }
  }
  return [];
}
export function stepTrophyTutorialPathV6(state: TrophyTutorialStateV6, path: readonly TrophyTutorialPointV6[], seconds: number) {
  const remaining = [...path];
  while (remaining.length && distance(state.actor, remaining[0]) < 0.5) remaining.shift();
  if (!remaining.length || !finite(seconds) || seconds <= 0) return { state, remaining };
  const next = remaining[0], delta = { x: next.x - state.actor.x, y: next.y - state.actor.y };
  return { state: stepTrophyTutorialV6(state, delta, Math.min(seconds, distance(state.actor, next) / TROPHY_TUTORIAL_METRICS_V6.speed)), remaining };
}
const between = (v: unknown, a: number, b: number) => finite(v) && v >= a && v <= b;
const stringsEqual = (raw: unknown, expected: readonly string[]) => Array.isArray(raw) && raw.length === expected.length && expected.every((v, i) => raw[i] === v);
function checkedValues(stepNumber: number, v: Record<string, unknown>): { values: Record<string, unknown> | null; message: string } {
  const result = (condition: boolean, values: Record<string, unknown>, message: string) => ({ values: condition ? values : null, message });
  switch (stepNumber) {
    case 1: return result(v.open === true && v.railsRead === true && between(v.margin, 16, 40), { open: true, railsRead: true, margin: v.margin }, 'Ouvre la niche, relève ses rails et laisse au moins 16 unités de marge.');
    case 2: return result(between(v.frameX, 42, 58) && between(v.frameY, 42, 58) && between(v.zoom, 45, 70), { frameX: v.frameX, frameY: v.frameY, zoom: v.zoom }, 'Le modèle, son sol et le repère fixe doivent tous rester dans le cadre.');
    case 3: return result(stringsEqual(v.traces, ['visible-mark', 'ground-reference']), { traces: ['visible-mark', 'ground-reference'] }, 'Relève la marque et le repère du sol ; aucune chasse n’a été observée.');
    case 4: return result(v.cradle === 'fitted', { cradle: 'fitted' }, 'Ce gabarit demande le berceau ajusté. Ni compression ni espace flottant.');
    case 5: return result(between(v.leftAttachment, 18, 28) && between(v.rightAttachment, 72, 82), { leftAttachment: v.leftAttachment, rightAttachment: v.rightAttachment }, 'Place les attaches sur les appuis latéraux, loin de la marque centrale.');
    case 6: return result(v.provenance === 'local-model' && v.closed === true, { provenance: 'local-model', closed: true }, 'Le contenant exige sa provenance réelle et sa fermeture avant transport.');
    case 7: return result(between(v.rail, 95, 100) && v.sourceVisible === true, { rail: v.rail, sourceVisible: true }, 'La caisse doit atteindre la butée et conserver sa source lisible.');
    case 8: return result(v.screening === 'unknown' && v.handling === 'teaching-model', { screening: 'unknown', handling: 'teaching-model' }, 'Un résultat inconnu ne devient pas sûr. Garde l’original fermé et utilise le modèle.');
    case 9: return result(Array.isArray(v.views) && v.views.length === 3 && ['face', 'profile', 'reverse'].every(x => v.views instanceof Array && v.views.includes(x)), { views: ['face', 'profile', 'reverse'] }, 'Observe séparément face, profil et revers.');
    case 10: return result(v.fragileObserved === true && v.markObserved === true && v.initialSaved === true, { fragileObserved: true, markObserved: true, initialSaved: true }, 'Relève les deux zones puis conserve l’état initial avant de toucher à la fibre.');
    case 11: return result(v.fibre === 'detachable' && v.indexed === true, { fibre: 'detachable', indexed: true }, 'Seule la fibre détachable prévue peut être soulevée ; conserve son index.');
    case 12: return result(between(v.support, 21, 29) && between(v.pattern, 71, 79), { support: v.support, pattern: v.pattern }, 'L’appui se règle autour de 25, le motif autour de 75.');
    case 13: return result(Array.isArray(v.pieces) && v.pieces.length === 3 && v.pieces.every((n, i) => n === i + 1), { pieces: [1, 2, 3] }, 'Les trois pièces du modèle s’assemblent dans l’ordre 1, 2, 3.');
    case 14: return result(v.base === 'compatible' && between(v.balance, 45, 55), { base: 'compatible', balance: v.balance }, 'Choisis une base compatible et centre son équilibre.');
    case 15: return result(between(v.angle, 25, 35), { angle: v.angle }, 'Une lumière rasante autour de 30° révèle la marque.');
    case 16: return result(Array.isArray(v.plaqueFacts) && v.plaqueFacts.length >= 2 && v.plaqueFacts.length <= 3 && v.plaqueFacts.includes('model-provenance') && v.plaqueFacts.includes('observed-mark') && v.plaqueFacts.every(x => ['model-provenance', 'observed-mark', 'uncertain-age'].includes(x as string)) && new Set(v.plaqueFacts).size === v.plaqueFacts.length, { plaqueFacts: ['model-provenance', 'observed-mark', ...(v.plaqueFacts instanceof Array && v.plaqueFacts.includes('uncertain-age') ? ['uncertain-age'] : [])] }, 'La plaque doit porter provenance et marque observées. L’âge peut rester une question ; aucune victoire ne peut être inventée.');
    case 17: return result(stringsEqual(v.railLocks, ['left', 'right']), { railLocks: ['left', 'right'] }, 'Verrouille les deux rails après le transport du berceau.');
    case 18: return result(stringsEqual(v.cycle, ['closed', 'margin-checked', 'reopened']) && between(v.margin, 16, 40) && v.confirm === true, { cycle: ['closed', 'margin-checked', 'reopened'], margin: v.margin, confirm: true }, 'La fermeture, le contrôle de marge puis la réouverture précèdent la confirmation.');
    default: return { values: null, message: 'Aucun geste supplémentaire n’est prévu.' };
  }
}
export interface TrophyTutorialActionResultV6 { accepted: boolean; state: TrophyTutorialStateV6; message: string }
export function actTrophyTutorialV6(state: TrophyTutorialStateV6, gesture: TrophyTutorialGestureV6): TrophyTutorialActionResultV6 {
  const deny = (message: string) => ({ accepted: false, state, message });
  const definition = trophyTutorialStepV6(state);
  if (!definition || gesture.step !== definition.number || !record(gesture.values)) return deny('Le geste doit suivre le dernier poste confirmé.');
  if (!trophyTutorialInReachV6(state)) return deny('Rejoins physiquement le poste avant de manipuler le modèle.');
  const transfers: Record<number, { pickup: number; distance: number }> = { 4: { pickup: 3, distance: 120 }, 7: { pickup: 6, distance: 140 }, 9: { pickup: 8, distance: 140 }, 12: { pickup: 11, distance: 70 }, 15: { pickup: 14, distance: 260 }, 17: { pickup: 16, distance: 300 } };
  const transfer = transfers[definition.number];
  if (transfer) {
    const pickup = state.events.find(event => event.step === transfer.pickup);
    if (!pickup || state.walked - pickup.walked < transfer.distance) return deny('Porte le contenant par le passage jusqu’au poste suivant. Aucun transfert à distance.');
  }
  if (gesture.partial !== undefined) {
    const view = gesture.values.view;
    if (gesture.partial !== 'view' || definition.number !== 9 || typeof view !== 'string' || !['face', 'profile', 'reverse'].includes(view) || trophyTutorialObservedViewsV6(state).includes(view)) return deny('Cette face est déjà relevée ou ne correspond pas au poste d’examen.');
    return { accepted: true, state: { ...state, revision: state.revision + 1, objectLocation: 'inspection',
      events: [...state.events, { step: 9, partial: 'view', values: { view }, actor: { ...state.actor }, walked: state.walked }] },
      message: view === 'face' ? 'La face est observée. Le profil et le revers gardent leur propre lecture.' : view === 'profile' ? 'Le profil est conservé avec sa propre vue.' : 'Le revers est conservé avec sa propre vue.' };
  }
  const checked = checkedValues(definition.number, gesture.values);
  if (!checked.values) return deny(checked.message);
  if (definition.number === 9 && trophyTutorialObservedViewsV6(state).length !== 3) return deny('Conserve chaque vue avant de confirmer l’examen complet.');
  const completedSteps = state.completedSteps + 1;
  return { accepted: true, state: { ...state, revision: state.revision + 1, completedSteps,
    objectLocation: trophyTutorialObjectLocationV6(completedSteps),
    events: [...state.events, { step: definition.number, values: checked.values, actor: { ...state.actor }, walked: state.walked }] }, message: definition.reply };
}
export interface TrophyTutorialInspectionV6 { status: 'absent' | 'valid' | 'invalid' | 'future'; state: TrophyTutorialStateV6 | null; reason: string }
/** Undefined is an old save without the activity. Null/corrupt/newer ledgers
 * are not treated as an empty tutorial; their campaign owner decides recovery. */
export function inspectTrophyTutorialV6(raw: unknown, owner: string): TrophyTutorialInspectionV6 {
  const invalid = (reason: string): TrophyTutorialInspectionV6 => ({ status: 'invalid', state: null, reason });
  if (raw === undefined) return { status: 'absent', state: null, reason: '' };
  if (!ownerValid(owner)) return invalid('Propriétaire de campagne invalide.');
  if (record(raw) && finite(raw.version) && raw.version > 1) return { status: 'future', state: null, reason: 'Cette version du tutoriel est plus récente. Conserver les données avant reprise.' };
  if (!record(raw) || raw.version !== 1 || raw.owner !== owner || raw.objectId !== `tutorial-model:${owner}` || !Array.isArray(raw.events) || raw.events.length > 21) return invalid('Journal du modèle incompatible avec cette campagne.');
  let state = createTrophyTutorialV6(owner);
  for (const event of raw.events) {
    if (!record(event) || !record(event.actor) || !finite(event.actor.x) || !finite(event.actor.y) || (event.actor.facing !== -1 && event.actor.facing !== 1) || !finite(event.walked) || event.walked < state.walked || event.walked - state.walked + 0.01 < distance(state.actor, event.actor as unknown as TrophyTutorialPointV6) || event.walked > 10_000_000 || !finite(event.step) || !record(event.values) || (event.partial !== undefined && event.partial !== 'view')) return invalid('Un poste confirmé ou son trajet est invalide.');
    state = { ...state, actor: { x: event.actor.x, y: event.actor.y, facing: event.actor.facing }, walked: event.walked };
    const applied = actTrophyTutorialV6(state, { step: event.step, values: event.values, ...(event.partial === 'view' ? { partial: 'view' as const } : {}) });
    if (!applied.accepted) return invalid(applied.message);
    state = applied.state;
  }
  if (!record(raw.actor) || !finite(raw.actor.x) || !finite(raw.actor.y) || (raw.actor.facing !== -1 && raw.actor.facing !== 1) || !trophyTutorialWalkableV6(raw.actor as unknown as TrophyTutorialPointV6) || !finite(raw.walked) || raw.walked < state.walked || raw.walked - state.walked + 0.01 < distance(state.actor, raw.actor as unknown as TrophyTutorialPointV6) || raw.walked > 10_000_000 || raw.revision !== state.revision || raw.completedSteps !== state.completedSteps || raw.objectLocation !== state.objectLocation) return invalid('L’état stable ne concorde pas avec les gestes confirmés.');
  return { status: 'valid', state: { ...state, actor: { x: raw.actor.x, y: raw.actor.y, facing: raw.actor.facing }, walked: raw.walked }, reason: '' };
}
/** Parent-side CAS for the single SaveGame writer. False persistence never
 * authorizes publishing the candidate as the durable tutorial state. */
export function acceptTrophyTutorialCheckpointV6(current: unknown, candidate: unknown, owner: string): TrophyTutorialStateV6 | null {
  const before = inspectTrophyTutorialV6(current, owner), after = inspectTrophyTutorialV6(candidate, owner);
  if (!['absent', 'valid'].includes(before.status) || after.status !== 'valid' || !after.state) return null;
  const previous = before.state ?? createTrophyTutorialV6(owner), next = after.state;
  if (next.revision !== previous.revision + 1 || next.events.length !== previous.events.length + 1 || (next.completedSteps !== previous.completedSteps && next.completedSteps !== previous.completedSteps + 1) || JSON.stringify(next.events.slice(0, previous.events.length)) !== JSON.stringify(previous.events)) return null;
  return next;
}
