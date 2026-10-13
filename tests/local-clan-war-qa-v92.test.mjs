import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const pageSource = fs.readFileSync("app/clan-war-qa-v92/page.tsx", "utf8");
const clientSource = fs.readFileSync("app/clan-war-qa-v92/client.tsx", "utf8");
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function pageGate(env) {
  const exports = {}, missing = Error("404"), client = () => {};
  vm.runInNewContext(transpile(pageSource), { exports, process: { env }, require(name) {
    if (name === "next/navigation") return { notFound() { throw missing; } };
    if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
    if (name === "./client") return { default: client };
    throw Error(`Unexpected server import ${name}`);
  } });
  return { exports, missing, client };
}

test("clan workshop route requires exact server opt-in, rejects Vercel and rechecks before rendering", () => {
  assert.doesNotMatch(pageSource, /^["']use client["']/m);
  for (const flag of [undefined, "", "0", "true", " 1", "1 ", "yes"]) {
    const gate = pageGate({ YAUTJA_LOCAL_VISUAL_QA_V90: flag, NEXT_PUBLIC_YAUTJA_LOCAL_VISUAL_QA_V90: "1" });
    assert.throws(() => gate.exports.default({ searchParams: Promise.resolve({ enabled: "1", fixture: "stabilised" }), cookies: { enabled: true } }), error => error === gate.missing);
  }
  const env = { YAUTJA_LOCAL_VISUAL_QA_V90: "1", VERCEL: "1" }, gate = pageGate(env);
  assert.throws(() => gate.exports.default(), error => error === gate.missing);
  delete env.VERCEL;
  const allowed = gate.exports.default(); assert.strictEqual(allowed.type, gate.client); assert.equal(allowed.then, undefined);
  delete env.YAUTJA_LOCAL_VISUAL_QA_V90; assert.throws(() => gate.exports.default(), error => error === gate.missing);
  assert.equal(gate.exports.dynamic, "force-dynamic"); assert.equal(gate.exports.metadata.robots.index, false); assert.equal(gate.exports.metadata.robots.follow, false);
});

test("wrapper mounts only the exact workshop with the real bundled rules and no supplied state or callbacks", () => {
  const qa = homeworldSceneSsrV78(), client = qa.load("app/clan-war-qa-v92/client.tsx"), real = qa.load("app/game/ClanWarWorksV6.tsx").default;
  const rules = qa.load("app/game/systems/clanWarBibleV6.ts").DEFAULT_WAR_RULES_V6;
  const walk = value => Array.isArray(value) ? value.flatMap(walk) : value?.props ? [value, ...walk(value.props.children)] : [];
  const children = walk(client.default()).filter(node => typeof node.type === "function");
  assert.equal(children.length, 1); assert.strictEqual(children[0].type, real); assert.strictEqual(children[0].props.rules, rules);
  assert.deepEqual(Object.keys(children[0].props), ["rules"]);
  assert.doesNotMatch(clientSource, /localStorage|sessionStorage|fetch\(|GameClient|ClanWarBibleV6Panel|onSave|window\.|document\.|fixtures\.json|readFile|work-local|importWarWorksV87|parsePrivateWarRulesV6/);
});

test("actual React SSR exposes the live workshop, finite starting budget and physical checkpoint controls, without campaign UI", () => {
  const qa = homeworldSceneSsrV78(), html = qa.render("app/clan-war-qa-v92/client.tsx", {});
  assert.match(html, /data-local-clan-war-qa-v92="isolated-memory-only"/);
  assert.match(html, /data-clan-war-qa-renderer="ClanWarWorksV6"/);
  assert.match(html, /État en mémoire uniquement/); assert.match(html, /Aucune sauvegarde réelle/); assert.match(html, /Aucun carnet n’est injecté automatiquement/);
  assert.match(html, /Coller un JSON de reprise/); assert.match(html, /Préparer un nouvel exercice/); assert.match(html, /Reconnaître ici/);
  assert.match(html, /W3-S11/); assert.match(html, /Poste de soin/); assert.match(html, /W3-U18/); assert.match(html, /12 ouvrages/);
  assert.doesNotMatch(html, /data-campaign-menu|data-homeworld-actor=|data-local-solo-qa-v92|data-medical-patient=/);
});
