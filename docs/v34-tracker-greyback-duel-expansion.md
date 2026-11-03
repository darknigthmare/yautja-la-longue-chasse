# THE PIT — extension Tracker / Greyback V34

Deux profils de duel séparés de la première édition : Tracker (Predators, présentation V5) et Greyback ancien démasqué de Predator 2, pistolet à silex en main gauche. Greyback n’est ni Golden Angel jeune ni l’Elder AVP. Les présentations du projet sont des références fan-made, non des répliques cinéma certifiées 1:1.

31 PNG OpenAI conservés : 15 Tracker et 16 Greyback. 16 feuilles retenues, 119 dessins, 56 clips moteur (les trois phases d’une attaque comptent séparément), 32 séquences incluant leurs orientations. Cela ne constitue pas deux movesets entièrement animés. Marche avant, saut/réception, contre technique, gardes basses, attaques aériennes/accroupies et autres états sans clip gardent une pose idle tenue. Aucune animation inverse n’est obtenue par miroir. Les feuilles rejetées restent archivées ; les deux planches de saut sont en revue seulement.

Sélection possible en Duel CPU, Versus local et Entraînement. Les 12 anciens personnages et leurs tables Arcade/Circuit/Descente sont inchangés. Les nouvelles chroniques n’existent pas : leurs boutons de progression sont indisponibles, sans réutiliser la chronique d’un autre chasseur. Les duels d’extension n’enregistrent pas de statistiques de progression ; le replay reste disponible dans la session et un bouton permet d’exporter son JSON à la fin du combat.

Tracker possède ses propres valeurs et un contre au gantelet ; aucun chien ni ordre de meute n’est simulé. Greyback utilise poing, pied, épaule et riposte ; pistolet et canon d’épaule restent inactifs. Ces mécaniques sont des adaptations de jeu déclarées.

Validation : 238 captures natives du véritable loader/renderer, fonds clair et sombre ; 28 contrôles clavier PitCanvas pour phases d’attaque, recul, garde, accroupissement, vues et fallback ; 8 contrôles de parcours dont un match complet de 2 093 ticks, export et relecture du replay, panne d’atlas et avis d’image manquante. Les portraits ont également passé le contrôle de cadre desktop/mobile. Aucune erreur navigateur ni frontière coupée constatée. Clé magenta explicite, originaux inchangés ; quelques pixels de frange fins persistent, sans large halo opaque constaté à taille native.

56 tests ciblés, typecheck et lint ont passé avant la fusion des arènes. Le fichier `art-source/v34/pit/tracker-greyback-runtime-qa-v34.json` contient les contrôles publiables ; les captures et reçus complets sont conservés dans le dossier de travail privé. Ces preuves ne prétendent pas remplacer une validation du paquet final après fusion.
