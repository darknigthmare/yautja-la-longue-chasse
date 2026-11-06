import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = relative => readFileSync(root + relative, "utf8");

// Verbatim extract of the campaign bible (branch claude/bible-de-campagne,
// commit 723c97b): the bible is not part of this branch.
const FIXTURE = "tests/fixtures/bible-langue-yautja-723c97b.md";
const extract = read(FIXTURE);

const bundle = build({
  stdin: { contents: 'export * from "./app/game/yautjaLanguageV147.ts";', resolveDir: root, loader: "ts" },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false, logLevel: "silent",
}).then(result => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));

/** Rows of the "Extrait du vocabulaire canon à utiliser" table, as written. */
function bibleTableRows(markdown) {
  const start = markdown.indexOf("**Extrait du vocabulaire canon à utiliser :**");
  assert.ok(start >= 0, "canon vocabulary table not found");
  const lines = markdown.slice(start).split("\n");
  const header = lines.findIndex(line => line.startsWith("| Mot | Sens | Usage dans le jeu |"));
  const rows = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith("|")) break;
    rows.push(line.slice(1, -1).split(" | ").map(cell => cell.trim()));
  }
  return rows;
}

test("V147 the extract still matches the bible when the bible is available", t => {
  const candidates = [process.env.YAUTJA_BIBLE_PATH, root + "docs/campagne/BIBLE_DE_CAMPAGNE.md"].filter(Boolean);
  const bible = candidates.find(path => existsSync(path));
  if (!bible) { t.skip("bible absente de cette extraction : définir YAUTJA_BIBLE_PATH"); return; }
  const text = readFileSync(bible, "utf8");
  for (const line of extract.split("\n").slice(1).filter(Boolean)) {
    assert.ok(text.includes(line), `ligne absente de la bible : ${line.slice(0, 80)}`);
  }
});

test("V147 every table row is in the module word for word, in order, nothing added", async () => {
  const m = await bundle;
  const rows = bibleTableRows(extract);
  assert.equal(rows.length, 14);
  const fromTable = m.YAUTJA_WORDS_V147.filter(entry => entry.origin === "Extrait du vocabulaire canon à utiliser");
  assert.deepEqual(fromTable.map(entry => [entry.word, entry.meaning, entry.usage]), rows);
  const others = m.YAUTJA_WORDS_V147.filter(entry => !fromTable.includes(entry));
  assert.deepEqual(others.map(entry => entry.word), ["Kaail"]);
  assert.ok(extract.includes("porte un mot canon (*Kaail*, « rage »)"));
  assert.equal(others[0].meaning, "rage");
  assert.equal(others[0].usage, null);
});

test("V147 status and source are those the bible gives", async () => {
  const m = await bundle;
  assert.ok(extract.includes("Source : [dictionnaire yautja, AvP Central](https://www.avpcentral.com/yautja-dictionary-vocabulary-of-predators)."));
  for (const entry of m.YAUTJA_WORDS_V147) {
    assert.equal(entry.status, "canon", entry.word); // the bible lists no « proposé » word yet
    assert.equal(entry.source.label, "dictionnaire yautja, AvP Central");
    assert.equal(entry.source.url, "https://www.avpcentral.com/yautja-dictionary-vocabulary-of-predators");
    const work = entry.meaning.match(/\(\*([^*]+)\*\)$/)?.[1] ?? null;
    assert.equal(entry.source.work, work, entry.word);
    for (const note of entry.bibleNotes) assert.ok(extract.includes(note.quote), note.quote);
  }
  assert.equal(new Set(m.YAUTJA_WORDS_V147.map(entry => entry.id)).size, m.YAUTJA_WORDS_V147.length);
});

test("V147 decision and rules are quoted verbatim", async () => {
  const m = await bundle;
  assert.ok(extract.includes(`**Décision :** ${m.YAUTJA_LANGUAGE_DECISION_V147}`));
  for (const rule of m.YAUTJA_LANGUAGE_RULES_V147) assert.ok(extract.includes(`- ${rule}`), rule);
  assert.equal(m.YAUTJA_LANGUAGE_RULES_V147.length, 3);
});

test("V147 glossary helpers: all visible, search, canon collision guard", async () => {
  const m = await bundle;
  assert.equal(m.visibleYautjaWordsV147().length, m.YAUTJA_WORDS_V147.length);
  assert.deepEqual(m.searchYautjaWordsV147("sœur").map(e => e.id), ["mei-hswei-mei-jahdi"]);
  assert.deepEqual(m.searchYautjaWordsV147("entrainement").map(e => e.id), ["kehrite"]);
  assert.deepEqual(m.searchYautjaWordsV147("badlands").map(e => e.id), ["yauhwaq-yi-ai", "ngu-djei-chish"]);
  assert.equal(m.searchYautjaWordsV147("  ").length, m.YAUTJA_WORDS_V147.length);
  assert.equal(m.inventedWordConflictV147("ooman")?.id, "pyode-amedha-ooman");
  assert.equal(m.inventedWordConflictV147("Thar'n-dha s'yin'tekai")?.id, "yin-tekai");
  assert.equal(m.inventedWordConflictV147("Varek"), null);
  assert.equal(m.plainBibleTextV147("tueur de tueurs (*Badlands*)"), "tueur de tueurs (Badlands)");
});

test("V147 glossary is lazily mounted in the codex screen and touches no save field", () => {
  const client = read("app/game/GameClient.tsx");
  assert.match(client, /const YautjaGlossaryV147 = React\.lazy\(\(\) => import\("\.\/YautjaGlossaryV147"\)\)/);
  const codex = client.slice(client.indexOf('{screen === "codex" && ('), client.indexOf("{CODEX_ENTRIES.map("));
  assert.match(codex, /<Suspense[\s\S]*<YautjaGlossaryV147 \/>/);
  const component = read("app/game/YautjaGlossaryV147.tsx");
  assert.match(component, /visibleYautjaWordsV147\(\)/);
  assert.doesNotMatch(component + read("app/game/yautjaLanguageV147.ts"), /localStorage|normalizeSave|\bsave\.[a-zA-Z]/);
});
