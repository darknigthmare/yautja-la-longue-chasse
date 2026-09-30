# V56 — trois identités fournies pour THE PIT

Trois combattants distincts sont raccordés au roster courant de **198 identités**, sans transformer les onze compagnons du pack en combattants supplémentaires :

| Identité exacte | ID runtime | Profil de duel créé pour le jeu | Cadre d’exposition |
|---|---|---|---|
| Arid Ermit Yautja | `original-arid-ermit-yautja` | Déplacement vif, allonge moyenne, riposte de contact | Cercle Ambre, arène 87 |
| Yautja Mutated | `original-mutated-yautja` | Santé supérieure, déplacement plus lent, percussion corporelle | Cercle Sang, arène 85 |
| Amengi female | `guest-amengi-female` | Allonge insectoïde, balayage bas lent et punissable | Cercle Obsidienne, arène 81 |

Les deux Yautja sont des créations originales fournies. « Amengi female » reprend l’intitulé utilisateur ; son design et son identité individuelle ne sont pas certifiés canoniques. Aucune origine, cause de mutation, planète, captivité ou biographie n’est déduite des images. Les trois recommandations sont des lieux originaux déjà jouables, pas des scènes attribuées à leur lore.

## Images réellement livrées

Les originaux du RAR sont conservés, octet pour octet, dans `public/game/user-pack/v56/source/`. Leurs SHA-256 sont vérifiés par le script d’import et par les tests. Trois PNG détourés par l’outil OpenAI intégré sont livrés dans `public/game/user-pack/v56/cutouts/` : `arid-ermit-yautja.png`, `mutated-yautja.png` et `amengi-female.png`.

Les trois images ont été inspectées individuellement et sur un fond de contrôle montrant leur véritable alpha. Le premier essai du mutant a été rejeté pour dérive des couleurs, des mains et du cadrage. Le deuxième conserve mieux la pose, les détails et les couleurs de la référence. Aucun détourage génératif n’est annoncé identique pixel par pixel à son original.

Les PNG natifs restent inchangés après génération : pas de découpe, recoloration ou alpha recalculé. Les seules dérivations sont les petites icônes WebP de sélection et les images sur fond de contrôle, non utilisées en production. Le manifeste `app/game/data/pitOriginalFighterArtV56.json` raccorde ces vrais bitmaps au rendu de combat et aux portraits. Les icônes sont chargées dans la grille ; l’adversaire de droite utilise le miroir de la pose droite fournie, sans prétendre disposer d’une seconde pose dessinée.

Les reçus, prompts, SHA-256, dimensions, limites alpha et pivots sont dans `v56-original-fighter-cutout-provenance.json` et `v56-original-fighter-cutout-prompts.json`. La ligne d’appui est mesurée avec le même seuil alpha que le moteur. La pose trois-quarts fournie conserve une différence de profondeur entre les pieds ; elle n’est pas présentée comme une animation latérale spécialement dessinée.

## Jeu et limites

Les coups et la technique de chacun sont différents et sont exécutés par la simulation, avec hitboxes, garde, dégâts, fenêtres de récupération et transitions de round. Les trois profils ne sont pas des copies renommées de Jungle Hunter. La riposte intercepte une frappe, la percussion avance son propriétaire et le balayage de l’Amengi passe la garde haute mais reste bloqué par la garde basse.

Aucun équipement de camouflage n’étant fourni, ces trois profils ne l’activent pas et ne dépensent pas de jauge pour une demande de camouflage. Aucun projectile, canon, drone ou pouvoir biologique n’est ajouté. Duel contre IA, duel local et entraînement sont disponibles ; Arcade, Circuit et Descente restent indisponibles. Les douze identités de progression de la première édition ne changent pas. Aucune rencontre, espèce de campagne, fiche découverte, récompense ou sauvegarde de chasse n’est ajoutée automatiquement.

**Chaque personnage dispose d’une seule pose fixe. Aucun clip natif de marche, d’attaque, d’introduction ou de victoire n’a été produit dans ce lot.** Les transformations et déplacements de simulation existants ne sont pas comptés comme des dessins supplémentaires. Le texte de leur profil expose cette limite.

## Vérification

`tests/pit-original-fighters-v56.test.mjs` passe ses **12 tests**, dont six duels complets : chaque nouveau personnage gagne depuis chacun des deux côtés, franchit les rounds, puis son replay restitue exactement l’état final. Les tests contrôlent aussi les vrais octets des sources et détourages, l’alpha natif, l’appui, le miroir, les limites de caméra, les icônes, les profils, les trois types de contact et l’absence de camouflage.

Les tests V54 de couverture, V55 de pipeline, V44 de variantes et d’extension de roster restent passants avec ce raccordement. Le plan et les preuves visuelles V55 gardent leurs **195 associations historiques** ; les trois associations suivantes sont isolées dans `pitOriginalStagesV56.ts`. La couverture courante contient 198 entrées.

Les assertions d’icônes et de bitmaps historiques ont été adaptées aux trois ajouts, en conservant leurs identités antérieures : 17 tests supplémentaires passent. Le lint ciblé des fichiers modifiés et des deux recettes navigateur passe.

La recette `scripts/verify-pit-original-fighters-v56.mjs` passe sur le build V56 local à `http://127.0.0.1:4175`. Elle exécute trois vrais duels avec commandes clavier, en croisant les trois profils dans les deux positions. Elle observe les bitmaps effectivement dessinés, leur miroir, les deux introductions et le compte 3–2–1, les dégâts réels, le recul des joueurs, le dézoom de caméra et la pause. Les contacts alpha au sol restent à moins de 0,006 pixel logique du plan d’appui. Dans le duel mobile, Amengi gagne 367 points ; une pression réelle sur H conserve ces 367 points et n’active aucun camouflage.

Les 19 captures de cette recette ont été ouvertes et inspectées : portraits, exhibitions, introductions, combat, recul de caméra et ressource de l’Amengi. Aucun bitmap manquant, erreur JavaScript, erreur HTTP ou changement de sauvegarde n’a été relevé. L’affichage 844 × 390 est une émulation Chromium, pas un essai sur téléphone physique. Le libellé global « chasseurs » et les poses trois-quarts restent des limites de présentation explicitement relevées ; ils ne certifient ni canon ni nouvelles animations. Rapport brut : `work-local/v56/original-fighters-browser-qa/report.json` ; revue : `docs/v56-original-fighters-browser-visual-review.json`.

Cette recette ne signifie pas que les 198 combattants ont chacun disputé un match dans l’application. La compilation globale, la recette générale des nouvelles arènes et la publication restent des contrôles distincts pris en charge par la tâche principale.
