import {readFile,mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";

/** Production gate: a named film hunter is not proof of a unique wrist computer.
 * A rendered blockout is never counted as a 1:1 validated asset. */
const catalogue=JSON.parse(await readFile("app/game/data/clanWarGauntletCatalogV132.json","utf8")).catalog;
const known=["jungle-hunter","city-hunter","feral","dek"];
const accepted=new Set(["hero-closeup","design-studio","equipment-known","character-only","licensed-class"]);
const records=catalogue.map(entry=>{
  const pipeline=entry.id==="jungle-hunter"?"seven-independent-vector-layers":
    known.includes(entry.id)?"single-vector-blockout":"unverified-shared-placeholder";
  return {
    id:entry.id,name:entry.name,source:entry.source,sourceUrl:entry.sourceUrl,evidence:entry.evidence,
    gauntletDesignStatus:pipeline,
    individualFilmModel1to1Verified:false,
    cinematicFramesCompared:0,
    separatePngComplete:false,
    movementReviewed:false,
    releaseEligible:false,
    missing:[
      ...(pipeline==="seven-independent-vector-layers"?[]:["individual-per-character-silhouette"]),
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
  if(record.gauntletDesignStatus!=="seven-independent-vector-layers"&&record.individualFilmModel1to1Verified)
    failures.push("False 1:1 status "+record.id);
}
const output={
  schema:134,scope:"Yautja The Long Hunt — gauntlet production",
  artValidation:"unapproved",modelCount:records.length,
  summary:{independentVectorModels:1,blockoutOnly:3,placeholderOnly:50,oneToOneValidated:0},
  disclaimers:[
    "The Jungle Hunter seven-layer vector is a source-informed blockout, not a film-verified 1:1 recreation.",
    "All other character entries require their own source photography and independently authored wrist model.",
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
