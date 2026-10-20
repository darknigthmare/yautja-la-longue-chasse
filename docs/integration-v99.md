# Intégration des fronts, de Preserve Hunt et de Homeworld — V99

Ce lot publie ensemble les ajouts locaux V96–V98 et leur prolongement V99.
Les précédentes PR #1 à #4 étaient déjà fusionnées au début de ce travail.
Le numéro de contenu devient V99 ; les schémas historiques conservent leur
version et les fronts libres restent indépendants de la campagne.

## Comportement livré

- **Guerres des clans** : trente planètes, continents irréguliers rapprochés,
  biomes classiques et exotiques, surfaces non jouables texturées, couleurs de
  contrôle et archives locales distinctes. Le poste de commandement V98 est
  complété par les [relèves de garnison V99](clan-war-garrison-v99.md) : des
  personnes réellement présentes rejoignent ou quittent la garde. Les blessés,
  personnes réservées ou en formation restent indisponibles ; retirer le
  dernier garde exige une confirmation. La relève ne crée aucun effectif et
  ne produit aucun revenu immédiat.
- **Preserve Hunt** : l'interception V98 des embarquements est conservée. Les
  huit dépôts peuvent être neutralisés par une interaction physique de deux
  secondes. Les survivants récupèrent les composants auprès des porteurs
  abattus en se déplaçant réellement, avec interruption sous la menace ou en
  cas de blessure. Un appareil plein ne détruit pas le lot porté. Le carnet
  respecte les informations observables et les checkpoints restent validés.
- **Homeworld** : le guidage V98 reste un parcours à pied, avec ses accès et
  passages existants. La [navigation V99](homeworld-navigation-v99.md) réduit
  la recherche et les points redondants ; chaque segment conserve le contrôle
  de collision complet et les passages étroits disposent du repli V77. Les
  caches sont invalidés lors du remplacement des registres de décor.

Les cartes planétaires sont des créations de jeu compatibles avec les thèmes
de l'univers ; elles ne sont pas présentées comme des cartes officielles.
La provenance des silhouettes est décrite dans les
[références V97](planet-coastline-references-v97.md).

## Suivi Excel et limites de production

Le [suivi V99](YAUTJA_V99_SUIVI.xlsx) est généré à partir des cinq classeurs effectivement disponibles,
des extractions archivées et des exports du code. Les feuilles historiques du
V63 sont conservées ; les nouveaux onglets distinguent sources, implémentation,
preuves et reste à faire. Les originaux privés absents ne sont pas annoncés
réextraits ou terminés. Sa [documentation](excel-followup-v99.md) précise les
commandes et le périmètre des vérifications.

Douze des dix-huit ouvrages de guerre ont un comportement runtime. S09, S10,
S13, S14, S15 et S18 restent ouverts : leurs conditions de transport, montures,
énergie, duel, écoute ou escale exigent encore un comportement effectif. Les
catalogues de dialogues, voix, navires et THE PIT ne deviennent pas complets
par leur présence dans le classeur.

## Validation et publication

Sur le runtime figé après correction de la connaissance locale des survivants :

- Compilation Next de production et TypeScript : réussis. Build final
  `t-1gCnL18QyMeOAc2vfmd` ; smoke HTTP/JavaScript/routes protégées : **5/5**.
- Lint strict du runtime modifié et des nouveaux scripts/tests V99 : aucune
  erreur ni avertissement. Le lint global ne signale aucune erreur ; les
  avertissements historiques restent distincts de ces fichiers vérifiés.
- Cartes et persistance V85/V94/V96/V97 : **118 tests réussis**, aucun ignoré.
  Contrôles de production V94 : **93 tests réussis**, aucun ignoré.
- Rejeu Preserve après la dernière correction : **40 tests réussis**, aucun
  ignoré, dont le projectile qui interrompt la récupération sans révéler la
  position du chasseur caché.
- Excel : **6 tests réussis**, génération et `--check` réussis ; lecture
  indépendante ZIP/XML et openpyxl. Quinze onglets, dix-huit parties anciennes
  inchangées, douze formules recomptées et quarante-neuf entrées vérifiées.
  Excel et LibreOffice natifs n'ont pas été exécutés.

`npm run test:worlds:v99` : **147 tests réussis, aucun échec ni ignoré**. Cette
commande regroupe les régressions V98/V99, le classeur et les tests historiques
des trois domaines. Les comptes de suites ci-dessus se recouvrent et ne
doivent pas être additionnés.

La recette Chromium reproductible `scripts/qa-three-modes-v99.mjs` vérifie les
gardes, la logistique, les rechargements réels du carnet, le guidage, la marche
clavier et la traversée du palier du Conseil, la pause et les interfaces
mobiles. La recette finale réussit **76 contrôles**, avec **21 captures
inspectées**, aucune erreur console ou page et vingt-deux sources runtime
identiques avant/après. La vraie marche rejoint le palier du Conseil +1 ; le
guidage se recalcule et la reprise restaure ce palier. Calcul navigateur :
2 988 ms froid, 210 ms chaud dans le même worker, dix-huit points au premier
palier. Les résultats sont également récapitulés dans la PR de ce lot ;
`outputs/qa-three-modes-v99/production/result.json` et les captures conservent
les preuves locales hors Git. Les échecs préparatoires restent séparés.
Les situations avancées de Preserve et le profil jeunesse Homeworld sont des
fixtures normalisées explicitement décrites dans ce résultat ; les actions
suivantes utilisent le runtime et les commandes publiques. La marche emploie
une horloge navigateur contrôlée et ne constitue pas une campagne jouée depuis
le début.
Le registre Excel distingue la validation de ces parcours ciblés des chantiers
globaux encore ouverts.

La CI exécute les tests des systèmes et du classeur sur les sources réelles
nécessaires. La publication du site public ne découle pas de la fusion Git.

Les validations historiques V98 et leurs limites restent dans le
[compte rendu V98](integration-v98.md). Elles ne sont pas comptées comme une
nouvelle exécution intégrale en V99.
