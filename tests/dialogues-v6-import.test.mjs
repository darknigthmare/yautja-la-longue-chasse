import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const data=JSON.parse(readFileSync(new URL("../app/game/data/dialoguesV6-first100.json",import.meta.url),"utf8"));
test("V6 Excel first-pass corpus contains exactly 100 distinct authored scenes",()=>{
 assert.equal(data.scenes.length,100);
 assert.equal(new Set(data.scenes.map(x=>x.id)).size,100);
 assert.ok(data.scenes.every(x=>x.title&&x.situation&&x.entry));
});
test("all imported dialogue lines and options reference real imported scenes",()=>{
 const ids=new Set(data.scenes.map(x=>x.id));
 assert.ok(data.lines.length>500);
 assert.ok(data.choices.length>150);
 assert.ok(data.lines.every(x=>ids.has(x.scene)&&x.id&&x.speaker&&x.text&&Number.isInteger(x.order)));
 assert.ok(data.choices.every(x=>ids.has(x.scene)&&x.id&&x.action));
});
test("first authored scene retains its original narrative, not a generic fallback",()=>{
 const s=data.scenes.find(x=>x.id==="D6-O1-M01");
 assert.equal(s.title,"La marche trop haute");
 assert.ok(data.lines.some(x=>x.scene===s.id&&x.speaker==="Varek"&&x.text.includes("anneau")));
 assert.ok(data.choices.some(x=>x.scene===s.id&&x.action.includes("Ruun")));
});
test("design choices do not include executable progression or auto-awarded rewards",()=>{
 assert.equal(data.scope,"first-100-scenes-design-only");
 assert.ok(data.choices.every(x=>!Object.hasOwn(x,"grantReward")&&!Object.hasOwn(x,"unlock")));
});
