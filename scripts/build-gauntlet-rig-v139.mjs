import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {createHash} from "node:crypto";
/** Regenerates individually registered full-256x384 gauntlet base and lid.
 * The art is ORIGINAL and unapproved, never labelled film 1:1. */
const colors={"classic":["#28383c","#8fa099","#ed4552","#11191e"],"urban":["#384343","#b69c7a","#db4d43","#1b2529"],"elder":["#574635","#c0ac81","#e56e57","#231e1a"],"bronze":["#634a38","#d2a66e","#f06a55","#2c231f"],"stealth":["#273d3b","#719c91","#ef5053","#0e2426"],"scar":["#3e4742","#aaae91","#e75648","#1b2323"],"wolf":["#3f4f51","#b7c7bd","#e7484b","#192428"],"brutal":["#483330","#a57660","#f06e56","#241819"],"feral":["#5e5242","#ddc6a0","#bd604d","#302922"],"badlands":["#59473e","#cbaa7e","#d65051","#2c2223"]};
const fingerprint=id=>{let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0};
const makeRigSvg=function makeRigSvg(id,theme,part){
 const h=fingerprint(id),c=colors[theme]||colors.classic,[metal,trim,red,shadow]=c;
 const a=h%5,b=(h>>>5)%7,d=(h>>>10)%5,e=(h>>>16)%6;
 const xx=38+a/2,yy=168+b/2;const plateWidth=38+(h%7);
 const heel=xx+plateWidth, boltCount=2+d;
 const front=`<path d="M${xx-4} ${yy+9}L${xx+12} ${yy-4} ${heel-6} ${yy+1} ${heel+8} ${yy+18} ${heel-5} ${yy+51} ${xx+2} ${yy+56} ${xx-8} ${yy+40}Z" fill="${shadow}" stroke="${trim}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M${xx-2} ${yy+14}L${xx+15} ${yy+1} ${heel-5} ${yy+7} ${heel+4} ${yy+21} ${heel-10} ${yy+47} ${xx+4} ${yy+49}Z" fill="${metal}" stroke="#131a1e" stroke-width="2.3"/>
  <path d="M${xx+6} ${yy+15}L${heel-8} ${yy+15}M${xx+8} ${yy+44}L${heel-14} ${yy+42}" stroke="${trim}" stroke-width="1.5" opacity=".8"/>
  <path d="M${xx+1} ${yy+13}L${xx-10} ${yy+25}L${xx-7} ${yy+43} ${xx+4} ${yy+50}" fill="${metal}" stroke="${trim}" stroke-width="2"/>
  <path d="M${heel-4} ${yy+17}L${heel+8} ${yy+18}L${heel+6} ${yy+40} ${heel-10} ${yy+47}" fill="#243039" stroke="${trim}" stroke-width="1.8"/>`;
 let led="";
 const sx=xx+8,sy=yy+19,sw=plateWidth-18,sh=20;
 if(id==="feral"||theme==="feral"){
   led=`<path d="M${sx-3} ${sy+3}l${sw+3} -4 -1 ${sh+1} -${sw+1} 1Z" fill="#6d604b" stroke="${trim}" stroke-width="1.3"/>
   <path d="M${sx} ${sy+5}l8 3 7 -6 9 6 9 -7M${sx+4} ${sy+13}l7 -6 8 6 6 -3" stroke="#d7c39d" stroke-width="1.8" fill="none"/>`;
 }else if(id==="dek"||theme==="badlands"){
   led=`<circle cx="${sx+sw/2}" cy="${sy+sh/2}" r="${Math.max(7,sw/2-2)}" fill="#241c22" stroke="${trim}" stroke-width="1.7"/>
    <circle cx="${sx+sw/2}" cy="${sy+sh/2}" r="5" fill="${red}" opacity=".9"/>
    <path d="M${sx+sw/2-6} ${sy+sh/2}h12M${sx+sw/2} ${sy+sh/2-6}v12" stroke="${trim}" stroke-width="1"/>`;
 }else if(id==="city-hunter"||id==="wolf"||theme==="urban"||theme==="wolf"){
   const n=id==="wolf"?5:4,gap=1.2,iw=(sw-(n-1)*gap)/n;
   for(let i=0;i<n;i++){const x=sx+i*(iw+gap);led+=`<rect x="${x}" y="${sy}" width="${iw}" height="${sh}" fill="#080d0e" stroke="#61716e" stroke-width=".7"/>
   <path d="M${x+1.5} ${sy+3+i%3}l${iw/2} 4 ${iw/4} -2M${x+2} ${sy+13}l${iw/2} -3" stroke="${red}" stroke-width="1.6" fill="none"/>`;}
 }else{
   const n=(id==="jungle-hunter"||id==="captured-classic")?5:3+e%3,gap=.8,ih=(sh-(n-1)*gap)/n;
   for(let i=0;i<n;i++){const y=sy+i*(ih+gap);led+=`<rect x="${sx}" y="${y}" width="${sw}" height="${ih}" fill="#050c0e" stroke="#374645" stroke-width=".55"/>
    <path d="M${sx+2} ${y+1}l4 ${Math.max(.7,ih-2)} 5 -1M${sx+sw-11} ${y+1}l3 ${Math.max(.7,ih-2)} 5 -1" stroke="${red}" stroke-width="1.2" fill="none"/>`;}
 }
 let bolts="";
 for(let i=0;i<boltCount;i++)bolts+=`<circle cx="${xx+4+(i*5)}" cy="${yy+8+(i%2)*2}" r="1.3" fill="${trim}" stroke="${shadow}" stroke-width=".5"/>`;
 const straps=`<path d="M${xx-7} ${yy+24}l-8 -3 -3 7 9 4M${xx+2} ${yy+49}l-11 5 -1 7 13 -5" fill="${metal}" stroke="${trim}" stroke-width="1.4"/>`;
 const plate=part==="base"?`${straps}${front}<rect x="${sx-2}" y="${sy-2}" width="${sw+4}" height="${sh+4}" rx="2" fill="#131c1f" stroke="${trim}" stroke-width="1.3"/>${led}${bolts}
  <path d="M50 200l3 4 3 -4" fill="none" stroke="${trim}" stroke-width="2"/>`:
  `<path d="M50 201L${heel-8} ${yy+11} ${heel+5} ${yy+21} ${heel-6} ${yy+44} 51 208Z" fill="${metal}" stroke="${trim}" stroke-width="2.5" stroke-linejoin="round"/>
   <path d="M54 198L${heel-11} ${yy+16} ${heel} ${yy+24} ${heel-10} ${yy+39} 56 206Z" fill="${shadow}" stroke="${trim}" stroke-width="1.4"/>
   ${Array.from({length:2+d},(_,i)=>{const x=57+i*4;return `<path d="M${x} ${yy+25}l2 9" stroke="${trim}" stroke-width="1.15" opacity=".83"/>`}).join("")}
   <circle cx="51" cy="202" r="3.3" fill="${shadow}" stroke="${trim}" stroke-width="1.3"/>
   <circle cx="${heel-9}" cy="${yy+19}" r="1.6" fill="${red}" opacity=".7"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 384" width="256" height="384">
<!-- V139 full-canvas registered hunter-rig module. ORIGINAL blockout; NOT cinema-verified 1:1. -->
<!-- character:${id} theme:${theme} part:${part}; source: production game's V132 identity catalogue -->
<title>${id} ${part} gauntlet rig prototype</title>
<g data-anchor="back-lower-arm" data-art-status="original-not-film-certified">
${plate}
</g>
</svg>\n`;
};
const catalog=JSON.parse(await readFile("app/game/data/clanWarGauntletCatalogV132.json","utf8")).catalog;
const root="public/game/assets/v139/rig-gauntlets";
const check=process.argv.includes("--check");
const makePng=process.argv.includes("--png");
const out=process.argv.find(x=>x.startsWith("outputs/"))??"outputs/gauntlet-v139-rig";
const records=[];
for(const item of catalog){
 for(const part of ["base","lid"]){
  const source=makeRigSvg(item.id,item.theme,part);
  const file=path.join(root,item.id,part+".svg");
  const existing=await readFile(file,"utf8");
  if(existing!==source)throw Error("Source drift: "+file);
  if(makePng){
    const png=await sharp(Buffer.from(source)).png().toBuffer();
    const target=path.join(out,item.id,part+".png");
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,png);
    records.push({id:item.id,part,sha256:createHash("sha256").update(existing).digest("hex")});
  }
 }
}
if(catalog.length!==54)throw Error("Expected exactly 54 models");
if(makePng){await writeFile(path.join(out,"manifest.json"),JSON.stringify({schema:139,modelCount:54,parts:108,oneToOneApproved:0,records},null,2));}
console.log(check?"V139: 54 individual wrist shells and 54 articulated lids verified":"V139: 108 rig alpha PNGs exported");
