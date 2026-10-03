'use client';
import {useEffect,useState} from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import {homeworldProjectGroundV64} from './systems/homeworldGeometryV64';
import {HOMEWORLD_PROP_ART_V64} from './systems/homeworldArtV64';
import {HOMEWORLD_FAUNA_HABITAT_ART_V77} from './systems/homeworldFaunaHabitatV77';
import {homeworldFaunaForRegionV77,homeworldFaunaArtV77,homeworldFaunaPlacementV77} from './systems/homeworldFaunaV77';
import type {HomeworldRegionIdV68} from './systems/homeworldRegionsV68';

/** Presentational fauna only. The existing region simulation owns every actor,
 * encounter, floor, checkpoint and reward. These lisières are not walkable. */
export default function HomeworldFaunaDisplayV77({regionId,tick}:{regionId:HomeworldRegionIdV68;tick:number;groundColor:string}){
  const [reducedMotion,setReducedMotion]=useState(true);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReducedMotion(query.matches);
    update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  return <>{homeworldFaunaForRegionV77(regionId).map(display=>{
    const art=homeworldFaunaArtV77(display.artId)!,pose=homeworldFaunaPlacementV77(display,tick,reducedMotion);
    const ground=homeworldProjectGroundV64(display),anchor=homeworldProjectGroundV64(pose,pose.elevation);
    const width=display.ground.width;
    const rocks=[{x:display.x-width*.38,y:display.y-42,height:66},{x:display.x+width*.38,y:display.y-36,height:78}];
    return <span key={display.id} data-homeworld-fauna-v77={display.id} data-native-format="held" data-native-animation-clips="0"
      data-placement-motion={display.placementMotion} aria-hidden="true" style={{position:'absolute',left:0,top:0,width:0,height:0,pointerEvents:'none'}}>
      <HomeworldNativePropV64 id={`${display.id}:habitat-base`} artId={HOMEWORLD_FAUNA_HABITAT_ART_V77.id}
        art={HOMEWORLD_FAUNA_HABITAT_ART_V77} x={ground.x} y={ground.y} depth={-1}/>
      {rocks.map((rock,index)=>{const p=homeworldProjectGroundV64(rock);return <HomeworldNativePropV64 key={index} id={`${display.id}:habitat-${index}`} artId="rock-plant" art={HOMEWORLD_PROP_ART_V64['rock-plant']} x={p.x} y={p.y} depth={rock.y} heightWorld={rock.height}/>;})}
      <HomeworldNativePropV64 id={display.id} artId={`fauna-art-v77:${art.id}`} art={art} x={anchor.x} y={anchor.y} depth={display.y}/>
    </span>;
  })}</>;
}
