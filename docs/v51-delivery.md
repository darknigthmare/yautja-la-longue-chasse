# V51 — THE PIT : entrées et fins de manche

## Comportement livré

Un duel commence après le chargement des visuels par deux entrées successives (1,2 seconde chacune), puis un compte à rebours 3–2–1 et le signal COMBAT. Avant ce signal, ni le chronomètre, ni les combattants, ni le CPU, ni le lecteur de replay ne progressent. Les entrées maintenues sont désarmées ; une nouvelle pression est nécessaire. La pause, la perte de visibilité et le chargement suspendent la présentation.

La fin de chaque manche montre les deux combattants et leurs résultats dans un habillage transparent. Le délai historique de transition est conservé ; la manche suivante reçoit son compte à rebours. La fin du match garde les poses visibles avant le dialogue de résultat. Les écritures de progression restent immédiates et conservent leurs accusés de sauvegarde. Le laboratoire garde son horloge exacte et son démarrage sans cinématique.

La présentation est séparée du moteur déterministe et des ticks de replay. Un match miroir est départagé par les scores/santés des côtés, et non par le seul identifiant partagé des deux combattants.

La caméra fixe conserve les animations des personnages : elle ne fige que le cadrage. Seule la préférence système de réduction des mouvements tient les poses de cérémonie.

La reprise protège aussi la sortie du Homeworld vers la formation : les visites dont la sauvegarde a échoué doivent être réenregistrées explicitement avant de quitter la cité. Le détail des autres chantiers encore ouverts figure dans `docs/v51-backlog-audit.md`.

## Dessins et limites

Quatre PNG OpenAI originaux sont intégrés pour l’apparence fournie Jungle Hunter avec casque (`jungle-hunter-avec-casque-53f4eb349a`). Ils fournissent six clips orientés : entrée, victoire et défaite, trois poses par séquence et par côté. Seize dessins distincts sont utilisés ; deux références neutres sont réutilisées pour le début des défaites. Les lames sont volontairement rétractées pendant la victoire. Les genoux, pieds et paumes ancrent les défaites au sol, pas les pointes des lames.

Les autres apparences emploient leurs dessins d’attente disponibles ou une mise en scène de leur bitmap exact. Cette mise en scène ne constitue pas une nouvelle animation articulée propre à chaque personnage. Le registre n’emprunte aucune animation à un autre costume. Les dessins Wolf présentant des changements incohérents de main et les premières victoires aux lames inversées ont été rejetés.

Les sources restent inchangées, les découpes/pivots sont des métadonnées, et les deux orientations utilisent des dessins distincts sans miroir à l’exécution. Fidélité canonique 1:1, anatomie fine certifiée, animation complète du roster et cycles complets de marche ne sont pas revendiqués. Les tests manette/tactile sont émulés, sans certification console ou matériel physique.

Prompts et rejets : `docs/v51-openai-prompts.json`.
Mesures et provenance : `docs/art/v51/jungle-hunter-round-presentation-provenance.json`.

## Vérification

Compilation, vérification TypeScript et lint réussis (un avertissement historique). Les 1 612 tests passent sans échec ni exclusion. Trente-neuf contrôles navigateur distincts passent sur le build final : dix pour le cycle de combat et le replay, huit pour les six clips et les préférences de mouvement, trois formats de compte à rebours, quatre pour la récupération Homeworld, quatorze régressions HUD/caméra/laboratoire. Le contrôle mobile présent dans deux rapports est compté une seule fois.

Les quatre PNG servis localement sont identiques aux sources, dimensions et SHA-256 vérifiés. Les limites des contrôles émulés, de la perte de focus et de la faute de stockage simulée figurent dans `docs/v51-validation.json`. La qualification publique et le commit effectivement déployé sont enregistrés après publication dans `outputs/qa-commercial-audit/v51/publication-verified.json`.
