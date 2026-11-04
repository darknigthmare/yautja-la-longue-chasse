import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtimeModules) throw new Error('CODEX_PRIMARY_RUNTIME_NODE_MODULES requis');
const { Workbook, SpreadsheetFile } = await import(require.resolve('@oai/artifact-tool', { paths: [path.dirname(runtimeModules)] }));

const production = path.dirname(new URL(import.meta.url).pathname);
const output = process.env.SHIPHUB_OUTPUT || path.resolve(production, '../../outputs/shiphub-20261104');
await fs.mkdir(output, { recursive: true });

const clan = [
 ['CL-01','Identités distinctes','Le Clan Ship accueille la coque personnelle sans la remplacer.','En cours','Exigence utilisateur','P0','clanShipDocking.ts ; shipCatalogue.ts'],
 ['CL-02','Approche','Passer de free-flight à approach ; conserver la coque possédée.','En cours','Implémentation courante','P0','clanShipDocking.ts'],
 ['CL-03','Annuler approche','Revenir en vol libre avant amarrage.','En cours','Implémentation courante','P1','clanShipDocking.ts'],
 ['CL-04','Amarrer','Autoriser dock uniquement depuis approach.','En cours','Implémentation courante','P0','clanShipDocking.ts'],
 ['CL-05','Entrer','Depuis docked, entrer à bord dans le hangar.','En cours','Implémentation courante','P0','clanShipDocking.ts'],
 ['CL-06','Hangar','Reconnaître la coque personnelle et son accès de retour.','À vérifier','Adaptation de gameplay','P0','Brief ; ShipHub.tsx'],
 ['CL-07','Conseil','Salle dédiée au clan ; effets métier à préciser.','En cours','Adaptation de gameplay','P1','roomId conseil ; brief'],
 ['CL-08','Armurerie','Salle dédiée ; relier les actions à la préparation existante.','En cours','Adaptation de gameplay','P1','roomId armurerie ; ShipHub.tsx'],
 ['CL-09','Trophées','Salle dédiée ; vérifier collection, lecture et retour.','En cours','Adaptation de gameplay','P1','roomId trophees ; brief'],
 ['CL-10','Soins','Salle dédiée ; vérifier coûts, conditions et persistance.','En cours','Adaptation de gameplay','P1','roomId soins ; brief'],
 ['CL-11','Archives','Salle dédiée ; accès au contenu et fermeture propre.','En cours','Adaptation de gameplay','P1','roomId archives ; brief'],
 ['CL-12','Entraînement','Salle dédiée ; périmètre du service à confirmer.','En cours','Adaptation de gameplay','P1','roomId entrainement ; brief'],
 ['CL-13','Changer de salle','move-room seulement aboard ; rejeter salle invalide.','En cours','Implémentation courante','P0','clanShipDocking.ts'],
 ['CL-14','Revenir à sa coque','return-to-personal mène à docked, salle hangar.','En cours','Implémentation courante','P0','clanShipDocking.ts'],
 ['CL-15','Désamarrer','undock depuis docked, puis vol libre.','En cours','Implémentation courante','P0','clanShipDocking.ts'],
 ['CL-16','Verrou de coque','Changer de coque uniquement en vol libre.','En cours','Implémentation courante','P0','clanShipDocking.ts'],
 ['CL-17','Propriétaire campagne','ownerCreatedAt sépare les campagnes et les sauvegardes.','En cours','Persistance','P0','clanShipDocking.ts ; campaignSlots.ts'],
 ['CL-18','Reprendre à bord','Recharger salle et phase sans changer de coque personnelle.','À vérifier','Persistance + navigateur','P0','activeHuntSave.ts ; tests/clan-ship-save.test.mjs'],
 ['CL-19','Import / export','Conserver état, propriétaire et cohérence de flotte.','En cours','Persistance','P0','tests/clan-ship-save.test.mjs'],
 ['CL-20','Anciennes sauvegardes','État absent : reprise compatible en vol libre.','En cours','Migration','P0','clanShipDocking.ts'],
 ['CL-21','État invalide / futur','Rejeter données incohérentes sans réécrire silencieusement.','En cours','Validation de données','P0','clanShipDocking.ts'],
 ['CL-22','Propriétaire des entrées','Une pression = une action ; aucune activation dans deux vues.','À vérifier','Input + navigateur','P0','GameClient.tsx ; recette navigateur'],
 ['CL-23','Lisibilité / retour','Clavier, manette, focus et sortie des panneaux à recetter.','À vérifier','Interface','P1','Recette navigateur à fournir'],
 ['CL-24','Art et fidélité','Références sourcées puis validation humaine des assets.','À faire','Production artistique','P1','docs/ship-modular-art-contract.md'],
];

const assets = [
 ['AS-01','Clan Ship, trois quarts','public/game/ships/v14/avp-predator-mothership.webp','Existant','Candidat extérieur ; fidélité à examiner','Clan Ship','shipCatalogue.ts'],
 ['AS-02','Clan Ship, dessus','public/game/ships/v14/avp-predator-mothership-top.webp','Existant','Candidat vue de dessus','Clan Ship','shipCatalogue.ts'],
 ['AS-03','Coque classique','public/game/ships/v12/classic-predator-spaceship.webp','Existant','Véhicule distinct ; ne pas substituer à la flotte','Personnel','shipCatalogue.ts'],
 ['AS-04','Coque classique, dessus','public/game/ships/v13/classic-predator-spaceship-top.webp','Existant','Vue complémentaire candidate','Personnel','shipCatalogue.ts'],
 ['AS-05','Capsule','public/game/ships/v14/avp-predator-drop-pod.webp','Existant','Candidat ; adéquation au brief 1987 à vérifier','Arrivée','shipCatalogue.ts'],
 ['AS-06','Capsule, dessus','public/game/ships/v14/avp-predator-drop-pod-top.webp','Existant','Vue complémentaire candidate','Arrivée','shipCatalogue.ts'],
 ['AS-07','Console navigation','public/game/ship-interior/v21/console-navigation.webp','Existant','Réemploi à intégrer et contrôler','Clan Ship','shipInteriorKit.ts'],
 ['AS-08','Cadre de porte','public/game/ship-interior/v21/door-frame.webp','Existant','Module séparé ; pivots et collisions','Clan Ship','shipInteriorKit.ts'],
 ['AS-09','Battant de porte','public/game/ship-interior/v21/door-leaf.webp','Existant','Module séparé ; ouverture / fermeture','Clan Ship','shipInteriorKit.ts'],
 ['AS-10','Nervure avant-plan','public/game/ship-interior/v21/foreground-rib.webp','Existant','Ne pas masquer les accès','Clan Ship','shipInteriorKit.ts'],
 ['AS-11','Paroi machines','public/game/ship-interior/v21/wall-machinery.webp','Existant','Candidat salle technique','Clan Ship','shipInteriorKit.ts'],
 ['AS-12','Paroi observatoire','public/game/ship-interior/v21/wall-observatory.webp','Existant','Candidat profondeur extérieure','Clan Ship','shipInteriorKit.ts'],
 ['AS-13','Paroi sanctuaire','public/game/ship-interior/v21/wall-sanctum.webp','Existant','Candidat salle de clan','Clan Ship','shipInteriorKit.ts'],
 ['AS-14','Terminal archives','public/game/ship-interior/v22/archive-terminal.webp','Existant','Habillage candidat ; effet métier séparé','Clan Ship','shipInteriorV22.ts'],
 ['AS-15','Rack armurerie','public/game/ship-interior/v22/armory-rack.webp','Existant','Habillage candidat ; inventaire à relier','Clan Ship','shipInteriorV22.ts'],
 ['AS-16','Lit médical','public/game/ship-interior/v22/medbay-bed.webp','Existant','Habillage candidat ; soins à relier','Clan Ship','shipInteriorV22.ts'],
 ['AS-17','Passerelle','public/game/ship-interior/v22/gantry.webp','Existant','Module candidat du hangar','Clan Ship','shipInteriorV22.ts'],
 ['AS-18','Bord de sol','public/game/ship-interior/v22/floor-edge.webp','Existant','Module candidat ; raccords','Clan Ship','shipInteriorV22.ts'],
 ['AS-19','Salle audience prologue','public/game/prologue/v72/clan-audience-hall.png','Existant','Référence interne ; ne prouve pas le château','Clan / château','Arbre Git, base d56c0e0'],
 ['AS-20','Chef assis prologue','public/game/prologue/v72/clan-chief-seated.png','Existant','Référence interne ; identité à vérifier','Clan / château','Arbre Git, base d56c0e0'],
 ['AS-21','Baie et ancres d’amarrage','À définir : fichiers individuels','À produire','Façade, balises, ancres et passerelle','Clan Ship','prompts.md §1'],
 ['AS-22','Décors des sept salles','À définir : un kit par salle','À produire','Plan arrière, module jouable, premier plan','Clan Ship','prompts.md §1'],
 ['AS-23','Extérieur château orbital','À définir après référence validée','À produire','Destination distincte ; aucune preuve canon ici','Château','prompts.md §2'],
 ['AS-24','Salle du pouvoir','À définir après périmètre narratif','À produire','Seuil, piliers, estrade et siège séparés','Château','prompts.md §2'],
 ['AS-25','Planète et fond spatial','À définir par destination','À produire','Nom de planète rendu séparément par UI','Arrivée','prompts.md §3'],
 ['AS-26','Capsule au sol / ouverture','À définir : séquence et calques','À produire','Capsule, porte, poussière et sortie chasseur','Arrivée','prompts.md §3'],
];

const castle = [
 ['CH-01','Référence demandée','Predator King / Wolf System / Black Panther vs Predator.','À vérifier','Brief utilisateur, association non certifiée','Référence primaire à choisir'],
 ['CH-02','Destination indépendante','Route et identité distinctes du Clan Ship.','Planifié','Adaptation de gameplay','Décision de progression'],
 ['CH-03','Planche de références','Numéro, pages, vues et faits réellement montrés.','À faire','Recherche de référence','Support accessible et autorisé'],
 ['CH-04','Silhouette extérieure','Forteresse orbitale reconnaissable ; échelle lisible.','Planifié','Conception, aucune implémentation','Références vérifiées'],
 ['CH-05','Accès / accostage','Définir baie, sas et chemin cérémoniel.','Planifié','Extrapolation à cadrer','Choix lieu jouable ou cinématique'],
 ['CH-06','Salle du pouvoir','Seuil, estrade et siège : modules individuels.','Planifié','Extrapolation à cadrer','Référence artistique / narration'],
 ['CH-07','Statut du souverain','Vérifier titre et identité avant rédaction de lore.','À vérifier','Brief utilisateur, pas une attestation','Référence primaire'],
 ['CH-08','Services accessibles','Décider les interactions sans dupliquer le Clan Ship.','Planifié','Adaptation de gameplay','Design de progression'],
 ['CH-09','Sauvegarde et retour','Définir entrée, sortie, reprise et propriétaire des entrées.','Planifié','Système non implémenté','Routes et état de campagne'],
 ['CH-10','Art individuel','Séparer extérieur, fond, sol, porte, piliers, siège.','Planifié','Production future','Contrat d’assets'],
 ['CH-11','Validation humaine','Revue références, composition, lisibilité et échelle.','À faire','Validation artistique future','Concepts à produire'],
 ['CH-12','Recette dédiée','Trajet, sauvegarde, entrées et performances du lieu.','Planifié','Aucun test château exécuté','Implémentation future'],
];

const arrivalQa = [
 ['AR-01','Storyboard','0–7 s','Planète et espace ; cadrage de destination.','Planifié','Fond spatial et planète','Proposition, pas timecode analysé'],
 ['AR-02','Storyboard','7–13 s','Nom de planète à la place du titre.','Planifié','Texte UI localisé','Brief utilisateur'],
 ['AR-03','Storyboard','13–23 s','Passage du vaisseau ; silhouette lisible.','Planifié','Référence vaisseau à confirmer','Predator 1987 : support à vérifier'],
 ['AR-04','Storyboard','23–31 s','Libération de la capsule distincte.','Planifié','Asset capsule et trajectoire','Proposition de montage'],
 ['AR-05','Storyboard','31–41 s','Descente ; continuité d’échelle.','Planifié','Caméra et transitions','Proposition de montage'],
 ['AR-06','Storyboard','41–49 s','Entrée atmosphérique et effets séparés.','Planifié','FX et mouvements réduits','Proposition de montage'],
 ['AR-07','Storyboard','49–57 s','Atterrissage / impact en vue latérale.','Planifié','Sol, capsule et poussière','Brief utilisateur + conception'],
 ['AR-08','Storyboard','57–62 s','Ouverture, sortie du chasseur, relais au jeu.','Planifié','Animation et état initial','Limite 1:02 du brief'],
 ['QA-01','Tests auto','2026-11-04','Suite combinée : 184/184 tests verts.','Rapporté','ESLint strict et typecheck réussis','Rapport agent principal ; PR #104'],
 ['QA-02','Navigateur','À exécuter','Approche → amarrage → entrée → salle → retour → départ.','En attente','Interface Clan Ship intégrée','CI en attente ; Chromium local bloqué'],
 ['QA-03','Navigateur','À exécuter','Une pression manette ou clavier = une seule transition.','En attente','Propriétaire des entrées','Couvrir ouverture, maintien et relâchement'],
 ['QA-04','Navigateur','À exécuter','Recharger à bord et retrouver la bonne coque.','En attente','Sauvegarde campagne','Comparer coque, phase, salle et campagne'],
 ['QA-05','Navigateur','À exécuter','Changer de campagne ; aucun état de clan transféré.','En attente','Sélecteur de campagne','Campagnes de coques différentes'],
 ['QA-06','Navigateur','À exécuter','Exporter/importer ; coque et flotte restent cohérentes.','En attente','Format export / import','Tester payload valide et incohérent'],
 ['QA-07','Navigateur','À exécuter','Vérifier focus, sortie des panneaux, tailles d’écran.','En attente','UI et services','Aucune validation visuelle présumée'],
 ['QA-08','Arrivée future','À concevoir','Pause, saut et recharge sans double spawn.','Planifié','Cinématique non implémentée','Critère pour chantier distinct'],
 ['QA-09','Arrivée future','À concevoir','Passage cinématique → jeu ; propriétaire des entrées.','Planifié','Cinématique non implémentée','Critère pour chantier distinct'],
 ['QA-10','Ancien brouillon','Indisponible','Ancienne annonce de 27 checks non récupérée.','Non vérifié','Fichiers non publiés introuvables','Ne pas compter comme preuve de cette PR'],
];

const workbook = Workbook.create();
const sheets = Object.fromEntries(['Reprise','ClanShip','Assets','Chateau','Arrivee_QA'].map(name => [name, workbook.worksheets.add(name)]));
const widths = {
 Reprise:[25,47,20,17,24,45], ClanShip:[10,24,49,17,24,10,38],
 Assets:[10,27,59,16,43,19,29], Chateau:[10,26,60,17,40,34],
 Arrivee_QA:[11,20,19,58,17,34,44]
};
const columns=n=>String.fromCharCode(64+n);
const lastRows={};
function setup(name,title,subtitle,headers,rows){
 const sheet=sheets[name], n=headers.length, end=rows.length+5, last=columns(n);
 lastRows[name]=end;
 sheet.showGridLines=false;
 sheet.tabColor=name==='Reprise'?'#2B3D36':name==='ClanShip'?'#69806B':'#A7ADA6';
 const full=sheet.getRange(`A1:${last}${end}`);
 full.format.font={name:'Arial',size:10,color:'#202B25'};
 full.format.verticalAlignment='center';
 full.format.rowHeight=48;
 sheet.getRange(`A1:${last}1`).format.rowHeight=10;
 sheet.getRange('A2').values=[[title]];
 sheet.getRange(`A2:${last}2`).format.rowHeight=26;
 sheet.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#253D31'};
 sheet.getRange(`A3:${last}3`).format.rowHeight=24;
 sheet.getRange('A3').values=[[subtitle]];
 sheet.getRange('A3').format.font={name:'Arial',size:10,color:'#626C62'};
 sheet.getRange(`A4:${last}4`).format.rowHeight=8;
 sheet.getRange(`A5:${last}5`).values=[headers];
 sheet.getRange(`A6:${last}${end}`).values=rows;
 sheet.getRange(`A5:${last}${end}`).format.wrapText=true;
 sheet.getRange(`A5:${last}5`).format={fill:'#344B3C',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:30};
 for(let c=0;c<n;c++) sheet.getRange(`${columns(c+1)}1:${columns(c+1)}${end}`).format.columnWidth=widths[name][c];
 for(let r=6;r<=end;r++) if(r%2===0) sheet.getRange(`A${r}:${last}${r}`).format.fill='#F1F4EF';
 sheet.getRange(`A6:A${end}`).format.font={name:'Arial',size:10,bold:true,color:'#4D6250'};
 if(name!=='Reprise'){sheet.freezePanes.freezeRows(5);sheet.freezePanes.freezeColumns(2);}
 return sheet;
}

setup('ClanShip','Clan Ship — pièces et services','24 exigences de reprise • statuts fonctionnels provisoires, recette navigateur CI attendue',
 ['ID','Pièce / fonction','Résultat attendu','État','Nature','Priorité','Source interne'],clan);
setup('Assets','Assets — fichiers individuels','Existant = présent dans l’arbre Git ; intégration, fidélité et approbation artistique restent distinctes',
 ['ID','Pièce','Chemin / livrable','État','Usage et limite','Chantier','Référence'],assets);
setup('Chateau','Château orbital — chantier distinct','Aucune implémentation dans cette passe ; noms et associations du brief restent à vérifier',
 ['ID','Sujet','Résultat attendu','État','Nature / preuve','Dépendance'],castle);
setup('Arrivee_QA','Arrivée et recette — deux suivis explicites','0–62 s = montage proposé ; 184/184 tests auto rapportés, navigateur CI en attente',
 ['ID','Type','Temps / échéance','Plan ou contrôle attendu','État','Dépendance','Source / preuve'],arrivalQa);

const overview=[
 ['Clan Ship','Approche, amarrage, salles, retour et départ.','En cours',null,'Navigateur CI en attente','Code courant et feuille ClanShip'],
 ['Assets existants','Fichiers candidats repérés dans l’arbre Git.','À examiner',null,'Pas d’approbation présumée','Feuille Assets ; arbre Git base d56c0e0'],
 ['Assets à produire','Pièces nouvelles identifiées par chantier.','À produire',null,'Production future','Feuille Assets ; prompts.md'],
 ['Château orbital','Lieu distinct du vaisseau mère.','Planifié',null,'Aucune implémentation','Feuille Chateau ; brief utilisateur'],
 ['Arrivée planétaire','Huit plans proposés, jusqu’à 62 secondes.','Planifié',null,'Aucune implémentation','Feuille Arrivee_QA ; prompts.md'],
 ['Recette navigateur','Six contrôles navigateur à exécuter en CI.','En attente',null,'En cours','Feuille Arrivee_QA, QA-02 à QA-07'],
 ['Tests auto réussis','Suite combinée ; lint strict et typecheck réussis.','Rapporté',184,'184 tests sur 184','Agent principal, 2026-11-04 ; PR #104'],
 ['Point de reprise','Séparation vaisseau personnel / Clan Ship.','Récupéré',null,'Exigence conservée','Conversation ShipHub ; arrêt 2026-11-03'],
 ['Ancien brouillon','Fichiers non publiés et ancien Excel indisponibles.','Non récupéré',null,'27 checks non vérifiés','Ne pas réutiliser cet ancien chiffre comme preuve'],
 ['Coque personnelle','Conserver la coque possédée après reload à bord.','À vérifier',null,'Priorité P0','clanShipDocking.ts ; clan-ship-save.test.mjs'],
 ['Entrées','Une action prise en charge par une seule vue.','À vérifier',null,'Priorité P0','GameClient.tsx ; recette clavier / manette'],
 ['Base et branche','main d56c0e0 → feat/clan-ship-docking-20261104.','PR draft',null,'Recette CI attendue','https://github.com/darknigthmare/yautja-la-longue-chasse/pull/104'],
 ['Sources de données','Code et chemins internes cités dans chaque feuille.','Documenté',null,'Code ≠ preuve canon','app/game/ et tests/ ; docs/ship-modular-art-contract.md'],
 ['Règle de lore','Brief utilisateur, adaptation et canon sont séparés.','À appliquer',null,'Références à vérifier','Aucun support généré ne constitue une référence canonique'],
 ['État artistique','Existant, intégré, testé et approuvé sont distincts.','À appliquer',null,'Validation humaine future','docs/GAMEDEV_AGENT_GUIDE.md'],
];
const summary=setup('Reprise','ShipHub — reprise du 4 novembre 2026','Nouveau checkpoint factuel ; aucun pourcentage global de réalisation',
 ['Volet','Périmètre / décision','État','Nombre suivi','QA / limite','Source ou prochain jalon'],overview);
summary.getRange('D6').formulas=[[`=COUNTA(ClanShip!A6:A${lastRows.ClanShip})`]];
summary.getRange('D7').formulas=[[`=COUNTIF(Assets!D6:D${lastRows.Assets},"Existant")`]];
summary.getRange('D8').formulas=[[`=COUNTIF(Assets!D6:D${lastRows.Assets},"À produire")`]];
summary.getRange('D9').formulas=[[`=COUNTA(Chateau!A6:A${lastRows.Chateau})`]];
summary.getRange('D10').formulas=[[`=COUNTIF(Arrivee_QA!B6:B${lastRows.Arrivee_QA},"Storyboard")`]];
summary.getRange('D11').formulas=[[`=COUNTIF(Arrivee_QA!B6:B${lastRows.Arrivee_QA},"Navigateur")`]];
summary.getRange('D6:D12').format.font={name:'Arial',size:12,bold:true,color:'#253D31'};
summary.getRange('D6:D12').format.horizontalAlignment='center';
summary.getRange('D6:D12').setNumberFormat('0');
summary.getRange('D12').format.fill='#FFF0C7';
for(const [name,col] of [['ClanShip','D'],['Assets','D'],['Chateau','D'],['Arrivee_QA','E']]){
 const range=sheets[name].getRange(`${col}6:${col}${lastRows[name]}`);
 range.format.font={name:'Arial',size:10,bold:true,color:'#755B27'};
 range.format.fill='#FFF4D9';
}
// Visible calculations are direct counts from authoritative detail rows.
workbook.recalculate();
const baseline=summary.getRange('D6:D11').values;
const before=baseline.map(r=>r[0]);
const expected=[clan.length,20,6,castle.length,8,6];
if(JSON.stringify(before)!==JSON.stringify(expected)) throw new Error(`Comptages inattendus : ${JSON.stringify(before)}`);
// Perturb a contributing status, verify recalculation, then restore the original input.
sheets.Assets.getRange('D6').values=[['À produire']];
workbook.recalculate();
const perturbed=summary.getRange('D7:D8').values.map(r=>r[0]);
if(JSON.stringify(perturbed)!=='[19,7]') throw new Error(`Propagation incorrecte : ${JSON.stringify(perturbed)}`);
sheets.Assets.getRange('D6').values=[['Existant']];
workbook.recalculate();
const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'Recherche erreurs de formule'});
const renders=[];
for(const [name,sheet] of Object.entries(sheets)){
 const last=columns(widths[name].length);
 const preview=await workbook.render({sheetName:name,range:`A1:${last}${lastRows[name]}`,scale:1.3,format:'png'});
 const filename=`preview-${name}.png`;
 await fs.writeFile(path.join(output,filename),new Uint8Array(await preview.arrayBuffer()));
 renders.push({sheet:name,file:filename,rows:lastRows[name]});
}
const filename='shiphub-reprise-20261104.xlsx';
const file=await SpreadsheetFile.exportXlsx(workbook);
await file.save(path.join(output,filename));
await fs.copyFile(path.join(output,filename),path.join(production,filename));
const verification={generatedAt:new Date().toISOString(),engine:'@oai/artifact-tool',sheets:5,detailRows:{ClanShip:clan.length,Assets:assets.length,Chateau:castle.length,Arrivee_QA:arrivalQa.length},summaryCounts:summary.getRange('D6:D11').values.map(r=>r[0]),expectedCounts:expected,propagationCheck:{temporaryAssetState:'À produire',observed:perturbed,restored:true},formulaInspection:errors,renders,visualReview:'À effectuer sur les cinq rendus',gameQA:'Suite combinée 184/184 tests rapportés par agent principal ; ESLint strict et typecheck réussis ; navigateur CI en attente',pullRequest:'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/104'};
await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(verification,null,2));
await fs.copyFile(path.join(output,'verification.json'),path.join(production,'verification.json'));
console.log(JSON.stringify({output:path.join(output,filename),production:path.join(production,filename),counts:verification.summaryCounts,renders,formulaInspection:errors},null,2));
