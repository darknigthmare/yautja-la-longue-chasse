import fs from 'node:fs';
import path from 'node:path';

// A self-contained gallery of the native PNGs. No image transformation occurs.
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base='docs/suivi-production/v612';
const current=read(`${base}/data/production-manifest.json`);
const previous=read('docs/suivi-production/v611/data/production-manifest.json');
const counts=read(`${base}/data/current-counts.json`);
if(current.assets.length!==36||previous.assets.length!==36)throw Error('Expected 36 new and 36 previous native assets');
const assets=[...current.assets.map(a=>({...a,lot:'V6.12'})),...previous.assets.map(a=>({...a,lot:'V6.11'}))];
if(new Set(assets.map(a=>a.id)).size!==72)throw Error('Duplicate gallery identity');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prose=v=>Array.isArray(v)?v.filter(Boolean).join(' '):String(v??'');
const pngPath=a=>path.relative(path.resolve(base),path.resolve(a.repoPngPath)).split(path.sep).join('/');
const groups=[...new Map(assets.map(a=>[a.groupId,a.groupFR])).entries()];
const format=n=>new Intl.NumberFormat('fr-FR').format(n);
const status=counts.statusCounts;
const cards=assets.map(a=>{
 const appearance=a.plannedAppearance;
 const limits=prose(a.visualInspection.limitationsFR);
 const png=pngPath(a);
 if(!fs.existsSync(a.repoPngPath))throw Error('Missing gallery PNG: '+a.id);
 return `<article class="card" data-group="${esc(a.groupId)}" data-variant="${a.variant}" data-lot="${a.lot}" data-search="${esc([a.id,a.groupFR,a.nameFR,a.visualInspection.notesFR,appearance.skinDirectionFR,appearance.armorDirectionFR,appearance.cyberneticsFR].join(' '))}">
 <div class="card-heading"><span class="lot">${a.lot}</span><span>Variante ${String(a.variant).padStart(2,'0')}</span></div>
 <a class="sprite" href="${esc(png)}" download aria-label="Télécharger ${esc(a.nameFR)} — ${esc(a.groupFR)}"><img src="${esc(png)}" width="1024" height="1536" loading="lazy" alt="${esc(a.nameFR)} — ${esc(a.groupFR)}, silhouette entière sur fond transparent"></a>
 <div class="card-body"><p class="group">${esc(a.groupFR)}</p><h2>${esc(a.nameFR)}</h2><p>${esc(a.visualInspection.notesFR)}</p>
 <details><summary>Apparence et preuve du fichier</summary><dl>
 <dt>Identifiant</dt><dd class="code">${esc(a.id)}</dd>
 <dt>Format natif</dt><dd>1 024 × 1 536 · PNG RGBA · ${format(a.bytes)} octets</dd>
 <dt>Peau</dt><dd>${esc(appearance.skinDirectionFR)}</dd>
 <dt>Armure</dt><dd>${esc(appearance.armorDirectionFR)}</dd>
 ${appearance.cyberneticsFR?`<dt>Prothèses</dt><dd>${esc(appearance.cyberneticsFR)}</dd>`:''}
 <dt>Limites constatées</dt><dd>${esc(limits||'Pose fixe ; animation et placement en scène non produits.')}</dd>
 <dt>SHA-256</dt><dd class="code">${esc(a.sha256)}</dd></dl></details>
 <a class="download" href="${esc(png)}" download>Télécharger le PNG natif <span aria-hidden="true">↗</span></a></div></article>`;
}).join('\n');
const html=String.raw`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light">
<title>Yautja — Enforcers V6.12 et V6.11</title>
<style>
:root{color-scheme:dark;--bg:#101614;--panel:#1a2320;--text:#f1f0e7;--muted:#bbc7bf;--line:#3f4d43;--accent:#e1be83}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,sans-serif}a{color:var(--accent)}a:hover{text-decoration-thickness:2px}a:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:4px}header,main,footer{max-width:1580px;margin:auto;padding:32px}header{padding-top:56px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.8rem;color:var(--accent);margin:0}h1{font-size:clamp(2.3rem,5vw,4.4rem);line-height:1.06;letter-spacing:-.04em;margin:18px 0}.intro{font-size:1.15rem;max-width:980px;color:var(--muted)}.links{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.links a,.download,button{border:1px solid var(--line);border-radius:7px;padding:10px 14px;text-decoration:none;min-height:43px}.links a:first-child{background:var(--accent);border-color:var(--accent);color:#19231c;font-weight:650}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:28px 0}.stat{background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:15px}.stat strong{display:block;font-size:1.8rem;line-height:1.2}.stat span{font-size:.85rem;color:var(--muted)}.note{max-width:1100px;border-left:3px solid var(--accent);padding-left:18px;color:var(--muted)}main{padding-top:10px}.filters{display:flex;gap:12px;flex-wrap:wrap;align-items:end;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:10px}.filters label{display:grid;gap:5px;font-size:.8rem;color:var(--muted)}.filters input,.filters select{background:#111b15;color:var(--text);border:1px solid #657267;border-radius:5px;padding:10px;font:inherit;font-size:.95rem;min-height:43px}.search{flex:1;min-width:210px}.filters button{background:transparent;color:var(--text);font:inherit;cursor:pointer}.count{margin:20px 0;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}.card{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel);display:flex;flex-direction:column}.card[hidden]{display:none}.card-heading{display:flex;justify-content:space-between;align-items:center;padding:11px 15px;color:var(--muted);font-size:.8rem}.lot{border:1px solid #63705d;border-radius:4px;padding:2px 7px;color:var(--accent)}.sprite{display:block;height:480px;background-color:#243128;background-image:linear-gradient(45deg,#2b392f 25%,transparent 25%),linear-gradient(-45deg,#2b392f 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2b392f 75%),linear-gradient(-45deg,transparent 75%,#2b392f 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.sprite img{display:block;width:100%;height:100%;object-fit:contain}.light .sprite{background:#e7e7dd}.card-body{padding:18px;display:flex;flex-direction:column;flex:1}.card h2{font-size:1.2rem;line-height:1.3;margin:6px 0 13px}.group{font-size:.8rem;color:var(--accent);margin:0}.card-body>p:not(.group){font-size:.88rem;color:var(--muted);margin-top:0}.card details{margin:4px 0 20px;font-size:.85rem}summary{cursor:pointer;color:var(--accent);padding:6px 0}dt{color:var(--muted);margin-top:12px;font-size:.8rem}dd{margin:2px 0 0}.code{font-family:ui-monospace,monospace;overflow-wrap:anywhere;font-size:.76rem}.download{display:flex;justify-content:space-between;margin-top:auto;font-size:.9rem}.empty{padding:30px;border:1px dashed var(--line);border-radius:8px;color:var(--muted)}footer{border-top:1px solid var(--line);margin-top:32px;font-size:.85rem;color:var(--muted);padding-bottom:48px}@media(max-width:700px){header,main,footer{padding:22px}.stats{grid-template-columns:repeat(2,1fr)}.stat:first-child{grid-column:1/-1}.filters{align-items:stretch}.filters label{flex:1;min-width:140px}.sprite{height:450px}}@media print{body{background:white;color:black}.links,.filters,.download{display:none}.card{break-inside:avoid;border:1px solid #999;background:white}.grid{grid-template-columns:repeat(2,1fr)}.sprite{height:330px;background:#eee}header,main,footer{padding:12px}.group,.card-body>p:not(.group),.count,.intro,.note,.stat span,footer{color:#333}}
</style></head><body>
<header><p class="eyebrow">Yautja · Suivi de production · 21 octobre 2026</p><h1>Enforcers V6.12</h1>
<p class="intro">36 nouveaux individus pour les 18 groupes : variante 06, Porte-liens, et variante 07, Inspecteur des passages. Cette galerie rassemble également les 36 Enforcers 04–05 de V6.11, soit 72 PNG natifs disponibles.</p>
<nav class="links" aria-label="Livrables"><a href="Yautja_Suivi_Variantes_V612_2026-10-21.xlsx" download>Classeur Excel complet</a><a href="https://github.com/darknigthmare/yautja-la-longue-chasse/pull/7">PR GitHub nº 7</a><a href="https://drive.google.com/drive/folders/1r4uWvqvdHiDLA2td1cNqTi8i9-YxHNi5">Dossier Google Drive</a><a href="../v611/index.html">Livraison V6.11</a></nav>
<section class="stats" aria-label="État des variantes"><div class="stat"><strong>${format(counts.total)}</strong><span>Identifiants suivis</span></div><div class="stat"><strong>${format(status['Présente dans main'])}</strong><span>Présents dans main</span></div><div class="stat"><strong>${format(status['Conservée hors main'])}</strong><span>Conservés hors main</span></div><div class="stat"><strong>${format(status['Produite — à vérifier'])}</strong><span>Produits, à vérifier</span></div><div class="stat"><strong>${format(status['Pas faite'])}</strong><span>Restant à produire</span></div></section>
<p class="note">Les 36 traces de production V6.10 restent dans le classeur ; leurs PNG ne sont pas retrouvés. Les lots V6.11 et V6.12 sont des poses fixes, raccordées à la galerie et au codex de la branche. Aucune nouvelle animation ni aucun nouveau placement en scène n’est inclus.</p></header>
<main><form class="filters" id="filters" role="search" onsubmit="return false">
<label class="search">Recherche<input id="search" type="search" placeholder="Groupe, armure, peau, identifiant…" autocomplete="off"></label>
<label>Groupe<select id="group"><option value="">Les 18 groupes</option>${groups.map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('')}</select></label>
<label>Lot<select id="lot"><option value="">V6.11 et V6.12</option value="V6.12">V6.12 · 36 nouveaux</option><option value="V6.11">V6.11 · 36 précédents</option></select></label>
<label>Variante<select id="variant"><option value="">Toutes</option><option value="4">04 · Intercepteur à la lance courte</option><option value="5">05 · Pisteur au sceau sombre</option><option value="6">06 · Porte-liens</option><option value="7">07 · Inspecteur des passages</option></select></label>
<button id="background" type="button" aria-pressed="false">Fond clair</button><button id="reset" type="reset">Réinitialiser</button></form>
<p class="count" id="count" role="status" aria-live="polite">72 individus affichés sur 72.</p><noscript><p>Les 72 images et leurs téléchargements restent accessibles ; activez JavaScript pour utiliser les filtres.</p></noscript>
<div class="grid" id="grid">${cards}</div><p class="empty" id="empty" hidden>Aucun individu ne correspond aux filtres. Essayez un autre groupe ou réinitialisez la recherche.</p></main>
<footer>Les téléchargements conservent les pixels PNG natifs, sans redimensionnement ni recoloration. Les lignées et groupes suivent le classement du projet ; les groupes endémiques sont des créations originales. Leur adaptation et les pièces d’équipement ne constituent pas une certification d’anatomie canonique 1:1. Les humains acceptés restent des humains en armure Yautja, avec des dreadlocks humaines. Les limites particulières sont conservées dans chaque fiche et dans le classeur.</footer>
<script>
const cards=[...document.querySelectorAll('.card')],search=document.getElementById('search'),group=document.getElementById('group'),lot=document.getElementById('lot'),variant=document.getElementById('variant'),count=document.getElementById('count'),empty=document.getElementById('empty'),background=document.getElementById('background');
const normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function filter(){const words=normal(search.value).split(/\s+/).filter(Boolean);let n=0;for(const card of cards){const visible=(!group.value||card.dataset.group===group.value)&&(!lot.value||card.dataset.lot===lot.value)&&(!variant.value||card.dataset.variant===variant.value)&&words.every(word=>normal(card.dataset.search).includes(word));card.hidden=!visible;if(visible)n++;}count.textContent=n+' individu'+(n===1?'':'s')+' affiché'+(n===1?'':'s')+' sur 72.';empty.hidden=n!==0;}
document.getElementById('filters').addEventListener('input',filter);
document.getElementById('filters').addEventListener('change',filter);
document.getElementById('filters').addEventListener('reset',()=>{queueMicrotask(filter);});
background.addEventListener('click',()=>{const light=document.body.classList.toggle('light');background.setAttribute('aria-pressed',String(light));background.textContent=light?'Fond à damier':'Fond clair';});
</script></body></html>`;
fs.mkdirSync(base,{recursive:true});
fs.writeFileSync(`${base}/index.html`,html);
console.log(JSON.stringify({gallery:`${base}/index.html`,cards:assets.length,groups:groups.length,offline:true}));
