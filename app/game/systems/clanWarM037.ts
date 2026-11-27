import {
  warGarrisonV85, warSuppliedV85, warTerritoryForSimulationV96,
  type WarReportV85, type WarSimulationV85, type WarUpdateV85,
} from "./clanWarV85";
import { CANYON_GEOMETRY_V85 } from "./clanWarCanyonV85";

const SITE = "CON-T09";
const SCENE = "RTS-MAP12";
const MISSION = "R2-M037";
const SIGNS = [34, 72] as const;
type Level = 0 | 1;
export type CanyonDecisionM037 = "consolider" | "pousser";
interface AssignmentM037 { routeId: string; orderId: string; inspectorId: string }
export interface CanyonPatrolM037 extends AssignmentM037 {
  x: number;
  level: Level;
  checked: number[];
}

export function canyonReportM037(state: WarSimulationV85): WarReportV85 | undefined {
  if ((state.planetId ?? "korthas") !== "korthas") return undefined;
  return state.reports.find(report => report.id === `canyon-m037-${state.seed}`
    && report.sourceIds.includes(MISSION) && report.sourceIds.includes(SCENE));
}

function available(state: WarSimulationV85): AssignmentM037 | string {
  const route = state.convoyRouteV105;
  const site = state.territories[SITE];
  if ((state.planetId ?? "korthas") !== "korthas" || route?.territoryIds.at(-1) !== SITE) {
    return "Choisissez le Passage des Lames Plates comme destination.";
  }
  const orderId = route.completedOrderIds.at(-1);
  const origin = route.territoryIds.at(-2);
  if (!orderId || route.pendingOrderId || route.completedOrderIds.length !== route.territoryIds.length - 1
    || !origin || !warTerritoryForSimulationV96(state, origin)?.neighbors.includes(SITE)
    || !state.appliedResultIds.includes(orderId)
    || !state.reports.some(report => report.id === orderId && report.sourceIds.includes("CON-R10"))) {
    return "Livrez les lots du convoi au passage.";
  }
  if (site?.controller !== "CON-F01" || !site.installationIntact
    || !warSuppliedV85(state).has(SITE) || !warGarrisonV85(state, SITE).length) {
    return "Maintenez une garde apte au passage et gardez sa liaison de ravitaillement ouverte.";
  }
  const inspector = state.combatants.find(person => route.combatantIds.includes(person.id)
    && person.factionId === "CON-F01" && person.territoryId === SITE && person.status === "fit"
    && !person.garrison && person.trainingUntilTurn === null
    && !state.orders.some(order => order.combatantIds.includes(person.id)));
  return inspector ? { routeId: route.id, orderId, inspectorId: inspector.id }
    : "Libérez un porteur apte du convoi livré pour inspecter le canyon pendant que la garde tient le passage.";
}

export function canyonIssueM037(state: WarSimulationV85): string | null {
  const assignment = available(state);
  return typeof assignment === "string" ? assignment : null;
}

export function startCanyonPatrolM037(state: WarSimulationV85): CanyonPatrolM037 | null {
  const assignment = available(state);
  return typeof assignment === "string" || canyonReportM037(state) ? null
    : { ...assignment, x: CANYON_GEOMETRY_V85.start, level: 0, checked: [] };
}

export function walkCanyonM037(patrol: CanyonPatrolM037, direction: -1 | 1): CanyonPatrolM037 {
  const { start, finish, bridgeWest, bridgeEast } = CANYON_GEOMETRY_V85;
  const x = Math.max(start, Math.min(finish, patrol.x + direction * 4));
  if (patrol.level === 1 && ((patrol.x <= bridgeWest && x > bridgeWest)
    || (patrol.x >= bridgeEast && x < bridgeEast))) return patrol;
  return { ...patrol, x };
}

export function changeCanyonLevelM037(patrol: CanyonPatrolM037): CanyonPatrolM037 {
  const { westRamp, eastStair } = CANYON_GEOMETRY_V85;
  return patrol.x <= westRamp || patrol.x >= eastStair
    ? { ...patrol, level: patrol.level === 0 ? 1 : 0 } : patrol;
}

export function nearCanyonSignM037(patrol: CanyonPatrolM037): number | undefined {
  return SIGNS.find(sign => Math.abs(sign - patrol.x) <= 2
    && patrol.level === (sign === SIGNS[0] ? 1 : 0)
    && !patrol.checked.includes(sign));
}

export function checkCanyonSignM037(patrol: CanyonPatrolM037): CanyonPatrolM037 {
  const sign = nearCanyonSignM037(patrol);
  return sign === undefined ? patrol : { ...patrol, checked: [...patrol.checked, sign] };
}

export function canyonDecisionM037(patrol: CanyonPatrolM037): CanyonDecisionM037 | null {
  if (patrol.level !== 0 || !SIGNS.every(sign => patrol.checked.includes(sign))) return null;
  if (patrol.x === CANYON_GEOMETRY_V85.start) return "consolider";
  if (patrol.x === CANYON_GEOMETRY_V85.finish) return "pousser";
  return null;
}

export function archiveCanyonPatrolM037(state: WarSimulationV85, patrol: CanyonPatrolM037): WarUpdateV85 {
  const reject = (message: string): WarUpdateV85 => ({ state, accepted: false, message });
  if (canyonReportM037(state)) return reject("Le rapport de ce passage est déjà archivé.");
  const assignment = available(state);
  if (typeof assignment === "string") return reject(assignment);
  if (assignment.routeId !== patrol.routeId || assignment.orderId !== patrol.orderId || assignment.inspectorId !== patrol.inspectorId) {
    return reject("Le détachement a changé. Reprenez l’inspection avec le convoi présent.");
  }
  const decision = canyonDecisionM037(patrol);
  if (!decision) return reject("Vérifiez les deux balises puis rejoignez l’une des sorties.");
  if (state.revision >= 1000000 || state.reports.length >= 100000) {
    return reject("Cette archive ne peut plus ajouter de rapport.");
  }
  const choice = decision === "consolider" ? "Consolidation recommandée au poste de garde ouest."
    : "Progression recommandée depuis le débouché est.";
  const message = `${patrol.inspectorId} a vérifié les deux balises du Canyon des Deux Balises après la livraison au Passage des Lames Plates. ${choice}`;
  return {
    accepted: true,
    message,
    state: {
      ...state,
      revision: state.revision + 1,
      reports: [...state.reports, {
        id: `canyon-m037-${state.seed}`, turn: state.turn, text: message,
        sourceIds: [MISSION, SCENE, SITE, patrol.orderId],
      }],
    },
  };
}
