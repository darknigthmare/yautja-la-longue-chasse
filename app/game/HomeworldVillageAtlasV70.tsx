import { HOMEWORLD_GEOMETRY_V64, homeworldBuildingFootprintV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_REGIONS_V68, HOMEWORLD_VILLAGE_PERIMETER_V68, type HomeworldRegionIdV68 } from './systems/homeworldRegionsV68';
import { villageDestinationsV70 } from './systems/homeworldVillageRoutesV70';
import type { HomeworldVec2 } from './systems/homeworldCity';
import styles from './HomeworldVillageAtlasV70.module.css';

/** A local floor atlas. Selecting an approach draws a route; it never opens a
 * door or transports the player. The rendering shares the native ground pitch. */
export default function HomeworldVillageAtlasV70({ regionId, actor, disabled, onChoose }: {
  regionId: HomeworldRegionIdV68; actor: HomeworldVec2; disabled?: boolean; onChoose(id: string): void;
}) {
  const definition = HOMEWORLD_REGIONS_V68[regionId], targets = villageDestinationsV70(regionId), d = HOMEWORLD_GEOMETRY_V64.depthScale;
  return <div className={styles.atlas} data-village-atlas-v70>
    <p>Choisis un lieu, puis suis ses repères à pied. Les entrées sont au sud des façades ; le poste extérieur se rejoint par le chemin oriental.</p>
    <svg viewBox={`0 0 4500 ${4000 * d}`} role="img" aria-label={`Plan des approches de ${definition.village}`}>
      <g transform={`scale(1 ${d})`}>
        <polygon points={HOMEWORLD_VILLAGE_PERIMETER_V68.map(p => `${p.x},${p.y}`).join(' ')} fill={definition.groundColor} stroke={definition.accent} strokeWidth="15" />
        {definition.buildings.map(b => { const f = homeworldBuildingFootprintV64(b); return <rect key={b.id} x={f.left} y={f.top} width={f.right - f.left} height={f.bottom - f.top} fill="#151e1c" stroke="#a4916c" strokeWidth="8" />; })}
        <circle cx={actor.x} cy={actor.y} r="68" fill="none" stroke="#f5f7ef" strokeWidth="17" /><path d={`M${actor.x - 42} ${actor.y}L${actor.x + 42} ${actor.y}M${actor.x} ${actor.y - 42}L${actor.x} ${actor.y + 42}`} stroke="#f5f7ef" strokeWidth="12" />
      </g>
      {targets.map((t, i) => <g key={t.id}><circle cx={t.x} cy={t.y * d} r="68" fill={t.kind === 'activity' ? '#e6b065' : '#ced8bd'} /><text x={t.x} y={t.y * d + 27} textAnchor="middle" fontSize="80" fontWeight="600" fill="#081310">{i + 1}</text></g>)}
    </svg>
    <div className={styles.destinations}>{targets.map((t, i) => <button key={t.id} disabled={disabled} data-village-destination-v70={t.id} onClick={() => onChoose(t.id)}><b>{i + 1}. {t.name}</b><small>{t.detail}</small></button>)}</div>
  </div>;
}
