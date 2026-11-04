import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
// Run from a conversation-specific temporary directory whose node_modules
// points to the bundled primary runtime. The repository keeps source only.
const require = createRequire(path.join(process.cwd(), 'package.json'));
const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtimeModules) throw new Error('CODEX_PRIMARY_RUNTIME_NODE_MODULES requis');
const { Workbook, SpreadsheetFile } = await import(require.resolve('@oai/artifact-tool'));

const production = path.dirname(new URL(import.meta.url).pathname);
const output = process.env.SHIPHUB_OUTPUT || path.resolve(production, '../../outputs/shiphub-552e6f51');
await fs.mkdir(output, { recursive: true });
const design = JSON.parse(await fs.readFile(path.join(production, 'design-data.json'), 'utf8'));
const state = JSON.parse(await fs.readFile(path.join(production, 'production-state.json'), 'utf8'));
const current = state.current;
const qualified = current.status === 'Validé CI';
const publication = state.publicationValidation;
const publicationQualified = publication?.status === 'success' && publication.workflowsPassed === publication.workflowsTotal;
const integrated = state.delivery?.merged === true;
const currentSource = qualified ? `${current.sourceCommit?.slice(0, 7)} ; ${current.runUrl}` : 'Intérieur physique en cours de vérification';
const currentChecks = current.checks ?? [];
const baselineSource = `${state.baseline.sourceCommit.slice(0, 7)} ; run ${state.baseline.runUrl.split('/').at(-1)}`;
const plannedAssets = [...design.castle.assets, ...design.arrival.assets];
const generationRequests = plannedAssets.filter(asset => asset.production === 'À produire').length;
const reuseInstructions = plannedAssets.filter(asset => asset.production === 'Réemploi à raccorder').length;
const backgroundCount = state.roomBackgrounds.filter(asset => asset.status === 'Généré').length;
const props = state.individualProps ?? [];
const propCount = props.filter(asset => asset.status === 'Généré').length;
const sourceRoot = path.resolve(production, '../..');
// A production status is backed by the actual file and its recorded fingerprint.
for (const asset of [...state.roomBackgrounds, ...props]) {
 if (asset.status !== 'Généré') continue;
 const bytes = await fs.readFile(path.join(sourceRoot, asset.path));
 const sha256 = createHash('sha256').update(bytes).digest('hex');
 if (sha256 !== asset.sha256 || bytes.length !== asset.bytes) throw new Error(`Inventaire périmé : ${asset.path}`);
}
if (state.art.totalBytes !== state.roomBackgrounds.reduce((sum, asset) => sum + asset.bytes, 0) || state.art.propTotalBytes !== props.reduce((sum, asset) => sum + asset.bytes, 0)) {
 throw new Error('Totaux de poids périmés dans production-state.json.art');
}
if (design.arrival.beats.reduce((sum, beat) => sum + beat.durationMs, 0) !== design.arrival.durationMs) {
 throw new Error('La durée du storyboard ne correspond pas au total des plans');
}
for (const room of design.castle.rooms) {
 for (const neighbor of room.neighbors) {
  const target = design.castle.rooms.find(candidate => candidate.id === neighbor);
  if (!target || !target.neighbors.includes(room.id)) throw new Error(`Porte château non réciproque : ${room.id} / ${neighbor}`);
 }
}
if (qualified && (!current.sourceCommit || !current.runUrl || !current.browserTotal || current.browserPassed !== current.browserTotal || current.checks.length !== current.browserTotal || current.checks.some(check => !check.passed))) {
 throw new Error('La qualification actuelle exige sa source, son run et tous les scénarios réussis');
}
if (qualified) {
 const report = JSON.parse(await fs.readFile(path.join(production, current.proofDirectory, 'report.json'), 'utf8'));
 if (!report.passed || report.sourceCommit !== current.sourceCommit || report.checkoutCommit !== current.sourceCommit || report.workingTreeDirty || report.checks.length !== current.browserTotal || report.checks.some((check, index) => !check.passed || check.name !== current.checks[index].name) || report.errors.length !== current.exceptions || report.missingAssets.length !== current.missingAssets) throw new Error('Le rapport navigateur ne correspond pas à la qualification déclarée');
 const proofNames = ['report.json', ...report.screenshots];
 if (new Set(proofNames).size !== proofNames.length || Object.keys(current.proofFiles ?? {}).length !== proofNames.length || proofNames.some(name => !current.proofFiles?.[name])) throw new Error('Inventaire incomplet des fichiers de preuve');
 for (const [filename, expected] of Object.entries(current.proofFiles ?? {})) {
  const bytes = await fs.readFile(path.join(production, current.proofDirectory, filename));
  if (bytes.length !== expected.bytes || createHash('sha256').update(bytes).digest('hex') !== expected.sha256) throw new Error(`Preuve modifiée : ${filename}`);
 }
}

const clan = [
 ['CL-01','Identités distinctes','Le Clan Ship accueille la coque personnelle sans la remplacer.','Validé CI','Parcours navigateur','P0','CI final, scénarios 3 et 7 ; tests domaine'],
 ['CL-02','Approche','Passer de free-flight à approach ; conserver la coque possédée.','Validé CI','Parcours navigateur','P0','CI final, scénario 2'],
 ['CL-03','Annuler approche','Revenir en vol libre avant amarrage.','Validé CI','Parcours navigateur','P1','CI final, scénario 8'],
 ['CL-04','Amarrer','Autoriser dock uniquement depuis approach.','Validé CI','Navigateur + domaine','P0','CI final, scénario 3 ; clanShipDocking.ts'],
 ['CL-05','Entrer','Depuis docked, entrer à bord dans le hangar.','Validé CI','Parcours navigateur','P0','CI final, scénario 3'],
 ['CL-06','Hangar','Coques et accès de retour identifiables ; images chargées.','Validé CI','Navigateur + captures relues','P0','CI final, scénarios 3, 7 et 10'],
 ['CL-07','Conseil','Ouvrir clan-war puis revenir dans la salle conseil.','Validé CI','Accès au service existant','P1','CI final, scénario 4 ; effets métier hors périmètre'],
 ['CL-08','Armurerie','Ouvrir armory puis revenir dans la salle armurerie.','Validé CI','Accès au service existant','P1','CI final, scénario 4 ; effets métier hors périmètre'],
 ['CL-09','Trophées','Ouvrir trophies puis revenir dans la salle trophées.','Validé CI','Accès au service existant','P1','CI final, scénario 4 ; effets métier hors périmètre'],
 ['CL-10','Soins','Ouvrir medbay puis revenir dans la salle soins.','Validé CI','Accès au service existant','P1','CI final, scénario 4 ; coûts/effets non recettés ici'],
 ['CL-11','Archives','Ouvrir codex, revenir et reprendre après recharge.','Validé CI','Accès et reprise','P1','CI final, scénarios 4, 5 et 6'],
 ['CL-12','Entraînement','Ouvrir training puis revenir dans la salle entraînement.','Validé CI','Accès au service existant','P1','CI final, scénario 4 ; effets métier hors périmètre'],
 ['CL-13','Changer de salle','Sept salles parcourues ; navigation réservée à aboard.','Validé CI','Navigateur + domaine','P0','CI final, scénario 4 ; tests/clan-ship-docking.test.mjs'],
 ['CL-14','Revenir à sa coque','Retour au pont personnel, amarrage conservé.','Validé CI','Parcours navigateur','P0','CI final, scénario 7'],
 ['CL-15','Désamarrer','Quitter l’amarrage avant tout voyage ; reprendre le vol libre.','Validé CI','Parcours navigateur','P0','CI final, scénario 7'],
 ['CL-16','Verrou de coque','Changer de coque uniquement en vol libre.','Testé (domaine)','Tests unitaires','P0','tests/clan-ship-docking.test.mjs'],
 ['CL-17','Propriétaire campagne','ownerCreatedAt sépare les campagnes et les sauvegardes.','Testé (domaine)','Tests d’intégration','P0','tests/clan-ship-save.test.mjs ; aucun scénario UI multiowner'],
 ['CL-18','Reprendre à bord','Sauver, menu, recharger, Continuer : salle archives restaurée.','Validé CI','Persistance + navigateur','P0','CI final, scénarios 5 et 6'],
 ['CL-19','Import / export','Conserver état, propriétaire et cohérence de flotte.','Testé (domaine)','Tests d’intégration','P0','tests/clan-ship-save.test.mjs ; aucun scénario UI import'],
 ['CL-20','Anciennes sauvegardes','Ancienne campagne reprise via le vrai menu vers le pont.','Validé CI','Migration + navigateur','P0','CI final, scénario 1 ; tests domaine'],
 ['CL-21','État invalide / futur','Rejeter données incohérentes sans réécrire silencieusement.','Testé (domaine)','Validation de données','P0','tests/clan-ship-docking.test.mjs ; clan-ship-save.test.mjs'],
 ['CL-22','Propriétaire des entrées','Confirmation maintenue : une étape ; paramètres suspendent le clan.','Validé CI','Input + navigateur','P0','CI final, scénarios 2 et 5'],
 ['CL-23','Lisibilité / retour','Desktop 1440 ; navigation 390/320 sans débordement.','Validé CI','Navigateur + captures relues','P1','CI final, scénario 9 ; revue root et agent UI'],
 ['CL-24','Art et fidélité','Références sourcées puis validation humaine des assets.','À faire','Production artistique','P1','docs/ship-modular-art-contract.md'],
];

const assets = [
 ['AS-01','Clan Ship, trois quarts','public/game/ships/v14/avp-predator-mothership.webp','Existant','Chargé CI ; fidélité et approbation art distinctes','Clan Ship','shipCatalogue.ts ; CI final scénario 10'],
 ['AS-02','Clan Ship, dessus','public/game/ships/v14/avp-predator-mothership-top.webp','Existant','Candidat vue de dessus','Clan Ship','shipCatalogue.ts'],
 ['AS-03','Coque classique','public/game/ships/v12/classic-predator-spaceship.webp','Existant','Chargé CI ; coque personnelle distincte conservée','Personnel','shipCatalogue.ts ; CI final scénario 10'],
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
 ['QA-01','Tests auto','2026-11-04','Suite combinée : 184/184 tests verts.','Validé CI','ESLint strict et typecheck CI réussis','CI final ; build Next webpack local exit 0'],
 ['QA-02','Contrôle UI','Réussi CI final','Approche → amarrage → entrée → salle → retour → départ.','Validé CI','Interface Clan Ship réelle','CI final, scénarios 2, 3, 4, 7 et 8'],
 ['QA-03','Contrôle UI','Réussi CI final','Confirmation maintenue : une étape ; paramètres isolés.','Validé CI','Propriétaire des entrées','CI final, scénarios 2 et 5'],
 ['QA-04','Contrôle UI','Réussi CI final','Sauver, menu, recharge et Continuer restaurent archives.','Validé CI','Sauvegarde campagne','CI final, scénario 6 ; coque testée au scénario 3'],
 ['QA-05','Intégration','Réussi domaine','Changer de campagne ; aucun état de clan transféré.','Testé (domaine)','20 tests intégration sauvegarde','clan-ship-save.test.mjs ; pas de scénario UI multiowner'],
 ['QA-06','Intégration','Réussi domaine','Exporter/importer ; coque et flotte restent cohérentes.','Testé (domaine)','20 tests intégration sauvegarde','clan-ship-save.test.mjs ; pas de scénario UI import'],
 ['QA-07','Contrôle UI','Réussi CI final','Retour des six services ; navigation mobile 390/320.','Validé CI','Captures desktop 1440 et mobile 320 relues','CI final, scénarios 4 et 9 ; revue root + agent UI'],
 ['QA-08','Arrivée future','À concevoir','Pause, saut et recharge sans double spawn.','Planifié','Cinématique non implémentée','Critère pour chantier distinct'],
 ['QA-09','Arrivée future','À concevoir','Passage cinématique → jeu ; propriétaire des entrées.','Planifié','Cinématique non implémentée','Critère pour chantier distinct'],
 ['QA-10','Ancien brouillon','Indisponible','Ancienne annonce de 27 checks non récupérée.','Non vérifié','Fichiers non publiés introuvables','Ne pas compter comme preuve de cette PR'],
 ['QA-11','Assets partagés','Réussi CI final','Zéro asset demandé manquant et zéro exception JavaScript.','Validé CI','Source 9d77af8 ; copie CI corrigée','Run 41789974649 ; contrôle bloquant réussi'],
 ['CI-01','Scénario CI','Réussi CI final','Ancienne campagne → menu réel → pont personnel.','Validé CI','GameClient réel via Vite','CI final : scénario 1'],
 ['CI-02','Scénario CI','Réussi CI final','Confirmation manette maintenue avance une seule étape.','Validé CI','Manette injectée dans navigateur','CI final : scénario 2'],
 ['CI-03','Scénario CI','Réussi CI final','Amarrer et entrer conserve la coque personnelle.','Validé CI','Deux identités distinctes','CI final : scénario 3'],
 ['CI-04','Scénario CI','Réussi CI final','Sept salles, six services et retour vers la bonne salle.','Validé CI','Ouverture/fermeture ; effets métier hors périmètre','CI final : scénario 4'],
 ['CI-05','Scénario CI','Réussi CI final','Paramètres isolés ; checkpoint manuel garde archives.','Validé CI','Suspension du contrôleur clan','CI final : scénario 5'],
 ['CI-06','Scénario CI','Réussi CI final','Sauver, menu, recharger et Continuer reprend archives.','Validé CI','Stockage réel du navigateur','CI final : scénario 6'],
 ['CI-07','Scénario CI','Réussi CI final','Pont personnel toujours amarré ; voyage bloqué puis départ.','Validé CI','Reprise du pont et désamarrage','CI final : scénario 7'],
 ['CI-08','Scénario CI','Réussi CI final','Annulation d’approche durable sans entrée à bord.','Validé CI','Stockage et retour au pont','CI final : scénario 8'],
 ['CI-09','Scénario CI','Réussi CI final','Navigation à 390 et 320 px sans débordement horizontal.','Validé CI','Capture mobile 320 + desktop 1440 relues','CI final : scénario 9'],
 ['CI-10','Scénario CI','Réussi CI final','Images des vaisseaux chargées ; zéro asset manquant et exception JS.','Validé CI','Assets partagés contrôlés sur la route visitée','CI final : scénario 10, assertion bloquante'],
];

// Preserve historical evidence and distinguish it from the new physical route.
for (const row of clan) {
 if (row[3] === 'Validé CI') row[3] = 'Validé (plan)';
 row[6] = row[6].replaceAll('CI final', 'CI initial 9d77af8');
 const evidence = current.coverage?.[row[0]];
 if (evidence) { row[3] = evidence.status; row[6] = evidence.source; }
}
clan[23] = ['CL-24','Art et fidélité','Décors distincts, provenance et revue des images en scène.','À revoir (art)','Revue artistique','P1','Manifestes d’assets ; references.md'];
const interiorRows = [
 ['CL-25','Déplacement physique','Parcourir le sol réel de chacune des sept salles.','Déplacement','P0'],
 ['CL-26','Collisions','Contourner les empreintes ; refuser les murs sans traversée.','Géométrie + parcours','P0'],
 ['CL-27','Portes et itinéraires','Choisir une salle déclenche une marche par les portes du graphe.','Trajets physiques','P0'],
 ['CL-28','Service proche','L’installation ne s’ouvre qu’à portée du personnage.','Interaction de proximité','P0'],
 ['CL-29','Écriture refusée','Une transition refusée conserve la pièce et une position sûre.','Persistance + transition','P0'],
 ['CL-30','Sprite du chasseur','Afficher le preset courant avec son ancrage aux pieds.','Rendu du personnage','P1'],
 ['CL-31','Clavier et pointeur','Marcher au clavier ou toucher une destination praticable.','Contrôles réels','P0'],
 ['CL-32','Manette','Déplacement et action au front ; attendre un état neutre.','Contrôles réels','P0'],
 ['CL-33','Tactile','Déplacer le chasseur et interagir à 320 et 390 px.','Contrôles mobiles','P0'],
 ['CL-34','Suspendre la scène','Services, paramètres et perte d’activité suspendent les commandes.','Propriété des entrées','P0'],
 ['CL-35','Reprise de pièce','Conserver la pièce ; recharger à une entrée sûre, position fine transitoire.','Contrat de reprise','P0'],
 ['CL-36','Objets indépendants','Fond, portes, installations et acteur restent séparés.','Composition','P1'],
 ['CL-37','Mouvements réduits','Réduire les effets sans perdre les actions ni le trajet.','Accessibilité','P1'],
 ['CL-38','Assets demandés','Charger les fonds, props et sprites réellement visités sans erreur.','Assets + erreurs JS','P0'],
 ['CL-39','Position après service','Fermer chacun des six services restitue la position et le focus de la salle.','Persistance transitoire','P0'],
 ['CL-40','Repères et caméra','Numéros de salle alignés sur l’anneau ; acteur et action proche visibles sur écran étroit.','Orientation et lisibilité','P1'],
];
for (const [id,label,description,nature,priority] of interiorRows) {
 const evidence = current.coverage?.[id];
 clan.push([id,label,description,evidence?.status ?? 'Implémenté',nature,priority,evidence?.source ?? 'interior-spec.md ; recette courante à terminer']);
}

// Replace six broad future lots with individually specified deliverables.
assets.splice(20);
const reusedInCode = new Set(['AS-01','AS-03','AS-07','AS-08','AS-09','AS-14','AS-15','AS-18']);
const fallbackAssets = new Set(['AS-11','AS-16']);
const actualReuse = {
 'AS-07': ['Console archive-console dans les archives', 'clanShipInterior.ts ; capture archives'],
 'AS-14': ['Terminaux secondaires : hangar, conseil, trophées et soins', 'clanShipInterior.ts ; captures de ces quatre salles'],
 'AS-15': ['Râtelier training-rack dans la salle d’entraînement', 'clanShipInterior.ts ; capture entraînement'],
 'AS-18': ['Bord de sol en fond CSS dans les sept salles', 'ClanShipInterior.module.css : floorEdge ; captures des salles'],
};
for (const row of assets) {
 row[6] = row[6].replaceAll('CI final', 'CI initial 9d77af8');
 row.push(reusedInCode.has(row[0]) ? 'Intégré au code' : 'Catalogue / candidat', ['AS-01','AS-03'].includes(row[0]) ? 'Chargé CI initiale' : 'À recetter', 'À examiner', 'Catalogue et contrats du kit');
 if (qualified && ['AS-01','AS-03'].includes(row[0])) { row[8] = `Chargé CI ${current.sourceCommit.slice(0,7)}`; row[6] = `shipCatalogue.ts ; scénario 22 ; ${current.proofDirectory}/report.json`; }
 if (actualReuse[row[0]]) {
  row[4] = actualReuse[row[0]][0];
  row[6] = actualReuse[row[0]][1];
  row[8] = qualified ? `Chargé CI ${current.sourceCommit.slice(0,7)} ; revu en capture ; scénarios 13, 22` : 'À recetter';
 }
 if (fallbackAssets.has(row[0])) {
  row[4] = row[0] === 'AS-11' ? 'Fond de secours ; les sept fonds dédiés sont utilisés' : 'Référence de secours ; les props dédiés sont utilisés';
  row[6] = 'ClanShipInterior.tsx ; ressources de secours';
  row[7] = 'Secours référencé';
  row[8] = 'Secours non exercé en CI';
 }
 if (qualified && ['AS-08','AS-09'].includes(row[0])) {
  row[6] = `ClanShipInterior.tsx ; captures ${current.sourceCommit.slice(0,7)}`;
  row[8] = `Chargé CI ; portes revues ; scénarios 9, 10, 13, 22`;
 }
}
for (const asset of state.roomBackgrounds) {
 const size = `${asset.width} × ${asset.height} px`;
 assets.push([`BG-${asset.roomId}`,`Fond ${asset.roomId}`,asset.path,asset.status,`${size} ; arrière ; aucune collision`, 'Clan Ship', asset.source,
  asset.integration ?? 'Intégré au code', asset.tests ?? 'À recetter', asset.humanReview ?? 'À examiner', 'art-source/clan-ship-v1/generation.json']);
}
for (const asset of state.individualProps ?? []) {
 const size = asset.width && asset.height ? `${asset.width} × ${asset.height} px` : 'Dimensions à mesurer';
 assets.push([`PROP-${asset.id}`,asset.label,asset.path,asset.status,`${size} ; alpha réel ; ${asset.roomId}`, 'Clan Ship', asset.source,
  asset.integration, asset.tests, asset.humanReview, asset.promptSource]);
}
const plannedAsset = (asset, chantier) => [
 asset.id, asset.label, asset.file ?? (asset.production === 'Réemploi à raccorder' ? 'Réemploi du catalogue / rig' : `Cible : ${asset.id}.webp`), asset.status,
 `${asset.target.width ? `${asset.target.width} × ${asset.target.height}` : 'Catalogue existant'} ; ${asset.target.alpha ? 'alpha' : 'opaque'} ; ${asset.layer} ; collision ${asset.collision}`,
 chantier, `${asset.source} ; pivot ${asset.target.pivot ? asset.target.pivot.join(', ') : 'charnière à mesurer'}`,
 'À intégrer', 'À exécuter', 'À examiner', asset.promptFile,
];
assets.push(...design.castle.assets.map(asset => plannedAsset(asset, 'Château')));
assets.push(...design.arrival.assets.map(asset => plannedAsset(asset, 'Arrivée')));

castle.splice(0,castle.length,
 ['CH-01','Références','Série et auteurs établis ; architecture précise à confronter aux planches.','Documenté','Références primaires et brief séparés','references.md'],
 ['CH-02','Destination','Château distinct du Clan Ship, identité et route propres.','Spécifié','Contrat de conception','castle-spec.md §1 et §6'],
 ['CH-03','Accès','Invitation stable de campagne ; aucun rang ou coût inventé.','Spécifié','Audience de campagne proposée','castle-spec.md §1'],
 ['CH-04','Silhouette','Forteresse fixe, cœur massif, baies encastrées et axe cérémoniel.','Spécifié','Direction artistique','castle-spec.md §2'],
 ['CH-05','Parcours','Baie → sas → vestibule → galerie → audience → conseil.','Spécifié','Graphe à neuf lieux','castle-spec.md §3'],
 ['CH-06','Retour','Passage latéral vers le vestibule ; sortie toujours disponible.','Spécifié','Aucun verrou de retour','castle-spec.md §3'],
 ['CH-07','Métriques','Passage ≥ 3 diamètres d’acteur ; aire d’usage ≥ 2D × 2D.','Spécifié','À mesurer avec le contrôleur intégré','castle-spec.md §4'],
 ['CH-08','Assets',`${design.castle.assets.length} modules individuels avec alpha, pivot, plan et collision.`,'Spécifié','Dimensions cibles dans Assets','design-data.json ; castle-spec.md §5'],
 ['CH-09','Événement','Audience et décision idempotentes par identifiant stable.','Spécifié','Contrat de progression','castle-spec.md §6'],
 ['CH-10','Sauvegarde','Écrire, relire, confirmer, puis changer de pièce.','Spécifié','Extension de campagne à implémenter','castle-spec.md §6'],
 ['CH-11','Entrées / VFX','Un contrôleur actif ; balises lisibles ; mouvements réduits.','Spécifié','Contrat de présentation','castle-spec.md §5–6'],
 ['CH-12','Recette','Dix contrôles d’acceptation du brief conservé.','Spécifié','Hors périmètre implémenté PR #104','castle-spec.md §7'],
 ...design.castle.rooms.map((room,index) => [`CH-R${String(index+1).padStart(2,'0')}`,room.label,room.interaction,'Spécifié',room.availableInFirstDesign ? 'Parcours audience proposé' : 'Extension ultérieure',room.neighbors.join(' ; ')]),
 ...design.castle.modes.map((mode,index) => [`CH-M${index+1}`,mode.label,mode.flow,mode.status,mode.persistence,'castle-spec.md §8']),
 ...design.castle.futureSystems.map(item => [item.id,item.category,item.requirement,item.status,'Brief conservé ; hors implémentation PR #104',item.dependency]),
);

// Timeline durations remain numeric so a later edit recalculates the total.
for (let index=0;index<8;index++) {
 const beat = design.arrival.beats[index];
 arrivalQa[index] = [`AR-${String(index+1).padStart(2,'0')}`,'Storyboard',`${beat.startMs/1000}–${beat.endMs/1000} s`,beat.label,'Spécifié',beat.event,'arrival-spec.md §3 ; montage original',beat.durationMs/1000];
}
for (const row of arrivalQa.slice(8)) {
 row[6] = row[6].replaceAll('CI final', 'CI initial 9d77af8');
 if(row[1] === 'Scénario CI') row[1] = 'CI historique';
 if(row[4] === 'Validé CI') row[4] = 'Validé (plan)';
 if(row[1] === 'Arrivée future') {row[2]='Spécifié';row[4]='Spécifié';row[5]='Hors périmètre implémenté PR #104';row[6]='arrival-spec.md §4–9';}
 row[7] = null;
}
for (const [index,check] of currentChecks.entries()) {
 arrivalQa.push([`CI2-${String(index+1).padStart(2,'0')}`,'Scénario CI',check.status ?? 'À vérifier',check.label ?? check.name,check.passed ? 'Validé CI' : check.status ?? 'À vérifier',check.scope ?? 'GameClient réel',check.source ?? currentSource,null]);
}
arrivalQa.push(
 ['AR-Q1','Arrivée future','Contrat défini','Temps actif monotone ; pause et reprise au début du plan.','Spécifié','Horloge et suspension','arrival-spec.md §4',null],
 ['AR-Q2','Arrivée future','Contrat défini','Fin naturelle et Passer rejoignent un relais unique.','Spécifié','runId stable ; confirmation durable','arrival-spec.md §6',null],
 ['AR-Q3','Arrivée future','Contrat défini','Reprise ou récupération entre les écritures, sans double spawn.','Spécifié','Tests d’interruption à exécuter','arrival-spec.md §6 et §9',null],
 ['AR-Q4','Arrivée future','Contrat défini','Assets absents, destination invalide et propriétaire changé.','Spécifié','Sorties contrôlées','arrival-spec.md §8',null],
 ...design.arrival.audioCues.map(cue => [cue.id,'Audio futur',cue.beat,cue.cue,cue.state,'Son séparé ; aucun fichier livré par la fiche','arrival-spec.md §10',null]),
);

const workbook = Workbook.create();
const sheets = Object.fromEntries(['Reprise','ClanShip','Assets','Chateau','Arrivee_QA'].map(name => [name, workbook.worksheets.add(name)]));
const widths = {
 Reprise:[25,47,20,17,24,45], ClanShip:[10,24,49,17,24,10,38],
 Assets:[18,27,59,16,43,19,36,22,24,21,52], Chateau:[10,26,60,17,40,34],
 Arrivee_QA:[11,20,19,58,17,34,44,11]
};
const columns=n=>String.fromCharCode(64+n);
const backgroundFirstRow=6+20;
const backgroundLastRow=backgroundFirstRow+state.roomBackgrounds.length-1;
const propFirstRow=backgroundLastRow+1;
const propLastRow=propFirstRow+(state.individualProps?.length ?? 0)-1;
const castleRoomFirstRow=6+12;
const castleRoomLastRow=castleRoomFirstRow+design.castle.rooms.length-1;
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
 for(let r=6;r<=end;r++) {
  if(r%2===0) sheet.getRange(`A${r}:${last}${r}`).format.fill='#F1F4EF';
  // Wrapped production descriptions remain legible without shrinking fonts.
  const lineCount = Math.max(...rows[r-6].map((cell,c) => Math.ceil(String(cell ?? '').length / Math.max(10, widths[name][c]-3))));
  sheet.getRange(`A${r}:${last}${r}`).format.rowHeight=Math.max(48, Math.min(118, lineCount*12+10));
 }
 sheet.getRange(`A6:A${end}`).format.font={name:'Arial',size:10,bold:true,color:'#4D6250'};
 if(name!=='Reprise'){
  sheet.freezePanes.freezeRows(5);sheet.freezePanes.freezeColumns(2);
  const table=sheet.tables.add(`A5:${last}${end}`,true,`ShipHub${name}`);
  table.style='TableStyleLight9';
  table.showFilterButton=true;
 }
 return sheet;
}

setup('ClanShip','Clan Ship — intérieur et services','Validé (plan) = preuve initiale 9d77af8 ; les exigences de l’intérieur portent leur propre preuve',
 ['ID','Pièce / fonction','Résultat attendu','État','Nature','Priorité','Source interne'],clan);
setup('Assets','Assets — fichiers et demandes individuelles','Génération, intégration, tests et décision artistique sont suivis séparément',
 ['ID','Pièce','Chemin / livrable','Production','Usage et limite','Chantier','Référence','Intégration','Tests','Revue humaine','Prompt / fiche'],assets);
setup('Chateau','Château orbital — conception','Brief conservé dans PR #104 ; neuf lieux et vingt modules ; travaux parallèles non évalués ici',
 ['ID','Sujet','Résultat attendu','État','Nature / preuve','Dépendance'],castle);
setup('Arrivee_QA','Arrivée et recette — suivi de production','Storyboard de 62 secondes ; preuves du plan initial et de l’intérieur physique séparées',
 ['ID','Type','Temps / échéance','Plan ou contrôle attendu','État','Dépendance','Source / preuve','Durée (s)'],arrivalQa);
 sheets.Arrivee_QA.getRange(`H6:H${lastRows.Arrivee_QA}`).setNumberFormat('0');

const overview=[
 ['Clan Ship','Exigences d’amarrage, intérieur, services et reprise.',current.status,null,'Preuve par ligne dans ClanShip','interior-spec.md et tests du module'],
 ['Assets existants','Fichiers du catalogue et du kit déjà présents.','Existant',null,'Réemploi détaillé, revue artistique distincte','Feuille Assets ; catalogue et kits du dépôt'],
 ['Briefs conservés',`${design.castle.assets.length} modules château et ${design.arrival.assets.length} assets/réemplois d’arrivée.`,'Spécifié',null,'Production suivie séparément dans la PR #106','individual-asset-prompts.md ; design-data.json'],
 ['Château orbital','Exigences et lieux d’une audience de campagne.','Spécifié',null,'Brief conservé ; hors implémentation PR #104','Feuille Chateau ; sources dans references.md'],
 ['Arrivée planétaire','Huit plans, capsule distincte et relais unique.','Spécifié',null,'Brief conservé ; hors implémentation PR #104','Feuille Arrivee_QA ; arrival-spec.md'],
 ['Scénarios actuels qualifiés','Recette de l’intérieur physique avec le vrai GameClient.',qualified ? 'Validé CI' : 'À exécuter',null,qualified ? `${current.browserPassed}/${current.browserTotal} réussis` : 'Le plan initial a une preuve séparée','Arrivee_QA : Scénario CI ; source actuelle ci-dessous'],
 ['Tests de publication',publicationQualified ? `Clan Ship sur la livraison ${publication.sourceCommit.slice(0,7)}.` : 'Suite ciblée, géométrie et sauvegarde.',publicationQualified || qualified ? 'Validé CI' : current.automatedTests ? 'Testé (domaine)' : 'À vérifier',publicationQualified ? publication.clan.automatedTestsPassed : current.automatedTests,publicationQualified ? `${publication.workflowsPassed} workflows réussis. Inventaire PASS et ${publication.regression.v113Tests.passed} tests V113.` : current.automatedTests ? `${current.automatedTests} réussis` : 'Résultat final à reporter',publicationQualified ? `Clan : run ${publication.clan.runUrl.split('/').at(-1)}. V94 : run ${publication.regression.runUrl.split('/').at(-1)}. Détail : production-state.json.` : current.testSource ?? currentSource],
 ['Fonds du Clan Ship','Images individuelles 1440 × 800 pour les sept salles.',backgroundCount === state.roomBackgrounds.length ? 'Généré' : 'En cours',null,'Objets, portes et chasseur restent séparés','public/game/clan-ship/manifest.json'],
 ['Durée du storyboard (s)','Somme des durées des huit plans proposés.','Spécifié',null,'Durée modifiable dans Arrivee_QA','H6:H13 ; contrat de séquence dans arrival-spec.md'],
 ['Lieux du château','Graphe de circulation avec retour court.','Spécifié',null,'Huit lieux accessibles et une extension prévue','Chateau : CH-R01 à CH-R09'],
 ['Preuve initiale conservée','Plan de visite sur source 9d77af8.','Historique',184,'184 tests ; 10 scénarios ; aucun asset manquant',state.baseline.runUrl],
 ['Source des captures',current.sourceCommit ?? 'Intérieur physique en cours de vérification',current.status,null,qualified ? `${current.missingAssets} asset manquant ; ${current.exceptions} exception JS` : 'Qualification à terminer',current.runUrl ?? 'production-state.json'],
 ['Reprise de visite','La pièce est durable ; la position fine reste transitoire.','Contrat défini',null,'Après recharge, apparition sûre dans la pièce','interior-spec.md ; clanShipDocking.ts'],
 ['Commandes','Clavier, pointeur, manette et croix tactile.','Implémenté',null,'Une seule scène propriétaire des entrées','ClanShipInterior.tsx ; recette actuelle'],
 ['Production artistique',`${backgroundCount} fonds et ${propCount} props dédiés générés ; rig du joueur réemployé.`,backgroundCount === state.roomBackgrounds.length && propCount === props.length ? 'Généré' : 'En cours',null,'Revue en scène séparée de la validation humaine','Manifestes clan-ship-v1 et clan-ship-props-v1'],
 ['Intégration du lot',integrated ? `main ; commit ${state.delivery.mergeCommit.slice(0,7)} ; version ${state.releaseVersions?.branchGameReleaseVersion ?? 'à vérifier'}.` : `${state.branch} ; version ${state.releaseVersions?.branchGameReleaseVersion ?? 'à vérifier'}.`,state.delivery?.status ?? 'PR brouillon',null,state.delivery?.note ?? 'Fusion et production suivies séparément',state.pullRequest],
 ['Suite du projet','PR #106 : château, arrivée et mandat royal.',state.followup?.status ?? 'Spécifié',null,'Base main. Nouvelle qualification avant fusion.',state.followup?.pullRequest ?? 'castle-spec.md ; arrival-spec.md'],
 ['Props dédiés générés','Installations propres aux salles du Clan Ship.','Production individuelle',null,'Un fichier par prop ; statut réel dans Assets','public/game/clan-ship/props/manifest.json'],
 ['Usages du château','Audience de campagne, hub royal et instance.','Spécifié',3,'Trois contrats ; hors implémentation PR #104','castle-spec.md §8'],
];
const summary=setup('Reprise','ShipHub — production du 4 novembre 2026',integrated ? 'Clan Ship intégré à main le 4 novembre. Suite distincte dans la PR #106.' : 'Intérieur physique, assets et contrats des deux chantiers suivants',
 ['Volet','Périmètre / décision','État','Nombre suivi','QA / limite','Source ou prochain jalon'],overview);
summary.getRange('D6').formulas=[[`=COUNTA(ClanShip!A6:A${lastRows.ClanShip})`]];
summary.getRange('D7').formulas=[[`=COUNTIFS(Assets!D6:D${lastRows.Assets},"Existant")`]];
summary.getRange('D8').formulas=[[`=COUNTIFS(Assets!D6:D${lastRows.Assets},"Spécifié")`]];
summary.getRange('D9').formulas=[[`=COUNTA(Chateau!A6:A${lastRows.Chateau})`]];
summary.getRange('D10').formulas=[[`=COUNTIFS(Arrivee_QA!B6:B${lastRows.Arrivee_QA},"Storyboard")`]];
summary.getRange('D11').formulas=[[`=COUNTIFS(Arrivee_QA!B6:B${lastRows.Arrivee_QA},"Scénario CI",Arrivee_QA!E6:E${lastRows.Arrivee_QA},"Validé CI")`]];
summary.getRange('D13').formulas=[[`=COUNTIFS(Assets!D${backgroundFirstRow}:D${backgroundLastRow},"Généré")`]];
summary.getRange('D14').formulas=[['=SUM(Arrivee_QA!H6:H13)']];
summary.getRange('D15').formulas=[[`=COUNTA(Chateau!A${castleRoomFirstRow}:A${castleRoomLastRow})`]];
summary.getRange('D23').formulas=[[`=COUNTIFS(Assets!D${propFirstRow}:D${propLastRow},"Généré")`]];
summary.getRange('D6:D12').format.font={name:'Arial',size:12,bold:true,color:'#253D31'};
summary.getRange('D6:D12').format.horizontalAlignment='center';
summary.getRange('D6:D12').setNumberFormat('0');
summary.getRange('D13:D16').format.font={name:'Arial',size:12,bold:true,color:'#253D31'};
summary.getRange('D13:D16').format.horizontalAlignment='center';
summary.getRange('D13:D16').setNumberFormat('0');
summary.getRange('D23:D24').format.font={name:'Arial',size:12,bold:true,color:'#253D31'};
summary.getRange('D23:D24').format.horizontalAlignment='center';
summary.getRange('D23:D24').setNumberFormat('0');
for(const [name,col] of [['ClanShip','D'],['Assets','D'],['Chateau','D'],['Arrivee_QA','E']]){
 const range=sheets[name].getRange(`${col}6:${col}${lastRows[name]}`);
 range.format.font={name:'Arial',size:10,bold:true,color:'#755B27'};
 range.format.fill='#FFF4D9';
 for(const [status,fill,color] of [['Validé CI','#E3EDE4','#31583B'],['Testé (domaine)','#E8EFF7','#365875'],['Validé (plan)','#EAEDE9','#526052'],['Généré','#EBEDF7','#465D7E'],['Intégré','#EBEDF7','#465D7E']])
  range.conditionalFormats.add('cellIs',{operator:'equal',formula:`"${status}"`,format:{fill,font:{bold:true,color}}});
}
sheets.Assets.getRange(`J6:J${lastRows.Assets}`).dataValidation={rule:{type:'list',values:['À examiner','À corriger','Approuvé par une personne']}};
sheets.Assets.getRange(`J6:J${lastRows.Assets}`).format.fill='#FFF4D9';
sheets.Assets.getRange(`J6:J${lastRows.Assets}`).conditionalFormats.add('cellIs',{operator:'equal',formula:'"À corriger"',format:{fill:'#FCE8E6',font:{color:'#A12F2F',bold:true}}});
// Visible calculations are direct counts from authoritative detail rows.
workbook.recalculate();
const baseline=summary.getRange('D6:D11').values;
const before=baseline.map(r=>r[0]);
const expected=[clan.length,20,design.castle.assets.length+design.arrival.assets.length,castle.length,8,currentChecks.filter(check => check.passed).length];
if(JSON.stringify(before)!==JSON.stringify(expected)) throw new Error(`Comptages inattendus : ${JSON.stringify(before)}`);
const expectedAdditional=[state.roomBackgrounds.filter(asset=>asset.status==='Généré').length,design.castle.rooms.length,(state.individualProps ?? []).filter(asset=>asset.status==='Généré').length];
const observedAdditional=['D13','D15','D23'].map(cell=>summary.getRange(cell).values[0][0]);
if(JSON.stringify(observedAdditional)!==JSON.stringify(expectedAdditional)) throw new Error(`Comptages fonds, salles ou props incorrects : ${JSON.stringify(observedAdditional)}`);
// Perturb a contributing status, verify recalculation, then restore the original input.
sheets.Assets.getRange('D6').values=[['Spécifié']];
workbook.recalculate();
const perturbed=summary.getRange('D7:D8').values.map(r=>r[0]);
if(JSON.stringify(perturbed)!==JSON.stringify([19,expected[2]+1])) throw new Error(`Propagation incorrecte : ${JSON.stringify(perturbed)}`);
sheets.Assets.getRange('D6').values=[['Existant']];
workbook.recalculate();
const durationBefore = summary.getRange('D14').values[0][0];
if(durationBefore !== 62) throw new Error(`Durée incorrecte : ${durationBefore}`);
sheets.Arrivee_QA.getRange('H6').values=[[8]];
workbook.recalculate();
const changedDuration = summary.getRange('D14').values[0][0];
if(changedDuration !== 63) throw new Error('Les durées ne se recalculent pas');
sheets.Arrivee_QA.getRange('H6').values=[[7]];
workbook.recalculate();
const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'Recherche erreurs de formule'});
const formulaInspection = errors.ndjson;
if (!formulaInspection.includes('Cell search matched 0 entries.')) throw new Error(`Inspection des formules à résoudre : ${formulaInspection}`);
const keyValues=await workbook.inspect({kind:'table',range:'Reprise!A5:F24',include:'values,formulas',tableMaxRows:20,tableMaxCols:6,maxChars:5000});
await fs.writeFile(path.join(output,'key-values.ndjson'),keyValues.ndjson);
const renders=[];
const renderSheets = process.env.SHIPHUB_RENDER_SHEETS?.split(',').filter(Boolean) ?? Object.keys(sheets);
if (renderSheets.some(name => !sheets[name])) throw new Error('Feuille de rendu inconnue');
for(const name of Object.keys(sheets)){
 if (!renderSheets.includes(name)) continue;
 const last=columns(widths[name].length);
 for(let first=1,part=1;first<=lastRows[name];first+=28,part++){
  const final=Math.min(lastRows[name],first+27);
  const sections = name === 'Assets' ? [`A${first}:G${final}`,`H${first}:K${final}`] : [`A${first}:${last}${final}`];
  for (let group=0;group<sections.length;group++) {
   const range=sections[group];
   const preview=await workbook.render({sheetName:name,range,scale:1.3,format:'png'});
   const filename=`preview-${name}-${part}${sections.length > 1 ? `-${group+1}` : ''}.png`;
   await fs.writeFile(path.join(output,filename),new Uint8Array(await preview.arrayBuffer()));
   renders.push({sheet:name,file:filename,range});
  }
 }
}
const filename='shiphub-reprise-20261104.xlsx';
const file=await SpreadsheetFile.exportXlsx(workbook);
await file.save(path.join(output,filename));
await fs.copyFile(path.join(output,filename),path.join(production,filename));
const verification={generatedAt:new Date().toISOString(),engine:'@oai/artifact-tool',sheets:5,detailRows:{ClanShip:clan.length,Assets:assets.length,Chateau:castle.length,Arrivee_QA:arrivalQa.length},summaryCounts:summary.getRange('D6:D11').values.map(r=>r[0]),expectedCounts:expected,additionalCounts:{roomBackgrounds:summary.getRange('D13').values[0][0],individualProps:summary.getRange('D23').values[0][0],arrivalSeconds:summary.getRange('D14').values[0][0],castleRooms:summary.getRange('D15').values[0][0],generationRequests,reuseInstructions},inventoryCheck:{files:backgroundCount+propCount,sha256:'Conformes',bytes:'Conformes',roomBackgroundBytes:state.art.totalBytes,propBytes:state.art.propTotalBytes},propagationCheck:{temporaryAssetState:'Spécifié',observed:perturbed,restored:true,durationBefore,changedDuration,durationRestored:summary.getRange('D14').values[0][0]},formulaInspection,renders,visualReview:'À effectuer sur les vues rendues',gameQA:{baseline:state.baseline,current,publication},delivery:state.delivery,followup:state.followup,baselineSource,nextStep:state.followup?.nextStep ?? (qualified?'Publier le suivi avec sa source qualifiée ; rapprocher ensuite les chantiers parallèles château et arrivée de leurs briefs conservés':'Terminer la recette de la source courante avant qualification'),pullRequest:state.pullRequest};
const xlsxBytes=await fs.readFile(path.join(output,filename));
verification.xlsxSha256=createHash('sha256').update(xlsxBytes).digest('hex');
verification.xlsxBytes=xlsxBytes.length;
await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(verification,null,2));
await fs.copyFile(path.join(output,'verification.json'),path.join(production,'verification.json'));
console.log(JSON.stringify({output:path.join(output,filename),production:path.join(production,filename),counts:verification.summaryCounts,renders,formulaInspection:errors},null,2));
