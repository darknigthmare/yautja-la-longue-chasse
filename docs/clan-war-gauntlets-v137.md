# V137 — Clôture technique et registre de production des gauntlets

**PR :** https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42  
**Base :** `feat/v129-w3-rts24-source-objectives`, PR empilée sur #40.  
**Classeur canonique de suivi :** [Yautja_Gauntlets_V137_Arsenal_Clans.xlsx](Yautja_Gauntlets_V137_Arsenal_Clans.xlsx).

## Ce qui est techniquement achevé et prouvé

- 54 identités de gauntlets inventoriées dans `app/game/data/clanWarGauntletCatalogV132.json`.
- 219 calques SVG physiques et remplaçables, dont 7 Jungle Hunter V134, 16 pour les quatre accessoires étudiés en V135, et 196 créations **ORIGINALES, non canoniques** pour les 49 autres identités en V136.
- Génération reproductible des 219 fichiers PNG alpha et composites en artefacts GitHub Actions. Le script V137 vérifie les octets, SHA256, tailles, `viewBox`, présence de matière et transparence réelle : `scripts/audit-gauntlet-evidence-v137.mjs`.
- Un seul atlas stratégique monté dans `ClanWarGauntletV131` en présentation holographique ou classique, testé dans un véritable navigateur Chrome avec un **enfant témoin** dont le compteur d'ordres et la valeur de caméra restent inchangés à la bascule. Ce n'est **pas** un test intégral du moteur de guerre V85.
- Tests navigateur sur l'atelier de comparaison V136 : recherche, filtrage, deux modèles simultanés, clavier, capots, zoom, viewport mobile 390 px et `prefers-reduced-motion`. Ces tests ne remplacent pas les essais d'un chasseur sur tous les mondes.
- SaveGame V13 : equip/études V134 inclus dans l'archive et dans l'empreinte des écritures sociales ; import/export, migration V12, refus futur/propriétaire incompatible et conflit simulé multi-onglets testés en Node. La synchronisation cloud et les deux navigateurs réels doivent toujours être essayés séparément.
- 44 études de reconstitution cosmétiques à l'armurerie, à preuves de campagne exigées et sans récompense de simulation de guerre libre.

### Exécutions et artefacts de référence (31 octobre 2026)

- Source, tests ciblés, alpha et PNG : [GitHub Actions V131/V137, run 41196187434](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41196187434).
- Compilateur, build, sauvegarde, tests Chrome galerie et vrai wrapper : [GitHub Actions V136/V137, run 41196187376](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41196187376).
- [219 empreintes SHA, transparence et provenance des calques](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41196187434/artifacts/13040272198).
- [Pack PNG des 54 modèles](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41196187434/artifacts/13041255745).
- [Captures navigateur galerie](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41196187376/artifacts/13041067289).
- [Captures navigateur double vue / atlas enfant témoin](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41196187376/artifacts/13041231560).

**Attention :** les URLs d'artefacts de CI ont une rétention de 30 jours. Les sources permanentes sont dans le dépôt ; les extraits de CI ne sont que les preuves datées du commit testé.

## Suivi Excel V137 — 33 feuilles, sans fausse fermeture

La version V137 consolide les 26 onglets V136 et en ajoute 7 :

| Onglet | Fonction |
| --- | --- |
| 26_V137_Couverture | Un état par gauntlet, provenance, sources SVG et version artistique |
| 27_V137_Preuve219 | Une ligne par calque réel, chemin source, preuve SHA/alpha et sortie PNG |
| 28_V137_QA_Chrome | 22 vérifications avec statut, contexte et lien de preuve |
| 29_V137_Ouverts | 1 073 lignes de travaux **ouverts ou partiels**, sourcées depuis les anciennes feuilles |
| 30_V137_Validation54 | 54 grilles indépendantes de décision : proportions, captures, textures, gestes, QA, testeurs, droits |
| 31_V137_Dashboard | KPIs avec formules sur les preuves, les modèles, les tâches non closes et les QA |
| 32_V137_Legende | Critères et niveau réel des preuves pour prévenir les validations abusives |

Les 1 073 lignes sont un cumul de **feuilles historiques**, pas 1 073 tickets uniques sans chevauchement. À elles seules, les 540 fiches d'assets d'origine et 324 tâches détaillées V136 représentent 864 lignes qui se recouvrent en partie.

### État des 324 tâches V136

- 162 restent ouvertes sans preuve de finition canonique (captures multi-angles, véritables textures UV et validation finale).
- 162 ont une base technique partielle (silhouettes vectorielles, couvercle CSS, rendu de test), mais **aucune n'est qualifiée 1:1**.
- 0/54 variantes approuvées 1:1. La CI ne peut pas légitimement « terminer » ce compteur.

### Pourquoi les anciens statuts ont été corrigés

Les anciennes cases « Non produit » pour les calques du bras, de la coque ou de l'écran étaient dépassées depuis les sources V134–V136. Elles indiquent désormais qu'un prototype SVG et un export PNG existent, tout en conservant les tâches de matériau, rig, géométrie et comparaison cinéma. Les tâches de capot, SFX, HUD, sauvegarde et déblocage sont marquées selon le **périmètre** que les tests couvrent réellement, sans inventer d'heures réalisées.

## Manquants non clos (priorités suivantes)

1. **Jungle Hunter** : captures du film 1987 face, dessus et profil ; mesures de la charnière, proportions, nombre et graphie des inscriptions, matériaux, microrelief et orientation de projection. Le prototype doit être visuellement comparé avant le mot « 1:1 ».
2. **Wolf / City Hunter** : vérifier face et dos des véritables props ; ne pas transposer des cellules lumineuses inventées dans un accessoire de cascade.
3. **49 modèles restants** : leurs silhouettes actuelles sont des **créations procédurales distinctes**, pas des gauntlets canoniques reconstruits. Réunir les vues propres à l'accessoire de chaque personnage, et remplacer chaque couche au besoin.
4. **Jeu complet** : tester réellement la carte V85, les quatre modes V115, 30 mondes, les ordres et la transition sans perte ; vérifier la persistance entre deux onglets et dans le cloud.
5. **Animation et rig** : les modèles en gros plan ne sont pas des assets film homologués dans toutes les poses du personnage ; produire la liaison complète au squelette et les gestes lever/ouvrir/projeter/ranger.
6. **Audio et accessibilité** : dix profils originaux branchés, mais écoute de calibration et contrôles manette/tactile complets restant à faire.
7. **Livraison** : revue humaine indépendante, référence validée, approbation de droits et autorisation de distribution si envisagée. La PR demeure brouillon tant que ces conditions ne sont pas satisfaites.

## Critère de clôture

Seule une tâche **purement technique**, précisément couverte par des tests et une preuve, peut être clôturée au titre du code. Une tâche « gauntlet 1:1 » demeure ouverte sans au moins plusieurs références contrôlées du véritable accessoire, une comparaison dimensionnelle et matérielle, des animations validées et l'acceptation explicite d'un réviseur humain. Aucun résultat de build ne remplace cela.
