import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const [outputArgument, ...inputArguments] = process.argv.slice(2);

assert.ok(
  outputArgument && inputArguments.length > 0,
  "Usage: node scripts/import-trophy-correction-provenance.mjs <art-source output.jsonl> <tmp input.jsonl> [...]",
);

function workspaceRelative(inputPath) {
  const absolutePath = path.resolve(root, inputPath);
  const relativePath = path.relative(root, absolutePath);
  assert.ok(
    relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath),
    `${inputPath}: path must stay inside the project`,
  );
  return relativePath.replaceAll(path.sep, "/");
}

function promptHash(prompt) {
  return createHash("sha256").update(prompt).digest("hex");
}

const outputPath = workspaceRelative(outputArgument);
assert.match(
  outputPath,
  /^art-source\/v1[67]\/.+\.jsonl$/,
  "Correction provenance must remain in art-source V16 or V17",
);

const imported = [];
for (const inputArgument of inputArguments) {
  const inputPath = workspaceRelative(inputArgument);
  assert.match(inputPath, /^tmp\/.+\.jsonl$/, "Raw agent logs must come from ignored tmp");

  const lines = (await readFile(path.join(root, inputPath), "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  for (const [lineIndex, line] of lines.entries()) {
    const raw = JSON.parse(line);
    assert.match(raw.id, /^(enemy-trophy|franchise)-[a-z0-9-]+$/);
    assert.ok(typeof raw.prompt === "string" && raw.prompt.length >= 500);
    assert.ok(Array.isArray(raw.referencePaths) && raw.referencePaths.length >= 1);

    imported.push({
      id: raw.id,
      recordType: "semantic-correction-attempt",
      attempt: raw.attempt ?? `correction-${lineIndex + 1}`,
      generator: "OpenAI ImageGen",
      modelMode: "builtin-imagegen",
      sourceLog: inputPath,
      sourceLine: lineIndex + 1,
      promptSha256: promptHash(raw.prompt),
      prompt: raw.prompt,
      referencePaths: raw.referencePaths.map((referencePath) =>
        workspaceRelative(referencePath),
      ),
      accepted: false,
    });
  }
}

const lastAttemptById = new Map();
for (const [index, record] of imported.entries()) {
  lastAttemptById.set(record.id, index);
}
for (const [index, record] of imported.entries()) {
  record.accepted = lastAttemptById.get(record.id) === index;
}

const compositeIds = imported.map(
  (record) => `${record.id}|${record.attempt}|${record.promptSha256}`,
);
assert.equal(
  new Set(compositeIds).size,
  compositeIds.length,
  "Duplicate correction attempt records",
);

const absoluteOutputPath = path.join(root, outputPath);
await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
await writeFile(
  absoluteOutputPath,
  `${imported.map((record) => JSON.stringify(record)).join("\n")}\n`,
  "utf8",
);

console.log(
  `Provenance correctifs importée : ${imported.length} tentatives, ${lastAttemptById.size} résultats acceptés dans ${outputPath}.`,
);
