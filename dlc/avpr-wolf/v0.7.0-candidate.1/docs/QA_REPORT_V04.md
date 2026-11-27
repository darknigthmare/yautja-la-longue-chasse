# QA — AVP:R WOLF v0.4.0-candidate.1

## Résultats automatisés
- Validation contenu : OK.
- 47 zones uniques, transitions valides, 14 chapitres, 8 familles d’armes.
- 2 zones Unrated et 9 raccords reconstruits explicitement étiquetés.
- 4 sprite-sheets présentes et embarquées dans le standalone.
- Runtime VM : OK.
- 15 tests de gameplay ciblés : OK.
- Installateur : deux installations successives = un seul bouton ; désinstallation = suppression du bouton + dossier DLC.

## Tests de gameplay couverts
1. Le montage cinéma saute `wreck_biomask` et poursuit sur `wreck_trace`.
2. Les deux plasmacasters deviennent le Plasma Pistol au magasin.
3. Cleaner Fluid nettoie et incrémente correctement les preuves.
4. Hôpital : première phase des guerriers, puis dernière cible au Cleaner Fluid.
5. Cage d’ascenseur : Plasma Pistol perdu, retour Wrist Blades.
6. Duel : gauntlet endommagé, retrait volontaire du masque, retrait de l’équipement, verrouillage corps-à-corps.

## QA visuel
Le binaire Chromium de ce conteneur ne termine pas même une capture de `about:blank` (timeout), donc aucune capture navigateur v0.4 n’est présentée comme certifiée. Quatre prévisualisations statiques v0.4 et quatre planches de sprite sont fournies pour inspection graphique. Les huit captures Chromium de la v0.3 restent présentes uniquement comme historique.
