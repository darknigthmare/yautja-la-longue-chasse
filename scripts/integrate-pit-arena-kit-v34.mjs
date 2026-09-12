import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { buildPitArenaRuntimeData } from "./build-pit-arena-runtime-v33.mjs";
const arenaId=process.argv[2];
assert(/^[a-z0-9-]+$/.test(arenaId));
const proof=await fs.readFile(`work/v34/fullapp-qa/${arenaId}/browser-qa.json`);
const qa=JSON.parse(proof);
assert.equal(qa.passed,true);assert.equal(qa.surface,"full-application-play-pit-training");
assert.deepEqual(qa.errors,[]);assert.deepEqual(qa.failedRequests,[]);
assert.equal(qa.mobileNoOverflow,true);
const check=qa.checks.find(entry=>entry.arena===arenaId);
assert(check&&check.loadedImages===14&&check.subplans===14&&check.missing===0);
const file="art-source/v33/pit-arenas/production-manifest.json";
const manifest=JSON.parse(await fs.readFile(file,"utf8"));
const stage=manifest.stages.find(s=>s.legacyRuntimeArenaId===arenaId);
assert(stage?.runtimeEnabled);
const evidence=`docs/v34-${arenaId}-fullapp-qa.json`;
await fs.writeFile(evidence,proof,{flag:"wx"});
for(const plane of stage.planes){for(const asset of plane.assets)for(const frame of asset.frames){
  assert.equal(frame.status,"reviewed");assert(qa.loadedImageFiles.includes(frame.path));
  frame.status="integrated";frame.integration={evidence};
}plane.status="integrated";}
await fs.writeFile(file,JSON.stringify(manifest,null,2)+"\n");
await fs.appendFile(`docs/v34-${arenaId}-art-review.md`,`\n## Application complète\n\nLa recette ${evidence} valide les 14 images dans la sélection, l'entraînement, le combat, les déplacements et le cadrage mobile. Aucune image manquante ou erreur n'est remontée. Les 14 PNG passent au statut integrated sans ajouter de dessin ni de jouabilité conceptuelle au compteur.\n`);
await buildPitArenaRuntimeData();
console.log(JSON.stringify({arenaId,status:"integrated",images:14,evidence}));
