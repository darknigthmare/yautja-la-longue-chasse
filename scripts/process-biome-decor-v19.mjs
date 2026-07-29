import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  ENVIRONMENT_PROP_BIOME_IDS,
  ENVIRONMENT_PROP_SPECS,
} from "../app/game/environmentPropCatalogue.ts";

sharp.cache(false);

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

export const BIOME_DECOR_V19_BIOMES = Object.freeze([
  ...ENVIRONMENT_PROP_BIOME_IDS,
]);
const SPEC_BY_DEFINITION_ID = new Map(
  ENVIRONMENT_PROP_SPECS.map((spec) => [spec.definitionId, spec]),
);
const DEFAULT_ART_ROOT = path.join(
  projectRoot,
  "art-source",
  "v19",
  "biome-decor",
);
const DEFAULT_PUBLIC_ROOT = path.join(
  projectRoot,
  "public",
  "game",
  "assets",
  "v19",
  "biome-decor",
);
function usage() {
  return `Usage:
  node scripts/process-biome-decor-v19.mjs \\
    --input <imagegen-output.png> \\
    --definition-id <environment-prop-v19-...>

Options:
  --id <catalog-id>        Alias for --definition-id
  --art-root <path>       Override art-source output root
  --public-root <path>    Override runtime output root
  --helper <path>         Override the installed remove_chroma_key.py
  --python <command>      Python executable (default: python)
  --force                 Explicitly replace the two V19 destinations

The input PNG is never deleted by this script.`;
}

function parseArguments(argv) {
  const values = new Map();
  let force = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--force") {
      force = true;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Argument inattendu: ${token}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Valeur manquante pour ${token}`);
    }
    values.set(token.slice(2), value);
    index += 1;
  }
  return {
    input: values.get("input"),
    definitionId: values.get("definition-id") ?? values.get("id"),
    artRoot: values.get("art-root"),
    publicRoot: values.get("public-root"),
    helperPath: values.get("helper"),
    pythonCommand: values.get("python"),
    force,
  };
}

function parseHexColor(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Couleur chroma invalide: ${value}`);
  }
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}

function rgbDistance(left, right) {
  return Math.sqrt(
    (left[0] - right[0]) ** 2 +
      (left[1] - right[1]) ** 2 +
      (left[2] - right[2]) ** 2,
  );
}

function keyFamily(rgb) {
  const [red, green, blue] = rgb;
  if (
    green >= 180 &&
    green >= red + 85 &&
    green >= blue + 85
  ) {
    return "green";
  }
  if (
    red >= 160 &&
    blue >= 160 &&
    Math.min(red, blue) >= green + 70 &&
    Math.abs(red - blue) <= 96
  ) {
    return "magenta";
  }
  return "unknown";
}

function borderSamples(data, info) {
  const samples = [];
  const band = Math.max(1, Math.min(info.width, info.height, 6));
  const step = Math.max(1, Math.floor(Math.min(info.width, info.height) / 256));
  const append = (x, y) => {
    const offset = (y * info.width + x) * info.channels;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  for (let x = 0; x < info.width; x += step) {
    for (let y = 0; y < band; y += 1) {
      append(x, y);
      append(x, info.height - 1 - y);
    }
  }
  for (let y = 0; y < info.height; y += step) {
    for (let x = 0; x < band; x += 1) {
      append(x, y);
      append(info.width - 1 - x, y);
    }
  }
  return samples;
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function inspectFlatChroma(input, expectedKey) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const samples = borderSamples(data, info);
  const sampledKey = [
    median(samples.map((sample) => sample[0])),
    median(samples.map((sample) => sample[1])),
    median(samples.map((sample) => sample[2])),
  ];
  const expected = parseHexColor(expectedKey);
  const compatibleSamples = samples.filter(
    (sample) => rgbDistance(sample, sampledKey) <= 24,
  ).length;
  const compatibleRatio = compatibleSamples / samples.length;
  const family = keyFamily(sampledKey);

  if (family === "unknown") {
    throw new Error(
      `Le fond échantillonné #${sampledKey
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")} n'est ni un chroma vert ni magenta exploitable`,
    );
  }
  if (keyFamily(expected) !== family || rgbDistance(sampledKey, expected) > 75) {
    throw new Error(
      `Le fond chroma détecté ne correspond pas à ${expectedKey} ` +
        `(distance ${rgbDistance(sampledKey, expected).toFixed(1)})`,
    );
  }
  if (compatibleRatio < 0.95) {
    throw new Error(
      `Le bord chroma n'est pas assez uniforme (${(
        compatibleRatio * 100
      ).toFixed(2)} %)`,
    );
  }

  return {
    width: info.width,
    height: info.height,
    sampledKey,
    keyFamily: family,
    compatibleRatio: Number(compatibleRatio.toFixed(6)),
  };
}

export async function inspectRuntimeAlpha(input) {
  const metadata = await sharp(input).metadata();
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let visiblePixels = 0;
  let transparentPixels = 0;
  let dirtyTransparentPixels = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const alpha = data[offset + 3];
    if (alpha === 0) {
      transparentPixels += 1;
      if (data[offset] || data[offset + 1] || data[offset + 2]) {
        dirtyTransparentPixels += 1;
      }
    }
    if (alpha > 16) {
      visiblePixels += 1;
    }
  }
  const totalPixels = info.width * info.height;
  if (metadata.hasAlpha !== true) {
    throw new Error("L'export runtime ne possède pas de canal alpha");
  }
  if (visiblePixels === 0) {
    throw new Error("L'export runtime est entièrement transparent");
  }
  if (transparentPixels === 0) {
    throw new Error("Le fond chroma n'a produit aucun pixel transparent");
  }
  return {
    width: info.width,
    height: info.height,
    channels: info.channels,
    alpha: metadata.hasAlpha === true,
    visibleRatio: Number((visiblePixels / totalPixels).toFixed(6)),
    transparentRatio: Number((transparentPixels / totalPixels).toFixed(6)),
    dirtyTransparentPixels,
  };
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function defaultHelperPath() {
  const codexHome =
    process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  return path.join(
    codexHome,
    "skills",
    ".system",
    "imagegen",
    "scripts",
    "remove_chroma_key.py",
  );
}

async function runChromaHelper({
  input,
  output,
  helperPath,
  pythonCommand,
}) {
  await access(helperPath);
  const candidates = pythonCommand
    ? [pythonCommand]
    : [
        "python",
        ...(process.platform === "win32"
          ? ["C:\\Python314\\python.exe"]
          : []),
      ];
  const argumentsList = [
    helperPath,
    "--input",
    input,
    "--out",
    output,
    "--auto-key",
    "border",
    "--soft-matte",
    "--transparent-threshold",
    "12",
    "--opaque-threshold",
    "220",
    "--despill",
    "--force",
  ];
  const failures = [];
  for (const candidate of candidates) {
    try {
      const { stdout, stderr } = await execFileAsync(
        candidate,
        argumentsList,
        {
          maxBuffer: 4 * 1024 * 1024,
          windowsHide: true,
        },
      );
      return {
        pythonCommand: candidate,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (error) {
      failures.push(`${candidate}: ${error.message}`);
    }
  }
  throw new Error(
    `Impossible d'exécuter le helper chroma officiel:\n${failures.join("\n")}`,
  );
}

export function environmentPropSpecForDefinitionId(definitionId) {
  const spec = SPEC_BY_DEFINITION_ID.get(definitionId);
  if (!spec) {
    throw new Error(`Definition V19 absente du catalogue: ${definitionId}`);
  }
  return spec;
}

function destinationFromSpec(specPath, defaultRoot, overrideRoot) {
  const canonicalPath = path.resolve(projectRoot, specPath);
  if (!overrideRoot) {
    return canonicalPath;
  }
  const relativePath = path.relative(defaultRoot, canonicalPath);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Chemin catalogue hors racine V19: ${specPath}`);
  }
  return path.resolve(overrideRoot, relativePath);
}

export async function processBiomeDecorV19(options) {
  const {
    input,
    definitionId,
    artRoot,
    publicRoot,
    helperPath = defaultHelperPath(),
    pythonCommand = process.env.PYTHON,
    force = false,
  } = options;

  if (!input) {
    throw new Error("Le chemin --input est requis");
  }
  const spec = environmentPropSpecForDefinitionId(definitionId);
  const biome = spec.biomeId;
  const chromaKey = spec.chroma;
  const fileId = path.basename(spec.runtimePath, ".webp");
  const resolvedInput = path.resolve(input);
  const inputMetadata = await sharp(resolvedInput).metadata();
  if (inputMetadata.format !== "png") {
    throw new Error(
      `Une sortie PNG ImageGen est requise, format reçu: ${inputMetadata.format}`,
    );
  }
  if (
    (inputMetadata.width ?? 0) < 512 ||
    (inputMetadata.height ?? 0) < 512
  ) {
    throw new Error(
      `Sortie ImageGen trop petite: ${inputMetadata.width}x${inputMetadata.height}`,
    );
  }
  const chromaInspection = await inspectFlatChroma(resolvedInput, chromaKey);

  const masterPath = destinationFromSpec(
    spec.masterPath,
    DEFAULT_ART_ROOT,
    artRoot,
  );
  const runtimePath = destinationFromSpec(
    spec.runtimePath,
    DEFAULT_PUBLIC_ROOT,
    publicRoot,
  );
  if (!force && (await pathExists(masterPath))) {
    throw new Error(`Le master V19 existe déjà: ${masterPath}`);
  }
  if (!force && (await pathExists(runtimePath))) {
    throw new Error(`L'export runtime V19 existe déjà: ${runtimePath}`);
  }

  const helperTemporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "yautja-biome-decor-v19-"),
  );
  const helperOutput = path.join(helperTemporaryRoot, `${fileId}-alpha.png`);
  try {
    const helper = await runChromaHelper({
      input: resolvedInput,
      output: helperOutput,
      helperPath: path.resolve(helperPath),
      pythonCommand,
    });
    const helperInspection = await inspectRuntimeAlpha(helperOutput);
    const masterBuffer = await sharp(resolvedInput)
      .removeAlpha()
      .webp({ quality: 92, effort: 6, smartSubsample: true })
      .toBuffer();
    const runtimeBuffer = await sharp(helperOutput)
      .ensureAlpha()
      .trim({
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        threshold: 10,
      })
      .resize({
        width: 720,
        height: 720,
        fit: "inside",
        withoutEnlargement: true,
        kernel: "nearest",
      })
      .extend({
        top: 24,
        bottom: 24,
        left: 24,
        right: 24,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({
        quality: 92,
        alphaQuality: 100,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();
    const runtimeInspection = await inspectRuntimeAlpha(runtimeBuffer);

    await mkdir(path.dirname(masterPath), { recursive: true });
    await mkdir(path.dirname(runtimePath), { recursive: true });
    await writeFile(masterPath, masterBuffer, force ? undefined : { flag: "wx" });
    await writeFile(
      runtimePath,
      runtimeBuffer,
      force ? undefined : { flag: "wx" },
    );

    const writtenMaster = await readFile(masterPath);
    const writtenRuntime = await readFile(runtimePath);
    if (sha256(writtenMaster) !== sha256(masterBuffer)) {
      throw new Error(`Échec de vérification du master écrit: ${masterPath}`);
    }
    if (sha256(writtenRuntime) !== sha256(runtimeBuffer)) {
      throw new Error(`Échec de vérification du runtime écrit: ${runtimePath}`);
    }

    return {
      schemaVersion: 1,
      packVersion: 19,
      generator: "OpenAI ImageGen",
      modelMode: "builtin-imagegen",
      id: spec.id,
      definitionId: spec.definitionId,
      biome,
      role: spec.role,
      archetypeId: spec.archetypeId,
      variantId: spec.variantId,
      chromaKey,
      input: {
        path: resolvedInput,
        bytes: (await readFile(resolvedInput)).length,
        sha256: sha256(await readFile(resolvedInput)),
        width: inputMetadata.width,
        height: inputMetadata.height,
      },
      master: {
        path: masterPath,
        bytes: writtenMaster.length,
        sha256: sha256(writtenMaster),
      },
      runtime: {
        path: runtimePath,
        bytes: writtenRuntime.length,
        sha256: sha256(writtenRuntime),
      },
      chromaInspection,
      helperInspection,
      runtimeInspection,
      helper,
      inputDeleted: false,
    };
  } finally {
    await rm(helperTemporaryRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const options = parseArguments(process.argv.slice(2));
  if (!options.input || !options.definitionId) {
    throw new Error(
      `${usage()}\n\n--input et --definition-id sont requis.`,
    );
  }
  const result = await processBiomeDecorV19(options);
  console.log(JSON.stringify(result, null, 2));
  console.log("Entrée PNG conservée après vérification des deux copies V19.");
}

const invokedAsScript =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
