import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { ENVIRONMENT_PROP_SPECS } from "../app/game/environmentPropCatalogue.ts";
import { ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS } from "../app/game/environmentPropAvailabilityData.ts";
import { inspectMaster, inspectRuntime } from "./audit-biome-decor-v19.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "art-source", "v19", "biome-decor");
const minimumPadding = 24;

function usage() {
  return `Usage:
  node scripts/audit-biome-decor-v19-batch.mjs --manifest <path>

Validate only the assets listed in a V19 batch manifest. Paths in each asset
are relative to the repository root. The global 800-asset audit is unchanged.
JSON is written to stdout; an invalid batch exits with status 1.`;
}

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== "--manifest" || !argv[1] || argv[1].startsWith("--")) {
    throw new Error("Argument requis: --manifest <path>");
  }
  return { manifestPath: argv[1] };
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function validateFileRecord(record, label, canonicalPath) {
  if (!record || typeof record.path !== "string" || !record.path.trim() ||
      path.isAbsolute(record.path) || record.path.includes("\0")) {
    throw new Error(`${label}: chemin relatif au dépôt requis`);
  }
  const normalized = record.path.replaceAll("\\", "/");
  if (normalized.split("/").some((part) => part === ".." || part === "." || !part)) {
    throw new Error(`${label}: chemin non canonique ${record.path}`);
  }
  if (canonicalPath && normalized !== canonicalPath) {
    throw new Error(`${label}: chemin catalogue attendu ${canonicalPath}`);
  }
  if (typeof record.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(record.sha256)) {
    throw new Error(`${label}: empreinte SHA256 invalide`);
  }
  const absolutePath = path.resolve(projectRoot, normalized);
  const allowedRoot = label === "source" ? sourceRoot : projectRoot;
  if (!isInside(allowedRoot, absolutePath) ||
      !isInside(await realpath(allowedRoot), await realpath(absolutePath))) {
    throw new Error(`${label}: fichier hors racine autorisée`);
  }
  return { absolutePath, path: normalized, expectedHash: record.sha256.toLowerCase() };
}

function addUniqueHash(hashes, hash, id, label, errors) {
  const previous = hashes.get(hash);
  if (previous) {
    errors.push(`${id}: ${label} identique à ${previous} (${hash})`);
  } else {
    hashes.set(hash, id);
  }
}

/** Reuse the full audit's image checks; completeness here applies to this batch only. */
export async function auditBiomeDecorV19Batch({ manifestPath } = {}) {
  const errors = [];
  const entries = [];
  const hashes = { source: new Map(), master: new Map(), runtime: new Map() };
  const report = {
    schemaVersion: 1,
    packVersion: 19,
    scope: "batch-only",
    manifest: typeof manifestPath === "string" ? manifestPath : null,
    complete: false,
    globalCompletenessEvaluated: false,
    policy: { minimumPadding, maximumRuntimeDimension: 768, sharedAudit: "audit-biome-decor-v19.mjs" },
    summary: { expected: 0, inspected: 0, uniqueSourceHashes: 0, uniqueMasterHashes: 0, uniqueRuntimeHashes: 0, totalRuntimeBytes: 0 },
    errors,
    entries,
  };
  let manifest;
  try {
    if (typeof manifestPath !== "string" || !manifestPath.trim()) {
      throw new Error("Chemin du manifeste requis");
    }
    manifest = JSON.parse(await readFile(path.resolve(projectRoot, manifestPath), "utf8"));
    if (!manifest || !Array.isArray(manifest.assets) || manifest.assets.length === 0) {
      throw new Error("Le manifeste doit contenir une liste assets non vide");
    }
  } catch (error) {
    errors.push(`Manifeste: ${error.message}`);
    return report;
  }

  report.summary.expected = manifest.assets.length;
  const catalogue = new Map();
  for (const spec of ENVIRONMENT_PROP_SPECS) {
    if (catalogue.has(spec.id)) {
      errors.push(`Catalogue: identifiant dupliqué ${spec.id}`);
    }
    catalogue.set(spec.id, spec);
  }
  const availableIds = new Set(ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS);
  const batchIds = new Set();
  for (const [index, asset] of manifest.assets.entries()) {
    const id = asset?.id;
    const prefix = typeof id === "string" ? id : `assets[${index}]`;
    try {
      if (typeof id !== "string" || !catalogue.has(id)) {
        throw new Error("identifiant absent du catalogue V19");
      }
      if (batchIds.has(id)) {
        throw new Error("identifiant dupliqué dans le lot");
      }
      batchIds.add(id);
      const spec = catalogue.get(id);
      if (typeof asset.prompt !== "string" || !asset.prompt.trim()) {
        throw new Error("prompt de génération manquant");
      }
      const sourceFile = await validateFileRecord(asset.source, "source");
      const masterFile = await validateFileRecord(asset.master, "master", spec.masterPath);
      const runtimeFile = await validateFileRecord(asset.runtime, "runtime", spec.runtimePath);
      const sourceBuffer = await readFile(sourceFile.absolutePath);
      const sourceMetadata = await sharp(sourceBuffer).metadata();
      if (path.extname(sourceFile.path).toLowerCase() !== ".png" || sourceMetadata.format !== "png") {
        throw new Error("source PNG originale requise");
      }
      const source = {
        path: sourceFile.path,
        bytes: sourceBuffer.length,
        width: sourceMetadata.width,
        height: sourceMetadata.height,
        sha256: createHash("sha256").update(sourceBuffer).digest("hex"),
      };
      const master = { path: masterFile.path, ...await inspectMaster(masterFile.absolutePath) };
      const runtime = { path: runtimeFile.path, ...await inspectRuntime(runtimeFile.absolutePath, master, minimumPadding) };
      const expectedFamily = spec.chroma === "#00FF00" ? "green" : "magenta";
      if (master.family !== expectedFamily) {
        errors.push(`${id}: chroma ${master.family}, ${spec.chroma} (${expectedFamily}) attendu`);
      }
      if (source.width !== master.width || source.height !== master.height) {
        errors.push(`${id}: dimensions du master différentes de la source PNG`);
      }
      for (const [label, details, file] of [
        ["source", source, sourceFile], ["master", master, masterFile], ["runtime", runtime, runtimeFile],
      ]) {
        if (details.sha256 !== file.expectedHash) {
          errors.push(`${id}: empreinte ${label} différente du manifeste`);
        }
        addUniqueHash(hashes[label], details.sha256, id, label, errors);
      }
      if (!availableIds.has(id)) {
        errors.push(`${id}: absent du registre de disponibilité runtime (régénérer runtime-data)`);
      }
      entries.push({ id, definitionId: spec.definitionId, biome: spec.biomeId, chroma: spec.chroma, available: availableIds.has(id), source, master, runtime });
    } catch (error) {
      errors.push(`${prefix}: ${error.message}`);
    }
  }

  Object.assign(report.summary, {
    inspected: entries.length,
    uniqueSourceHashes: hashes.source.size,
    uniqueMasterHashes: hashes.master.size,
    uniqueRuntimeHashes: hashes.runtime.size,
    totalRuntimeBytes: entries.reduce((total, entry) => total + entry.runtime.bytes, 0),
  });
  report.complete = errors.length === 0 && entries.length === manifest.assets.length;
  return report;
}

async function main() {
  if (process.argv.length === 3 && ["--help", "-h"].includes(process.argv[2])) {
    console.log(usage());
    return;
  }
  let report;
  try {
    report = await auditBiomeDecorV19Batch(parseArguments(process.argv.slice(2)));
  } catch (error) {
    report = { scope: "batch-only", complete: false, errors: [error.message] };
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.complete) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
