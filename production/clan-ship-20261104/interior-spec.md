# Clan Ship — intérieur physique

Le Clan Ship est le vaisseau collectif AVP où la coque personnelle s’amarre. Cette version ajoute un pont parcourable en vue latérale avec une faible profondeur de sol, sept salles, des portes et des installations de proximité. Le tableau de production et les preuves courantes sont dans [production-state.json](production-state.json). La recette historique du plan de visite reste dans `qa/` ; elle ne qualifie pas à elle seule ce nouveau déplacement.

## 1. Parcours et services

Le menu des salles choisit une destination. Le chasseur rejoint les portes successives de l’anneau, puis le point d’usage de la salle demandée. Une commande manuelle interrompt ce guidage. L’installation attend une interaction explicite une fois à portée.

| Ordre | Salle | Voisin gauche | Voisin droit | Installation et retour |
|---:|---|---|---|---|
| 01 | Hangar | Soins | Armurerie | Rejoindre le pont du vaisseau personnel. L’amarrage est conservé. |
| 02 | Armurerie | Hangar | Entraînement | Ouvrir l’équipement existant, puis revenir à la même position. |
| 03 | Entraînement | Armurerie | Conseil | Ouvrir l’entraînement existant, puis revenir à la même position. |
| 04 | Conseil | Entraînement | Archives | Ouvrir le conseil du clan, puis revenir à la même position. |
| 05 | Archives | Conseil | Trophées | Ouvrir le codex existant, puis revenir à la même position. |
| 06 | Trophées | Archives | Soins | Ouvrir l’atelier des trophées, puis revenir à la même position. |
| 07 | Soins | Trophées | Hangar | Ouvrir la baie médicale existante, puis revenir à la même position. |

La coque affichée dans le hangar provient de la flotte de la campagne. Le retour au pont personnel n’effectue pas un désamarrage. La sortie en vol libre reste une action distincte, nécessaire avant un nouveau voyage. Le château orbital conserve une future identité de destination séparée.

## 2. Géométrie commune

La source de vérité est `app/game/systems/clanShipInterior.ts`. Les valeurs ci-dessous décrivent le contrat courant du contrôleur ; elles ne sont pas des mesures canoniques du vaisseau AVP.

| Mesure | Valeur dans le monde du jeu |
|---|---:|
| Salle | 1 440 × 800 unités |
| Bande de marche | x = 64 à 1 376 ; y = 490 à 708 |
| Rayon conservateur autour des pieds | 18 unités |
| Vitesse maximale | 300 unités/s |
| Portée d’interaction | 64 unités |
| Delta maximal simulé par frame | 0,05 s |
| Porte gauche | (128 ; 635) |
| Porte droite | (1 312 ; 635) |
| Apparition sûre par la gauche | (240 ; 645), orientée à droite |
| Apparition sûre par la droite | (1 200 ; 645), orientée à gauche |

Chaque installation possède une image, un pied d’ancrage et une empreinte de collision distincte. Les pieds du chasseur restent dans la bande de marche et à l’extérieur des empreintes agrandies de son rayon. Le calcul de trajet emploie les mêmes empreintes que le mouvement manuel ; une image haute ne crée pas un grand rectangle invisible. Le trajet choisit des segments praticables autour des installations. Une cible occupée ne déplace pas silencieusement le personnage à travers le mobilier.

Les deux portes sont des points de passage vers les salles voisines. Une transition accepte uniquement un voisin et un acteur suffisamment proche. L’écriture de la salle doit réussir avant le changement. Un échec conserve la salle actuelle et affiche une erreur exploitable.

## 3. Commandes

| Entrée | Action |
|---|---|
| Flèches, ZQSD ou WASD | Marcher et reprendre la main sur un guidage |
| Clic ou toucher sur le sol | Rejoindre un point praticable |
| Clic sur une porte | Marcher vers cette porte, puis passer à portée |
| Choix d’une salle | Suivre un itinéraire par les salles voisines |
| E, Entrée, Espace ou bouton d’action | Interagir avec la porte ou l’installation proche |
| Échap / bouton Start | Ouvrir les paramètres |
| Manette : stick gauche ou croix | Marcher |
| Manette : A / bouton 0 | Interagir sur une nouvelle pression |
| Manette : B / bouton 1 | Annuler le trajet ou demander le retour au hangar |
| Croix tactile | Marcher tant que la direction est maintenue |

Le navigateur conserve les interactions natives des champs et boutons. Une saisie dans un champ ne pilote pas le chasseur. À l’entrée d’une nouvelle scène, au retour d’un service ou après une suspension, la manette doit repasser au neutre. Les touches maintenues sont effacées à la perte de focus. Un bouton tenu ne doit pas franchir successivement plusieurs écrans.

## 4. Sauvegarde et position

Deux durées de conservation sont explicites :

- **Pendant une visite de service ou des paramètres**, la salle reste montée et suspendue. À la fermeture, la position, l’orientation et le décor restent identiques. Le conseil suit cette règle comme les cinq autres services.
- **Après fermeture, retour au menu ou rechargement**, la sauvegarde conserve l’état d’amarrage et la salle. La position fine est transitoire : la reprise place le chasseur à l’entrée sûre de cette salle, sans le coincer dans une installation déplacée.

L’identité du propriétaire de campagne et celle de la coque restent celles de `clanShipDocking`. Une campagne étrangère ne récupère pas cette visite. Les validations d’import, de version et de cohérence avec la flotte restent actives. La sauvegarde n’ajoute pas une position au pixel près dont les règles de migration seraient absentes.

## 5. Composition et assets

Les sept fonds 1440 × 800 sont des images opaques individuelles. Leurs sources de génération et empreintes sont conservées dans `art-source/clan-ship-v1/generation.json` et `public/game/clan-ship/manifest.json`. La bande de marche, les collisions et les interactions restent définies dans le code.

Les portes réemploient des modules indépendants du kit du jeu. Le personnage réemploie son rig et son preset courant. Huit fichiers transparents distincts habillent les installations : `berth-console-v1`, `council-table-v1`, `armory-rack-v1`, `armory-forge-v1`, `trophy-workbench-v1`, `medical-bed-v1`, `archive-terminal-v1` et `training-station-v1`. Le manifeste conserve leurs dimensions, leurs pixels visibles, leur pivot et leurs empreintes. Leur état de chargement en jeu et leur revue artistique restent suivis séparément de la génération.

Le tri de profondeur utilise le pied des objets et du chasseur. Les repères de service et de porte restent lisibles devant le décor. La caméra suit le personnage dans le cadre disponible, y compris à 320 px, sans comprimer toute la pièce en une miniature. Les mouvements réduits retirent les mouvements décoratifs concernés et conservent le contrôle, les indications et les interactions.

## 6. Critères de recette

Les preuves doivent identifier la source testée et couvrir les chemins réels : arrivée au hangar ; mouvement libre ; collision et contournement ; trajet par les portes ; sept salles ; accès et retour des six services ; suspension ; écriture refusée ; sauvegarde, menu, recharge et Continuer ; retour personnel et désamarrage. Clavier, pointeur, manette et tactile ont chacun des interactions à exercer.

Les contrôles d’assets portent sur les fichiers demandés par ces parcours. Ils ne certifient ni l’ensemble des assets du jeu ni une fidélité canonique à l’identique. L’approbation artistique humaine reste un champ distinct de l’intégration et des tests.

## 7. Point de reprise

Les exigences `CL-25` à `CL-40` du classeur suivent ce nouvel intérieur. `production-state.json.current` porte les résultats courants, les commandes de vérification et le lien de preuve lorsqu’ils existent. Les statuts historiques du plan de visite restent associés à la source `9d77af8` et au run `41789974649`.
