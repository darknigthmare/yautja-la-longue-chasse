import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldModularHunter from './HomeworldModularHunter';
import HomeworldArchivistMotionV111 from './HomeworldArchivistMotionV111';
import {homeworldModularPlacementV64} from './systems/homeworldCharacterPlacementV64';
import {homeworldProjectGroundV64} from './systems/homeworldGeometryV64';
import {homeworldSceneDepthV78} from './systems/homeworldVisualLayersV78';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as b,HOMEWORLD_ARCHIVE_PLAQUE_ART_V109 as art} from './systems/homeworldArchivePlaqueDefinitionV109';
import type {HomeworldArchivePlaqueV109} from './systems/homeworldArchivePlaqueLedgerV109';
import styles from './HomeworldArchivePlaqueV109.module.css';

/** Existing physical pieces and host keep their exact places. Only this local
 * host gains native conversation drawings; no remote object is manipulated. */
export default function HomeworldArchivePlaqueWorldV111({levelId,ledger,seconds,archivistActiveV111=false,archivistPausedV111=true,archivistSequenceV111='',reducedMotionV111=false}:{
  levelId:string;ledger:HomeworldArchivePlaqueV109;seconds:number;archivistActiveV111?:boolean;archivistPausedV111?:boolean;archivistSequenceV111?:string;reducedMotionV111?:boolean;
}) {
  if(levelId!=='0')return null;
  const objects=ledger.receipt?.objects??b.objects.map(o=>({id:o.id,...o.origin,place:'source'})),placement=homeworldModularPlacementV64('classic','reference',100),host=homeworldProjectGroundV64(b.host);
  return <>
    {placement&&<span className={styles.host} data-plaque-host-v109 style={{left:host.x,top:host.y,zIndex:homeworldSceneDepthV78(b.host.y,0)}}>
      <HomeworldArchivistMotionV111 active={archivistActiveV111} paused={archivistPausedV111} reducedMotion={reducedMotionV111} sequenceKey={archivistSequenceV111}>
        <HomeworldModularHunter morphId="classic" dreadStyleId="classic" appearance={{skinId:'ashen-mottle',dreadTintId:'obsidian',headStyleId:'reference'}} motionPhase={seconds} style={{...placement,position:'absolute'}}/>
      </HomeworldArchivistMotionV111><span className={styles.label} style={{left:-75,top:-125}}>{b.npcName}</span>
    </span>}
    {b.supports.map(s=>{const p=homeworldProjectGroundV64(s);return <span key={s.id} data-plaque-support-v109={s.id} style={{position:'absolute',left:p.x-30,top:p.y-13,width:60,height:26,border:'2px dashed #b1bf8d',borderRadius:5,background:'#b8bd6522',zIndex:homeworldSceneDepthV78(s.y,0)-1,pointerEvents:'none'}}><span className={styles.label} style={{left:-20,top:29}}>{s.id==='plaque'?'Plaque':s.id==='trace'?'Empreinte':'Fragment'}</span></span>;})}
    {objects.map(o=>{
      if(o.id==='fragment'&&!ledger.receipt?.resumeSpoken)return null;
      const d=b.objects.find(d=>d.id===o.id)!,frame=art.frames[o.id],p=homeworldProjectGroundV64(o,o.place==='carried'?42:0),native={src:art.src,sourceWidth:art.width,sourceHeight:art.height,sourceRect:{x:frame.x,y:frame.y,width:frame.width,height:frame.height},pivot:frame.pivot,alphaBounds:frame.alphaBounds,heightWorld:d.height};
      return <span key={o.id} data-plaque-object-v109={o.id} data-plaque-placement-v109={o.place} data-world-x={o.x} data-world-y={o.y}><HomeworldNativePropV64 id={'archive-plaque-'+o.id+'-v109'} artId={'archive-plaque-'+o.id+'-v109'} art={native} x={p.x} y={p.y} depth={homeworldSceneDepthV78(o.y,0)+1}/><span className={styles.label} style={{left:p.x-35,top:p.y-d.height-30,zIndex:homeworldSceneDepthV78(o.y,0)+3}}>{d.label}{o.place==='carried'?' · porté':''}</span></span>;
    })}
  </>;
}
