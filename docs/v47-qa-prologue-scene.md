# V47 — Nurserie : scène, commandes et présentation

Deux angles de revue simulée ont été appliqués à la scène : joueur de duel attentif aux fenêtres de commande, et utilisateur clavier/tactile avec besoins d’accessibilité. Il ne s’agit pas de testeurs humains externes ni d’une certification d’accessibilité.

## Fonctionnement livré

La scène lit uniquement le moteur pur `nurseryPrologue.ts`. Le menu de campagne, la propriété des slots, l’enregistrement et la preuve de fin restent contrôlés par GameClient. La scène ne remet aucun prix par bouton : `onComplete` reçoit exclusivement le reçu émis après le vrai duel, le plan village, la lune et le titre. Un échec de stockage conserve le reçu pour réessayer une transaction idempotente. Les checkpoints n’enregistrent jamais prématurément l’état `complete`.

Le chargement attend les huit PNG réellement décodés, les deux orientations natives de chacun des deux Younglings, chaque pose utilisée, les cellules et les ancrages valides. Les orientations partagées par un fichier, les rectangles hors image, la duplication d’une unique cellule présentée comme animation et les sources adultes sont refusés. Il n’existe aucun fallback en silhouette CSS, ni rig adulte réduit, ni miroir de costume.

Le clavier réemploie les remappages J1 de THE PIT : déplacement, attaque légère, attaque moyenne, technique, projection et ressource. Une touche de jeu peut confirmer le noir initial ; Entrée / A confirme ensuite le geste Prêt. Le maintien continu dure deux secondes et s’annule au relâchement. Une option explicite permet la pression simple. Les commandes de manette standard et les boutons tactiles suivent le même modèle abstrait.

La lame séparée est dessinée une fois, couchée au sol ou à l’ancrage de la main du détenteur. Son vrai manche (92 % de la hauteur du PNG inspecté) coïncide avec cet ancrage : le personnage ne tient plus le fil de la lame. L’échantillonnage du geste Prêt dépend du vrai maintien et non du temps global. Les actions non bouclées conservent leur dernier dessin. Les coups, projections, résistance interne et KO viennent du moteur, jamais de l’image. Aucun compteur de résistance ou de vie n’est affiché.

La pause, la perte de focus, l’onglet masqué et une manette déconnectée figent le jeu et demandent de relâcher les commandes. Une touche physiquement tenue après reprise ou un stick maintenu n’offre aucun départ anticipé au CPU. Une erreur de checkpoint arrête aussi la scène au lieu de continuer silencieusement sans sauvegarde. Le dialogue de pause garde le focus clavier, défile dans son cadre et rétablit le focus Canvas à la reprise.

La réduction des mouvements supprime le flou et les déplacements caméra de révélation. Les cibles tactiles mesurent au moins 44 px ; c’est une amélioration ergonomique, pas une déclaration générale de conformité normative. Une reprise est refusée tant que le checkpoint ne peut pas être relu et confirmé durablement. Les réglages globaux ne déclenchent aucun second dialogue de pause qui détournerait leur focus. La foule d’arrivée est une courte texture procédurale originale, pas une voix enregistrée de la franchise. Elle est déclenchée par la phase d’arrivée et stoppée par pause/mute/dispose. Les impacts et le ramassage utilisent le moteur sonore existant. Le volume maître et celui des effets sont respectés.

## Vérifications exécutées

- `node --test tests/nursery-presentation-v47.test.mjs` : **14/14 PASS**.
- ESLint ciblé scène, rendu, audio et commandes : **PASS, aucune erreur ni avertissement**.
- TypeScript avec manifeste final et huit PNG livrés : **PASS**.
- Recette navigateur préparée : `scripts/verify-nursery-scene-v47.mjs` depuis Nouvelle partie, maintien interrompu, reprise avec touche tenue, duel gagné aux commandes clavier réelles, KO, village, lune, titre. Aucune injection des caractéristiques ou du résultat du combat.
- Première recette navigateur compilée : **6/6 PASS**, sans erreur JavaScript ni HTTP, dans `work/v47/nursery-scene-browser-qa/report.json`. La victoire a été jouée avec les commandes clavier Playwright ; aucune résistance, caractéristique, phase ni victoire n’a été injectée. La partie produite est conservée uniquement dans `work/v47/nursery-scene-browser-qa/played-campaign-storage.json` pour prolonger la recette du chapitre suivant.
- Les captures noir, geste Prêt, KO, lune/titre et pause tactile ont été inspectées. La recette finale décale les captures de KO et de village pour montrer la pose au sol et le panorama après fondu.
- Build final : **7/7 parcours PASS**, zéro erreur JavaScript/HTTP, dans `work/v47/final-scene-browser-qa/report.json`. Le ramassage de lame est effectué par les commandes tactiles. La manette standard est simulée via l’API navigateur ; aucun matériel physique n’est certifié.
- Le parcours supplémentaire de panne restaure exclusivement le vrai checkpoint `moon-title` sauvegardé lors du duel gagné au clavier. Le quota refuse la fin, aucune sauvegarde ne prétend la nurserie terminée, puis un blur ne masque pas le bouton de réessai. Le réessai après restauration du stockage rejoint le chapitre suivant sans rejouer le duel.
- Revue indépendante novice/accessibilité : quatre défauts confirmés puis corrigés (focus après récupération PNG, pause en quittant le Canvas au clavier, chevauchement à 320 px/texte 200 %, course de focus Reprendre puis blur). **Revalidation finale 14/14 PASS** par le profil indépendant, preuves `work/v47/final-accessibility-browser-qa/`.
- Captures finales inspectées : vrai KO allongé au sol, lame unique couchée avant ramassage, village après fondu, lune/titre, lame ramassée sur mobile, dialogue mobile et erreur de fin avec réessai accessible. Aucun adulte réduit ni silhouette CSS ne remplace les Younglings. Les petites dimensions du jeu en portrait mobile limitent naturellement l’inspection fine des doigts : les ancres sont également vérifiées par la revue d’atlas et les tests de coordonnées.

Les 20 cellules par atlas sont des dessins natifs, pas vingt animations complètes. Des cellules validées peuvent servir à plusieurs poses compatibles ; le manifeste doit documenter ces réemplois. La couverture de cette courte nurserie ne complète pas les movesets adultes de THE PIT.
