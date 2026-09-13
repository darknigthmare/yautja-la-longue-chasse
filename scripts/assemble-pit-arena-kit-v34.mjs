import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { buildPitArenaRuntimeData } from "./build-pit-arena-runtime-v33.mjs";

const arenaId=process.argv[2];
let selectedVariants={};try{selectedVariants=JSON.parse(await fs.readFile("art-source/v34/pit-arenas/selected-variants.json","utf8"));}catch(error){if(error.code!=="ENOENT")throw error;}
const briefs=JSON.parse(await fs.readFile("art-source/v34/pit-arenas/production-briefs.json","utf8")).kits;
let conceptBriefs=[];
try{conceptBriefs=JSON.parse(await fs.readFile("art-source/v34/pit-arenas/concept-wave-01-briefs.json","utf8")).kits;}catch(error){if(error.code!=="ENOENT")throw error;}
let wave02Briefs=[];
try{wave02Briefs=JSON.parse(await fs.readFile("art-source/v34/pit-arenas/concept-wave-02-briefs.json","utf8")).kits;}catch(error){if(error.code!=="ENOENT")throw error;}
const brief=[...briefs,...conceptBriefs,...wave02Briefs].find(kit=>kit.arenaId===arenaId);
assert(brief,"Unknown V34 arena");
const manifestPath="art-source/v33/pit-arenas/production-manifest.json";
const manifest=JSON.parse(await fs.readFile(manifestPath,"utf8"));
const stage=manifest.stages.find(stage=>stage.legacyRuntimeArenaId===arenaId||stage.catalogueId===arenaId);
assert(stage&&(stage.legacyRuntimeStatus==="playable"||stage.legacyRuntimeStatus==="concept"));
const concept=stage.legacyRuntimeStatus==="concept";
if(concept)assert.equal(stage.legacyRuntimeArenaId,null,"Concepts may not borrow a playable ID");
assert(!stage.runtimeEnabled,"Refusing to replace an already enabled kit");
const evidence=`docs/v34-${arenaId}-art-review.md`;
const boxes=[[-160,-100,1280,700],[-80,-50,380,520],[660,-50,380,520],[-70,60,310,370],[720,60,310,370],[315,100,330,328],[205,335,118,93],[637,335,118,93],[200,-18,60,225],[700,-18,60,225],[0,430,640,35],[0,454,1280,110],[-75,-20,180,500],[855,-20,180,500]];
if(arenaId==="canopy-causeway") boxes[5]=[160,318,640,110];
if(arenaId==="abyssal-bridge") boxes[5]=[170,265,620,163];
if(arenaId==="arena-014-cour-des-navigateurs"){boxes[5]=[330,78,300,300];boxes[6]=[420,365,120,63];}
if(arenaId==="arena-015-bastion-des-enforcers"){boxes[3]=[-115,130,400,300];boxes[4]=[675,130,400,300];boxes[8]=[155,-18,150,225];}
if(arenaId==="arena-018-observatoire-des-lunes"){boxes[9]=[685,-18,90,225];}
if(arenaId==="arena-019-porte-des-reserves"){boxes[5]=[260,80,440,348];}
const roles=["Profondeur atmosphérique","Repère éloigné gauche","Repère éloigné droit","Support architectural gauche","Support architectural droit","Structure centrale","Accessoire de sol gauche","Accessoire de sol droit","Luminaire suspendu gauche","Luminaire suspendu droit","Sol de contact","Façade du sol","Premier plan gauche","Premier plan droit"];
const receiptRows=[];
for(const plane of stage.planes){plane.assets=[];plane.subplanSpecification="proposed-original";if(plane.id==="P4")plane.nominalParallax=1;}
stage.assetDirectory=`/game/sprites/v34/pit-arenas/${arenaId}`;
for(const [index,spec] of brief.assets.entries()){
  const selectedId=selectedVariants[arenaId+"/"+spec.id]??spec.id;
  const receiptDirectory=`art-source/v34/pit-arenas/${arenaId}`;
  const receiptNames=(await fs.readdir(receiptDirectory)).filter(name=>name.startsWith(`receipt-${selectedId}-`)&&/[-][a-f0-9]{12}[.]json$/.test(name));
  assert.equal(receiptNames.length,1,`Exactly one immutable receipt required for ${selectedId}`);
  const receiptPath=`${receiptDirectory}/${receiptNames[0]}`;
  const check={...JSON.parse(await fs.readFile(receiptPath,"utf8")),evidence:receiptPath};
  assert.equal(check.accepted,true,spec.id);
  assert(check.publicPath&&check.evidence);
  const plane=stage.planes.find(p=>p.id===spec.id.slice(0,2).toUpperCase());
  const [x,y,width,height]=boxes[index];
  const ground=index>=3&&index<=7;
  const asset={id:spec.id,role:roles[index],contour:"Silhouette individuelle inspectée, marges/cadrage mesurés; aucun étirement.",alphaRequired:spec.alphaRequired,requiredForRuntime:true,
    mode:index===0?"cover":index===10?"repeat-x":index===11?"strip-x":"module",
    parallax:index===10||index===11?1:arenaId==="arena-014-cour-des-navigateurs"&&index===5?.43:plane.nominalParallax,opacity:index===1||index===2?.55:index>=3&&index<=5?.88:1,
    ...(ground?{anchorToGround:true}:{}),...(index===8||index===9||index>=12?{verticalAlign:"top"}:{}),
    ...(spec.floor?{sourceCrop:check.contactCrop}:{}),placements:[{x,y,width,height}],animation:null,
    frames:[{path:check.publicPath,status:"reviewed",generation:{generator:"openai-imagegen",source:check.evidence,sha256:check.sha256,width:check.width,height:check.height,hasAlpha:check.hasAlpha,contentBounds:check.contentBounds},review:{evidence,coherence:true,layout:true,alpha:true},integration:null}]};
  assert(!spec.floor||asset.sourceCrop,"Floor contact must have a measured opaque start row");
  plane.assets.push(asset);
  receiptRows.push(`| ${plane.id} | ${spec.id} | ${check.width}×${check.height} | ${check.hasAlpha?"alpha réel":"opaque prévu"} | ${check.sha256.slice(0,12)} |`);
}
for(const plane of stage.planes){assert(plane.assets.length);plane.status="reviewed";}
const doc=`# ${brief.name} — revue du kit V34\n\nProposition originale du projet, fondée sur le catalogue local et pitFirstEdition. La conversation détaillée manquante n'est pas présentée comme retrouvée.\n\nContexte : ${brief.setting}\n\nDirection visuelle : ${brief.palette}\n\nQuatorze images OpenAI intégrées à la chaîne de production, chacune générée seule et conservée sans retouche de pixels. Les prompts, originaux et SHA complets sont archivés sous art-source/v34/pit-arenas/${arenaId}. Les statuts reviewed concernent ici l'inspection des images individuelles et de leurs fenêtres de rendu ; le kit reste désactivé avant sa recette de composition.\n\n| Plan | Image distincte | Dimensions | Transparence | SHA court |\n|---|---|---|---|---|\n${receiptRows.join("\n")}\n\nLes ouvertures sont transparentes, les accessoires et luminaires ne sont pas imprimés dans le fond. Les supports proches sont ancrés verticalement au sol réel ; les objets suspendus sont alignés par leur sommet. Le sol de contact est au facteur 1, avec une première ligne opaque mesurée. Les avant-plans s'effacent devant un combattant. Les 14 dessins sont fixes : aucune animation nouvelle n'est annoncée pour ce kit.\n`;
await fs.writeFile(evidence,doc+(concept?"\nKit de production pour une entrée concept du catalogue. Il reste non jouable : aucune attribution de runtimeArenaId, aucune activation runtime. La recette utilise un étalon géométrique séparé du registre du jeu.\n":""));
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n");
await buildPitArenaRuntimeData();
console.log(JSON.stringify({arenaId,images:14,planes:6,status:"reviewed-preview",runtimeEnabled:false,evidence}));
