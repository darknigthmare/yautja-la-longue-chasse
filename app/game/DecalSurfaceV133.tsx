import type {CSSProperties} from "react";
import type {HunterAppearance} from "./types";
import {
  DECAL_ANCHORS_V133,DECAL_ATLAS_PATH_V133,decalOfPaletteV133,
  type YautjaDecalZoneV133,
} from "./yautjaDecalsV133.ts";

/** Original 256×384 sprite remains the authoritative RGBA cutout.
 * The two nested spans crop the decorative bitmap to its sub-region and then
 * mask it AGAIN with the owning body/plate/mask alpha.
 */
export default function DecalSurfaceV133({
  appearance,zone,maskPath,placement,style,
}:{
  appearance?:Pick<HunterAppearance,"chromaticsV113">;
  zone:YautjaDecalZoneV133;
  maskPath:string;
  placement?:{x:number;y:number;width:number;height:number};
  style?:CSSProperties;
}) {
  const decal=decalOfPaletteV133(zone,appearance?.chromaticsV113);
  if(!decal)return null;
  const anchor=DECAL_ANCHORS_V133[zone];
  const a=decal.atlas;
  const positionX=a.columns===1?0:100*a.column/(a.columns-1);
  const positionY=a.rows===1?0:100*a.row/(a.rows-1);
  // A small source cutout is placed at its original rig pixel coordinate
  // instead of stretching the mask over the entire 256×384 frame.
  const percent=(value:number,total:number)=>String(value/total*100)+"%";
  const maskSize=placement
    ? percent(placement.width,256)+" "+percent(placement.height,384)
    : "100% 100%";
  const xPos=placement && placement.width<256
    ? percent(placement.x,256-placement.width):"0%";
  const yPos=placement && placement.height<384
    ? percent(placement.y,384-placement.height):"0%";
  return <span aria-hidden="true" data-yautja-decal-zone={zone}
    data-yautja-decal-id={decal.id} style={{
      position:"absolute",inset:0,pointerEvents:"none",
      WebkitMaskImage:'url("'+maskPath+'")',maskImage:'url("'+maskPath+'")',
      WebkitMaskSize:maskSize,maskSize,
      WebkitMaskPosition:xPos+" "+yPos,maskPosition:xPos+" "+yPos,
      WebkitMaskRepeat:"no-repeat",maskRepeat:"no-repeat",...style,
    }}>
    <span style={{
      position:"absolute",
      left:percent(anchor.x,256),top:percent(anchor.y,384),
      width:percent(anchor.width,256),height:percent(anchor.height,384),
      backgroundImage:'url("'+DECAL_ATLAS_PATH_V133+'")',
      backgroundRepeat:"no-repeat",
      backgroundSize:String(a.columns*100)+"% "+String(a.rows*100)+"%",
      backgroundPosition:positionX+"% "+positionY+"%",
      mixBlendMode:"screen",opacity:.82,pointerEvents:"none",
    }}/>
  </span>;
}
