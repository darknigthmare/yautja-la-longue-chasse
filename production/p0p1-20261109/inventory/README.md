# Sources des priorités P0 et P1

Le scan du 9 novembre lit les **112 classeurs présents au commit `39b601ce`**.
Il identifie 841 contenus de feuilles distincts et 13 962 lignes comportant une
priorité P0/P1 explicite. Ce dernier volume inclut les sources historiques,
les états déjà qualifiés et les copies de suivi ; il décrit des observations.

Le [registre courant](../suivi/registre-priorites.json) conserve 2 577 sujets :

| Origine | Sujets |
|---|---:|
| Registre consolidé du 8 novembre | 2 514 |
| Compléments explicites retrouvés dans les XLSX | 35 |
| Reprise Warp Universe | 26 |
| Reprise planètes et tribus | 2 |

Les 35 compléments comprennent 15 priorités de `PrioritesV112`, les 12 lots
`BUILD5`, les deux essais PHG T13/T15, trois critères de revue du Clan Ship et
trois actions du plan de livraison PHG. Les états « QA manuelle », « à mesurer »,
« revue artistique attendue » et les tableaux sans colonne de statut avaient
échappé à la sélection précédente.

[Les 272 observations complémentaires](supplement-observations.json) restent
consultables avec leurs cellules. Elles incluent aussi des références, des
risques, des dépendances, des générations et des qualifications datées.
Elles ne sont pas additionnées aux sujets du registre. Les exigences peuvent
se recouvrir : les nombres ne mesurent aucune proportion de jeu terminée.

Les preuves courantes sont rapprochées par critère. La présence d’un BODY natif
Feral/Scar conserve ses dessins ; le suivi distingue ensuite la scène, les
partenaires et les mécaniques encore partiels. Les douze lots `BUILD5` ont leur
rapprochement explicite avec le code et les règles L de la bible vivante.

Les [empreintes protégées](../suivi/historique-preserve.json) couvrent les 112
anciens XLSX et les deux registres historiques de départ. Le scan se reproduit
sans écrire dans ces sources :

```sh
python3 production/p0p1-20261109/tools/audit-priorities.py --check
```

Le contrôle du classeur produit est distinct de ce scan et des parcours de jeu.

