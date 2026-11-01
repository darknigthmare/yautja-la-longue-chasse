import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";

const built=await build({stdin:{contents:`
export {default as Guide} from "./HuntFieldGuideV112";
export {DEFAULT_CONTROL_BINDINGS} from "./systems/controlBindings";
export {DEFAULT_HUNT_GAMEPAD_V112,normalizeHuntAccessibilityV112,rebindHuntGamepadV112} from "./systems/huntAccessibilityV112";
`,resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),loader:"tsx"},
  bundle:true,write:false,platform:"node",format:"cjs",jsx:"automatic",
  loader:{".module.css":"empty"},external:["react","react/jsx-runtime"],logLevel:"silent"});
const module={exports:{}};
runInNewContext(built.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url)});
const api=module.exports;
const defaults={bindings:api.DEFAULT_CONTROL_BINDINGS,phase:"tracking",climbing:false,grounded:true,stamina:100,corpseNearby:false};
const render=patch=>renderToStaticMarkup(createElement(api.Guide,{...defaults,...patch}));
const cue=html=>html.match(/<p data-guide-cue-v112[^>]*>([\s\S]*?)<\/p>/)?.[1];
const preflight=html=>html.match(/<div data-guide-preparation-v112[^>]*>([\s\S]*?)<\/div>/)?.[1];

test("a grounded beginner sees the currently assigned grip action and a ground fallback before opening help",()=>{
  const bindings={...api.DEFAULT_CONTROL_BINDINGS,"hunt.moveUp":["F1"]};
  assert.match(cue(render({bindings})),/Haut \(F1\)/);
  assert.match(cue(render({bindings})),/route au sol reste possible/);
  assert.doesNotMatch(cue(render({bindings})),/Z \/ ↑/);
});
test("an airborne exhausted grip takes priority over a nearby corpse and the trophy objective",()=>{
  for(const phase of ["tracking","trophy","extraction"]){
    const text=cue(render({phase,grounded:false,gripExhausted:true,corpseNearby:true}));
    assert.match(text,/Prise épuisée/);assert.match(text,/atterris au sol ou sur une plateforme/);
    assert.doesNotMatch(text,/Interagir seul|puis interagis/);
  }
  assert.doesNotMatch(cue(render({grounded:true,gripExhausted:true})),/Prise épuisée/);
});
test("in-flight and attached help offer appropriate movement recovery without a remote corpse interaction",()=>{
  const flight=cue(render({grounded:false,corpseNearby:true}));
  assert.match(flight,/En vol/);assert.match(flight,/réception/);assert.doesNotMatch(flight,/Examiner/);
  const attached=cue(render({grounded:false,climbing:true}));
  assert.match(attached,/direction pour pomper/);assert.match(attached,/pour la longueur/);assert.match(attached,/pour lâcher/);
});
test("keyboard and controller remaps reach both immediate objective cues and the full help",()=>{
  const bindings={...api.DEFAULT_CONTROL_BINDINGS,"hunt.moveUp":["F1"],"hunt.moveDown":["F2"],"hunt.jump":["F3"],"hunt.interact":["F4"]};
  let settings=api.normalizeHuntAccessibilityV112(undefined);
  settings=api.rebindHuntGamepadV112(settings,"jump",2);
  settings=api.rebindHuntGamepadV112(settings,"interact",3);
  const html=render({bindings,gamepadButtons:settings.gamepadButtons,phase:"extraction"});
  assert.match(cue(html),/F4 \/ Y \/ Triangle/);
  for(const key of ["F1","F2","F3","F4"])assert.ok(html.includes(key),key);
  assert.ok(html.includes("X / Carré"));assert.doesNotMatch(html,/Espace/);
});
test("nearby-body help exposes pointer and keyboard access separately from direct trophy collection",()=>{
  const text=cue(render({corpseNearby:true}));
  assert.match(text,/Examiner la proie vaincue/);assert.match(text,/clavier ou au toucher/);
  assert.match(text,/Bas \+ B \/ Rond/);assert.match(text,/Interagir seul/);
});
test("actual missing tool, worn tool, and both capacity dimensions are visible before a body gesture",()=>{
  const load={massKg:24,volumeUnits:8,capacityMassKg:24,capacityVolumeUnits:18};
  const missing=preflight(render({corpseNearby:true,toolOwned:false,fieldLoad:load}));
  assert.match(missing,/Flaying Tool absent/);assert.match(missing,/armurerie/);assert.match(missing,/24\.0 \/ 24 kg/);assert.match(missing,/8\.0 \/ 18 volumes/);
  assert.match(missing,/Sac plein/);assert.match(missing,/partie refusée reste sur le corps/);
  const worn=preflight(render({corpseNearby:true,toolOwned:true,toolCondition:0,fieldLoad:{...load,massKg:2,volumeUnits:18}}));
  assert.match(worn,/état 0\/100/);assert.match(worn,/durée de travail ×1\.65/);
  assert.match(worn,/reste utilisable/);assert.match(worn,/affûtage au poste est gratuit/);assert.match(worn,/Sac plein/);
  const sharp=preflight(render({corpseNearby:true,toolOwned:true,toolCondition:100,fieldLoad:{...load,massKg:2,volumeUnits:1}}));
  assert.match(sharp,/durée de travail ×1\.00/);assert.doesNotMatch(sharp,/Sac plein/);
  assert.equal(preflight(render({corpseNearby:false,toolOwned:false,fieldLoad:load})),undefined);
});
test("the body-to-workshop sequence names irreversible stock, carrying limits, dropped items and four manual stages",()=>{
  const html=render({corpseNearby:true,toolOwned:true,toolCondition:40});
  assert.ok(html.indexOf("Analyse avant le premier prélèvement")<html.indexOf("Préparer une partie."));
  assert.match(html,/parties dépendent de l’espèce et ne repoussent pas/);
  assert.match(html,/un saut, une prise ou le combat le déposent/);
  assert.match(html,/suspension déplace le même corps/);
  assert.match(html,/reprends celles que tu veux rapporter avant l’extraction/);
  assert.match(html,/nettoie, traite, sèche puis monte/);
  assert.match(html,/après confirmation de sauvegarde, jamais pendant l’absence/);
  assert.match(html,/un abandon ne rapporte pas les prises/);
});
test("expanded help keeps native disclosure and distinct cancellation, preparation and extraction semantics",()=>{
  const html=render({});
  assert.match(html,/<aside[^>]*aria-label="Guide de terrain"/);
  assert.match(html,/<p data-guide-cue-v112[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
  assert.match(html,/<details><summary>Apprendre les gestes et annulations<\/summary>/);
  assert.doesNotMatch(html,/<details open/);
  assert.equal((html.match(/<li>/g)||[]).length,11);
  assert.match(html,/corps est la proie vaincue/);assert.match(html,/ne crée pas un trophée/);
  assert.match(html,/Fermer le menu interrompt/);assert.match(html,/Annuler le prélèvement/);
  assert.match(html,/Le temps et les ennemis continuent/);
});
