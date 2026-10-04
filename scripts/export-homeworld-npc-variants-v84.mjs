import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const outputIndex = process.argv.indexOf('--output');
if (outputIndex < 0 || !process.argv[outputIndex + 1]) throw Error('Usage: node scripts/export-homeworld-npc-variants-v84.mjs --output /absolute/export-folder');
const output = path.resolve(process.argv[outputIndex + 1]);
const manifest = JSON.parse(await fs.readFile(path.join(root, 'app/game/data/homeworldNpcVariantsV84.json'), 'utf8'));
const cast = JSON.parse(await fs.readFile(path.join(root, 'app/game/data/homeworldNpcCastV84.json'), 'utf8'));
if (!manifest.complete || manifest.readyTotal !== 640 || manifest.roles.some(role => role.ready !== 20)) {
  throw Error(`Export final refusé : ${manifest.readyTotal}/640 sprites. Terminer les 32 familles puis relancer l’import.`);
}
if (!manifest.facialReviewComplete || manifest.facialReviewedTotal !== 640) {
  throw Error(`Export final refusé : ${manifest.facialReviewedTotal ?? 0}/640 visages contrôlés sur les PNG définitifs.`);
}
await fs.mkdir(output, { recursive: true });
const exportedRoot = 'YAUTJA_PNJ_V84';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const files = [
  'app/game/HomeworldNpcSpriteV84.tsx', 'app/game/HomeworldCivilianV72.tsx',
  'app/game/HomeworldCntlipHostsV77.tsx', 'app/game/HomeworldInteriorSurface.tsx',
  'app/game/HomeworldLavaSceneV77.tsx', 'app/game/HomeworldPointVisualV64.tsx',
  'app/game/HomeworldPopulationV68.tsx', 'app/game/HomeworldRegionV68.tsx',
  'app/game/HomeworldVillageLifeV69.tsx', 'app/game/HomeworldWorldSceneV77.tsx',
  'app/game/TribeArtGallery.tsx', 'app/game/systems/homeworldNpcVariantsV84.ts',
  'app/game/data/homeworldNpcVariantsV84.json', 'app/game/data/homeworldNpcCastV84.json',
  'app/game/data/homeworldNpcAdditionsV84.json', 'app/game/systems/homeworldMonumentInteriorsV81.ts',
  'app/game/systems/homeworldMonumentInteriorCodexV81.ts', 'app/game/systems/homeworldUrbanPopulationV78.ts',
  'scripts/import-homeworld-npc-variants-v84.mjs', 'scripts/export-homeworld-npc-variants-v84.mjs',
  'tests/homeworld-npc-variants-v84.test.mjs', 'tests/homeworld-npc-rendering-v84.test.mjs',
  'tests/homeworld-monument-interiors-v81.test.mjs',
  'docs/homeworld-npc-variants-v84.md',
  'docs/homeworld-npc-variants-v84-validation.json',
];
async function collect(directory) {
  const entries = await fs.readdir(path.join(root, directory), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await collect(relative);
    else if (entry.isFile()) files.push(relative);
  }
}
await collect('art-source/v84/npc-variants');
const integrationEntries = files.map(file => ({ source: path.join(root, file), name: `${exportedRoot}/projet/${file}` }));

// Whole families stay together. All PNG bytes remain untouched in the archives.
const chunkLimit = 330 * 1024 * 1024;
const chunks = [];
for (const role of manifest.roles) {
  const variants = manifest.variants.filter(variant => variant.role === role.id);
  for (const variant of variants) {
    const bytes = await fs.readFile(path.join(root, 'public', variant.src));
    if (sha256(bytes) !== variant.sha256) throw Error(`Sprite modifié après sa validation : ${variant.id}`);
  }
  const size = variants.reduce((sum, variant) => sum + variant.sizeBytes, 0);
  let chunk = chunks.at(-1);
  if (!chunk || chunk.bytes + size > chunkLimit) {
    chunk = { roles: [], variants: [], bytes: 0 };
    chunks.push(chunk);
  }
  chunk.roles.push(role);
  chunk.variants.push(...variants);
  chunk.bytes += size;
}
const archives = chunks.map((chunk, index) => ({
  filename: `YAUTJA_PNJ_V84_sprites_${String(index + 1).padStart(2, '0')}_sur_${String(chunks.length).padStart(2, '0')}.zip`,
  count: chunk.variants.length, roles: chunk.roles.map(role => role.label), rawBytes: chunk.bytes,
}));
const roleTable = manifest.roles.map(role => `| ${role.group} | ${role.label} | ${role.ready} |`).join('\n');
const archiveList = archives.map(archive => `- **${archive.filename}** : ${archive.count} sprites — ${archive.roles.join(', ')}.`).join('\n');
const readme = `# Yautja : La Longue Chasse — PNJ V84

**640 sprites individuels : 20 variantes pour chacun des 32 rôles.**

Base : V83, commit ${manifest.baseCommit}.

## Ouvrir le catalogue

1. Extraire l’archive d’intégration et toutes les archives de sprites dans un même dossier. Elles partagent le dossier racine ${exportedRoot}. Les fichiers de catalogue répétés sont identiques.
2. Ouvrir \`index.html\` dans ce dossier. Le catalogue fonctionne hors ligne, avec filtres par rôle et par groupe, et affiche 20 personnages à la fois.
3. Cliquer sur un personnage pour ouvrir son PNG original. Le damier du catalogue permet de voir la transparence.

## Contenu des archives

- **YAUTJA_PNJ_V84_integration.zip** : catalogue, inventaire, code modifié, provenance et tests. Le sous-dossier \`projet\` contient les fichiers à fusionner dans la base V83.
${archiveList}

## Dans le jeu

Les 434 identités de PNJ déjà présentes sont recensées. Dix habitants supplémentaires sont placés au palais, au conseil et dans les travées du port, soit 444 identités déclarées. Une apparence est attribuée à chaque identité selon son métier et son groupe. Les 80 nouveaux dessins de cour, conseil, écuries et chenil complètent le catalogue. La cité utilise un seul groupe, et chaque village son propre groupe. Une famille complète de 20 permet des apparences différentes pour tous les PNJ du même rôle dans cette cité ou ce village.

Le même PNJ conserve son dessin pendant ses déplacements et ses interactions. Le Roi de la Chasse et le mentor du prologue gardent leurs représentations d’origine ; les 20 chefs et les variantes d’instructeurs restent disponibles dans le catalogue.

Les cinq tribus historiques de V37 possèdent chacune deux métiers, soit 40 sprites par tribu. Leur catalogue est enrichi. Leurs cinq lieux jouables dédiés ne faisaient pas partie de V83 ; ces images ne créent pas de nouveaux lieux. Les dix villages déjà jouables utilisent les familles de PNJ régionaux.

## Nature des images

Chaque PNG représente un personnage entier et indépendant, en pose fixe, avec un canal alpha. Les différences portent sur la silhouette, le visage, les dreadlocks, les vêtements, l’équipement et la posture. Il ne s’agit pas de nouvelles planches d’animation. Dans cette livraison, un PNJ qui se déplace garde sa pose fixe et son identité visuelle.

Les PNG originaux sont conservés sans recadrage ni recoloration. Le moteur applique seulement l’échelle d’affichage, l’ancrage au sol et le sens du personnage. La galerie pagine les fichiers, et les scènes conservent leur filtrage des acteurs visibles.

Chaque visage a été contrôlé sur son PNG définitif. Les quatre mandibules externes, les défenses et la dentition intérieure suivent les archives du [Predator original de Stan Winston Studio](https://www.stanwinstonschool.com/blog/predator-behind-the-scenes-creating-the-mechanical-head-face-and-mouth-for-the-jungle-hunter). Les biomasques réellement couvrants sont conservés. Les revues associées aux empreintes des fichiers sont incluses dans les notes de création.

## Installation dans une copie V83

Fusionner le contenu de \`projet\` dans le dépôt basé sur le commit ci-dessus. Ce paquet contient les ajouts et modifications de V84, pas tous les fichiers ni toutes les anciennes ressources du jeu.

Puis lancer :

\`\`\`sh
npm ci
node scripts/import-homeworld-npc-variants-v84.mjs --require-complete
npm run typecheck
node --test tests/homeworld-npc-variants-v84.test.mjs tests/homeworld-npc-rendering-v84.test.mjs
node scripts/build-audio-manifest.mjs && npx next build --webpack && node scripts/verify-pit-built-css-v61.mjs
\`\`\`

La commande d’import sans \`--source\` contrôle les images déjà installées. Elle vérifie le format, la transparence, les bords, les dimensions et l’absence de fichiers ou pixels identiques.

## Familles

| Groupe | Rôle | Sprites |
| --- | --- | ---: |
${roleTable}

Les détails d’intégration et les limites de validation sont dans \`projet/docs/homeworld-npc-variants-v84.md\`.
`;
const rolesForGallery = manifest.roles.map(({ id, label, group }) => ({ id, label, group }));
const galleryData = JSON.stringify({ roles: rolesForGallery, variants: manifest.variants.map(variant => ({
  id: variant.id, role: variant.role, slot: variant.slot, src: `projet/public${variant.src}`,
  width: variant.sourceWidth, height: variant.sourceHeight, sha256: variant.sha256,
})) }).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Yautja · 640 habitants du Homeworld</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#141716;color:#e8e9dc}*{box-sizing:border-box}body{margin:0}main{max-width:1500px;margin:auto;padding:38px 24px}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;border-bottom:1px solid #41493f;padding-bottom:26px}.eyebrow{color:#b5bf88;letter-spacing:.16em;font-size:12px}h1{font-size:clamp(29px,4.5vw,58px);font-weight:600;letter-spacing:-.045em;line-height:1.08;margin:8px 0 16px}header p{max-width:650px;line-height:1.6;color:#b5bdb5}.total{font-size:60px;color:#c8d998;white-space:nowrap}.total small{display:block;font-size:13px;color:#adb6a9;letter-spacing:.1em;text-align:right}.filters{display:flex;gap:14px;flex-wrap:wrap;margin:28px 0 18px}label{display:grid;gap:7px;font-size:13px;color:#b8c1b4;flex:1;min-width:200px}input,select,button{font:inherit;color:#e8e9dc;border:1px solid #465042;border-radius:6px;background:#20271f;padding:12px 14px}button,a{cursor:pointer}button:hover{background:#34402d}button:disabled{opacity:.35;cursor:default}a{color:#d0e3a3}.status{font-size:14px;color:#b9c4b0;margin:0 0 22px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:17px}.card{display:flex;flex-direction:column;margin:0;border:1px solid #374332;border-radius:10px;overflow:hidden;text-decoration:none;background:#1c231c;color:inherit}.surface{display:flex;height:330px;align-items:center;justify-content:center;padding:16px;background-color:#363d32;background-image:linear-gradient(45deg,#3c4338 25%,transparent 25%),linear-gradient(-45deg,#3c4338 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#3c4338 75%),linear-gradient(-45deg,transparent 75%,#3c4338 75%);background-size:28px 28px;background-position:0 0,0 14px,14px -14px,-14px 0}.surface img{display:block;width:100%;height:100%;object-fit:contain}.surface .missing{color:#eee;padding:16px;line-height:1.5;text-align:center;font-size:13px}.card figcaption{padding:15px;line-height:1.45}.card strong{display:block;font-size:14px}.card small{display:block;color:#a9b59f;margin-top:4px}.number{font-size:12px;color:#d0e3a3;letter-spacing:.09em}.pager{display:flex;gap:18px;align-items:center;justify-content:center;margin:28px 0}.note{font-size:13px;color:#a5b09b;line-height:1.7;border-top:1px solid #41493f;padding-top:20px}#empty{padding:40px;background:#20271f;border-radius:10px}.light .surface{background-color:#d6d8d1;background-image:linear-gradient(45deg,#eef0e9 25%,transparent 25%),linear-gradient(-45deg,#eef0e9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eef0e9 75%),linear-gradient(-45deg,transparent 75%,#eef0e9 75%)}@media(max-width:620px){main{padding:24px 14px}header{display:block}.total{font-size:34px}.total small{text-align:left}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.surface{height:250px;padding:6px}.card figcaption{padding:10px}}
</style></head><body><main>
<header><div><div class="eyebrow">LA LONGUE CHASSE · COLLECTION V84</div><h1>Les habitants<br>du Homeworld.</h1><p>Vingt personnages pour chaque métier. Explore les variantes de la cité, des villages, des cinq tribus, de la cour et des services animaliers, puis ouvre chaque personnage en pleine résolution.</p></div><div class="total">640<small>32 RÔLES · 20 VARIANTES</small></div></header>
<div class="filters"><label>Groupe<select id="group"><option value="">Tous les groupes</option></select></label><label>Métier<select id="role"><option value="">Tous les métiers</option></select></label><label>Rechercher<input id="query" type="search" placeholder="Artisans, Veilleurs, 07…" maxlength="100"></label><label>Fond de contrôle<select id="background"><option value="dark">Damier sombre</option><option value="light">Damier clair</option></select></label></div>
<p id="status" class="status" role="status" aria-live="polite"></p><div id="grid" class="grid"></div><p id="empty" hidden>Aucun personnage ne correspond à ces filtres.</p>
<nav class="pager" aria-label="Pagination"><button id="previous">Précédent</button><span id="page"></span><button id="next">Suivant</button></nav>
<p class="note">Un PNG par personnage, fond transparent, pose fixe. Les cinq tribus représentent 200 dessins, la cité et les villages 360, la cour et les services animaliers 80. Le jeu existant conserve ses PNJ et leurs fonctions. Extrais toutes les parties du paquet dans le même dossier pour afficher les 640 images. <a href="README_FR.md">Lire les instructions complètes</a>.</p>
</main><script id="catalogue" type="application/json">${galleryData}</script><script>
const data=JSON.parse(document.getElementById('catalogue').textContent),roleMap=new Map(data.roles.map(r=>[r.id,r]));
const el=id=>document.getElementById(id),fold=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
let page=0,results=[];
for(const group of [...new Set(data.roles.map(r=>r.group))])el('group').add(new Option(group,group));
function updateRoles(){const selected=el('role').value;el('role').replaceChildren(new Option('Tous les métiers',''));for(const role of data.roles.filter(r=>!el('group').value||r.group===el('group').value))el('role').add(new Option(role.label,role.id));if([...el('role').options].some(o=>o.value===selected))el('role').value=selected;}
function render(){const search=fold(el('query').value.trim());results=data.variants.filter(v=>{const r=roleMap.get(v.role);return(!el('group').value||r.group===el('group').value)&&(!el('role').value||v.role===el('role').value)&&fold(r.label+' '+r.group+' '+v.id).includes(search)});const pages=Math.ceil(results.length/20);page=Math.max(0,Math.min(page,pages-1));el('grid').replaceChildren();for(const v of results.slice(page*20,page*20+20)){const r=roleMap.get(v.role),link=document.createElement('a'),fig=document.createElement('figure'),surface=document.createElement('div'),img=document.createElement('img'),caption=document.createElement('figcaption'),number=document.createElement('span'),title=document.createElement('strong'),small=document.createElement('small');link.href=v.src;link.target='_blank';link.rel='noopener';link.className='card';link.title='Ouvrir '+v.id+' en pleine résolution';fig.style.margin='0';surface.className='surface';img.src=v.src;img.alt=r.label+', variante '+v.slot;img.width=v.width;img.height=v.height;img.loading='lazy';img.decoding='async';img.onerror=()=>{const message=document.createElement('p');message.className='missing';message.textContent='Extraire la partie contenant ce métier pour afficher ce personnage.';surface.replaceChildren(message)};surface.append(img);number.className='number';number.textContent='VARIANTE '+String(v.slot).padStart(2,'0');title.textContent=r.label;small.textContent=r.group;caption.append(number,title,small);fig.append(surface,caption);link.append(fig);el('grid').append(link)}el('status').textContent=results.length+' personnages · fichiers PNG individuels';el('page').textContent=(results.length?page+1:0)+' / '+pages;el('previous').disabled=page===0;el('next').disabled=page+1>=pages;el('empty').hidden=results.length>0;}
el('group').onchange=()=>{page=0;updateRoles();render()};el('role').onchange=()=>{page=0;render()};el('query').oninput=()=>{page=0;render()};el('background').onchange=()=>document.body.classList.toggle('light',el('background').value==='light');el('previous').onclick=()=>{page--;render();el('status').scrollIntoView({block:'start'})};el('next').onclick=()=>{page++;render();el('status').scrollIntoView({block:'start'})};updateRoles();render();
</script></body></html>`;
const common = [
  { filename: 'README_FR.md', content: readme },
  { filename: 'index.html', content: html },
  { filename: 'manifest.json', content: JSON.stringify(manifest, null, 2) + '\n' },
  { filename: 'cast.json', content: JSON.stringify(cast, null, 2) + '\n' },
];
for (const file of common) await fs.writeFile(path.join(output, file.filename), file.content);
const commonEntries = common.map(file => ({ source: path.join(output, file.filename), name: `${exportedRoot}/${file.filename}` }));
const zipJobs = [{ filename: 'YAUTJA_PNJ_V84_integration.zip', entries: [...commonEntries, ...integrationEntries] }];
for (let index = 0; index < chunks.length; index++) {
  const images = chunks[index].variants.map(variant => ({ source: path.join(root, 'public', variant.src), name: `${exportedRoot}/projet/public${variant.src}` }));
  zipJobs.push({ filename: archives[index].filename, entries: [...commonEntries, ...images] });
}
const report = { version: 'V84', baseCommit: manifest.baseCommit, spriteCount: 640, families: 32, perFamily: 20, archives: [] };
for (const job of zipJobs) {
  const destination = path.join(output, job.filename);
  execFileSync('python3', ['-c',
    "import json,sys,zipfile; p=json.load(sys.stdin); z=zipfile.ZipFile(p['destination'],'w',compression=zipfile.ZIP_STORED,allowZip64=True); [z.write(e['source'],e['name']) for e in p['entries']]; z.close()"],
    { input: JSON.stringify({ destination, entries: job.entries }), maxBuffer: 1024 * 1024 });
  const bytes = await fs.readFile(destination);
  report.archives.push({ filename: job.filename, sizeBytes: bytes.length, sha256: sha256(bytes), ...archives.find(archive => archive.filename === job.filename) });
}
await fs.writeFile(path.join(output, 'livraison.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
