import type { WarRulesV6 } from "./clanWarBibleV6";
import type { WarWorksActionV6, WarWorksSessionV6, WarWorksTransitionV6 } from "./clanWarWorksV6";

/** Original exercise balance: Excel says several lifts and time on site, not
 * three lifts or two worked turns. Rations are not mechanical chain service. */
export const WAR_HOIST_BALANCE_V90 = { liftsBeforeFault: 3, repairWorkedTurns: 2, key: "chain-wear-v90-1" } as const;
export interface WarChainSectionV90 {
  id: string; workshopWorkId: string; reservedTurn: number; transactionId: string;
  territoryId: string; carrierTeamId: string | null; loadedByTeamId: string | null; loadedTurn: number | null; deliveredTurn: number | null;
  consumedTurn: number | null;
}
export interface WarHoistFaultV90 {
  id: string; sourceId: "W5-EV25"; workId: string; triggerTurn: number; liftIds: string[];
  phase: "open" | "section-reserved" | "section-carried" | "section-delivered" | "repairing" | "repaired" | "rails-reserved" | "rails-completed";
  section: WarChainSectionV90 | null;
  repair: { teamId: string; memberIds: string[]; startedTurn: number; workedTurns: number[] } | null;
  rails: { teamId: string; kitWorkId: string; transactionId: string; reservedTurn: number; completedTurn: number | null } | null;
}
export interface WarHoistMaintenanceV90 {
  version: 1; rulesKey: string; balanceKey: typeof WAR_HOIST_BALANCE_V90.key; reservedRav: number;
  tracked: { workId: string; enabledTurn: number; baselineLiftIds: string[] }[];
  faults: WarHoistFaultV90[];
}
export type WarHoistActionV90 =
  | { kind: "enable-hoist-wear"; workId: string }
  | { kind: "reserve-chain-section"; eventId: string; workshopWorkId: string; teamId: string }
  | { kind: "load-chain-section" | "unload-chain-section" | "begin-chain-repair" | "work-chain-repair"; eventId: string; teamId: string }
  | { kind: "reserve-rail-route"; eventId: string; teamId: string; kitWorkId: string };
const sourceIds = ["W5-EV25", "W3-S04", "W3-S17", "W3-U20", "W3-KR05", "W3-L49", "W3-L21", "W3-L22"];
const sourceCell = (rules: WarRulesV6, id: string, column: string) => rules.entries.find(entry => entry.id === id)?.fields.find(cell => cell.column === column)?.value;
export const hoistMaintenanceRulesKeyV90 = (rules: WarRulesV6) => JSON.stringify({ sha: rules.metadata.sha256,
  entries: sourceIds.map(id => rules.entries.find(entry => entry.id === id)), balance: WAR_HOIST_BALANCE_V90 });
export function hoistMaintenanceAvailableV90(rules: WarRulesV6) {
  return sourceCell(rules, "W5-EV25", "C") === "W3-KR05" && sourceCell(rules, "W5-EV25", "G") === 6
    && sourceCell(rules, "W5-EV25", "J") === 2 && String(sourceCell(rules, "W5-EV25", "D")).includes("sans entretien")
    && String(sourceCell(rules, "W5-EV25", "F")).includes("pièce identifiée")
    && sourceCell(rules, "W3-S04", "G") === "W3-U20" && String(sourceCell(rules, "W3-S04", "H")).includes("livraison de pièces")
    && String(sourceCell(rules, "W3-S04", "I")).includes("immobilisée")
    && String(sourceCell(rules, "W3-U20", "N")).includes("temps sur place")
    && sourceCell(rules, "W3-L49", "C") === "W3-K19" && sourceCell(rules, "W3-L49", "D") === "W3-K25"
    && ["W3-L21", "W3-L22"].every(id => rules.passages.some(passage => passage.id === id && passage.permitsRav))
    && rules.units.some(unit => unit.id === "W3-U20" && unit.fullMembers === 2);
}
export const hoistFaultV90 = (state: WarWorksSessionV6, workId: string) => state.maintenance?.faults.filter(fault => fault.workId === workId).at(-1);
export const hoistBlockedV90 = (state: WarWorksSessionV6, workId: string) => !!hoistFaultV90(state, workId) && hoistFaultV90(state, workId)?.phase !== "repaired";
export const hoistRepairTeamV90 = (state: WarWorksSessionV6, teamId: string) => state.maintenance?.faults.find(fault => fault.phase === "repairing" && fault.repair?.teamId === teamId);
export const hoistSectionCargoV90 = (state: WarWorksSessionV6, teamId: string) => state.maintenance?.faults.find(fault => fault.phase === "section-carried" && fault.section?.carrierTeamId === teamId);
export const hoistRailCargoV90 = (state: WarWorksSessionV6, teamId: string) => state.maintenance?.faults.find(fault => fault.phase === "rails-reserved" && fault.rails?.teamId === teamId);
export function trackHoistV90(state: WarWorksSessionV6, workId: string, rules: WarRulesV6): WarWorksSessionV6 {
  const work = state.works.find(work => work.id === workId);
  if (!work || work.structureId !== "W3-S17" || work.phase !== "ready" || work.passageId !== "W3-L49" || work.territoryId !== "W3-K25"
    || state.supplyMode !== "local" || !hoistMaintenanceAvailableV90(rules) || state.maintenance?.tracked.some(track => track.workId === workId)) return state;
  const maintenance: WarHoistMaintenanceV90 = state.maintenance ?? { version: 1, rulesKey: hoistMaintenanceRulesKeyV90(rules), balanceKey: WAR_HOIST_BALANCE_V90.key, reservedRav: 0, tracked: [], faults: [] };
  return { ...state, maintenance: { ...maintenance, tracked: [...maintenance.tracked,
    { workId, enabledTurn: state.turn, baselineLiftIds: state.infrastructure?.lifts.filter(lift => lift.hoistWorkId === workId).map(lift => lift.id) ?? [] }] } };
}
export function afterHoistLiftV90(state: WarWorksSessionV6, workId: string): WarWorksSessionV6 {
  const track = state.maintenance?.tracked.find(track => track.workId === workId);
  if (!track) return state;
  const previous = hoistFaultV90(state, workId);
  const serviceTurn = previous?.repair?.workedTurns.at(-1) ?? track.enabledTurn;
  const lifts = state.infrastructure?.lifts.filter(lift => lift.hoistWorkId === workId && !track.baselineLiftIds.includes(lift.id) && lift.turn > serviceTurn) ?? [];
  if (lifts.length < WAR_HOIST_BALANCE_V90.liftsBeforeFault || previous && previous.phase !== "repaired") return state;
  return { ...state, nextIdentity: state.nextIdentity + 1, maintenance: { ...state.maintenance!, faults: [...state.maintenance!.faults,
    { id: `chain-event:${state.nextIdentity}`, sourceId: "W5-EV25", workId, triggerTurn: state.turn, liftIds: lifts.slice(-3).map(lift => lift.id),
      phase: "open", section: null, repair: null, rails: null }] } };
}
export function moveHoistCargoV90(state: WarWorksSessionV6, teamId: string): WarWorksSessionV6 {
  if (!state.maintenance) return state;
  const group = state.teams.find(group => group.team.id === teamId)!;
  return { ...state, maintenance: { ...state.maintenance, faults: state.maintenance.faults.map(fault => {
    if (fault.phase === "section-carried" && fault.section?.carrierTeamId === teamId)
      return { ...fault, section: { ...fault.section, territoryId: group.territoryId } };
    if (fault.phase === "rails-reserved" && fault.rails?.teamId === teamId && group.territoryId === "W3-K27") {
      const steps = state.infrastructure!.traversals.filter(step => step.teamId === teamId && step.turn > fault.rails!.reservedTurn);
      if (steps.length === 2 && steps[0].passageId === "W3-L21" && steps[1].passageId === "W3-L22")
        return { ...fault, phase: "rails-completed", rails: { ...fault.rails, completedTurn: state.turn } };
    }
    return fault;
  }) } };
}
/** Structural and physical checkpoint proof, not a cryptographic signature for
 * an editable exercise. No campaign achievement is inferred from this ledger. */
export function validHoistMaintenanceV90(state: WarWorksSessionV6, rules: WarRulesV6, ids: Set<string>): boolean {
  const extension = state.maintenance!;
  const keys = (value: object, fields: string[]) => !!value && Object.keys(value).length === fields.length && Object.keys(value).every(key => fields.includes(key));
  const integer = (value: number, low = 1, high = state.turn) => Number.isSafeInteger(value) && value >= low && value <= high;
  const siteAt = (teamId: string, turn: number) => {
    const steps = state.infrastructure!.traversals.filter(step => step.teamId === teamId);
    return steps.filter(step => step.turn <= turn).at(-1)?.toId ?? steps[0]?.fromId ?? state.teams.find(group => group.team.id === teamId)?.territoryId;
  };
  if (!keys(extension, ["version", "rulesKey", "balanceKey", "reservedRav", "tracked", "faults"]) || extension.version !== 1
    || extension.balanceKey !== WAR_HOIST_BALANCE_V90.key || !hoistMaintenanceAvailableV90(rules)
    || extension.rulesKey !== hoistMaintenanceRulesKeyV90(rules) || state.supplyMode !== "local" || !state.infrastructure
    || !Array.isArray(extension.tracked) || extension.tracked.length < 1 || extension.tracked.length > state.works.length
    || !Array.isArray(extension.faults) || extension.faults.length > 3000 || !integer(extension.reservedRav, 0, state.startingRav)
    || new Set(extension.tracked.map(track => track.workId)).size !== extension.tracked.length) return false;
  const debitIds = new Set<string>(), liftIds = new Set<string>();
  for (const track of extension.tracked) {
    const work = state.works.find(work => work.id === track.workId);
    if (!keys(track, ["workId", "enabledTurn", "baselineLiftIds"]) || !work || work.structureId !== "W3-S17" || work.phase !== "ready"
      || work.passageId !== "W3-L49" || work.territoryId !== "W3-K25" || !integer(track.enabledTurn)
      || !Array.isArray(track.baselineLiftIds) || JSON.stringify(track.baselineLiftIds) !== JSON.stringify(state.infrastructure.lifts.filter(lift => lift.hoistWorkId === work.id && lift.turn <= track.enabledTurn).map(lift => lift.id))) return false;
    let serviceTurn = track.enabledTurn;
    for (const fault of extension.faults.filter(fault => fault.workId === track.workId)) {
      const newLifts = state.infrastructure.lifts.filter(lift => lift.hoistWorkId === work.id && lift.turn > serviceTurn);
      if (newLifts.length < 3 || JSON.stringify(fault.liftIds) !== JSON.stringify(newLifts.slice(0, 3).map(lift => lift.id))
        || fault.triggerTurn !== newLifts[2].turn || newLifts.slice(3).some(lift => fault.phase !== "repaired" || lift.turn <= (fault.repair?.workedTurns.at(-1) ?? Infinity))) return false;
      serviceTurn = fault.phase === "repaired" ? fault.repair!.workedTurns.at(-1)! : state.turn;
    }
    if (state.infrastructure.lifts.filter(lift => lift.hoistWorkId === work.id && lift.turn > serviceTurn).length >= 3) return false;
  }
  let reserved = 0, previousTrigger = 1;
  for (const fault of extension.faults) {
    const work = state.works.find(work => work.id === fault.workId);
    if (!keys(fault, ["id", "sourceId", "workId", "triggerTurn", "liftIds", "phase", "section", "repair", "rails"])
      || fault.sourceId !== "W5-EV25" || !/^chain-event:\d+$/.test(fault.id) || !integer(Number(fault.id.slice(12)), 2, state.nextIdentity - 1)
      || ids.has(fault.id) || !work || !extension.tracked.some(track => track.workId === work.id)
      || !integer(fault.triggerTurn, previousTrigger) || !Array.isArray(fault.liftIds) || fault.liftIds.length !== 3
      || fault.liftIds.some(id => liftIds.has(id)) || new Set(fault.liftIds).size !== 3
      || !["open", "section-reserved", "section-carried", "section-delivered", "repairing", "repaired", "rails-reserved", "rails-completed"].includes(fault.phase)) return false;
    ids.add(fault.id); fault.liftIds.forEach(id => liftIds.add(id)); previousTrigger = fault.triggerTurn;
    const txAt = (id: string, rav: number, territoryId: string, turn: number) => {
      const tx = state.transfers.find(tx => tx.id === id), lot = state.lots.find(lot => lot.id === tx?.fromId);
      if (!tx || debitIds.has(id) || tx.toId !== null || tx.purpose !== "repair" || tx.rav !== rav || tx.turn !== turn
        || !lot || (lot.location === "depot" ? territoryId !== state.originId : lot.location !== "cache"
          || !state.works.some(work => work.id === lot.workId && work.phase === "ready" && work.territoryId === territoryId))) return false;
      debitIds.add(id); reserved += rav; return true;
    };
    const sectionPhase = ["section-reserved", "section-carried", "section-delivered", "repairing", "repaired"].includes(fault.phase);
    const railPhase = ["rails-reserved", "rails-completed"].includes(fault.phase);
    if (sectionPhase !== (fault.section !== null) || railPhase !== (fault.rails !== null)
      || ["repairing", "repaired"].includes(fault.phase) !== (fault.repair !== null)) return false;
    if (fault.section) {
      const section = fault.section, workshop = state.works.find(work => work.id === section.workshopWorkId);
      if (!keys(section, ["id", "workshopWorkId", "reservedTurn", "transactionId", "territoryId", "carrierTeamId", "loadedByTeamId", "loadedTurn", "deliveredTurn", "consumedTurn"])
        || section.id !== `chain-section:${fault.id}` || ids.has(section.id) || !workshop || workshop.structureId !== "W3-S04" || workshop.phase !== "ready"
        || !integer(section.reservedTurn, fault.triggerTurn) || !txAt(section.transactionId, 6, workshop.territoryId, section.reservedTurn)) return false;
      ids.add(section.id);
      if (fault.phase === "section-reserved") {
        if (section.territoryId !== workshop.territoryId || section.carrierTeamId !== null || section.loadedByTeamId !== null || section.loadedTurn !== null || section.deliveredTurn !== null || section.consumedTurn !== null) return false;
      } else {
        const porter = state.teams.find(group => group.team.id === section.loadedByTeamId);
        if (!integer(section.loadedTurn!, section.reservedTurn) || !porter || siteAt(porter.team.id, section.loadedTurn!) !== workshop.territoryId
          || state.infrastructure.traversals.some(step => step.teamId === porter.team.id && step.turn > section.loadedTurn!
            && step.turn <= (section.deliveredTurn ?? state.turn) && !rules.passages.find(passage => passage.id === step.passageId)?.permitsRav)) return false;
        if (fault.phase === "section-carried") {
          const carrier = state.teams.find(group => group.team.id === section.carrierTeamId);
          if (!carrier || carrier.team.id !== section.loadedByTeamId || carrier.dutyWorkId || carrier.payloadWorkId || section.deliveredTurn !== null || section.consumedTurn !== null
            || siteAt(carrier.team.id, section.loadedTurn!) !== workshop.territoryId || section.territoryId !== carrier.territoryId
            || state.infrastructure.traversals.some(step => step.teamId === carrier.team.id && step.turn > section.loadedTurn!
              && !rules.passages.find(passage => passage.id === step.passageId)?.permitsRav)) return false;
        } else if (section.carrierTeamId !== null || section.territoryId !== work.territoryId || !integer(section.deliveredTurn!, section.loadedTurn!)
          || siteAt(porter.team.id, section.deliveredTurn!) !== work.territoryId
          || (fault.phase === "repaired" ? section.consumedTurn !== fault.repair?.workedTurns.at(-1) : section.consumedTurn !== null)) return false;
      }
    }
    if (fault.repair) {
      const repair = fault.repair, group = state.teams.find(group => group.team.id === repair.teamId);
      if (!keys(repair, ["teamId", "memberIds", "startedTurn", "workedTurns"]) || !group || group.team.unitId !== "W3-U20"
        || !Array.isArray(repair.memberIds) || repair.memberIds.length !== 2 || new Set(repair.memberIds).size !== 2
        || repair.memberIds.some(id => !group.team.members.some(member => member.id === id))
        || !integer(repair.startedTurn, fault.section!.deliveredTurn!) || siteAt(group.team.id, repair.startedTurn) !== work.territoryId
        || !Array.isArray(repair.workedTurns) || repair.workedTurns.length > 2 || repair.workedTurns.some((turn, index) =>
          !integer(turn, (repair.workedTurns[index - 1] ?? repair.startedTurn) + 1) || siteAt(group.team.id, turn) !== work.territoryId)
        || state.infrastructure.traversals.some(step => step.teamId === group.team.id && step.turn > repair.startedTurn
          && step.turn <= (repair.workedTurns.at(-1) ?? state.turn))
        || (fault.phase === "repaired") !== (repair.workedTurns.length === 2)
        || fault.phase === "repairing" && (group.territoryId !== work.territoryId || group.dutyWorkId || group.payloadWorkId || group.route
          || group.team.members.some(member => member.status !== "fit") || work.operatorTeamId !== null)) return false;
    }
    if (fault.rails) {
      const rail = fault.rails, group = state.teams.find(group => group.team.id === rail.teamId), kit = state.works.find(work => work.id === rail.kitWorkId);
      const steps = state.infrastructure.traversals.filter(step => step.teamId === rail.teamId && step.turn > rail.reservedTurn
        && step.turn <= (rail.completedTurn ?? state.turn));
      if (!keys(rail, ["teamId", "kitWorkId", "transactionId", "reservedTurn", "completedTurn"]) || !group || !kit || kit.id === work.id
        || !integer(rail.reservedTurn, fault.triggerTurn) || !txAt(rail.transactionId, 2, "W3-K25", rail.reservedTurn)
        || siteAt(rail.teamId, rail.reservedTurn) !== "W3-K25" || steps.length > 2
        || steps.some((step, index) => step.passageId !== ["W3-L21", "W3-L22"][index])
        || (fault.phase === "rails-completed" ? steps.length !== 2 || rail.completedTurn !== steps[1].turn
          : rail.completedTurn !== null || steps.length === 2 || kit.phase !== "carried" || kit.carrierTeamId !== group.team.id || group.payloadWorkId !== kit.id)) return false;
    }
  }
  return extension.reservedRav === reserved && state.transfers.filter(tx => tx.purpose === "repair").every(tx => debitIds.has(tx.id));
}
interface HelpersV90 {
  turn: (state: WarWorksSessionV6) => WarWorksSessionV6;
  report: (state: WarWorksSessionV6, message: string, sources: string[]) => WarWorksTransitionV6;
  deny: (message: string) => WarWorksTransitionV6; unchanged: (message: string) => WarWorksTransitionV6;
  debit: (state: WarWorksSessionV6, site: string, rav: number) => WarWorksSessionV6 | null;
  supplied: (site: string) => boolean;
}
export function applyHoistMaintenanceV90(state: WarWorksSessionV6, action: WarWorksActionV6, rules: WarRulesV6, h: HelpersV90): WarWorksTransitionV6 | null {
  if (action.kind === "enable-hoist-wear") {
    const next = trackHoistV90(state, action.workId, rules);
    return next === state ? h.deny("Ce suivi exige le treuil S17 sur L49, à Cour des Pièces, et les cellules V6 attestées. Aucun ancien levage n’est inventé.")
      : h.report(next, "Suivi mécanique ouvert à cet instant. Les anciens reçus restent archivés, sans usure ajoutée rétroactivement. Trois nouveaux levages avant fissure : hypothèse de prototype.", sourceIds);
  }
  if (!["reserve-chain-section", "load-chain-section", "unload-chain-section", "begin-chain-repair", "work-chain-repair", "reserve-rail-route"].includes(action.kind)) return null;
  const order = action as Exclude<WarHoistActionV90, { kind: "enable-hoist-wear" }>;
  const fault = state.maintenance?.faults.find(fault => fault.id === order.eventId), work = state.works.find(work => work.id === fault?.workId);
  const group = state.teams.find(group => group.team.id === order.teamId), fit = group?.team.members.filter(member => member.status === "fit" && member.assignmentId === group.team.id) ?? [];
  if (!fault || !work || !group || hoistFaultV90(state, work.id) !== fault || fit.length !== rules.units.find(unit => unit.id === group.team.unitId)?.fullMembers)
    return h.deny("Événement courant et équipe complète réellement présents requis.");
  const update = (next: WarWorksSessionV6, patch: Partial<WarHoistFaultV90>) => ({ ...next, maintenance: { ...next.maintenance!, faults: next.maintenance!.faults.map(item => item.id === fault.id ? { ...item, ...patch } : item) } });
  const free = !group.dutyWorkId && !group.payloadWorkId && !group.route && !hoistSectionCargoV90(state, group.team.id)
    && (!hoistRepairTeamV90(state, group.team.id) || order.kind === "work-chain-repair" && fault.repair?.teamId === group.team.id)
    && !hoistRailCargoV90(state, group.team.id)
    && !state.extraction?.patients.some(patient => patient.carrierTeamId === group.team.id) && !state.extraction?.guards.some(guard => guard.teamId === group.team.id)
    && !state.terrain?.anchorCargo.some(cargo => cargo.teamId === group.team.id) && !state.lots.some(lot => lot.location === "carrier" && lot.teamId === group.team.id && lot.rav > 0);
  if (order.kind === "reserve-chain-section") {
    if (fault.phase !== "open") return h.unchanged("Un choix et ses moyens sont déjà réservés pour cet événement ; aucun second débit.");
    const workshop = state.works.find(item => item.id === order.workshopWorkId);
    if (!workshop || workshop.structureId !== "W3-S04" || workshop.phase !== "ready" || workshop.operatorTeamId !== group.team.id
      || group.dutyWorkId !== workshop.id || group.team.unitId !== "W3-U20" || group.territoryId !== workshop.territoryId || !h.supplied(workshop.territoryId))
      return h.deny("La section doit être préparée dans un atelier S04 installé, occupé par deux U20 et alimenté sur place.");
    const paid = h.debit(state, workshop.territoryId, 6);
    if (!paid) return h.deny("Il manque un lot local de six RAV à l’atelier ; faites livrer une cache par U19. Aucun prélèvement distant.");
    const transactionId = paid.transfers.at(-1)!.id;
    return h.report(update(paid, { phase: "section-reserved", section: { id: `chain-section:${fault.id}`, workshopWorkId: workshop.id,
      reservedTurn: state.turn, transactionId, territoryId: workshop.territoryId, carrierTeamId: null, loadedByTeamId: null, loadedTurn: null, deliveredTurn: null, consumedTurn: null } }),
    "Six RAV locaux réservés pour une section identifiée. Elle reste au sol de l’atelier : aucun treuil réparé avant transport et travail.", sourceIds);
  }
  if (order.kind === "load-chain-section") {
    if (fault.phase !== "section-reserved" || !fault.section || !free || group.territoryId !== fault.section.territoryId)
      return h.deny("La section existe à l’atelier ; un porteur complet et libre doit réellement s’y trouver. Libérez d’abord son poste.");
    return h.report(update(state, { phase: "section-carried", section: { ...fault.section, carrierTeamId: group.team.id, loadedByTeamId: group.team.id, loadedTurn: state.turn } }),
    `${fault.section.id} portée par ${group.team.id}. Les passages doivent autoriser une charge RAV ; aucune copie de pièce.`, sourceIds);
  }
  if (order.kind === "unload-chain-section") {
    if (fault.phase !== "section-carried" || fault.section?.carrierTeamId !== group.team.id || group.territoryId !== work.territoryId)
      return h.deny("Le vrai porteur doit atteindre le pied du treuil avant livraison de sa section.");
    return h.report(update({ ...state, teams: state.teams.map(item => item === group ? { ...item, route: null } : item) },
      { phase: "section-delivered", section: { ...fault.section, territoryId: work.territoryId, carrierTeamId: null, deliveredTurn: state.turn } }),
    "Section livrée au pied du treuil. Le treuil reste indisponible ; deux artisans doivent engager puis accomplir le chantier.", sourceIds);
  }
  if (order.kind === "begin-chain-repair") {
    if (fault.phase !== "section-delivered" || !fault.section || !free || group.team.unitId !== "W3-U20" || group.territoryId !== work.territoryId
      || !h.supplied(work.territoryId) || work.operatorTeamId !== null)
      return h.deny("Libérez le poste du treuil. Section livrée, deux U20 libres et entretien local requis au pied pour immobiliser l’équipe.");
    return h.report(update(state, { phase: "repairing", repair: { teamId: group.team.id, memberIds: fit.map(member => member.id), startedTurn: state.turn, workedTurns: [] } }),
    "Treuil consigné : deux artisans immobilisés. Deux tours travaillés sont la durée de prototype ; l’attente seule ne répare pas.", sourceIds);
  }
  if (order.kind === "work-chain-repair") {
    if (fault.phase === "repaired") return h.unchanged("Cette section est déjà consommée et ce chantier terminé ; aucun gain répété.");
    if (fault.phase !== "repairing" || fault.repair?.teamId !== group.team.id || group.territoryId !== work.territoryId
      || !free || !fault.section || !h.supplied(work.territoryId)) return h.deny("Les mêmes deux artisans restent sur place avec la section réelle et leurs stocks ; aucun travail à distance.");
    const workedTurns = [...fault.repair.workedTurns, state.turn + 1], complete = workedTurns.length === WAR_HOIST_BALANCE_V90.repairWorkedTurns;
    const next = h.turn(update(state, { phase: complete ? "repaired" : "repairing", repair: { ...fault.repair, workedTurns },
      section: { ...fault.section, consumedTurn: complete ? state.turn + 1 : null } }));
    return h.report(next, complete ? "Section consommée une fois ; chaîne remise en service à son gabarit. Réaffectez les opérateurs. Les fermetures du lien restent intactes."
      : "Premier tour réellement travaillé. Équipe immobilisée, treuil consigné ; l’ouvrage n’est pas encore réutilisable.", sourceIds);
  }
  if (order.kind !== "reserve-rail-route") return h.deny("Ordre de chaîne inconnu ; aucun moyen ni mouvement créé.");
  if (fault.phase !== "open") return h.unchanged("Cet événement possède déjà un choix réservé ; aucun autre débit ni nouvelle récompense.");
  const kit = state.works.find(kit => kit.id === order.kitWorkId);
  const ground = state.infrastructure?.groundKits.find(item => item.workId === kit?.id);
  if (!free || group.territoryId !== "W3-K25" || !kit || kit.phase !== "reserved" || (ground?.territoryId ?? state.originId) !== "W3-K25"
    || !["W3-K26", "W3-K27"].every(id => state.observed.some(item => item.territoryId === id))
    || ["W3-L21", "W3-L22"].some(id => state.closedPassageIds.includes(id) || rules.passages.find(passage => passage.id === id)!.capacityPc < rules.units.find(unit => unit.id === group.team.unitId)!.commandPoints))
    return h.deny("Le détour demande un vrai kit au pied, un porteur libre, Forge Éteinte et Rails de la Charge reconnues, ainsi que L21/L22 ouvertes et compatibles.");
  const paid = h.debit(state, "W3-K25", 2);
  if (!paid) return h.deny("Deux RAV locaux sont requis pour le détour. Le choix reste ouvert tant que ses moyens manquent.");
  const route = { passageIds: ["W3-L21", "W3-L22"], territoryIds: ["W3-K25", "W3-K26", "W3-K27"], cost: rules.passages.filter(passage => ["W3-L21", "W3-L22"].includes(passage.id)).reduce((sum, passage) => sum + passage.movementCost, 0) };
  return h.report(update({ ...paid, teams: paid.teams.map(item => item.team.id === group.team.id ? { ...item, payloadWorkId: kit.id, route } : item),
    works: paid.works.map(item => item.id === kit.id ? { ...item, phase: "carried", carrierTeamId: group.team.id } : item),
    infrastructure: { ...paid.infrastructure!, groundKits: paid.infrastructure!.groundKits.filter(item => item.workId !== kit.id) } },
    { phase: "rails-reserved", rails: { teamId: group.team.id, kitWorkId: kit.id, transactionId: paid.transfers.at(-1)!.id, reservedTurn: state.turn, completedTurn: null } }),
  "Deux RAV réservés, kit existant chargé depuis le sol au pied. Franchissez réellement L21 puis L22 : deux tours, contre un levage. Aucun abaissement de charge suspendue n’est simulé ; le treuil restera hors service.", sourceIds);
}
