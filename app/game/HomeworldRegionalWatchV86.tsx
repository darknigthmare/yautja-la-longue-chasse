/* eslint-disable @next/next/no-img-element -- full immutable original native PNG */
import {useState,type ReactNode} from 'react';
import {regionalWatchArtV86,regionalWatchPlacementV86,type RegionalWatchQueryV86,type RegionalWatchArtV86} from './systems/homeworldRegionalWatchArtV86';

/** Rendering only: the parent keeps the resident's identity, ground origin,
 * depth order, shadow, interaction and route. Missing images restore the exact
 * original modular child; no portrait is scrolled as a fictitious walk clip. */
export default function HomeworldRegionalWatchV86({query,children}:{query:RegionalWatchQueryV86;children:ReactNode}){
 const art=regionalWatchArtV86(query);
 return art?<NativeWatch key={art.assetId} art={art} residentId={query.resident.id}>{children}</NativeWatch>:children;
}
function NativeWatch({art,residentId,children}:{art:RegionalWatchArtV86;residentId:string;children:ReactNode}){
 const[failed,setFailed]=useState(false);
 if(failed)return children;
 const placement=regionalWatchPlacementV86(art);
 return <img src={art.src} alt="" draggable={false} decoding="async" aria-hidden="true"
  data-homeworld-regional-watch-v86={residentId} data-native-source={art.src} data-native-sha256={art.sha256}
  data-native-clip="single-pose-static" data-native-frame="0" data-source-clan-v86={art.clanId}
  data-source-role-v86={art.sourceRole} data-source-life-stage-v86={art.lifeStage}
  data-person-identity-v86="clan-job-appearance-adaptation-not-imported-profile" data-ground-anchor-v86={art.anchorMethod}
  onError={()=>setFailed(true)} style={{position:'absolute',left:placement.left,top:placement.top,
   width:placement.width,height:placement.height,maxWidth:'none',pointerEvents:'none'}}/>;
}
