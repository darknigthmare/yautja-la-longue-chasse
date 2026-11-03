import type {CSSProperties} from "react";
import type {HunterAppearance} from "./types";
import {
  DECAL_ATLAS_PATH_V133,decalOfPaletteV133,decalProjectionV139,
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
  const projected=decalProjectionV139(zone,placement);
  const a=decal.atlas;
  const positionX=a.columns===1?0:100*a.column/(a.columns-1);
  const positionY=a.rows===1?0:100*a.row/(a.rows-1);
  // The outer 256×384 span follows the current bone rotation. The OWNER is a
  // separate positioned rectangle; compact V62 cutouts and V137 translated
  // full-canvas biomasks MUST NOT be positioned with mask-position percentages.
  return <span aria-hidden="true" data-yautja-decal-zone={zone}
    data-yautja-decal-id={decal.id}
    style={{...style,position:"absolute",inset:0,pointerEvents:"none"}}>
    <span data-decal-mask-owner-v139 style={{
      position:"absolute",...projected.owner,
      WebkitMaskImage:'url("'+maskPath+'")',maskImage:'url("'+maskPath+'")',
      WebkitMaskSize:"100% 100%",maskSize:"100% 100%",
      WebkitMaskPosition:"0 0",maskPosition:"0 0",
      WebkitMaskRepeat:"no-repeat",maskRepeat:"no-repeat",
      pointerEvents:"none",
    }}>
      <span data-decal-projected-cell-v139 style={{
        position:"absolute",...projected.decal,
        backgroundImage:'url("'+DECAL_ATLAS_PATH_V133+'")',
        backgroundRepeat:"no-repeat",
        backgroundSize:String(a.columns*100)+"% "+String(a.rows*100)+"%",
        backgroundPosition:positionX+"% "+positionY+"%",
        // Canvas uses source-atop with normal RGB alpha, not screen blending.
        opacity:.82,pointerEvents:"none",
      }}/>
    </span>
  </span>;
}
