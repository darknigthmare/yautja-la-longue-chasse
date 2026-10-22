import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Generate a static, offline gallery. Native image bytes are only read and hashed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'docs/suivi-production/v613');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const lots = [
  { directory: 'v613', label: 'V6.13', variants: [8, 9], mergedPr: null },
  { directory: 'v612', label: 'V6.12', variants: [6, 7], mergedPr: 9 },
  { directory: 'v611', label: 'V6.11', variants: [4, 5], mergedPr: 7 },
];
const manifests = lots.map(lot => ({ ...lot, manifest: read(`docs/suivi-production/${lot.directory}/data/production-manifest.json`) }));
const current = manifests[0].manifest;
const counts = read('docs/suivi-production/v613/data/current-counts.json');
const reconciliation = read('docs/suivi-production/v613/data/main-reconciliation.json');
const prUrl = current.pullRequestUrl || reconciliation.successorPullRequestUrl;
if (prUrl !== 'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/10') throw Error('Expected the actual V6.13 PR URL');
const workbookName = 'Yautja_Suivi_Variantes_V613_2026-10-22.xlsx';
const assets = manifests.flatMap(lot => {
  if (lot.manifest.assets.length !== 36) throw Error(`Expected 36 assets in ${lot.label}`);
  return lot.manifest.assets.map(asset => ({ ...asset, lot: lot.label, directory: lot.directory, mergedPr: lot.mergedPr }));
});
if (assets.length !== 108 || new Set(assets.map(a => a.id)).size !== 108 || new Set(assets.map(a => a.sha256)).size !== 108) {
  throw Error('Expected 108 distinct cumulative native images');
}
for (const asset of assets) {
  const png = fs.readFileSync(path.join(root, asset.repoPngPath));
  if (png.length !== asset.bytes || createHash('sha256').update(png).digest('hex') !== asset.sha256) throw Error(`Native PNG differs: ${asset.id}`);
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || png.readUInt32BE(16) !== 1024 || png.readUInt32BE(20) !== 1536 || png[25] !== 6) {
    throw Error(`Expected native 1024 × 1536 RGBA PNG: ${asset.id}`);
  }
}
const groups = [...new Map(assets.map(a => [a.groupId, a.groupFR])).entries()];
if (groups.length !== 18 || groups.some(([id]) => assets.filter(a => a.groupId === id).length !== 6)) throw Error('Expected six images for each of 18 groups');
const roles = [...new Map(assets.map(a => [Number(a.variant), a.nameFR])).entries()].sort((a, b) => a[0] - b[0]);
if (roles.length !== 6 || roles.some(([variant]) => assets.filter(a => Number(a.variant) === variant).length !== 18)) throw Error('Expected six roles with 18 images each');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const prose = value => Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value ?? '');
const relative = filename => path.relative(base, path.join(root, filename)).split(path.sep).join('/');
const number = value => new Intl.NumberFormat('fr-FR').format(value);
const hasFinalPrompt = asset => typeof asset.acceptedOutputPromptExact === 'string' && asset.acceptedOutputPromptExact.trim().length > 0;
const currentWithPrompt = current.assets.filter(hasFinalPrompt).length;
const currentWithoutPrompt = current.assets.length - currentWithPrompt;
const status = counts.statusCounts;
const cards = assets.map(asset => {
  const appearance = asset.plannedAppearance || {};
  const inspection = asset.visualInspection || {};
  const promptAvailable = hasFinalPrompt(asset);
  const png = relative(asset.repoPngPath);
  const manifest = relative(`docs/suivi-production/${asset.directory}/data/production-manifest.json`);
  const statusFR = asset.mergedPr ? `Présente dans main · PR nº ${asset.mergedPr} fusionnée` : 'Conservée hors main · PR nº 10';
  const search = [asset.id, asset.groupFR, asset.nameFR, inspection.notesFR, appearance.skinDirectionFR, appearance.armorDirectionFR, appearance.cyberneticsFR].join(' ');
  return `<article class="card" data-id="${esc(asset.id)}" data-sha256="${esc(asset.sha256)}" data-group="${esc(asset.groupId)}" data-role="${Number(asset.variant)}" data-lot="${asset.lot}" data-prompt-status="${promptAvailable ? 'recovered' : 'unrecovered'}" data-search="${esc(search)}">
  <div class="card-heading"><span class="lot">${asset.lot}</span><span>Variante ${String(asset.variant).padStart(2, '0')}</span></div>
  <a class="sprite" href="${esc(png)}" download aria-label="Télécharger ${esc(asset.nameFR)} — ${esc(asset.groupFR)}"><img src="${esc(png)}" width="1024" height="1536" loading="lazy" alt="${esc(asset.nameFR)} — ${esc(asset.groupFR)}, silhouette entière sur fond transparent"></a>
  <div class="card-body"><p class="group">${esc(asset.groupFR)}</p><h2>${esc(asset.nameFR)}</h2><p>${esc(inspection.notesFR || 'Consulter le manifeste du lot pour les observations disponibles.')}</p>
  <details><summary>Apparence, limites et preuve du fichier</summary><dl>
  <dt>Identifiant</dt><dd class="code">${esc(asset.id)}</dd>
  <dt>Statut à la livraison V6.13</dt><dd>${esc(statusFR)}</dd>
  <dt>Format natif vérifié</dt><dd>1 024 × 1 536 · PNG RGBA · ${number(asset.bytes)} octets</dd>
  <dt>Direction de peau prévue</dt><dd>${esc(appearance.skinDirectionFR || 'Non renseignée')}</dd>
  <dt>Direction d’armure prévue</dt><dd>${esc(appearance.armorDirectionFR || 'Non renseignée')}</dd>
  ${appearance.cyberneticsFR ? `<dt>Prothèses prévues</dt><dd>${esc(appearance.cyberneticsFR)}</dd>` : ''}
  <dt>Limites consignées</dt><dd>${esc(prose(inspection.limitationsFR) || 'Pose fixe ; animation et placement en scène non produits.')}</dd>
  <dt>SHA-256 du PNG livré</dt><dd class="code">${esc(asset.sha256)}</dd>
  <dt>Prompt soumis pour la sortie finale</dt><dd class="prompt-evidence">${promptAvailable ? 'Retrouvé dans le reçu de la sortie retenue.' : 'Non récupéré. Le prompt prévisionnel ne prouve pas la soumission à la génération.'}</dd>
  <dt>Horodatage consigné de production</dt><dd>${asset.generatedAtUtc ? esc(asset.generatedAtUtc) : 'Non récupéré.'}</dd>
  ${asset.timestampEvidenceFR ? `<dt>Nature de cet horodatage</dt><dd>${esc(asset.timestampEvidenceFR)}</dd>` : ''}
  ${asset.verificationAtUtc || asset.verifiedAtUtc ? `<dt>Vérification après récupération</dt><dd>${esc(asset.verificationAtUtc || asset.verifiedAtUtc)}</dd>` : ''}
  </dl><p><a href="${esc(manifest)}" download>Lire le manifeste de ${asset.lot}</a></p></details>
  <a class="download" href="${esc(png)}" download>Télécharger le PNG natif <span aria-hidden="true">↗</span></a></div></article>`;
}).join('\n');

const html = String.raw`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light">
<title>Yautja — 108 Enforcers V6.11, V6.12 et V6.13</title>
<style>
:root{color-scheme:dark;--bg:#101614;--panel:#1a2320;--text:#f1f0e7;--muted:#bbc7bf;--line:#3f4d43;--accent:#e1be83}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,sans-serif}a{color:var(--accent)}a:hover{text-decoration-thickness:2px}
a:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
header,main,footer{max-width:1580px;margin:auto;padding:32px}header{padding-top:56px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.8rem;color:var(--accent);margin:0}
h1{font-size:clamp(2.3rem,5vw,4.4rem);line-height:1.06;letter-spacing:-.04em;margin:18px 0}.intro{font-size:1.15rem;max-width:1000px;color:var(--muted)}
.links{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.links a,.download,button{border:1px solid var(--line);border-radius:7px;padding:10px 14px;text-decoration:none;min-height:44px}
.links a:first-child{background:var(--accent);border-color:var(--accent);color:#19231c;font-weight:650}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:28px 0}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:15px}.stat strong{display:block;font-size:1.8rem;line-height:1.2}.stat span{font-size:.85rem;color:var(--muted)}
.note{max-width:1100px;border-left:3px solid var(--accent);padding-left:18px;color:var(--muted)}main{padding-top:10px}
.filters{display:flex;gap:12px;flex-wrap:wrap;align-items:end;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:10px}
.filters label{display:grid;gap:5px;font-size:.8rem;color:var(--muted);min-width:0}.filters input,.filters select{background:#111b15;color:var(--text);border:1px solid #657267;border-radius:5px;padding:10px;font:inherit;font-size:.95rem;min-height:44px;min-width:0;max-width:100%;width:100%}
.search{flex:1;min-width:210px!important}.filters button{background:transparent;color:var(--text);font:inherit;cursor:pointer}.count{margin:20px 0;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}.card{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel);display:flex;flex-direction:column;min-width:0}.card[hidden]{display:none}
.card-heading{display:flex;justify-content:space-between;align-items:center;padding:11px 15px;color:var(--muted);font-size:.8rem}.lot{border:1px solid #63705d;border-radius:4px;padding:2px 7px;color:var(--accent)}
.sprite{display:block;height:480px;background-color:#243128;background-image:linear-gradient(45deg,#2b392f 25%,transparent 25%),linear-gradient(-45deg,#2b392f 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2b392f 75%),linear-gradient(-45deg,transparent 75%,#2b392f 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}
.sprite img{display:block;width:100%;height:100%;object-fit:contain}.light .sprite{background:#e7e7dd}.card-body{padding:18px;display:flex;flex-direction:column;flex:1}.card h2{font-size:1.2rem;line-height:1.3;margin:6px 0 13px}.group{font-size:.8rem;color:var(--accent);margin:0}
.card-body>p:not(.group){font-size:.88rem;color:var(--muted);margin-top:0}.card details{margin:4px 0 20px;font-size:.85rem}summary{cursor:pointer;color:var(--accent);padding:6px 0}dt{color:var(--muted);margin-top:12px;font-size:.8rem}dd{margin:2px 0 0;overflow-wrap:anywhere}.code{font-family:ui-monospace,monospace;overflow-wrap:anywhere;font-size:.76rem}
.download{display:flex;justify-content:space-between;margin-top:auto;font-size:.9rem}.empty{padding:30px;border:1px dashed var(--line);border-radius:8px;color:var(--muted)}footer{border-top:1px solid var(--line);margin-top:32px;font-size:.85rem;color:var(--muted);padding-bottom:48px}
@media(max-width:700px){header,main,footer{padding:22px}.stats{grid-template-columns:repeat(2,1fr)}.stat:first-child{grid-column:1/-1}.filters{align-items:stretch}.filters label{flex:1 1 140px;min-width:0}.search{min-width:0!important;flex-basis:100%!important}.grid{grid-template-columns:minmax(0,1fr)}.sprite{height:450px}}
@media print{body{background:white;color:black}.links,.filters,.download{display:none}.card{break-inside:avoid;border:1px solid #999;background:white}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sprite{height:330px;background:#eee}header,main,footer{padding:12px}.group,.card-body>p:not(.group),.count,.intro,.note,.stat span,footer{color:#333}}
</style></head><body>
<header><p class="eyebrow">Yautja · Suivi de production · 22 octobre 2026</p><h1>Enforcers V6.13</h1>
<p class="intro">36 nouveaux individus pour les 18 groupes : variante 08, Arbitre au filet dense, et variante 09, Vétéran aux gravures usées. La galerie rassemble les lots V6.11, V6.12 et V6.13 : 108 PNG natifs, six rôles par groupe.</p>
<nav class="links" aria-label="Livrables"><a href="${workbookName}" download>Classeur Excel complet</a><a href="${esc(prUrl)}">PR GitHub nº 10</a><a href="https://drive.google.com/drive/folders/1r4uWvqvdHiDLA2td1cNqTi8i9-YxHNi5">Dossier Google Drive</a><a href="../v612/index.html">Livraison V6.12</a><a href="../v611/index.html">Livraison V6.11</a><a href="data/production-manifest.json" download>Manifeste V6.13</a></nav>
<section class="stats" aria-label="État des variantes"><div class="stat"><strong>${number(counts.total)}</strong><span>Identifiants suivis</span></div><div class="stat"><strong>${number(status['Présente dans main'])}</strong><span>Présents dans main</span></div><div class="stat"><strong>${number(status['Conservée hors main'])}</strong><span>Conservés hors main</span></div><div class="stat"><strong>${number(status['Produite — à vérifier'])}</strong><span>Produits, à vérifier</span></div><div class="stat"><strong>${number(status['Pas faite'])}</strong><span>Restant à produire</span></div></section>
<p class="note">V6.11 et V6.12 sont fusionnés dans main par les PR nº 7 et nº 9. Les 36 PNG V6.13 sont conservés dans la PR nº 10. Les 36 traces V6.10 restent dans le classeur, avec leurs PNG à retrouver. Ces images sont des poses fixes raccordées à la galerie et au codex ; les cycles d’animation et les placements en scène restent à produire.</p>
<p class="note" id="provenance-note">Les 36 PNG V6.13 ont été récupérés depuis les objets GitHub et contrôlés par empreinte. Le prompt de la sortie finale est retrouvé pour ${currentWithPrompt} images ; il n’a pas été récupéré pour ${currentWithoutPrompt} images. Les directions prévues du catalogue et les prompts prévisionnels sont séparés des preuves de soumission. Les limites de chaque individu restent consultables dans sa fiche.</p></header>
<main><form class="filters" id="filters" role="search" onsubmit="return false">
<label class="search">Recherche<input id="search" type="search" placeholder="Groupe, armure, peau, identifiant…" autocomplete="off"></label>
<label>Groupe<select id="group"><option value="">Les 18 groupes</option>${groups.map(([id, label]) => `<option value="${esc(id)}">${esc(label)}</option>`).join('')}</select></label>
<label>Lot<select id="lot"><option value="">Les trois lots</option>${lots.map(lot => `<option value="${lot.label}">${lot.label} · 36 individus</option>`).join('')}</select></label>
<label>Rôle / variante<select id="role"><option value="">Les six rôles</option>${roles.map(([variant, name]) => `<option value="${variant}">${String(variant).padStart(2, '0')} · ${esc(name)}</option>`).join('')}</select></label>
<button id="background" type="button" aria-pressed="false">Fond clair</button><button id="reset" type="reset">Réinitialiser</button></form>
<p class="count" id="count" role="status" aria-live="polite">108 individus affichés sur 108.</p><noscript><p>Les 108 images et leurs téléchargements restent accessibles ; activez JavaScript pour utiliser les filtres.</p></noscript>
<div class="grid" id="grid">${cards}</div><p class="empty" id="empty" hidden>Aucun individu ne correspond aux filtres. Essayez un autre groupe ou réinitialisez la recherche.</p></main>
<footer>Les téléchargements conservent les PNG natifs sans modification des pixels. Les lignées et groupes suivent le classement du projet ; les groupes endémiques sont des créations originales. Leur adaptation et les pièces d’équipement ne constituent pas une certification de fidélité anatomique officielle 1:1. Les humains acceptés restent des humains en armure Yautja, avec des dreadlocks humaines. Après extraction de toutes les parties dans un même dossier, cette galerie et ses fichiers locaux fonctionnent hors ligne ; les liens GitHub et Drive nécessitent une connexion.</footer>
<script>
const cards=[...document.querySelectorAll('.card')],search=document.getElementById('search'),group=document.getElementById('group'),lot=document.getElementById('lot'),role=document.getElementById('role'),count=document.getElementById('count'),empty=document.getElementById('empty'),background=document.getElementById('background');
const normal=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function filter(){const words=normal(search.value).split(/\s+/).filter(Boolean);let n=0;for(const card of cards){const visible=(!group.value||card.dataset.group===group.value)&&(!lot.value||card.dataset.lot===lot.value)&&(!role.value||card.dataset.role===role.value)&&words.every(word=>normal(card.dataset.search).includes(word));card.hidden=!visible;if(visible)n++;}count.textContent=n+' individu'+(n===1?'':'s')+' affiché'+(n===1?'':'s')+' sur '+cards.length+'.';empty.hidden=n!==0;}
document.getElementById('filters').addEventListener('input',filter);
document.getElementById('filters').addEventListener('change',filter);
document.getElementById('filters').addEventListener('reset',()=>{setTimeout(filter,0);});
background.addEventListener('click',()=>{const light=document.body.classList.toggle('light');background.setAttribute('aria-pressed',String(light));background.textContent=light?'Fond à damier':'Fond clair';});
</script></body></html>`;
fs.mkdirSync(base, { recursive: true });
fs.writeFileSync(path.join(base, 'index.html'), html.replace(/[ \t]+$/gm, ''));
console.log(JSON.stringify({ gallery: path.relative(root, path.join(base, 'index.html')), cards: assets.length, groups: groups.length, roles: roles.length, offline: true, nativeHashesVerified: assets.length, finalPromptsRecoveredV613: currentWithPrompt, finalPromptsUnrecoveredV613: currentWithoutPrompt }));
