import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldModularHunter from './HomeworldModularHunter';
import {HOMEWORLD_CARGO_V108 as b} from './systems/homeworldCargoDefinitionV108';
import type {HomeworldCargoLedgerV108} from './systems/homeworldCargoLedgerV108';
import {HOMEWORLD_COURT_ART_V80} from './systems/homeworldCourtArtV80';
import {HOMEWORLD_CITY_NATIVE_ART_V78} from './systems/homeworldCityNativeArtV78';
import {HOMEWORLD_STREET_DECOR_ART_V83} from './systems/homeworldStreetDecorV83';
import {homeworldModularPlacementV64} from './systems/homeworldCharacterPlacementV64';
import {homeworldProjectGroundV64} from './systems/homeworldGeometryV64';
import {homeworldSceneDepthV78} from './systems/homeworldVisualLayersV78';
import styles from './HomeworldCargoV108.module.css';
/** New declared placements reuse full native source cells. No painted item
 * fused into a rack/cart is detached, awarded or treated as an inventory item. */
export default function HomeworldCargoWorldV108({levelId,ledger,seconds}:{levelId:string;ledger:HomeworldCargoLedgerV108;seconds:number}){
 if(levelId!=='0')return null;
 const placement=homeworldModularPlacementV64('classic','reference',100),lots=ledger.receipt?.lots??b.lots.map(l=>({id:l.id,ownerId:l.ownerId,...l.origin,place:'source'}));
 const label=(id:string,p:{x:number;y:number},text:string,z=0)=>{const q=homeworldProjectGroundV64(p,z);return <span key={id} className={styles.label} style={{left:q.x-38,top:q.y-34,zIndex:homeworldSceneDepthV78(p.y,0)+4}}>{text}</span>;};
 const prop=(id:string,artId:string,art:Parameters<typeof HomeworldNativePropV64>[0]['art'],p:{x:number;y:number},height:number,z=0)=>{const q=homeworldProjectGroundV64(p,z);return <HomeworldNativePropV64 key={id} id={id} artId={artId} art={art} x={q.x} y={q.y} heightWorld={height} depth={homeworldSceneDepthV78(p.y,0)+(z?1:0)}/>;};
 return <>
  {[{id:b.npcId,point:b.host,label:b.npcName},{id:b.guardian.id,point:b.guardian.host,label:'Gardien du dépôt'}].map((host,i)=>{const p=homeworldProjectGroundV64(host.point);return placement?<span key={host.id} className={styles.host} data-cargo-host-v108={host.id} data-staging="neutral-existing-body-local-cargo-post" style={{left:p.x,top:p.y,zIndex:homeworldSceneDepthV78(host.point.y,0)}}><HomeworldModularHunter morphId="classic" dreadStyleId="classic" appearance={{skinId:i?'ashen-mottle':'ochre-mottle',dreadTintId:'obsidian',headStyleId:'reference'}} motionPhase={seconds} style={{...placement,position:'absolute'}}/><span className={styles.label}>{host.label}</span></span>:null;})}
  <span data-cargo-cart-v108>{prop(b.cart.id,b.cart.artId,HOMEWORLD_CITY_NATIVE_ART_V78[b.cart.artId],b.cart,b.cart.height)}</span>
  {b.racks.map(r=><span key={r.id} data-cargo-rack-v108={r.id}>{prop(`cargo-rack-${r.id}-v108`,r.artId,HOMEWORLD_STREET_DECOR_ART_V83[r.artId],r,HOMEWORLD_STREET_DECOR_ART_V83[r.artId].heightWorld*r.scale)}{label(`rack-${r.id}`,r,r.label)}</span>)}
  {lots.map(l=>{const def=b.lots.find(d=>d.id===l.id)!,z=l.place==='carried'?42:l.place==='rack'?58:l.id==='narrow'&&l.place==='source'?32:0;return <span key={l.id} data-cargo-lot-v108={l.id} data-cargo-placement={l.place} data-world-x={l.x} data-world-y={l.y}>{prop(`cargo-lot-${l.id}-v108`,b.caseArtId,HOMEWORLD_COURT_ART_V80[b.caseArtId],l,def.height,z)}{label(`lot-${l.id}`,l,def.label+(l.place==='carried'?' · porté':''),z)}</span>;})}
  {(()=>{const p=homeworldProjectGroundV64(b.depot);return <span data-cargo-depot-v108 style={{position:'absolute',left:p.x-55,top:p.y-22,width:110,height:44,border:'2px dashed #a8cfaa',borderRadius:6,background:'#77bc8d15',zIndex:homeworldSceneDepthV78(b.depot.y,0)-1,pointerEvents:'none'}}><span className={styles.label} style={{left:-10,top:-30}}>Dépôt du lot large</span></span>;})()}
 </>;
}
