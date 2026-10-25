# Suivi des chantiers V109

Le classeur ajoute douze feuilles aux 85 feuilles publiées dans V108 : **97 feuilles, 56 exigences source toujours ouvertes, aucune clôture source**. Les cellules, formules, tables, styles et parties de feuilles historiques sont préservés. Les progrès et leurs limites figurent dans les nouvelles colonnes.

Les quatre périmètres ciblés sont `VALIDE_CIBLE` sur le même build de production `FJ6IbT6OZx1H51wYnNmex`, runtime `63cfb392a72438623f8031257e54497ece390aa8`. Le master [v109-validation-summary.json](v109-validation-summary.json) conserve **208 contrôles et 65 captures inspectées** : Pit 65/19, Homeworld 55/11, Clans 38/8, Preserve 50/27. Chaque résultat brut reste intégral en gzip ; ses images, sources avant/après et réponses HTML sont vérifiées. Les inspections visuelles détaillées accompagnent les quatre dossiers de preuves.

| Chantier | Périmètre validé | Portée encore ouverte |
| --- | --- | --- |
| Pit | Deux projections avant liées au duo Feral/Scar sans costume ; huit admissions natives et 48 dessins distincts. Les deux ordres du duo, commandes, saisie/vol/impact, déchoppe fraîche, échec, victoire réellement jouée et replay V16 exporté/public sont contrôlés. | Autres partenaires, costumes, TH_B, conclusions, kits complets et campagnes source. |
| Homeworld | ROLE03 A/B par marche, accord, lieux copiés, portages séparés, comparaison, échec/reprise et rapport ; plaque, empreinte et fragment natifs distincts. Un troisième parcours vérifie l’Atlas avant/après le portage et la dépose réels d’un lot cargo. | Nouveaux gestes BODY du PNJ, réparation effective du bord, attribution de l’empreinte, lignée et récompenses ; le parcours Atlas ne prouve pas une nouvelle livraison ROLE19 complète. |
| Clans | Depuis un checkpoint V108 préparé et déclaré : six livraisons ordonnées, mêmes U19/skiff, stocks finis, rechargement, retour physique, archive originale conservée atomiquement et séparation des montures. | Les six constructions et soins antérieurs appartiennent à la fixture ; autorité, coque gagnée, acquisitions de campagne et correspondance des territoires restent ouverts. |
| Preserve | Deux entrées V5 neuves avec seize adultes sains chacune, un combat/prélèvement réel par biome, clavier/tactile, entrée de campagne et travaux vivants ; terrain, quatre postes, caches et retour dans des fixtures déclarées. | Les trajets préparés ont seize adultes déjà neutralisés ; ils ne prouvent pas une victoire complète ni les objectifs mécaniciens/interception Iskhel. Cible 80 secteurs/100 adultes et fiches H001–H100 toujours ouvertes. |

Les deux projections exposent toujours `sourceCompletion=false`. Les neuf actions source restent ouvertes : le support de ce duo ne satisfait pas les exigences de tous les partenaires et costumes. Les 48 rectangles natifs utilisent 29 pages, avec 12 dessins par héros/rôle. Les bords UV alpha0, pivots et appuis sont revus ; les mesures de jeu sont des adaptations, sans certification cinématographique 1:1. Le [registre de sélection finale](suivi-production/v109-pit-forward/final-source-selection.json) distingue 35 tentatives, 34 sorties natives, cinq références seules et un rejet sans image. Les cinq références comprennent quatre fichiers art-source et une page publique inutilisée. Aucun pixel généré n’est retouché pour fabriquer une pose.

Les véritables exports Preserve V5 définissent Khar-Duun et Iskhel, huit secteurs et seize adultes chacune. Le catalogue V107/V108/V109 contient **32 secteurs et 64 adultes uniques** ; V1/V2 ne sont pas additionnées aux versions qui les recouvrent. Il reste 48 secteurs et 36 adultes à définir pour les cibles 80/100. Les trois atlas humains sont réutilisés ; aucune nouvelle fiche graphique H001–H100 ni navigation humaine verticale n’est admise.

La source Homeworld courante est ROLE03 : scène383, choix788/789, répliques3183–3190. ROLE19 conserve séparément scène398, choix818/819, répliques3303–3310 et son registre cargo. Les campagnes Pit et familles sans nouvelle livraison V109 gardent leur portée héritée.

Le registre est `FROZEN`. Les **1 359 entrées** du gel final, dont 398 fichiers publics, sont vérifiées avant la génération du classeur. Le gel SHA256 `e01f55d66dbae26b350101d3b06a9c306a2aa42ac19510944e82dcd60a1d19d1` couvre les sources app/configuration, les quatre recettes, les 39 nouveaux fichiers publics, les références et reçus, ainsi que les revues natives. Les anciens 175 contrôles et 47 captures V108 ne sont pas additionnés aux résultats V109.

Les journaux complets épinglés comprennent 95 assertions V109 sans échec ni test ignoré, dont les 34 tests Pit. Les cinq groupes de régression supplémentaires portent 438 assertions : 135 entrées, 46 V104, 126 V105/V106, 50 Clans/Preserve/Homeworld et 81 archives. Ces groupes recouvrent certaines vérifications et ne forment pas un total de tests uniques. TypeScript passe ; le lint global conserve zéro erreur et 171 avertissements sur fichiers historiques inchangés. Le build R2 passe. Les vérifications native-origin/static-output spécifiques à une racine Vercel exacte restent marquées ignorées dans son journal ; aucun déploiement externe n’est prétendu. Les 11 contrôles Excel/histoire/publication sont rejoués après la finalisation du registre.

Deux essais non concluants restent conservés sans promotion :

- Le [premier essai Pit](qa/v109-pit-first-production/manifest.json) a échoué sur une couverture de sondage trop parcellaire. Le lecteur QA a été corrigé ; app et art sont inchangés. Les quatre recettes ont ensuite été entièrement rejouées sur le nouveau build commun.
- Un [essai Preserve interrompu](qa/v109-preserve-paused-trial/manifest.json) a affiché la pause Iskhel pendant le contrôle tactile. Sa cause reste non attribuée ; aucun défaut reproductible n’est confirmé. Une répétition intégrale inchangée sur le même code/build passe. Les deux résultats bruts restent distincts.

L’historique V108 s’exécute dans une capsule issue du commit `2d88854b44c7cac14063f4445b8e0855646e7dec` : 1 486 fichiers source privés, dix fichiers de tests originaux et 835 fichiers partagés protégés par leurs empreintes. Les 36 PNG et 36 reçus de provenance sont copiés dans ce package en lecture seule ; le refus original des symlinks hors package reste actif. Aucune importation du jeu courant n’est redirigée.

Ses 75 assertions originales et la régénération du classeur V108 passent sans modification. Le fichier reste à 4 757 180 octets, SHA256 `2a9490d4e37ff63405039f4f7e7b8c473373f15f83414ca5ff46e142ca5cdaba`. Son journal est conservé dans `docs/qa/v109-excel-followup/historical-v108.log`.

Commandes avec Node22 et Python3 :

```sh
node scripts/snapshot-runtime-v109.mjs --check docs/v109-runtime-freeze.json
node scripts/check-excel-history-v109.mjs --check --tests
node --experimental-strip-types --test --test-concurrency=1 tests/*-v109.test.mjs
node scripts/build-excel-followup-v109.mjs --check
```

Le générateur vérifie les parties ZIP/XML, les valeurs, caches et formules. Il ne lance ni navigateur ni Excel natif. Les preuves portables décrivent les parcours réellement exécutés ; une admission artistique ou une quantité de contenu ne clôt pas une exigence source complète.
