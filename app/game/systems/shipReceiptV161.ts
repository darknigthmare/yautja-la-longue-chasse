import type { SaveGame } from '../types';
import {
  SHIP_ACQUISITION_BINDING_V89,
  SHIP_ACQUISITION_SOURCE_V89,
  normalizeShipAcquisitionV89,
  shipAcquisitionEligibleV89,
  shipAcquisitionOwnedHullV89,
  type ShipAcquisitionAuthorityV89,
} from './shipAcquisitionV89';

/**
 * V161 — reçu propriétaire du vaisseau personnel (R2-M021, STATE5-17).
 *
 * Sourcé (classeur V6, empreinte de `shipAcquisitionSourceV89.json`) :
 * - R2-M021 « Une coque vraiment acquise » : entrée « Blooded acquis ; moyens et
 *   accord d’acquisition réunis dans le parcours prévu » ; « L’acquisition est
 *   matérialisée par la remise des droits et l’entrée dans le navire. Une visite
 *   de cabine n’équivaut pas à la propriété. »
 * - R2-M020 « Porter la marque Blooded » : le joueur « reçoit l’accès aux
 *   démarches de vaisseau ».
 * - STATE5-17 personalShipOwned : « Mission d’obtention conclue » ;
 *   « Déverrouiller une carte ne suffit pas ».
 *
 * Le parcours physique (inspection, défaut du sas, réglage, rapport, remise des
 * droits, entrée) reste celui de `shipAcquisitionV89.ts` ; ce module ne le
 * duplique pas. Il fournit seulement l’attestation « moyens et accord » que V89
 * attendait sans fournisseur, et lit le reçu propriétaire qui en résulte.
 *
 * Proposé (aucune source ne fixe ce que sont les « moyens » ni l’« accord ») :
 * - accord = l’accès aux démarches de vaisseau reçu avec le rang Blooded
 *   (R2-M020), constaté par le rang réellement acquis ;
 * - moyens = la participation à la remise en état de la coque (R2-M021). Le jeu
 *   n’a aucune monnaie ; aucun prix n’est inventé. Ces moyens sont « consommés »
 *   au sens où V89 exige le réglage vérifié et rapporté avant la remise, et
 *   n’accepte qu’une seule remise par campagne ;
 * - identifiants : un par campagne, dérivés de la date de création de la
 *   sauvegarde (`PROPOSED_RECEIPT_IDS_V161`).
 */

const b = SHIP_ACQUISITION_BINDING_V89;

export const PROPOSED_RECEIPT_IDS_V161 = Object.freeze({
  instance: (owner: string) => `coque-personnelle-v161:${owner}`,
  agreement: (owner: string) => `accord-r2-m020-blooded:${owner}`,
  means: (owner: string) => `moyens-r2-m021-remise-en-etat:${owner}`,
});

/** Attestation « moyens et accord » fournie au chantier V89 ; null avant Blooded. */
export function shipAcquisitionAuthorityV161(
  save: Pick<SaveGame, 'createdAt' | 'profile' | 'prologue'>,
): ShipAcquisitionAuthorityV89 | null {
  const owner = save.createdAt;
  if (typeof owner !== 'string' || !Number.isFinite(Date.parse(owner)) || !shipAcquisitionEligibleV89(save)) return null;
  return {
    version: 1, ownerSaveCreatedAt: owner, sourceId: b.missionId,
    sourceSha256: SHIP_ACQUISITION_SOURCE_V89.source.sha256,
    candidateId: b.candidateId, shipId: b.shipId, issuerId: b.npcId,
    instanceId: PROPOSED_RECEIPT_IDS_V161.instance(owner),
    agreementReceiptId: PROPOSED_RECEIPT_IDS_V161.agreement(owner),
    meansReceiptId: PROPOSED_RECEIPT_IDS_V161.means(owner),
    meansConsumed: true,
  };
}

export type ShipReceiptStatusV161 =
  | 'owned' | 'not-blooded' | 'not-started' | 'in-progress' | 'rights-issued' | 'unreadable';

export interface ShipReceiptV161 {
  status: ShipReceiptStatusV161;
  /** Reçu propriétaire : présent seulement quand R2-M021 est conclue (droits remis puis entrée). */
  receipt: ReturnType<typeof shipAcquisitionOwnedHullV89>;
  reason: string | null;
}

/** STATE5-17 personalShipOwned, lu depuis le seul reçu du chantier V89. */
export function shipReceiptV161(
  save: Pick<SaveGame, 'createdAt' | 'profile' | 'prologue' | 'shipAcquisitionV89'>,
): ShipReceiptV161 {
  const receipt = shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, save.createdAt);
  if (receipt) return { status: 'owned', receipt, reason: null };
  const raw = save.shipAcquisitionV89;
  const state = raw === undefined || raw === null ? null : normalizeShipAcquisitionV89(raw, save.createdAt);
  if (raw !== undefined && raw !== null && !state) return { status: 'unreadable', receipt: null,
    reason: 'Checkpoint du chantier naval illisible : il est conservé, mais aucun reçu de vaisseau ne peut en être lu.' };
  if (!shipAcquisitionEligibleV89(save)) return { status: 'not-blooded', receipt: null,
    reason: 'Aucun vaisseau personnel possédé : le rang Blooded doit être réellement acquis avant la mission « Une coque vraiment acquise ».' };
  if (state?.authorityReceipt) return { status: 'rights-issued', receipt: null,
    reason: 'Droits remis au chantier naval : franchis le sas du navire pour conclure l’acquisition.' };
  return { status: state ? 'in-progress' : 'not-started', receipt: null,
    reason: 'Aucun vaisseau personnel possédé : conclus « Une coque vraiment acquise » au chantier naval (remise des droits puis entrée dans le navire). Une coque débloquée ne suffit pas.' };
}
