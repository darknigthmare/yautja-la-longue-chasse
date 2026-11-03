import { processHunterSpriteTransparency, type HunterSpriteTransparency } from '../app/game/hunterSpriteAtlas';

interface ReviewFrame { rect: [number, number, number, number]; pivot: [number, number]; facing: string; phase: string; durationTicks?: number }
interface ReviewEntry { id: string; category: string; name: string; src: string; status: string; width: number; height: number; sha256: string; transparency: HunterSpriteTransparency; notes: string[]; frames: ReviewFrame[]; previewAnchor?: [number, number] }
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const category = element<HTMLSelectElement>('category'), selector = element<HTMLSelectElement>('asset');
const view = element<HTMLSelectElement>('view'), facing = element<HTMLSelectElement>('facing'), background = element<HTMLSelectElement>('background');
const play = element<HTMLButtonElement>('play'), previous = element<HTMLButtonElement>('prev'), next = element<HTMLButtonElement>('next');
const speed = element<HTMLSelectElement>('speed'), canvas = element<HTMLCanvasElement>('canvas'), context = canvas.getContext('2d')!;
let entries: ReviewEntry[] = [], current: ReviewEntry | undefined, prepared: HTMLCanvasElement | null = null;
let playing = false, index = 0, generation = 0, last = 0;
const labels: Record<string, string> = { integrated: 'Intégré et contrôlé', reviewed: 'Image revue', validated: 'Clip validé', 'authored-review': 'Brouillon en revue', rejected: 'Rejeté · correction requise' };
function frames() { return current?.frames.filter(frame => frame.facing === facing.value) ?? []; }
function stop() { playing = false; play.textContent = 'Lire'; }
function buttons() {
  const usable = Boolean(prepared && view.value === 'frames' && frames().length > 1 && current?.status !== 'rejected');
  previous.disabled = next.disabled = play.disabled = !usable;
  facing.disabled = view.value !== 'frames' || !current?.frames.length;
  if (!usable) stop();
}
function render() {
  context.fillStyle = background.value === 'light' ? '#e9e5d8' : '#16211a';context.fillRect(0, 0, canvas.width, canvas.height);
  if (background.value === 'grid') for (let y = 0; y < canvas.height; y += 32) for (let x = 0; x < canvas.width; x += 32) { context.fillStyle = (x / 32 + y / 32) % 2 ? '#718174' : '#bbc5bb';context.fillRect(x, y, 32, 32); }
  if (!prepared || !current) return;
  const sequence = frames();
  context.imageSmoothingEnabled = true;
  if (view.value === 'frames' && sequence.length && current.status !== 'rejected') {
    index = Math.min(index, sequence.length - 1);const frame = sequence[index];
    // One scale for the whole sequence; never independently resize a crouch or landing.
    const size = Math.max(...sequence.map(item => Math.max(item.rect[2] / 950, item.rect[3] / 630)));
    const scale = Math.min(2, 1 / size);const [x, y, w, h] = frame.rect;
    context.drawImage(prepared, x, y, w, h, (current.previewAnchor?.[0] ?? 600) - frame.pivot[0] * scale, (current.previewAnchor?.[1] ?? 730) - frame.pivot[1] * scale, w * scale, h * scale);
    element('frame').textContent = `${index + 1}/${sequence.length} · ${frame.facing} · ${frame.phase}`;
  } else {
    const scale = Math.min(1160 / prepared.width, 760 / prepared.height);const w = prepared.width * scale, h = prepared.height * scale;
    context.drawImage(prepared, (1200 - w) / 2, (800 - h) / 2, w, h);element('frame').textContent = 'Planche entière · source intacte';
  }
  canvas.dataset.assetId = current.id;canvas.dataset.frame = String(index);canvas.dataset.view = view.value;
}
async function select() {
  stop();index = 0;prepared = null;current = entries.find(entry => entry.id === selector.value);const selected = current;const ticket = ++generation;
  element('error').textContent = '';element('digest').textContent = '';element('frame').textContent = '';
  canvas.dataset.assetId = '';canvas.dataset.loaded = 'false';element<HTMLAnchorElement>('source').removeAttribute('href');buttons();render();
  if (!selected) return;
  element('name').textContent = selected.name;const badge = element('status');badge.dataset.status = selected.status;badge.textContent = labels[selected.status] ?? selected.status;
  element('summary').textContent = `${selected.width} × ${selected.height} · ${selected.transparency.mode === 'alpha' ? 'alpha natif / image opaque de fond' : 'clé magenta déclarée'}`;
  const list = element('notes');list.replaceChildren(...selected.notes.map(note => { const li = document.createElement('li');li.textContent = note;return li; }));
  canvas.setAttribute('aria-label', selected.name);view.querySelector<HTMLOptionElement>('option[value="frames"]')!.disabled = !selected.frames.length || selected.status === 'rejected';
  if (!selected.frames.length || selected.status === 'rejected') view.value = 'sheet';
  try {
    const response = await fetch(selected.src);if (!response.ok) throw new Error('PNG indisponible : ' + response.status);
    const blob = await response.blob();const bytes = await blob.arrayBuffer();
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (sha !== selected.sha256) throw new Error('Le PNG ne correspond pas à la source contrôlée.');
    const bitmap = await createImageBitmap(blob);
    if (ticket !== generation) { bitmap.close();return; }
    if (bitmap.width !== selected.width || bitmap.height !== selected.height) { bitmap.close();throw new Error('Dimensions de source incohérentes.'); }
    const surface = document.createElement('canvas');surface.width = bitmap.width;surface.height = bitmap.height;const ctx = surface.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);bitmap.close();const raw = ctx.getImageData(0, 0, surface.width, surface.height);
    const result = processHunterSpriteTransparency(raw.data, surface.width, surface.height, selected.transparency);
    raw.data.set(result.pixels);ctx.putImageData(raw, 0, 0);prepared = surface;
    canvas.dataset.loaded = 'true';element<HTMLAnchorElement>('source').href = selected.src;element('digest').textContent = 'SHA-256 ' + sha;
    buttons();render();
  } catch (error) { if (ticket !== generation) return;prepared = null;stop();buttons();render();element('error').textContent = String(error); }
}
function filter() {
  const filtered = entries.filter(entry => category.value === 'all' || entry.category === category.value);
  selector.replaceChildren(...filtered.map(entry => { const option = document.createElement('option');option.value = entry.id;option.textContent = entry.name;return option; }));
  void select();
}
category.addEventListener('change', filter);selector.addEventListener('change', () => void select());
for (const selectElement of [view, facing]) selectElement.addEventListener('change', () => { stop();index = 0;buttons();render(); });
background.addEventListener('change', render);
previous.addEventListener('click', () => { stop();index = (index - 1 + frames().length) % frames().length;render(); });
next.addEventListener('click', () => { stop();index = (index + 1) % frames().length;render(); });
play.addEventListener('click', () => { playing = !playing;play.textContent = playing ? 'Pause' : 'Lire';last = performance.now(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', stop);
function tick(now: number) { if (playing && prepared && now - last >= 1000 / Number(speed.value)) { index = (index + 1) % frames().length;last = now;render(); }requestAnimationFrame(tick); }
requestAnimationFrame(tick);
fetch('./manifest.json').then(async response => { if (!response.ok) throw new Error('Catalogue indisponible.');return response.json(); }).then(manifest => {
  entries = manifest.entries;element('totals').textContent = `${entries.length} images indexées · images produites avec OpenAI · aucun statut de jeu complet implicite`;filter();
}).catch(error => { element('error').textContent = String(error); });
