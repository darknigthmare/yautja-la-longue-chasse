import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const sourceDirectory = "art-source/v11/system-backgrounds";
const outputDirectory = "public/game/backgrounds/v11/systems";
const manifestPath = join(sourceDirectory, "manifest.json");

const backgrounds = Object.freeze([
  {
    systemId: "system-oseris",
    backgroundKey: "oseris-amber-canopy",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Oseris system: amber mineral dust, faint ancient mining routes, warm amber and restrained green light, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-nivalis",
    backgroundKey: "nivalis-crystal-halo",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Nivalis system: blue-white nebula, crystalline ice dust and aurora ribbons, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-cinder",
    backgroundKey: "cinder-forge-dust",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Cinder system: ember-red fractures, soot clouds and distant industrial wreck silhouettes, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-naraka",
    backgroundKey: "naraka-toxic-veil",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Naraka system: toxic emerald vapor, yellow-green storm clouds and sparse wreck fragments, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-serekh",
    backgroundKey: "serekh-copper-pilgrimage",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Serekh system: copper and ochre mineral dust with ancient debris arcs, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-pelagos",
    backgroundKey: "pelagos-abyssal-blue",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Pelagos system: blue and turquoise abyssal currents, plankton-like specks and remote storm spirals, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-mycora",
    backgroundKey: "mycora-spore-cloud",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Mycora system: violet organic filaments, fungal spore motes and subtle bioluminescent cellular patterns, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-acheron",
    backgroundKey: "acheron-pale-ruins",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Acheron system: pale ash dust, dead orbital-city silhouettes and sparse automation lights, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-kaail",
    backgroundKey: "kaail-hunting-preserve",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Kaail system: gold and olive sanctuary dust rings with hunting-reserve rocks, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-vardos",
    backgroundKey: "vardos-binary-foundries",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Vardos system: twin orange illumination, shipyard lattice and an industrial orbital corridor, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-umbra",
    backgroundKey: "umbra-pulsar-lattice",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Umbra system: violet pulsar beams, shockwave haze and blue electrical filaments, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
  {
    systemId: "system-tempest",
    backgroundKey: "tempest-ion-vortex",
    prompt: "Original cinematic dark retro-science-fiction stellar background for the Tempest system: cyan-white storm fronts, plasma veins and restrained gold ion light, wide 16:9 composition with navigational breathing room around 40% x and 50% y. No interface, text, watermark, ship, character, large planet, central star, logo, or trademark.",
  },
]);

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

await mkdir(outputDirectory, { recursive: true });

const assets = [];
for (const entry of backgrounds) {
  const masterPath = join(sourceDirectory, `${entry.systemId}-master.png`);
  const runtimePath = join(outputDirectory, `${entry.systemId}.webp`);
  const master = await readFile(masterPath);
  const metadata = await sharp(master).metadata();
  if (metadata.width !== 1672 || metadata.height !== 941 || metadata.format !== "png") {
    throw new Error(
      `Expected ${masterPath} to be a 1672x941 PNG, received ${metadata.width}x${metadata.height} ${metadata.format}`,
    );
  }

  const runtime = await sharp(master)
    .webp({ quality: 82, effort: 6, smartSubsample: true })
    .toBuffer();
  await writeFile(runtimePath, runtime);

  assets.push({
    ...entry,
    master: masterPath.replaceAll("\\", "/"),
    masterSha256: sha256(master),
    runtime: runtimePath.replaceAll("\\", "/"),
    runtimeSha256: sha256(runtime),
    runtimeBytes: runtime.byteLength,
    dimensions: { width: 1672, height: 941 },
  });
}

await mkdir(dirname(manifestPath), { recursive: true });
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      createdAt: "2026-07-22",
      generator: "OpenAI built-in image_gen + deterministic Sharp WebP export",
      composition: "Original 16:9 stellar chart backdrops with the star/navigation center kept clear around 40% x and 50% y.",
      count: assets.length,
      assets,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Galaxy V11 system backgrounds: ${assets.length}/12`);
console.log(manifestPath);
