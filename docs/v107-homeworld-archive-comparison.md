# V107 — Étude située de l’archiviste

L’approche A de `D6-W-PNJ-ROLE-03` devient une opération physique distincte après le dépôt séparé B de V106. Le troisième contenant d’étude C et un troisième pupitre natif existent dans le quai. Le joueur doit relever C sur place, copier sa provenance, le porter, le déposer, observer les deux supports A/B à pied, revenir au pupitre pour confronter les relevés puis présenter le constat à l’archiviste. Aucun déplacement, résultat ou récompense n’est accordé par une simple réplique.

## Source exacte et limites

La Bible cumulative V6 a le SHA-256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`. Son corpus extrait `public/game/dialogues/v85/bible-dialogues.json` a le SHA-256 `e36efdc3d5ac8fddb74dd683458b72873203446204e768b02aa13e4db17eed30`. V107 relit l’extraction V106 sans la modifier.

| Source | Usage réellement joué |
| --- | --- |
| `Scènes de dialogue V6!A383:Q383` | Objets présents, interlocuteur présent, opération physique et état conservé |
| `Choix et actions V6!A788:I788` | « Retrouver une preuve située et la comparer aux supports existants. » ; aucun objet, grade, soin, trophée ou territoire accordé par la parole |
| `Répliques V6!A3187:K3187` | Choix A : « Je cherche l’objet qui relie les deux. » |
| `Répliques V6!A3188:K3188` | Réponse A : « Apporte-le avec son lieu de découverte. Un fragment arraché à son histoire ne nous aide guère. » |
| `Répliques V6!A3184:K3184` | Succès seulement après comparaison explicite, retour marché et rapport |

Le troisième contenant est un objet de travail générique scellé, réemploi explicite de l’art natif existant. Son contenu n’est pas inspecté. La provenance est le lieu effectivement relevé sur le quai, conservé indépendamment de ses déplacements et parkings ultérieurs. La confrontation montre les observations faites auprès des deux supports et les écarts géométriques mesurés depuis ce lieu. Elle ne permet de déduire ni auteur commun, ni parenté : le verdict sauvegardé est `context-kept-link-undetermined`.

Le prérequis B terminé est une mise en scène locale : A est une nouvelle étude, pas la réécriture du choix de l’opération B. Les dossiers de B, leur constat et les cartographies A/B restent inchangés.

L’ouverture nommant une plaque et une empreinte (`A3183:K3183`), l’échec sur des appuis (`A3185:K3185`) et la reprise sur un bord manquant (`A3186:K3186`) restent ouverts. Aucun asset admis ne représente précisément ces objets, leur contenu ou la manipulation décrite. Le corps natif de l’archiviste reste celui de V106 ; aucune nouvelle animation de main, prise, parole ou inspection du PNJ n’est certifiée. Ces limites sont consultables dans l’interface et ne sont pas comptées comme terminées.

## Sauvegarde et géométrie

Le champ optionnel `homeworld.archiveComparisonV107` est absent des anciennes parties. Son schéma strict version 1 contient propriétaire, révision et reçu : position de C, dernier point marché, découverte et observateur, copie du relevé, observations A/B, confrontation et interruption. Les actions durables passent par une transaction atomique ; un refus conserve les octets antérieurs, bloque la marche et propose un nouvel enregistrement sans rejouer l’action refusée.

Le portage est unitaire et visible. Une interruption garde C au dernier point confirmé. La pose au sol est explicite ; la reprise et la prise suivantes conservent la découverte originale. Le point d’acteur et le contenant porté doivent correspondre à l’import. Le déplacement derrière une peinture de façade reste physiquement valide ; les interactions avec un objet masqué restent refusées. Un pas réellement invalide restaure l’acteur complet avant de sauvegarder l’interruption.

Le troisième pupitre utilise les mêmes dimensions, pivot et support natifs pour son rendu et son solide. Le moteur, la navigation locale, le guide et son worker partagent ce solide. La carte reste limitée au quai connu, indique les positions et la provenance ; elle signale C en bord de cadre s’il est posé ailleurs. Les nouveaux repères ne sont révélés qu’après visite du port et dépôt B terminé.

Aucun nouvel artwork public : réemploi de `clan-lectern-right.png` et `sealed-cargo-case-left.png` V80, déjà admis et épinglés V106. Les fichiers de données V80/V92 et le corpus source restent inchangés.

## Validation

Les tests causaux sont `tests/homeworld-archive-comparison-v107.test.mjs` et les nouvelles assertions additives de `tests/homeworld-input-runtime.test.mjs`. Le helper natif construit le prérequis B et A depuis leurs actions réelles, avec moteur civique et itinéraires partagés. Il ne fabrique pas de reçu terminé.

Le driver de recette est `scripts/qa-homeworld-archive-comparison-v107.mjs`. Son seul point de départ accepté est une campagne existante avec B terminé par le helper natif et aucun reçu A. Chaque étape A utilise ensuite l’application compilée, ses boutons et les vraies touches clavier. Il couvre les refus répétés, pause, pose, reprise, Continuer, guide/worker, comparaison explicite et mobile. Les captures et le rapport de production seront attachés après gel et exécution ; ce document ne revendique aucun PASS navigateur avant cette recette.
