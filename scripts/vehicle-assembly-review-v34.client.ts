import { processHunterSpriteTransparency, type HunterSpriteTransparency } from '../app/game/hunterSpriteAtlas';

type Rect = [number, number, number, number];
type Point = [number, number];
type Facing = 'right' | 'left';

type ModuleTransform = {
  x: number;
  y: number;
  scale: number;
};

interface Resource {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
  sha256: string;
  status: 'authored-review';
  transparency: HunterSpriteTransparency;
}

interface Frame {
  facing: Facing;
  phase: string;
  sourceRect: Rect;
  visibleRect: Rect;
  sourcePivot?: Point;
}

interface AssemblyModule {
  id: string;
  label: string;
  resourceId: string;
  resourceIdByFacing?: Partial<Record<Facing, string>>;
  defaultEnabled: boolean;
  scale: number;
  layer?: 'behind' | 'front';
  anchorMode?: 'base-grid';
  transformByFacing?: Partial<Record<Facing, ModuleTransform>>;
  offsetByFacing?: Partial<Record<Facing, Point>>;
  socketId?: string;
  framesByFacing: Partial<Record<Facing, Frame[]>>;
}

interface Assembly {
  id: string;
  name: string;
  status: 'authored-review';
  calibrationStatus: 'static-pivot-review' | 'static-module-fit-review' | 'common-origin-unregistered' | 'estimated-flight-rig-review';
  playable: false;
  facings: Facing[];
  defaultFacing: Facing;
  notes: string[];
  anchor: Point;
  anchorByFacing?: Partial<Record<Facing, Point>>;
  base: {
    resourceId: string;
    scale: number;
    frameByFacing: Partial<Record<Facing, Frame>>;
    sourcePivot: Point;
    sourcePivotByFacing?: Partial<Record<Facing, Point>>;
  };
  sockets?: Record<string, { sourcePoint: Point; sourcePointByFacing?: Partial<Record<Facing, Point>> }>;
  modules: AssemblyModule[];
  animation?: { moduleId: string; linkedModuleIds?: string[]; label: string; fps: number };
}

interface Manifest {
  schemaVersion: number;
  title: string;
  state: 'review-only';
  playable: false;
  sourceBitmapsPreserved: boolean;
  transparencyPipeline: string;
  canvas: { width: number; height: number; safeMargin: number };
  resources: Resource[];
  assemblies: Assembly[];
}

interface PreparedResource {
  resource: Resource;
  surface: HTMLCanvasElement;
  keyedPixels: number;
  fringePixels: number;
}

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('assembly-canvas');
const context = canvas.getContext('2d', { alpha: false })!;
const composition = document.createElement('canvas');
const compositionContext = composition.getContext('2d', { willReadFrequently: true })!;
const assemblySelect = element<HTMLSelectElement>('assembly');
const facingControl = element<HTMLLabelElement>('facing-control');
const facingSelect = element<HTMLSelectElement>('facing');
const backgroundSelect = element<HTMLSelectElement>('background');
const moduleControls = element<HTMLFieldSetElement>('modules');
const playButton = element<HTMLButtonElement>('play');
const previousButton = element<HTMLButtonElement>('previous');
const nextButton = element<HTMLButtonElement>('next');

let manifest: Manifest;
let current: Assembly;
let facing: Facing = 'right';
let pose = 0;
let playing = false;
let lastFrameAt = 0;
let prepared = new Map<string, PreparedResource>();
let enabledModules = new Map<string, boolean>();

function resource(id: string) {
  const found = prepared.get(id);
  if (!found) throw new Error(`Ressource non préparée : ${id}`);
  return found;
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function prepareResource(item: Resource): Promise<PreparedResource> {
  const response = await fetch(item.src);
  if (!response.ok) throw new Error(`${item.label} indisponible (${response.status}).`);
  const blob = await response.blob();
  const bytes = await blob.arrayBuffer();
  const digest = hex(await crypto.subtle.digest('SHA-256', bytes));
  if (digest !== item.sha256) throw new Error(`${item.label} ne correspond plus au manifeste.`);
  const bitmap = await createImageBitmap(blob);
  if (bitmap.width !== item.width || bitmap.height !== item.height) {
    bitmap.close();
    throw new Error(`Dimensions inattendues pour ${item.label}.`);
  }
  const surface = document.createElement('canvas');
  surface.width = bitmap.width;
  surface.height = bitmap.height;
  const surfaceContext = surface.getContext('2d', { willReadFrequently: true })!;
  surfaceContext.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = surfaceContext.getImageData(0, 0, surface.width, surface.height);
  const result = processHunterSpriteTransparency(pixels.data, surface.width, surface.height, item.transparency);
  pixels.data.set(result.pixels);
  surfaceContext.putImageData(pixels, 0, 0);
  return { resource: item, surface, keyedPixels: result.keyedPixels, fringePixels: result.fringePixels };
}

function frameFor(part: AssemblyModule) {
  const frames = part.framesByFacing[facing] ?? [];
  return frames[Math.min(pose, frames.length - 1)] ?? frames[0];
}

function drawFrame(surface: HTMLCanvasElement, frame: Frame, x: number, y: number, scale: number) {
  const [sourceX, sourceY, sourceWidth, sourceHeight] = frame.sourceRect;
  compositionContext.drawImage(surface, sourceX, sourceY, sourceWidth, sourceHeight,
    x, y, sourceWidth * scale, sourceHeight * scale);
}

function fillBackground() {
  const kind = backgroundSelect.value;
  if (kind === 'light') {
    context.fillStyle = '#dedbd0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (kind === 'magenta') {
    context.fillStyle = '#ff00ff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (kind === 'checker') {
    for (let y = 0; y < canvas.height; y += 32) for (let x = 0; x < canvas.width; x += 32) {
      context.fillStyle = ((x + y) / 32) % 2 === 0 ? '#aeb7ad' : '#66756a';
      context.fillRect(x, y, 32, 32);
    }
    return;
  }
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#17241f');
  gradient.addColorStop(1, '#090f0d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function alphaMetrics() {
  const pixels = compositionContext.getImageData(0, 0, composition.width, composition.height).data;
  let minX = composition.width;
  let minY = composition.height;
  let maxX = -1;
  let maxY = -1;
  let borderPixels = 0;
  const margin = manifest.canvas.safeMargin;
  for (let y = 0; y < composition.height; y += 1) for (let x = 0; x < composition.width; x += 1) {
    if (pixels[(y * composition.width + x) * 4 + 3] === 0) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (x < margin || y < margin || x >= composition.width - margin || y >= composition.height - margin) borderPixels += 1;
  }
  return {
    bounds: maxX < 0 ? null : [minX, minY, maxX - minX + 1, maxY - minY + 1],
    borderPixels,
    safe: maxX >= 0 && borderPixels === 0,
  };
}

function animationPart() {
  return current?.animation
    ? current.modules.find(part => part.id === current.animation?.moduleId)
    : undefined;
}

function animationFrameCount() {
  return animationPart()?.framesByFacing[facing]?.length ?? 0;
}

function animationIsEnabled() {
  if (!current?.animation || animationFrameCount() < 2) return false;
  const linked = current.animation.linkedModuleIds ?? [current.animation.moduleId];
  return linked.some(id => enabledModules.get(id));
}

function idlePlayLabel() {
  const count = current ? animationFrameCount() : 0;
  return count > 1 ? `Lire les ${count} poses` : 'Pose fixe';
}

function selectedResourceId(part: AssemblyModule) {
  return part.resourceIdByFacing?.[facing] ?? part.resourceId;
}

function stop() {
  playing = false;
  playButton.textContent = idlePlayLabel();
  canvas.dataset.playing = 'false';
}

function render() {
  if (!current) return;
  compositionContext.clearRect(0, 0, composition.width, composition.height);
  compositionContext.imageSmoothingEnabled = true;
  const baseFrame = current.base.frameByFacing[facing];
  if (!baseFrame) throw new Error(`Orientation de corps absente : ${facing}`);
  const anchor = current.anchorByFacing?.[facing] ?? current.anchor;
  const [basePivotX, basePivotY] = current.base.sourcePivotByFacing?.[facing] ?? current.base.sourcePivot;
  const baseX = anchor[0] - basePivotX * current.base.scale;
  const baseY = anchor[1] - basePivotY * current.base.scale;

  const drawPart = (part: AssemblyModule) => {
    if (!enabledModules.get(part.id)) return;
    const frame = frameFor(part);
    if (!frame) return;
    let moduleX = baseX;
    let moduleY = baseY;
    let moduleScale = part.scale;
    const calibrated = part.transformByFacing?.[facing];
    if (calibrated) {
      moduleX = calibrated.x;
      moduleY = calibrated.y;
      moduleScale = calibrated.scale;
    } else if (part.anchorMode !== 'base-grid') {
      const socket = part.socketId ? current.sockets?.[part.socketId] : undefined;
      if (!socket || !frame.sourcePivot) throw new Error(`Pivot incomplet pour ${part.label}.`);
      const sourcePoint = socket.sourcePointByFacing?.[facing] ?? socket.sourcePoint;
      const offset = part.offsetByFacing?.[facing] ?? [0, 0];
      const socketX = baseX + sourcePoint[0] * current.base.scale + offset[0];
      const socketY = baseY + sourcePoint[1] * current.base.scale + offset[1];
      moduleX = socketX - frame.sourcePivot[0] * moduleScale;
      moduleY = socketY - frame.sourcePivot[1] * moduleScale;
    }
    drawFrame(resource(selectedResourceId(part)).surface, frame, moduleX, moduleY, moduleScale);
  };

  for (const part of current.modules.filter(candidate => candidate.layer === 'behind')) drawPart(part);
  drawFrame(resource(current.base.resourceId).surface, baseFrame, baseX, baseY, current.base.scale);
  for (const part of current.modules.filter(candidate => candidate.layer !== 'behind')) drawPart(part);

  const metrics = alphaMetrics();
  fillBackground();
  context.drawImage(composition, 0, 0);
  context.strokeStyle = 'rgba(220, 235, 202, .24)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, anchor[1] + 0.5);
  context.lineTo(canvas.width, anchor[1] + 0.5);
  context.stroke();

  const frames = animationPart()?.framesByFacing[facing] ?? [];
  const phase = frames[Math.min(pose, frames.length - 1)]?.phase;
  element('pose').textContent = frames.length ? `${pose + 1}/${frames.length} · ${phase}` : 'Pose fixe';
  element('overflow').textContent = metrics.safe
    ? `Cadrage sûr · ${metrics.bounds?.join(' × ') ?? 'aucun pixel'}`
    : `Cadrage à corriger · ${metrics.borderPixels} pixel(s) dans la marge`;
  element('overflow').dataset.safe = String(metrics.safe);
  canvas.dataset.loaded = 'true';
  canvas.dataset.assembly = current.id;
  canvas.dataset.facing = facing;
  canvas.dataset.pose = String(pose);
  canvas.dataset.overflow = String(metrics.borderPixels);
  canvas.dataset.modules = current.modules.filter(part => enabledModules.get(part.id)).map(part => part.id).join(',');
  canvas.dataset.calibration = current.calibrationStatus;
  canvas.dataset.playable = String(current.playable);
}

function updateButtons() {
  const enabled = animationIsEnabled();
  previousButton.disabled = !enabled;
  nextButton.disabled = !enabled;
  playButton.disabled = !enabled;
  if (!enabled) stop();
  else if (!playing) playButton.textContent = idlePlayLabel();
}

function rebuildModules() {
  enabledModules = new Map(current.modules.map(part => [part.id, part.defaultEnabled]));
  moduleControls.replaceChildren();
  const legend = document.createElement('legend');
  legend.textContent = 'Modules visibles';
  moduleControls.append(legend);
  for (const part of current.modules) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = part.defaultEnabled;
    input.dataset.module = part.id;
    input.addEventListener('change', () => {
      enabledModules.set(part.id, input.checked);
      stop();
      updateButtons();
      render();
    });
    label.append(input, document.createTextNode(part.label));
    moduleControls.append(label);
  }
}

function selectAssembly() {
  stop();
  pose = 0;
  const selected = manifest.assemblies.find(assembly => assembly.id === assemblySelect.value);
  if (!selected) throw new Error('Montage inconnu.');
  current = selected;
  facing = current.defaultFacing;
  facingSelect.replaceChildren(...current.facings.map(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value === 'right' ? 'Vers la droite' : 'Vers la gauche';
    return option;
  }));
  facingSelect.value = facing;
  facingControl.hidden = current.facings.length < 2;
  element('facing-note').textContent = current.facings.length < 2
    ? 'Source disponible : droite uniquement · aucun miroir.'
    : 'Deux dessins source indépendants · aucun miroir.';
  element('assembly-name').textContent = current.name;
  const calibrationLabels: Record<Assembly['calibrationStatus'], string> = {
    'static-pivot-review': 'Pivot statique calibré · revue visuelle',
    'static-module-fit-review': 'Modules calés séparément · revue statique',
    'common-origin-unregistered': 'Calage non validé · repères indépendants',
    'estimated-flight-rig-review': 'Pivots estimés · vol non validé',
  };
  element('calibration').textContent = calibrationLabels[current.calibrationStatus];
  element('calibration').dataset.status = current.calibrationStatus;
  const notes = element('notes');
  notes.replaceChildren(...current.notes.map(note => {
    const item = document.createElement('li');
    item.textContent = note;
    return item;
  }));
  rebuildModules();
  updateButtons();
  canvas.setAttribute('aria-label', current.name);
  render();
}

assemblySelect.addEventListener('change', selectAssembly);
facingSelect.addEventListener('change', () => {
  stop();
  pose = 0;
  facing = facingSelect.value as Facing;
  updateButtons();
  render();
});
backgroundSelect.addEventListener('change', render);
previousButton.addEventListener('click', () => {
  stop();
  const count = Math.max(animationFrameCount(), 1);
  pose = (pose - 1 + count) % count;
  render();
});
nextButton.addEventListener('click', () => {
  stop();
  const count = Math.max(animationFrameCount(), 1);
  pose = (pose + 1) % count;
  render();
});
playButton.addEventListener('click', () => {
  playing = !playing;
  playButton.textContent = playing ? 'Pause' : idlePlayLabel();
  canvas.dataset.playing = String(playing);
  lastFrameAt = performance.now();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', stop);

function tick(now: number) {
  if (playing && current.animation && now - lastFrameAt >= 1000 / current.animation.fps) {
    const count = Math.max(animationFrameCount(), 1);
    pose = (pose + 1) % count;
    lastFrameAt = now;
    render();
  }
  requestAnimationFrame(tick);
}

async function start() {
  const response = await fetch('./manifest.json');
  if (!response.ok) throw new Error(`Manifeste indisponible (${response.status}).`);
  manifest = await response.json() as Manifest;
  if (manifest.state !== 'review-only' || manifest.playable !== false) throw new Error('Le manifeste ne porte pas le garde-fou de revue.');
  canvas.width = composition.width = manifest.canvas.width;
  canvas.height = composition.height = manifest.canvas.height;
  element('load-status').textContent = 'Préparation du détourage Canvas…';
  const loaded = await Promise.all(manifest.resources.map(prepareResource));
  prepared = new Map(loaded.map(item => [item.resource.id, item]));
  const keyed = loaded.reduce((sum, item) => sum + item.keyedPixels, 0);
  const fringe = loaded.reduce((sum, item) => sum + item.fringePixels, 0);
  document.body.dataset.keyedPixels = String(keyed);
  document.body.dataset.fringePixels = String(fringe);
  element('load-status').textContent = `${loaded.length} PNG vérifiés · ${keyed.toLocaleString('fr-FR')} pixels détourés · ${fringe.toLocaleString('fr-FR')} pixels de frange traités`;
  assemblySelect.replaceChildren(...manifest.assemblies.map(assembly => {
    const option = document.createElement('option');
    option.value = assembly.id;
    option.textContent = assembly.name;
    return option;
  }));
  selectAssembly();
  document.body.dataset.ready = 'true';
  requestAnimationFrame(tick);
}

start().catch(error => {
  element('error').textContent = String(error);
  document.body.dataset.ready = 'error';
});
