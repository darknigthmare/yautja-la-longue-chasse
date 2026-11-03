import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ROOT='public/game/assets/clan-field-20261103';
const svgOnly=process.argv.includes('--svg-only');
const sharp=svgOnly?null:(await import('sharp')).default;
const defs=`<defs>
<linearGradient id="m" x2=".8" y2="1"><stop stop-color="#657c80"/><stop offset=".3" stop-color="#374e56"/><stop offset="1" stop-color="#12212b"/></linearGradient>
<linearGradient id="b" x2=".9" y2="1"><stop stop-color="#d3ae70"/><stop offset=".35" stop-color="#947046"/><stop offset="1" stop-color="#42362b"/></linearGradient>
<linearGradient id="t" x2=".8" y2="1"><stop stop-color="#91a19b"/><stop offset="1" stop-color="#3a5359"/></linearGradient>
<radialGradient id="l"><stop stop-color="#fff8c3"/><stop offset=".3" stop-color="#ffac51"/><stop offset="1" stop-color="#bc3525"/></radialGradient>
</defs>`;
const p=(a,f='url(#m)')=>`<polygon points="${a}" fill="${f}" stroke="#101d25" stroke-width="3" stroke-linejoin="round"/>`;
const ln=(x,y,u,v,c='#ad9a72',w=2)=>`<path d="M${x},${y}L${u},${v}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const lamp=(x,y,on,r=6)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${on?'url(#l)':'#273a43'}" stroke="#0c1d23" stroke-width="2"/>`;
const box=(x,y,w,d,h)=>p(`${x},${y} ${x+w},${y-w*.4} ${x+w},${y-w*.4+h} ${x},${y+h}`)+p(`${x+w},${y-w*.4} ${x+w+d},${y-w*.4+d*.42} ${x+w+d},${y-w*.4+d*.42+h} ${x+w},${y-w*.4+h}`,'#21343f')+p(`${x},${y} ${x+w},${y-w*.4} ${x+w+d},${y-w*.4+d*.42} ${x+d},${y+d*.42}`,'url(#t)');
const foot=(x,y,s=1)=>p(`${x},${y} ${x+s*32},${y+9} ${x+s*42},${y+24} ${x+s*7},${y+34} ${x-s*9},${y+21}`,'url(#b)');
const scratch=(x,y)=>ln(x,y,x+12,y-5,'#b1c2b6',1)+ln(x+4,y+5,x+13,y+2,'#738e8b',1);
const ribs=(x,y,n,dx,dy)=>Array.from({length:n},(_,i)=>ln(x+i*dx,y+i*dy,x+i*dx+14,y+i*dy+4,'#b4915b',3)).join('');
function relay(on){
 let s=foot(180,370,-1)+foot(302,358)+foot(241,403);
 s+=p('199,332 289,300 308,378 227,418 181,391')+box(167,213,111,67,142);
 s+=p('167,213 183,210 199,345 181,355','url(#b)')+p('278,169 290,174 305,326 289,332','url(#b)');
 s+=p('192,195 254,173 274,190 212,216','#07131a')+p('229,181 229,105 244,100 247,173','url(#b)');
 s+=p('231,116 206,92 206,66 217,63 220,87 239,103')+p('241,105 264,84 268,58 279,61 276,95 246,126');
 s+=p('184,240 245,220 254,294 194,315','#15252f');
 for(let i=0;i<3;i++)s+=lamp(205+i*13,259-i*5,on);
 return s+ribs(191,323,4,16,-6)+scratch(262,310)+scratch(201,360)+ln(314,212,323,316,'#738c89')+ln(325,217,333,313,'#536a6a');
}
function beacon(on){
 let s=foot(177,378,-1)+foot(301,374)+foot(230,405);
 s+=p('192,345 282,315 314,362 236,406 174,382');
 s+=p('218,348 214,167 244,153 258,337 239,361','url(#b)')+p('244,153 270,165 278,330 258,337','#21323a');
 for(let i=0;i<6;i++)s+=ln(220,197+i*23,249,187+i*23,'#26353c',6);
 s+=p('202,151 231,122 269,130 285,169 250,190 211,180');
 s+=p('220,138 237,135 248,168 229,173',on?'url(#l)':'#223a41')+p('246,133 259,138 273,165 255,174',on?'#e36b35':'#1b3038');
 s+=p('219,123 220,92 234,89 235,118')+p('258,127 265,93 278,98 269,132');
 return s+lamp(228,371,on)+scratch(253,352)+ln(190,359,220,349,'#a4aaa0');
}
function crate(open){
 let s=box(103,267,189,106,106);
 s+=p('107,280 127,275 133,361 113,369','url(#b)')+p('271,211 289,205 300,307 281,314','url(#b)')+p('324,237 342,244 349,338 330,344','url(#b)');
 s+=p('150,302 209,279 218,296 160,320','#101f27')+ln(155,306,206,287,'#7e8d8c',4)+ribs(148,340,6,19,-8)+scratch(129,329)+scratch(335,300);
 if(open){
 s+=p('113,262 289,192 389,234 207,306','#0b1720');
 for(let i=0;i<5;i++)s+=p(`${150+i*28},${251-i*10} ${163+i*28},${246-i*10} ${182+i*28},${267-i*10} ${170+i*28},${273-i*10}`,i%2?'#638079':'#6c6751');
 s+=p('113,263 123,134 300,70 289,192','url(#b)')+p('130,241 139,145 284,93 277,183','#15252f')+ln(141,159,280,108,'#596767',3)+ln(136,212,278,159,'#566361',3);
 }else{
 s+=p('101,261 291,185 401,231 209,308','url(#b)')+p('123,257 291,201 378,233 208,292')+p('161,244 279,207 301,215 181,254','#8b7753')+ln(215,278,353,232,'#8ca2a0',3)+scratch(236,239);
 }
 return s+lamp(248,298,true,5);
}
function barrier(damaged){
 let s=foot(139,356,-1)+foot(348,298);
 s+=p('109,218 151,171 349,120 398,169 377,322 163,405 122,365')+p('109,218 126,214 141,348 163,375 163,405 122,365','#202e35');
 s+=p('151,171 168,181 188,359 164,374 141,348 126,214','url(#b)')+p('331,125 349,120 367,165 345,329 323,338 344,170','url(#b)');
 s+=p('196,191 310,157 326,179 304,315 202,353 181,322','url(#t)')+p('209,207 296,181 303,196 287,286 216,311 203,293','#273f46');
 s+=ribs(213,329,5,20,-8)+lamp(203,182,true,5)+lamp(316,148,true,5)+scratch(239,250)+scratch(274,222)+scratch(156,250);
 if(damaged)s+=p('247,184 268,216 253,245 272,274 255,326 279,294 289,270 274,244 285,214 259,184','#091219')+ln(203,260,235,244,'#c1a06a',3)+ln(275,304,309,292,'#b89160',3)+p('126,218 144,224 140,264 129,255','#3e3029');
 return s;
}
function core(on){
 let s=p('168,330 250,298 343,342 257,392','url(#b)')+box(178,218,72,74,120);
 s+=p('178,218 181,127 244,99 252,189','url(#b)')+p('244,99 310,129 324,249 252,215');
 s+=p('194,148 232,131 240,286 205,301',on?'url(#l)':'#1b323e')+p('260,133 293,150 305,285 269,267',on?'#9d4828':'#1d3239');
 for(let i=0;i<4;i++)s+=ln(190+i*3,180+i*32,240+i*2,160+i*32,'#11242d',9);
 s+=p('178,128 244,99 310,129 251,155','url(#t)')+lamp(246,126,on,12);
 return s+ribs(211,337,4,20,-7)+scratch(278,309);
}
function medical(stocked){
 let s=box(127,280,154,91,80)+p('125,275 280,214 373,254 215,318','url(#b)')+p('148,274 279,232 348,257 215,300','#101f27');
 s+=p('127,275 128,166 282,108 280,214')+p('145,257 146,181 266,133 264,202','#15252f')+ln(158,197,255,160,'#91805b',4)+ln(155,220,255,180,'#697e7e',3);
 if(stocked)for(let i=0;i<4;i++)s+=p(`${173+i*27},${271-i*10} ${183+i*27},${266-i*10} ${199+i*27},${280-i*10} ${188+i*27},${286-i*10}`,'url(#t)')+lamp(184+i*27,275-i*10,true,3);
 return s+p('168,327 188,321 192,346 172,354','url(#b)')+p('292,283 310,290 314,325 295,320','url(#b)')+scratch(141,316)+lamp(245,311,stocked,5);
}
const ART=[
 ['relay-active','Relais actif','relay','active',relay(true)],['relay-disabled','Relais coupe','relay','disabled',relay(false)],
 ['beacon-active','Balise active','beacon','active',beacon(true)],['beacon-disabled','Balise eteinte','beacon','disabled',beacon(false)],
 ['supply-sealed','Caisse fermee','supply','sealed',crate(false)],['supply-open','Caisse ouverte','supply','open',crate(true)],
 ['barrier-intact','Barricade intacte','barrier','intact',barrier(false)],['barrier-damaged','Barricade endommagee','barrier','damaged',barrier(true)],
 ['core-active','Generateur actif','core','active',core(true)],['core-disabled','Generateur eteint','core','disabled',core(false)],
 ['medical-stocked','Mallette garnie','medical','stocked',medical(true)],['medical-empty','Mallette vide','medical','empty',medical(false)],
];
await mkdir(ROOT,{recursive:true});
const manifest={version:1,pack:'clan-field-20261103',method:'original-procedural-vector',canonFidelity:'NOT-CERTIFIED',camera:'orthographic-three-quarter',collisionChanges:false,entries:[]};
for(const [id,label,kind,state,body] of ART){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>${label}</title>${defs}<g>${body}</g></svg>`;
 await writeFile(`${ROOT}/${id}.svg`,svg);
 const files={svg:{path:`/game/assets/clan-field-20261103/${id}.svg`,sha256:createHash('sha256').update(svg).digest('hex')}};
 if(sharp)for(const [ext,size] of [['png',512],['webp',256]]){
  const location=`${ROOT}/${id}.${ext}`,pipeline=sharp(Buffer.from(svg)).resize(size,size).ensureAlpha();
  if(ext==='png')await pipeline.png({compressionLevel:9}).toFile(location);
  else await pipeline.webp({quality:88,alphaQuality:100}).toFile(location);
  const bytes=await readFile(location);files[ext]={path:`/game/assets/clan-field-20261103/${id}.${ext}`,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
 }
 manifest.entries.push({id,label,kind,state,sourceSize:[512,512],runtimeSize:[256,256],anchor:[.5,.8],files,fidelity:'original-not-canon-certified',nativeSingleObject:true,animationFrames:1});
}
await writeFile(`${ROOT}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(`Built ${ART.length} separate ${svgOnly?'SVG':'SVG + PNG + WebP'} sprites; no atlas, no poster cutting.`);
