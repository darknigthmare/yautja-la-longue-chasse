
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import sharp from "sharp";
const KNOWN = new Set(["jungle-hunter","city-hunter","wolf","feral","dek"]);
const PALETTES = {"classic":["#354346","#84938a","#e0464c","#19282c"],"urban":["#35434a","#9b9c8c","#d45b54","#102931"],"elder":["#4d4338","#c1ab79","#d27a63","#262723"],"bronze":["#5e4935","#b9925c","#df6e4c","#29211e"],"stealth":["#293e3d","#739a92","#db655e","#14272b"],"scar":["#474a40","#a2ac8e","#e04e49","#222727"],"wolf":["#424c4e","#b0b4a1","#e05257","#1e292c"],"brutal":["#523833","#926451","#e96b4d","#272225"],"feral":["#5a5040","#ba9d71","#cb7357","#292721"],"badlands":["#594c40","#b9a17a","#d36258","#2c2625"]};
const P=PALETTES;
const KEYS=["01-arm","02-shell","03-interface","04-lid"];
function hashId(id){let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0;}
function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");}
function svgWrap(entry,layer,inner){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 290" width="540" height="290">
<!-- V136 independent ORIGINAL concept blockout. NOT a verified 1:1 film prop. -->
<!-- hunter:${esc(entry.id)} source:${esc(entry.medium)} evidence:${esc(entry.evidence)} layer:${layer} -->
${inner}
</svg>\n`;
}
function geom(entry,layer){
 const h=hashId(entry.id),s=h%7,t=(h>>>5)%7,u=(h>>>12)%7,v=(h>>>17)%7;
 const p=P[entry.theme]||P.classic; const [base,trim,light,dark]=p; 
 const accent=light,rx=(h>>>8)%3,corner=(h>>>4)%4;
 const shift=(h%17)-8;const tilt=-(5+(h%8));
 const w=198+(h%57);const x=164+s*3;const max=x+w,yy=81+(h%13),hh=105+(h%23);
 const q=x+Math.round(w/2),buttonCount=2+(h%4),panelType=(h>>>3)%4,caporn=(h>>>16)%5;
 if(layer==="01-arm"){
  let muscles="";
  for(let i=0;i<5;i++){const x1=28+i*27, y1=276-i*14;muscles+=`<path d="M${x1} ${y1}q${20+s} -${14+t} ${53+u} -${22+v}" fill="none" stroke="${dark}" stroke-width="3" opacity=".48"/>`;}
  let straps="";for(let i=0;i<3;i++)straps+=`<path d="M${84+i*47} ${188+i*6}l${12+i*2} 74" stroke="${trim}" opacity=".75" stroke-width="${3+(h+i)%4}"/>`;
  return svgWrap(entry,layer,`<path d="M0 281L${81+s*3} 200 ${154+t*5} 155 ${247+u*6} 146 ${343+v*4} 185 422 239 370 286Z" fill="#444a3c" stroke="#1a2423" stroke-width="6"/>
<path d="M17 274L${100+t*3} 213 ${199+u*4} 176 ${280+s*3} 197 352 253 313 290Z" fill="#606555" stroke="#849187" stroke-width="3"/>
${muscles}
<path d="M3 273L82 218 159 183 193 201 123 282Z" fill="${base}" stroke="${trim}" stroke-width="5"/>
${straps}
<path d="M32 274l80 -39M59 282l73 -34" fill="none" stroke="#99a79c" opacity=".49" stroke-width="3"/>`);
 }
 if(layer==="02-shell"){
  const outer=`M${x-11} ${yy+32}L${x+20} ${yy-10} ${max-25} ${yy-14} ${max+19} ${yy+23} ${max+7} ${yy+hh+3} ${x+32} ${yy+hh+7} ${x-20} ${yy+hh-27}Z`;
  let studs="";
  for(let i=0;i<5;i++){
    const xx=x+15+i*(w-30)/4;const ry=(i%2===0?yy-6:yy+hh+4);
    studs+=`<path d="M${xx} ${ry}l${6+rx} -${9+corner} ${11+s} 5 3 9Z" fill="${base}" stroke="${trim}" stroke-width="2"/>`;
  }
  let rivets="";for(let i=0;i<4;i++)rivets+=`<circle cx="${x+11+i*(w-10)/3}" cy="${yy+17+(i%2)*4}" r="3" stroke="#151d21" stroke-width="2" fill="${trim}"/>`;
  const spikes=(h%5===0)?`<path d="M${max-4} ${yy+22}l29 -25 -8 39M${max} ${yy+hh-5}l28 -3 -23 19" fill="${base}" stroke="${trim}" stroke-width="3"/>`:"";
  return svgWrap(entry,layer,`<g transform="rotate(${tilt} ${q} ${yy+hh/2})">
<path d="${outer}" fill="${dark}" stroke="${trim}" stroke-width="6" stroke-linejoin="round"/>
<path d="M${x} ${yy+30}L${x+29} ${yy+3} ${max-33} ${yy+1} ${max+2} ${yy+29} ${max-10} ${yy+hh-7} ${x+27} ${yy+hh-4} ${x-5} ${yy+hh-26}Z" fill="${base}" stroke="#111d21" stroke-width="4"/>
<path d="M${x+14} ${yy+22}L${max-12} ${yy+22}M${x+18} ${yy+hh-19}L${max-14} ${yy+hh-19}" stroke="${trim}" stroke-width="2" opacity=".7"/>
${studs}
${rivets}
${spikes}
</g>`);
 }
 if(layer==="03-interface"){
  const panelX=x+28,panelY=yy+24,panelW=w-67,panelH=hh-40;
  let cells="";
  if(panelType===0 || panelType===2){
    const n=2+((h>>>18)%4),gap=3,cellH=(panelH-gap*(n-1))/n;
    for(let i=0;i<n;i++){let y=panelY+i*(cellH+gap);cells+=`<rect x="${panelX}" y="${y}" width="${panelW}" height="${cellH}" rx="1.5" fill="${dark}" stroke="#89918b" stroke-width="1.2"/>
<path d="M${panelX+8} ${y+4}l${11+s} ${Math.max(3,cellH-10)} ${11+u} -5M${panelX+panelW-38} ${y+cellH-4}l12 -${Math.max(3,cellH-10)} 14 8" stroke="${accent}" stroke-width="3" opacity=".85" fill="none"/>`;}
  }else if(panelType===1){
    const n=2+((h>>>21)%4),gap=3,cellW=(panelW-gap*(n-1))/n;
    for(let i=0;i<n;i++){let xx=panelX+i*(cellW+gap);cells+=`<rect x="${xx}" y="${panelY}" width="${cellW}" height="${panelH}" rx="2" fill="${dark}" stroke="#89918b" stroke-width="1"/>
<path d="M${xx+5} ${panelY+14}l${Math.max(5,cellW-12)} 7 -5 15M${xx+6} ${panelY+panelH-12}l${Math.max(5,cellW-14)} -17" stroke="${accent}" stroke-width="3" opacity=".83" fill="none"/>`;}
  }else{
    const n=3+((h>>>22)%3),cx=panelX+panelW/2,cy=panelY+panelH/2;
    cells=`<circle cx="${cx}" cy="${cy}" r="${Math.min(panelW,panelH)*.35}" fill="#122527" stroke="${accent}" stroke-width="3"/>`;
    for(let i=0;i<n;i++){let a=(i/n)*Math.PI*2;let px=cx+Math.cos(a)*panelW*.3,py=cy+Math.sin(a)*panelH*.3;cells+=`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="4" fill="${accent}"/>`;}
    cells+=`<path d="M${cx-15} ${cy}h30M${cx} ${cy-15}v30" stroke="${trim}" stroke-width="2"/>`;
  }
  let controls="";for(let i=0;i<buttonCount;i++)controls+=`<circle cx="${x+13+i*(11+s)}" cy="${yy+hh-12}" r="3" fill="${trim}" stroke="${dark}" stroke-width="1"/>`;
  return svgWrap(entry,layer,`<g transform="rotate(${tilt} ${q} ${yy+hh/2})">
<rect x="${panelX-5}" y="${panelY-5}" width="${panelW+10}" height="${panelH+10}" rx="${2+corner}" fill="#11181c" stroke="${trim}" stroke-width="3"/>
${cells}
${controls}
<path d="M${panelX-3} ${panelY-2}h${panelW+6}" stroke="#e4f2de" stroke-width="1" opacity=".16"/>
</g>`);
 }
 if(layer==="04-lid"){
  const lidX=q+(h%7),lidY=yy+12;
  const n=3+(h%5);let grill="";
  for(let i=0;i<n;i++){let xx=lidX+14+(i*7.8);grill+=`<path d="M${xx} ${lidY+10}l-8 ${hh-35}" fill="none" stroke="${trim}" stroke-width="${1.6+(i%3)}" opacity=".75"/>`;}
  let ornaments=(caporn%2===0)?`<circle cx="${max-17}" cy="${yy+hh-21}" r="${5+rx}" fill="${dark}" stroke="${trim}" stroke-width="2"/>`:`<path d="M${max-32} ${yy+hh-23}l9 -9 11 9 -9 8Z" fill="${trim}" stroke="${dark}" stroke-width="2"/>`;
  return svgWrap(entry,layer,`<g transform="rotate(${tilt} ${q} ${yy+hh/2})">
<path d="M${lidX} ${lidY}L${max-18} ${lidY-6} ${max+6} ${lidY+13} ${max-8} ${yy+hh-12} ${lidX-2} ${yy+hh-4}Z" fill="${base}" stroke="${trim}" stroke-width="4.5"/>
<path d="M${lidX+12} ${lidY+8}L${max-28} ${lidY+3} ${max-9} ${lidY+18} ${max-21} ${yy+hh-23} ${lidX+8} ${yy+hh-17}Z" fill="${dark}" stroke="#778785" stroke-width="2"/>
${grill}
${ornaments}
<circle cx="${lidX+8}" cy="${lidY+10}" r="4" fill="${trim}" stroke="#142122" stroke-width="2"/>
</g>`);
 }
 throw Error("unknown layer "+layer);
}
const original=JSON.parse(await readFile("app/game/data/clanWarGauntletCatalogV132.json","utf8")).catalog;
const candidates=original.filter(entry=>!KNOWN.has(entry.id));
const outRoot="public/game/assets/v136/gauntlets";
const check=process.argv.includes("--check");
const build=process.argv.includes("--build");
const target=path.resolve(process.argv.find(x=>x.startsWith("outputs/"))||"outputs/gauntlet-v136");
const manifest=[];
for(const entry of candidates){
 const dir=path.join(outRoot,entry.id);
 const pngs=[];
 if(build)await mkdir(dir,{recursive:true});
 if(!check)await mkdir(path.join(target,entry.id),{recursive:true});
 for(const key of KEYS){
   const src=geom(entry,key);const name=key+".svg";const file=path.join(dir,name);
   if(check){const disk=await readFile(file,"utf8");if(disk!==src)throw Error("Source drift: "+file);continue;}
   if(build)await writeFile(file,src);
   const buf=await sharp(Buffer.from(src)).resize(1080,580,{fit:"fill"}).png().toBuffer();
   await writeFile(path.join(target,entry.id,key+".png"),buf);
   pngs.push({input:buf,left:0,top:0});
 }
 if(!check){
  const comp=await sharp({create:{width:1080,height:580,channels:4,background:"#00000000"}}).composite(pngs).png().toBuffer();
  await writeFile(path.join(target,entry.id,"composite-open.png"),comp);
  manifest.push({id:entry.id,sourceUrl:entry.sourceUrl,evidence:entry.evidence,
    validation:"original-procedural-concept-not-film",files:KEYS.map(x=>x+".png"),
    compositeSha256:createHash("sha256").update(comp).digest("hex")});
 }
}
if(candidates.length!==49)throw Error("Expected 49 study models, got "+candidates.length);
if(!check){
 await writeFile(path.join(target,"manifest.json"),JSON.stringify({
  schema:136,modelCount:candidates.length,independentVectorSources:candidates.length*4,
  artisticallyValidatedOneToOne:0,manifest},null,2)+"\n");
}
console.log(check?"V136 sources checked: 49 original studies, 196 independent SVG layers":
  "V136 exported 196 PNG alpha layers + 49 composites (all UNAPPROVED concept art)");
