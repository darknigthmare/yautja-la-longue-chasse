# Lecture visuelle du rendu V28

Contrôle automatisé final : **850 vérifications réussies** sur le manifeste 554282574e5868945c6444516c711ea414ca9c3d6d83b4f2da54b8eb3d068068. Le détail est dans browser-qa.json.

Les captures Chrome des quatre planches humaines, de Tracker et du mode clair Fugitive ont été regardées. Silhouettes complètes, armes rattachées et espèces correctement distinguées. Le canon unique de Tracker est visible ; aucune seconde ouverture inférieure n’apparaît sur la capture retenue.

Réserve de finition : un léger reste de magenta/violet se voit surtout autour du fusil et de la sangle de Machiko Ryushi. Les doigts fins, la fidélité des visages et toutes les transitions physiques ne sont pas certifiés. Sur mobile390, aucun débordement horizontal, mais la page de revue est longue et demande un défilement vertical.

Les tests de lecture ponctuelle/répétition et du clavier sont réellement exécutés sur Fugitive. Les66poses de chacune des deux versions sont rendues individuellement ; cela ne signifie pas une validation manuelle des11animations complètes. Six hashes distincts ne suffisent pas à prouver un bon mouvement.

Régressions vérifiées : Source affiche0pixels traités par clé/liseré ; Clé simple affiche0liseré actif. Le PNG Fugitive est volontairement refusé après une feuille Tracker réussie : les anciens SHA, étape et compteur disparaissent pendant le chargement et restent absents sous l’erreur. Les contrôles de lecture se désactivent, puis le chargement réussi reprend. Cette panne volontaire est séparée des erreurs spontanées : aucune pageerror ni erreurconsole imprévue.

Retour au laboratoire : masqué dansfile://, visible enHTTP. Les deux modes produisent les mêmes66hashes d’images.

Une ancienne capture d’échec, prise avant le gel des sorties pendant un passage dépassé, est conservée séparément sous superseded-pre-freeze-http-failure.png. Elle ne représente pas le résultat final.

Aucun code, manifeste ou bitmap modifié par ce sous-lot ; aucun déploiement. Statut : atelier fonctionnel pour revue, avec réserves artistiques, pas personnage complet ni fidélité1:1.
