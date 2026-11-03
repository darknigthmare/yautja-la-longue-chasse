import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = path.join(root, "art-source/v26/known-yautja");
const manifest = JSON.parse(fs.readFileSync(path.join(base, "manifest.json"), "utf8"));
const entries = manifest.selectedSheets.map(entry => ({ ...entry,
  image: "data:image/png;base64," + fs.readFileSync(path.join(base, entry.file)).toString("base64") }));
const html = String.raw`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Yautja — contrôle des sprites V26</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#111916;color:#e7ebe5;font:15px/1.5 system-ui,sans-serif}main{max-width:1340px;margin:auto;padding:24px}
h1{font-size:27px;margin:0}.subtitle{color:#a9b5ad;margin:6px 0 20px}.warning{border-left:4px solid #e3b356;background:#2c281d;padding:12px 16px;border-radius:4px;margin-bottom:20px}
.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap}button,select{font:inherit;color:inherit;background:#26372e;border:1px solid #668572;border-radius:6px;padding:8px 12px}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #e3b356;outline-offset:3px}button{cursor:pointer}input[type=range]{width:160px}label{display:flex;align-items:center;gap:8px}
.layout{display:grid;grid-template-columns:minmax(300px,440px) 1fr;gap:20px;margin-top:20px}.panel{background:#17231c;border:1px solid #334c3b;border-radius:8px;padding:14px}canvas{width:100%;height:auto;display:block;image-rendering:pixelated;background:#263a2d;border:1px solid #3e5a47}
.badge{font-size:12px;color:#efc47c;text-transform:uppercase;letter-spacing:.08em}.facts{color:#9bb69f;font-size:13px}#note{min-height:70px}ul{padding-left:20px}
@media(max-width:850px){main{padding:14px}.layout{grid-template-columns:1fr}}a{color:#bddcaa}
</style><main><h1>Yautja — contrôle des sprites V26</h1>
<p class="subtitle">Sources OpenAI intégrées · 8 personnages testés · 50 cellules dessinées à contrôler</p>
<div class="warning"><strong>Lot incomplet : aucun personnage complet, aucun clip validé pour le jeu.</strong><br>La lecture ci-dessous montre les essais sauvegardés, y compris les rejets. Le fond magenta est masqué uniquement en mémoire ; les PNG sources restent opaques et inchangés.</div>
<div class="controls"><label>Personnage <select id="character"></select></label><button id="play">Lire</button><button id="step">Image suivante</button>
<label>Image <input id="frame" type="range" min="0" value="0"><output id="counter"></output></label>
<label>Vitesse <select id="speed"><option value="3">3 images/s</option><option value="6" selected>6 images/s</option><option value="10">10 images/s</option></select></label>
<label><input type="checkbox" id="key" checked>Fond masqué</label></div>
<div class="layout"><section class="panel"><div id="status" class="badge"></div><h2 id="name"></h2><canvas id="sprite" width="512" height="512" aria-label="Image animée sélectionnée"></canvas><p id="note"></p><p class="facts" id="facts"></p></section>
<section class="panel"><canvas id="sheet" width="768" height="512" aria-label="Planche source et cellule sélectionnée"></canvas><ul id="issues"></ul><p class="facts">Cadre orange : cellule courante. Les limites ne sont pas déplacées pour cacher les débordements. Les pivots sont provisoires ; aucune interpolation et aucun miroir ne sont appliqués.</p></section></div></main>
<script>
const entries=__SPRITE_DATA__;
const $=id=>document.getElementById(id);
let selected=0,frame=0,playing=false,last=0,source=null,keyed=null,version=0;
const ctx=$("sprite").getContext("2d"),sheetCtx=$("sheet").getContext("2d");
for(const [i,e] of entries.entries()){const option=document.createElement("option");option.value=i;option.textContent=e.name+" — "+e.clip;$("character").append(option);}
function draw(){
 if(!source)return;const e=entries[selected],f=e.frames[frame],img=$("key").checked?keyed:source;
 ctx.clearRect(0,0,512,512);ctx.imageSmoothingEnabled=false;
 const scale=Math.min(512/f.rect[2],512/f.rect[3]);
 ctx.drawImage(img,...f.rect,256-f.pivot[0]*scale,440-f.pivot[1]*scale,f.rect[2]*scale,f.rect[3]*scale);
 sheetCtx.clearRect(0,0,768,512);sheetCtx.drawImage(source,0,0,768,512);
 sheetCtx.strokeStyle="#ffce78";sheetCtx.lineWidth=3;sheetCtx.strokeRect(f.rect[0]*768/e.width,f.rect[1]*512/e.height,f.rect[2]*768/e.width,f.rect[3]*512/e.height);
 $("frame").value=frame;$("counter").textContent=(frame+1)+"/"+e.frames.length;$("note").textContent=f.review;
 $("facts").textContent=e.width+" × "+e.height+" · RGB opaque · "+f.edgePixels+" pixels non masqués sur le bord de cette cellule";
 window.spriteReviewState={id:e.id,frame,frames:e.frames.length,status:e.status,playing,ready:true,hasAlpha:e.hasAlpha,complete:false};
}
async function select(){
 const token=++version;selected=Number($("character").value);frame=0;playing=false;$("play").textContent="Lire";const e=entries[selected];
 $("name").textContent=e.name;$("status").textContent=e.status==="rejected"?"Rejeté — correction nécessaire":"Brouillon — validation en attente";
 $("issues").replaceChildren(...e.notes.map(note=>{const li=document.createElement("li");li.textContent=note;return li;}));$("frame").max=e.frames.length-1;
 const img=new Image();img.src=e.image;await img.decode();if(token!==version)return;source=img;
 keyed=document.createElement("canvas");keyed.width=e.width;keyed.height=e.height;const k=keyed.getContext("2d",{willReadFrequently:true});k.drawImage(img,0,0);
 const pixels=k.getImageData(0,0,e.width,e.height),d=pixels.data,t=e.transparency.tolerance;
 for(let i=0;i<d.length;i+=4)if(Math.abs(d[i]-255)<=t&&d[i+1]<=t&&Math.abs(d[i+2]-255)<=t)d[i+3]=0;
 k.putImageData(pixels,0,0);draw();
}
$("character").addEventListener("change",()=>select().catch(showError));
$("play").onclick=()=>{playing=!playing;last=performance.now();$("play").textContent=playing?"Pause":"Lire";draw();};
$("step").onclick=()=>{playing=false;$("play").textContent="Lire";frame=(frame+1)%entries[selected].frames.length;draw();};
$("frame").oninput=()=>{playing=false;$("play").textContent="Lire";frame=Number($("frame").value);draw();};
$("key").onchange=draw;
function showError(error){$("note").textContent="Erreur de lecture : "+error.message;window.spriteReviewState={error:error.message,ready:false};}
function tick(now){if(playing&&now-last>=1000/Number($("speed").value)){frame=(frame+1)%entries[selected].frames.length;last=now;draw();}requestAnimationFrame(tick);}
select().catch(showError);requestAnimationFrame(tick);
</script></html>`;
const output = path.join(root, "outputs/known-yautja-v26");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "preview.html"), html.replace("__SPRITE_DATA__", JSON.stringify(entries).replaceAll("<", "\\u003c")));
console.log(path.join(output, "preview.html"));
