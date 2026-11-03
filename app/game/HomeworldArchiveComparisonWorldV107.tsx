import HomeworldNativePropV64 from './HomeworldNativePropV64';
import {HOMEWORLD_COURT_ART_V80} from './systems/homeworldCourtArtV80';
import {homeworldProjectGroundV64} from './systems/homeworldGeometryV64';
import {homeworldSceneDepthV78} from './systems/homeworldVisualLayersV78';
import {HOMEWORLD_ARCHIVE_COMPARISON_V107 as b} from './systems/homeworldArchiveComparisonDefinitionV107';
import type {HomeworldArchiveComparisonV107} from './systems/homeworldArchiveComparisonLedgerV107';
import styles from './HomeworldArchiveComparisonV107.module.css';
/** Existing native study case/lectern pixels, never a named historical plaque. */
export default function HomeworldArchiveComparisonWorldV107({levelId,ledger}:{levelId:string;ledger:HomeworldArchiveComparisonV107}){
 if(levelId!=='0')return null;const e=ledger.receipt?.evidence??{...b.evidence.origin,place:'source'},elevation=e.place==='carried'?42:e.place==='table'?50:0;
 const prop=(id:string,artId:string,p:{x:number;y:number},height:number,z=0)=>{const art=HOMEWORLD_COURT_ART_V80[artId],a=homeworldProjectGroundV64(p,z);return <HomeworldNativePropV64 id={id} artId={artId} art={art} x={a.x} y={a.y} heightWorld={height} depth={homeworldSceneDepthV78(p.y,0)+(z?1:0)}/>;};
 const t=homeworldProjectGroundV64(b.table),p=homeworldProjectGroundV64(e,elevation);
 return <><span data-archive-comparison-table-v107>{prop(b.table.id,b.table.artId,b.table,b.table.height)}<span className={styles.worldLabel} style={{left:t.x-80,top:t.y-89,zIndex:homeworldSceneDepthV78(b.table.y,0)+2}}>{b.table.label}</span></span>
 <span data-archive-comparison-evidence-v107 data-evidence-place={e.place} data-world-x={e.x} data-world-y={e.y}>{prop(b.evidence.id,b.evidence.artId,e,b.evidence.height,elevation)}<span className={styles.worldLabel} style={{left:p.x-30,top:p.y-(e.place==='table'?68:39),zIndex:homeworldSceneDepthV78(e.y,0)+3}}>C{e.place==='carried'?' · porté':''}</span></span></>;
}
