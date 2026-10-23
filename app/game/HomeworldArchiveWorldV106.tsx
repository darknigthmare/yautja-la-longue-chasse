import HomeworldModularHunter from './HomeworldModularHunter';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import {homeworldModularPlacementV64} from './systems/homeworldCharacterPlacementV64';
import {HOMEWORLD_COURT_ART_V80} from './systems/homeworldCourtArtV80';
import {homeworldProjectGroundV64} from './systems/homeworldGeometryV64';
import {homeworldSceneDepthV78} from './systems/homeworldVisualLayersV78';
import {HOMEWORLD_ARCHIVE_V106 as b} from './systems/homeworldArchiveDefinitionV106';
import type {HomeworldArchiveLedgerV106} from './systems/homeworldArchiveLedgerV106';
import styles from './HomeworldArchiveV106.module.css';

/** Existing native pixels and measured feet, shared with the V106 solid hulls.
 * The case follows the carrier as a load marker; no new hand-grip pose is claimed. */
export default function HomeworldArchiveWorldV106({levelId,seconds,ledger,active}:{levelId:string;seconds:number;ledger:HomeworldArchiveLedgerV106;active:boolean}){
  if(levelId!=='0')return null;
  const p=homeworldProjectGroundV64(b.host),placement=homeworldModularPlacementV64('classic','reference',100);
  const cases=ledger.receipt?.cases??b.cases.map(c=>({id:c.id,...c.origin,place:'ground' as const}));
  const prop=(id:string,artId:string,point:{x:number;y:number},height:number,elevation=0)=>{
    const art=HOMEWORLD_COURT_ART_V80[artId],p=homeworldProjectGroundV64(point,elevation);
    return art?<HomeworldNativePropV64 key={id} id={id} artId={artId} art={art} x={p.x} y={p.y} heightWorld={height} depth={homeworldSceneDepthV78(point.y,0)+ (elevation?1:0)}/>:null;
  };
  return <>
    {placement&&<span className={styles.host} data-homeworld-archivist-v106={b.npcId} data-staging="neutral-existing-body-local-study-post" style={{left:p.x,top:p.y,zIndex:homeworldSceneDepthV78(b.host.y,0)}}>
      <HomeworldModularHunter morphId="classic" dreadStyleId="classic" appearance={{skinId:'ochre-mottle',dreadTintId:'obsidian',headStyleId:'reference'}} motionPhase={seconds} style={{...placement,position:'absolute'}}/>
      {active&&<span className={styles.worldLabel}>Archiviste · dossiers séparés</span>}
    </span>}
    {b.supports.map(s=><span key={s.id} data-archive-support-v106={s.id}>{prop(s.id,s.artId,s,76)}{(()=>{const p=homeworldProjectGroundV64(s);return <span className={styles.worldLabel} style={{position:'absolute',left:p.x-48,top:p.y-89,zIndex:homeworldSceneDepthV78(s.y,0)+2}}>{s.label}</span>;})()}</span>)}
    {cases.map(c=><span key={c.id} data-archive-case-v106={c.id} data-archive-case-place={c.place} data-world-x={c.x} data-world-y={c.y}>
      {prop(`archive-case-${c.id}-v106`,b.caseArtId,c,b.caseHeight,c.place==='carried'?42:c.place==='support'?50:0)}
      {(()=>{const p=homeworldProjectGroundV64(c,c.place==='carried'?42:c.place==='support'?50:0);return <span className={styles.caseLabel} style={{left:p.x-20,top:p.y-(c.place==='support'?67:39),zIndex:homeworldSceneDepthV78(c.y,0)+3}}>{c.id}{c.place==='carried'?' · porté':''}</span>;})()}
    </span>)}
  </>;
}
