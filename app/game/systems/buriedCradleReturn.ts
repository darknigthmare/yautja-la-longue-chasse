import { isNearShipInterior25dStation, type ShipInterior25dRoomId } from './shipInterior25d';

/** R2-M027: the extraction remains the immutable field record. These receipts
 * describe the subsequent care, examination and debrief on the assigned hull. */
export type CradleReturnOperation = 'treat-return' | 'inspect-return' | 'present-clan' | 'analyze-workshop';
export interface CradleReturnObservation { roomId: ShipInterior25dRoomId; x: number; y: number }
export interface CradleReturnEvent { type: CradleReturnOperation; observation: CradleReturnObservation }
export interface CradleReturnVisit { version: 1; revision: number; events: CradleReturnEvent[] }
export const CRADLE_RETURN_STATIONS = {
  'treat-return': 'medical-bay', 'inspect-return': 'trophy-hall',
  'present-clan': 'clan-archives', 'analyze-workshop': 'trophy-hall',
} as const satisfies Record<CradleReturnOperation, ShipInterior25dRoomId>;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: object, expected: string[]) => Object.keys(value).sort().join('|') === expected.sort().join('|');
export const createCradleReturnVisit = (): CradleReturnVisit => ({ version: 1, revision: 0, events: [] });
export function isCradleReturnOperation(value: unknown): value is CradleReturnOperation {
  return typeof value === 'string' && Object.hasOwn(CRADLE_RETURN_STATIONS, value);
}
export function cradleReturnInReach(operation: CradleReturnOperation, value: unknown): value is CradleReturnObservation {
  if (!record(value) || !keys(value, ['roomId', 'x', 'y']) || value.roomId !== CRADLE_RETURN_STATIONS[operation] ||
      typeof value.x !== 'number' || !Number.isFinite(value.x) || typeof value.y !== 'number' || !Number.isFinite(value.y)) return false;
  return isNearShipInterior25dStation(value.roomId as ShipInterior25dRoomId, { x: value.x, y: value.y });
}
export function inspectCradleReturnVisit(value: unknown, campaignStatus: string): {
  status: 'absent' | 'valid' | 'invalid-save' | 'future-version'; state: CradleReturnVisit | null;
} {
  if (value === undefined || value === null) return { status: 'absent', state: null };
  if (record(value) && typeof value.version === 'number' && value.version > 1) return { status: 'future-version', state: null };
  const invalid = { status: 'invalid-save' as const, state: null };
  if (!record(value) || !keys(value, ['version', 'revision', 'events']) || value.version !== 1 ||
      !Number.isInteger(value.revision) || !Array.isArray(value.events) || value.events.length > 3 ||
      value.revision !== value.events.length || !['extracted', 'reported'].includes(campaignStatus) ||
      (campaignStatus === 'reported') !== (value.events.length === 3)) return invalid;
  const events: CradleReturnEvent[] = [];
  for (const [index, event] of value.events.entries()) {
    if (!record(event) || !keys(event, ['type', 'observation']) || !isCradleReturnOperation(event.type) ||
        (index === 0 && event.type !== 'treat-return') || (index === 1 && event.type !== 'inspect-return') ||
        (index === 2 && !['present-clan', 'analyze-workshop'].includes(event.type)) ||
        !cradleReturnInReach(event.type, event.observation)) return invalid;
    events.push({ type: event.type, observation: { ...event.observation } });
  }
  return { status: 'valid', state: { version: 1, revision: events.length, events } };
}

export function cradleReturnChoice(visit: CradleReturnVisit | null | undefined): 'clan' | 'workshop' | null {
  const last = visit?.events[2]?.type;
  return last === 'present-clan' ? 'clan' : last === 'analyze-workshop' ? 'workshop' : null;
}

export function advanceCradleReturnVisit(visit: CradleReturnVisit, operation: CradleReturnOperation,
  expectedRevision: number, observation: unknown): { accepted: boolean; state: CradleReturnVisit; message: string } {
  const refuse = (message: string) => ({ accepted: false, state: visit, message });
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== visit.revision)
    return refuse('Le retour a déjà progressé. Relis le dossier avant de confirmer cette étape.');
  if (!cradleReturnInReach(operation, observation)) return refuse('Rejoins le poste indiqué à bord de la coque de retour.');
  if (visit.revision === 3) return refuse('Le débrief est consigné ; son choix reste conservé.');
  const expected = visit.revision === 0 ? ['treat-return'] : visit.revision === 1 ? ['inspect-return'] : ['present-clan', 'analyze-workshop'];
  if (!expected.includes(operation)) return refuse(visit.revision === 0 ? 'Passe d’abord au poste de soin.' :
    visit.revision === 1 ? 'Inspecte d’abord la crête ou les relevés rapportés à l’atelier.' : 'Choisis la présentation au clan ou l’analyse à l’atelier.');
  return { accepted: true, state: { version: 1, revision: visit.revision + 1,
    events: [...visit.events.map(event => ({ ...event, observation: { ...event.observation } })), { type: operation, observation: { ...observation } }] },
    message: operation === 'treat-return' ? 'Soins et nettoyage de l’équipement confirmés. La crête ou les relevés attendent ton examen à l’atelier.' :
      operation === 'inspect-return' ? 'Le contenu du retour est installé et examiné. Choisis comment conclure ce retour.' :
      operation === 'present-clan' ? 'Présentation déposée aux archives du clan. Ton rapport et son origine restent consultables.' :
      'Analyse personnelle consignée à l’atelier. Les observations restent dans ton dossier de chasse.' };
}
