import type { WarRulesV6 } from "./clanWarBibleV6";
import type { WarWorksActionV6, WarWorksSessionV6, WarWorksTransitionV6 } from "./clanWarWorksV6";

/** Exercise tuning only: the workbook specifies consumables and stabilisation,
 * but neither their conversion price nor a treatment duration. */
export const WAR_MEDICAL_BALANCE_V92 = { ravPerDose: 1, dosesPerTreatment: 1, workedTurns: 2, stockCap: 20, key: "stabilisation-v92-1" } as const;
export interface WarMedicalTreatmentV92 {
  id: string; workId: string; memberId: string; operatorTeamId: string; operatorMemberId: string;
  startedTurn: number; workedTurns: number[]; phase: "treating" | "stabilised" | "cancelled"; cancelledTurn: number | null;
}
export interface WarMedicalV92 {
  version: 1; rulesKey: string; balanceKey: typeof WAR_MEDICAL_BALANCE_V92.key; reservedRav: number;
  deliveries: { id: string; workId: string; transactionId: string; units: number; turn: number }[];
  treatments: WarMedicalTreatmentV92[];
}
export type WarMedicalActionV92 =
  | { kind: "stock-medical"; workId: string; teamId: string; units: number }
  | { kind: "begin-medical"; workId: string; teamId: string; memberId: string }
  | { kind: "work-medical" | "cancel-medical"; treatmentId: string; teamId: string };
const sourceIds = ["W3-S11", "W3-U18", "W3-R15", "W3-R20", "W3-OBJ04"];
const cell = (rules: WarRulesV6, id: string, column: string) => rules.entries.find(entry => entry.id === id)?.fields.find(field => field.column === column)?.value;
export const warMedicalRulesKeyV92 = (rules: WarRulesV6) => JSON.stringify({ sha: rules.metadata.sha256,
  entries: sourceIds.map(id => rules.entries.find(entry => entry.id === id)), balance: WAR_MEDICAL_BALANCE_V92 });
export function warMedicalAvailableV92(rules: WarRulesV6) {
  return cell(rules, "W3-S11", "G") === "W3-U18" && ["D", "E", "F"].every(column => Number.isSafeInteger(cell(rules, "W3-S11", column)))
    && String(cell(rules, "W3-S11", "H")).includes("stabiliser") && String(cell(rules, "W3-S11", "I")).includes("Consommables")
    && String(cell(rules, "W3-S11", "I")).includes("indisponibilité")
    && String(cell(rules, "W3-U18", "N")).includes("Ne ressuscite personne") && String(cell(rules, "W3-U18", "N")).includes("blessure majeure")
    && rules.units.some(unit => unit.id === "W3-U18" && unit.fullMembers === 1)
    && sourceIds.every(id => rules.entries.some(entry => entry.id === id));
}
export const warMedicalTeamLockedV92 = (state: WarWorksSessionV6, teamId: string) => state.medical?.treatments.find(item => item.phase === "treating" && item.operatorTeamId === teamId);
export const warMedicalPatientLockedV92 = (state: WarWorksSessionV6, memberId: string) => state.medical?.treatments.find(item => item.phase === "treating" && item.memberId === memberId);
export const warMedicalStockV92 = (state: WarWorksSessionV6, workId: string) => (state.medical?.deliveries.filter(item => item.workId === workId).reduce((sum, item) => sum + item.units, 0) ?? 0)
  - (state.medical?.treatments.filter(item => item.workId === workId).length ?? 0) * WAR_MEDICAL_BALANCE_V92.dosesPerTreatment;
const extension = (state: WarWorksSessionV6, rules: WarRulesV6): WarMedicalV92 => state.medical ?? {
  version: 1, rulesKey: warMedicalRulesKeyV92(rules), balanceKey: WAR_MEDICAL_BALANCE_V92.key, reservedRav: 0, deliveries: [], treatments: [],
};
/** Checkpoint proof is structural and physical, not a signature of an editable
 * isolated exercise. Stabilisation never changes status, XP or inventory. */
export function validWarMedicalV92(state: WarWorksSessionV6, rules: WarRulesV6, ids: Set<string>): boolean {
  const medical = state.medical!;
  const keys = (value: object, fields: string[]) => !!value && Object.keys(value).length === fields.length && Object.keys(value).every(key => fields.includes(key));
  const integer = (value: number, low = 1, high = state.turn) => Number.isSafeInteger(value) && value >= low && value <= high;
  const numericId = (id: string) => Number(id.slice(id.indexOf(":") + 1));
  const identity = (id: string) => typeof id === "string" && /^medical:\d+$/.test(id) && integer(numericId(id), 2, state.nextIdentity - 1) && !ids.has(id);
  if (!keys(medical, ["version", "rulesKey", "balanceKey", "reservedRav", "deliveries", "treatments"]) || medical.version !== 1
    || medical.rulesKey !== warMedicalRulesKeyV92(rules) || medical.balanceKey !== WAR_MEDICAL_BALANCE_V92.key || !warMedicalAvailableV92(rules)
    || state.supplyMode !== "local" || !state.infrastructure || !integer(medical.reservedRav, 0, state.startingRav)
    || !Array.isArray(medical.deliveries) || medical.deliveries.length > 10000 || !Array.isArray(medical.treatments) || medical.treatments.length > 10000) return false;
  const txIds = new Set<string>(), sites = new Map<string, number>(), events: { id: string; workId: string; units: number; turn: number }[] = [];
  let total = 0;
  for (const delivery of medical.deliveries) {
    const work = state.works.find(work => work.id === delivery.workId), tx = state.transfers.find(tx => tx.id === delivery.transactionId), lot = state.lots.find(lot => lot.id === tx?.fromId);
    if (!keys(delivery, ["id", "workId", "transactionId", "units", "turn"]) || !identity(delivery.id) || !work || work.structureId !== "W3-S11" || work.phase !== "ready"
      || !integer(delivery.turn) || !integer(delivery.units, 1, WAR_MEDICAL_BALANCE_V92.stockCap) || !tx || txIds.has(tx.id)
      || tx.turn !== delivery.turn || tx.purpose !== "medical" || tx.toId !== null || tx.rav !== delivery.units * WAR_MEDICAL_BALANCE_V92.ravPerDose
      || !lot || (lot.location === "depot" ? work.territoryId !== state.originId : lot.location !== "cache"
        || !state.works.some(cache => cache.id === lot.workId && cache.phase === "ready" && cache.territoryId === work.territoryId))) return false;
    ids.add(delivery.id); txIds.add(tx.id); total += tx.rav; events.push(delivery);
  }
  const activeTeams = new Set<string>(), activePatients = new Set<string>(), successfulPatients = new Set<string>(), activeWorks = new Set<string>();
  const teamSiteAt = (teamId: string, turn: number) => {
    const steps = state.infrastructure!.traversals.filter(step => step.teamId === teamId);
    return steps.filter(step => step.turn <= turn).at(-1)?.toId ?? steps[0]?.fromId ?? state.teams.find(group => group.team.id === teamId)?.territoryId;
  };
  for (const treatment of medical.treatments) {
    const work = state.works.find(work => work.id === treatment.workId), operator = state.teams.find(group => group.team.id === treatment.operatorTeamId);
    const patient = state.extraction?.patients.find(patient => patient.memberId === treatment.memberId);
    const patientSiteAt = (turn: number) => patient?.steps.filter(step => step.turn <= turn).at(-1)?.toId ?? patient?.declaredTerritoryId;
    if (!keys(treatment, ["id", "workId", "memberId", "operatorTeamId", "operatorMemberId", "startedTurn", "workedTurns", "phase", "cancelledTurn"])
      || !identity(treatment.id) || !work || work.structureId !== "W3-S11" || work.phase !== "ready" || !operator || operator.team.unitId !== "W3-U18"
      || !operator.team.members.some(member => member.id === treatment.operatorMemberId) || !patient || !integer(treatment.startedTurn, patient.declaredTurn)
      || patientSiteAt(treatment.startedTurn) !== work.territoryId || teamSiteAt(operator.team.id, treatment.startedTurn) !== work.territoryId
      || !Array.isArray(treatment.workedTurns) || treatment.workedTurns.length > WAR_MEDICAL_BALANCE_V92.workedTurns
      || !["treating", "stabilised", "cancelled"].includes(treatment.phase)
      || treatment.workedTurns.some((turn, index) => !integer(turn, (treatment.workedTurns[index - 1] ?? treatment.startedTurn) + 1)
        || patientSiteAt(turn) !== work.territoryId || teamSiteAt(operator.team.id, turn) !== work.territoryId)
      || (treatment.phase === "stabilised") !== (treatment.workedTurns.length === WAR_MEDICAL_BALANCE_V92.workedTurns)
      || (treatment.phase === "cancelled" ? !integer(treatment.cancelledTurn!, treatment.workedTurns.at(-1) ?? treatment.startedTurn) : treatment.cancelledTurn !== null)
      || state.infrastructure!.traversals.some(step => step.teamId === operator.team.id && step.turn > treatment.startedTurn
        && step.turn <= (treatment.phase === "treating" ? state.turn : treatment.cancelledTurn ?? treatment.workedTurns.at(-1)!))) return false;
    if (treatment.phase !== "cancelled") {
      if (successfulPatients.has(patient.memberId)) return false;
      successfulPatients.add(patient.memberId);
    }
    if (treatment.phase === "treating") {
      if (activeTeams.has(operator.team.id) || activePatients.has(patient.memberId) || activeWorks.has(work.id) || operator.territoryId !== work.territoryId
        || operator.dutyWorkId !== work.id || work.operatorTeamId !== operator.team.id || operator.route || operator.payloadWorkId
        || operator.team.members.some(member => member.status !== "fit") || patient.territoryId !== work.territoryId || patient.carrierId !== null) return false;
      activeTeams.add(operator.team.id); activePatients.add(patient.memberId); activeWorks.add(work.id);
    }
    ids.add(treatment.id); events.push({ id: treatment.id, workId: work.id, units: -WAR_MEDICAL_BALANCE_V92.dosesPerTreatment, turn: treatment.startedTurn });
  }
  for (const event of events.sort((a, b) => a.turn - b.turn || numericId(a.id) - numericId(b.id))) {
    const stock = (sites.get(event.workId) ?? 0) + event.units;
    if (stock < 0 || stock > WAR_MEDICAL_BALANCE_V92.stockCap) return false;
    sites.set(event.workId, stock);
  }
  return total === medical.reservedRav && state.transfers.filter(tx => tx.purpose === "medical").every(tx => txIds.has(tx.id));
}
interface MedicalHooks {
  deny(message: string): WarWorksTransitionV6; unchanged(message: string): WarWorksTransitionV6;
  report(state: WarWorksSessionV6, message: string, sourceIds: string[]): WarWorksTransitionV6;
  turn(state: WarWorksSessionV6): WarWorksSessionV6;
  supplied(state: WarWorksSessionV6, site: string): boolean;
  debit(state: WarWorksSessionV6, site: string, rav: number): WarWorksSessionV6 | null;
}
export function applyWarMedicalV92(state: WarWorksSessionV6, action: WarWorksActionV6, rules: WarRulesV6, hooks: MedicalHooks): WarWorksTransitionV6 | null {
  if (!["stock-medical", "begin-medical", "work-medical", "cancel-medical"].includes(action.kind)) return null;
  const medicalAction = action as WarMedicalActionV92;
  if (state.supplyMode !== "local" || !warMedicalAvailableV92(rules)) return hooks.deny("S11 demande les sources complètes et les stocks réellement locaux.");
  const medical = extension(state, rules), existing = "treatmentId" in medicalAction ? medical.treatments.find(item => item.id === medicalAction.treatmentId) : null;
  const workId = "workId" in medicalAction ? medicalAction.workId : existing?.workId;
  const work = state.works.find(work => work.id === workId), group = state.teams.find(group => group.team.id === medicalAction.teamId);
  if (existing && existing.phase !== "treating") return hooks.unchanged("Ce soin est déjà terminé ou interrompu ; aucun second consommable, tour ou résultat.");
  if (!work || work.structureId !== "W3-S11" || work.phase !== "ready" || !group || group.team.unitId !== "W3-U18"
    || work.operatorTeamId !== group.team.id || group.dutyWorkId !== work.id || group.territoryId !== work.territoryId || group.payloadWorkId || group.route
    || group.team.members.length !== 1 || group.team.members[0].status !== "fit") return hooks.deny("Un vrai soigneur U18 doit occuper le poste S11 installé, à sa position réelle.");
  const locked = warMedicalTeamLockedV92(state, group.team.id);
  if (locked && (!existing || existing !== locked)) return hooks.deny("Le soigneur suit déjà un patient. Terminez ou interrompez ce soin avant une autre préparation.");
  if (medicalAction.kind === "cancel-medical") {
    if (!existing || existing.operatorTeamId !== group.team.id) return hooks.deny("Ce soigneur ne suit pas ce patient.");
    return hooks.report({ ...state, medical: { ...medical, treatments: medical.treatments.map(item => item.id === existing.id
      ? { ...item, phase: "cancelled", cancelledTurn: state.turn } : item) } }, "Soin interrompu : patient toujours blessé, consommable utilisé non restitué. Le soigneur reste affecté au poste.", sourceIds);
  }
  if (!hooks.supplied(state, work.territoryId)) return hooks.deny("L’entretien local du site n’est pas couvert ; aucun soin ni réserve gratuite depuis un dépôt distant.");
  if (medicalAction.kind === "stock-medical") {
    if (!Number.isSafeInteger(medicalAction.units) || medicalAction.units < 1 || medicalAction.units > WAR_MEDICAL_BALANCE_V92.stockCap
      || warMedicalStockV92(state, work.id) + medicalAction.units > WAR_MEDICAL_BALANCE_V92.stockCap) return hooks.deny("Choisissez un stock de 1 à 20 consommables ; aucune réserve au-delà du gabarit d’exercice.");
    const paid = hooks.debit({ ...state, medical }, work.territoryId, medicalAction.units * WAR_MEDICAL_BALANCE_V92.ravPerDose);
    if (!paid || !hooks.supplied(paid, work.territoryId)) return hooks.deny("Stock local insuffisant pour préparer les consommables tout en couvrant l’entretien du site.");
    const id = `medical:${paid.nextIdentity}`, transactionId = paid.transfers.at(-1)!.id;
    return hooks.report({ ...paid, nextIdentity: paid.nextIdentity + 1, medical: { ...paid.medical!, deliveries: [...medical.deliveries,
      { id, workId: work.id, transactionId, units: medicalAction.units, turn: state.turn }] } },
    `${medicalAction.units} consommable(s) préparé(s) au poste, payé(s) depuis le lot local identifié. Réglage d’exercice : 1 RAV par consommable.`, sourceIds);
  }
  if (medicalAction.kind === "begin-medical") {
    const previous = medical.treatments.find(item => item.memberId === medicalAction.memberId && item.phase !== "cancelled");
    if (previous) return hooks.unchanged("Ce patient est déjà suivi ou stabilisé ; aucune deuxième dose ni guérison automatique.");
    const patient = state.extraction?.patients.find(item => item.memberId === medicalAction.memberId);
    const member = state.teams.find(owner => owner.team.id === patient?.teamId)?.team.members.find(member => member.id === patient?.memberId);
    if (!patient || member?.status !== "wounded" || patient.carrierId || patient.territoryId !== work.territoryId) return hooks.deny("Déposez le patient vivant et blessé au vrai poste ; aucun soin à distance ni résurrection.");
    if (warMedicalStockV92(state, work.id) < WAR_MEDICAL_BALANCE_V92.dosesPerTreatment) return hooks.deny("Réserve vide : préparez un consommable avec le stock local avant de commencer.");
    return hooks.report({ ...state, nextIdentity: state.nextIdentity + 1, medical: { ...medical, treatments: [...medical.treatments,
      { id: `medical:${state.nextIdentity}`, workId: work.id, memberId: patient.memberId, operatorTeamId: group.team.id, operatorMemberId: group.team.members[0].id,
        startedTurn: state.turn, workedTurns: [], phase: "treating", cancelledTurn: null }] } },
    "Un consommable utilisé. Patient indisponible et soigneur immobilisé : accomplissez deux tours de soin. Attendre ne travaille pas le soin.", sourceIds);
  }
  if (!existing || existing.operatorTeamId !== group.team.id) return hooks.deny("Ce soigneur ne suit pas ce patient.");
  const patient = state.extraction?.patients.find(patient => patient.memberId === existing.memberId);
  if (!patient || patient.carrierId || patient.territoryId !== work.territoryId) return hooks.deny("Le patient doit rester réellement déposé au poste pendant le soin.");
  const workedTurns = [...existing.workedTurns, state.turn + 1], finished = workedTurns.length === WAR_MEDICAL_BALANCE_V92.workedTurns;
  return hooks.report(hooks.turn({ ...state, medical: { ...medical, treatments: medical.treatments.map(item => item.id === existing.id
    ? { ...item, workedTurns, phase: finished ? "stabilised" : "treating" } : item) } }), finished
    ? "Patient stabilisé, toujours blessé et indisponible. Organisez son évacuation réelle vers S16 ; aucun XP, équipement ni retour à l’effectif combattant."
    : "Un tour de soin réellement travaillé ; la personne et le soigneur restent au poste.", sourceIds);
}
