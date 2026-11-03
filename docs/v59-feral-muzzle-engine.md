# Feral V59 — bouche du lanceur et moteur V10

Le Feral par défaut possède maintenant des dessins natifs de tir debout. Le moteur V9 faisait naître le centre des carreaux à environ 21,6 unités devant le combattant, alors que le lanceur dessiné s'étend au-delà de 120 unités. Un simple décalage de rendu aurait séparé l'objet visible de sa collision. V10 corrige donc l'origine physique du tir.

## Mesures et périmètre

Les constantes de `pitFeralMuzzleV59.ts` sont figées pour cette version du moteur. Elles correspondent au dessin actif, index 2, et non à une analyse variable des pixels au chargement :

| Vue | Pivot local | Bouche locale | Corps source | Décalage physique |
| --- | --- | --- | --- | --- |
| Droite | 365, 463 | 848, 174 | 470 px | +122,29 x ; +73,17 y |
| Gauche | 559, 471 | 33, 156 | 470 px | −133,17 x ; +79,76 y |

Le corps Feral mesure 119 unités dans le duel. Les trois rails utilisent un espacement de 6 pixels source, soit environ 1,52 unité. La simulation place le centre des projectiles à la bouche puis effectue le mouvement normal du premier tick. Le rendu lit ces positions réelles sans décalage caché.

Cette correction ne s'applique qu'au Feral sans variante utilisateur, au sol, debout. L'éligibilité suit la posture calculée par `hunterSpriteMotion.ts`, y compris une attaque aérienne qui atterrit avant de tirer. Relâcher le bouton bas pendant une attaque accroupie ne change pas sa posture conservée. Les autres costumes et les tirs encore accroupis/aériens conservent la géométrie V9.

L'action V10 conserve `feralLauncherOrigin` au moment exact du tir : `native` ou `legacy`. Un tir parti en l'air reste ainsi présenté avec la pose historique si Feral atterrit pendant l'attaque, même si tous ses carreaux ont déjà touché et disparu. Le choix ne dépend ni d'une heuristique sur les projectiles ni du seul état au sol courant. Le champ disparaît avec la fin ou l'interruption de l'action. Les replays V9 ne créent pas ce champ ; la migration d'un ancien snapshot déjà en tir actif/récupération marque sa pose historique sans changer les projectiles.

## Contact à courte distance

Un adversaire peut se trouver entre l'origine historique et la bouche d'un lanceur aussi long. Durant le seul tick de création, chaque carreau balaie deux segments : origine historique → bouche, puis bouche → position après mouvement. L'intersection utilise des intervalles par axe, pas le grand rectangle englobant qui causerait de faux contacts en diagonale.

Ces contacts passent par le traitement habituel des impacts : garde haute ou basse, invulnérabilité, hauteur du corps, dégâts réduits par la garde, un seul impact par carreau. Le balayage n'est ni conservé ni sérialisé. Un lanceur dépassant la limite de l'arène résout d'abord ce contact avant de supprimer son projectile hors-arène. Une cible acquise derrière la bouche ne provoque pas de tir en arrière : le projectile continue horizontalement dans le sens du tireur.

## Compatibilité vérifiée

- Le moteur courant passe à V10. Les replays V9 utilisent un stepper explicitement conservé et leur checksum V9. Les replays V8 et antérieurs conservent leurs branches historiques.
- Avant toute édition du moteur, un replay V9 a été capturé : `tests/fixtures/pit-replay-v58-feral-v9.json`, 360 ticks, checksum `b3244626`, PV finaux `[960, 438]`. Le nouveau lecteur reproduit ces valeurs sans modifier le fichier.
- Un snapshot V9 contenant des carreaux actifs migre sans déplacer ni réorienter ces objets. Leur suite reste identique. Les tirs futurs d'une partie reprise utilisent V10 ; un replay V9 complet garde toujours toutes ses règles V9.
- `scripts/verify-feral-v9-baseline-v59.mjs` compare le stepper de compatibilité aux sources publiques `00a6a323f49a1412d820060476c68fc4b81221d0` : 14 400 états identiques, seule la valeur déclarée de version est normalisée de 10 à 9.
- La comparaison V8 existante a également été répétée : 14 400 états identiques à la source publique V57.
- Treize tests moteur nouveaux couvrent les deux orientations, les deux places joueur, les coins, les gardes, l'invulnérabilité, le saut, la cible mobile, les postures, les snapshots et les replays. Un test du renderer vérifie les atterrissages avant et après le tir alors que les trois projectiles ont déjà disparu. Le lot ciblé moteur/Feral/replay/renderer passe 62 tests après cette correction ; les deux comparaisons historiques de 14 400 états ont été répétées avec succès. La validation navigateur et la publication sont consignées séparément par le lot V59.

Le libellé de l'attaque lourde devient **Frappe au bouclier** : le mouvement actuel ne réalise pas une charge avec déplacement. Les mesures de bouche assurent la cohérence entre cette illustration et la collision ; elles ne constituent pas une certification de fidélité parfaite au film.

Limite de balance : avancer physiquement la naissance du projectile change son délai d'arrivée à distance. Ce lot concerne seulement le dessin natif par défaut ; les costumes non animés n'ont pas été silencieusement convertis à cette nouvelle géométrie. La parité compétitive entre apparences reste à revoir avec leurs propres animations. Il ne s'agit donc pas d'une modification purement cosmétique ni d'une certification d'équilibrage du roster.
