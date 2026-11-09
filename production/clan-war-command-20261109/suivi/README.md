# Suite P0/P1 et commandement — 9 novembre 2026

Le [classeur final](Yautja_Commandement_P0_P1_20261109.xlsx) ajoute six feuilles
aux treize précédentes. **Les P0/P1 du jeu ne sont pas tous terminés.**

Le registre compte **2 591 sujets** : 775 P0 et 1 816 P1. Cette passe qualifie
trois critères dans leur portée explicite : le tutoriel de 18 gestes sur modèle
pédagogique, le parcours mobilité MOB-001 et la vérification logicielle MOB-002.
Elle conserve 29 lignes qualifiées antérieurement ; B05 est partiel dans son
état actuel et garde sa preuve antérieure. Il reste **1 963 partiels et 596
ouverts**, sans observation priorisée laissée sans rapprochement.

Les sources documentaires des cinq PR sont figées au commit `b666504c` et leurs
octets vérifiés dans le checkout courant ; le code final est identifié par
`6a412eea`. Les fusions distantes constituent une étape séparée : ce classeur ne
les déduit pas de la lecture locale.

L’inventaire couvre 119 XLSX : 113 historiques protégés, cinq nouveaux suivis
et une capsule QA de première exportation. Les 14 nouvelles priorités explicites
proviennent de `Mobilité / Reste_a_faire` : deux P0 et douze P1. Les six Markdown
de la bible et de ses avenants ne contiennent aucune nouvelle ligne explicitement
P0/P1. Les autres critères gardent leurs sources, sans priorité inventée.

Le [changelog](CHANGELOG.md) détaille les nouveaux résultats et leurs suites.
Les recettes Next, GameClient via Vite, composants isolés et API de manette
synthétique sont distinguées. Les prérequis de campagne historiques sont
déclarés. Aucune campagne complète, manette physique, revue artistique humaine
ou nouvelle endurance de soixante minutes n’est déduite de cette passe.

Vérification de livraison : **60 563 cellules comparées**, 19 feuilles, les
13 feuilles historiques et 20 anciennes pièces ZIP préservées à l’octet,
styles antérieurs conservés, formule de synthèse avec cache 2 591 et
reconstruction identique à l’octet. Les 113 anciens classeurs restent inchangés.
Le contrôle XML n’exécute pas le moteur Excel natif.

Le [reçu global](../verification.json) rapporte 1 198 tests uniques réussis sur
103 fichiers dans un checkout froid, le build Next de production et TypeScript
réussis, et le lint strict du dépôt configuré sans erreur ni avertissement.
Ses contrôles d’intégrité sont distincts des tests de comportement. Le
[reçu du classeur](final-receipt.json) épingle les fichiers de cette livraison.

SHA256 du classeur :
`afa5817041cd5789a04bb06999ec6b6eeae8cce3760329c7d7af34804ffcb150`.

Depuis la racine du dépôt, contrôle indépendant en lecture seule :

```bash
python3 production/clan-war-command-20261109/tools/verify-followup.py --check
```
