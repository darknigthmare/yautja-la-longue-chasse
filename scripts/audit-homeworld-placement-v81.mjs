import fs from 'node:fs';
import path from 'node:path';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';

const root=process.cwd(),api=homeworldQaModelV64(root,[
 'homeworldPlacementGrammarV81.ts','homeworldAssetCatalogueV81.ts','homeworldContextCodexV71.ts',
 'homeworldWorldV77.ts','homeworldUrbanPopulationV78.ts','homeworldAuthoredLotsV81.ts',
 'homeworldCityNativeArtV78.ts','homeworldStreetModulesV78.ts','homeworldResidentPlacementsV81.ts',
]);
const files=[];
const walk=dir=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(/\.(png|webp|jpg|jpeg|svg)$/i.test(item.name))files.push('/'+path.relative(path.join(root,'public'),file).split(path.sep).join('/'));}};
walk(path.join(root,'public/game/homeworld'));
const audit=api.auditHomeworldPlacementV81(),catalogue=api.auditHomeworldAssetCatalogueV81(api.HOMEWORLD_ALL_ELEMENT_CODEX_V71,files);
const liveAssets=[...new Set(api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.map(r=>r.asset).filter(Boolean))];
const missingFiles=liveAssets.filter(src=>src.startsWith('/')&&!fs.existsSync(path.join(root,'public',src.slice(1))));
const report={schema:1,generatedAt:new Date().toISOString(),status:audit.errors.length||missingFiles.length?'FAIL_LOCAL_CONSTRAINTS':'PASS_LOCAL_CONSTRAINTS_WITH_RECORDED_GAPS',
 assessment:'Contraintes géométriques locales ; ni certification esthétique, ni 42 vues QA, ni fidélité canonique 1:1, ni publication.',
 audit,ruleFamilies:api.HOMEWORLD_RULES_V81,buildingLots:api.HOMEWORLD_BUILDING_LOTS_V81,blocks:api.HOMEWORLD_URBAN_BLOCKS_V81,
 authoredCourts:api.HOMEWORLD_AUTHORED_COURTS_V81,objects:api.HOMEWORLD_USAGE_OBJECTS_V81,legacyObjects:api.HOMEWORLD_LEGACY_USAGE_OBJECTS_V81,
 sourceInventory:{installedHomeworldFiles:files.length,codexRecords:api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.length,referencedAssets:liveAssets.length,missingFiles},
 assetCatalogue:catalogue,unplacedReviewedSources:api.HOMEWORLD_CITY_GENERATED_UNPLACED_V78,residentRevisions:Object.keys(api.HOMEWORLD_RESIDENT_PATH_REVISIONS_V81),
};
fs.mkdirSync(path.join(root,'work-local/v81'),{recursive:true});
fs.writeFileSync(path.join(root,'work-local/v81/homeworld-spatial-audit.json'),JSON.stringify(report));
const esc=s=>String(s??'—').replaceAll('|',' / ').replaceAll('\n',' '),n=v=>Math.round(v*10)/10;
const statuses=catalogue.reduce((r,e)=>(r[e.status]=(r[e.status]??0)+1,r),{});
if(process.argv.includes('--write-docs')){
 const placement=[
 '# Homeworld V81 — audit des placements réellement montés','',
 `Résultat local : **${report.status}**. ${audit.assertionCount.toLocaleString('fr-FR')} contraintes évaluées, ${api.HOMEWORLD_RULES_V81.length} familles sémantiques, ${audit.errors.length} erreur dure, ${audit.violations.length} avertissements conservés. Ce nombre désigne les couples objet/usage/seuil/circuit évalués, pas autant de règles indépendantes.`,
 '',`Inventaire : ${audit.counts.buildings} bâtiments visitables conservés, ${audit.counts.buildingsMoved} lots réimplantés, ${audit.counts.authoredCourts} cours composées individuellement, ${audit.counts.recomposedProps} solides recompilés utilisant ${audit.counts.uniqueAssets} sources différentes, ${audit.counts.legacySolids} solides historiques inventoriés. ${audit.counts.sceneryFacades} façades non interactives restent classées placeholders ; elles ne comptent pas comme nouvelles maisons visitables.`,
 '', '## Corrections intégrées au moteur et au rendu','',
 '- Le Palais 1100×700 et le Conseil 850×500 utilisent leur coque native mesurée. Les maisons de clan et industrielles activées occupent des lots réimplantés ; seuils, intérieurs, interactions, IDs et sauvegardes sont conservés.',
 '- Le port possède sept cours aux polygones, fonctions, compositions et nombres de props différents. Les poches méridionales et sept cours basses suivent des rues/activités différentes ; aucun gabarit de quatre props universel.',
 '- Les compilateurs réels V78/V80 distinguent contact physique, face de travail, approche de banc et espace social. Un meuble inutilisable est refusé sans réduire sa taille ni tourner son PNG en CSS.',
 '- Les 16 circuits touchés suivent les galeries, parvis et voies de livraison autour des volumes natifs. Les terrasses corporelles sont dessinées par le même terrain V77.',
 '- Deux socles polygonaux soutiennent les contacts des maisons du port et des clans. Le banc historique obstruant le nouveau seuil de l’esplanade est déplacé, avec source/ID/taille conservés.',
 '- Le routage garde plusieurs ancres vérifiées autour d’un seuil : une ancre proche enfermée dans l’alcôve ne condamne plus une porte accessible. Grille32, marge12, segments4 et collision corporelle restent inchangés.',
 '', '## Vérifications et limites','',
 'Les tests ciblés vérifient le corps entier sur les 98 circuits conservés et 14 supplémentaires, les 43 approches de porte, 14 paliers, les départs régionaux, les polygones de collision/rendu et les sources alpha. Le test de navigation parcourt réellement depuis le port les 43 portes, sept raccords et dix départs. Les visites visuelles, jeu clavier/manette/mobile et captures ne sont pas remplacés par ces tests. Les 42 vues demandées (14 zones × large/jeu/détail) restent une recette de QA visuelle à fournir séparément ; ce document ne les prétend pas exécutées.',
 '', 'Les limites conservées sont des tâches, pas un PASS global : les usages de meubles historiques signalés, les clôtures complètes, ascenseurs/tunnels natifs, variantes très fréquentes4–8, scènes royales, animation sociale et toutes les suites privées ne sont pas achevés. La carte locale et les créations architecturales sont compatibles avec le lore ; elles ne sont pas une carte canonique1:1.',
 '', '## Tous les bâtiments visitables','',
 '| ID stable | Étage / îlot | Classe | Vue native / coque | Seuil / approche | Voisins les plus proches | Intérieur réel |','|---|---|---|---|---|---|---|',
 ...api.HOMEWORLD_BUILDING_LOTS_V81.map(l=>`| ${l.buildingId} | ${l.levelId} / ${l.districtId} | ${l.classification} | ${l.frontage} ${n(l.nativeYaw)}° ; ${l.art} | ${n(l.door.threshold.x)},${n(l.door.threshold.y)} → ${n(l.door.approach.x)},${n(l.door.approach.y)} | ${l.nearestNeighbors.map(v=>v.id+':'+n(v.distance)+'u').join(' ; ')} | ${esc(l.interior.title)} ${l.interior.width}×${l.interior.depth} ; ${l.interior.zones.length} zones |`),
 '', '## Composition des quatorze cours','', '| Cour | Fonction / densité0–5 | Composition | Focus | Props retenus / candidats |','|---|---|---|---|---|',
 ...api.HOMEWORLD_AUTHORED_COURTS_V81.map(c=>`| ${c.id} | ${c.use} / ${c.density} | ${c.composition} | ${esc(c.focus)} | ${api.HOMEWORLD_USAGE_OBJECTS_V81.filter(p=>p.clusterId==='urban-v81:'+c.id).length} / ${c.props.length} |`),
 '', '## Chaque solide recompilé : contact, usage et social','', '| ID | Source / fonction | Étage / quartier | Centre | Contact réel | Usage distinct |','|---|---|---|---|---|',
 ...api.HOMEWORLD_USAGE_OBJECTS_V81.map(p=>`| ${p.id} | ${p.artId} / ${p.role.function} | ${p.levelId} / ${p.districtId} | ${n(p.x)},${n(p.y)} | ${n(p.physical.right-p.physical.left)}×${n(p.physical.bottom-p.physical.top)} | ${p.usage?`${n(p.usage.left)},${n(p.usage.top)} → ${n(p.usage.right)},${n(p.usage.bottom)}`:'Non requis'} |`),
 '', '## Chaque solide historique conservé et audité','', '| ID | Famille | Étage | Centre | Contact conservé | Avertissements |','|---|---|---|---|---|',
 ...api.HOMEWORLD_LEGACY_USAGE_OBJECTS_V81.map(p=>`| ${p.id} | ${p.artId} | ${p.levelId} | ${n(p.x)},${n(p.y)} | ${n(p.physical.right-p.physical.left)}×${n(p.physical.bottom-p.physical.top)} | ${audit.violations.filter(v=>v.objectId===p.id).map(v=>v.ruleId+' / '+v.conflictId).join('; ')||'Aucun détecté ; métrologie historique conservée'} |`),
 '', '## Violations restantes','', '| Sévérité / règle | Objet / conflit | Position | Action suggérée |','|---|---|---|---|',
 ...audit.violations.map(v=>`| ${v.severity} / ${v.ruleId} | ${v.objectId} / ${v.conflictId??'—'} | ${v.levelId} ${n(v.position.x)},${n(v.position.y)} | ${esc(v.suggestedFix)} |`),
 '', 'Les assertions détaillées, objets, parcelles, sources et refus sont reproductibles dans `work-local/v81/homeworld-spatial-audit.json` avec `node scripts/audit-homeworld-placement-v81.mjs --write-docs`. Aucun fichier de jeu ni sauvegarde n’est modifié par cet audit.',
 ];
 fs.writeFileSync(path.join(root,'docs/homeworld-placement-audit-v81.md'),placement.join('\n')+'\n');
 const gaps=[
 '# Homeworld V81 — catalogue cible et écarts de production','',
 `Le catalogue reprend **${catalogue.length} entrées** des sections55–76 du brief. Vérification contre ${files.length} fichiers d’images Homeworld, ${report.sourceInventory.codexRecords} fiches réelles de codex et ${liveAssets.length} chemins référencés ; ${missingFiles.length} fichier référencé absent. Les catégories sont des besoins artistiques : une image apparentée ou un atlas ne livre pas toutes ses variantes. Aucun EXISTING_GOOD n’est déduit automatiquement d’un nom de fichier.`,
 '',`Répartition prudente : ${Object.entries(statuses).map(([s,count])=>s+' '+count).join(' ; ')}. Les correspondances ci-dessous sont des **candidats de famille**, pas une validation visuelle de chaque silhouette. MISSING signifie aucun candidat spécialisé trouvé dans cet inventaire Homeworld ; les fichiers d’autres jeux ou packs non intégrés ne sont pas présentés comme prêts à l’emploi.`,
 '', '## Sources produites et effectivement activées dans ce lot','',
 'Neuf associations architecturales natives (palais, Conseil, maisons clan et industrielles) sont réellement montées dans les 43 bâtiments existants. Les nouveaux PNG sont conservés séparément et utilisés sans rotation/mirror CSS. Les 17 sources de mobilier extérieur recompilé ne deviennent pas17×N sprites nouveaux parce que plusieurs instances sont visibles. Les huit anciennes façades décoratives restent des placeholders. La bibliothèque historique est préservée.',
 '', 'Les13 originaux V78 sont conservés, sept sources possèdent des contacts mesurés, **six sont actuellement placées**. `archive-shelf-right` est explicitement sans placement sûr : son alcôve actuelle traverse une routine et les alternatives examinées la cachent derrière le mausolée. Il faut recomposer cette galerie avant de la monter, pas forcer un septième objet.',
 '', '## Priorités de production restantes','',
 '- Variantes natives de maisons par fonction, dans les deux vues dessinées ; les30 façades encore frontales et les8 silhouettes décoratives ne doivent pas être déclarées achevées par un changement de coordonnées.',
 '- Bancs/assises, lampes, caisses et racks : quatre à huit silhouettes réelles, faces de travail distinctes et orientations source adaptées. Les familles actuelles restent répétables, mais insuffisantes pour la diversité complète demandée.',
 '- Systèmes complets de barrières : angles, extrémités, poteaux, portes, émetteurs ; un mur de soutènement isolé ne constitue pas un enclos fonctionnel.',
 '- Enclos, équipements de nourrissage, harnais/selles, cages, ascenseurs/tunnels, grues animées et conduits spécialisés : les références de bestiaire ou structures d’arrière-plan ne sont pas leurs sprites modulaires jouables.',
 '- Cycles animés réels pour forge, activité dock, gardes, population, faune, atmosphère et transitions. Un PNG statique ou une oscillation CSS n’est pas une plaquette d’animation.',
 '', '## Catalogue complet vérifié','', '| Section / famille | Besoin exact | Statut | Candidats de source (max3) | Consommateurs apparentés |','|---|---|---|---|---|',
 ...catalogue.map(e=>`| ${e.section} / ${esc(e.family)} | ${esc(e.label)} | ${e.status} | ${e.sourceCandidates.slice(0,3).join('<br>')||e.installedOnlyCandidates.join('<br>')||'Aucun trouvé'} | ${e.consumerCount} ; ${e.consumerIds.slice(0,3).join(' / ')} |`),
 '', 'Provenance : les créations de cité sont `LORE_COMPATIBLE_ORIGINAL`, les terrains et dispositifs de cheminement `GAMEPLAY_UTILITY`. Les trophées/personnages provenant de références conservent leurs fiches source. Une adaptation visuelle ou un glyphe inventé ne devient pas CANON_DIRECT. Les animations et variantes manquantes restent listées ; ce fichier n’annonce pas une refonte entièrement achevée.',
 ];
 fs.writeFileSync(path.join(root,'docs/homeworld-asset-gap-v81.md'),gaps.join('\n')+'\n');
}
console.log(JSON.stringify({status:report.status,constraints:audit.assertionCount,errors:audit.errors.length,warnings:audit.violations.length,counts:audit.counts,sourceInventory:report.sourceInventory,catalogueEntries:catalogue.length,statuses}));
if(audit.errors.length||missingFiles.length)process.exitCode=1;
