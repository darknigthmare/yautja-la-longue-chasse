# Tracker — proposition V41

Le seul lot proposé est la marche avant orientée de Tracker, par lecture temporelle `[0,3,2,1]` de ses deux cycles de recul V34 corrigés. Les pixels, côtés anatomiques et équipements ne sont jamais retournés. Deux clips de quatre dessins, 8 ticks par dessin (32 ticks par boucle à 60 Hz).

**Comptage : 2 correspondances de clips supplémentaires proposées, 8 dessins déjà existants réutilisés, 0 nouveau dessin, 0 nouvelle page, 0 génération, 0 moveset complet.** Aucun registre partagé n'est modifié. L'intégration reste subordonnée à la revue en déplacement réel du parent.

## Source et continuité

- Source : `art-source/v34/pit/tracker/tracker-repair-walk-backward-contact-v34.png` (1536 × 1024, 2 079 285 octets).
- Origine : `exec-30145240-a584-4859-9d1f-cb46b42e9ae4.png`.
- SHA-256 : `4f720315955814926d4e20d758ed9f6f3740e8f249556545cc9d73ad6cc99602`, identique à la page publique et à la provenance V34.
- Les premières planches de marche avant et leur correction V34 restent rejetées pour répétition du même appui. Elles ne sont pas utilisées ici.

Inspection des quatre familles de recul (Berserker, Tracker, Greyback, Celtic), puis des pages natives Tracker, Berserker et Celtic. Tracker est retenu : les contacts proche/lointain alternent et l'ordre inversé fait passer le pied replié au contact avant. Le buste reste tourné vers l'adversaire. Celtic est moins certain sur le pied replié masqué par l'autre jambe et la lance ; aucun autre chasseur n'est proposé dans ce lot.

Masque à défenses, filets, armure, deux mains, gantelets et lames sont lisibles et stables dans le cycle. L'apparence reste celle du projet V5, sans certification de fidélité officielle 1:1. Les petits accessoires suspendus à la ceinture sont moins détaillés que dans l'idle ; cette variation préexiste dans le recul accepté, elle n'est ni introduite ni corrigée par ce lot.

## Contrat

Les rectangles et pivots complets sont dans `proposal.json`. Ils sont repris des dessins existants et vérifiés aux pixels, pas calculés à partir d'une grille. Hauteur corporelle de référence 400 px ; affichage natif Tracker 122 px. La préparation color-key et le traitement de frange restent ceux du recul V34.

## Vérification effectuée

`node work/v41/art-candidate/verify-proposal.mjs` : PASS le 19 septembre 2026.

- Huit empreintes de dessins distinctes ; aucun pixel opaque sur leurs bordures après le vrai préparateur runtime.
- Schéma atlas, loader et adaptateur d'état réels passent ; les ticks 0/8/16/24/32 résolvent bien les dessins 0/3/2/1/0 dans chaque orientation.
- La banque candidate ne prétend couvrir ni idle ni recul. Les clips de recul d'origine restent inchangés.
- Contact natif `tracker-forward-native-review.png` inspecté à 122 px : corps entiers, pieds et armes non coupés, contours propres à cette échelle.
- Aucun changement de pixels source ni de registre partagé.

**Limite :** le contact statique et les tests de sélection ne prouvent pas le mouvement avec translation du combattant. Le parent doit encore vérifier avance, arrêt, reprise du recul et éventuelle glissade des pieds en jeu. Cette cadence à quatre dessins reste sommaire et ne doit pas être annoncée comme une nouvelle animation dessinée.
