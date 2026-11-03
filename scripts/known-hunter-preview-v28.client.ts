import { processHunterSpriteTransparency, type HunterSpriteTransparency } from "../app/game/hunterSpriteAtlas";

interface ReviewFrame {
  index: number; stage: string; rect: [number, number, number, number];
  pivot: [number, number]; durationTicks: number;
}
interface ReviewEntry {
  id: string; characterId: string; name: string; species: "human" | "yautja";
  family: string; familyLabel: string; variantId: string; variantLabel: string;
  action: string; status: "draft" | "rejected" | "validated"; loop: boolean; notes: string[];
  reviewScale: number; ticksPerSecond: number; sourceBatch: string; image: string;
  transparency: HunterSpriteTransparency;
  source: { path: string; sha256: string; width: number; height: number; hasAlpha: boolean };
  frames: ReviewFrame[];
}
interface ReviewData {
  entries: ReviewEntry[];
  counts: { sheets: number; cells: number; subjects: number; variants: number; humanSheets: number; yautjaSheets: number };
}
declare global {
  interface Window {
    __hunterReviewV28: ReviewData;
    knownHunterReviewState: Record<string, unknown>;
  }
}
const data = window.__hunterReviewV28;
const entries = data.entries;
function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error("Missing review control " + id);
  return found as T;
}
if (window.location.protocol === "file:") element("lab-link").hidden = true;
const species = element<HTMLSelectElement>("species"), family = element<HTMLSelectElement>("family");
const selector = element<HTMLSelectElement>("sequence"), play = element<HTMLButtonElement>("play");
const slider = element<HTMLInputElement>("frame"), loop = element<HTMLInputElement>("loop");
const registered = element<HTMLInputElement>("registered"), onion = element<HTMLInputElement>("onion");
const matte = element<HTMLSelectElement>("matte"), background = element<HTMLSelectElement>("background");
const speed = element<HTMLSelectElement>("speed");
const previousButton = element<HTMLButtonElement>("previous"), nextButton = element<HTMLButtonElement>("next");
const sprite = element<HTMLCanvasElement>("sprite"), sheet = element<HTMLCanvasElement>("sheet");
const context = sprite.getContext("2d")!, sheetContext = sheet.getContext("2d")!;
const worldX = 320, worldY = 548;
let selected: ReviewEntry | null = null, frameIndex = 0, playing = false, version = 0, last = 0, accumulator = 0;
let source: HTMLImageElement | null = null, raw: HTMLCanvasElement | null = null;
let simple: HTMLCanvasElement | null = null, clean: HTMLCanvasElement | null = null;
let fringePixels = 0, keyedPixels = 0;
const metrics = new Map<string, { visiblePixels: number; edgePixels: number }>();
const familyLabels: Record<string, string> = {
  "humans-in-yautja-armor": "Humains en armure Yautja", "known-yautja": "Yautja connus",
};
const statusLabels = { draft: "Brouillon", rejected: "Refusé", validated: "Validé artistiquement · hors gameplay" };
const stageLabels: Record<string, string> = {
  "raise-blade-guard": "levée de la machette", "high-guard-hold": "maintien de garde",
  "lower-blade": "abaissement de la lame", "recoil-peak": "recul maximal",
  "fold-forward": "flexion de récupération", "recover-upright": "retour debout",
  "initial-brace": "mise en appui", "backward-chest-recoil": "recul du buste",
  "maximum-backward-stagger": "déséquilibre maximal", "low-forward-recovery": "récupération basse",
  "rise-and-reset": "redressement et reprise", "recovered-guard": "garde retrouvée",
  "ready-1": "attente 1", "ready-2": "attente 2", "ready-3": "attente 3",
  "ready-4": "attente 4", "ready-5": "attente 5", "ready-6": "attente 6",

  "low-ready": "garde basse", "raise-rifle": "levée du fusil", "raised-defensive-aim": "visée défensive",
  "braced-recoil": "recul stabilisé", "lower-rifle": "abaissement du fusil",
  "initial-impact": "début de l’impact", "peak-standing-recoil": "recul maximal",
  "catch-balance": "reprise d’équilibre", "rising-recovery": "redressement",
  "raising-high-guard": "montée en garde", "blocked-impact-compression": "compression au blocage",
  "guard-recovery": "retour de garde", "ready-recovered": "retour prêt",
  "impact-recoil": "recul à l’impact", "maximum-recoil": "recul maximal",
  "forward-low-recovery": "récupération basse",

  ready: "prêt", idle: "attente", recover: "récupération", "high-guard": "garde haute",
  "return-ready": "retour en garde", "raise-forearms": "montée des avant-bras",
  "absorb-recoil": "absorption du choc", "folded-guard": "bouclier replié",
  "raise-and-start-unfold": "levée et ouverture", "half-unfolded": "ouverture intermédiaire",
  "fully-deployed": "bouclier déployé", "fold-and-lower": "repli et abaissement",
  "return-folded": "retour bouclier replié",
};
element("summary").textContent = data.counts.sheets + " séquences · " + data.counts.cells +
  " cellules · " + data.counts.subjects + " personnages · " + data.counts.variants + " variantes";
element("species-counts").textContent = data.counts.humanSheets + " planches de personnages humains · " +
  data.counts.yautjaSheets + " planches de Yautja";
for (const key of [...new Set(entries.map(entry => entry.family))].sort()) {
  const option = document.createElement("option");
  option.value = key;
  const entry = entries.find(entry => entry.family === key)!;
  option.textContent = entry.familyLabel !== key ? entry.familyLabel : familyLabels[key] ?? key;
  family.append(option);
}
function stop() {
  playing = false; play.textContent = "Lire"; play.setAttribute("aria-pressed", "false"); accumulator = 0;
}
function enablePlayback(enabled: boolean) {
  for (const control of [play, previousButton, nextButton, slider, loop]) control.disabled = !enabled;
}
function clearCanvases() {
  context.fillStyle = background.value; context.fillRect(0, 0, sprite.width, sprite.height);
  sheetContext.clearRect(0, 0, sheet.width, sheet.height);
}
function activeCanvas(): HTMLCanvasElement | null {
  return matte.value === "source" ? raw : matte.value === "key" ? simple : clean;
}
function frameMetrics(frame: ReviewFrame) {
  const key = matte.value + ":" + frameIndex;
  const cached = metrics.get(key);
  if (cached) return cached;
  const canvas = activeCanvas();
  if (!canvas) return { visiblePixels: 0, edgePixels: 0 };
  const pixels = canvas.getContext("2d")!.getImageData(...frame.rect).data;
  let visiblePixels = 0, edgePixels = 0;
  const width = frame.rect[2], height = frame.rect[3];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3] === 0) continue;
    visiblePixels++;
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) edgePixels++;
  }
  const result = { visiblePixels, edgePixels };
  metrics.set(key, result);
  return result;
}
function drawPose(index: number, opacity: number) {
  if (!selected) return;
  const canvas = activeCanvas();
  if (!canvas) return;
  const frame = selected.frames[index];
  const pivot = registered.checked ? frame.pivot : [frame.rect[2] / 2, frame.rect[3]];
  // One constant actor scale for the whole clip, regardless of individual bounds.
  const scale = selected.reviewScale;
  context.globalAlpha = opacity;
  context.drawImage(canvas, ...frame.rect, worldX - pivot[0] * scale, worldY - pivot[1] * scale,
    frame.rect[2] * scale, frame.rect[3] * scale);
  context.globalAlpha = 1;
}
function draw() {
  clearCanvases();
  if (!selected || !source) return;
  const entry = selected, frame = entry.frames[frameIndex];
  context.imageSmoothingEnabled = false;
  context.strokeStyle = "#619c69"; context.beginPath(); context.moveTo(12, worldY); context.lineTo(628, worldY); context.stroke();
  if (onion.checked && frameIndex > 0) drawPose(frameIndex - 1, 0.25);
  drawPose(frameIndex, 1);
  context.strokeStyle = "#f1d291"; context.beginPath();
  context.moveTo(worldX - 6, worldY); context.lineTo(worldX + 6, worldY);
  context.moveTo(worldX, worldY - 6); context.lineTo(worldX, worldY + 6); context.stroke();
  // Full sheets retain their actual aspect ratio, including portrait sources.
  const sheetScale = Math.min(sheet.width / entry.source.width, sheet.height / entry.source.height);
  const offsetX = (sheet.width - entry.source.width * sheetScale) / 2;
  const offsetY = (sheet.height - entry.source.height * sheetScale) / 2;
  sheetContext.imageSmoothingEnabled = false;
  sheetContext.drawImage(source, offsetX, offsetY, entry.source.width * sheetScale, entry.source.height * sheetScale);
  sheetContext.strokeStyle = "#ffd184"; sheetContext.lineWidth = 2;
  sheetContext.strokeRect(offsetX + frame.rect[0] * sheetScale, offsetY + frame.rect[1] * sheetScale,
    frame.rect[2] * sheetScale, frame.rect[3] * sheetScale);
  slider.value = String(frameIndex);
  element("counter").textContent = (frameIndex + 1) + " / " + entry.frames.length;
  element("stage").textContent = "Pose " + (frameIndex + 1) + " — " + (stageLabels[frame.stage] ?? frame.stage);
  previousButton.disabled = frameIndex === 0; nextButton.disabled = frameIndex === entry.frames.length - 1;
  for (const button of element("timeline").querySelectorAll("button")) {
    button.setAttribute("aria-current", Number(button.dataset.index) === frameIndex ? "step" : "false");
  }
  const measurement = frameMetrics(frame);
  const displayedFringePixels = matte.value === "fringe" ? fringePixels : 0;
  const displayedKeyedPixels = matte.value === "source" ? 0 : keyedPixels;
  const transparencyLabel = entry.source.hasAlpha ? "alpha natif conservé" : "PNG RGB opaque · clé déclarée";
  element("facts").textContent = entry.source.width + " × " + entry.source.height + " · " + transparencyLabel +
    " · échelle constante ×" + entry.reviewScale + " · " + measurement.edgePixels +
    " pixels visibles sur le bord du rectangle · " + displayedFringePixels + " pixels de liseré traités. SHA256 : " + entry.source.sha256;
  sprite.setAttribute("aria-label", entry.name + ", " + entry.variantLabel + ", pose " + (frameIndex + 1));
  window.knownHunterReviewState = {
    id: entry.id, species: entry.species, family: entry.family, variantId: entry.variantId,
    status: entry.status, frame: frameIndex, frames: entry.frames.length, playing, ready: true,
    registered: registered.checked, scale: entry.reviewScale, matte: matte.value,
    sourceAlpha: entry.source.hasAlpha, fringePixels: displayedFringePixels, keyedPixels: displayedKeyedPixels, ...measurement,
    complete: false, gameplayIntegrated: false,
  };
}
function selectFrame(index: number) {
  if (!source || !selected) return;
  stop(); frameIndex = Math.max(0, Math.min(selected.frames.length - 1, index)); draw();
}
function canvasFrom(pixels: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d")!, image = ctx.createImageData(width, height);
  image.data.set(pixels); ctx.putImageData(image, 0, 0); return canvas;
}
async function selectEntry() {
  const token = ++version;
  stop(); enablePlayback(false); source = null; raw = null; simple = null; clean = null; metrics.clear();
  frameIndex = 0; fringePixels = 0; keyedPixels = 0;
  selected = entries.find(entry => entry.id === selector.value) ?? null;
  window.knownHunterReviewState = { ready: false, complete: false, gameplayIntegrated: false };
  element("error").textContent = ""; clearCanvases();
  for (const id of ["facts", "stage", "counter"]) element(id).textContent = "";
  if (!selected) {
    element("name").textContent = "Aucune séquence dans ces filtres";
    for (const id of ["identity", "status", "facts", "stage", "counter"]) element(id).textContent = "";
    element("timeline").replaceChildren(); element("notes").replaceChildren(); return;
  }
  const entry = selected;
  loop.checked = entry.loop; slider.max = String(entry.frames.length - 1); slider.value = "0";
  element("name").textContent = entry.name + " — " + entry.action;
  element("identity").textContent = "Espèce : " + (entry.species === "human" ? "humaine" : "Yautja") +
    " · Variante : " + entry.variantLabel + " · Source " + entry.sourceBatch;
  element("status").textContent = statusLabels[entry.status];
  element("notes").replaceChildren(...entry.notes.map(note => { const li = document.createElement("li"); li.textContent = note; return li; }));
  element("timeline").replaceChildren(...entry.frames.map((_, index) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = String(index + 1);
    button.dataset.index = String(index); button.setAttribute("aria-label", "Afficher la pose " + (index + 1));
    button.onclick = () => selectFrame(index); return button;
  }));
  const alpha = entry.transparency.mode === "alpha";
  matte.options[0].textContent = alpha ? "Source · alpha natif" : "Source · RGB opaque";
  matte.options[1].disabled = alpha;
  const hasFringe = entry.transparency.mode === "color-key" && entry.transparency.fringe !== undefined;
  matte.options[2].disabled = !hasFringe;
  matte.value = alpha ? "source" : hasFringe ? "fringe" : "key";
  try {
    const image = new Image(); image.src = entry.image; await image.decode();
    if (token !== version) return;
    if (image.naturalWidth !== entry.source.width || image.naturalHeight !== entry.source.height) {
      throw new Error("Dimensions décodées différentes du manifeste.");
    }
    raw = document.createElement("canvas"); raw.width = image.naturalWidth; raw.height = image.naturalHeight;
    const rawContext = raw.getContext("2d", { willReadFrequently: true })!;
    rawContext.drawImage(image, 0, 0);
    const pixels = rawContext.getImageData(0, 0, raw.width, raw.height).data;
    const keyOnly = entry.transparency.mode === "color-key"
      ? { mode: "color-key" as const, rgb: entry.transparency.rgb, tolerance: entry.transparency.tolerance }
      : entry.transparency;
    const basic = processHunterSpriteTransparency(pixels, raw.width, raw.height, keyOnly);
    const refined = processHunterSpriteTransparency(pixels, raw.width, raw.height, entry.transparency);
    simple = canvasFrom(basic.pixels, raw.width, raw.height); clean = canvasFrom(refined.pixels, raw.width, raw.height);
    fringePixels = refined.fringePixels; keyedPixels = refined.keyedPixels;
    source = image; enablePlayback(true); draw();
  } catch (reason) {
    if (token !== version) return;
    const message = reason instanceof Error ? reason.message : String(reason);
    element("error").textContent = "Chargement impossible : " + message; stop(); enablePlayback(false);
    for (const id of ["facts", "stage", "counter"]) element(id).textContent = "";
    window.knownHunterReviewState = { ready: false, error: message, complete: false, gameplayIntegrated: false };
  }
}
function filterEntries() {
  const oldId = selector.value;
  const visible = entries.filter(entry => (species.value === "all" || entry.species === species.value) &&
    (family.value === "all" || entry.family === family.value));
  selector.replaceChildren(...visible.map(entry => {
    const option = document.createElement("option"); option.value = entry.id;
    option.textContent = entry.name + " — " + entry.variantLabel + " — " + entry.action; return option;
  }));
  if (visible.some(entry => entry.id === oldId)) selector.value = oldId;
  selector.disabled = visible.length === 0;
  element("filtered-count").textContent = visible.length + " séquences affichées sur " + entries.length;
  void selectEntry();
}
for (const filter of [species, family]) filter.onchange = filterEntries;
selector.onchange = () => { void selectEntry(); };
play.onclick = () => {
  if (!selected || !source) return;
  if (playing) stop();
  else {
    if (frameIndex === selected.frames.length - 1) frameIndex = 0;
    playing = true; accumulator = 0; last = performance.now();
    play.textContent = "Pause"; play.setAttribute("aria-pressed", "true");
  }
  draw();
};
previousButton.onclick = () => selectFrame(frameIndex - 1);
nextButton.onclick = () => selectFrame(frameIndex + 1);
slider.oninput = () => selectFrame(Number(slider.value));
for (const control of [registered, onion, matte, background]) control.onchange = draw;
sprite.onkeydown = event => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault(); selectFrame(frameIndex + (event.key === "ArrowRight" ? 1 : -1));
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault(); selectFrame(event.key === "Home" ? 0 : (selected?.frames.length ?? 1) - 1);
  } else if (event.code === "Space") { event.preventDefault(); play.click(); }
};
function tick(now: number) {
  if (playing && source && selected) {
    accumulator += Math.min(250, Math.max(0, now - last)) / 1000 * selected.ticksPerSecond * Number(speed.value);
    while (playing && accumulator >= selected.frames[frameIndex].durationTicks) {
      accumulator -= selected.frames[frameIndex].durationTicks;
      if (frameIndex + 1 < selected.frames.length) frameIndex++;
      else if (loop.checked) frameIndex = 0;
      else stop();
    }
    last = now; draw();
  }
  requestAnimationFrame(tick);
}
document.addEventListener("visibilitychange", () => { if (document.hidden) { stop(); draw(); } });
window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", event => { if (event.matches) { stop(); draw(); } });
filterEntries(); requestAnimationFrame(tick);
