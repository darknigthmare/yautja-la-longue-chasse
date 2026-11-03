import { BIBLE_CULTURAL_BINDING_V86 } from './systems/bibleSceneCulturalV86';
import { homeworldModularPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { isHomeworldRegionWalkableV68, type HomeworldRegionIdV68 } from './systems/homeworldRegionsV68';
import HomeworldModularHunter from './HomeworldModularHunter';

/** The Bible specifies a speaker, not a body/portrait. Reuse a neutral native
 * body at a grounded local socket; no new solid, lineage or borrowed identity. */
export default function HomeworldBibleCultureHostV86({ regionId, tick, visible = true }: { regionId: HomeworldRegionIdV68; tick: number; visible?: boolean }) {
  const b = BIBLE_CULTURAL_BINDING_V86;
  if (!visible || regionId !== b.regionId || !isHomeworldRegionWalkableV68(b.regionId, 'village', b.host, tick)) return null;
  const ground = homeworldProjectGroundV64(b.host), placement = homeworldModularPlacementV64('classic', 'reference', 100);
  if (!placement) return null;
  return <span data-bible-host-v86={b.npcId} data-bible-source-speaker={b.npcName} data-bible-host-adaptation="neutral-native-local-staging"
    data-bible-host-x={b.host.x} data-bible-host-y={b.host.y} aria-hidden="true"
    style={{ position: 'absolute', left: ground.x, top: ground.y, zIndex: Math.round(b.host.y), pointerEvents: 'none' }}>
    <span style={{ position: 'absolute', left: -25, top: -5, width: 50, height: 12, borderRadius: '50%', background: '#0005' }} />
    <HomeworldModularHunter morphId="classic" dreadStyleId="classic" appearance={{ skinId: 'ochre-mottle', dreadTintId: 'obsidian', headStyleId: 'reference' }}
      motionPhase={tick / 60} speed={0} style={{ ...placement, position: 'absolute' }} />
  </span>;
}
