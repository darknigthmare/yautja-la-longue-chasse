import {readFile,mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";

/** Production gate: a named film hunter is not proof of a unique wrist computer.
 * A rendered blockout is never counted as a 1:1 validated asset. */
const catalogue=JSON.parse(await readFile("app/game/data/clanWarGauntletCatalogV132.json","utf8")).catalog;
const known=["city-hunter","wolf","feral","dek"];
const accepted=new Set(["hero-closeup","design-studio","equipment-known","character-only","licensed-class"]);
const records=catalogue.map(entry=>{
  const pipeline=entry.id==="jungle-hunter"?"seven-independent-vector-layers":
    known.includes(entry.id)?"four-independent-vector-layers":"unverified-shared-placeholder";
  return {
    id:entry.id,name:entry.name,source:entry.source,sourceUrl:entry.sourceUrl,evidence:entry.evidence,
    gauntletDesignStatus:pipeline,
    individualFilmModel1to1Verified:false,
    cinematicFramesCompared:0,
    separatePngComplete:false,
    movementReviewed:false,
    releaseEligible:false,
    missing:[
      ...((pipeline==="seven-independent-vector-layers"||pipeline==="four-independent-vector-layers")?[]:["individual-per-character-silhouette"]),
      "canonical-film-frame-comparison","independent-textures","cinematic-material-patina",
      "full-pose-animation","human-art-review","license-review",
    ],
  };
});
const failures=[];
if(records.length!==54)failures.push("Expected 54 catalog records.");
for(const record of records){
  if(!accepted.has(record.evidence))failures.push("Unknown provenance "+record.id);
  if(!record.sourceUrl.startsWith("https://"))failures.push("No source URL "+record.id);
  if(record.individualFilmModel1to1Verified)
    failures.push("False 1:1 status "+record.id);
}
// The audit never credits art without the corresponding physical source files.
const jhParts=["01-arm.svg","02-housing.svg","03-display-glyphs.svg","04-hinge.svg","05-lid.svg","06-emitter.svg","07-beam.svg"];
const v135Parts=["01-forearm.svg","02-shell.svg","03-panel.svg","04-cover.svg"];
for(const model of ["jungle-hunter",...known]){
  const parts=model==="jungle-hunter"?jhParts:v135Parts;
  for(const item of parts){
    const root=model==="jungle-hunter"?"v134":"v135";
    const file=path.join("public/game/assets",root,"gauntlets",model,item);
    try {
      const xml=await readFile(file,"utf8");
      if(!xml.includes("<svg")||!xml.includes('viewBox="0 0 540 290"'))
        failures.push("Invalid authored SVG "+file);
    } catch {failures.push("Missing individual authored SVG "+file);}
  }
}
const output={
  schema:135,scope:"Yautja The Long Hunt — gauntlet production",
  artValidation:"unapproved",modelCount:records.length,
  summary:{independentVectorModels:5,blockoutOnly:5,placeholderOnly:49,oneToOneValidated:0},
  disclaimers:[
    "The Jungle Hunter seven-layer vector is a source-informed blockout, not a film-verified 1:1 recreation.",
    "City Hunter, Wolf, Feral and Dek have separately authored V135 vector blockouts, but remain unvalidated against film frames.",
    "The other 49 character variants still require individual artwork and dedicated wrist models.",
    "SVG/PNG exports and passing CI never imply artistic 1:1 or permission to distribute franchise IP commercially.",
  ],
  records,issues:failures,
};
const target=path.resolve(process.argv[2]||"outputs/gauntlet-v134");
await mkdir(target,{recursive:true});
await writeFile(path.join(target,"complete-manifest.json"),JSON.stringify(output,null,2)+"\n");
const hash=createHash("sha256").update(JSON.stringify(records)).digest("hex");
if(failures.length){console.error(failures.join("\n"));process.exitCode=1;}
else console.log("54 gauntlet statuses checked; SHA256 "+hash+"; 1:1 verified: 0 (art review pending)");
