/** One original alpha-safe decal composition for the hunting Canvas.
 * Recoloured source image and class-specific bone placement remain unchanged.
 */
import {
 DECAL_ANCHORS_V133,DECAL_ATLAS_PATH_V133,decalOfPaletteV133,
 type YautjaDecalZoneV133,
} from "./yautjaDecalsV133.ts";
type Placement={x:number;y:number;width:number;height:number};
type Source=HTMLImageElement|HTMLCanvasElement;
type Load={image:HTMLImageElement;status:"loading"|"ready"|"failed"};
let atlas:Load|null=null;
const cache=new WeakMap<Source,Map<string,HTMLCanvasElement>>();
const W=256,H=384;
function imageLoaded():HTMLImageElement|null{
 if(atlas)return atlas.status==="ready"?atlas.image:null;
 const image=new Image();
 const record:Load={image,status:"loading"};
 atlas=record;
 image.onload=()=>{record.status=image.naturalWidth>0&&image.naturalHeight>0?"ready":"failed";};
 image.onerror=()=>{record.status="failed";};
 image.decoding="async";
 image.src=DECAL_ATLAS_PATH_V133;
 return null;
}
/** Only validated IDs from the fixed JSON catalog can select tiles. */
export function decalCanvasSourceV133(
 original:Source,palette:unknown,zone:YautjaDecalZoneV133,
 placement?:Placement,baseFilter="none",
):HTMLCanvasElement|null{
 const selected=decalOfPaletteV133(zone,palette);
 if(!selected)return null;
 const img=imageLoaded();
 if(!img)return null;
 const box=DECAL_ANCHORS_V133[zone],a=selected.atlas;
 const key=[zone,selected.id,placement
   ?[placement.x,placement.y,placement.width,placement.height].join(":"):"full",baseFilter].join("|");
 let family=cache.get(original);
 const old=family?.get(key);
 if(old)return old;
 const canvas=document.createElement("canvas");
 canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext("2d");
 if(!ctx)return null;
 ctx.filter=baseFilter;
 ctx.drawImage(original,placement?.x??0,placement?.y??0,placement?.width??W,placement?.height??H);
 ctx.filter="none";
 ctx.globalCompositeOperation="source-atop";
 ctx.globalAlpha=.82;
 const sw=img.naturalWidth/a.columns,sh=img.naturalHeight/a.rows;
 ctx.drawImage(img,a.column*sw,a.row*sh,sw,sh,box.x,box.y,box.width,box.height);
 ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
 if(!family){family=new Map();cache.set(original,family);}
 if(family.size>=16)family.clear();
 family.set(key,canvas);
 return canvas;
}
