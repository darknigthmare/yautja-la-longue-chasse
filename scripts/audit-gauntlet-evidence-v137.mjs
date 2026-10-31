/** V137 release evidence, not a visual-certification oracle.
 * Enumerates each physical SVG, hashes source, checks visible alpha raster
 * and emits a machine-readable audit consumable by Excel trackers. */
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve,join} from "node:path";
import sharp from "sharp";

const root=resolve("public/game/assets");
const out=resolve(process.argv.find(x=>x.startsWith("outputs/"))??"outputs/gauntlet-v137-evidence");
const catalogue=JSON.parse(await readFile("app/game/data/clanWarGauntletCatalogV132.json","utf8")).catalog;
const known=new Set(["city-hunter","wolf","feral","dek"]);
const jh=["01-arm.svg","02-housing.svg","03-display-glyphs.svg","04-hinge.svg","05-lid.svg","06-emitter.svg","07-beam.svg"];
const v135=["01-forearm.svg","02-shell.svg","03-panel.svg","04-cover.svg"];
const v136=["01-arm.svg","02-shell.svg","03-interface.svg","04-lid.svg"];
const sha256=data=>createHash("sha256").update(data).digest("hex");
function safeCsv(x){return '"'+String(x??"").replaceAll('"','""')+'"';}

const issues=[],models=[],layers=[];
for(const model of catalogue){
  const v=model.id==="jungle-hunter"?"v134":known.has(model.id)?"v135":"v136";
  const parts=v==="v134"?jh:v==="v135"?v135:v136;
  const artClass=v==="v136"?"original-noncanon-concept":"film-informed-vector-blockout";
  let partsWithVisibleAlpha=0;
  for(const name of parts){
    const rel=`game/assets/${v}/gauntlets/${model.id}/${name}`;
    const full=join(root,v,"gauntlets",model.id,name);
    let data;
    try{data=await readFile(full);}catch{issues.push("MISSING: "+rel);continue;}
    const xml=data.toString("utf8");
    if(!xml.includes('viewBox="0 0 540 290"')||!xml.includes("<svg"))issues.push("INVALID SVG: "+rel);
    if(v==="v136"&&!xml.includes("NOT a verified 1:1 film prop"))issues.push("MISLEADING V136 SOURCE: "+rel);
    let alphaMin=null,alphaMax=null,nonEmpty=false,svgWidth=null,svgHeight=null;
    try{
      const meta=await sharp(data).metadata();
      svgWidth=meta.width;svgHeight=meta.height;
      const stats=await sharp(data).resize({width:540,height:290}).ensureAlpha().stats();
      const a=stats.channels.at(-1);
      alphaMin=a?.min??null;alphaMax=a?.max??null;
      nonEmpty=!!(alphaMax>0);
      if(!nonEmpty)issues.push("EMPTY RASTER: "+rel);
      if(alphaMin!==0)issues.push("NO TRANSPARENT BACKGROUND: "+rel);
      if(meta.width!==540||meta.height!==290)issues.push("WRONG SOURCE SIZE: "+rel);
      if(nonEmpty && alphaMin===0)partsWithVisibleAlpha++;
    }catch(e){issues.push("RASTER ERROR: "+rel+" "+String(e));}
    layers.push({modelId:model.id,part:name,version:v,source:rel,sha256:sha256(data),
      bytes:data.length,svgWidth,svgHeight,alphaMin,alphaMax,alphaReady:nonEmpty&&alphaMin===0,
      designEvidence:artClass,oneToOneCertified:false});
  }
  models.push({id:model.id,name:model.name,source:model.source,sourceUrl:model.sourceUrl,
    evidenceGrade:model.evidence,artClass,sourceCount:parts.length,alphaReadyCount:partsWithVisibleAlpha,
    originalSourceFilesInRepo:partsWithVisibleAlpha===parts.length,
    individualOneToOneApproved:false,frameComparisonApproved:false,
    pending:["film-frame-reference-validation","geometry-scale-and-material-verification",
      "full-arm-and-lid-motion-capture","human-approval","franchise-rights-review"]});
}
if(catalogue.length!==54||models.length!==54)issues.push("Expected 54 distinct models");
if(new Set(catalogue.map(x=>x.id)).size!==54)issues.push("Duplicated catalog IDs");
if(layers.length!==219)issues.push("Expected 219 independently audited source layers");
if(models.filter(x=>x.artClass==="original-noncanon-concept").length!==49)issues.push("Expected 49 original-only models");
if(models.filter(x=>x.artClass==="film-informed-vector-blockout").length!==5)issues.push("Expected 5 source-informed models");
await mkdir(out,{recursive:true});
const payload={
  schema:137,sourceCommit:process.env.GITHUB_SHA??null,
  summary:{total:models.length,vectorLayers:layers.length,alphaReady:layers.filter(x=>x.alphaReady).length,
    sourceInformed:5,originalConcepts:49,oneToOneApproved:0},
  warning:"Technical SVG/alpha validity does not establish 1:1 visual fidelity, canonical geometry, rights or completed character rigging.",
  models,issues,
};
await writeFile(join(out,"model-evidence.json"),JSON.stringify(payload,null,2)+"\n");
const columns=["modelId","part","version","source","sha256","bytes","svgWidth","svgHeight","alphaMin","alphaMax","alphaReady","designEvidence","oneToOneCertified"];
const csv=[columns.join(","),...layers.map(x=>columns.map(c=>safeCsv(x[c])).join(","))].join("\r\n")+"\r\n";
await writeFile(join(out,"layer-evidence.csv"),csv);
console.log(JSON.stringify(payload.summary));
if(issues.length){console.error(issues.slice(0,35).join("\n"));process.exitCode=1;}
