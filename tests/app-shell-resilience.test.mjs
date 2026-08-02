import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");

test("the main route exposes a recoverable error boundary", async () => {
  const source = await readFile(resolve(projectRoot, "app/error.tsx"), "utf8");

  assert.match(source, /export default function GameError/);
  assert.match(source, /onClick=\{reset\}/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.match(source, /aria-labelledby="error-title"/);
});

test("route loading has an announced in-world status", async () => {
  const source = await readFile(resolve(projectRoot, "app/loading.tsx"), "utf8");

  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Préparation de la chasse/);
});
