# V149 — Précontrôle global de cohérence avant exploitation du monde

Le dernier générateur possède maintenant six rayons, 120 formes, 48 matières complémentaires, dix surfaces possibles, l'édition régionale, l'environnement idéalisé V146, la carte du monde réel V147 et des lieux de films sourcés V148. Les tests automatiques historiques sont nombreux mais aucune **commande de contrôle globale visible** ne permettait encore de diagnostiquer une planète déjà tirée au hasard.

## Vérifications réellement exécutées
- Identification unique des régions, masses, territoires et sites. Région contenant au moins trois cellules ; appartenance unique de chaque cellule à une région et à une masse terrestre.
- Coordonnées et sommets valides, site présent pour chaque cellule et ensemble de routes jouables **bidirectionnelles, sans référence étrangère ni îlots inaccessibles**.
- Routes de la recette, longueurs angulaires et quartiers généraux cohérents avec le monde affiché.
- Bassins et cours intérieurs rattachés à de vraies régions et masses terrestres, avec superficie intérieure plausible.
- Sur V115, fermeture du budget terres, milieux intérieurs et surface extérieure V136.
- Si un kit régional est actuellement appliqué, vérification des sources contre les biomes et le code exact du monde selon le lecteur strict V128.
- Avertissements facultatifs V146 pour les combinaisons de biomes exotiques nécessitant une explication, sans réécriture automatique des climats.

## Interface
Un panneau « Vérifier l'intégrité de cette planète » est disponible dans le dossier du monde, avant le dossier environnemental et l'atlas de la Terre. Le bilan annonce **anomalies structurelles** et **avertissements à documenter** séparément ; le bouton JSON exporte la liste exacte. Il ne touche jamais à la sauvegarde ni ne bloque le bouton de génération : il s'agit d'une inspection d'auteur, pas d'une migration automatique.

## Critères de validation et limites
Les tests V149 exercent des mondes V115 authentiques sur les six tailles, des fichiers corrompus construits volontairement pour déclencher les erreurs, des matières provenant d'un autre monde et des situations de climat extrême. La comparaison de JSON confirme l'absence de modifications de l'objet monde.

L'absence d'erreur structurelle ne prouve **pas** la fidélité cinéma/PHG 1:1, l'absence de collision à une échelle métrique, l'habitabilité d'une planète, la validation GPS d'une ville ou la jouabilité sur toutes les plateformes. Les océans extraterrestres de sable/cristal/spores demeurent des milieux distincts.
