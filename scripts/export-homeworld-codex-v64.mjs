import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
const {HOMEWORLD_ELEMENT_CODEX_V64:records}=homeworldQaModelV64(process.cwd(), ['homeworldElementCodexV64.ts']);
assert(Array.isArray(records)&&records.length>=150);
assert.equal(new Set(records.map(record=>record.id)).size,records.length);
const clean=value=>String(value??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const unit=value=>Number.isFinite(value)?Math.round(value*10)/10:'—';
const xy=point=>`${unit(point.x)} ; ${unit(point.y)}`;
const groups={district:'Quartiers',street:'Rues',building:'Bâtiments',door:'Portes',prop:'Mobilier',npc:'Habitants',service:'Interactions',ship:'Spatioport',interior:'Intérieurs',floor:'Sols',panel:'Panneaux muraux'};
let md='# Codex du Homeworld V64\n\n';
md+='Ce document est exporté du même registre que le codex en jeu. Les coordonnées et dimensions correspondent au modèle de placement ; elles ne constituent pas un plan officiel de Yautja Prime.\n\n';
md+='## Convention commune\n\n';
md+='- Sol : X vers l’est, Y vers le sud ; Z représente la hauteur. Projection orthographique : écran X = X, écran Y = Y × sin(35°) − Z. Zoom uniforme ; aucune silhouette comprimée.\n';
md+='- Adulte de référence : 100 unités ≈ 2,3 m. Ce rapport est un choix de production, pas une mesure canonique de chaque individu. Les pieds, les fondations et les seuils ont des pivots mesurés.\n';
md+='- L’empreinte physique reste sur le sol non projeté. Seul le dessin est projeté. Le passage de porte et l’approche ne se déduisent jamais d’une marge transparente du PNG.\n';
md+='- Les vaisseaux personnels ne sont pas miniaturisés sur les rues. La navette locale et son pad sont séparés de la circulation ; le terminal rejoint l’amarrage orbital.\n';
md+='- Entrer dans une pièce ou consulter ce registre ne donne aucun service, rang, équipement, preuve ni récompense. Les conditions de progression restent distinctes.\n\n';
md+='## Statut du lore\n\nLe plan urbain, les maisons, les institutions et les intérieurs sont des créations originales du projet. Les motifs référencés ci-dessous conservent leur source et leur limite : aucune fidélité architecturale globale 1:1 n’est certifiée.\n\n';
md+='## Inventaire\n\n| Famille | Nombre |\n|---|---:|\n';
for(const [id,label] of Object.entries(groups))md+=`| ${label} | ${records.filter(record=>record.category===id).length} |\n`;
for(const [id,label] of Object.entries(groups)){
  md+=`\n## ${label}\n`;
  for(const record of records.filter(record=>record.category===id)){
    for(const value of [...Object.values(record.position),...Object.values(record.dimensions)])assert(Number.isFinite(value),record.id+' non-finite dimensions');
    md+=`\n### ${clean(record.label)}\n\n`;
    md+=`- Identifiant : \`${clean(record.id)}\` ; espace : \`${clean(record.spaceId)}\` ; quartier : \`${clean(record.districtId)}\`.\n`;
    md+=`- Position X ; Y ; Z : ${xy(record.position)} ; ${unit(record.position.z)}. Dimensions L × P × H : ${unit(record.dimensions.width)} × ${unit(record.dimensions.depth)} × ${unit(record.dimensions.height)} u.\n`;
    if(record.footprint)md+=`- Empreinte : gauche ${unit(record.footprint.left)}, droite ${unit(record.footprint.right)}, nord ${unit(record.footprint.top)}, sud ${unit(record.footprint.bottom)}.\n`;
    if(record.door)md+=`- Porte : seuil ${xy(record.door.threshold)} ; approche ${xy(record.door.approach)} ; passage libre ${unit(record.door.clearWidth)} × ${unit(record.door.clearHeight)} u.\n`;
    if(record.asset)md+=`- Image runtime : \`${clean(record.asset)}\`.\n`;
    for(const constraint of record.constraints)md+=`- ${clean(constraint)}\n`;
    md+=`\n**Statut :** ${record.lore==='licensed-reference-adaptation'?'motif référencé, adapté au jeu':'création originale du projet'}.\n`;
    for(const source of record.source)md+=`\n[${clean(source.label)}](${source.url}) — ${clean(source.note)}\n`;
  }
}
md+='\n## Limites de validation\n\nL’inventaire décrit les éléments effectivement enregistrés ; il ne remplace pas les essais de mouvement, les contrôles d’images et la recette publique. Le rapport de livraison V64 distingue ces vérifications. Les anciennes images et les identifiants de progression sont conservés.\n';
await fs.writeFile('docs/HOMEWORLD-CODEX-V64.md',md);
await fs.writeFile('docs/homeworld-element-codex-v64.json',JSON.stringify({version:'V64',convention:'ground x/y; screen y = y*sin35 - z; adult100u approx2.3m; original project city',records},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',records:records.length,files:['docs/HOMEWORLD-CODEX-V64.md','docs/homeworld-element-codex-v64.json']}));
