# Avenant de reprise — prélèvement et retour d’équipe

**9 novembre 2026.** Base relue :
`19317af4f6cf05532a8ba56dbfe8f56fc4b225d9`, après la fusion de la PR #62 et
211 commits supplémentaires. Jalons produits : prélèvement
`ebe17184965307d9c636d45561a19c431802c4ab`, puis retour de groupe
`cb5c4a47d1313f031a1a8208a83a8578a1256d94`.
La formation finale est committée dans
`85ca8099d96fffb37fbe6f46b26a76c8eaf73df1`. Le paquet source relu
`9200248c37f9e008d20cf6ebc6a684a1d1c5f9dc` y ajoute les recettes, leur fixture
et les workflows, avec les mêmes octets applicatifs et de tests.

Cet avenant complète [celui du 8 novembre](AVENANT_EXCEL_BIBLE_20261108.md),
la [suite](../../production/excel-bible-suite-20261108/README.md) et
l’[audience C-37](../../production/excel-bible-witnesses-20261108/README.md).
Le [suivi de reprise](../../production/reprise-chasse-bible-20261109/README.md)
conserve les critères exacts, les étapes réellement vérifiées, leurs limites
et les empreintes des fichiers historiques. Les décisions L de la bible,
les identités, les rangs et les registres existants restent les références.

## Annonce de l’emport et prérequis de prélèvement

Le menu anatomique annonce la masse et le volume de chaque partie, ainsi que
l’emport projeté par rapport aux capacités réelles de l’armure. Les raisons
de refus distinguent masse, volume, dépôt de campagne et registre de terrain
de 64 prises. La présentation et la confirmation utilisent le même diagnostic,
recalculé depuis les objets courants ; le dernier tick garde son autorité.
L’outil, les durées, les stocks, les capacités et les qualités ne sont pas
rééquilibrés par cette annonce.

Une analyse devenue impossible après un premier prélèvement est désactivée
avant le clic, avec une raison visible et reliée au bouton. Une prise déposée
garde son identité et ce verrou ; aucune qualité antérieure n’est recalculée.
Les boutons indisponibles ne deviennent pas des destinations de la sélection
manette. Les textes visibles restent accessibles au tactile et au clavier,
au lieu d’exister seulement dans une infobulle.

La suite ciblée atteste **153 tests au total**, avec zéro échec ou test ignoré.
La recette navigateur du vrai menu et du callback natif comprend **18 contrôles
au total**, six pour chacune des trois résolutions. Les corps et sacs aux
limites sont des états de départ déclarés, construits par les modules natifs.
Le rendu du monde et une campagne entière ne font pas partie de ce cadre.
Le [dossier de preuves](../../production/reprise-chasse-bible-20261109/qa/harvest/README.md)
conserve les sources, captures et contextes d’exécution ; les passes ne sont
pas additionnées comme des fonctionnalités nouvelles.

## OPS-B04 — Le retour que l’on prépare

Le critère d’origine reste **« Guider un groupe revenu du hangar aux soins
puis présenter son relevé au conseil »**, à `Opérations!61` du classeur
d’opérations. La [spécification §12.4](../../production/clan-ship-20261104/operations-spec.md)
demande aussi une voie libre, le choix d’un poste de transfert, un groupe
visible, des portes et zones d’usage effectives, et une reprise sûre.

Après le reçu confirmé de `space-recovery`, Garde du Seuil et Suture Noire
préparent le contrôle d’une équipe revenue au bord, selon leur disponibilité
réelle. Le joueur rejoint le seuil du hangar, choisit le lit médical ou le poste
de diagnostic, puis retourne au service du hangar pour commencer l’escorte.
Les deux membres temporaires de l’équipe suivent le joueur par le contrôleur
de chemin et de collision du pont. Ils attendent si le joueur s’éloigne.

### Guidage et porte

Le bouton **Approcher** ne confirme aucune opération. Lorsque le poste est
dans une autre salle, il guide d’abord le joueur jusqu’à cette salle par les
portes existantes. Une fois dans la salle, **Approcher** guide jusqu’au point
précis ; le joueur confirme ensuite l’action à portée. Ce guidage en deux
étapes conserve la navigation du pont et ne déplace pas instantanément les
acteurs vers un service.

Le seuil hangar → soins attend physiquement les deux membres. Le passage
enregistre ensemble le groupe et le changement de salle du joueur. Les membres
sont placés au seuil d’arrivée de la liaison, puis reprennent leur marche
jusqu’au poste choisi. Ils ne disparaissent pas après une simple sélection
de salle. Le contrôle médical exige l’arrivée de toute l’équipe et la présence
de Suture Noire dans la baie. Le joueur rejoint ensuite seul le conseil pour
présenter le relevé ; le groupe reste aux soins.

### Reprise et sauvegarde

Le bloc optionnel `clanShipReturnEscort`, version 1, conserve le propriétaire,
la révision, le reçu de récupération d’origine, le poste choisi, la phase,
les positions sûres et le temps simulé. Il ne migre pas les journaux C-37 ou
les anciens incidents. Les données étrangères, futures, incohérentes ou issues
d’une révision périmée sont refusées par leurs frontières de sauvegarde.

Les pas de simulation sont bornés à 50 ms. Les déplacements sont regroupés
en checkpoints : le seuil de 900 ms, plus au maximum un pas de 50 ms, maintient
**moins d’une seconde de déplacement non confirmé**. Les transitions de porte
et les opérations passent par la sauvegarde de campagne confirmée. Pause,
perte de focus et rechargement reprennent les dernières positions sûres,
sans rattrapage du temps fermé ; aucune écriture par image n’est prétendue.

Une écriture refusée ou non confirmée gèle le groupe et ne valide ni transfert
ni compte rendu. La relecture et la réconciliation utilisent le propriétaire
de campagne existant. Le dossier arrêté reste chargeable lorsque le joueur
se trouve dans une autre salle ou hors du bord. Une fixture portable vérifie
cette frontière ; elle ne représente pas une route extérieure entière jouée
dans le navigateur.

### Identité, ressources et portée

Les deux acteurs réemploient les dessins individuels existants
`hunter/17.png` et `hunter/11.png` : ce sont des **sprites statiques déplacés**,
pas de nouveaux cycles de marche. Ils ne deviennent pas des compagnons
recrutés, ne dupliquent pas les témoins C-37 et ne modifient pas les quartiers
existants. Les intégrités abstraites du combat spatial ne sont pas converties
en blessures individuelles. Le contrôle n’accorde ni soin gratuit au joueur,
ni monnaie, ni rang, ni nouvelle recrue.

Le [rapport d’intégrité](../../production/reprise-chasse-bible-20261109/qa/native-resource-integrity.json)
rapproche les **847 fichiers matérialisés**, soit **1 150 407 821 octets**,
avec leurs identités Git sur le main de départ ; 672 empreintes du relevé
natif antérieur sont également vérifiées. Cette preuve concerne les ressources
de ces parcours et imports, pas tout le catalogue ni une validation artistique
humaine ou canonique 1:1.

Le modèle final comprend **20 tests** : les 19 premiers cas et une régression
de formation. La suite UI comporte **39 tests, dont 12 nouveaux**. Les anciens
totaux de 91, 19, 39 et 538 sont des photographies qui se recouvrent ; ils ne
s’additionnent pas à la validation finale.

La relecture des images `native-05` a signalé l’occlusion importante d’un
équipier. Les deux points de formation sont maintenant placés sur des flancs
distincts, à ±40 unités sur X et −40 sur Y par rapport au joueur, avec le même
solveur de chemin et de collision. La nouvelle passe
[`native-07`](../../production/reprise-chasse-bible-20261109/qa/escort/README.md)
du vrai GameClient atteste **19 contrôles et 25 captures natives**,
**1 312 observations de marche et 42 écritures observées**, sans erreur
JavaScript, console ou ressource manquante. Les résolutions sont 1440 × 1000,
390 × 844 et 320 × 740. La dernière utilise un groupe déjà séparé du joueur,
préparé par les reducers pour tester la reprise ; les prérequis spatiaux ne
sont pas des combats joués par cette recette.

Les essais `native-01` à `native-03` restent conservés en échec ; `04` et `05`
gardent leur portée de jalons de l’ancienne formation. `06` reste en échec
après un rechargement HMR provoqué par une génération documentaire parallèle.
La recette `07` désactive ce HMR du serveur de QA et ignore les sorties
documentaires, en conservant ses contrôles de sources avant et après.
Elle garde son véritable checkout `85ca8099` et son arbre de recettes/preuves
non committées. Les quatorze entrées applicatives et de fixture sont rapprochées
au commit produit ; la recette possède sa propre empreinte. Ce rapprochement
n’est pas une nouvelle exécution sur `9200248`.

L’agent QA a inspecté des captures finales aux trois résolutions ; les deux
têtes et silhouettes y sont distinctes au poste. Le tri en profondeur conserve
des recouvrements naturels. Le contrôle de taille et SHA-256 des **43 PNG**
finaux de récolte et d’escorte est un contrôle d’intégrité, pas 43 inspections
visuelles ni une validation artistique humaine.

Le [reçu d’intégration final](../../production/reprise-chasse-bible-20261109/qa/integration-final-85ca8099/verification.json)
atteste sur `85ca8099` **539 tests réussis dans 26 fichiers distincts, zéro
ignoré**, le build applicatif Next webpack avec TypeScript et le lint strict
de 21 fichiers, tous avec un code de sortie zéro. Les commandes et journaux
exacts sont conservés. Le relevé courant et le snapshot officiels sont ensuite
vérifiés sur `9200248` ; le commit documentaire suivant ne devient pas
rétroactivement le point d’exécution de ces contrôles.

## Limites et autres ouverts

Le raccord logiciel B04 ne clôture pas toute la recette **OPS-Q26** ni toute
la bible. **R2-M027** garde ses compléments : mentor physique, VFX de nettoyage,
audio dédié et détérioration propre de l’objet, distincte des PV du chasseur.
Les autres arcs, la mobilité et Warp conservent leurs états précédents.

Les huit qualifications `Restant` du suivi chasse V112, les 108 classeurs
d’origine et les trois lots du 8 novembre sont conservés. Aucun test sur
téléphone ou manette physique, aucune compréhension humaine, aucune mesure
de performance cible et aucun usage Microsoft Excel natif ne sont déduits
des tests de modèle ou du navigateur automatisé.
