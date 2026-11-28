import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const bundle = await build({
  stdin: {
    contents: [
      'export * from "./app/game/systems/yautjaTranslationV67";',
      'export { default as Translation } from "./app/game/YautjaTranslationV67";',
      'export { default as Glossary } from "./app/game/YautjaGlossaryV147";',
    ].join("\n"),
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  outfile: "translation-test.cjs",
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  external: ["react", "react/jsx-runtime"],
  logLevel: "silent",
});
const evaluated = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  createRequire(import.meta.url), evaluated, evaluated.exports,
);
const api = evaluated.exports;
const renderReading = props => renderToStaticMarkup(React.createElement(api.Translation, props));

test("only exact recensed film lines receive their recorded transcription", () => {
  assert.deepEqual(api.readYautjaV67(" « Je ne suis la proie de personne ! » "),
    { kind: "line", ids: ["ngu-djei-chish"] });
  assert.deepEqual(api.readYautjaV67("Le joueur dit : « Je ne suis la proie de personne. »"),
    { kind: "terms", ids: [] });
  assert.deepEqual(api.readYautjaV67("Je ne suis pas une proie."), { kind: "terms", ids: [] });
});

test("classic French references select whole lexical concepts once", () => {
  assert.deepEqual(api.readYautjaV67("Xénomorphe, xénomorphes et aire d’entraînement.").ids,
    ["kainde-amedha", "kehrite"]);
  assert.deepEqual(api.readYautjaV67("Xénomorphisé avec sang-froid, sans déshonneur.").ids, []);
  assert.deepEqual(api.readYautjaV67("Bad Blood. Honneur. Sang.").ids, ["ic-jit", "yin-tekai", "thwei"]);
});

test("generic dialogue keeps its French, Unicode and normal controls without writing symbols", () => {
  const text = "Le maître dit : « Écoute. » 👩🏽‍🚀";
  const html = renderReading({ text, paused: true, showSkip: true });
  assert.match(html, /lang="fr">Le maître dit : « Écoute\. » 👩🏽‍🚀<\/span>/);
  assert.match(html, /data-translation-complete="true"/);
  assert.match(html, /data-translation-paused="true"/);
  assert.doesNotMatch(html, /<svg|x-yautja|data-translation-skip|aria-live|autoFocus|autofocus/);
  assert.equal(renderReading({ text: "" }), "");
});

test("SSR renders a real reading in Latin alongside the full French sentence", () => {
  const html = renderReading({ text: "Le xénomorphe protège le passage." });
  assert.match(html, /lang="fr">Le xénomorphe protège le passage\.<\/span>/);
  assert.match(html, /data-yautja-reading="terms"/);
  assert.match(html, /lang="x-yautja" data-yautja-term="kainde-amedha" data-yautja-evidence="classic-reference"[^>]+>Kainde Amedha<\/span>/);
  assert.doesNotMatch(html, /<svg|<button/);
  const film = renderReading({ text: "Tueur de tueurs" });
  assert.match(film, /data-yautja-reading="line"/);
  assert.match(film, /data-yautja-evidence="screen-transcription"/);
});

test("direct creator sources, reported transcriptions and the classic lexicon remain distinct", () => {
  const html = renderToStaticMarkup(React.createElement(api.Glossary));
  assert.match(html, /data-yautja-evidence="creator"/);
  assert.match(html, /data-yautja-evidence="screen-transcription"/);
  assert.match(html, /data-yautja-evidence="classic-reference"/);
  assert.match(html, /Archive de la Bible de campagne/);
  assert.doesNotMatch(html, />Canon</);
  assert.deepEqual(api.searchYautjaLexiconV67("Yin’tekai").map(([id]) => id), ["yin-tekai"]);
  assert.deepEqual(api.searchYautjaLexiconV67("mépris").map(([id]) => id), ["wul"]);
  assert.deepEqual(api.searchYautjaLexiconV67("respect").map(([id]) => id), ["dau"]);
});
