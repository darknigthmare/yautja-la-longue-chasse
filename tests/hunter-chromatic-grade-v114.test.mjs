import test from "node:test";
import assert from "node:assert/strict";
import { chromaticCanvasSourceV113 } from "../app/game/hunterChromaticCanvasV113.ts";

test("V114 keeps source color grading before adding a cosmetic tint", () => {
  const before = globalThis.document;
  const calls = [];
  let created = 0;
  globalThis.document = {
    createElement(kind) {
      assert.equal(kind, "canvas");
      created++;
      const ctx = {
        filter: "none", globalAlpha: 1, globalCompositeOperation: "source-over",
        drawImage() { calls.push({type:"draw", filter:this.filter, mode:this.globalCompositeOperation}); },
        fillRect() { calls.push({type:"tint", filter:this.filter, mode:this.globalCompositeOperation}); },
      };
      return {width:0,height:0,getContext:()=>ctx};
    },
  };
  try {
    const source = {};
    const a = chromaticCanvasSourceV113(source,{skinHex:"#ff99aa"},"skin",undefined,"grayscale(0.4)");
    assert.ok(a);
    assert.deepEqual(calls.map(c=>c.type),["draw","tint"]);
    assert.deepEqual(calls[0],{type:"draw",filter:"grayscale(0.4)",mode:"source-over"});
    assert.deepEqual(calls[1],{type:"tint",filter:"none",mode:"source-atop"});
    assert.strictEqual(chromaticCanvasSourceV113(source,{skinHex:"#ff99aa"},"skin",undefined,"grayscale(0.4)"),a);
    assert.equal(created,1);
    const differentGrade=chromaticCanvasSourceV113(source,{skinHex:"#ff99aa"},"skin",undefined,"contrast(1.2)");
    assert.notStrictEqual(differentGrade,a);
    assert.equal(created,2,"base filter is part of the cache identity");
  } finally {
    if (before === undefined) delete globalThis.document;
    else globalThis.document = before;
  }
});

test("no custom channel does not construct a Canvas",()=>{
  assert.equal(chromaticCanvasSourceV113({},undefined,"armor",undefined,"saturate(1.3)"),null);
});
