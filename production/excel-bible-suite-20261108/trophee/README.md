# OPS-B03 — La trace du véritable porteur

Suite de la livraison locale `04eb4caa217ad114faf1cf63b301b4df67736b2d`, le 8 novembre 2026.

Source : `production/clan-ship-20261104/operations-spec.md`, §12.3, et
`production/clan-ship-20261104/clan-ship-operations-20261105.xlsx`, onglet
**Opérations**, ligne **60**. Le scénario et ses inscriptions sont des créations
originales de cette continuité. Le Goulet de basalte n'est pas un lieu canonique
nouvellement attesté.

## Parcours raccordé

Le dossier devient disponible après le contrat réellement terminé
`field-ruins-memory`. Trace Froide doit être présent au Clan Ship. Son entretien
historique conserve le prérequis `field-jungle-survey` ; celui de Balafre de
Cendre conserve `ship-training-circuit`. Aucun recrutement n'est offert par le
nouveau dossier.

| Étape | Objet ou interlocuteur | Preuve conservée |
| --- | --- | --- |
| Ouvrir le dossier | Trace Froide, archives par défaut | Accord et identité de l'interlocuteur |
| Examiner le support | Établi de la galerie | Strie B-17 sous une ligature T-04 ajoutée après le prélèvement |
| Lire C-37/01 | Console des archives | Balafre a prélevé le trophée et gravé B-17 avant le retour |
| Lire C-37/02 | Catalogue de la galerie | Trace a transporté ce même objet dans le coffre T-04 |
| Entendre le témoin | Balafre, entraînement par défaut | Témoignage confronté aux deux relevés |
| Motiver l'inscription | Trace Froide | Conclusion, motif et réponse de Trace |
| Présenter le relevé | Balafre de Cendre | Réponse de Balafre, clôture et gratification unique |

Les deux relevés peuvent être lus dans l'un ou l'autre ordre après l'examen du
support. La visite d'une salle ne les collecte pas. Toutes les interactions
exigent la salle réellement occupée et des coordonnées praticables à moins de
64 unités du point de contrôle. Le guidage utilise les chemins et les portes
existants ; l'arrivée n'exécute pas automatiquement une conclusion.

Deux inscriptions sont étayées : attribuer la chasse à Balafre avec le portage
de Trace inscrit au registre, ou afficher les deux noms et leurs rôles distincts
sur la plaque. Elles conservent la même provenance et produisent des réponses
différentes des deux membres. Confondre portage et prélèvement renvoie à C-37/01 ;
effacer tout rôle de Trace renvoie à C-37/02. Les indices ne sont pas perdus et
la relecture physique du relevé désigné est nécessaire avant une autre proposition.

La plaque en scène devient provisoire après la conclusion puis confirmée après
la réponse de Balafre. La chronique **locale du dossier** conserve les preuves,
le motif et les réponses comme des enregistrements. Elle ne modifie pas la
chronique des rites du prologue. **35 marques** sont attribuées à la clôture une
seule fois ; ce montant est un premier choix d'équilibrage. La collection du
joueur, son rang et ses rites sont conservés.

## Présence réelle et réaffectation

La présence est vérifiée à chaque dialogue, y compris après acceptation. Un
interlocuteur en réserve, suspendu, indisponible ou affecté à un vaisseau
personnel ne parle pas depuis son ancien poste. Une affectation active dans un
quartier du Clan Ship déplace le point de rendez-vous vers le poste de service
de sa salle réelle, où son acteur est rendu par le système de résidence.

Les événements conservent la salle de l'entretien et l'identité de Trace ou de
Balafre. Une réaffectation ultérieure ne déplace pas une preuve historique. La
relecture des dialogues archivés est explicitement présentée comme telle et ne
simule pas la présence actuelle du personnage.

## Sauvegarde et reprise

Le registre des incidents passe en **version 2**. Un registre V1 valide des
missions B01/B02 reste V1 et conserve exactement ses événements à la lecture,
à l'export et à l'import. La prochaine action confirmée produit V2 sans modifier
les anciens événements. Une entrée B03 fabriquée dans un conteneur V1 est refusée ;
les versions futures restent protégées.

Le même rejeu strict contrôle les actions en jeu et les événements importés :
identité de campagne, révisions ordonnées, types et champs exacts, indices,
conclusion, interlocuteur attendu et position physique. L'import autorise une
réaffectation postérieure à un entretien et refuse les témoins inventés, les
coordonnées impossibles, les étapes sautées et les fins incompatibles avec les
preuves.

La décision et la gratification passent par la transaction de campagne existante
de `GameClient`. Ni ce composant ni `save.ts` n'ont besoin d'un raccord spécifique
supplémentaire. Un refus d'écriture ne confirme ni l'attribution ni le reçu final.
Les commandes répétées et les révisions périmées ne payent pas une seconde fois.
La garde de journal conserve assez de place pour finir correctement après une
longue suite de propositions erronées.

## Rendu et ressources

L'établi et le catalogue déjà présents dans la galerie restent les objets de
référence. Les identifiants B-17/T-04, leurs couches et l'inscription sont des
éléments d'interface exacts ; aucun nouveau PNG ni trophée d'inventaire n'est
créé. Les actions existent dans la scène et dans le panneau accessible
**Incidents du bord**. Les étiquettes sont séparées lorsque deux incidents
utilisent le même terminal. Les choix longs dans la scène possèdent une zone
défilante ; le panneau conserve leur affichage complet.

## Vérification exécutée

```sh
node --experimental-strip-types --test --test-concurrency=1 \
  tests/clan-ship-incidents.test.mjs \
  tests/clan-ship-trophy-case.test.mjs
```

Résultat : **27/27 tests réussis**, dont **14 régressions B01/B02** et
**13 tests B03**. Le journal exact est [tests-run.txt](tests-run.txt).

Les tests exercent les prérequis issus des fonctions de campagne, les preuves
physiques, les deux verdicts, les mauvaises attributions et leur relecture, les
absences après acceptation, la réaffectation réelle des quartiers, V1/V2, les
imports corrompus, les écritures refusées, les rechargements ordinaires et la
récompense unique. Un parcours utilise le contrôleur de déplacement et les
seuils de porte du jeu jusqu'aux sept étapes et au retour au hangar. Le rendu
React côté serveur vérifie les preuves, les quatre choix et la plaque.

Le lint ciblé des six fichiers TypeScript/TSX/tests concernés est réussi ;
`lint.txt` est vide, sans diagnostic. [verification.json](verification.json)
enregistre les commandes, le résultat et les empreintes des fichiers vérifiés.
Le build et les contrôles communs sont consignés par le chantier d'intégration.

## Limites conservées

Aucun parcours navigateur de B03 ni mesure de performances ou essai tactile/
manette sur matériel réel n'est attesté par cette note. Les simulations de
déplacement et le rendu serveur ne certifient pas les pixels ni l'ergonomie.
Le blocage Chromium observé par le chantier parent reste une preuve séparée.
La revue artistique humaine et la fidélité visuelle 1:1 restent ouvertes.

**OPS-B04 n'est pas implémentée ici ; OPS-Q26 reste partielle.** Le nouveau
dossier ne simule pas une escorte de blessés, une doctrine universelle de justice
yautja ou une conséquence territoriale. Les sources historiques de conception
et leurs statuts datés sont conservés.
