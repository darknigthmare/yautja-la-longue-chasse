import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the campaign menu before local archive hydration", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /<title>Yautja : La Longue Chasse<\/title>/i);
  // Inspect actual SSR markup, not matching strings inside the RSC payload.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const main = markup.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0];
  assert.ok(main, "the initial document contains its main landmark");
  assert.match(main, /^<main\b[^>]*\bdata-campaign-menu="main"/);
  assert.match(main, /<h1>Yautja<span>La Longue Chasse<\/span><\/h1>/);
  assert.match(main, /<section\b[^>]*\baria-label="Menu principal"/);
  assert.match(main, /Cinq parties indépendantes · dix sauvegardes manuelles et deux automatiques par partie\./);
  assert.match(main, /<p\b(?=[^>]*\brole="status")(?=[^>]*\baria-live="polite")[^>]*>Vérification et enregistrement des archives…<\/p>/);

  const buttons = [...main.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  assert.deepEqual(buttons.map(([, , content]) => content.replace(/<small>[\s\S]*?<\/small>/g, "")), [
    "Continuer", "Nouvelle partie", "Charger une partie", "Actualiser les archives",
  ]);
  // No local archives are available to SSR: actions stay protected until hydration.
  for (const [, attributes] of buttons) assert.match(attributes, /(?:^|\s)disabled(?:\s|=|$)/);
  assert.doesNotMatch(main, /data-campaign-session=|data-game-shell=|<canvas\b/);
});

test("removes the disposable starter preview", async () => {
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
  await access(new URL("public/game/sprites/hunter.webp", templateRoot));
  await access(new URL("public/game/backgrounds/ship.webp", templateRoot));
  await access(new URL("public/game/assets/v2/manifest.json", templateRoot));
  await access(
    new URL(
      "public/game/assets/v2/actors/yautja/hunter/body/base.webp",
      templateRoot,
    ),
  );
  await access(
    new URL(
      "public/game/assets/v2/environments/jungle/layers/far-lake.webp",
      templateRoot,
    ),
  );
});
