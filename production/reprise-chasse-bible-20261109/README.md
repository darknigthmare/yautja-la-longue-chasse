# Reprise chasse et bible — 9 novembre 2026

Cette tranche repart de `main` au commit
`19317af4f6cf05532a8ba56dbfe8f56fc4b225d9`, après la fusion de la PR #62 et
211 commits supplémentaires. Elle rapproche deux correctifs de prélèvement et
le retour de groupe **OPS-B04** des sources actuelles. Elle ne remet pas à zéro
les réalisations, les classeurs et les preuves du 8 novembre.

Le [classeur de reprise](Yautja_Reprise_Chasse_Bible_20261109.xlsx) possède dix
feuilles : synthèse, critères de reprise, recettes, nouvelles preuves,
continuité, critères sources exacts, huit qualifications V112 restantes,
sources, 108 classeurs d’origine et fichiers des trois lots précédents.
Le [compagnon HTML imprimable](Yautja_Reprise_Chasse_Bible_20261109.html)
présente les mêmes données en fiches, avec des caractères de 11 points et des
liens complets. Les colonnes larges du XLSX restent disponibles pour le tri,
les filtres et la lecture détaillée ; les quatre premières lignes et les deux
premières colonnes sont gelées.

## Portée de la reprise

Les douze critères dérivés se répartissent en deux groupes. `RPR-H01` à
`RPR-H04` suivent les valeurs réelles de masse et volume, les capacités et
refus d’emport avant validation, puis le verrou d’analyse irréversible et son
explication accessible. Ils conservent les capacités, durées, qualités et
registres de prélèvement existants.

`RPR-E01` à `RPR-E08` détaillent **OPS-B04**, « Guider un groupe revenu du
hangar aux soins puis présenter son relevé au conseil », conservé à
`Opérations!61` dans le classeur d’opérations. La spécification §12.4 ajoute
voie libre, poste de transfert, déplacement visible par les portes et zones
d’usage, arrêt aux positions sûres et refus d’une écriture non confirmée.
Les intégrités abstraites du combat spatial ne sont pas des blessures
individuelles. Aucun soin gratuit, nouvelle monnaie ou nouvelle recrue n’est
déduit de ce transfert.

Les états **EN_ATTENTE** désignent des résultats qui ne sont pas encore reçus.
Une recette préparée n’est pas une recette exécutée. Les champs
implémentation, logique, navigateur, périphériques et revue artistique gardent
des qualifications distinctes dans
[qualification-reprise.json](qualification-reprise.json). Un état borné renvoie
à son rapport et à sa révision exacte. Le présent gel qualifie **onze critères
logiciels bornés** ; le douzième, lié à la recette globale **OPS-Q26**, reste
partiel. Les quatre gates finaux sont réussis : Next/TypeScript, 539 tests dans
26 fichiers distincts et lint strict de 21 fichiers.

## Sources prioritaires et continuité

La [bible principale](../../docs/campagne/BIBLE_DE_CAMPAGNE.md), sa section
« Campagne révisée lore 1:1 » et les décisions L priment sur les anciennes
fiches. Les règles d’original unique des trophées, de recrutement,
d’affectation et de présence restent applicables. Le
[contrat de prélèvement](../../docs/hunt-mechanics-v112.md) décrit les valeurs
et prérequis à annoncer avant confirmation.

Lire les trois lots dans leur ordre, avec leurs dates et leurs propres
preuves : [consolidation](../excel-bible-20261108/README.md),
[suite](../excel-bible-suite-20261108/README.md), puis
[audience C-37](../excel-bible-witnesses-20261108/README.md). L’audience commune
est déjà raccordée : ses 27 contrôles et six captures sur `bdc2b4af` ne sont pas
remplacés par l’ancienne mention locale « aucun navigateur ». Ils ne deviennent
pas non plus une recette du code de cette nouvelle tranche.

**R2-M027 reste partiel** pour le mentor physique, les VFX de nettoyage,
l’audio dédié et l’état de détérioration propre de l’objet. **OPS-Q26 reste une
recette globale partielle** ; un nouveau scénario B04 ne ferme pas à lui seul
les autres cas, périphériques ou revues de présentation. Les huit lignes
`Restant` de la chasse V112 conservent leurs textes et leur statut
`NON_QUALIFIE`. Aucun humain, appareil physique, Microsoft Excel natif ou avis
artistique n’est inventé.

## Conservation des sources

[historique-preserve.json](historique-preserve.json) contient les empreintes
des 108 classeurs d’origine, des 198 fichiers des trois lots du 8 novembre et
du classeur chasse V112 de 740 369 octets. Le générateur les compare aux
identités Git du main de départ avant tout export. Les entrées absentes du
checkout sparse sont lues depuis leur `HEAD` suivi et explicitement marquées
`SPARSE_HEAD` ; cela ne constitue pas une ouverture locale de leur XLSX.

Le registre des 8 625 sujets, les 4 304 cartes V6, les 4 257 blocs de campagne
et les 118 critères d’annexes se recoupent. Ces nombres et les douze critères
de la présente tranche ne s’additionnent pas en fonctionnalités manquantes ou
en missions jouables.

## Reproduction et contrôle

Depuis la racine du dépôt :

```sh
python3 production/reprise-chasse-bible-20261109/build-followup.py
python3 production/reprise-chasse-bible-20261109/build-followup.py --check
python3 production/reprise-chasse-bible-20261109/verify-followup.py
```

Le générateur réutilise le writer stdlib de
`scripts/build-resume-workbook-20261101.py` comme bibliothèque de mise en page.
Il n’exécute ni sa collecte historique ni son point d’entrée et ne change pas
son fichier. Le nouveau ZIP a une date fixe du 9 novembre ; ses cellules sont
du texte littéral, sans formule, macro, calcul distant ou connexion externe.
Les liens sont des adresses GitHub explicites. Les sorties ne dépendent ni
d’un service de tableur ni d’un téléchargement de dépendance.

[verification-classeur.json](verification-classeur.json) conserve le nombre de
feuilles, lignes, cellules, liens et parties XML, les empreintes du XLSX et du
compagnon, les critères sources et les limites. Les contrôles ZIP/XML et de
reproduction ne certifient pas une session Microsoft Excel native. Les
sources produit exécutées sont celles de `85ca8099`. La référence de revue
`9200248` ajoute les recettes et workflows sans changer ces octets produit.
Les vrais checkouts et overlays des anciens rapports sont conservés.

Le [manifeste final](manifest-final.json) identifie tous les fichiers du lot et
les deux documents de raccord. Il contrôle également les octets des 43 PNG
finaux : cette intégrité ne remplace ni une inspection de chaque image ni une
revue artistique humaine. Les liens épinglés sont résolus dans leur arbre Git ;
les nouveaux documents et preuves utilisent explicitement la branche de
livraison, jusqu’à son commit. Toute modification du lot exige une nouvelle
génération, puis les deux contrôles ci-dessus.
