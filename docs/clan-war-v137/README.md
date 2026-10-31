# V137 — Quatre modes développés simultanément

**PR empilée au-dessus de #45 (V136)**, avec dépendances cumulées #44 → #43 → #41 → #40 → #38 → #37 → #36 → #34 → #29. Les PR du gauntlet #42 et des biomes/planètes restent indépendantes.

## Fonctionnalités codées

| Mode | Progression dans le moteur | Conditions et limites vérifiables |
|---|---|---|
| Assaut latéral | `withdrawWarAssaultSquadV137` : retrait d'une équipe existante arrivée près du bastion | Actor vivant, x ≤ 18, 10 AP, unité déjà lancée et jamais extraite. Elle est retirée du champ, son ID de réservation reste, aucun déploiement doublé ni blessure fictive |
| Outer Ops | `orderWarOuterReconHaltV137` : halte de reconnaissance ou d'escorte réelle | Un seul ordre avant la mi-parcours initiale, même route et mêmes équipes, **+15 secondes de délai**, bonus de préparation **+3 seulement à la résolution**, pas de RAV ni intelligence anticipés. Rappel, réorientation et renfort s'appuient sur la vraie échéance initiale |
| Infiltration | `cover-up/down/left/right` : pas couvert sur une case W3 `terrain.cover` | Déplacement orthogonal **d'une case**, **1 énergie**, deux usages max, impossible à travers les obstacles ou sous camouflage actif. Un garde adjacent reste capable de détecter le chasseur |
| RTS multi-escouades | `commandWarRtsBraceV137` : position défensive sur un vrai couvert source | Une formation vivante sur `tile.cover`, une fois par mission ; mitigation de 1 dégât durant **deux réactions ennemies**, pas d'invincibilité permanente. Mouvement individuel/rassemblement retire l'avantage ; aucun RAV ou HP créé |

Les nouveaux contrôles et libellés sont exposés dans les écrans de jeux `ClanWarOperationsV115.tsx` et `ClanWarRtsSquadsV133.tsx`.

## Sécurité de source, sauvegardes et continuité

- La sauvegarde libre V115 conserve son format version 1 : les nouveaux champs `extractedIds`, `reconHalt`, `silentStepsUsed` sont facultatifs et contrôlés par `readWarOperationsV115`. Une archive invalidée n'écrase pas celle du joueur.
- Le délai initial des Outer Ops reste la borne de décision, même après une halte de quinze secondes ; aucun exploit pour rappeler, réorienter ou ravitailler après la mi-route.
- La carte RTS reste physiquement soumise au terrain W3, à l'occupation de cases et à une visibilité locale. La posture n'autorise ni tir invisible ni ennemi inventé.
- **Zéro mutation de conquête V85, pas de réseau PvP créé, pas d'XP fictive**, pas d'éléments de lore film/comics/PHG présentés comme canoniques.
- Le gameplay principal visé demeure Dynasty Warriors-like ; les formats latéral/Outer/stealth/RTS sont des modes de mission additionnels, pas une copie du gameplay *Aliens vs Predator: Extinction*.

## Excel de production et tests

Le classeur `Yautja_Guerres_Clans_Suivi_Production_V137_2026-10-31.xlsx` reprend **intégralement les 24 onglets V136** et ajoute **7 onglets**, soit **31 onglets** au total :

- 4 feuilles par mode avec 13 exigences chacune (**52 au total**, les 48 V136 suivies et les 4 nouvelles).
- `QA_V137` : 10 scénarios QA par mode (**40**), dont 8 nouveaux contrôles dédiés à la V137.
- `CROISEMENTS_V137` : **20 contrats d'interaction** entre modes, dont 4 nouveaux.
- `SUIVI_V137` : pilotage dynamique par formules, avec statut de CI distinct de la QA réelle, et un diagramme de couverture.

La suite `tests/clan-war-four-modes-v137.test.mjs` couvre les préconditions, la durée et l'expiration des effets, les coûts AP/énergie, les économies RAV, les refus stricts et les archives V115. Le test `tests/clan-war-production-v137.test.mjs` lit les octets réels du XLSX commité. CI sur `.github/workflows/clan-war-v137.yml` : tests V137 + régressions V115/V133/V134/V135/V136 + TypeScript + ESLint.

## Restant pour un produit fini

Aucun des 1 200 scénarios de design V120 n'est transformé automatiquement en niveau final. Restent les cartes conçues à la main, les systèmes de commandement de masse, les vrais recrutements/sauvegardes de campagne V85, l'équilibrage, le multijoueur serveur, les animations et sprites attribués à leurs continuités exactes, les tests navigateur/manette/mobile et les éléments véritablement 1:1. Chaque exigence du classeur porte son statut propre.

**CI ciblée confirmée** : [GitHub Actions 41190458995](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41190458995), **70 tests sur 70**, TypeScript et ESLint verts sans avertissement. Le pilotage V137 compte **52 exigences** : **26 validées en CI ciblée**, 8 partielles, 18 à développer ; **40 contrôles QA**, dont **24 validés en CI** (les autres nécessitent notamment des essais manuels), ainsi que 20 contrats inter-modes.

La CI ne prouve ni le déploiement Vercel, ni les tests manette/navigateur, ni une fidélité d'assets 1:1. La PR reste en **draft** et ne doit pas être fusionnée avant ses branches parentes et ses validations complémentaires.
