# V50 — Écrans de jeu et mouvement des chasseurs

## Périmètre

- Accueil de campagne plein écran : décor existant du clan, navigation, reprise contextualisée et création dans la nurserie. Le menu du vaisseau adulte reste distinct.
- Les cinq campagnes, leurs dix sauvegardes manuelles et deux automatiques, les propriétaires et protections contre l'écrasement restent conservés.
- Sélection THE PIT plein écran : deux portraits opposés, roster paginé avec icônes et variantes, puis sélection du stage et aperçu réel des plans.
- Options, catalogue et parcours dans un dialogue natif ; retour Échap/B, ouverture Start, commandes neutralisées à chaque changement de contexte.
- Effacement du message d'interaction du hub lors de l'entrée dans THE PIT, avant la lecture de ses archives : une nouvelle erreur de stockage n'est pas supprimée.

## Images OpenAI

Le lot de six candidats est Ahab, Wolf, Falconer, Scarface, Enforcer et Celtic, pour leurs variantes masquées fournies. Il s'agit de poses de déplacement aérien et, pour Ahab, d'accroupissement, pas de cycles de marche terminés. Les premières marches Ahab/City Hunter et la première arme de Scarface ont été écartées après contrôle. City Hunter reste manquant : la génération du saut a été refusée par le service en sortie ; aucune relance visant à contourner ce refus.

Mode : outil Imagegen intégré, aucune API payante. Les références fournies ont été inspectées, puis décrites dans les prompts : leur téléchargement direct dans l'outil a échoué au niveau du sandbox. Les résultats sont des adaptations, sans certification de fidélité 1:1. Les différences de costume et d'équipement sont consignées dans la revue artistique. Les PNG acceptés sont copiés sans altération ; les cadres et pivots sont définis dans le moteur, sans miroir des dessins.

Les prompts exacts, y compris les essais écartés et le refus, sont dans [v50-openai-prompts.json](v50-openai-prompts.json). Bilan accepté : six PNG, 48 dessins dans les sources, 46 utilisés et deux réceptions Ahab réservées ; 38 clips orientés ajoutés. Le registre complet compte désormais 627 dessins distincts et 315 clips prêts, sans annoncer de bibliothèque complète.

## Validation de livraison

Compilation, TypeScript et lint validés (un avertissement préexistant), 1 582 tests réussis, 54 contrôles navigateur distincts réussis. Les résultats et rapports sont indexés dans [v50-validation.json](v50-validation.json). Les relectures ne sont pas additionnées au compte distinct. La preuve de publication, produite après le push, est conservée séparément dans outputs/qa-commercial-audit/v50/publication-verified.json. Les contrôles navigateur utilisent Chrome et des périphériques émulés ; ils ne constituent pas une certification sur une console ou une manette physique. Aucune nouvelle version Windows empaquetée n'est annoncée.
