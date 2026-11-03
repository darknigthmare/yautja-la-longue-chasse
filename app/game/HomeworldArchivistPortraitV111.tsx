import HomeworldArchivistMotionV111 from './HomeworldArchivistMotionV111';
import HomeworldModularHunter from './HomeworldModularHunter';
import {homeworldModularPlacementV64} from './systems/homeworldCharacterPlacementV64';

/** Same four native drawings as the situated host, visible above the source
 * exchange without counting another character or another art delivery. */
export default function HomeworldArchivistPortraitV111({active,paused,reducedMotion,sequenceKey}:{active:boolean;paused:boolean;reducedMotion:boolean;sequenceKey:string}) {
  const placement=homeworldModularPlacementV64('classic','reference',148);
  return <div aria-hidden="true" data-homeworld-archivist-portrait-v111 style={{position:'relative',width:160,height:188,maxWidth:'100%',margin:'6px auto',pointerEvents:'none',flex:'0 0 auto'}}>
    <span style={{position:'absolute',left:80,top:174}}><HomeworldArchivistMotionV111 active={active} paused={paused} reducedMotion={reducedMotion} sequenceKey={sequenceKey} heightWorld={148}>
      {placement&&<HomeworldModularHunter morphId="classic" dreadStyleId="classic" appearance={{skinId:'ashen-mottle',dreadTintId:'obsidian',headStyleId:'reference'}} style={{...placement,position:'absolute'}}/>}
    </HomeworldArchivistMotionV111></span>
  </div>;
}
