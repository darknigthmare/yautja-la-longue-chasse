# V161 — trois nouveaux modules indépendants

Suite de la livraison V160 de 107 fichiers : **trois PNG natifs supplémentaires**,
soit **110 fichiers conservés au total**, sans compter les sorties rejetées.

- HWA160-N01 : garde-corps droit à ouvertures trapézoïdales, 1774 × 887 px.
- HWA160-N02 : angle de garde-corps, 1774 × 887 px.
- HWA160-N03 : longue travée de passerelle sans tour fusionnée, 2172 × 724 px.

Les trois images sont conservées sans retouche et restent **GENERE_NON_ADMIS**.
Les pixels alpha non nuls touchent certains bords : la marge stricte n'est pas
validée. Aucune marge artificielle n'a été ajoutée pour masquer ce défaut.
Les raccords, pivots, collisions, métriques et angles réels restent à mesurer.
La caméra 0°/35° est une cible de production, pas une certification du dessin.

## Classeur actualisé

[Classeur V161](YAUTJA_HOMEWORLD_PROPS_ECHELLE_TRIBUS_V161.xlsx) : neuf feuilles,
110 fichiers, 99 avec transparence réelle, neuf propositions de grande échelle,
354 exigences globales toujours ouvertes. Les lignes N01 à N03 passent seulement
à « Généré — non admis ». N04 à N10 restent à générer. Le classeur V160 est
conservé, sans réécriture de sa livraison historique.

## Sorties rejetées et affirmations non probantes

Quatre autres générations ont produit des **planches de catalogue au lieu des
objets isolés demandés**. Elles sont rejetées et ne sont ni importées ni comptées.
Leurs textes de « pack complet », de PR #100/#101, de fichiers Excel fictifs,
d'échelles officielles, de validation 1:1 ou d'intégration jouable sont **sans
valeur de preuve**. Seuls le contenu réel de la **PR #99**, les manifestes et
les contrôles exécutés établissent la livraison. `manifest.json` consigne les
empreintes des sorties rejetées pour ne pas les réintroduire comme assets validés.

```sh
python3 production/homeworld-v161/tools/verify.py
```

Ce contrôle d'intégrité ne valide pas le lore ni le rendu en jeu. Aucun fichier
applicatif, emplacement de bâtiment, état de sauvegarde ou collision n'est modifié.
