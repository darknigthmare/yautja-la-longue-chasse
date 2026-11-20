# Brise-garde B, recul et ascension — revue indépendante

Les trois sources sont retenables en **draft**. Toutes conservent des corps entiers et de vraies zones alpha transparentes. Aucun pixel de bord n’atteint alpha≥16.

## Brise-garde B

Source : `exec-b66de90d-1694-4afd-b908-311119af5ea0.png`.

Le bras de contact se rétracte, le torse remonte et les jambes reprennent progressivement la garde. L’usage de la planche A entière comme référence évite ici le grossissement des premières tentatives de récupération des autres actions.

Au raccord A16→B01, les enveloppes alpha≥128 mesurent **251 × 237** puis **248 × 241 px**. Le sol reste **y303** ; le milieu des deux appuis ne varie que de **129,794 à 129,589 px**, soit **0,205 px**. **Aucune calibration de page n’est recommandée.** L’écartement passe d’environ146,84 à130,07 px : les pieds se rapprochent pendant le retour, et ce mouvement ne doit pas être effacé en recentrant chaque cellule.

La dernière rangée conserve du bruit alpha>2 au bord inférieur des cellules13–16 ; il reste inférieur à16. Les marges visibles minimales gauche/haut/droite/bas sont **31 / 30 / 34 / 9 px**.

## Course arrière

Source : `exec-0bfdcb13-2cca-434f-8fdf-4a049357209e.png`.

Le torse reste orienté à droite, plus redressé que dans la course avant, et les jambes enchaînent les pas de recul. La source est une nouvelle séquence, pas un miroir ou la lecture inverse du cycle avant. Aucun retour à idle n’a été ajouté à la fin.

La planche n’a aucun contact de bord au seuil alpha>2. Marges visibles minimales : **62 / 16 / 81 / 16 px**. Aucune silhouette consécutive n’est exactement tenue. La fermeture16→1 reste plus marquée que plusieurs transitions internes : recouvrement de silhouette **0,623**, pour une médiane interne de **0,785**. Il s’agit d’un cycle draft utile, avec raccord à lisser ; ces chiffres ne prouvent pas la fluidité artistique.

## Ascension

Source : `exec-a91fbfe3-cceb-4e9d-8c7e-8f0d66051185.png`.

Le Yautja échange ses prises, remonte un genou puis l’autre et maintient ses mains libres. Les deux bras et jambes restent attachés ; aucune paroi ou végétation n’est fusionnée au personnage. Le futur support et les attaches de gameplay devront fournir les contacts réels.

La planche n’a aucun bord alpha>2 ; marges visibles minimales : **106 / 7 / 56 / 13 px**. Le raccord16→1 présente un recouvrement de silhouette **0,872**, supérieur à la médiane interne **0,783**, sans être une silhouette strictement répétée. Aucun défaut évident de fermeture n’est repéré sur la planche ; la revue humaine dans le lecteur reste nécessaire.

Ne pas stabiliser les pieds ou supprimer le déplacement du bassin de ces deux locomotions : la variation corporelle appartient au geste. L’animation en place doit rester séparée du mouvement monde de la simulation.

Rapports : `batch-05-qa.json`, `guard-break-a-b-transition-qa.json`, `batch-05-loop-diagnostics.json`.
