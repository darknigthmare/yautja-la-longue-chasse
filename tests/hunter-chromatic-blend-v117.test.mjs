import test from "node:test";
import assert from "node:assert/strict";
import { chromaticOverlayStyleV113, CHROMATIC_PIGMENT_OVER_TEXTURE_V117 } from "../app/game/hunterChromaticsV113.ts";
import { chromaticCanvasSourceV113 } from "../app/game/hunterChromaticCanvasV113.ts";

test("V117 CSS: PNG and user pigment coexist under the original mask", () => {
  const style = chromaticOverlayStyleV113({
    outfitMaterialId: "phg-fine-net", outfitHex: "#aBc123",
  }, "outfit", "/game/rig/original.webp");
  assert.ok(style);
  assert.equal(style.maskImage, 'url("/game/rig/original.webp")');
  assert.equal(style.WebkitMaskImage, style.maskImage);
  assert.equal(style.backgroundColor, "transparent");
  assert.equal(style.backgroundImage,
    'linear-gradient(#abc12366, #abc12366), url("/game/assets/v113/phg/armor_filet_fin_noir_losanges.png")');
  assert.equal(CHROMATIC_PIGMENT_OVER_TEXTURE_V117, 0.4);
  assert.equal(style.opacity, .78);
});

test("V117 CSS: pure tint and pure material retain their preexisting behavior", () => {
  const color = chromaticOverlayStyleV113({skinHex:"#abcdef"}, "skin", "/a.webp");
  assert.equal(color.backgroundImage, "none");
  assert.equal(color.backgroundColor, "#abcdef");
  const texture = chromaticOverlayStyleV113({outfitMaterialId:"phg-fine-net"}, "outfit", "/n.webp");
  assert.equal(texture.backgroundImage, 'url("/game/assets/v113/phg/armor_filet_fin_noir_losanges.png")');
  assert.equal(texture.backgroundColor, "transparent");
});

test("V117 Canvas: live texture is drawn before tinted pigment with original alpha", () => {
  const originalImage = globalThis.Image;
  const originalDocument = globalThis.document;
  const rig = {tag:"rig"};
  const created=[];
  class LocalImage {
    naturalWidth=256; naturalHeight=384;
    set src(value){this._src=value;this.onload?.();}
    get src(){return this._src;}
  }
  globalThis.Image=LocalImage;
  globalThis.document={
    createElement(tag){
      assert.equal(tag,"canvas");
      const ops=[];
      const ctx={
        filter:"none",globalAlpha:1,globalCompositeOperation:"source-over",fillStyle:"",
        drawImage(img){ops.push({
          kind:img===rig?"rig":"png",
          blend:this.globalCompositeOperation,
          alpha:this.globalAlpha,
          filter:this.filter,
        });},
        fillRect(){ops.push({
          kind:"pigment",
          blend:this.globalCompositeOperation,
          alpha:this.globalAlpha,
          color:this.fillStyle,
        });},
      };
      const canvas={width:0,height:0,ops,getContext(){return ctx;}};
      created.push(canvas);
      return canvas;
    },
  };
  try{
    const palette={outfitMaterialId:"phg-fine-net",outfitHex:"#aBc123"};
    const first=chromaticCanvasSourceV113(rig,palette,"outfit",undefined,"brightness(.85)");
    assert.ok(first,"pigment is shown even while the PNG is loading");
    const ready=chromaticCanvasSourceV113(rig,palette,"outfit",undefined,"brightness(.85)");
    assert.ok(ready);
    assert.notEqual(ready,first,"ready texture invalidates the pending cache key");
    assert.deepEqual(ready.ops.map(item=>item.kind),["rig","png","pigment"]);
    assert.equal(ready.ops[0].filter,"brightness(.85)","morph tint survives");
    assert.equal(ready.ops[1].blend,"source-atop");
    assert.equal(ready.ops[2].blend,"source-atop","tint may not paint outside the rig");
    assert.equal(ready.ops[2].color,"#abc123");
    assert.equal(ready.ops[2].alpha,.78*CHROMATIC_PIGMENT_OVER_TEXTURE_V117);
    assert.equal(chromaticCanvasSourceV113(rig,palette,"outfit",undefined,"brightness(.85)"),ready,
      "unchanged material reuses its rendered cache");
  } finally{
    if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;
    if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  }
});
