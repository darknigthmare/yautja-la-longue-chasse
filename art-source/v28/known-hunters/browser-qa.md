# QA navigateur V28

Contrôle local Chrome réel : aperçu portable file:// et artefacts publics via serveur HTTP éphémère.

- Résultat automatisé : PASS.
- Manifest SHA-256 : 554282574e5868945c6444516c711ea414ca9c3d6d83b4f2da54b8eb3d068068.
- Vérifications : 850 ; échecs : 0.
- Sources attendues : 11 séquences, 66 poses, 8 sujets, 9 variantes, 4 planches humaines et 7 Yautja.
- SHA des PNG publics comparés aux sources ; aucun fichier de production modifié.

- portable : 66 poses, 11 états mobiles ; pageerror=0 ; scénario terminé.
- http : 66 poses, 11 états mobiles ; pageerror=0 ; scénario terminé.

Les hashes distincts établissent que des images différentes sont rendues ; ils ne prouvent pas à eux seuls une animation correcte ou une fidélité 1:1. Les captures attendent aussi une lecture visuelle humaine/modèle. Aucun déploiement ni validation de combat n’est revendiqué.

Un échec réseau PNG est injecté volontairement dans le mode HTTP pour vérifier le nettoyage des anciennes métadonnées et la reprise. Cette erreur attendue est séparée des erreurs spontanées.

Détails et traces : browser-qa.json ; captures PNG dans ce dossier.
