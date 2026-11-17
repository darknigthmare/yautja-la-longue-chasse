# Changelog — AVP:R Wolf v0.5.0-candidate.1

## Gameplay Predator

- Ajout d'une **esquive** sur `Shift` : courte impulsion, invulnérabilité limitée, coût d'énergie et cooldown.
- Ajout d'une **parade** sur `Q` avec les armes de mêlée : une parade correctement calée annule le coup, étourdit la cible et est comptabilisée dans le bilan de chasse.
- IA xénomorphe renforcée : poursuite multi-plans, changement de profondeur plus agressif et **pounces** à moyenne portée.
- Le cloak réduit fortement la portée de détection des xénomorphes ; le Predalien conserve une capacité de détection supérieure à courte/moyenne portée.
- Les xénomorphes tués laissent désormais des **mares de sang acide persistantes**. Wolf subit des dégâts s'il reste au sol dessus ; le Cleaner Fluid ne crée pas cette mare lorsqu'il dissout directement une cible.
- Le pistage `T` produit maintenant un pulse de biomask visible qui révèle temporairement les signatures et la direction d'une trace.
- 18 zones post-centrale utilisent une passe **blackout** avec visibilité réduite autour de Wolf, les modes de vision restant utilisables tant que le biomask est porté.

## Duel final Wolf / Predalien

Le boss n'est plus seulement une barre de points de vie :

1. Phase de chasse armée.
2. Endommagement du wrist gauntlet.
3. Retrait volontaire de l'équipement restant et du biomask.
4. Corps-à-corps verrouillé aux Wrist Blades.
5. **Lutte finale interactive** : alterner `F` et `E` pour reproduire l'échange mortel.
6. Wrist Blades et dard caudal frappent presque simultanément ; l'issue canonique reste verrouillée avant la frappe nucléaire.

Le joueur peut mal exécuter la lutte finale, mais il ne peut pas produire une branche où Wolf ou le Predalien s'échappe de Gunnison.

## Animation / présentation

- Nouvelle cinquième sprite-sheet : `facehugger-sprite-sheet.svg`, 24 frames (6×4), avec idle, déplacement, bond et hurt/death.
- Le runtime utilise cette planche pour les Facehuggers avec fallback procédural si son chargement échoue.
- After-image pendant l'esquive et arc visuel pendant la fenêtre de parade.
- Nouveaux effets de tracking et de sang acide au sol.
- HUD enrichi avec état de menace et posture (`CHASSE`, `CLOAK`, `PARADE`, `ESQUIVE`, `GRAPPLE`).
- Cinq nouvelles prévisualisations statiques v0.5 : égouts/acide, hôpital blackout, Facehuggers, magasin et duel final.
- Nouvelle couche **SFX procédurale WebAudio originale** : plasma, lames, shuriken, mines, Cleaner Fluid, scan, parade, esquive, dégâts, grapple et Medicomp ; aucun audio du film n'est repris.
- Bouton `AUDIO: ON/OFF` et raccourci `K` pour couper/rétablir les effets.

## Sauvegarde

- Nouvelle clé : `tantalus.avpr.wolf.v05`.
- Migration automatique des sauvegardes `v04`, puis `v03`.
- Les statistiques de combat v0.5 sont ajoutées sans écraser la progression : parades, esquives, contacts acides et pounces évités.

## QA

- Validateur structurel : vert.
- Runtime smoke : vert, y compris déclenchement de la lutte finale.
- **34 tests ciblés** : verts.
- Simulation complète **Cinéma : 45/45 zones, 16/16 preuves, 45/45 sync**.
- Simulation complète **Unrated : 47/47 zones, 16/16 preuves, 47/47 sync**.
- Installateur exécuté deux fois : un seul bouton et un seul bloc d'installation.
- Désinstallation : bouton, marqueurs et dossier DLC supprimés.
- Chromium du conteneur continue de bloquer même en headless avec timeout ; aucune capture navigateur v0.5 n'est donc présentée comme certifiée. Les images v0.5 sont explicitement des prévisualisations statiques.
