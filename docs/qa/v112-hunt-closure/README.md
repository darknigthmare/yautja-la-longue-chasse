# Reprise de qualification de la chasse V112

La reprise conserve les **362 identités originales** du classeur. Sur ses **219 points initialement ouverts**, **201 reçoivent une preuve automatique bornée**, **9 constats sont documentés** et **9 restent ouverts** : **7 partiels et 2 non qualifiés**. Les contrats de données font partie des 201 ; ce nombre ne représente ni 201 parties ni 201 essais humains.

Le [classeur](../../YAUTJA_V112_MECANIQUES_CHASSE.xlsx) contient **21 onglets, 606 lignes, 4 606 cellules et 569 liens de source**. La [source éditable](../../hunt-mechanics-v112.json) contient le registre avant/après, les critères originaux et leurs empreintes. Les 86 lignes BASE_V111 gardent leur statut. Seules les acceptations obsolètes QA112-41/PRF112-03/04 changent hors statut ; leurs critères originaux complets sont archivés dans Cloture. Les 359 autres contrats de cellules restent inchangés.

## Révisions et preuves exécutées

- Audit initial : `f1856f6670fd959ed012c38f84e6d90d6f86a361`, source JSON `12cf521e922693b8e5953424e3d1ef3cb6e82a80`.
- Main préservé lors de l'intégration : `81fc1916fc285ca85d3c434737bc35b1e5f2fb7f` (PR31, compatibilité V122).
- Code qualifié : **`e1e45fbf85d843c26ac1bf4f816baf46313795b0`**.
- Merge réellement exécuté : `3c9575809068ac6c9e4a97f57896c4a4cfc60479` ; arbre **identique** `c32dcc50b200929c71bef159a09c83106ac144c4`.
- Les nouveaux scripts schéma2, le JSON final et le XLSX sont des fichiers documentaires livrés après cette preuve de code. Leur reproduction binaire et leur vérification Python sont des checks distincts de la PR sur le commit effectivement livré ; aucun résultat de ces nouveaux octets n'est attribué à e1 ou à 252c.

| Contrôle réellement exécuté | Résultat | Preuve |
| --- | --- | --- |
| Règles de chasse, transactions et livre V112 original | **314/314**, 0 ignoré | [Run](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41257774503), job 124704501571, étape Native hunting rules |
| Catalogue complet | **41 cas**, 39 espèces, 56 parties, 33 paramètres | Même groupe de 314 : tests/hunt-catalogue-contract-v112.test.mjs |
| Suspension/reprise de travail et guide | **4 nouveaux cas atelier + 8 guide** | Même groupe, tests conservation-persistence-ui et hunt-field-guide |
| Repli local sous charge | **24/24**, 8 missions × 3 armures | Même groupe, tests/hunt-ground-recovery-v112.test.mjs |
| Compatibilité versions/planètes | **25/25** | Même job, étape Legacy and current planet consumer version compatibility |
| Composants, guide et contrôle initial | **22 groupes**, 0 exception pageerror | [Rapport](controls-guide-report.json), job 124704502014 |
| HuntCanvas monté, extraction et atelier durable | **12 groupes**, 0 exception pageerror | [Rapport](lifecycle-report.json), même job SUCCESS |
| CPU de simulation native | **32 cas, 16 paires**, 57 600 pas mesurés + 7 680 d'échauffement | [Rapport](native-performance.json), même run |
| Générateur des quatre SVG de découverte | **Reproduction identique** | Étape Independent workbook and generated resource checks |
| TypeScript complet du même produit | **PASS** | [Run campagne](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41257774563), job 124704501883 |

Le job natif ciblé du run ci-dessus a un statut global d'échec à cause du contrôle TypeScript `TS2307` : `.openai/hosting.json`, importé par vite.config, n'était pas inclus dans son checkout sparse. Les étapes de règles, compatibilité, génération et CPU ont toutes passé, et TypeScript passe dans le checkout du workflow campagne sur le même code. Le lot final corrige ce périmètre de checkout et rejoue ses checks ; ce rapport ne transforme pas le job historique en succès global.

Les commandes exactes de ces preuves figurent dans [le workflow au commit qualifié](https://github.com/darknigthmare/yautja-la-longue-chasse/blob/e1e45fbf85d843c26ac1bf4f816baf46313795b0/.github/workflows/hunt-closure-v112.yml) et dans Qualification/Preuves. En particulier :

```sh
node scripts/qa-hunt-mechanics-browser-v112.mjs
node scripts/qa-hunt-lifecycle-browser-v112.mjs
node scripts/qa-hunt-native-performance-v112.mjs --report outputs/qa-v112-followup/native-performance.json
node scripts/build-discovery-signals-v112.mjs --check
```

Le groupe natif exécuté utilise la liste explicite des seize fichiers du workflow ; il inclut les trois tests du classeur 19 × 362 présent à e1. Les contrôles supplémentaires du classeur 21 × 606 livré ensuite ne sont pas rétroactivement comptés dans314.

## Portée des parcours

Le nouveau parcours monte le **vrai HuntCanvas**, sa boucle rAF et ses listeners clavier/pointeur. Une manette émulée passe par le vrai polling. Blur et pointercancel sont injectés dans les vrais handlers ; pointercancel intervient pendant un appui actif. Le test vérifie aussi le nettoyage au démontage, la reconnexion neutre et le retour clavier dans l'atelier.

L'insertion et le monde sont préparés. La carcasse vient de damageEnemy ; analyse, dépeçage et prélèvement utilisent le menu natif et la simulation. Les prérequis Apex/objectifs sont amorcés avant le segment d'extraction ; la navette et l'embarquement utilisent ensuite les entrées et la simulation réelles. Les callbacks GameClient sont extraits par AST sans réécriture, avec admission de session fournie par la fixture. Le stockage de campagne, sa réconciliation, l’échec de relecture après écriture et le rechargement dans un nouveau document sont réels. **Les checkpoints de chasse sont seulement captés en mémoire.** Tout GameClient et le rechargement du sidecar de chasse ne sont pas qualifiés par ce parcours. Le rapport note 267 requêtes de repli ; la banque d'illustrations complète n'est pas une preuve de ce test.

Les 24 recettes de sol couvrent **900 px aller/retour locaux sous la première route de canopée**, avec ennemis et dangers conservés. La charge est préparée par de vrais gestes sur des acteurs ajoutés avant le départ ; aucun soin, invulnérabilité ni téléportation n'est ajouté pendant ce trajet. Une vraie pause, le sac, la décharge et le saut sont ensuite exercés. Cette preuve ne couvre pas toutes les routes principales jusqu'à l'extraction.

## Mesure CPU

Le runner identifié utilise **Node v22.23.4, Linux x64, AMD EPYC 7763, 4 CPU logiques**. Le pas fixe est de 1/120 s ; chaque cas mesure 1 800 pas après 240 pas d'échauffement, deux fois pour chacun des deux profils des huit missions. Les 16 paires finissent avec le même digest.

Les profils conservent les mondes et les ennemis prévus dans les niveaux, ou avancent les vagues à t=0 avec jusqu'à trois morts réelles par damageEnemy. Le joueur est rendu invulnérable pour garder la simulation active ; cela n'est pas une partie de combat gagnée. Le plus grand p95 est **1,790060 ms**, la moyenne maximale **1,482552 ms**. Le stress isolé de découverte 128acteurs×128 corps est explicitement synthétique. Les échantillons de heap sont informatifs, sans GC forcé ni qualification de fuite.

Ces chiffres portent sur le CPU de stepGame en CI. Ils ne comprennent pas DOM, rendu/GPU, chargement d'assets, audio, périphériques physiques, température ou mémoire retenue du produit.

## Captures conservées

Les neuf PNG ci-dessous proviennent du merge exécuté 3c957... et ont été inspectés. Leurs identités et tailles figurent dans [provenance.json](provenance.json) ; les rapports gardent les scopes d'origine.

| Fichier | Ce qui est visible et sa limite |
| --- | --- |
| [field-guide-readable.png](field-guide-readable.png) | Guide à 390 px avec texte 200 % : capture partielle lisible ; présence et accessibilité de la onzième étape vérifiées séparément par assertions. |
| [accessibility-phone.png](accessibility-phone.png) | Réglages React dans un viewport Chromium390px ; aucun téléphone réel. |
| [workshop-cleaned.png](workshop-cleaned.png) | Panneau de conservation de la première suite de composants. |
| [corpse-rites.png](corpse-rites.png) | Menu corporel et état de travail natifs dans la première fixture. |
| [canopy-native-release.png](canopy-native-release.png) | Renderer de repli et état du pendule ; pas de banque artistique complète. |
| [corpse-rites-gamepad.png](corpse-rites-gamepad.png) | Menu corporel alimenté par polling manette émulé. |
| [mounted-harvest.png](mounted-harvest.png) | Menu de prélèvement dans le vrai HuntCanvas monté ; la frame ne prétend pas montrer toute l'opération. |
| [mounted-conservation.png](mounted-conservation.png) | Atelier après la remise de mission par callbacks de production et stockage navigateur. |
| [mapped-workshop-phone.png](mapped-workshop-phone.png) | Atelier390px et sortie native, **commandes par défaut avant remappage** ; permutation2/3 exercée ensuite et prouvée par assertions, sans apparaître sur cette image. |

Les anciens cinq PNG et [leur rapport](../v112-hunt/README.md) restent inchangés.

## Classeur et limites restantes

Le XLSX documentaire généré mesure **722 729 octets**, SHA256 **`9e46b2e8ab8f8482458b79aaaf1c7d53bcd299fa25d443f465ac5d3ac367e58e`**. Les scripts schéma2 contrôlent 21onglets/606 lignes,4606 cellules/569 liens, les 362identités originales et 219 revues. Les empreintes canoniques des champs et des archives sont comparées par `node:crypto` et `hashlib` de Python ; elles permettent seulement les trois mises à jour d'acceptation datées. Le générateur schéma1 reproduit encore l'ancien XLSX252c à444448 octets identiques. La validation indépendante finale de ces nouveaux octets est le check de la PR sur leur commit de livraison, distinct des preuves datées ci-dessus.

Les neuf exigences originales encore ouvertes sont SRC112-10, ROU112-05/06, CHA112-02/05, ECO112-11, FUT-11/12 et PRF112-07. Restant les détaille en huit critères de qualification : compréhension débutant, téléphone Android, iPhone, manette physique, performances de rendu sur matériel cible, campagne interactive complète, application Excel native et repli terrestre complet. L'absence d'Excel natif est une limite supplémentaire explicitée, pas une qualification de jeu inventée.

Le [protocole débutant](../v112-hunt/beginner-protocol.md) est prêt, avec neuf tâches pour cinq nouveaux joueurs et une cible de 4/5 sans aide sur les tâches essentielles. **Aucune session humaine ni périphérique physique n'est revendiqué.** Les preuves automatiques et les captures ne ferment pas ces critères.

## Vérifications complémentaires de la branche intégrée

Sur `6d7287f7667210553874d26fafcfedbb8750d96f`, le [run ciblé 41259714388](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41259714388) a terminé ses deux jobs avec SUCCESS : `124710278575` a passé les 314 tests de chasse, les 17 tests de reprise Homeworld/V109, les cinq tests des consommateurs planétaires et de préservation de douze mondes, TypeScript, le lint ciblé, les vérifications du classeur et le benchmark CPU ; `124710278237` a passé les 34 groupes navigateur.

Le [grand run 41259714448](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41259714448), job `124710339277`, a ensuite passé le glob V112 complet, dont l’adaptateur de publication avec ses neuf assertions originales et les deux CLI historiques, ainsi que la compilation Next, le smoke HTTP et le lint exact du dépôt. Ces étapes étaient terminées au moment de cette consignation ; le résultat de l’ensemble du workflow et la validation du lot documentaire final sont consignés séparément dans la PR. Les treize fichiers de preuve, dont les neuf PNG, restent ceux du passage e1, sans changement de leur provenance.

La sérialisation du schéma2 omet les attributs `xml:space` redondants pour les textes sans espaces de bord. Les espaces de bord restent explicitement préservés, les textes internes ne changent pas, et le schéma1 garde ses octets d'origine. Cette réduction porte seulement sur l'XML du conteneur ; les 21onglets,606 lignes,4606 cellules contrôlées et569liens restent identiques.
