import type { SaveGame } from '../types';
import { inspectClanShipDocking, type ClanShipRoomId } from './clanShipDocking';
import {
  clanShipIncidentNpcRoom, clanShipIncidentVariant, clanShipIncidentView,
  evaluateClanShipIncidentsCampaign, inspectClanShipIncidents,
  type ClanShipIncidentCampaign, type ClanShipIncidentId,
} from './clanShipIncidents';
import {
  evaluateClanShipOperationsCampaign, inspectClanShipOperations, type ClanShipNpcId,
} from './clanShipOperations';
import {
  CLAN_SHIP_SPACE_ORDERS, actClanShipSpaceEncounter, clanShipSpaceOrderAvailability,
  inspectClanShipSpaceEncounter, type ClanShipSpaceEncounter, type ClanShipSpaceOrder,
} from './clanShipSpaceEncounter';

/** OPS-B01/B02 consequences read their completed physical journal. Reading a
 * reply or a forecast never creates a repair, crew role, reward or saved turn. */
export type ClanShipMaintenanceCampaign = ClanShipIncidentCampaign & Pick<SaveGame, 'clanShipDocking'>;

function completedMaintenance(save: ClanShipMaintenanceCampaign, id: ClanShipIncidentId) {
  const incident = inspectClanShipIncidents(save.clanShipIncidents, save.createdAt);
  const operations = inspectClanShipOperations(save.clanShipOperations, save.createdAt);
  if (!incident.state || !operations.state || !evaluateClanShipOperationsCampaign(operations.state, save).allowed ||
      !evaluateClanShipIncidentsCampaign(incident.state, save).allowed) return null;
  const view = clanShipIncidentView(incident.state, id);
  if (view.completedRevision === null) return null;
  return { incident: incident.state, operations: operations.state, view };
}

export function clanShipSealTrustReply(save: ClanShipMaintenanceCampaign, npcId: ClanShipNpcId,
  contact: { roomId: ClanShipRoomId; focusedNpcId: ClanShipNpcId | null }): { line: string; fact: string } | null {
  try {
    if (npcId !== 'threshold-guard' || contact.focusedNpcId !== npcId) return null;
    const completed = completedMaintenance(save, 'sealed-lot');
    const docking = inspectClanShipDocking(save.clanShipDocking, save.createdAt).state;
    const room = clanShipIncidentNpcRoom(save, npcId);
    if (!completed || !room || docking?.status !== 'aboard' || docking.roomId !== room || contact.roomId !== room) return null;
    const lot = clanShipIncidentVariant(save.createdAt, 'sealed-lot').lotCode;
    return {
      line: 'Tu as suivi le témoin jusqu’à sa cause, puis vérifié le retour sans condamner la coursive. Je peux te confier de nouveau ce seuil.',
      fact: `Lot ${lot} : identité rapprochée, pression nulle et fermeture contrôlée ; dossier ${completed.view.completedRevision} conservé.`,
    };
  } catch { return null; }
}

export interface ClanShipRelayForecast {
  first: ClanShipSpaceOrder;
  second: ClanShipSpaceOrder | null;
  labels: readonly string[];
  turns: number;
  formation: number;
  energy: number;
  hostileIntegrity: number;
  hostileDrive: number;
  scanLevel: number;
  range: number;
  outcome: ClanShipSpaceEncounter['status'];
}
export interface ClanShipRelayDiagnostic {
  sourceTurn: number;
  sourceSnapshot: string;
  completedIncidentRevision: number;
  referenceBranch: 'A' | 'B';
  repairedBranch: 'A' | 'B';
  forecasts: readonly ClanShipRelayForecast[];
}

/** Compare at most two real orders. Every branch uses the same reducer as a
 * committed turn, including crew, reaction, energy cap, turn limit and defeat.
 * This is bounded advice, not a promise about the whole remaining encounter. */
function relayForecasts(encounter: ClanShipSpaceEncounter): ClanShipRelayForecast[] {
  const options: ClanShipRelayForecast[] = [];
  for (const first of CLAN_SHIP_SPACE_ORDERS) {
    if (first === 'withdraw') continue;
    const opening = actClanShipSpaceEncounter(encounter, { type: first, expectedTurn: encounter.turn });
    if (!opening.accepted || opening.state.status === 'defeat') continue;
    const nextOrders: (ClanShipSpaceOrder | null)[] = opening.state.status === 'active'
      ? CLAN_SHIP_SPACE_ORDERS.filter(order => order !== 'withdraw') : [null];
    for (const second of nextOrders) {
      const result = second === null ? opening
        : actClanShipSpaceEncounter(opening.state, { type: second, expectedTurn: opening.state.turn });
      if (!result.accepted || result.state.status === 'defeat') continue;
      const next = result.state;
      options.push({ first, second,
        labels: [clanShipSpaceOrderAvailability(encounter, first).label,
          ...(second === null ? [] : [clanShipSpaceOrderAvailability(opening.state, second).label])],
        turns: next.turn - encounter.turn, formation: next.formationIntegrity, energy: next.energy,
        hostileIntegrity: next.hostileIntegrity, hostileDrive: next.hostileDrive,
        scanLevel: next.scanLevel, range: next.range, outcome: next.status });
    }
  }
  // Prefer a secured objective, then neutralization progress, identification,
  // approach and retained formation/energy. Keep different first decisions.
  options.sort((a, b) => Number(b.outcome === 'victory') - Number(a.outcome === 'victory') ||
    a.hostileIntegrity - b.hostileIntegrity || a.hostileDrive - b.hostileDrive ||
    b.scanLevel - a.scanLevel || b.range - a.range || b.formation - a.formation || b.energy - a.energy ||
    a.turns - b.turns || CLAN_SHIP_SPACE_ORDERS.indexOf(a.first) - CLAN_SHIP_SPACE_ORDERS.indexOf(b.first) ||
    CLAN_SHIP_SPACE_ORDERS.indexOf(a.second ?? a.first) - CLAN_SHIP_SPACE_ORDERS.indexOf(b.second ?? b.first));
  return options.filter((entry, index) => options.findIndex(other => other.first === entry.first) === index).slice(0, 3);
}

export function readClanShipRelayDiagnostic(save: ClanShipMaintenanceCampaign): ClanShipRelayDiagnostic | null {
  try {
    const completed = completedMaintenance(save, 'relay-fault');
    const docking = inspectClanShipDocking(save.clanShipDocking, save.createdAt).state;
    const encounter = completed?.operations.spaceEncounter;
    if (!completed || docking?.status !== 'aboard' || docking.roomId !== 'conseil' ||
        completed.operations.activeContract?.contractId !== 'space-interception' || encounter?.kind !== 'interception' ||
        encounter.status !== 'active') return null;
    const variant = clanShipIncidentVariant(save.createdAt, 'relay-fault');
    return {
      sourceTurn: encounter.turn, sourceSnapshot: JSON.stringify(inspectClanShipSpaceEncounter(encounter).state),
      completedIncidentRevision: completed.view.completedRevision!,
      referenceBranch: variant.other, repairedBranch: variant.branch, forecasts: relayForecasts(encounter),
    };
  } catch { return null; }
}

/** A UI cannot apply a recommendation derived from another encounter/turn. */
export function clanShipRelayDiagnosticMatches(diagnostic: ClanShipRelayDiagnostic | null,
  encounter: ClanShipSpaceEncounter): diagnostic is ClanShipRelayDiagnostic {
  const inspected = inspectClanShipSpaceEncounter(encounter);
  return !!diagnostic && inspected.status === 'valid' && diagnostic.sourceTurn === encounter.turn &&
    diagnostic.sourceSnapshot === JSON.stringify(inspected.state);
}
