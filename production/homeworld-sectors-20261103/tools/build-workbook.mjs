/**
 * Build MMK-20261103 review documents from real files and the production manifest.
 * Spreadsheet authoring uses the bundled @oai/artifact-tool runtime.
 * Run a copy of this file from a temporary directory linked to its node_modules.
 * Usage: node build-workbook.mjs [--base /absolute/batch] [--repo /absolute/repository] [--docs-only]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const base = path.resolve(arg('--base', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const repo = path.resolve(arg('--repo', path.join(base, '../..')));
const outputDir = path.resolve(arg('--output', path.join(repo, '..', 'outputs/homeworld-sectors-20261103')));
const docsOnly = process.argv.includes('--docs-only');
const json = async (file, fallback = null) => {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
};
const catalogue = await json(path.join(base, 'catalogue.json'));
if (!catalogue) throw new Error('catalogue.json is required');
const manifest = await json(path.join(base, 'manifest.json'), {});
const technical = await json(path.join(base, 'technical-report.json'), {});
const technicalEntries = technical.assets ?? technical.results ?? technical.images ?? technical.files ?? [];
const technicalById = new Map((Array.isArray(technicalEntries) ? technicalEntries : Object.values(technicalEntries)).map(x => [x.id, x]));
const rawAssets = manifest.assets ?? manifest.generatedAssets ?? [];
const rawById = new Map(rawAssets.map(x => [x.id, x]));
if (rawById.size !== rawAssets.length) throw new Error('Duplicate new asset IDs');
const plans = [...catalogue.newAssetPlan];
for (const asset of rawAssets) {
  if (!plans.some(p => p.id === asset.id)) plans.push({ id: asset.id, area: asset.area, label: asset.label, kind: asset.kind ?? 'État supplémentaire', targetIds: asset.targetIds ?? [], purpose: asset.purpose ?? '', placementNote: asset.placementNote ?? '', loreStatus: 'ADAPTATION_ORIGINALE_COMPATIBLE' });
}
const areaNames = { market: 'Marché', mounts: 'Montures', kennels: 'Chenils' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const join = x => Array.isArray(x) ? x.join(' ; ') : String(x ?? '');
const inheritsView = a => (a.viewPolicy ?? a.generationCameraRequest?.mode ?? a.camera_requested?.mode) === 'INHERIT_REFERENCE_VIEW';
const viewLabel = a => inheritsView(a) ? 'Vue de la référence conservée' : 'Cible orthographique 0°/35°';
const viewDetail = a => `${viewLabel(a)}. ${inheritsView(a) ? 'Aucune conversion à 0°/35° revendiquée.' : 'Orientation demandée au générateur.'} Angle réel non mesuré.`;
const referenceFiles = a => a.sourceAssetFiles ?? (a.sourceAssetIds ?? []).map(id => rawById.get(id)?.path).filter(Boolean);
const toRepoPath = p => {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : p.startsWith('production/') || p.startsWith('public/') ? path.join(repo, p) : path.join(base, p);
  const rel = path.relative(repo, abs).split(path.sep).join('/');
  if (rel.startsWith('../')) throw new Error(`Asset outside repository: ${p}`);
  return { abs, rel, local: path.relative(base, abs).split(path.sep).join('/') };
};
const assets = [];
for (const plan of plans) {
  const raw = rawById.get(plan.id) ?? {};
  const tech = technicalById.get(plan.id) ?? {};
  const location = toRepoPath(raw.path ?? raw.file ?? raw.png?.path);
  let bytes = null, sha256 = null, width = null, height = null, exists = false;
  if (location) {
    try {
      const buffer = await fs.readFile(location.abs);
      if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Not a PNG: ${location.rel}`);
      width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20);
      bytes = buffer.length; sha256 = crypto.createHash('sha256').update(buffer).digest('hex'); exists = true;
      if (raw.sha256 && raw.sha256 !== sha256) throw new Error(`SHA-256 mismatch: ${plan.id}`);
      if (raw.width && raw.width !== width || raw.height && raw.height !== height) throw new Error(`Dimension mismatch: ${plan.id}`);
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  const hasTransparency = raw.hasTransparency ?? raw.alpha?.hasTransparency ?? tech.hasTransparency ?? tech.alpha?.hasTransparency ??
    (typeof raw.transparentRatio === 'number' ? raw.transparentRatio > 0 : null);
  const alphaBounds = raw.alphaBounds ?? tech.alphaBounds ?? {};
  const margin0 = alphaBounds['0']?.minMargin ?? raw.minimumVisibleMargin ?? raw.alpha?.minimumMargin ?? tech.minimumVisibleMargin ?? null;
  const margin24 = alphaBounds['24']?.minMargin ?? null;
  const proposed = raw.proposedWorldSize ?? raw.proposedScale?.world ?? raw.dimensionsWorld ?? {};
  const proposedMetres = raw.proposedMetres ?? raw.requested_dimensions_m ?? {};
  const notes = [plan.placementNote, ...[raw.notes ?? []].flat()].filter(Boolean);
  assets.push({ ...plan, ...raw, id: plan.id, area: raw.area ?? plan.area, label: raw.label ?? plan.label, kind: raw.kind ?? plan.kind,
    targetIds: raw.targetIds ?? plan.targetIds ?? [], purpose: raw.purpose ?? plan.purpose,
    path: location?.rel ?? null, localPath: location?.local ?? null, exists, width, height, bytes, sha256,
    hasTransparency, minimumVisibleMargin: margin0, marginAlpha0: margin0, marginAlpha24: margin24, alphaBounds, proposedWorldSize: proposed, proposedMetres,
    humanValidated: raw.humanValidated === true, runtimeIntegrated: raw.runtimeIntegrated === true,
    loreStatus: raw.loreStatus ?? 'ADAPTATION_ORIGINALE_COMPATIBLE', canonicalOneToOne: false,
    generationStatus: exists ? 'GENERATED_INDEPENDENT_ART_CANDIDATE' : plan.generationStatus ?? 'PLANIFIE',
    status: exists ? raw.status ?? 'GENERE_A_REVOIR' : 'A_GENERER', notes });
}
const present = assets.filter(x => x.exists);
if (!docsOnly && present.length !== assets.length) throw new Error(`Cannot export final workbook: ${present.length}/${assets.length} PNG files present`);
const deliveredByTarget = new Map();
for (const a of assets) for (const t of a.targetIds) deliveredByTarget.set(t, [...deliveredByTarget.get(t) ?? [], a]);
const targets = catalogue.inheritedTargets.map(t => ({ ...t, additions: deliveredByTarget.get(t.id) ?? [] }));
const coverageRows = targets.map(t => ({
  id: t.id,
  noSpecificSourceAtBaseline: ['NO_SPECIFIC_INDEPENDENT_SOURCE_IDENTIFIED','NO_EXACT_TARGET_FILENAME'].includes(t.currentSourceStatus),
  deliveredCandidateIds: t.additions.filter(a => a.exists).map(a => a.id),
  existingExactCandidateCount: (t.exactTargetPngPaths ?? []).length,
  existingRelatedCandidateCount: (t.existingIndependentRelatedCandidates ?? []).length,
}));
catalogue.inheritedTargetCoverage = {
  targetCount: coverageRows.length,
  targetsWithCandidate: coverageRows.filter(t => t.deliveredCandidateIds.length || t.existingExactCandidateCount || t.existingRelatedCandidateCount).length,
  baselineWithoutSpecificCount: coverageRows.filter(t => t.noSpecificSourceAtBaseline).length,
  baselineWithoutSpecificNowWithDelivery: coverageRows.filter(t => t.noSpecificSourceAtBaseline && t.deliveredCandidateIds.length).length,
  uncoveredTargets: coverageRows.filter(t => !t.deliveredCandidateIds.length && !t.existingExactCandidateCount && !t.existingRelatedCandidateCount).map(t => t.id),
  sourceClosedChanged: false,
  evidence: 'modularity-audit-round3.json',
  previousEvidence: ['modularity-audit-round2.json'],
};
if (!docsOnly && catalogue.inheritedTargetCoverage.uncoveredTargets.length) throw new Error('Inherited target without an identified candidate');
for (const a of assets) for (const id of a.targetIds) if (!targets.some(t => t.id === id)) targets.push({ id, family: areaNames[a.area], label: a.label,
  currentSourceStatus: 'NOUVEAU_BATIMENT', exactTargetPngPaths: [], existingIndependentRelatedCandidates: [],
  sourceClosed: false, canonicalOneToOneClaimed: false, additions: deliveredByTarget.get(id) ?? [] });
catalogue.deliveredAssets = assets;
for (const plan of catalogue.newAssetPlan) if (plan.productionPass === 3 && present.some(a => a.id === plan.id)) plan.generationStatus = 'GENERATED_INDEPENDENT_ART_CANDIDATE';
catalogue.deliveryCounts = { planned: assets.length, actualPng: present.length, uniqueSha256: new Set(present.map(x => x.sha256)).size,
  inheritedTargets: catalogue.inheritedTargets.length, newRuntimeAdmissions: assets.filter(x => x.runtimeIntegrated).length,
  humanValidated: assets.filter(x => x.humanValidated).length, canonicalCertifications: 0,
  byProductionPass: Object.fromEntries([1,2,3].map(pass => [pass, present.filter(a => (a.productionPass ?? 1) === pass).length])),
  inheritedReferenceView: present.filter(inheritsView).length,
  projectCameraTargetNotMeasured: present.filter(a => !inheritsView(a)).length };
await fs.writeFile(path.join(base, 'catalogue.json'), JSON.stringify(catalogue, null, 2) + '\n');

const sourceLinks = catalogue.sources.map(s => `- **${s.title}** : [source](${s.url}). ${s.scope} ${s.limit}`).join('\n');
const sectorRows = Object.keys(areaNames).map(k => `| ${areaNames[k]} | ${assets.filter(a => a.area === k).length} | ${present.filter(a => a.area === k).length} |`).join('\n');
const fileRows = assets.map(a => `| ${a.id} | ${a.label} | ${join(a.targetIds)} | ${a.exists ? `[PNG](${a.localPath})` : 'À produire'} | ${a.exists ? `${a.width} × ${a.height}` : '—'} |`).join('\n');
const continuationAssets = assets.filter(a => a.productionPass === 2);
const continuationRows = continuationAssets.map(a => `| ${a.id} | ${a.label} | ${join(a.complements)} | ${join(a.targetIds)} |`).join('\n');
const continuationSection = continuationAssets.length ?
  `## Deuxième passe : composants détachés et raccords\n\n` +
  `La seconde passe ajoute ${continuationAssets.length} composants aux 17 sources déjà livrées. Elle complète la modularité des ensembles : les cibles V81 restent les mêmes. Le [plan de production](next-targets-round2.json), l’[audit ciblé](modularity-audit-round2.json) et la [revue complémentaire](review-round2.md) conservent les décisions, les sources apparentées et les limites observées.\n\n` +
  `| ID | Composant | Complète | Cible conservée |\n| --- | --- | --- | --- |\n${continuationRows}\n\n` +
  `Le chariot cargo V78 et le crochet de trophées V114 existaient déjà et restent réutilisables. Les angles de garde-corps urbains ne sont pas assimilés à des raccords validés pour la barrière lourde M04. Les laisses et leurres de K03 étaient incorporés au râtelier ; K07 et K08 fournissent des objets autonomes. K09 est un collier original du projet, sans attribution à un modèle canonique.\n\n` +
  `Le cadre M08 et le battant M09 proposent les éléments séparés d’un portail de grand enclos. Leurs raccords, dimensions, pivots et collisions demandent une vérification dans la scène, comme ceux du couple K02/K06. Aucun état animé fonctionnel n’est déduit de la présence de ces PNG.\n\n` : '';
const thirdPassAssets = assets.filter(a => a.productionPass === 3);
const inheritedViewAssets = assets.filter(inheritsView);
const sourceFileLinks = a => referenceFiles(a).map(file => `[${file}](${toRepoPath(file).local})`).join('<br>');
const thirdPassRows = thirdPassAssets.map(a => `| ${a.id} | ${a.label} | ${join(a.targetIds)} | ${viewLabel(a)} | ${sourceFileLinks(a)} |`).join('\n');
const freeCanopy = assets.find(a => a.id === 'HWM162-S10');
const thirdPassSection = thirdPassAssets.length ?
  `## Troisième passe : états et composants de fonctionnement\n\n` +
  `Cette passe ajoute ${thirdPassAssets.length} PNG aux ${assets.filter(a => (a.productionPass ?? 1) < 3).length} déjà livrés. Elle fournit une caisse ouverte, un cylindre détaché de son rack, un auvent libre, une mangeoire vide, deux orientations natives de clôture, trois cages ouvertes et une barrière d’énergie désactivée. Les 40 cibles héritées et les deux bâtiments ajoutés restent les mêmes. Le [plan de cette passe](next-targets-round3.json), l’[audit des équivalents](modularity-audit-round3.json) et la [revue des dix ajouts](review-round3.md) décrivent les sources et les contrôles.\n\n` +
  `L’audit de cette passe utilise la tête de PR \`${catalogue.continuation.baselineCommit}\`, après la livraison des 25 premiers PNG au commit \`${catalogue.continuation.previousDeliveryCommit}\`.\n\n` +
  `| ID | Objet ou état | Cible conservée | Vue demandée | Source visuelle reprise |\n| --- | --- | --- | --- | --- |\n${thirdPassRows}\n\n` +
  `Les éditions ${thirdPassAssets.filter(inheritsView).map(a => a.id).join(', ')} conservent la vue de leur référence. Les cages et la barrière d’énergie reprennent notamment des vues historiques trois-quarts. Aucune conversion générale de ces fichiers vers une vue frontale 0°/35° n’est revendiquée. Les trois nouvelles vues de S09, M11 et M12 demandent la cible du Homeworld ; leur angle réel n’est pas mesuré à partir du PNG.\n\n` +
  `Les lampes suspendues V33 gauche et droite existaient déjà et restent des sources réutilisables. Aucun doublon de lampe n’est ajouté. Les états ouverts, vides ou désactivés conservent leurs sources de départ ; les pivots et l’alignement des paires doivent être contrôlés en scène. Les clôtures M11/M12 sont des générations natives, sans symétrie de pixels, dont le raccord avec M07 reste à tester.\n\n` +
  `M11 utilise la deuxième sortie, après une correction ciblée des voyants et détails de poteaux. La première tentative reste archivée hors du dossier des sprites ; elle n’augmente pas le nombre de PNG sélectionnés. Le reçu montures conserve le motif et les deux empreintes.\n\n` +
  (freeCanopy?.exists ? `L’auvent S10 est libre de comptoir et de marchandises. Sa silhouette visible est entière, avec une marge minimale de ${freeCanopy.marginAlpha24} px au seuil alpha > 24 ; ce cadrage est plus serré que la marge demandée au générateur. Les pixels d’origine sont conservés, sans ajout de bordure ni retouche alpha.\n\n` : '') : '';
const readme = `# Marché, montures et chenils — 2026-11-03\n\n` +
  `Lot de production \`MMK-20261103\`. Les identifiants de génération \`HWM162-*\` sont conservés. Ce dossier est distinct du lot de terrains \`homeworld-v162\` ajouté en parallèle.\n\n` +
  `Ce lot complète les sources de la PR [#99](https://github.com/${catalogue.repository}/pull/99) avec **${present.length} PNG indépendants présents** pour ${assets.length} objets ou états planifiés. Chaque objet est un fichier séparé. Les anciennes sources restent à leur emplacement.\n\n` +
  `| Secteur | Objets ou états du lot | PNG présents |\n| --- | ---: | ---: |\n${sectorRows}\n\n` +
  `## Consulter les fichiers\n\n` +
  `- [Galerie locale](index.html) : un aperçu par PNG, filtre par secteur et recherche par ID.\n` +
  `- [Classeur de suivi](YAUTJA_MARCHE_MONTURES_CHENILS_20261103.xlsx) : livraison, 40 cibles héritées et nouveaux bâtiments, implantation et références.\n` +
  `- [Catalogue](catalogue.json) : liste des objets, fonctions, sources antérieures et données mesurées.\n` +
  `- [Manifeste des générations](manifest.json) et [contrôles techniques](technical-report.json).\n\n` +
  `| ID | Objet | Cible du projet | Fichier | Pixels réels |\n| --- | --- | --- | --- | --- |\n${fileRows}\n\n` +
  continuationSection + thirdPassSection +
  `## Fidélité et portée des références\n\n` +
  `Les bâtiments de marché, d’écurie et de chenil sont des **adaptations originales du projet**. Les références ci-dessous orientent leur cohérence visuelle et leur fonction. Elles ne fournissent pas les plans canoniques de ces bâtiments. Ce lot ne porte aucune certification de reproduction 1:1.\n\n` +
  `${sourceLinks}\n\n` +
  `Le chien de Predators (2010) et celui de The Predator (2018) restent deux références distinctes. Leurs accessoires et proportions ne doivent pas être fusionnés. Les concepts abandonnés de montures de Badlands ne deviennent pas des scènes du film.\n\n` +
  `## Échelle et implantation\n\n` +
  `La cible de caméra du Homeworld est une projection orthographique, yaw global 0°, inclinaison 35°, profondeur ${catalogue.camera.depthScale}. ${inheritedViewAssets.length} éditions de ce lot conservent toutefois la vue de leur référence, identifiée dans le catalogue, la galerie et le classeur. Cette vue héritée est distincte de la cible du projet ; aucun angle réel n’est certifié par le PNG. La convention du Homeworld est un adulte de 100 unités pour 2,3 m. La porte minimale du contrat mesure 80 × 128 unités ; sa cible est 96 × 140. Ces valeurs décrivent le jeu.\n\n` +
  `Les dimensions en pixels sont lues dans les fichiers. Les dimensions physiques ou en unités du monde restent des **propositions de placement**, lorsqu’elles sont renseignées. Elles ne sont ni des mesures officielles du lore, ni une preuve d’échelle en jeu. Les objets doivent garder leurs proportions ; aucune rotation CSS, symétrie ou mise à l’échelle non uniforme ne compense une vue incorrecte.\n\n` +
  `Le marché réserve les faces de prise, la circulation entre les étals et un accès de manutention au stock. Les montures demandent une aire de retournement adaptée à l’espèce et un accès latéral du soigneur. Les chenils séparent le couloir des soigneurs, le sas, le repos et l’enclos. Une porte ou barrière dessinée ne constitue pas un état jouable ou une collision.\n\n` +
  `Le portique ouvert HWM162-K02 et le battant coulissant indépendant HWM162-K06 correspondent à une seule cible héritée, target-v81-71-269. Leur superposition est proposée ; le raccord, le pivot, l’échelle et les collisions ne sont pas testés en scène. Ces deux fichiers ne constituent pas encore une porte animée fonctionnelle.\n\n` +
  `## Sources existantes conservées\n\n` +
  `L’audit porte sur 14 cibles de marché, 1 bâtiment de marché, 15 cibles de faune et 10 de montures. Les 5 sources de harnachement/mangeoire des montures et les 11 cibles de faune possédant des PNG nommés sont conservées. Le kiosque HWA160-023, les étals, auvents, caisses, lampes et autres objets connexes gardent leurs identités. Le grand marché HWA160-029 est une archive RGB opaque ; il n’est pas compté comme sprite transparent.\n\n` +
  `${catalogue.inheritedTargetCoverage.targetsWithCandidate} des ${catalogue.inheritedTargetCoverage.targetCount} cibles héritées disposent d’au moins un candidat identifié : un PNG spécifique, une source apparentée conservée ou une création de ce lot. Les ${catalogue.inheritedTargetCoverage.baselineWithoutSpecificCount} cibles dont la source indépendante spécifique n’était pas identifiée avant le lot possèdent désormais ${catalogue.inheritedTargetCoverage.baselineWithoutSpecificNowWithDelivery === catalogue.inheritedTargetCoverage.baselineWithoutSpecificCount ? 'chacune' : 'pour certaines'} un candidat livré. Cette couverture décrit les sources disponibles ; leur adéquation visuelle et leur admission restent à vérifier.\n\n` +
  `Un candidat ancien reste un candidat. Le registre des cibles V81 et les classeurs historiques ne sont pas clôturés par la présence d’une image. Les liens du catalogue pointent vers les sources originales plutôt que vers des copies comptées comme nouveaux objets.\n\n` +
  `## Vérification et état de livraison\n\n` +
  `Le générateur de ce dossier relit les signatures PNG, tailles, dimensions et SHA-256 avant l’export du classeur. Le rapport technique sépare les contrôles d’alpha et de cadrage de la revue visuelle. Les marges aux seuils alpha > 0 et alpha > 24 sont indiquées séparément : le premier inclut les traces d’opacité très faible, le second aide à examiner la silhouette visible. Aucune retouche du canal alpha n’est appliquée par ces documents. Les pivots, accès, collisions, raccords et occlusions demandent une vérification dans la scène avant admission au runtime. Le statut de revue humaine conserve son sens dans le projet.\n\n` +
  `Base de l’audit initial : main \`${catalogue.baseline.main}\` et tête de PR à cet instant \`${catalogue.baseline.head}\`. Les sources runtime pertinentes et les archives V114 étaient identiques entre ces deux états lors de l’audit. Cette base datée n’est pas présentée comme la tête finale de la PR après livraison.\n\n` +
  `### Reconstruire les documents\n\n` +
  `Exécuter une copie de \`tools/build-workbook.mjs\` avec le Node du runtime primaire et \`@oai/artifact-tool\` installé dans son répertoire temporaire. Passer \`--repo /chemin/du/depot --base /chemin/du/depot/production/homeworld-sectors-20261103\`. Sans option, le script prend son dossier parent comme dossier de lot. L’option \`--docs-only\` régénère le catalogue, la galerie et ce document sans créer le classeur. Le manifeste et les PNG restent les entrées autoritatives.\n`;
await fs.writeFile(path.join(base, 'README.md'), readme);

const cards = assets.map(a => `<article class="asset" data-area="${esc(a.area)}" data-search="${esc([a.id,a.label,...a.targetIds].join(' ').toLowerCase())}">
  <a class="preview" ${a.exists ? `href="${esc(a.localPath)}" target="_blank"` : ''}>${a.exists ? `<img src="${esc(a.localPath)}" alt="${esc(a.label)}" loading="lazy">` : '<span>Image à produire</span>'}</a>
  <div class="card-body"><p class="eyebrow">${esc(a.id)} · ${esc(areaNames[a.area] ?? a.area)}</p><h2>${esc(a.label)}</h2>
  <p class="purpose">${esc(a.purpose)}</p><dl><div><dt>Source</dt><dd>${a.exists ? `${a.width} × ${a.height} px` : 'En attente'}</dd></div><div><dt>Lore</dt><dd>Adaptation originale</dd></div><div><dt>Passe</dt><dd>${a.productionPass ?? 1}</dd></div><div><dt>Vue</dt><dd>${esc(viewLabel(a))} ; angle non mesuré</dd></div><div><dt>Cible</dt><dd>${esc(join(a.targetIds))}</dd></div>${a.complements?.length ? `<div><dt>Complète</dt><dd>${esc(join(a.complements))}</dd></div>` : ''}</dl>
  <p class="note">${esc(a.placementNote)}</p>${referenceFiles(a).length ? `<p class="note">Référence : ${referenceFiles(a).map(file => `<a href="${esc(toRepoPath(file).local)}">${esc(path.basename(file))}</a>`).join(', ')}</p>` : ''}${a.exists ? `<a class="download" href="${esc(a.localPath)}" download>Télécharger ce PNG</a>` : ''}</div></article>`).join('\n');
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Marché, montures et chenils — 2026-11-03</title><style>
*{box-sizing:border-box}body{margin:0;background:#141719;color:#e5e8e8;font:15px/1.55 system-ui,sans-serif}a{color:#e5ba76}header,main,footer{max-width:1380px;margin:auto;padding:30px}header{padding-top:56px}h1{font-size:clamp(28px,4vw,48px);line-height:1.1;max-width:850px;margin:12px 0 20px}p{margin:8px 0}.lead{max-width:860px;color:#b9c2c5;font-size:17px}.kicker,.eyebrow{text-transform:uppercase;letter-spacing:.07em;font-size:11px;color:#d6aa65}.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:#141719f2;border-bottom:1px solid #364045;padding:14px 30px;z-index:3;max-width:1380px;margin:auto}.toolbar button,.toolbar input,.toolbar select{font:inherit;border:1px solid #566066;background:#252b2f;color:#edf1f2;border-radius:6px;padding:9px 13px}.toolbar button[aria-pressed=true]{background:#9d733b;color:#fff;border-color:#c79d5d}.toolbar input{flex:1;min-width:220px}.count{color:#b3bec3;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:24px}.asset{border:1px solid #394248;background:#20262a;border-radius:10px;overflow:hidden}.preview{height:300px;display:flex;justify-content:center;align-items:center;background-color:#30383d;background-image:linear-gradient(45deg,#4b555b 25%,transparent 25%),linear-gradient(-45deg,#4b555b 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#4b555b 75%),linear-gradient(-45deg,transparent 75%,#4b555b 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.preview img{width:100%;height:100%;object-fit:contain;padding:12px}.card-body{padding:20px}h2{font-size:19px;line-height:1.3;margin:7px 0 12px}.purpose{color:#d1d8dc;min-height:48px}.note{font-size:13px;color:#aebcc1;margin-top:14px}.download{display:inline-block;margin-top:16px}dl{margin:20px 0 0;border-top:1px solid #39454c;padding-top:10px}dl div{display:flex;gap:15px;font-size:12px;margin:5px 0}dt{color:#9dadb5;min-width:50px}dd{margin:0;overflow-wrap:anywhere}footer{color:#aebbc1;font-size:13px}footer p{max-width:1050px}[hidden]{display:none!important}body[data-background=white] .preview{background:#fff}body[data-background=dark] .preview{background:#101315}@media(max-width:600px){header,main,footer{padding:22px}.toolbar{padding:14px 22px}.preview{height:270px}}
</style></head><body><header><div class="kicker">Yautja — La Longue Chasse · MMK-20261103</div><h1>Marché, montures<br>et chenils</h1><p class="lead">${present.length} PNG indépendants présents. Chaque carte ouvre le fichier complet sur fond transparent. Les bâtiments et aménagements de ce lot sont des adaptations originales du projet.</p><p><a href="YAUTJA_MARCHE_MONTURES_CHENILS_20261103.xlsx">Classeur détaillé</a> · <a href="README.md">Références et limites</a> · <a href="manifest.json">Manifeste</a> · <a href="review-round3.md">Revue de la troisième passe</a></p><p class="lead">${thirdPassAssets.length} ajouts en troisième passe. ${inheritedViewAssets.length} éditions conservent la vue de leur référence ; cette vue est indiquée sur leur carte.</p></header>
<nav class="toolbar" aria-label="Filtres de la galerie"><button data-filter="all" aria-pressed="true">Tous</button><button data-filter="market" aria-pressed="false">Marché</button><button data-filter="mounts" aria-pressed="false">Montures</button><button data-filter="kennels" aria-pressed="false">Chenils</button><input type="search" aria-label="Rechercher un sprite" placeholder="Objet ou identifiant"><select aria-label="Fond des aperçus"><option value="checker">Damier</option><option value="dark">Fond sombre</option><option value="white">Fond blanc</option></select><span class="count" aria-live="polite"></span></nav>
<main><section class="grid" aria-label="Sprites indépendants">${cards}</section></main>
<footer><p>Les pixels, fichiers et empreintes sont vérifiables. La perspective exacte, les dimensions physiques, les pivots et les collisions ne sont pas certifiés par une image. La présence dans cette galerie n’est pas une admission au runtime ni une validation humaine.</p><p>Cible Homeworld : orthographique, yaw 0°, pitch 35°. Les éditions signalées conservent la vue de leur référence ; aucune conversion générale à cette cible n’est revendiquée. Les sources historiques restent conservées. Aucun montage n’est compté comme un objet indépendant.</p></footer><script>
let filter='all';const search=document.querySelector('input'),cards=[...document.querySelectorAll('.asset')],count=document.querySelector('.count');function update(){let n=0;for(const card of cards){const show=(filter==='all'||card.dataset.area===filter)&&card.dataset.search.includes(search.value.toLowerCase().trim());card.hidden=!show;if(show)n++}count.textContent=n+' / '+cards.length+' objets'}document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update()}));search.addEventListener('input',update);document.querySelector('select').addEventListener('change',e=>document.body.dataset.background=e.target.value);update();
</script></body></html>`;
await fs.writeFile(path.join(base, 'index.html'), html);
if (docsOnly) { console.log(JSON.stringify({documents:true,pngPresent:present.length,planned:assets.length})); process.exit(0); }

const { Workbook, SpreadsheetFile } = await import('@oai/artifact-tool');
const workbook = Workbook.create();
const sheets = Object.fromEntries(['Livraison','Catalogue','Implantation','Références'].map(n => [n,workbook.worksheets.add(n)]));
const colors={ink:'#202A2F',muted:'#66757D',head:'#34474F',line:'#D4DCE0',amber:'#FFF0D8',stripe:'#F2F5F6'};
function setup(sheet, title, subtitle, widths, endRow, headerRow, headers, rows, tableName) {
  sheet.showGridLines=false;
  const endCol=String.fromCharCode(64+headers.length);
  const used=sheet.getRange(`A1:${endCol}${endRow}`); used.format.font={name:'Arial',size:10,color:colors.ink};used.format.verticalAlignment='center';
  used.format.rowHeight=22;
  sheet.getRange('A2').values=[[title]];sheet.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:colors.ink};sheet.getRange('A2').format.rowHeight=30;
  sheet.getRange('A3').values=[[subtitle]];sheet.getRange('A3').format.font={italic:true,color:colors.muted};
  sheet.getRange(`A4:${endCol}4`).format.borders={bottom:{style:'thin',color:colors.line}};
  headers.forEach((_,i)=>{sheet.getRangeByIndexes(0,i,endRow,1).format.columnWidth=widths[i]??22;});
  sheet.getRangeByIndexes(headerRow-1,0,1,headers.length).values=[headers];
  const header=sheet.getRangeByIndexes(headerRow-1,0,1,headers.length);header.format={fill:colors.head,font:{bold:true,color:'#FFFFFF'},wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',rowHeight:34};
  if(rows.length){sheet.getRangeByIndexes(headerRow,0,rows.length,headers.length).values=rows;sheet.getRangeByIndexes(headerRow,0,rows.length,headers.length).format.wrapText=true;sheet.getRangeByIndexes(headerRow,0,rows.length,headers.length).format.rowHeight=64;}
  sheet.tables.add(`A${headerRow}:${endCol}${headerRow+rows.length}`,true,tableName);
  sheet.freezePanes.freezeRows(headerRow);sheet.freezePanes.freezeColumns(1);
}
const deliveryRows=assets.map(a=>[a.id,areaNames[a.area]??a.area,a.label,a.kind,a.exists?'PNG présent':'À produire',a.width,a.height,a.bytes,
  a.hasTransparency===null?'À mesurer':a.hasTransparency?'Oui':'Non',a.marginAlpha0,a.marginAlpha24,a.targetIds.join('\n'),a.path,a.humanValidated?'Validé':'À revoir',a.runtimeIntegrated?'Intégré':'Non intégré',a.sha256,
  viewDetail(a),referenceFiles(a).join('\n')]);
const dh=['ID','Secteur','Sprite','Type','Présence','Largeur (px)','Hauteur (px)','Taille (octets)','Transparence réelle','Marge alpha > 0 (px)','Marge alpha > 24 (px)','Cible du projet','Fichier','Revue humaine','Runtime','SHA-256','Vue demandée, angle non mesuré','Source visuelle reprise'];
setup(sheets.Livraison,'Marché, montures et chenils — 03/11/2026','Sources indépendantes et état de livraison au 3 novembre 2026',[23,14,38,18,18,14,14,18,19,20,20,33,76,18,18,69,51,100],assets.length+14,13,dh,deliveryRows,'LivraisonMMK20261103');
const last=13+assets.length;
sheets.Livraison.getRange('A6:B9').values=[['Objets ou états du lot',null],['PNG présents',null],['Revue humaine validée',null],['Admission runtime',null]];
sheets.Livraison.getRange('B6:B9').formulas=[[`=COUNTA(A14:A${last})`],[`=COUNTIFS(E14:E${last},"PNG présent")`],[`=COUNTIFS(N14:N${last},"Validé")`],[`=COUNTIFS(O14:O${last},"Intégré")`]];
sheets.Livraison.getRange('A6:A9').format.font={bold:true};sheets.Livraison.getRange('B6:B9').setNumberFormat('#,##0');
sheets.Livraison.getRange('D6').values=[['Lore : adaptations originales']];sheets.Livraison.getRange('D7').values=[['Aucune certification visuelle 1:1']];
sheets.Livraison.getRange('D8').values=[['Les 40 cibles héritées sont conservées']];sheets.Livraison.getRange('D9').values=[['Pixels mesurés ; échelle physique proposée']];
sheets.Livraison.getRange('D10').values=[['Marges alpha > 0 et > 24 ; aucune correction alpha par script']];
if (continuationAssets.length) sheets.Livraison.getRange('D11').values=[[`${continuationAssets.length} composants en deuxième passe ; ${thirdPassAssets.length} objets ou états en troisième passe`]];
sheets.Livraison.getRange('D12').values=[[`${inheritedViewAssets.length} vues héritées de références ; détail de caméra en colonnes Q et R`]];
sheets.Livraison.getRange(`F14:H${last}`).setNumberFormat('#,##0');sheets.Livraison.getRange(`J14:K${last}`).setNumberFormat('#,##0');
for (const [i,asset] of assets.entries()) if (asset.productionPass === 3) sheets.Livraison.getRange(`A${14+i}:R${14+i}`).format.rowHeight=92;
sheets.Livraison.getRange(`E14:E${last}`).conditionalFormats.add('containsText',{text:'À produire',format:{fill:'#FDE9E6',font:{color:'#963826',bold:true}}});
sheets.Livraison.tabColor='#34474F';

const humanStatus={EXACT_TARGET_CANDIDATE_EXISTS_NOT_ADMITTED:'Candidat spécifique existant',RELATED_INDEPENDENT_SOURCE_EXISTS_FIT_UNCERTIFIED:'Source apparentée existante',NO_SPECIFIC_INDEPENDENT_SOURCE_IDENTIFIED:'Source spécifique non identifiée',CANOPY_BUILDING_EXISTS_OPAQUE_MARKET_SCENE_NOT_A_SPRITE:'Halle/auvent existant ; grande scène opaque',NO_EXACT_TARGET_FILENAME:'Source spécifique non identifiée',NOUVEAU_BATIMENT:'Nouveau bâtiment'};
const targetRows=targets.map(t=>[t.id,t.family,t.label,humanStatus[t.currentSourceStatus]??t.currentSourceStatus,
  t.additions.map(a=>a.id).join('\n'),(t.exactTargetPngPaths??[]).join('\n'),(t.existingIndependentRelatedCandidates??[]).join('\n'),
  t.sourceClosed?'Clôturée':'Ouverte','Adaptation originale',t.additions.length?'Vérifier nouvelle source, accès, échelle et collision.':'Conserver la source et vérifier son adaptation au lieu.']);
setup(sheets.Catalogue,'Catalogue des cibles','40 cibles héritées et bâtiments ajoutés ; composants rattachés à leurs cibles',[31,24,31,36,27,82,82,14,25,58],targets.length+7,6,
  ['Cible','Famille','Objet','État de la source avant le lot','Ajout du lot','PNG spécifiques conservés','Sources apparentées conservées','État du suivi','Lore','Prochaine vérification'],targetRows,'CatalogueMMK20261103');
sheets.Catalogue.getRange(`F7:G${targets.length+6}`).format.font={size:10,color:'#50646D'};
for (const [i,target] of targets.entries()) if (target.additions.some(a => a.productionPass === 3)) sheets.Catalogue.getRange(`A${7+i}:J${7+i}`).format.rowHeight=Math.max(64,target.additions.length*15+8);

const dimensionLabels={ramp_length:'Longueur de rampe',ramp_width:'Largeur de rampe',platform_width:'Largeur de plateforme',platform_depth:'Profondeur de plateforme',platform_height:'Hauteur de plateforme',clear_span:'Portée libre',door_height:'Hauteur de porte',door_width:'Largeur de porte',arm_length:'Longueur des branches',clear_passage_width:'Largeur libre du passage',clear_passage_height:'Hauteur libre du passage',overall_width:'Largeur totale',overall_height:'Hauteur totale',excludes:'Hors mesure'};
const dimensionDetail=(key,value)=>`${dimensionLabels[key]??key.replaceAll('_',' ')} : ${typeof value==='object'?JSON.stringify(value):value==='top rollers'?'galets supérieurs':value}${typeof value==='number'?' m':''}`;
const implantRows=assets.map(a=>[a.id,a.label,a.proposedMetres.width??null,a.proposedMetres.depth??null,a.proposedMetres.height??null,
  Object.entries(a.proposedMetres).filter(([k])=>!['width','depth','height'].includes(k)).map(([k,v])=>dimensionDetail(k,v)).join('\n'),
  Object.keys(a.proposedMetres).length?'Dimensions proposées au générateur':'Dimensions à définir',a.purpose,a.placementNote]);
setup(sheets.Implantation,'Échelle et implantation','Les dimensions proposées sont des conventions du jeu. Elles ne sont pas des mesures canoniques.',[23,38,17,18,17,52,40,66,86],assets.length+29,6,
  ['ID','Objet','Largeur (m)','Profondeur (m)','Hauteur (m)','Dimensions partielles proposées','Origine des dimensions','Fonction du lieu','Accès et contrôle en scène'],implantRows,'ImplantationMMK20261103');
sheets.Implantation.getRange(`C7:E${assets.length+6}`).setNumberFormat('#,##0.0');
for (const [i,asset] of assets.entries()) if (asset.productionPass === 2) sheets.Implantation.getRange(`C${7+i}:E${7+i}`).setNumberFormat('#,##0.00');
for (const [i,asset] of assets.entries()) if (asset.productionPass === 3) sheets.Implantation.getRange(`A${7+i}:I${7+i}`).format.rowHeight=92;
const cr=assets.length+10;
sheets.Implantation.getRange(`A${cr}:C${cr+7}`).values=[['Convention du projet','Valeur','Unité'],['Hauteur de l’acteur',100,'unités'],['Équivalent adopté',2.3,'mètres'],['Yaw global',0,'degrés'],['Inclinaison',35,'degrés'],['Compression de profondeur',catalogue.camera.depthScale,'coefficient'],['Porte minimale, largeur',80,'unités'],['Porte minimale, hauteur',128,'unités']];
sheets.Implantation.getRange(`A${cr}:C${cr}`).format={fill:colors.head,font:{bold:true,color:'#FFFFFF'}};
sheets.Implantation.getRange(`B${cr+1}:B${cr+7}`).setNumberFormat('0.000');
sheets.Implantation.getRange(`A${cr+10}`).values=[['Les valeurs de caméra ci-dessus sont la cible du Homeworld.']];
sheets.Implantation.getRange(`A${cr+11}`).values=[[`${inheritedViewAssets.length} éditions conservent la vue de leur référence ; aucun angle réel n’est mesuré.`]];
sheets.Implantation.getRange(`A${cr+12}`).values=[['Consulter Livraison, colonnes Q et R, pour la vue et la source de chaque PNG.']];

const refRows=catalogue.sources.map(s=>[s.id,s.title,s.nature,s.scope,s.limit,s.url]);
setup(sheets['Références'],'Références et portée','Les références visuelles sont séparées des créations originales du projet.',[26,49,31,75,75,96],refRows.length+8,6,
  ['ID source','Référence','Nature','Ce que la source établit','Limite pour ce lot','URL'],refRows,'ReferencesMMK20261103');
sheets['Références'].getRange(`A7:F${refRows.length+6}`).format.rowHeight=74;

await fs.mkdir(outputDir,{recursive:true});
workbook.recalculate();
const inspections=[];
inspections.push(await workbook.inspect({kind:'table',range:'Livraison!A6:E9',include:'values,formulas',tableMaxRows:4,tableMaxCols:5,maxChars:3500}));
inspections.push(await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:3500}));
const checks={actualFiles:present.length,expectedFiles:assets.length,uniqueIds:new Set(assets.map(a=>a.id)).size,uniqueHashes:new Set(present.map(a=>a.sha256)).size,targets:targets.length,sourceCount:catalogue.sources.length,
  productionPassCounts:catalogue.deliveryCounts.byProductionPass,
  inheritedReferenceViewIds:inheritedViewAssets.map(a=>a.id),
  cameraAnglesMeasured:false,
  inspections:inspections.map(x=>x.ndjson),nativeExcelInteractiveVerification:false};
await fs.writeFile(path.join(outputDir,'workbook-inspection.json'),JSON.stringify(checks,null,2)+'\n');
for(const [name,range] of [['Livraison','A1:J18'],['Catalogue','A1:E11'],['Implantation','A1:F12'],['Références','A1:E10']]){
  const preview=await workbook.render({sheetName:name,range,scale:1.3,format:'png'});
  await fs.writeFile(path.join(outputDir,`preview-${name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')}.png`),new Uint8Array(await preview.arrayBuffer()));
}
if (continuationAssets.length) {
  const firstNew = assets.findIndex(a => a.productionPass === 2);
  const lastNew = assets.findLastIndex(a => a.productionPass === 2);
  const views = [
    ['Livraison', `A${14 + firstNew}:K${14 + lastNew}`, 'preview-Livraison-complements.png'],
    ['Implantation', `A${7 + firstNew}:F${7 + lastNew}`, 'preview-Implantation-complements.png'],
    ...['target-v81-71-274','target-v81-72-287'].map(id => {
      const row = 7 + targets.findIndex(t => t.id === id);
      return ['Catalogue', `A${row - 1}:E${row + 1}`, `preview-Catalogue-${id}.png`];
    })
  ];
  for (const [sheetName, range, filename] of views) {
    const preview = await workbook.render({sheetName, range, scale:1.3, format:'png'});
    await fs.writeFile(path.join(outputDir,filename),new Uint8Array(await preview.arrayBuffer()));
  }
}
if (thirdPassAssets.length) {
  const firstNew = assets.findIndex(a => a.productionPass === 3);
  const lastNew = assets.findLastIndex(a => a.productionPass === 3);
  const views = [
    ['Livraison', `A${14+firstNew}:K${14+lastNew}`, 'preview-Livraison-round3.png'],
    ['Livraison', `Q${14+firstNew}:R${14+lastNew}`, 'preview-Livraison-round3-camera.png'],
    ['Implantation', `A${7+firstNew}:F${7+lastNew}`, 'preview-Implantation-round3.png'],
  ];
  for (const [sheetName,range,filename] of views) {
    const preview=await workbook.render({sheetName,range,scale:1.3,format:'png'});
    await fs.writeFile(path.join(outputDir,filename),new Uint8Array(await preview.arrayBuffer()));
  }
}
const exported=await SpreadsheetFile.exportXlsx(workbook);
const filename='YAUTJA_MARCHE_MONTURES_CHENILS_20261103.xlsx';
await exported.save(path.join(outputDir,filename));
await fs.copyFile(path.join(outputDir,filename),path.join(base,filename));
await fs.writeFile(path.join(base,'workbook-verification.json'),JSON.stringify(checks,null,2)+'\n');
console.log(JSON.stringify({workbook:path.join(base,filename),pngPresent:present.length,targets:targets.length,previews:outputDir}));
