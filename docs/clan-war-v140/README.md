# V140 — Quatre modes, cohérence géographique et dangers physiques

**PR empilée sur #48 (V139)**. Les versions #47 → #29 précèdent le lot, la PR gauntlet #42 demeure parallèle. Aucun code de carte planétaire, équipement PHG, campagne V85 ou serveur PvP n'est modifié.

## Gameplay développé, règles originales du jeu

| Mode | Mécanique V140 | Contrat technique |
|---|---|---|
| Assaut latéral | Profils de renforts régionaux W3, un nombre borné de vagues | `warAssaultWaveProfileV140`, 1 à 4 unités existantes V6, dispersion par rôle, maximum 6 à 9 vagues selon terrainDefense de la véritable fiche V6 ; pas d'apparition sur entrée occupée ; `wavesIssued` contrôlé en archive |
| Outer Ops | Chronologie des véritables passages du mandat et du retour | `warOuterRouteProgressV140`, noms/IDs des passages du `WarRulesV6.passages`, aller/retour, halte de 15 s sans déplacement, rappel différé ; aucune position ennemie cachée, aucune victoire ou renseignement inventé |
| Infiltration/sabotage | Patrouilles sur sol physique dans les six biomes W3 | `warStealthPatrolSpawnV140`, `warStealthPatrolStepV140`, BFS borné 4≤x≤7, 1≤y≤3, aucune entrée dans mur, un pas orthogonal au plus par tour, `guardY` facultatif pour charger anciens checkpoints |
| RTS multi-escouades | Périodes de danger environnemental communes à tous les camps | `warRtsEnvironmentalWindowV140` et `advance`: dégâts simultanés aux escouades **et** adversaires présents sur les mêmes cases `map.hazards` aux tours 3–4 modulo 8 ; ordre d'environnement sans RAV ajoutés ; prévision limitée à une fenêtre et non à des ennemis cachés |

## Références et fidélité

Les 30 unités W3 sont définies dans `clanWarBibleV6.ts`, les terrains V6 dans `warMissionTerrainV116`, les 12 cartes et leurs dangers dans `clanWarSourceMapsV128`. Les 24 scripts RTS source se trouvent dans `clanWarRtsSourceMissionsV129`. Le profil d'ennemis est **une règle originale de jeu dérivée des unités V6**, pas un ordre de bataille canonique du film Predator. Les planètes restent séparées de la Terre WGS84 ; aucune ville terrestre n'est placée sur une planète extraterrestre.

## Sauvegarde et preuves

Le format V115 `version:1` est maintenu. Les anciens champs `guardY`, `rivalRosterIds` et `wavesIssued` sont facultatifs ; les nouveaux profils et limites sont validés à la lecture. Aucun compte de campagne V85, achat ou annexion automatique. La CI `.github/workflows/clan-war-v140.yml` passe `tests/clan-war-four-modes-v140.test.mjs` et toutes les régressions V115–V139, TypeScript et ESLint. L'Excel V140 sera ajouté une fois les régressions validées, sans confondre « CI ciblée » et « contenu finalisé ».

**Manques ouverts :** 1 200 niveaux jouables, véritables décors 1:1 des films et comics, guerre totale multi-régions, armées/garnisons persistantes V85, serveur multijoueur, QA navigateur/mobile/gamepad et animations de PNJ. Aucun statut de canon 1:1 n'est attribué à ces nouveaux algorithmes.
