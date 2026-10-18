import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8"));
const files=["first100","101-200","201-300","301-400","401-500","501-600","601-700","701-733"];
const chunks=files.map(x=>read("../app/game/data/dialoguesV6-"+x+".json"));
const index=read("../app/game/data/dialoguesV6-index.json");
const scenes=chunks.flatMap(x=>x.scenes),lines=chunks.flatMap(x=>x.lines),choices=chunks.flatMap(x=>x.choices);
test("Excel V6 scene corpus is complete and uniquely keyed",()=>{
 assert.equal(scenes.length,733);assert.equal(lines.length,6059);assert.equal(choices.length,1494);
 assert.equal(new Set(scenes.map(x=>x.id)).size,scenes.length);
 assert.equal(new Set(lines.map(x=>x.id)).size,lines.length);
 assert.equal(new Set(choices.map(x=>x.id)).size,choices.length);
});
test("all dialogue and choice references point to imported scenes",()=>{
 const ids=new Set(scenes.map(x=>x.id));
 assert.ok(lines.every(x=>ids.has(x.scene)&&x.speaker&&x.text&&Number.isInteger(x.order)));
 assert.ok(choices.every(x=>ids.has(x.scene)&&x.action&&x.id));
});
test("lazy-loading index matches every authored scene and correct chunk",()=>{
 assert.equal(index.scenes.length,scenes.length);
 for(let i=0;i<scenes.length;i++){
  assert.equal(index.scenes[i].id,scenes[i].id);
  assert.equal(index.scenes[i].title,scenes[i].title);
  assert.equal(index.scenes[i].chunk,Math.floor(i/100));
 }
});
test("authored first scene is not replaced by a generic fallback",()=>{
 const s=scenes.find(x=>x.id==="D6-O1-M01");
 assert.equal(s.title,"La marche trop haute");
 assert.ok(lines.some(x=>x.scene===s.id&&x.speaker==="Varek"&&x.text.includes("anneau")));
 assert.ok(choices.some(x=>x.scene===s.id&&x.action.includes("Ruun")));
});
test("design records do not grant campaign rewards",()=>{
 assert.ok(chunks.every(x=>x.scope.includes("design-only")));
 assert.ok(choices.every(x=>!Object.hasOwn(x,"grantReward")&&!Object.hasOwn(x,"unlock")));
});
