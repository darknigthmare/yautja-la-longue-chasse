import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "vite";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(root, "art-source", "v17", "enemy-trophies");
const semanticCorrectionDirectives = {
  "enemy-trophy-iris-infrarouge":
    "The rejected result showed the complete orchid. Render exactly one detached circular infrared-sensitive iris organ only, with a clean anatomical rim traceable to the reference. Absolutely no complete flower, petals, stem, roots, tendrils, legs or whole creature.",
  "enemy-trophy-iris-thermosensible":
    "The rejected result showed the complete sentinel orchid. Render exactly one detached circular thermosensitive iris organ only, with its species-specific lens and clean anatomical rim. Absolutely no complete flower, petals, stem, roots, tendrils, claws, legs or whole creature.",
  "enemy-trophy-lamelle-necrotique":
    "The rejected result showed the complete walking mushroom. Render exactly one detached necrotic fungal lamella or gill plate only, clean and non-gory, preserving the referenced fungus ridges and pores. Absolutely no mushroom cap, torso, mouth, roots, legs or complete organism.",
  "enemy-trophy-laser-de-forage":
    "The rejected result showed the complete excavation drone. Render exactly one detached recovered drilling-laser emitter module only, preserving the reference drone's colors and construction. Absolutely no drone chassis, body, sensor head, drill bit, arms, claws, legs or complete robot.",
  "enemy-trophy-marque-de-clan-effacee":
    "The rejected result invented an entire Yautja skull. Render exactly one detached worn clan-mark armor fragment or ritual identification plate traceable to the deserter's equipment, with the clan mark visibly erased. Absolutely no skull, head, face, mask, dreadlocks, body, gore or character.",
  "enemy-trophy-marque-de-sang-reniee":
    "The rejected result invented an entire Yautja skull. Render exactly one detached ritual armor fragment or identification plate traceable to the initiate's equipment, carrying a visibly rejected blood mark. Absolutely no skull, head, face, mask, dreadlocks, body, gore or character.",
  "enemy-trophy-nageoire-dentelee":
    "The rejected result showed the complete wave-fin creature. Render exactly one detached serrated bony fin only, preserving the reference creature's blue-violet scales, fin rays and tooth-like edge. Absolutely no head, eyes, mouth, torso, tail, other fins, legs or complete creature.",
};

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function classifyTrophy(name) {
  const normalized = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (
    /biomask|masque|canon|generateur|projecteur|viseur|plaque d.unite|insigne|medaille|module|balise|emetteur|capteur|lentille|processeur|servomoteur|batterie|arme|poignard|lame|collier|brassard|sceau|cle|relais|injecteur|antenne|bobine|stabilisateur|regulateur/.test(
      normalized,
    )
  ) {
    return "equipment";
  }
  if (
    /synthet|mn[eé]s|glyph|obsidienne|cristal|miner|alliage|mecan|circuit|reacteur|noyau de donnees|matrice/.test(
      normalized,
    )
  ) {
    return "relic";
  }
  if (
    /rhizome|bulbe|racine|ligneux|pollin|resin|spore|mycel|graine|liane|corolle|orchidee|feuille|ecorce|s[eè]ve|nectar|cosse|gousse|pistil|tige/.test(
      normalized,
    )
  ) {
    return "botanical";
  }
  if (
    /glande|sac|poche|coeur|cœur|iris|peau|membrane|organe|tendon|muscle|nodule|nœud|noeud|ventouse|langue|soie|plume|tentacule|aile/.test(
      normalized,
    )
  ) {
    return "soft-anatomy";
  }
  return "hard-anatomy";
}

function objectDirection(objectKind) {
  switch (objectKind) {
    case "equipment":
      return "Preserve the exact wearable, weapon, tool or technological-component identity named by the roster. It must read as a recovered field object, not as a generic sci-fi prop.";
    case "relic":
      return "Preserve the exact mineral, synthetic or ancient-relic identity named by the roster. Its construction language must visibly descend from the referenced enemy.";
    case "botanical":
      return "Preserve the exact plant organ named by the roster, including the living enemy's distinctive fibers, vascular structures, pigments and silhouette language.";
    case "soft-anatomy":
      return "Preserve the exact biological organ or soft anatomical part named by the roster. Keep it clean, non-gory and materially readable while retaining species-specific structure.";
    default:
      return "Preserve the exact bone, tooth, shell, plate or other hard anatomical part named by the roster. Its geometry must be traceable to the referenced creature rather than a generic skull.";
  }
}

function promptFor(entry) {
  const identityList = entry.enemyNames
    .map((name, index) => `${name} (identity reference ${index + 1})`)
    .join(" and ");
  const behaviorList = [...new Set(entry.enemyBehaviors)].join(" / ");

  return [
    "Create one original project-owned fan-art game trophy asset for the 2D game “Yautja: La Longue Chasse”.",
    `Identity references: use the supplied living sprite sheet${entry.referenceSheetPaths.length > 1 ? "s" : ""} only to preserve the exact anatomy, proportions, colors, surface structures and design language of ${identityList}.`,
    "Style reference: use the supplied existing validated trophy master only for the established crisp high-detail pixel-art rendering, material readability and isolated-object presentation; never copy its species or silhouette.",
    `Subject: “${entry.name}”, the exact potential trophy named by the authoritative enemy roster.`,
    objectDirection(entry.objectKind),
    `Behavioral anatomy clue from the roster: ${behaviorList}.`,
    "Show exactly one complete cleaned trophy object, with every defining part readable and the entire silhouette visible. No character, no detached duplicate, no trophy wall, no mounting plaque, no rope, no environment, no unrelated equipment, no gore and no fresh blood.",
    "Use a side-three-quarter or frontal-three-quarter presentation chosen for maximum anatomical readability in a bestiary card. Center the object, make it large, and retain generous safe padding on all four sides.",
    "Render polished crisp 32-bit pixel art matching the project’s existing trophy assets, with controlled highlights, readable material separation and a sharp game-ready silhouette. Do not include text, letters, numbers, logos, labels, signatures or watermarks.",
    "The background must be perfectly flat pure uniform #00ff00 chroma green from edge to edge, with absolutely no gradient, no floor, no scene, no cast shadow, no contact shadow and no green reflection or green spill on the trophy.",
  ].join(" ");
}

async function bundleModule(entryPath, outputName, outputDirectory) {
  await build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      emptyOutDir: false,
      outDir: outputDirectory,
      ssr: path.join(root, entryPath),
      rollupOptions: {
        output: { entryFileNames: outputName },
      },
    },
  });
  return import(pathToFileURL(path.join(outputDirectory, outputName)).href);
}

async function pathExists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function writeJson(relativePath, value) {
  const outputPath = path.join(root, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const outputDirectory = await mkdtemp(path.join(tmpdir(), "yautja-enemy-trophies-v17-"));

try {
  const [v7, v8] = await Promise.all([
    bundleModule("app/game/enemyRosterV7.ts", "enemy-roster-v7.mjs", outputDirectory),
    bundleModule("app/game/ecologyV8.ts", "ecology-v8.mjs", outputDirectory),
  ]);

  const enemies = [
    ...v7.ENEMY_V7_DEFINITIONS.map((enemy) => ({ ...enemy, roster: "v7" })),
    ...v8.ECOLOGY_V8_ENEMIES.map((enemy) => ({ ...enemy, roster: "v8" })),
  ];
  assert.equal(enemies.length, 228, "authoritative enemy count");
  assert.equal(new Set(enemies.map((enemy) => enemy.id)).size, 228, "enemy ids");

  const trophyGroups = new Map();
  for (const enemy of enemies) {
    const group = trophyGroups.get(enemy.trophy) ?? [];
    group.push(enemy);
    trophyGroups.set(enemy.trophy, group);
  }
  assert.equal(trophyGroups.size, 203, "distinct trophy count");

  const usedIds = new Map();
  const entries = [];
  for (const [name, groupedEnemies] of [...trophyGroups].sort(([left], [right]) =>
    left.localeCompare(right, "fr"),
  )) {
    const baseId = `enemy-trophy-${slugify(name)}`;
    const existingName = usedIds.get(baseId);
    const id = existingName && existingName !== name ? `${baseId}-${shortHash(name)}` : baseId;
    usedIds.set(id, name);

    const masterPath = `art-source/v17/enemy-trophies/masters/${id}-chroma.png`;
    const runtimePath = `public/game/assets/v17/enemy-trophies/${id}.webp`;
    const [masterAvailable, runtimeAvailable] = await Promise.all([
      pathExists(masterPath),
      pathExists(runtimePath),
    ]);
    const available = masterAvailable && runtimeAvailable;
    const referenceSheetPaths = [
      ...new Set(
        groupedEnemies.map((enemy) => `public${enemy.sheetPath}`),
      ),
    ];

    entries.push({
      id,
      name,
      objectKind: classifyTrophy(name),
      franchiseStatus: "project-original",
      enemyIds: groupedEnemies.map((enemy) => enemy.id),
      enemyNames: groupedEnemies.map((enemy) => enemy.name),
      enemyBehaviors: groupedEnemies.map((enemy) => enemy.behavior),
      rosters: [...new Set(groupedEnemies.map((enemy) => enemy.roster))],
      referenceSheetPaths,
      masterPath,
      runtimePath,
      runtimeUrl: `/${runtimePath.replace(/^public\//, "")}`,
      planned: true,
      available,
      consumers: groupedEnemies
        .map((enemy) => (enemy.roster === "v7" ? "enemy-bestiary-v7" : "enemy-bestiary-v8"))
        .filter((consumer, index, consumers) => consumers.indexOf(consumer) === index),
      inspection: {
        status: available ? "passed" : "planned",
        notes: available
          ? "Distinct project-original trophy cutout generated from the exact living enemy reference and checked by the V17 audit."
          : "Awaiting a distinct OpenAI ImageGen master and transparent runtime cutout.",
      },
    });
  }

  assert.equal(entries.length, 203);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 203, "trophy ids");
  assert.equal(
    entries.reduce((total, entry) => total + entry.enemyIds.length, 0),
    228,
    "enemy mapping coverage",
  );

  const prompts = entries.map((entry) => ({
    id: entry.id,
    recordType: "primary-prompt-exact",
    generator: "OpenAI ImageGen",
    modelMode: "builtin-imagegen",
    authority: "app/game/enemyRosterV7.ts + app/game/ecologyV8.ts",
    chromaKey: "#00ff00",
    referenceSheetPaths: entry.referenceSheetPaths,
    styleReferencePath:
      "art-source/v14/hunter-kit/masters/trophy-xenomorph-skull-p2-chroma.png",
    outputPath: entry.masterPath,
    prompt: promptFor(entry),
  }));
  const correctionPrompts = prompts
    .filter((entry) => Object.hasOwn(semanticCorrectionDirectives, entry.id))
    .map((entry) => ({
      ...entry,
      recordType: "semantic-correction",
      prompt: `${entry.prompt} SEMANTIC CORRECTION PASS: ${
        semanticCorrectionDirectives[entry.id]
      }`,
    }));

  await Promise.all([
    writeJson("art-source/v17/enemy-trophies/policy.json", {
      schemaVersion: 1,
      packId: "enemy-trophies-v17",
      packVersion: 17,
      sourcePolicy: {
        authority: ["app/game/enemyRosterV7.ts", "app/game/ecologyV8.ts"],
        projectCanonRequired: true,
        webReferenceRequired: false,
        franchiseStatus: "project-original",
        exactEnemyCoverageRequired: true,
        genericAliasingAllowed: false,
        sharedExactTrophyNamesAllowed: true,
      },
      consumerPolicy: {
        allowed: ["enemy-bestiary-v7", "enemy-bestiary-v8"],
        forbidden: ["franchise-archive", "trophy-wall", "hunter-rig", "hunt-canvas"],
      },
      artifactPolicy: {
        generator: "OpenAI ImageGen",
        masterBackground: "#00ff00",
        runtimeAlphaRequired: true,
        promptStorage: "art-source-only",
      },
    }),
    writeJson("art-source/v17/enemy-trophies/source-specs.json", {
      schemaVersion: 1,
      packId: "enemy-trophies-v17",
      packVersion: 17,
      authority: ["app/game/enemyRosterV7.ts", "app/game/ecologyV8.ts"],
      coverage: {
        enemies: 228,
        distinctTrophies: 203,
        sharedExactNames: entries.filter((entry) => entry.enemyIds.length > 1).length,
      },
      entries,
    }),
    writeJson("art-source/v17/enemy-trophies/enemy-mappings.json", {
      schemaVersion: 1,
      packId: "enemy-trophies-v17",
      mappings: entries.flatMap((entry) =>
        entry.enemyIds.map((enemyId, index) => ({
          enemyId,
          enemyName: entry.enemyNames[index],
          trophyId: entry.id,
          trophyName: entry.name,
        })),
      ),
    }),
    (async () => {
      await mkdir(sourceRoot, { recursive: true });
      await writeFile(
        path.join(sourceRoot, "openai-enemy-trophy-prompts.jsonl"),
        `${prompts.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
        "utf8",
      );
      await writeFile(
        path.join(
          sourceRoot,
          "openai-enemy-trophy-correction-prompts.jsonl",
        ),
        `${correctionPrompts
          .map((entry) => JSON.stringify(entry))
          .join("\n")}\n`,
        "utf8",
      );
    })(),
  ]);

  const available = entries.filter((entry) => entry.available).length;
  console.log(
    `Pack ennemi V17 reconstruit : 228 ennemis, 203 prises distinctes, ${available}/203 assets disponibles.`,
  );
} finally {
  await rm(outputDirectory, { force: true, recursive: true });
}
