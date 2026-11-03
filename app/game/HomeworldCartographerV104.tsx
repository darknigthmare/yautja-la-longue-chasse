import HomeworldModularHunter from './HomeworldModularHunter';
import { homeworldModularPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_CARTOGRAPHY_V104 as b } from './systems/homeworldCartographyDefinitionV104';
import { cartographyServicePresentV104 } from './systems/homeworldCartographyV104';
import { homeworldCivicWalkableV80 } from './systems/homeworldCivicWorldV80';
import { homeworldResidentOccludedV100 } from './systems/homeworldResidentVisibilityV100';
import { homeworldSceneDepthV78 } from './systems/homeworldVisualLayersV78';
import styles from './HomeworldCartographyV104.module.css';

/** Dedicated source profession, neutral existing body. This local staging
 * neither renames another resident nor claims a new native pose or accessory. */
export default function HomeworldCartographerV104({ levelId, seconds, active }: { levelId: string; seconds: number; active: boolean }) {
  if (levelId !== b.levelId || !cartographyServicePresentV104() || !homeworldCivicWalkableV80(b.levelId, b.host) || homeworldResidentOccludedV100(b.levelId, b.host)) return null;
  const p = homeworldProjectGroundV64(b.host), placement = homeworldModularPlacementV64('classic', 'reference', 100);
  if (!placement) return null;
  return <span className={styles.host} data-homeworld-cartographer-v104={b.npcId} data-source-speaker={b.npcName} data-staging="neutral-existing-body-original-local-post"
    data-host-x={b.host.x} data-host-y={b.host.y} style={{ left: p.x, top: p.y, zIndex: homeworldSceneDepthV78(b.host.y, 0) }}>
    <HomeworldModularHunter morphId="classic" dreadStyleId="classic" appearance={{ skinId: 'ochre-mottle', dreadTintId: 'obsidian', headStyleId: 'reference' }} motionPhase={seconds} style={{ ...placement, position: 'absolute' }} />
    {active && <span className={styles.hostLabel}>Cartographe · relevé du port</span>}
  </span>;
}
