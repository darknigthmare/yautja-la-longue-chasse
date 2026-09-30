# V59 — Feral : actions natives et cohérence du lanceur

Suite du classeur `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx`, sans modifier le fichier fourni. Ce lot traite une partie des cellules `02_PERSONNAGES!J10/S10/T10` et `05_MOVES_PROPOSES!P10/Q10/U10`. Il ne clôt ni le personnage complet ni les dix-huit familles d'actions.

## Dessins effectivement intégrés

Quatre PNG OpenAI natifs, copiés sans retouche, fournissent seize dessins : quatre poses du lanceur et quatre poses de frappe au bouclier, chacune dessinée séparément vers la droite et vers la gauche. Ils appartiennent uniquement à l'apparence masquée par défaut issue de V34. Aucun costume utilisateur n'est remplacé, y compris les trois variantes explicitement démasquées.

- `public/game/sprites/v59/pit/feral/launcher-right.png`
- `public/game/sprites/v59/pit/feral/launcher-left.png`
- `public/game/sprites/v59/pit/feral/shield-right.png`
- `public/game/sprites/v59/pit/feral/shield-left.png`

Le bouclier est désormais un disque radial complet inspiré des références officielles, porté par le bras gauche. Le geste actif frappe avec ce bouclier, tandis que les lames droites restent en retrait. L'ancien heavy V34, qui représentait une estocade de lames, est retiré du registre actif ; son PNG d'origine est conservé.

Le lanceur tenu par la main gauche reprend les trois rails, le moyeu et la poignée dans l'axe visibles sur les photos NECA. Aucun projectile, laser ou plasma n'est peint dans les poses : les carreaux restent des objets du combat. Les vues gauches montrent le côté dorsal pour conserver les membres équipés. La première proposition gauche inversait visuellement ces membres et a été rejetée.

Les rectangles sont mesurés individuellement : la grille visuelle n'est pas constituée de quatre cases égales. Les pivots reposent sur les pieds et l'échelle reste uniforme, avec une référence de corps de 470 pixels. Les limites visibles de chaque cellule sont également fournies au cadrage de la caméra. Les pixels n'ont été ni découpés sur disque, ni retournés, ni recolorés.

Traçabilité : `docs/v59-image-generation.json` contient les prompts exacts, sorties acceptées/rejetées et le mode OpenAI intégré ; `app/game/data/pitFeralArtV59.json` conserve SHA256, dimensions, cadres, pivots, transparence et repères de bouche ; `scripts/prepare-feral-art-v59.mjs` reproduit l'enregistrement sans modification des pixels.

## Branchement et chargement

L'atlas `feral-actions-v59` fournit les trois phases de la technique debout (9/5/18 ticks) et de l'attaque lourde debout (13/5/22 ticks). Les quatre dessins ne deviennent pas artificiellement davantage de poses lorsque le dessin d'impact est maintenu au début de la récupération. Les postures accroupies et aériennes n'empruntent pas ces dessins debout.

Le combat exige toutes les pages et toutes les phases des deux orientations avant de démarrer. Une page absente bloque introduction et simulation, avec un bouton de nouvelle tentative. Un côté disponible, une ancienne animation ou une pose fixe ne masque plus un chargement incomplet. Le briefing d'entraînement suit la même condition.

L'inspection du premier build a également révélé une ancienne courbe de lame superposée à la frappe au bouclier native. Ce marqueur provisoire ne s'affiche désormais que pour une pose sans animation d'attaque dédiée. Les retours d'impact et de garde restent présents. Les replays V4–V9 conservent leur pose de tir historique au lieu d'associer le grand lanceur V59 à l'ancienne origine physique.

## Point de départ physique

La revue a découvert que les carreaux V9 partaient près du corps, très en retrait du lanceur nouvellement dessiné. Une translation du seul rendu déplacerait l'image sans déplacer les collisions ; elle n'est pas utilisée. Le moteur V10 fait partir les salves debout de l'apparence par défaut de la bouche mesurée sur chaque vue native : environ +122,29/+73,17 unités à droite et −133,17/+79,76 à gauche, relativement au pivot des pieds.

Les trois rails ont un espacement adapté au dessin. Un balayage de collision limité au tick du lancement couvre le trajet entre le départ historique et la bouche : l'adversaire situé sous le canon n'est pas ignoré, même dans un coin de l'arène. Le balayage respecte gardes et invulnérabilité ; un carreau est consommé après son premier impact. Une cible proche ne fait pas tirer en arrière. Les tirs accroupis, aériens et les costumes restent sur leur géométrie précédente tant qu'ils n'utilisent pas le dessin debout correspondant. Le rendu n'ajoute aucun décalage invisible.

Les replays V9 utilisent leur stepper conservé. La fixture `tests/fixtures/pit-replay-v58-feral-v9.json` a été capturée avant modification : 360 ticks, checksum `b3244626`, vies `[960,438]`. La comparaison indépendante `scripts/verify-feral-v9-baseline-v59.mjs` confronte le stepper historique au commit publié V58 `00a6a323f49a1412d820060476c68fc4b81221d0` : **14 400 états sérialisés identiques**, hormis le numéro de schéma normalisé 10→9. Les trajectoires déjà actives d'un snapshot V9 ne sont pas déplacées lors de leur reprise ; les futurs tirs de la partie migrée utilisent V10.

La relecture finale a couvert une transition supplémentaire : un tir parti en l'air, suivi d'un atterrissage pendant l'action, ne doit pas basculer vers le grand canon debout. L'origine choisie est mémorisée dans l'action V10 ; la pose historique reste donc utilisée jusqu'à sa fin, même après disparition des trois carreaux. À l'inverse, un atterrissage avant la libération permet la nouvelle pose et sa bouche native. Les snapshots antérieurs déjà en tir actif/récupération conservent leur présentation historique.

## Références et limites ouvertes

Voir `docs/v59-feral-reference-review.md` pour les sources primaires, photos licenciées réellement inspectées et cellules du classeur. Les mouvements et timings sont une adaptation de jeu, pas des mesures du film.

- Le masque, les proportions corporelles et certains éléments dorsaux restent stylisés selon V34 ; aucune fidélité film 1:1 n'est certifiée.
- Le bouclier est déjà ouvert dans ces dessins. Le déploiement segment par segment, le spécial de garde directionnelle et la totalité de `Q10` ne sont pas livrés.
- La première pose du lanceur le tient déjà et la dernière le garde abaissé. Sortie/rangement, rétraction des lames et continuité intégrale avec le neutre V34 restent à produire : `U10` demeure ouvert.
- Le dessin isolé du carreau reste un indicateur métallique provisoire. Lance scindée, mine conditionnelle, variantes et autres actions restent distincts de ce lot.
- À portée minimale, le bras tendu et le long canon peuvent encore chevaucher le dessin adverse. La collision proche est traitée, mais une pose de tir compacte reste à dessiner. Le départ avancé modifie aussi le délai d'arrivée : la parité compétitive entre l'apparence native et les costumes non animés n'est pas certifiée.
- Aucun nouveau paquet Windows n'est produit par cette livraison.

## Vérification

Contrôles ciblés déjà obtenus : **6/6 tests de production des sprites**, vérifiant les octets des PNG, l'alpha, les cellules, les pivots et le passage de chaque dessin dans le renderer sans miroir/rotation ; **13/13 tests V10** sur départ, collisions proches, gardes, esquive, postures, atterrissages, migration et replays. Le dernier lot moteur/renderer/replay passe **62/62 tests**, et les comparaisons historiques V8/V9 repassent **28 800 états identiques**. Le registre total contient désormais 353 clips, 107 PNG uniques et 695 dessins distincts ; ce sont des comptes de ressources enregistrées, pas un taux d'achèvement du classeur.

La suite complète finale, y compris la correction de l'atterrissage, passe : **1 870/1 870 tests**, sans échec ni test ignoré (`work-local/v59/tests-full-landing-final.log`). Les builds Vinext et Next passent, y compris la vérification TypeScript de Next (`build-vinext-landing-final.log`, `build-next-landing-webpack-final.log`). Next utilise Webpack en local : les jonctions des ressources vers D: sortent du périmètre accepté par Turbopack ; cette tentative locale est conservée comme échec d'environnement distinct. ESLint ne signale aucune erreur ; les trois avertissements existants concernent les images des panneaux ClanChronicle/CompanionCatalogue. Les corrections finales du marqueur de lame et de l'atterrissage ont aussi été vérifiées séparément, sans avertissement.

Sur le build Vinext final, la recette navigateur valide **28 groupes de contrôles**, produit **66 captures** et ne rencontre aucune erreur JavaScript ni réponse HTTP inattendue : seize dessins du laboratoire, tirs et boucliers dans les deux places et orientations, mouvement réduit, pause, gardes proches, huit cas de costumes, deux pannes volontaires 503 et reprise (`qa/feral-vinext-landing-final/report.json`). Aucun trait de lame provisoire n'est superposé aux gestes natifs. Un parcours identique de 28 groupes a aussi passé sur Next avant le dernier correctif d'atterrissage (`qa/feral-next-accepted-rerun/report.json`).

Le build Next final vérifie séparément **quatre cas d'atterrissage par vraies commandes clavier**, dans les deux places, avec huit captures (`qa/feral-landing-next-final-active/report.json`). Les tirs aériens y atterrissent trois ticks après la libération, encore pendant la phase active : aucun nouveau lanceur n'est dessiné au sol. Les tirs après atterrissage utilisent la nouvelle planche ; l'erreur maximale de bouche reconstruite est inférieure à 10⁻¹² unité. Les stockages restent inchangés et aucune erreur JavaScript/HTTP n'est relevée.

Le replay V9 archivé a aussi été lu jusqu'au tick 360 dans les builds Vinext et Next finaux : vies `[960,438]`, 121 frames où les carreaux sont visibles, aucune substitution par le long lanceur V59, sauvegardes et fixture inchangées (`qa/replay-vinext-landing-final/report.json`, `qa/replay-next-landing-final/report.json`). Ces parcours emploient une archive préexistante dans un profil isolé, puis le bouton réel de lecture ; ils ne prétendent pas valider un import de fichier absent de l'interface.

Les quatre PNG servis par Next final répondent HTTP 200 en `image/png` et sont identiques, octet par octet, aux ressources contrôlées (`qa/assets-next-landing-final.json`). Tous les chemins de rapports locaux de cette section sont sous `work-local/v59/`. La publication reste une étape séparée et n'est pas encore confirmée à la rédaction de ce bilan local.
