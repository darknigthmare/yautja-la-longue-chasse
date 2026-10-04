/* eslint-disable @next/next/no-img-element -- existing individual trophy and native character bitmaps */
import { HOMEWORLD_NPCS, type HomeworldPoint } from './systems/homeworld';
import { homeworldNpcModules } from './systems/homeworldCity';
import { homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { homeworldModularPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { HOMEWORLD_PROP_ART_V64 } from './systems/homeworldArtV64';
import HomeworldModularHunter from './HomeworldModularHunter';
import HomeworldCivilianV72 from './HomeworldCivilianV72';
import { HOMEWORLD_NPC_ROLES_V72, homeworldCivilianArtV72 } from './systems/homeworldIdentityV72';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import styles from './HomeworldCity.module.css';

/** Same known point ID and foot socket in either city or room coordinates. */
export default function HomeworldPointVisualV64({ point, active, youthWelcome = false }: {
  point: HomeworldPoint; active: boolean; youthWelcome?: boolean;
}) {
  const p = homeworldProjectGroundV64(point);
  const npc = HOMEWORLD_NPCS.find(entry => entry.id === point.npcId);
  const civilianRole = npc ? HOMEWORLD_NPC_ROLES_V72[npc.id] : undefined;
  // Leave a full label-height plus a visible gap above the painted head. The
  // taller chief must not inherit the old generic hunter's fixed label offset.
  const npcLabelTop = civilianRole ? -(homeworldCivilianArtV72(civilianRole).heightWorld + 32) : undefined;
  const modules = npc ? homeworldNpcModules(npc.id) : null;
  const artId = point.kind === 'region' ? 'beacon' : 'console';
  const placement = modules ? homeworldModularPlacementV64(modules.morphId) : null;
  return <div className={styles.pointV64} data-point-id={point.id} data-kind={point.kind}
    data-point-ground-x={point.x} data-point-ground-y={point.y}
    style={{ left: p.x, top: p.y, zIndex: Math.round(point.y) }}>
    {civilianRole ? <HomeworldCivilianV72 npcId={npc?.id} role={civilianRole} /> : modules && <HomeworldModularHunter {...modules} className={styles.npcV64}
      style={{ position: 'absolute', ...(placement ?? { left: -36, top: -105, width: 70, height: 105 }) }} />}
    {!npc && (point.evidenceId === 'suspect-trophy'
      ? <img src="/game/assets/v15/trophies/trophy-ruins-ancient-guardian.webp" alt="" draggable={false}
          style={{ position: 'absolute', left: -20, top: -42, width: 40, height: 42, maxWidth: 'none', objectFit: 'contain' }} />
      : <HomeworldNativePropV64 id={`point-${point.id}`} artId={artId} art={HOMEWORLD_PROP_ART_V64[artId]}
          x={0} y={0} depth={0} />)}
    {active && <span className={styles.pointLabelV64} data-homeworld-native-npc-label-v72={civilianRole} style={npcLabelTop===undefined?undefined:{top:npcLabelTop}}>{youthWelcome && point.kind === 'ship' ? 'Transports du clan' : point.label}</span>}
    <i className={styles.pointGroundV64} />
  </div>;
}
