import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import sharp from "sharp";
sharp.cache(false);
sharp.concurrency(1);

// Technical conversion of already supplied PNGs. Never run code from a source pack.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTAKE = path.join(ROOT, "work/v37/tribe-intake");
const PUBLIC = path.join(ROOT, "public/game/assets/v37/tribes");
const MANIFEST = path.join(ROOT, "app/game/tribeArtV37.json");
const REPORT = path.join(ROOT, "docs/tribe-art-import-v37.json");
const STAGING = path.join(PUBLIC, ".staging");
const RESERVE_BYTES = 600 * 1024 * 1024;
const MAX_PIXELS = 32 * 1024 * 1024;
const EXPECTED_PACKS = { V2: 119, V3: 45, V4: 40 };
const THUMBNAIL_OPTIONS = { width: 320, height: 220, fit: "inside", withoutEnlargement: true };
const KIND_LABELS = {
  "planet-character": "Chasseurs des planètes", "planet-scene": "Paysages planétaires", material: "Matières",
  "homeworld-character": "Membres des tribus", "homeworld-scene": "Lieux des tribus", objects: "Objets et créatures",
  flora: "Végétation des tribus", legacy: "Originaux V1 retrouvés", nature: "Éléments naturels", passages: "Passages et structures",
};
const FOLDER_KINDS = {
  planet_characters: "planet-character", planet_environments: "planet-scene", materials: "material",
  homeworld_characters: "homeworld-character", homeworld_scenes: "homeworld-scene", objects: "objects",
  objets: "objects", flora: "flora", originaux_recuperes: "legacy", nature: "nature", passages: "passages",
  personnages: "homeworld-character", lieux: "homeworld-scene",
};
const hash = data => createHash("sha256").update(data).digest("hex");
const relative = target => path.relative(ROOT, target).split(path.sep).join("/");
const publicUrl = target => "/" + path.relative(path.join(ROOT, "public"), target).split(path.sep).join("/");

function assertInside(base, target) {
  const rel = path.relative(base, target);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Path outside the permitted import directory");
  return target;
}
async function checkedPath(base, target) {
  assertInside(base, target);
  const canonicalBase = await fs.realpath(base);
  let cursor = target;
  while (cursor !== base) {
    try {
      const stats = await fs.lstat(cursor);
      if (stats.isSymbolicLink()) throw new Error("Linked import path rejected");
      assertInside(canonicalBase, await fs.realpath(cursor));
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    cursor = path.dirname(cursor);
  }
  return target;
}
async function exists(target) { try { return (await fs.stat(target)).isFile(); } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function diskGuard(estimate = 0) {
  // The existing public root may live on the project's configured second volume.
  for (const location of [ROOT, path.join(ROOT, "public")]) {
    const disk = await fs.statfs(location);
    if (disk.bavail * disk.bsize < RESERVE_BYTES + estimate) throw new Error("Disk reserve would be consumed by tribe import");
  }
}
async function writeJson(target, data) {
  await checkedPath(ROOT, target);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2) + "\n");
}
async function pixelInfo(target) {
  const image = sharp(target, { limitInputPixels: MAX_PIXELS });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS || (metadata.pages ?? 1) !== 1) {
    throw new Error("Unsupported dimensions or animated image");
  }
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error("Expected four decoded RGBA channels");
  let min = 255; let max = 0; let transparent = 0; let partial = 0;
  for (let i = 3; i < data.length; i += 4) {
    min = Math.min(min, data[i]); max = Math.max(max, data[i]);
    if (data[i] === 0) transparent += 1;
    else if (data[i] !== 255) partial += 1;
  }
  return { width: info.width, height: info.height, pixelSha256: hash(data),
    alphaMin: min, alphaMax: max, transparentPixels: transparent, partialAlphaPixels: partial,
    hasAlphaChannel: metadata.hasAlpha, format: metadata.format };
}

// Pillow exposes libwebp's exact flag; it preserves RGB even where alpha is zero.
// Source paths enter through JSON stdin, never by interpolating code or shell text.
const PYTHON_ENCODER = String.raw`
import sys, json
from PIL import Image
import PIL
Image.MAX_IMAGE_PIXELS = 32 * 1024 * 1024
for line in sys.stdin:
    try:
        job = json.loads(line)
        with Image.open(job["source"]) as image:
            if image.format != "PNG" or image.width * image.height > Image.MAX_IMAGE_PIXELS or getattr(image, "n_frames", 1) != 1:
                raise ValueError("Unsupported source image")
            image.load()
            image.save(job["target"], format="WEBP", lossless=True, quality=100, method=4, exact=True)
        print(json.dumps({"ok": True, "pillowVersion": PIL.__version__}), flush=True)
    except Exception as error:
        print(json.dumps({"ok": False, "error": type(error).__name__ + ": " + str(error)}), flush=True)
`;
function createEncoder() {
  const child = spawn(process.env.PYTHON ?? "python", ["-u", "-c", PYTHON_ENCODER], { cwd: ROOT, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  let pending = null; let failure = null; let diagnostics = "";
  const lines = createInterface({ input: child.stdout });
  child.stderr.on("data", data => { diagnostics = (diagnostics + data.toString()).slice(-2000); });
  child.on("error", error => { failure = error; if (pending) { pending.reject(error); pending = null; } });
  const closed = new Promise(resolve => child.on("close", code => {
    if (code !== 0) failure = new Error(`Exact WebP encoder failed (${code}): ${diagnostics}`);
    if (pending) { pending.reject(failure ?? new Error("Encoder closed early")); pending = null; }
    resolve();
  }));
  lines.on("line", line => {
    if (!pending) return;
    const request = pending; pending = null;
    try { const result = JSON.parse(line); if (!result.ok) throw new Error(result.error); request.resolve(result); }
    catch (error) { request.reject(error); }
  });
  return {
    encode: (source, target) => new Promise((resolve, reject) => {
      if (failure) { reject(failure); return; }
      if (pending) { reject(new Error("Only one encode per worker is allowed")); return; }
      pending = { resolve, reject }; child.stdin.write(JSON.stringify({ source, target }) + "\n");
    }),
    close: async () => { child.stdin.end(); await closed; lines.close(); },
  };
}

function labelFor(name) {
  const stem = name.replace(/\.png$/i, "").replace(/_V\d+$/i, "");
  if (stem === "FAUNE_SLUMS") return "Automate des Forges Basses";
  return stem.split("_").map(word => /^(?:[IVX]+|\d+)$/.test(word) ? word : word[0] + word.slice(1).toLowerCase()).join(" ");
}
function usageFor(kind, entry) {
  if (entry.canonicalPath.endsWith("FAUNE_SLUMS_V2.png")) return "Robot/automate original statique, pas un animal. Assemblage complet ; animation et pièces mobiles non fournies.";
  if (kind === "material") return "Référence de matière couleur ; raccord répétable et cartes PBR non garantis. Aucun matériau de terrain automatiquement créé.";
  if (kind === "planet-scene" || kind === "homeworld-scene") return "Scène complète aplatie ; aucun plan ou sous-plan de parallaxe séparé. Illustration, pas niveau jouable ni collision.";
  if (kind === "homeworld-character" || kind === "planet-character") return entry.packId === "v4"
    ? "Membre original statique en pied, vue frontale ou trois-quarts ; pas sprite latéral animé. Corps et équipement fusionnés dans cette illustration."
    : "Illustration statique en pied ; aucun cycle animé ni équipement séparé. Orientation et anatomie à valider avant usage en jeu latéral.";
  if (kind === "passages") return "Structure statique complète en un seul état ; ancrages, collisions, ouverture et pièces mobiles restent à définir. Pas de calques d’animation livrés.";
  if (kind === "legacy") return "Original V1 retrouvé, conservé comme référence distincte de sa version V2. Illustration statique ; aucun découpage ni cycle animé ajouté.";
  if (kind === "flora" || kind === "nature") return "Élément naturel statique ; placement, échelle et appuis restent à valider. Aucun calque animé ou collision automatiquement ajouté.";
  return "Objet, assemblage ou créature statique original ; pas planche d’animation ni équipement modulaire validé. Ancrages et interactions restent à définir.";
}
function describe(entry) {
  const folder = entry.folderFamily.split("/").at(-1);
  const kind = FOLDER_KINDS[folder];
  if (!kind) throw new Error(`Unmapped tribe family: ${folder}`);
  const sourceName = path.posix.basename(entry.canonicalPath);
  const slug = sourceName.replace(/\.png$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const pack = entry.packId.toUpperCase();
  const id = `${entry.packId}-${slug}`;
  const master = path.join(PUBLIC, entry.packId, `${slug}--${entry.sha256.slice(0, 16)}.webp`);
  const thumbnail = path.join(PUBLIC, "thumbnails", entry.packId, `${slug}--${entry.sha256.slice(0, 16)}.webp`);
  return { id, label: labelFor(sourceName), subject: entry.sourceMetadata?.world ?? entry.subjectKey.replaceAll("_", " "),
    kind, category: KIND_LABELS[kind], pack, sourceName, src: publicUrl(master), thumbnailSrc: publicUrl(thumbnail),
    width: entry.png.width, height: entry.png.height, sha256: entry.sha256, usageNote: usageFor(kind, entry), master, thumbnail };
}
function samePixels(before, after) {
  return before.pixelSha256 === after.pixelSha256 && before.width === after.width && before.height === after.height &&
    before.alphaMin === after.alphaMin && before.alphaMax === after.alphaMax && before.transparentPixels === after.transparentPixels &&
    before.partialAlphaPixels === after.partialAlphaPixels;
}
async function checkedPublic(url) {
  if (typeof url !== "string" || !url.startsWith("/game/assets/v37/tribes/") || url.includes("..")) throw new Error("Unexpected published tribe URL");
  return checkedPath(PUBLIC, path.join(ROOT, "public", url.slice(1)));
}

async function checkPublished() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  const report = JSON.parse(await fs.readFile(REPORT, "utf8"));
  if (manifest.assets.length !== 204 || report.assets.length !== 204) throw new Error("Expected 204 published references");
  const proofs = new Map(report.assets.map(asset => [asset.id, asset]));
  for (const asset of manifest.assets) {
    const proof = proofs.get(asset.id);
    if (!proof || proof.sourceSha256 !== asset.sha256 || proof.pixelSha256 !== asset.pixelSha256) throw new Error(`Missing source proof: ${asset.id}`);
    const master = await checkedPublic(asset.src); const thumbnail = await checkedPublic(asset.thumbnailSrc);
    const pixels = await pixelInfo(master);
    if (pixels.pixelSha256 !== asset.pixelSha256 || pixels.width !== asset.width || pixels.height !== asset.height ||
      hash(await fs.readFile(master)) !== proof.outputSha256) throw new Error(`Changed reference pixels: ${asset.id}`);
    const thumbInfo = await sharp(thumbnail).metadata();
    if (!thumbInfo.width || !thumbInfo.height || thumbInfo.width > 320 || thumbInfo.height > 220 ||
      hash(await fs.readFile(thumbnail)) !== proof.thumbnailSha256) throw new Error(`Changed thumbnail: ${asset.id}`);
  }
  console.log(JSON.stringify({ status: "passed", assets: 204, comparison: "all RGBA bytes, including RGB under alpha zero", sourceMastersReopened: false }));
}

async function importAssets() {
  const inventory = JSON.parse(await fs.readFile(path.join(INTAKE, "inventory.json"), "utf8"));
  const entries = inventory.files.filter(entry => entry.png);
  if (inventory.status !== "complete" || entries.length !== 204 || inventory.packManifestReconciliation?.some(pack => pack.status !== "passed")) {
    throw new Error("A complete, reconciled intake with 204 PNGs is required");
  }
  for (const [pack, count] of Object.entries(EXPECTED_PACKS)) {
    if (entries.filter(entry => entry.packId.toUpperCase() === pack).length !== count) throw new Error("Pack count mismatch");
  }
  const descriptions = entries.map(describe);
  if (new Set(descriptions.map(item => item.id)).size !== 204) throw new Error("Duplicate asset ID");
  await checkedPath(path.join(ROOT, "public"), PUBLIC); await fs.mkdir(PUBLIC, { recursive: true });
  await checkedPath(PUBLIC, STAGING); await fs.mkdir(STAGING, { recursive: true });
  await diskGuard();
  const oldReport = await exists(REPORT) ? JSON.parse(await fs.readFile(REPORT, "utf8")) : null;
  const oldProofs = new Map((oldReport?.assets ?? []).map(asset => [asset.id, asset]));
  const assets = new Array(entries.length); const proofs = new Array(entries.length);
  const workers = [createEncoder(), createEncoder()];
  let cursor = 0; let done = 0; let reused = 0; let pillowVersion = null;
  try {
    await Promise.all(workers.map(async encoder => {
      while (cursor < entries.length) {
        const index = cursor++; const entry = entries[index]; const description = descriptions[index];
        if (!/^[a-f0-9]{64}$/.test(entry.sha256) || entry.png.frameCount !== 1) throw new Error("Invalid source proof");
        const source = await checkedPath(INTAKE, path.resolve(INTAKE, entry.extractedRelativePath));
        const sourceBytes = await fs.readFile(source);
        if (hash(sourceBytes) !== entry.sha256 || sourceBytes.length !== entry.bytes) throw new Error(`Source changed: ${description.id}`);
        const before = await pixelInfo(source);
        if (before.width !== entry.png.width || before.height !== entry.png.height || before.alphaMin !== entry.png.alphaMin || before.alphaMax !== entry.png.alphaMax) {
          throw new Error(`Source dimensions/alpha mismatch: ${description.id}`);
        }
        const { master, thumbnail, ...asset } = description;
        await checkedPath(PUBLIC, master); await checkedPath(PUBLIC, thumbnail);
        await fs.mkdir(path.dirname(master), { recursive: true }); await fs.mkdir(path.dirname(thumbnail), { recursive: true });
        let resumed = false;
        if (await exists(master)) {
          const present = await pixelInfo(master);
          if (!samePixels(before, present)) throw new Error(`Refusing to overwrite an existing mismatched master: ${asset.id}`);
          resumed = true; reused += 1;
        } else {
          await diskGuard(entry.bytes * 2);
          const temporary = await checkedPath(STAGING, path.join(STAGING, `${asset.id}.master.tmp`));
          if (await exists(temporary)) throw new Error(`Staging file already exists: ${asset.id}`);
          try {
            const encoded = await encoder.encode(source, temporary); pillowVersion = encoded.pillowVersion;
            const after = await pixelInfo(temporary);
            if (!samePixels(before, after)) throw new Error(`Lossless RGBA verification failed: ${asset.id}`);
            await fs.rename(temporary, master);
          } finally { if (await exists(temporary)) { await checkedPath(STAGING, temporary); await fs.unlink(temporary); } }
        }
        const previous = oldProofs.get(asset.id);
        const reuseThumbnail = previous?.sourceSha256 === entry.sha256 && await exists(thumbnail) &&
          hash(await fs.readFile(thumbnail)) === previous.thumbnailSha256;
        if (!reuseThumbnail) {
          const temporary = await checkedPath(STAGING, path.join(STAGING, `${asset.id}.thumbnail.tmp`));
          if (await exists(temporary)) throw new Error(`Thumbnail staging file already exists: ${asset.id}`);
          try {
            await sharp(source, { limitInputPixels: MAX_PIXELS }).resize(THUMBNAIL_OPTIONS).webp({ quality: 80, alphaQuality: 100, effort: 4 }).toFile(temporary);
            if (await exists(thumbnail)) { await checkedPath(PUBLIC, thumbnail); await fs.unlink(thumbnail); }
            await fs.rename(temporary, thumbnail);
          } finally { if (await exists(temporary)) { await checkedPath(STAGING, temporary); await fs.unlink(temporary); } }
        }
        const finalPixels = await pixelInfo(master);
        if (!samePixels(before, finalPixels)) throw new Error(`Published RGBA differs from source: ${asset.id}`);
        const thumbnailInfo = await sharp(thumbnail).metadata();
        if (thumbnailInfo.width > 320 || thumbnailInfo.height > 220) throw new Error("Thumbnail exceeds the view budget");
        assets[index] = { ...asset, pixelSha256: before.pixelSha256 };
        proofs[index] = { id: asset.id, pack: asset.pack, sourceName: asset.sourceName, sourceSha256: entry.sha256,
          sourceBytes: entry.bytes, pixelSha256: before.pixelSha256, width: before.width, height: before.height,
          alphaMin: before.alphaMin, alphaMax: before.alphaMax, transparentPixels: before.transparentPixels,
          partialAlphaPixels: before.partialAlphaPixels, sourceHasAlphaChannel: before.hasAlphaChannel,
          comparison: "strict decoded RGBA equality, including RGB at alpha zero", outputFormat: "webp", output: asset.src,
          outputSha256: hash(await fs.readFile(master)), outputBytes: (await fs.stat(master)).size,
          thumbnail: asset.thumbnailSrc, thumbnailSha256: hash(await fs.readFile(thumbnail)),
          thumbnailWidth: thumbnailInfo.width, thumbnailHeight: thumbnailInfo.height, thumbnailBytes: (await fs.stat(thumbnail)).size,
          resumed, sourceOrigin: entry.sourceMetadata?.origin ?? null };
        done += 1;
        if (done % 10 === 0 || done === entries.length) console.log(JSON.stringify({ progress: done, total: entries.length, lastId: asset.id }));
      }
    }));
  } finally { await Promise.all(workers.map(encoder => encoder.close())); }
  const manifest = { assets, kinds: Object.entries(KIND_LABELS).map(([id, label]) => ({ id, label })),
    packs: Object.entries(EXPECTED_PACKS).map(([id, count]) => ({ id, label: `${id} · ${count} images` })) };
  const report = { schemaVersion: 1, status: "passed", assetCount: 204,
    scope: "Static reference library only; no animation, level, collision, lore canon or modular runtime promotion",
    masters: "Private PNG originals retained without modification; no source filesystem path is published",
    conversion: { codec: "Pillow/libwebp", pillowVersion: pillowVersion ?? oldReport?.conversion?.pillowVersion ?? "not-used-on-resume",
      lossless: true, exact: true, quality: 100, method: 4, concurrency: 2,
      comparison: "SHA-256 of all decoded RGBA bytes, including invisible RGB under alpha zero, plus dimensions and alpha counts",
      thumbnail: { width: 320, height: 220, fit: "inside", quality: 80, alphaQuality: 100, meaning: "lossy consultation preview, not the master" } },
    archives: inventory.archives.map(archive => ({ name: path.basename(archive.sourceArchive), sha256: archive.archiveSha256, pngCount: archive.pngCount })),
    totals: { sourcePngBytes: proofs.reduce((sum, entry) => sum + entry.sourceBytes, 0),
      publishedMasterBytes: proofs.reduce((sum, entry) => sum + entry.outputBytes, 0),
      thumbnailBytes: proofs.reduce((sum, entry) => sum + entry.thumbnailBytes, 0), reusedMasters: reused },
    limitations: ["V2 includes 15 recovered V1 originals; different revisions remain distinct", "V5 is not included",
      "Mycora-Nox is not silently mapped to Mycora-V", "Scenes are flattened, not separated parallax layers",
      "Materials have no verified seamless tiling or PBR maps", "Full-body static illustrations do not satisfy the expedition animation contract"], assets: proofs };
  if (/C:\\|C:\/|Users[\\/]|Downloads[\\/]|work\/v37/.test(JSON.stringify(report))) throw new Error("Private filesystem path leaked into the public import report");
  await writeJson(MANIFEST, manifest); await writeJson(REPORT, report);
  console.log(JSON.stringify({ status: "passed", assetCount: assets.length, reusedMasters: reused,
    manifest: relative(MANIFEST), report: relative(REPORT), totals: report.totals }));
}

const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => arg !== "--check")) throw new Error("Usage: node scripts/import-tribe-art-v37.mjs [--check]");
if (args[0] === "--check") await checkPublished();
else await importAssets();
