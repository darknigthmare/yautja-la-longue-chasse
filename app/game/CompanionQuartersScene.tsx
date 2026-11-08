'use client';

/* eslint-disable @next/next/no-img-element -- measured native transparent game art */
import { memo, useMemo, useState } from 'react';
import type { SaveGame } from './types';
import type { ShipId } from './shipCatalogue';
import HunterRigPreview from './HunterRigPreview';
import HomeworldNpcSpriteV84 from './HomeworldNpcSpriteV84';
import { HUNTER_RIG_CANVAS } from './hunterRig';
import { CLAN_SHIP_CREW_ART_ROLES, clanShipCrewArtIdentity } from './clanShipCrew';
import { COMPANION_QUARTER_ART } from './companionQuarterArt';
import { COMPANION_PILOT_ART } from './companionPilotArt';
import { expeditionMemberAppearance, expeditionMemberLoadout, type ExpeditionMemberId } from './systems/planetInsertion';
import type { ClanShipNpcId } from './systems/clanShipOperations';
import { projectShipInterior25d } from './systems/shipInterior25d';
import {
  companionResidencePresence, type CompanionHost, type CompanionPilotId, type CompanionPresence,
} from './systems/companionResidence';
import styles from './CompanionQuartersScene.module.css';

interface NativeArt {
  src: string; sourceWidth: number; sourceHeight: number;
  alphaBounds: { x: number; y: number; width: number; height: number };
  pivot?: { x: number; y: number };
}
const quarterArt: Partial<Record<string, NativeArt>> = COMPANION_QUARTER_ART;
const pilotArt: Partial<Record<CompanionPilotId, NativeArt>> = COMPANION_PILOT_ART;

/** Rear galleries are outside the authored walkable floor. They add no hidden
 * obstacle, replace no base service, and are absent until a refit is completed. */
export function companionQuarterSocket(site: 'personal' | 'clan', berth: number) {
  return site === 'personal' ? { x: 600, y: 20, width: 350, height: 180 }
    : { x: 300 + Math.floor(berth / 6) * 410, y: 470, width: 310, height: 210 };
}
export function companionMedicalSocket(site: 'personal' | 'clan', id: string) {
  return site === 'personal' ? { x: id === 'karhek' ? 420 : 780, y: 20 }
    : { x: id === 'karhek' ? 260 : 650, y: 470 };
}
const point = (site: 'personal' | 'clan', x: number, y: number) => site === 'personal'
  ? { x, y: 240 + projectShipInterior25d({ x, y }).y } : { x, y };
const locationLabel = { aboard: 'À bord', medical: 'En soins', mission: 'En mission · retour prévu', missing: 'Absent · quartier conservé', closed: 'Affectation suspendue' };
const NO_SUPPRESSED_AVATARS: readonly string[] = [];

export default memo(function CompanionQuartersScene({ save, site, shipId, roomId, suppressedAvatarIds = NO_SUPPRESSED_AVATARS }: {
  save: SaveGame; site: 'personal' | 'clan'; shipId: ShipId; roomId: string;
  suppressedAvatarIds?: readonly string[];
}) {
  const entries = useMemo(() => companionResidencePresence(save, site === 'personal'
    ? { kind: 'personal', shipId } : { kind: 'clan', shipId: 'avp-predator-mothership' }), [save, site, shipId]);
  return <>{entries.filter(entry => entry.quarterVisible && entry.roomId === roomId).map(entry => {
    const socket = companionQuarterSocket(site, entry.installation.berth);
    const position = point(site, socket.x, socket.y);
    const art = quarterArt[entry.installation.module];
    return <div key={`quarter:${entry.id}`} className={styles.quarter} data-companion-module={entry.id} data-companion-hull={shipId}
      data-companion-host-kind={site} data-companion-location={entry.location} data-companion-berth={entry.installation.berth}
      style={{ left: position.x, top: position.y, zIndex: site === 'personal' ? 30 : 470 }}>
      <span className={styles.gallery} aria-hidden="true" style={{ width: socket.width + 28 }} />
      {art && <NativeBitmap asset={art} width={socket.width} height={socket.height} />}
      {entry.avatarVisible && entry.avatarRoomId === roomId && !suppressedAvatarIds.includes(entry.id) && <ResidentActor entry={entry} site={site} />}
      <div className={styles.label}><strong>{entry.definition.name}</strong><span>{entry.definition.moduleLabel} · {locationLabel[entry.location]}</span></div>
    </div>;
  })}
    {entries.filter(entry => entry.avatarVisible && entry.location === 'medical' && entry.avatarRoomId === roomId && entry.roomId !== roomId).map(entry => {
      const socket = companionMedicalSocket(site, entry.id), position = point(site, socket.x, socket.y);
      return <div key={`medical:${entry.id}`} className={styles.quarter} data-companion-medical={entry.id}
        style={{ left: position.x, top: position.y, zIndex: site === 'personal' ? 31 : 471 }}>
        <span className={styles.gallery} style={{ width: 190 }} aria-hidden="true" />
        {!suppressedAvatarIds.includes(entry.id) && <ResidentActor entry={entry} site={site} />}
        <div className={styles.label}><strong>{entry.definition.name}</strong><span>En soins · services suspendus</span></div>
      </div>;
    })}
  </>;
});

function NativeBitmap({ asset, width, height }: { asset: NativeArt; width: number; height: number }) {
  const [failed, setFailed] = useState(false);
  const scale = Math.min(width / asset.alphaBounds.width, height / asset.alphaBounds.height);
  const pivot = asset.pivot ?? { x: asset.alphaBounds.x + asset.alphaBounds.width / 2, y: asset.alphaBounds.y + asset.alphaBounds.height - 1 };
  if (failed) return null;
  return <img src={asset.src} alt="" aria-hidden="true" draggable={false} decoding="async" data-companion-art={asset.src}
    onError={() => setFailed(true)} style={{ position: 'absolute', maxWidth: 'none', left: -pivot.x * scale, top: -pivot.y * scale,
      width: asset.sourceWidth * scale, height: asset.sourceHeight * scale, pointerEvents: 'none' }} />;
}

function ResidentActor({ entry, site }: { entry: CompanionPresence; site: CompanionHost['kind'] }) {
  const definition = entry.definition;
  const art = definition.source === 'pilot' ? pilotArt[definition.id as CompanionPilotId] : null;
  if (definition.source === 'pilot' && !art) return null;
  const width = site === 'personal' ? 108 : 120;
  const height = site === 'personal' ? 147 : 168;
  return <div className={styles.resident} data-companion-avatar={entry.id} data-companion-actor-location={entry.location}
    data-companion-motion={definition.source === 'triad' ? 'existing-rig-idle' : 'static'} role="img" aria-label={`${definition.name} · ${locationLabel[entry.location]}`}>
    <span className={styles.actorShadow} aria-hidden="true" />
    {definition.source === 'triad' && <HunterRigPreview appearance={expeditionMemberAppearance(definition.id as ExpeditionMemberId)}
      {...expeditionMemberLoadout(definition.id as ExpeditionMemberId)} size={width} pose="idle" phase={0} speed={0} facing={1}
      label={definition.name} style={{ position: 'absolute', left: -width / 2, top: -width * HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.width }} />}
    {definition.source === 'clan' && <HomeworldNpcSpriteV84 npcId={clanShipCrewArtIdentity(definition.id as ClanShipNpcId)} role={CLAN_SHIP_CREW_ART_ROLES[definition.id as ClanShipNpcId]} height={height} facing={-1} />}
    {art && <NativeBitmap asset={art} width={definition.id === 'breche' ? 160 : 125} height={definition.id === 'breche' ? 108 : height} />}
  </div>;
}
