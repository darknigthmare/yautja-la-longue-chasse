import type { SaveGame } from '../types';
import { inspectMountsV153, mountProfileV153 } from './mobility/mountsV153';
import { mountRideRefusalV156 } from './mobility/mountRidingV156';

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
  if (!mounts || !mountProfileV153(mountId)) return { admission: null, reason: 'Le carnet de campagne ne contient aucune monture admissible.' };
  const reason = mountRideRefusalV156(mounts, mountId);
  const mount = mounts.mounts.find(item => item.id === mountId);
  if (reason || !mount) return { admission: null, reason: reason ?? 'Le carnet ne confirme pas cette monture.' };
  const admission: W3S10MountAdmission = {
    ownerCreatedAt: campaign.createdAt,
    mountId: mount.id,
    recruitedRevision: mount.recruitedRevision,
    trialId: mount.proof.trialId,
    fatigue: mount.fatigue,
  };
  return { admission, reason: null };
}
