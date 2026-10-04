import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = process.cwd();
const sourceArg = process.argv.indexOf('--source');
const source = sourceArg >= 0 ? path.resolve(process.argv[sourceArg + 1]) : null;
const publicRoot = path.join(root, 'public/game/homeworld/v84/npcs');
const dataRoot = path.join(root, 'app/game/data');
const artRoot = path.join(root, 'art-source/v84/npc-variants');
const censusPath = path.join(artRoot, 'inventory-v83.json');
const census = JSON.parse(await fs.readFile(censusPath, 'utf8'));
const additions = JSON.parse(await fs.readFile(path.join(dataRoot, 'homeworldNpcAdditionsV84.json'), 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

const roleRows = [
  ['chief', 'Chef de la cité', 'Cité', 'civilian-roles-atlas.png', 0],
  ['artisan', 'Artisans', 'Cité', 'civilian-roles-atlas.png', 1],
  ['healer', 'Soigneurs', 'Cité', 'civilian-roles-atlas.png', 2],
  ['archivist', 'Archivistes', 'Cité', 'civilian-roles-atlas.png', 3],
  ['guard', 'Gardes et Enforcers', 'Cité', 'civilian-roles-atlas.png', 4],
  ['courier', 'Courriers et messagers', 'Cité', 'civilian-roles-atlas.png', 5],
  ['instructor', 'Instructeurs', 'Cité', 'civilian-roles-atlas.png', 6],
  ['apprentice', 'Apprentis et aspirants', 'Cité', 'civilian-roles-atlas.png', 7],
  ['dock-officer', 'Officiers des quais', 'Cité', 'civic-specialists-spaced-atlas.png', 0],
  ['forge-master', 'Maîtres de forge', 'Cité', 'civic-specialists-spaced-atlas.png', 1],
  ['witness', 'Témoins des galeries', 'Cité', 'civic-specialists-spaced-atlas.png', 2],
  ['herald', 'Hérauts', 'Cité', 'civic-specialists-spaced-atlas.png', 3],
  ['arena-steward', 'Intendants des arènes', 'Cité', 'civic-specialists-spaced-atlas.png', 4],
  ['rite-keeper', 'Gardiens des rites', 'Cité', 'civic-specialists-spaced-atlas.png', 5],
  ['guide', 'Pisteurs et guides', 'Villages', 'civilian-roles-atlas.png', 5],
  ['porter', 'Porteurs et convoyeurs', 'Villages', 'civilian-roles-atlas.png', 5],
  ['hunter', 'Chasseurs de retour', 'Villages', 'civilian-roles-atlas.png', 4],
  ['resident', 'Habitants et visiteurs', 'Villages', 'civilian-roles-atlas.png', 1],
  ['royal-court', 'Membres de la cour du Roi', 'Cour et services', 'civilian-roles-atlas.png', 0],
  ['elder-council', 'Anciens du conseil', 'Cour et services', 'civic-specialists-spaced-atlas.png', 5],
  ['stable-keeper', 'Personnel des écuries', 'Cour et services', 'civilian-roles-atlas.png', 1],
  ['kennel-handler', 'Maîtres du chenil', 'Cour et services', 'civilian-roles-atlas.png', 4],
  ['tribe-desert-hydrologist', 'Hydrologues des Citernes', 'Peuple des Citernes', census.tribeSpecialists[0].src],
  ['tribe-desert-quartermaster', 'Intendants des caravanes', 'Peuple des Citernes', census.tribeSpecialists[1].src],
  ['tribe-forest-builder', 'Bâtisseurs des Hautes Branches', 'Terrasses des Hautes Branches', census.tribeSpecialists[2].src],
  ['tribe-forest-archivist', 'Archivistes des Hautes Branches', 'Terrasses des Hautes Branches', census.tribeSpecialists[3].src],
  ['tribe-slums-mechanic', 'Mécaniciens des Forges Basses', 'Cour des Forges Basses', census.tribeSpecialists[4].src],
  ['tribe-slums-trader', 'Négociants des Forges Basses', 'Cour des Forges Basses', census.tribeSpecialists[5].src],
  ['tribe-lava-smelter', 'Fondeurs de la Caldeira', 'Forges de la Caldeira', census.tribeSpecialists[6].src],
  ['tribe-lava-medic', 'Médecins de la Caldeira', 'Forges de la Caldeira', census.tribeSpecialists[7].src],
  ['tribe-darkjungle-botanist', 'Botanistes des Veilleurs', 'Refuge des Veilleurs', census.tribeSpecialists[8].src],
  ['tribe-darkjungle-guide', 'Guides des racines profondes', 'Refuge des Veilleurs', census.tribeSpecialists[9].src],
];
const roles = roleRows.map(([id, label, group, reference, referenceCell]) => ({
  id, label, group, target: 20,
  reference: reference.startsWith('/') ? reference : `/game/homeworld/v72/${reference}`,
  ...(referenceCell !== undefined ? { referenceCell } : {}),
  use: id.startsWith('tribe-') ? 'tribe-catalogue' : 'homeworld-population',
}));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const occupations = new Map();
const assign = (role, values) => values.split('|').forEach(value => occupations.set(normalize(value), role));
assign('porter', 'Porteur de cargaisons|Convoyeur|Porteur de minerai|Porteur du retour|Porteur de lampes|Porteuse des provisions|Porteuse des braises|Porteuse des réponses|Porteuse des relais|Porteur|Convoyeuse|Porteur des réserves');
assign('dock-officer', 'Navigatrice|Inspectrice des amarres|Vérificateur des scellés');
assign('guide', 'Éclaireuse des quais|Pisteur du clan');
assign('artisan', 'Artisane|Tailleur de parures|Polisseuse|Tisseuse de liens|Peseur de matériaux|Ajusteur de supports|Gardienne des outils|Réparatrice des conduits|Réparateur des balises|Artisane des balises|Artisane des conduits');
assign('forge-master', 'Armurière');
assign('courier', 'Courrier de clan|Messager des archives|Messagère des villages|Courrier des postes|Courrier des corniches');
assign('hunter', 'Chasseur de passage|Chasseur de retour|Chasseuse');
assign('guard', 'Garde de patrouille|Garde du retour|Gardien des seuils|Guetteuse des ponts|Veilleur|Veilleuse|Veilleuse de relève');
assign('herald', 'Émissaire de clan|Émissaire|Hôte des délégations|Émissaire des hauts villages');
assign('apprentice', 'Apprenti de forge|Aspirant|Apprentie navigatrice|Apprentie graveuse|Aspirante à l’écoute|Aspirant de la cohorte|Aspirante du foyer|Apprenti archiviste|Élève du duel|Apprenti convoyeur|Apprenti accompagné|Apprentie accompagnée|Aspirant accompagné');
assign('resident', 'Acheteur de matériaux|Gardienne du foyer|Hôte des retrouvailles|Visiteuse des clans|Habitant des demeures|Visiteur du clan');
assign('archivist', 'Ancien du clan|Lecteur des marques|Archiviste|Conservatrice|Ancien des récits|Lectrice des rapports|Copiste des trajets|Ancienne des retours|Gardienne des récits|Conservateur local');
assign('witness', 'Voisin des galeries|Témoin du conseil');
assign('instructor', 'Instructrice des appuis|Observatrice du parcours|Accompagnateur des aspirants');
assign('arena-steward', 'Arbitre des démonstrations');
assign('rite-keeper', 'Témoin des rites');
assign('healer', 'Soigneuse');

const cast = [];
for (const actor of census.cityResidents) {
  const role = occupations.get(normalize(actor.role));
  if (!role) throw Error(`Unmapped current civic occupation: ${actor.role}`);
  cast.push({ id: actor.id, role, groupId: 'city', occupation: actor.role, source: 'city-resident', morphId: actor.morphId });
}
for (const kind of ['services', 'urbanExtras', 'cntlipHosts', 'monumentInhabitants', 'lavaFerryman']) {
  for (const actor of census[kind]) cast.push({
    id: actor.id, role: actor.currentVisualRole, groupId: 'city', occupation: actor.role ?? actor.label ?? actor.name ?? actor.currentVisualRole,
    source: kind, preserveOriginal: ['hunt-king', 'terrace-instructor'].includes(actor.id),
  });
}
for (const actor of [...census.regionalCore, ...census.regionalAmbient]) {
  const role = actor.suggestedVisualFamily ?? occupations.get(normalize(actor.role));
  if (!role) throw Error(`Unmapped village occupation: ${actor.role}`);
  cast.push({ id: actor.id, role, groupId: `region:${actor.regionId}`, regionId: actor.regionId, occupation: actor.role, source: actor.localId ? 'regional-core' : 'regional-ambient', morphId: actor.morphId });
}
if (cast.length !== 434 || new Set(cast.map(actor => actor.id)).size !== cast.length) throw Error('Census lost or duplicated a current NPC identity.');
for (const override of additions.roleOverrides) {
  const actor = cast.find(actor => actor.id === override.id);
  if (!actor) throw Error(`Missing existing court identity: ${override.id}`);
  actor.role = override.role;
}
for (const actor of [...additions.interiors, ...additions.urban]) {
  if (!roles.some(role => role.id === actor.role)) throw Error(`Unknown additional occupation: ${actor.role}`);
  cast.push({ id: actor.id, role: actor.role, groupId: 'city', occupation: actor.label,
    source: 'additional-v84', ...(actor.buildingId ? { buildingId: actor.buildingId } : {}) });
}
if (new Set(cast.map(actor => actor.id)).size !== cast.length) throw Error('Duplicate additional NPC identity.');

await fs.mkdir(publicRoot, { recursive: true });
await fs.mkdir(artRoot, { recursive: true });
const importLog = [];
if (source) {
  const folders = await fs.readdir(source, { withFileTypes: true });
  for (const folder of folders.filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const role = roles.find(entry => entry.id === folder.name || entry.id === `tribe-${folder.name}`);
    if (!role) continue;
    const inputFolder = path.join(source, folder.name);
    const names = (await fs.readdir(inputFolder)).sort();
    const destination = path.join(publicRoot, role.id);
    await fs.mkdir(destination, { recursive: true });
    const notesFolder = path.join(artRoot, role.id);
    await fs.mkdir(notesFolder, { recursive: true });
    // Notes mirror the current source family. A corrected or renamed sidecar
    // must not leave an obsolete production record in the final delivery.
    const currentNotes = new Set(names.filter(filename => filename.endsWith('.json')));
    for (const previous of await fs.readdir(notesFolder)) {
      if (previous.endsWith('.json') && !currentNotes.has(previous)) {
        await fs.unlink(path.join(notesFolder, previous));
      }
    }
    for (const filename of names) {
      if (filename.endsWith('.json')) {
        // Production notes and prompts are outside the runtime image index.
        await fs.copyFile(path.join(inputFolder, filename), path.join(notesFolder, filename));
        continue;
      }
      const match = filename.match(/-(\d{2})\.png$/);
      if (!match || +match[1] < 1 || +match[1] > 20) continue;
      const bytes = await fs.readFile(path.join(inputFolder, filename));
      const target = path.join(destination, `${match[1]}.png`);
      try {
        if (hash(await fs.readFile(target)) === hash(bytes)) continue;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await fs.writeFile(target, bytes);
      importLog.push({ role: role.id, slot: +match[1], bytes: bytes.length });
    }
  }
}

const variants = [];
const byteHashes = new Map();
const pixelHashes = new Map();
for (const role of roles) {
  const folder = path.join(publicRoot, role.id);
  let faceReviews = [];
  try {
    const review = JSON.parse(await fs.readFile(path.join(artRoot, role.id, 'face-review.json'), 'utf8'));
    faceReviews = Array.isArray(review.variants) ? review.variants : [];
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let names;
  try { names = (await fs.readdir(folder)).filter(name => /^\d{2}\.png$/.test(name)).sort(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; names = []; }
  for (const filename of names) {
    const slot = parseInt(filename, 10);
    if (slot < 1 || slot > 20) throw Error(`Invalid slot: ${role.id}/${filename}`);
    const file = path.join(folder, filename), bytes = await fs.readFile(file);
    const metadata = await sharp(bytes).metadata();
    if (metadata.format !== 'png' || !metadata.hasAlpha) throw Error(`Expected a PNG with alpha: ${file}`);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const sha256 = hash(bytes), pixelSha256 = hash(data), id = `${role.id}-${String(slot).padStart(2, '0')}`;
    if (byteHashes.has(sha256) || pixelHashes.has(pixelSha256)) throw Error(`Duplicate sprite pixels: ${id} and ${byteHashes.get(sha256) ?? pixelHashes.get(pixelSha256)}`);
    byteHashes.set(sha256, id); pixelHashes.set(pixelSha256, id);
    let left = info.width, top = info.height, right = -1, bottom = -1, clear = 0, edge = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha === 0) clear++;
      if (alpha > 16) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        // Only an opaque silhouette crossing the actual canvas edge is a crop.
        // Soft antialiasing on the second row still has a clear outer margin.
        if (alpha > 128 && (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1)) edge++;
      }
    }
    if (right < left || clear / (info.width * info.height) < .15 || edge > 8) throw Error(`Transparency/crop requires visual review: ${id}; clear=${clear}, edge=${edge}`);
    const alphaBounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
    const faceReview = faceReviews.find(review => review.slot === slot && review.sha256 === sha256
      && review.status === 'approved' && ['visible-four-mandibles', 'covered'].includes(review.face));
    // Generated figures are centered on a common floor line. Bounds are measured
    // from the original alpha; the bitmap is never cropped, resized or recolored.
    variants.push({ id, role: role.id, slot, src: `/game/homeworld/v84/npcs/${role.id}/${filename}`,
      sourceWidth: info.width, sourceHeight: info.height, alphaBounds,
      pivot: { x: info.width / 2, y: bottom + 1 }, heightWorld: role.id === 'chief' ? 112 : role.id === 'apprentice' ? 82 : 100,
      nativeFacing: 1, status: 'ready', motionStatus: 'single-pose-static',
      sha256, pixelSha256, sizeBytes: bytes.length, transparentPixelRatio: +(clear / (info.width * info.height)).toFixed(4),
      facialReview: faceReview ? { status: 'approved', face: faceReview.face } : { status: 'pending' },
    });
  }
}
const coverage = roles.map(role => ({ ...role, ready: variants.filter(variant => variant.role === role.id).length,
  facialReviewed: variants.filter(variant => variant.role === role.id && variant.facialReview.status === 'approved').length }));
const manifest = { version: 'V84', baseCommit: census.baseCommit, targetPerRole: 20, targetTotal: roles.length * 20,
  readyTotal: variants.length, complete: variants.length === roles.length * 20,
  facialReviewedTotal: variants.filter(variant => variant.facialReview.status === 'approved').length,
  facialReviewComplete: variants.length === roles.length * 20 && variants.every(variant => variant.facialReview.status === 'approved'),
  roles: coverage, variants };
await fs.writeFile(path.join(dataRoot, 'homeworldNpcVariantsV84.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(dataRoot, 'homeworldNpcCastV84.json'), JSON.stringify({ version: 'V84', baseCommit: census.baseCommit, cast }, null, 2) + '\n');
await fs.writeFile(path.join(artRoot, 'coverage.json'), JSON.stringify({ target: manifest.targetTotal, ready: variants.length,
  complete: manifest.complete, facialReviewed: manifest.facialReviewedTotal, facialReviewComplete: manifest.facialReviewComplete, roles: coverage }, null, 2) + '\n');
console.log(JSON.stringify({ imported: importLog.length, ready: variants.length, target: manifest.targetTotal, complete: manifest.complete,
  facialReviewed: manifest.facialReviewedTotal, facialReviewComplete: manifest.facialReviewComplete,
  cast: cast.length, readyRoles: coverage.filter(role => role.ready).map(({ id, ready, facialReviewed }) => ({ id, ready, facialReviewed })) }, null, 2));
if (process.argv.includes('--require-complete') && (!manifest.complete || !manifest.facialReviewComplete)) process.exitCode = 1;
