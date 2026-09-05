# Tracker — garde et absorption V28

Deuxième essai retenu pour revue, **pas validé en combat** : `tracker-guard-absorb-v2.png`, 1536 × 1024, RGB opaque, 1 932 274 octets.

La galerie licenciée [Hot Toys / Sideshow](https://www.sideshow.com/collectibles/predator-tracker-hot-toys-901303) a été inspectée, ainsi que la présentation locale V5. Le masque allongé à deux défenses, le torse sans filet, les plaques vert gris, la lame unique du gantelet droit et le canon d’épaule gauche ont guidé le prompt. Le masque Berserker de substitution dans `hunterLore.ts` et les deux lames de la planche V5 ne constituent pas des références exactes.

Le premier PNG comportait deux ouvertures de canon dans certaines poses. Il est conservé comme brouillon rejeté. Une **correction par le générateur OpenAI intégré**, sans retouche de pixels par script, a supprimé l’ouverture inférieure. La feuille corrigée garde les six phases : prêt, montée en garde, garde, absorption du choc, récupération, prêt. Les phases 2 et 3 sont proches ; la compression en 4 est plus nette.

`registration.json` propose six rectangles libres avec huit pixels de marge autour des silhouettes mesurées à trois seuils. Ils sont dans l’image, disjoints et couvrent tous les pixels classifiés comme sujet. Les appuis donnent une largeur de pied proche de 65 à 66 px ; la hauteur varie de 392 à 438 px avec la posture. Il faut appliquer une échelle unique à toute la séquence et translater selon les pivots, sans ajuster chaque pose à une hauteur identique.

Les mains et la lame sont plausibles à la revue ; certains doigts et le canon sont normalement occultés en garde. Aucun compte de doigts invisible n’est certifié. Le fond magenta n’est pas parfaitement uniforme, les marges demandées ne sont pas respectées, et le masque reste une adaptation. Les transitions, le rendu de la clé couleur et la lisibilité en jeu restent à vérifier. Aucune certification de fidélité 1:1, d’anatomie complète ou de boucle fluide.

SHA-256 retenu : `e4e2be3dd53112d376deadce01dc982117ce9a476f57c51b6e510b024e23cb16`.

Prompts, références et preuves SHA : `provenance.json`, `references.json`, `review.json`. Les captures de référence restent dans `tmp/v28-tracker-fugitive-refs`, hors ressources publiques. Aucun code, manifeste partagé ou fichier V27 modifié.

Seconde lecture indépendante : pit_animation_lab a inspecté la feuille corrigée et une loupe de la pose 4. Aucun nouveau défaut bloquant évident ni canon doublé visible ; occultations de la tête et de la garde plausibles. Les poses 2/3 correspondent surtout à un maintien de garde. Le statut reste limité à la revue.
