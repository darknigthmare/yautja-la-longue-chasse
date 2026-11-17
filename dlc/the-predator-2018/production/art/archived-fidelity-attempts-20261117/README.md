# THE PREDATOR (2018) — contrôle de fidélité

## Résultat de cette passe : non validé

**Aucun nouveau sprite n’est homologué 1:1 et aucun nouveau push n’a été effectué.**
Les six sorties de génération sont conservées sous `rejected/`, et non dans un dossier de sprites approuvés. Elles ne doivent pas remplacer les assets du jeu. Leur présence sert à conserver les essais et leurs défauts, pas à déclarer le travail terminé.

La PR #146 était ouverte sur `codex/project-archive-recovery-20261117`, au commit `0ad5b914271b29165c67b5ef9ace9c1a5d8b2a8b` lors de la lecture. La v0.5 et les propositions du lot 01 y étaient déjà conservées. Cette session n’expose pas d’action d’écriture GitHub et ne dispose pas d’accès Git authentifié. Ce paquet est **local et non publié**.

## Corrections requises

Le premier lot ne constitue pas une référence canonique. La direction de correction est détaillée dans `DIRECTION_ARTISTIQUE.md` : tête/masque et armure du Fugitive, proportions, exopeau et gantelets de l’Upgrade, absence d’accessoires inventés, un personnage entier par fichier, orientation latérale et transparence réelle.

Les nouveaux essais n’ont pas satisfait cette direction. Les planches ne sont pas des animations validées, les scènes illustrées ne sont pas des sprites individuels et les variantes humaines ne démontrent pas la conformité des costumes au film. Le registre `REVIEW.json` indique les défauts, dimensions, empreintes et propriétés alpha réelles de chaque fichier. La mention RGBA seule ne prouve pas l’existence de pixels transparents : trois sorties n’en ont aucun.

## Sources et niveaux de preuve

`REFERENCES.json` contient les pages officielles du film, les studios de production et les références licenciées complémentaires. Les pages ont été consultées ; les grandes images officielles n’ont pas pu être téléchargées. Des miniatures de photogrammes republiés ont été inspectées, mais elles ne suffisent pas à une homologation de tous les détails. Aucun pixel officiel n’est inclus dans le paquet.

Pour fermer un asset en « conforme film », il faut identifier le plan, l’état du costume et du matériel, puis comparer masque/tête, silhouette, pièces, asymétries, couleurs, mains, pieds et pose. Les zones cachées restent non vérifiées. Les images de figurines complètent les références sans primer sur le montage cinéma.

## Périmètre conservé

Le runtime v0.5, les sauvegardes, les 52 séquences et les 183 micro-zones ne sont pas modifiés. Aucun test de gameplay n’a été relancé dans cette passe et aucun résultat historique n’est présenté comme nouveau. Les contenus supprimés ne sont pas réintégrés au montage cinéma. L’intégration HuntCanvas et les animations restent ouvertes.

## Vérification du paquet

Avec Python 3 et Pillow :

```sh
python verify.py
python verify.py --release
```

La première commande vérifie les empreintes et le décodage des six fichiers. La seconde refuse volontairement une livraison de production tant qu’aucun asset n’est approuvé. Ce refus ne représente pas une erreur d’intégrité de l’archive : il empêche de présenter les essais comme des sprites conformes.
