import test from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import {createRequire} from "node:module";
const bundle=await build({stdin:{contents:'export {FighterCard} from "./app/game/PitCanvas";export {createElement} from "react";export {renderToStaticMarkup} from "react-dom/server";',loader:"tsx",resolveDir:process.cwd()},bundle:true,write:false,platform:"node",format:"cjs",jsx:"automatic",loader:{".module.css":"empty"},logLevel:"silent"});
const evaluated={exports:{}};
new Function("require","module","exports",bundle.outputFiles[0].text)(createRequire(import.meta.url),evaluated,evaluated.exports);
const {FighterCard,createElement,renderToStaticMarkup}=evaluated.exports;
const card=(fighterId,side)=>renderToStaticMarkup(createElement(FighterCard,{fighterId,side}));
test("actual selection preserves four V23 plates and aims their right-hand cards toward the opponent",()=>{
 for(const id of ["jungle-hunter","city-hunter","berserker","wolf"]){
  const left=card(id,"GAUCHE"),right=card(id,"DROITE");
  assert.match(left,new RegExp("/v23/pit/fighters/"+id+"-key-art.webp"));
  assert.match(right,/data-native-facing="right"/);assert.match(right,/data-facing="left"/);
  assert.match(left,/data-facing="right"/);assert.doesNotMatch(right,/film-plates/);
 }
});
test("actual selection falls back to exact-ID V5 cutouts and preserves frontal illustrations",()=>{
 for(const id of ["scar","celtic","feral-hunter","falconer","kok-warlord"]){
  const right=card(id,"DROITE");assert.match(right,new RegExp("/film-plates/"+id+".png"));
  assert.match(right,/data-fighter-art="static-bitmap"/);
  assert.doesNotMatch(right,/Image à produire/);
  if(["feral-hunter","kok-warlord"].includes(id)){assert.match(right,/data-native-facing="neutral"/);assert.match(right,/data-facing="neutral"/);}
  else assert.match(right,/data-facing="left"/);
 }
});
test("missing selection illustration is explicitly pending and never impersonates another fighter",()=>{
 const html=card("scarface","DROITE");assert.match(html,/data-fighter-art="mask-glyph"/);
 assert.match(html,/Image à produire/);assert.doesNotMatch(html,/<img/);
});
