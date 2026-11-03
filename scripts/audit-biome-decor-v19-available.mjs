import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ENVIRONMENT_PROP_SPECS, ENVIRONMENT_PROP_BIOME_IDS } from "../app/game/environmentPropCatalogue.ts";
import { ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS } from "../app/game/environmentPropAvailabilityData.ts";
import { ENVIRONMENT_PROP_RUNTIME_ASSETS } from "../app/game/environmentPropRuntimeData.ts";
import { inspectMaster, inspectRuntime } from "./audit-biome-decor-v19.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artRoot = path.join(projectRoot, "art-source", "v19", "biome-decor");
const runtimeRoot = path.join(projectRoot, "public", "game", "assets", "v19", "biome-decor");
const minimumPadding = 24;
const toRelative = (value) => path.relative(projectRoot, value).split(path.sep).join("/");

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function listAssetFiles(root, errors, excludedRootFolders = new Set()) {
  const files = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT" && directory === root) return;
      errors.push(`${toRelative(directory)}: ${error.message}`);
      return;
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (directory === root && excludedRootFolders.has(entry.name)) continue;
      // Do not follow links/junctions into unrelated files or count their target
      // as an authored asset at this canonical location.
      if (entry.isSymbolicLink()) {
        errors.push(`Lien symbolique non autorisé dans les assets: ${toRelative(target)}`);
      } else if (entry.isDirectory()) {
        await visit(target);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".webp") {
        files.push(path.resolve(target));
      }
    }
  }
  await visit(root);
  return files.sort();
}

function uniqueHash(hashes, sha256, id, label, errors) {
  const previous = hashes.get(sha256);
  if (previous) errors.push(`${id}: ${label} identique à ${previous} (${sha256})`);
  else hashes.set(sha256, id);
}

/** Audit every existing pair without claiming the unproduced catalogue is complete. */
export async function auditBiomeDecorV19Available() {
  const errors = [];
  const entries = [];
  const report = {
    schemaVersion: 1,
    packVersion: 19,
    scope: "available-pairs-only",
    complete: false,
    globalCompletenessEvaluated: false,
    policy: {
      minimumPadding,
      maximumRuntimeDimension: 768,
      sharedAudit: "audit-biome-decor-v19.mjs",
      exactAvailabilityMembership: true,
      rejectOrphanAndUncataloguedAssets: true,
      excludedProductionFolders: ["batches", "contact-sheets"],
    },
    catalogue: { total: ENVIRONMENT_PROP_SPECS.length, available: 0, remaining: ENVIRONMENT_PROP_SPECS.length, complete: false },
    summary: { registered: ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS.length, paired: 0, inspected: 0, masters: 0, runtimes: 0, uniqueMasterHashes: 0, uniqueRuntimeHashes: 0, totalRuntimeBytes: 0 },
    byBiome: Object.fromEntries(ENVIRONMENT_PROP_BIOME_IDS.map((biome) => [biome, { catalogue: 0, paired: 0, registered: 0, inspected: 0, remaining: 0 }])),
    errors,
    entries,
  };
  const catalogue = new Map();
  const masterPaths = new Map();
  const runtimePaths = new Map();
  for (const spec of ENVIRONMENT_PROP_SPECS) {
    if (catalogue.has(spec.id)) errors.push(`Catalogue: identifiant dupliqué ${spec.id}`);
    catalogue.set(spec.id, spec);
    const count = report.byBiome[spec.biomeId];
    if (!count) errors.push(`${spec.id}: biome inconnu ${spec.biomeId}`);
    else count.catalogue += 1;
    for (const [label, relativePath, root, paths] of [
      ["master", spec.masterPath, artRoot, masterPaths],
      ["runtime", spec.runtimePath, runtimeRoot, runtimePaths],
    ]) {
      const absolutePath = path.resolve(projectRoot, relativePath);
      if (!inside(root, absolutePath)) {
        errors.push(`${spec.id}: chemin ${label} hors racine ${relativePath}`);
        continue;
      }
      if (paths.has(absolutePath)) errors.push(`${spec.id}: chemin ${label} partagé avec ${paths.get(absolutePath).id}`);
      paths.set(absolutePath, spec);
    }
  }

  const availableIds = new Set();
  for (const id of ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS) {
    if (availableIds.has(id)) errors.push(`Disponibilité: identifiant dupliqué ${id}`);
    availableIds.add(id);
    const spec = catalogue.get(id);
    if (!spec) errors.push(`Disponibilité: identifiant hors catalogue ${id}`);
    else if (report.byBiome[spec.biomeId]) report.byBiome[spec.biomeId].registered += 1;
  }
  const runtimeIds = new Set();
  for (const asset of ENVIRONMENT_PROP_RUNTIME_ASSETS) {
    if (runtimeIds.has(asset.id)) errors.push(`Projection runtime: identifiant dupliqué ${asset.id}`);
    runtimeIds.add(asset.id);
    const spec = catalogue.get(asset.id);
    if (!spec) {
      errors.push(`Projection runtime: identifiant hors catalogue ${asset.id}`);
      continue;
    }
    for (const key of ["version", "generator", "provenance", "biomeId", "role", "archetypeId", "variantId", "label", "runtimeUrl"]) {
      if (asset[key] !== spec[key]) errors.push(`${asset.id}: projection runtime différente du catalogue (${key})`);
    }
  }
  for (const id of catalogue.keys()) {
    if (!runtimeIds.has(id)) errors.push(`Projection runtime: identifiant catalogue manquant ${id}`);
  }

  const [masters, runtimes] = await Promise.all([
    listAssetFiles(artRoot, errors, new Set(["batches", "contact-sheets"])),
    listAssetFiles(runtimeRoot, errors),
  ]);
  const masterFiles = new Set(masters);
  const runtimeFiles = new Set(runtimes);
  report.summary.masters = masters.length;
  report.summary.runtimes = runtimes.length;
  for (const filename of masters) {
    if (!masterPaths.has(filename)) errors.push(`Master hors catalogue: ${toRelative(filename)}`);
  }
  for (const filename of runtimes) {
    if (!runtimePaths.has(filename)) errors.push(`Runtime hors catalogue: ${toRelative(filename)}`);
  }
  const pairs = [];
  for (const spec of catalogue.values()) {
    const masterPath = path.resolve(projectRoot, spec.masterPath);
    const runtimePath = path.resolve(projectRoot, spec.runtimePath);
    const hasMaster = masterFiles.has(masterPath);
    const hasRuntime = runtimeFiles.has(runtimePath);
    if (hasMaster !== hasRuntime) {
      errors.push(`${spec.id}: paire orpheline, ${hasMaster ? "runtime" : "master"} manquant`);
    }
    if (hasMaster && hasRuntime) {
      pairs.push({ spec, masterPath, runtimePath });
      if (report.byBiome[spec.biomeId]) report.byBiome[spec.biomeId].paired += 1;
      if (!availableIds.has(spec.id)) errors.push(`${spec.id}: paire présente absente du registre de disponibilité`);
    } else if (availableIds.has(spec.id)) {
      errors.push(`${spec.id}: inscrit disponible sans paire complète sur disque`);
    }
  }
  if (pairs.length === 0) errors.push("Aucune paire de décor disponible à auditer");
  report.summary.paired = pairs.length;
  Object.assign(report.catalogue, {
    available: pairs.length,
    remaining: catalogue.size - pairs.length,
    complete: pairs.length === catalogue.size,
  });
  for (const count of Object.values(report.byBiome)) count.remaining = count.catalogue - count.paired;

  // Three workers bound decoded-image memory while checking every pair, including
  // pairs accidentally omitted from the generated availability list.
  const inspected = new Array(pairs.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(3, pairs.length) }, async () => {
    while (nextIndex < pairs.length) {
      const index = nextIndex++;
      const { spec, masterPath, runtimePath } = pairs[index];
      try {
        const master = await inspectMaster(masterPath);
        const runtime = await inspectRuntime(runtimePath, master, minimumPadding);
        const expectedFamily = spec.chroma === "#00FF00" ? "green" : "magenta";
        if (master.family !== expectedFamily) {
          inspected[index] = { error: `${spec.id}: chroma ${master.family}, ${expectedFamily} attendu` };
        } else {
          inspected[index] = { entry: {
            id: spec.id,
            biome: spec.biomeId,
            role: spec.role,
            registered: availableIds.has(spec.id),
            master: { path: spec.masterPath, ...master },
            runtime: { path: spec.runtimePath, ...runtime },
          } };
        }
      } catch (error) {
        inspected[index] = { error: `${spec.id}: ${error.message}` };
      }
    }
  }));
  const masterHashes = new Map();
  const runtimeHashes = new Map();
  for (const result of inspected) {
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    const entry = result.entry;
    uniqueHash(masterHashes, entry.master.sha256, entry.id, "master", errors);
    uniqueHash(runtimeHashes, entry.runtime.sha256, entry.id, "runtime", errors);
    entries.push(entry);
    if (report.byBiome[entry.biome]) report.byBiome[entry.biome].inspected += 1;
  }
  Object.assign(report.summary, {
    inspected: entries.length,
    uniqueMasterHashes: masterHashes.size,
    uniqueRuntimeHashes: runtimeHashes.size,
    totalRuntimeBytes: entries.reduce((sum, entry) => sum + entry.runtime.bytes, 0),
  });
  report.complete = errors.length === 0 && entries.length === pairs.length && pairs.length === availableIds.size;
  return report;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) {
    console.log("Usage: node scripts/audit-biome-decor-v19-available.mjs [--report <project-relative.json>]");
    return;
  }
  let destination = null;
  if (argv.length > 0) {
    if (argv.length !== 2 || argv[0] !== "--report" || !argv[1]) throw new Error("Argument attendu: --report <project-relative.json>");
    destination = path.resolve(projectRoot, argv[1]);
    if (!inside(projectRoot, destination)) throw new Error("Le rapport doit rester dans le projet");
  }
  const report = await auditBiomeDecorV19Available();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (destination) {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, serialized, "utf8");
    console.log(JSON.stringify({ scope: report.scope, complete: report.complete, catalogue: report.catalogue, summary: report.summary, errors: report.errors, report: toRelative(destination) }, null, 2));
  } else {
    console.log(serialized.trimEnd());
  }
  if (!report.complete) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
