# Reprise des pilotes Gauntlet après le commandement diégétique

Les deux recettes conservées passent leurs contrôles d’origine : 7 pour la campagne et 6 pour le vrai panneau de guerre. L’armurerie et les vues se trouvent désormais dans Projection ; la fixture sélectionne aussi une planète via Théâtres au démarrage. Les pilotes empruntent ces vrais modaux par clic et Échap. Ils conservent leurs assertions de sauvegarde, d’identité de l’atlas, de tour unique et de préférence non autoritaire.

`final-receipt.json` épingle les recettes, sorties et six captures originales inspectées. Les sources applicatives (1 293 fichiers) sont identiques avant/après et à celles du build disponible ; les parcours restent des fixtures de composants compilées par esbuild, sans preuve de navigation complète dans Next/GameClient.

Les échecs initiaux et la préparation sparse exacte sont conservés dans les dossiers frères. Aucun manifeste manquant n’a été prouvé pour ce workflow ; il reste inchangé. La vérification distante doit encore rejouer ces pilotes sur la nouvelle révision.

Rejouer depuis la racine en choisissant des dossiers de sortie neufs :

```bash
AUDIT_CHROME_EXECUTABLE=/usr/bin/chromium GAUNTLET_CAMPAIGN_OUTPUT=outputs/gauntlet-campaign-replay-1 node scripts/qa-gauntlet-campaign-v144.mjs
AUDIT_CHROME_EXECUTABLE=/usr/bin/chromium REAL_WAR_PANEL_OUTPUT=outputs/real-war-replay-1 node scripts/qa-real-clan-war-v143.mjs
```
