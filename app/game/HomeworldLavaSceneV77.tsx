import {memo,useId} from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldCivilianV72 from './HomeworldCivilianV72';
import {HOMEWORLD_LAVA_BASES_V77,HOMEWORLD_LAVA_ROCKS_V77,HOMEWORLD_LAVA_DOCK_V77,homeworldLavaArtV77} from './systems/homeworldLavaPlacementV77';
import {HOMEWORLD_OUTSKIRTS_ART_V71} from './systems/homeworldOutskirtsArtV71';
import {homeworldProjectGroundV64,HOMEWORLD_GEOMETRY_V64} from './systems/homeworldGeometryV64';

type Camera={x:number;y:number;viewWidth:number;viewHeight:number};
/** Native objects sit individually over a bounded procedural molten surface.
 * This component never grants a route, permission, reward or collision. */
export default memo(function HomeworldLavaSceneV77({actor,skiffActive=false,skiffPoint,floor='0',camera,seconds=0,reducedMotion=false}:{
  actor:{x:number;y:number};skiffActive?:boolean;skiffPoint?:{x:number;y:number};floor:string;camera:Camera;seconds?:number;reducedMotion?:boolean;
}){
  const uid=useId().replace(/:/g,'-'),d=HOMEWORLD_GEOMETRY_V64.depthScale;
  if(camera.x+camera.viewWidth<-400||camera.x>1250||camera.y+camera.viewHeight<3300*d-650||camera.y>4300*d)return null;
  const active=floor==='0',depth=(y:number)=>Math.round(y)+(active?0:-25000);
  const point=skiffActive?(skiffPoint??actor):HOMEWORLD_LAVA_DOCK_V77,p=homeworldProjectGroundV64(point);
  const skiff=homeworldLavaArtV77('lava-transit-skiff'),scale=skiff.heightWorld/skiff.alphaBounds.height;
  const flow=reducedMotion?0:(Math.max(0,seconds)%30)/30;
  const ferryman={x:p.x+(skiff.ferrymanSource!.x-skiff.pivot.x)*scale,y:p.y+(skiff.ferrymanSource!.y-skiff.pivot.y)*scale};
  return <>
    <svg data-homeworld-lava-surface-v77 width="1400" height={760*d} viewBox="-300 3540 1400 760"
      aria-hidden="true" style={{position:'absolute',left:-300,top:3540*d,width:1400,height:760*d,zIndex:-30000,pointerEvents:'none'}}>
      <defs><linearGradient id={uid+'-lava'} x2=".7" y2="1"><stop stopColor="#211b16"/><stop offset=".3" stopColor="#652219"/><stop offset=".65" stopColor="#ab3d18"/><stop offset="1" stopColor="#391d16"/></linearGradient></defs>
      <path d="M-300 3740L120 3540 250 3690 490 3800 880 3550 1100 3720 950 4300-300 4300Z" fill={'url(#'+uid+'-lava)'}/>
      {[0,1,2,3,4,5].map(index=><path key={index} d={`M${-210+index*110} ${3900+index*22}Q${280+index*70} ${3670+index*38} ${1070-index*25} ${3910+index*28}`}
        fill="none" stroke={index%2?'#e47423':'#da4f19'} strokeWidth={7+index*2} opacity={.2+index*.04} strokeDasharray="25 65 70 110" strokeDashoffset={flow*100}/>) }
    </svg>
    {HOMEWORLD_LAVA_ROCKS_V77.map(rock=>{const g=homeworldProjectGroundV64(rock),art=HOMEWORLD_OUTSKIRTS_ART_V71[rock.artId];
      return <HomeworldNativePropV64 key={rock.id} id={rock.id} artId={rock.artId} art={art} x={g.x} y={g.y} depth={depth(rock.y)} heightWorld={rock.heightWorld}/>;
    })}
    {HOMEWORLD_LAVA_BASES_V77.map(base=>{const g=homeworldProjectGroundV64(base),art=homeworldLavaArtV77(base.artId);
      return <HomeworldNativePropV64 key={base.id} id={base.id} artId={base.artId} art={art} x={g.x} y={g.y} depth={depth(base.y)}/>;
    })}
    <HomeworldNativePropV64 id="lava-skiff-v77" artId={skiff.id} art={skiff} x={p.x} y={p.y} depth={depth(point.y)-1}/>
    <span data-homeworld-ferryman-v77 data-native-animation-clips="0" aria-hidden="true"
      style={{position:'absolute',left:ferryman.x,top:ferryman.y,zIndex:depth(point.y)}}>
      <HomeworldCivilianV72 npcId="lava-ferryman-v77" role="dock-officer" facing={-1} height={95} moving={false}/>
    </span>
  </>;
});
