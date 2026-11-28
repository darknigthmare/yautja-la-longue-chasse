import type { SaveGame } from '../types';
import { inspectMountsV153, mountExerciseRefusalV153, MOUNT_EXERCISES_V153 } from './mobility/mountsV153';

export type W3S10MountCampaign = Pick<SaveGame, 'createdAt' | 'mountsV153' | 'mountRidesV156'>;

export interface W3S10MountAdmission {
  ownerCreatedAt: string;
  mountId: string;
  recruitedRevision: number;
  trialId: string;
  fatigue: number;
}

export function w3S10MountAdmission(campaign: W3S10MountCampaign | undefined, mountId = 'kha_rha') {
  if (!campaign) return { admission: null, reason: 'Ouvre la Bible de guerre depuis ta campagne pour présenter une monture.' };
  if (campaign.mountRidesV156?.active) return { admission: null, reason: 'Ramène la monture à l’aire des convois avant de la présenter.' };
  const inspected = inspectMountsV153(campaign.mountsV153, campaign.createdAt);
  const mounts = inspected.state;
  const mount = mounts?.mounts.find(item => item.id === mountId);
  if (!mount) return { admission: null, reason: 'Le carnet de campagne ne contient aucune monture admissible.' };
  if (mounts?.session) return { admission: null, reason: 'Termine la séance en cours avant de présenter la monture.' };
  const lead = MOUNT_EXERCISES_V153.find(exercise => exercise.id === 'lead')!;
  if (mount.bond < lead.minBond) return { admission: null, reason: `La marche en longe exige un lien BOND de ${lead.minBond}.` };
  const reason = mountExerciseRefusalV153(mount, lead);
  if (reason) return { admission: null, reason };
  const admission: W3S10MountAdmission = {
    ownerCreatedAt: campaign.createdAt,
    mountId: mount.id,
    recruitedRevision: mount.recruitedRevision,
    trialId: mount.proof.trialId,
    fatigue: mount.fatigue,
  };
  return { admission, reason: null };
}
