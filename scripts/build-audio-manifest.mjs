import fs from "node:fs/promises";
import { createReadStream, watch } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const AUDIO_FORMATS = [
  { extension: ".ogg", mime: "audio/ogg" },
  { extension: ".mp3", mime: "audio/mpeg" },
  { extension: ".m4a", mime: "audio/mp4" },
  { extension: ".wav", mime: "audio/wav" },
  { extension: ".flac", mime: "audio/flac" },
  { extension: ".aac", mime: "audio/aac" },
  { extension: ".webm", mime: "audio/webm" },
  { extension: ".opus", mime: "audio/ogg; codecs=opus" },
];
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stableCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const digest = (file) => new Promise((resolve, reject) => {
  const hash = createHash("sha256"); const stream = createReadStream(file);
  stream.on("data", chunk => hash.update(chunk)); stream.on("error", reject); stream.on("end", () => resolve(hash.digest("hex")));
});
async function writeChanged(file, text) {
  let previous = ""; try { previous = await fs.readFile(file, "utf8"); } catch {}
  if (previous === text) return false;
  await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); return true;
}
export async function expectedAudioSlots(sourceFile = path.join(projectRoot, "app/game/sound.ts")) {
  const source = await fs.readFile(sourceFile, "utf8");
  const names = { sfx: "GameSfxId", ambience: "GameAudioBiome", music: "GameMusicContext" };
  return Object.entries(names).flatMap(([category, name]) => {
    const union = source.match(new RegExp(`export type ${name}\\s*=([\\s\\S]*?);`));
    if (!union) throw new Error(`Audio contract missing: ${name}`);
    return [...union[1].matchAll(/"([a-z0-9-]+)"/g)].map(([, id]) => ({ category, id }));
  });
}
export async function buildAudioManifest(options = {}) {
  const root = path.resolve(options.root ?? process.env.YAUTJA_AUDIO_ROOT ?? path.join(projectRoot, "public/audio"));
  const publicBase = (options.publicBase ?? process.env.YAUTJA_AUDIO_PUBLIC_BASE ?? "/audio").replace(/\/$/, "");
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(publicBase) || publicBase.startsWith("//") || publicBase.includes("..")) throw new Error("Audio public base must be a local absolute URL path");
  const slots = options.slots ?? await expectedAudioSlots(); const formats = options.formats ?? AUDIO_FORMATS;
  const entries = []; const ignored = [];
  for (const { category, id } of slots) {
    if (!["sfx", "ambience", "music"].includes(category) || !/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid audio slot");
    const folder = `${category}/${id}`; const absolute = path.join(root, category, id);
    let files = []; try { files = await fs.readdir(absolute, { withFileTypes: true }); } catch (error) { if (error.code !== "ENOENT") ignored.push({ folder, reason: "unreadable-directory" }); }
    const sources = [];
    for (const file of files) {
      const extension = path.extname(file.name).toLowerCase(); const format = formats.find(format => format.extension === extension);
      if (!file.isFile() || !format || file.name.startsWith(".")) continue;
      const absoluteFile = path.join(absolute, file.name);
      try {
        const stat = await fs.stat(absoluteFile);
        if (!stat.size) { ignored.push({ folder, file: file.name, reason: "empty-file" }); continue; }
        const sha256 = await digest(absoluteFile);
        sources.push({ url: `${publicBase}/${folder}/${encodeURIComponent(file.name)}?v=${sha256.slice(0, 16)}`, mime: format.mime, bytes: stat.size, sha256, priority: formats.indexOf(format) });
      } catch { ignored.push({ folder, file: file.name, reason: "unreadable-file" }); }
    }
    sources.sort((a, b) => a.priority - b.priority || stableCompare(a.url, b.url));
    entries.push({ id, category, folder, sources: sources.map(source => ({ url: source.url, mime: source.mime, bytes: source.bytes, sha256: source.sha256 })), fallback: category === "music" ? "silence" : "procedural" });
    if (options.init && !sources.length) {
      const marker = path.join(absolute, "missing.txt");
      try { await fs.access(marker); } catch {
        await fs.mkdir(absolute, { recursive: true });
        await fs.writeFile(marker, `Audio à fournir : ${folder}.\nUtilisation : ${category === "sfx" ? "événement sonore court, sans boucle" : "boucle de " + (category === "music" ? "musique" : "lieu")}.\nSecours : ${category === "music" ? "silence ; ambiance indépendante" : "générateur procédural existant"}.\nAjouter un vrai fichier MP3, WAV, OGG ou M4A ici. Le nom est libre.\nCe témoin n'empêche jamais un vrai fichier de jouer. Ne pas créer de faux fichiers audio vides.\n`);
      }
    }
  }
  ignored.sort((a, b) => stableCompare(JSON.stringify(a), JSON.stringify(b)));
  const version = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
  const manifest = { schemaVersion: 1, version, entries };
  const output = path.resolve(options.output ?? path.join(root, "manifest.json"));
  const changed = options.write === false ? false : await writeChanged(output, JSON.stringify(manifest, null, 2) + "\n");
  return { manifest, ignored, changed, output };
}
export async function watchAudioManifest(options = {}) {
  const root = path.resolve(options.root ?? process.env.YAUTJA_AUDIO_ROOT ?? path.join(projectRoot, "public/audio"));
  await fs.mkdir(root, { recursive: true }); await buildAudioManifest(options);
  let timer = null; let busy = false; let again = false;
  const rebuild = async () => {
    if (busy) { again = true; return; } busy = true;
    do { again = false; try { const result = await buildAudioManifest(options); if (result.changed) console.log(`[audio] inventory updated: ${result.manifest.entries.filter(entry => entry.sources.length).length} supplied slots`); } catch (error) { console.warn("[audio] inventory retry:", error.message); } } while (again);
    busy = false;
  };
  const watcher = watch(root, { recursive: true }, (_event, filename) => {
    if (!filename || String(filename).endsWith("manifest.json") || /\.(txt|md|tmp)$/i.test(String(filename))) return;
    if (timer) clearTimeout(timer); timer = setTimeout(() => { void rebuild(); }, 180);
  });
  return () => { if (timer) clearTimeout(timer); watcher.close(); };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const value = flag => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1]; };
  const options = { root: value("--root"), publicBase: value("--public-base"), output: value("--output"), init: args.includes("--init") };
  const result = await buildAudioManifest(options);
  console.log(`[audio] ${result.manifest.entries.length} slots, ${result.manifest.entries.filter(entry => entry.sources.length).length} supplied, ${result.ignored.length} ignored`);
  if (args.includes("--watch")) { const close = await watchAudioManifest(options); for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { close(); process.exit(0); }); }
}
