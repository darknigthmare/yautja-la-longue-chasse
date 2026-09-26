# V53 — La petite Fosse de jeunesse

## Chapitre livré

Depuis le retour de patrouille V52, le joueur choisit de découvrir la petite Fosse. La scène comporte une entrée de proximité, l’arrivée animée des deux novices, un compte à rebours 3/2/1, un duel non létal, une défaite avec reprise, une victoire affichée, le retrait physique d’un insigne cosmétique puis la sortie vers la cité. Les murs et le toit de la cage sont solides. La lame reçue au dojo est interdite dans cette adaptation du duel ; poings, esquive et projection restent utilisables.

Le rival est un Unblooded original distinct du maître et du joueur. Son anticipation annonce le coup, qui peut être évité. La présentation et le compte à rebours refusent les coups ; une commande maintenue au signal doit être relâchée avant la reprise. La pause, le changement de page, les images manquantes et une écriture de sauvegarde en attente gèlent la simulation. L’échec conserve les preuves antérieures et reprend la présentation complète, sans insigne offert.

Quatre preuves `youth.cage.v53` / `unblooded-cage` portent le total jeunesse à vingt. L’insigne est acquis une fois, sauvegardé avec son reçu, porté sur la tenue dans la scène et mentionné au bilan d’équipement. Il n’a aucun bonus. Aucun honneur, XP, inventaire adulte, rite, rang, vaisseau ou progression PIT adulte ne change. Les anciennes sauvegardes sans champ `cage` restent acceptées ; leurs fins V48/V49/V52 ne démarrent rien seules. Chaque phase de cage inachevée reprend sa scène ; la fin retourne au Homeworld.

## Source attestée et adaptation

Source locale : `work/v36/new-world-specs/youth-thread-page-1.json`, tour utilisateur `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2`. La demande prévoit un PIT secondaire après le premier sommeil, dans un quartier pauvre, avec des combats contre récompenses. Elle décrit la première Fosse comme une petite arène avec des grillages aux murs et au toit. Le dojo demeure la première arène d’entraînement.

La source ne donne pas de dialogue exact, de règlement précis ni de valeur de récompense pour ce premier combat. Le texte, le rival, le duel non létal sans lame et l’insigne sont une **adaptation originale du projet**, annoncée dans le briefing. Aucun dialogue attesté précédent n’est réécrit. Le raccord après la patrouille V52 est un ordre de livraison explicite et protège les checkpoints existants ; il ne prétend pas reproduire une scène canon de film ou de comic. Aucune nouvelle conversation privée inaccessible n’est inventée.

## Dessins et modularité

Six PNG OpenAI copiés byte pour byte : fond, structure grillagée murs/toit, sol et entrée, planche du novice à droite, planche du novice à gauche, insigne. Les trois plans de décor sont indépendants. Le joueur garde ses dessins natifs V48. Les sources n’ont subi aucun miroir, recoloration, détourage ou retouche de pixels ; seules les régions de lecture et les positions au rendu sont mesurées.

Le novice possède **seize dessins natifs**, huit par orientation : garde, marche, saut, anticipation, coup de poing, recul, projection subie, KO. Cela ne constitue pas seize cycles complets : la marche alterne garde/marche, et les autres poses sont tenues pendant leur phase. Les pivots restent au sol. La structure a été recadrée au rendu pour aligner la grille et son toit avec les collisions ; elle n’est pas une grande pièce vide. L’insigne est un accessoire bitmap séparé.

Provenance, dimensions, SHA256, source utilisateur et limites : `docs/art/v53/youth-cage-provenance.json`. Prompts exacts : `docs/v53-openai-prompts.json`.

## Vérifications

- 8 tests moteur/persistance du chapitre : parcours joué par entrées, départ volontaire ancien checkpoint, ordre des quatre preuves, échec/reprise, gel de phase, lâcher des commandes, murs/toit, lame interdite, reprise tous les 23 ticks, récompense unique et refus de données incohérentes.
- 4 tests de sauvegarde supplémentaires : quota et perte silencieuse sur chacun des quatre jalons, écriture réussie avant exception, concurrence même/autre propriétaire, restauration des neuf phases via les sauvegardes de partie.
- 4 tests art/rendu : six fichiers exacts, seize régions non vides distinctes avec marges, deux orientations natives sans miroir, grille/sol/fond distincts, insigne gagné, absence de maître adulte en guise d’adversaire, refus de couche ou pose invalide.
- 92 tests combinés jeunesse/sauvegardes/art antérieur/Fosse passent ; les 12 tests de patrouille V52 et les 4 tests art Fosse passent aussi. TypeScript sans émission : PASS. Aucune preuve ne vient d’une injection de coordonnées ou de santé dans les tests de parcours.
- Recette navigateur `scripts/verify-youth-cage-v53.mjs` préparée : archive V52 réellement jouée, déplacement clavier au mentor, départ explicite, présentation/compte à rebours, pause/sauvegarde/rechargement en duel, défaite passive, reprise, victoire, récompense unique et retour durable cité. **6/6 PASS sur le build commun local**, zéro erreur JavaScript/HTTP. Captures duel, compte à rebours, défaite, victoire et insigne inspectées : murs/toit lisibles, sol aligné, novice distinct, HUD et boutons accessibles. Rapport `outputs/qa-commercial-audit/v53/youth/cage-browser-qa/report.json`. Navigateur fermé.
- Recette `scripts/verify-youth-cage-touch-v53.mjs` : **8/8 PASS**, 390×844 et 640×360. Gestes tactiles de recul, saut, pause, réessai et retour, combat gagnant joué au clavier ; cibles ≥44 px non occultées, pas de débordement horizontal, focus piégé puis rendu au canvas, vingt preuves conservées. Huit captures inspectées. La première assertion avançait dans le rival proche du checkpoint ; la recette teste désormais un recul libre, sans modifier le jeu. Rapport `outputs/qa-commercial-audit/v53/youth/cage-touch-layout-browser-qa/report.json`. Navigateur fermé ; aucun rebuild requis.
- Sonde image absente/réessai préparée séparément par l’agent QA : `scripts/verify-youth-cage-assets-v53.mjs`.

## Limites

Il s’agit du premier petit combat secondaire de jeunesse, pas de la campagne commerciale entière ni d’un rite adulte. Les rites de chasse autonome et le passage Blooded restent distincts. Le décor a trois plans bitmap séparés, sans promettre une nouvelle caméra de parallaxe complète. L’introduction et les résultats exploitent les dessins disponibles ; ils ne sont pas des cinématiques longues. Le contrôle des sauvegardes locales vérifie cohérence et chronologie, sans prétendre fournir une protection anti-triche serveur. La qualification locale du chapitre compte quatorze contrôles navigateur réussis. Elle ne prouve pas encore la version publique ; la publication doit être qualifiée séparément.
