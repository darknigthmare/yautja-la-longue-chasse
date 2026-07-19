import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  HUNTER_FILM_PLATE_ROOT,
  HUNTER_FILM_PRESETS,
} from "../app/game/hunterLore.ts";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const ART_ROOT = path.join(ROOT, "art-source", "v5", "film-plates");
const SHARD_ROOT = path.join(ART_ROOT, "manifests");
const PROMPT_PACK_PATH = path.join(
  ART_ROOT,
  "openai-film-plate-prompts.jsonl",
);
const RUNTIME_ROOT = path.join(
  ROOT,
  "public",
  "game",
  "sprites",
  "v5",
  "film-plates",
);
const RUNTIME_MANIFEST_PATH = path.join(RUNTIME_ROOT, "manifest.json");

function normalizeRepositoryPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\/+/, "");
}

async function fileMetadata(repositoryPath) {
  const normalized = normalizeRepositoryPath(repositoryPath);
  const absolutePath = path.join(ROOT, normalized);
  const metadata = await stat(absolutePath);
  const buffer = await readFile(absolutePath);
  if (buffer.subarray(1, 4).toString("ascii") !== "PNG") {
    throw new Error(`${normalized}: la plaque doit être un PNG`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  if (width < 512 || height < 512) {
    throw new Error(`${normalized}: résolution insuffisante ${width}x${height}`);
  }
  if (![4, 6].includes(colorType)) {
    throw new Error(`${normalized}: canal alpha PNG absent`);
  }
  return {
    bytes: metadata.size,
    width,
    height,
    colorType,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

async function validateChromaSource(id, repositoryPath) {
  const normalized = normalizeRepositoryPath(repositoryPath);
  const expected = `art-source/v5/film-plates/sources/${id}-chroma.png`;
  if (normalized !== expected) {
    throw new Error(`${id}: sourcePath attendu ${expected}, reçu ${repositoryPath}`);
  }
  const absolutePath = path.join(ROOT, normalized);
  const metadata = await stat(absolutePath);
  const buffer = await readFile(absolutePath);
  if (buffer.subarray(1, 4).toString("ascii") !== "PNG") {
    throw new Error(`${id}: la source chroma doit être un PNG`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width < 512 || height < 512 || metadata.size < 20_000) {
    throw new Error(
      `${id}: source chroma suspecte (${width}x${height}, ${metadata.size} octets)`,
    );
  }
  return {
    bytes: metadata.size,
    width,
    height,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

async function readShards() {
  const shardNames = (await readdir(SHARD_ROOT))
    .filter((name) => name.endsWith(".json"))
    .sort();
  if (shardNames.length === 0) {
    throw new Error("Aucun manifeste de plaque film n’a été trouvé");
  }
  const shards = await Promise.all(
    shardNames.map(async (name) => {
      const shard = JSON.parse(
        await readFile(path.join(SHARD_ROOT, name), "utf8"),
      );
      if (shard.schemaVersion !== 1 || !Array.isArray(shard.entries)) {
        throw new Error(`${name}: schéma de shard invalide`);
      }
      return { name, ...shard };
    }),
  );
  return shards;
}

async function main() {
  const shards = await readShards();
  const entries = shards.flatMap((shard) =>
    shard.entries.map((entry) => ({ ...entry, shard: shard.name })),
  );
  const expectedIds = HUNTER_FILM_PRESETS.map((preset) => preset.id);
  const expectedIdSet = new Set(expectedIds);
  const seenIds = new Set();
  const seenPrompts = new Set();

  for (const entry of entries) {
    if (!expectedIdSet.has(entry.id)) {
      throw new Error(`${entry.id}: plaque sans preset cinéma`);
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`${entry.id}: plaque dupliquée`);
    }
    seenIds.add(entry.id);
    const prompt = String(entry.correctionPrompt ?? entry.prompt ?? "").trim();
    if (seenPrompts.has(prompt)) {
      throw new Error(`${entry.id}: prompt dupliqué, une consigne individuelle est requise`);
    }
    seenPrompts.add(prompt);
  }
  const missingIds = expectedIds.filter((id) => !seenIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(`Plaques cinéma manquantes : ${missingIds.join(", ")}`);
  }

  const presetById = new Map(
    HUNTER_FILM_PRESETS.map((preset) => [preset.id, preset]),
  );
  const orderedEntries = await Promise.all(
    expectedIds.map(async (id) => {
      const entry = entries.find((candidate) => candidate.id === id);
      const preset = presetById.get(id);
      const finalPrompt = entry.correctionPrompt ?? entry.prompt;
      const expectedRuntimePath = `${HUNTER_FILM_PLATE_ROOT}/${id}.png`;
      const runtimePath = `public${expectedRuntimePath}`;
      if (
        normalizeRepositoryPath(entry.runtimePath) !==
        normalizeRepositoryPath(runtimePath)
      ) {
        throw new Error(
          `${id}: runtimePath attendu ${runtimePath}, reçu ${entry.runtimePath}`,
        );
      }
      if (!Array.isArray(entry.referenceUrls) || entry.referenceUrls.length < 2) {
        throw new Error(`${id}: deux références visuelles sont requises`);
      }
      if (new Set(entry.referenceUrls).size !== entry.referenceUrls.length) {
        throw new Error(`${id}: référence URL dupliquée`);
      }
      for (const sourceUrl of entry.referenceUrls) {
        if (!String(sourceUrl).startsWith("https://")) {
          throw new Error(`${id}: référence non HTTPS`);
        }
      }
      if (
        !Array.isArray(entry.localReferences) ||
        entry.localReferences.length < 2 ||
        new Set(entry.localReferences).size !== entry.localReferences.length
      ) {
        throw new Error(
          `${id}: deux fichiers de référence locaux distincts sont requis`,
        );
      }
      if (String(entry.visualAnchor ?? "").trim().length < 40) {
        throw new Error(`${id}: ancrage visuel individuel trop court`);
      }
      if (String(finalPrompt ?? "").trim().length < 700) {
        throw new Error(
          `${id}: prompt individuel trop court, 700 caractères minimum`,
        );
      }
      if (!String(finalPrompt).toLowerCase().includes("#00ff00")) {
        throw new Error(`${id}: le prompt doit verrouiller le chroma #00FF00`);
      }
      if (
        !/full.body|corps entier|(?:one|single) complete|complete (?:character|figure)/i.test(
          finalPrompt,
        )
      ) {
        throw new Error(`${id}: le prompt ne verrouille pas le corps entier`);
      }
      const sourceMetadata = await validateChromaSource(id, entry.sourcePath);
      const metadata = await fileMetadata(runtimePath);
      return {
        id,
        name: preset.name,
        work: preset.work,
        year: preset.year,
        media: preset.media,
        runtimeUrl: expectedRuntimePath,
        runtimePath: normalizeRepositoryPath(runtimePath),
        sourcePath: normalizeRepositoryPath(entry.sourcePath),
        sourceMetadata,
        referenceUrls: entry.referenceUrls,
        localReferences: (entry.localReferences ?? []).map(
          normalizeRepositoryPath,
        ),
        visualAnchor: entry.visualAnchor,
        prompt: finalPrompt,
        metadata,
        validation: entry.validation ?? null,
        shard: entry.shard,
      };
    }),
  );
  const runtimeHashIds = new Map();
  const sourceHashIds = new Map();
  for (const entry of orderedEntries) {
    const duplicateId = runtimeHashIds.get(entry.metadata.sha256);
    if (duplicateId) {
      throw new Error(
        `${entry.id}: plaque dupliquée bit à bit avec ${duplicateId}`,
      );
    }
    runtimeHashIds.set(entry.metadata.sha256, entry.id);
    const duplicateSourceId = sourceHashIds.get(
      entry.sourceMetadata.sha256,
    );
    if (duplicateSourceId) {
      throw new Error(
        `${entry.id}: source OpenAI dupliquée bit à bit avec ${duplicateSourceId}`,
      );
    }
    sourceHashIds.set(entry.sourceMetadata.sha256, entry.id);
  }

  await mkdir(ART_ROOT, { recursive: true });
  await mkdir(RUNTIME_ROOT, { recursive: true });
  await writeFile(
    PROMPT_PACK_PATH,
    `${orderedEntries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    "utf8",
  );
  await writeFile(
    RUNTIME_MANIFEST_PATH,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generator: "OpenAI ImageGen",
        style: "detailed-2d-pixel-art-full-body-film-plate",
        plateRoot: HUNTER_FILM_PLATE_ROOT,
        coverage: {
          films: new Set(orderedEntries.map((entry) => entry.work)).size,
          hunters: orderedEntries.length,
          prompts: orderedEntries.length,
          complete: orderedEntries.length === expectedIds.length,
        },
        entries: orderedEntries.map((entry) => {
          const manifestEntry = { ...entry };
          delete manifestEntry.prompt;
          return manifestEntry;
        }),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    `Pack plaques cinéma V5 : ${orderedEntries.length}/${expectedIds.length} chasseurs, un prompt individuel par plaque.`,
  );
  console.log(path.relative(ROOT, PROMPT_PACK_PATH));
  console.log(path.relative(ROOT, RUNTIME_MANIFEST_PATH));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
