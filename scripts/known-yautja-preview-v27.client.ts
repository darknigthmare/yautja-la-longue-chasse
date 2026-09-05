import { processHunterSpriteTransparency } from "../app/game/hunterSpriteAtlas";
interface Frame { index:number;stage:string;rect:[number,number,number,number];pivot:[number,number] }
interface Entry { id:string;name:string;action:string;status:string;loop:boolean;notes:string[];image:string;source:{path:string;sha256:string;width:number;height:number};frames:Frame[] }
declare global { interface Window { __yautjaReviewEntries:Entry[]; spriteReviewState:Record<string,unknown> } }
const entries=window.__yautjaReviewEntries;
const stageLabels:Record<string,string>={"ready":"prêt","raise-forearms":"montée des avant-bras","high-guard":"garde haute","absorb-recoil":"absorption du choc","recover":"récupération","return-ready":"retour en garde","folded-guard":"bouclier replié","raise-and-start-unfold":"levée et début d’ouverture","half-unfolded":"ouverture intermédiaire","fully-deployed":"bouclier déployé","fold-and-lower":"repli et abaissement","return-folded":"retour bouclier replié","initial-brace":"préparation à l’impact","backward-chest-recoil":"recul du torse","maximum-backward-stagger":"déséquilibre arrière maximal","low-forward-recovery":"reprise d’appui en flexion","rise-and-reset":"redressement","recovered-guard":"garde retrouvée"};

function element<T extends HTMLElement>(id:string):T { const found=document.getElementById(id);if(!found)throw Error("Missing element "+id);return found as T; }
const selector=element<HTMLSelectElement>("character"),play=element<HTMLButtonElement>("play"),slider=element<HTMLInputElement>("frame");
const loop=element<HTMLInputElement>("loop"),registration=element<HTMLInputElement>("registered"),onion=element<HTMLInputElement>("onion");
const matte=element<HTMLSelectElement>("matte"),background=element<HTMLSelectElement>("background"),speed=element<HTMLSelectElement>("speed");
const sprite=element<HTMLCanvasElement>("sprite"),sheet=element<HTMLCanvasElement>("sheet");
const ctx=sprite.getContext("2d")!,sheetCtx=sheet.getContext("2d")!;
let selected=0,frameIndex=0,playing=false,last=0,version=0,source:HTMLImageElement|null=null;
let simple:HTMLCanvasElement|null=null,clean:HTMLCanvasElement|null=null,fringePixels=0,keyedPixels=0;
const fixedScale=.95,worldX=320,worldY=548;
for(const [i,entry]of entries.entries()){const option=document.createElement("option");option.value=String(i);option.textContent=entry.name+" — "+entry.action;selector.append(option);}
function frameMetrics(frame:Frame){
 const canvas=matte.value==="source"?null:matte.value==="key"?simple:clean;
 if(!canvas)return {visiblePixels:null,edgePixels:null};
 const d=canvas.getContext("2d")!.getImageData(...frame.rect).data;
 let visiblePixels=0,edgePixels=0;const w=frame.rect[2],h=frame.rect[3];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>0){visiblePixels++;if(x===0||y===0||x===w-1||y===h-1)edgePixels++;}
 return {visiblePixels,edgePixels};
}
function drawPose(index:number,opacity:number){
 if(!source)return;
 const f=entries[selected].frames[index],image=matte.value==="source"?source:matte.value==="key"?simple!:clean!;
 // One scale for every rectangle. Registration changes placement only.
 const cellX=(index%3)*512,cellY=Math.floor(index/3)*512;
 const pivot=registration.checked?f.pivot:[256-(f.rect[0]-cellX),440-(f.rect[1]-cellY)];
 ctx.globalAlpha=opacity;
 ctx.drawImage(image,...f.rect,worldX-pivot[0]*fixedScale,worldY-pivot[1]*fixedScale,f.rect[2]*fixedScale,f.rect[3]*fixedScale);
 ctx.globalAlpha=1;
}
function draw(){
 if(!source)return;
 const entry=entries[selected],f=entry.frames[frameIndex];
 ctx.fillStyle=background.value;ctx.fillRect(0,0,640,600);ctx.imageSmoothingEnabled=false;
 ctx.strokeStyle="#5e9965";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(12,worldY);ctx.lineTo(628,worldY);ctx.stroke();
 if(onion.checked&&frameIndex>0)drawPose(frameIndex-1,.25);
 drawPose(frameIndex,1);
 ctx.strokeStyle="#f2cf91";ctx.beginPath();ctx.moveTo(worldX-6,worldY);ctx.lineTo(worldX+6,worldY);ctx.moveTo(worldX,worldY-6);ctx.lineTo(worldX,worldY+6);ctx.stroke();
 sheetCtx.clearRect(0,0,768,512);sheetCtx.imageSmoothingEnabled=false;sheetCtx.drawImage(source,0,0,768,512);
 sheetCtx.strokeStyle="#ffd184";sheetCtx.lineWidth=2;sheetCtx.strokeRect(f.rect[0]*768/entry.source.width,f.rect[1]*512/entry.source.height,f.rect[2]*768/entry.source.width,f.rect[3]*512/entry.source.height);
 slider.value=String(frameIndex);element("counter").textContent=(frameIndex+1)+"/"+entry.frames.length;
 element("stage").textContent="Pose "+(frameIndex+1)+" — "+(stageLabels[f.stage]??(f.stage.startsWith("ready-")?"attente, dessin "+f.index:f.stage));
 const metrics=frameMetrics(f);
 element("facts").textContent=entry.source.width+" × "+entry.source.height+" · "+metrics.edgePixels+" pixels opaques sur le bord du rectangle · "+fringePixels+" pixels de liseré traités sur la planche. SHA256 : "+entry.source.sha256;
 for(const button of element("timeline").querySelectorAll("button"))button.setAttribute("aria-current",String(Number(button.dataset.index)===frameIndex));
 window.spriteReviewState={id:entry.id,frame:frameIndex,frames:entry.frames.length,status:entry.status,playing,ready:true,registered:registration.checked,scale:fixedScale,fringePixels,keyedPixels,matte:matte.value,...metrics,complete:false};
}
function stop(){playing=false;play.textContent="Lire";}
function selectFrame(index:number){stop();frameIndex=index;draw();}
async function select(){
 const token=++version;source=null;window.spriteReviewState={ready:false};
 selected=Number(selector.value);frameIndex=0;stop();const entry=entries[selected];loop.checked=entry.loop;
 element("name").textContent=entry.name+" — "+entry.action;
 element("notes").replaceChildren(...entry.notes.map(note=>{const li=document.createElement("li");li.textContent=note;return li;}));
 element("timeline").replaceChildren(...entry.frames.map((_,index)=>{const button=document.createElement("button");button.textContent=String(index+1);button.dataset.index=String(index);button.setAttribute("aria-label","Pose "+(index+1));button.onclick=()=>selectFrame(index);return button;}));
 slider.max=String(entry.frames.length-1);element("error").textContent="";
 const image=new Image();image.src=entry.image;await image.decode();if(token!==version)return;
 const raw=document.createElement("canvas");raw.width=entry.source.width;raw.height=entry.source.height;
 const rawCtx=raw.getContext("2d",{willReadFrequently:true})!;rawCtx.drawImage(image,0,0);const data=rawCtx.getImageData(0,0,raw.width,raw.height);
 const keyConfig={mode:"color-key" as const,rgb:[255,0,255] as const,tolerance:64};
 const basic=processHunterSpriteTransparency(data.data,raw.width,raw.height,keyConfig);
 const refined=processHunterSpriteTransparency(data.data,raw.width,raw.height,{...keyConfig,fringe:{mode:"connected-magenta",radius:2,minExcess:24,strength:1}});
 function canvasFrom(pixels:Uint8ClampedArray){const c=document.createElement("canvas");c.width=raw.width;c.height=raw.height;const context=c.getContext("2d")!;const output=context.createImageData(c.width,c.height);output.data.set(pixels);context.putImageData(output,0,0);return c;}
 simple=canvasFrom(basic.pixels);clean=canvasFrom(refined.pixels);fringePixels=refined.fringePixels;keyedPixels=refined.keyedPixels;source=image;draw();
}
function error(reason:unknown){const message=reason instanceof Error?reason.message:String(reason);element("error").textContent=message;window.spriteReviewState={ready:false,error:message};stop();}
selector.onchange=()=>{select().catch(error);};
play.onclick=()=>{if(!source)return;if(playing)stop();else {if(frameIndex===entries[selected].frames.length-1)frameIndex=0;playing=true;last=performance.now();play.textContent="Pause";}draw();};
element("step").onclick=()=>{if(source)selectFrame((frameIndex+1)%entries[selected].frames.length);};
slider.oninput=()=>selectFrame(Number(slider.value));
for(const control of [registration,onion,matte,background])control.onchange=draw;
function tick(now:number){
 if(playing&&source){const interval=1000/Number(speed.value);if(now-last>=interval){
  const count=Math.floor((now-last)/interval);last+=count*interval;frameIndex+=count;
  if(frameIndex>=entries[selected].frames.length){if(loop.checked)frameIndex%=entries[selected].frames.length;else{frameIndex=entries[selected].frames.length-1;stop();}}
  draw();
 }}
 requestAnimationFrame(tick);
}
document.addEventListener("visibilitychange",()=>{if(document.hidden){stop();draw();}});
select().catch(error);requestAnimationFrame(tick);
