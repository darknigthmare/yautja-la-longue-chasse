import {
  warGarrisonV85, warSuppliedV85, warTerritoryForSimulationV96,
  type WarReportV85, type WarSimulationV85, type WarUpdateV85,
} from "./clanWarV85";
import { canyonDecisionM037, initialCanyonPositionM037, type CanyonPositionM037 } from "./clanWarCanyonPathM037";
export { canyonDecisionM037, changeCanyonLevelM037, checkCanyonSignM037, nearCanyonSignM037, walkCanyonM037,
  type CanyonDecisionM037 } from "./clanWarCanyonPathM037";

const SITE = "CON-T09";
const SCENE = "RTS-MAP12";
const MISSION = "R2-M037";
interface AssignmentM037 { routeId: string; orderId: string; inspectorId: string }
export type CanyonPatrolM037 = CanyonPositionM037 & AssignmentM037;

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
    : { ...assignment, ...initialCanyonPositionM037() };
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
  if (state.revision >= 999999 || state.reports.length >= 100000) {
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
