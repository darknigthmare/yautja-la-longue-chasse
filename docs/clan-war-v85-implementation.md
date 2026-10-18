# Guerres de clans V85

Le point d’entrée est `ClanWarPanelV85({ save, onClose })`. Il lit seulement la
campagne principale. Les exercices ont des profils `context: free`, leurs propres
personnes et des clés de stockage distinctes. Aucun honneur, rite, rang, trophée,
vaisseau ou combattant de campagne n’est accordé par ces écrans.

## Sources et versions

- Source locale antérieure : `Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx`, conçu
  le 6 octobre 2026, SHA-256
  `3ef3712c9ffa865f918133bee7667155c1bb320f060b4a19cc58ff650ffd0dfa`.
  L’extraction complète conserve les 15 120 cellules de 39 feuilles dans
  `war-clans-v3-workbook-source.json`. Le registre runtime contient 679 fiches
  issues de l’Index, avec feuille, ligne, colonne et cellule d’origine.
- Source prioritaire reçue du Drive privé :
  `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA-256
  `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.
  Les 975 fiches de guerre de 33 feuilles ont été extraites intégralement. Après
  l’autorisation explicite de publication donnée le 7 octobre, le corpus est
  livré dans `app/game/clanWarBibleV6Source.json` et actif par défaut.
- Les deux modèles se contredisent matériellement : identifiants, carte,
  économie et expérience. Aucun alias `RTS-U` → `W3-U` ou `CON-T` → `W3-K` n’a été
  fabriqué. Les exercices V3 sont nommés archives antérieures. Le panneau V6
  est l’entrée prioritaire et ne réutilise pas leurs chiffres.

Les tables décrivent des créations et des reconstitutions du projet. Leur propre
statut de conception reste visible. Elles ne définissent pas du lore canonique.

## Lot V3 disponible

- Compositeur des 30 formations : coûts exacts en commandement, matériaux et
  énergie, limite 12/120/80 et exemple 12/112/60 fourni par le classeur.
- Canyon : reconnaissance préparatoire, choix de batterie, changement exclusif
  de mode, positions N0/N1, rampe et escalier, déplacement du chariot, repérage,
  couverture, réparation du pont, évacuation du porteur, adoption de Lecture
  récente après huit secondes sûres, extraction, bilan détaillé et reçu unique.
- Korthas : 36 territoires et routes exactes, 24 identités Pxx aux positions de
  `CON-TURN01`, forces F02 illustratives, stocks localisés, deux ordres
  opérationnels, un logistique et un diplomatique, colonne de huit personnes,
  décisions scellées, contre-offensives utilisant les unités réellement
  présentes, rencontre sur une route, blessures/morts/repli, garde minimale,
  transit sans transfert de souveraineté, revenus du tour suivant et entretien
  `ceil(C/6) + ceil(A/12)`.
- XP utile dédupliquée, plafonds exacts de chaque source et par bataille ; aucun
  rite déverrouillé. Les objectifs région/corridor/total ont des compteurs de
  stabilité distincts. Une région doit être la même lors des deux validations.
- Les stocks de l’ancien propriétaire sont consignés dans `heldStocks` lors
  d’une cession/capture : un drapeau ne crédite pas gratuitement ces biens.
- Les portraits natifs ne sont associés qu’aux clans ou métiers documentés par
  `findImportedYautjaArtV85`. Aucun portrait n’attribue une identité canonique aux
  Pxx. Les icônes tactiques SVG ne sont pas annoncées comme des walkframes.

Le canyon exerce les accès et la coordination ; son modèle ne simule pas encore
les munitions, les collisions de combat ni la santé de chacun des membres. La
reconnaissance préparatoire est un parcours de points de scénario, pas un nouveau
moteur de déplacement du héros. Le transport des corps vers la medical-bay de
campagne et l’arrivée réelle sur Korthas restent à raccorder au monde partagé.

Les allocations initiales de stocks, le prix I1/durée deux tours du transit, les
soins légers S1, les cessions F03 au-delà de T07 et l’équation automatique de
combat sont explicitement des paramètres de cet exercice. Ils ne sont pas
présentés comme des chiffres du classeur ou une diplomatie narrative complète.
La batterie empruntée avance l’insertion de six unités de carte dans le modèle
tactique ; cette distance est un choix de l’exercice. Sa dette de restitution
reste visible au bilan et ne se clôt pas automatiquement.

## Mécanismes V6 actifs

`clanWarBibleV6.ts` expose les définitions de 30 équipes, 30 spécialisations,
31 paramètres, 36 zones et 70 passages. Le calcul d’équipe reprend les facteurs
et gardes de la feuille `Simuler Une équipe` : XP 0–100, paliers 40/80,
coefficients 1/1,15/1,30, fatigue plancher 0,5, ravitaillement 1 ou 0,7,
effectif déployable et bonus de défense plafonné à 30 %.

Le noyau de résultat ne crédite que les participants présents, borne une
transaction à 12 XP et conserve un reçu par opération et par résultat à travers
les trois modes. Un nouvel identifiant d’opération ne permet pas de réutiliser
le même résultat.
L’XP des membres vivants détermine la maîtrise de l’équipe ; la mort ne transfère
pas les compétences à un remplaçant. Le choix A/B est exclusif à partir du seuil
documenté. Le planificateur de trajet utilise les coûts, capacités, directions et
fermetures des passages du classeur ; il ne déplace aucun acteur de campagne.
Le mode de route RAV exclut les traverses qui interdisent le ravitaillement.

Le panneau V6 combine calculateur, graphe de routes, exercice de reconnaissance
et lecteur des 975 fiches. Sa source runtime est désormais intégrale et active.
Une copie de travail source est aussi conservée dans
`work-local/drive-import-20261007/bible-v6-private/clan-war-v6-source-private.json`.

### Import local privé (`privateImport`)

Le bouton « Fichier JSON des règles de guerre V6 » permet de sélectionner ce
fichier local comme contexte alternatif à la source intégrée, puis active le
calculateur et le planificateur avec ses données.
La lecture emploie `File.text()` et `JSON.parse()` uniquement. Le JSON n’est ni
envoyé, ni écrit dans une sauvegarde, ni conservé dans le stockage du navigateur.
Fermer le panneau ou retirer le fichier supprime ce contexte d’affichage ; les
octets de la source locale ne sont pas modifiés.

`parsePrivateWarRulesV6` exige le nom du classeur, la date et son SHA256 de source
déclaré, la forme des fiches/cellules, des valeurs primitives bornées et les tables
nécessaires (31 paramètres, 30 équipes, 30 spécialisations, 36 zones, 70 passages).
Il vérifie les références du graphe, les coordonnées, les booléens de direction
et les bornes cohérentes du calcul. Le fichier doit faire moins de 40 Mio.
Les formules et scripts ne sont pas exécutés. Ce SHA déclaré ne constitue pas
une signature cryptographique du JSON ni une preuve de ses octets : l’interface
le précise. Une erreur reste visible et conserve les règles déjà chargées.

`createWarRulesV6` crée un contexte de règles séparé. Les fonctions de calcul,
de progression et de route acceptent ce contexte optionnel sans mutation d’un
singleton. Leurs exports existants et leur contexte runtime par défaut sont
conservés. Si une publication autorisée remplace le JSON runtime vide, les mêmes
outils utilisent ce contenu par défaut. Ni l’import ni les outils n’attribuent
de troupes, d’XP, de ressources, de territoires ou de voyages à la campagne.

### Exercice de reconnaissance V6

`ClanWarExerciseV6` et `clanWarExerciseV6.ts` créent une équipe novice nommée par
ses identifiants d’exercice, avec le budget fini choisi par le joueur. Un ordre
préparé ne change ni sa position ni son stock. Chaque résolution traverse un
passage réel du graphe, conserve les membres, dépense l’entretien une seule fois
et applique les +10 de fatigue de marche documentés. Une fermeture après la
préparation bloque le prochain passage sans téléportation ni débit.

Observer depuis une présence valide attribue 4 XP uniquement aux membres aptes
présents, une seule fois par territoire. La reconnaissance est horodatée par
tour ; revisiter une zone ne renouvelle pas son gain. Les dix premières
observations nouvelles mènent une équipe complète à 40 XP. Le choix A/B demande
confirmation, reste verrouillé et conserve la description de sa contrepartie.
Les gestes tactiques des spécialités ne sont pas simulés dans cet exercice de
carte. Le repos équipé n’existe qu’au point de départ et réduit la fatigue de 20,
sans soins automatiques ni remplacement d’une personne.

Cadence explicitement propre à ce prototype : un passage, une observation ou
un repos équipé consomme un tour et l’entretien de l’équipe. Le stock initial
est une hypothèse choisie, pas une dotation canonique du classeur ; aucun revenu
territorial ne le recharge. Le rationnement réduit l’estimation à 0,7 et ne crée
pas de décès. Aucune annexion, mission héroïque, victoire RTS, guérison ou bataille
complète n’est déclarée accomplie par ce parcours. L’exercice reste en mémoire,
survit aux changements d’onglet de la table des mandats et est remplacé lors d’un
changement de source ou de la fermeture du panneau. Cette durée de vie est
annoncée avant le chargement d’un fichier local.

## Persistance, réseau et limites

Les exercices sont du jeu local, sans backend multijoueur. Les noyaux sont des
fonctions pures, avec manifestes et résultats uniques adaptés à une future
validation par l’hôte ; cela ne constitue pas une implémentation réseau.

Les lectures refusent les versions futures et les archives illisibles. Leurs
octets sont préservés et les écritures suspendues ; un nouvel exercice peut être
demandé explicitement. Une erreur de stockage laisse l’état courant en mémoire
avec un message. `createWarSessionV85` possède un snapshot SSR stable et hydrate
son store externe une seule fois lors de l’abonnement. `useSyncExternalStore`
abonne le panneau ; les écritures sont déclenchées par les événements et timers,
sans restauration ni écriture par effet React. L’hydratation n’écrit aucun
profil neuf par défaut. Un reset explicite ne déverrouille que son archive libre.
Les effets de timer sont nettoyés en quittant la caméra.

La consigne initiale suspendait les contrôles. Le 7 octobre, l’utilisateur a
explicitement autorisé leur reprise. Les tests dédiés suivants ont alors été
exécutés : `clan-war-bible-v6.test.mjs`, `clan-war-exercise-v6.test.mjs` et
`clan-war-session-v85.test.mjs` : 28/28 réussis. Ils couvrent les chiffres exacts
du simulateur (12 attaque, 9 défense, 48 XP par défaut), le parser adverse,
l’isolation des contextes, les reçus, les transitions de reconnaissance et la
conservation des archives en échec de stockage. Un oracle indépendant de
distances vérifie 10 368 routes (36² paires × quatre capacités × deux cargaisons).
Ces tests ne prouvent pas un combat complet ou une campagne multijoueur. Les
classeurs sources n’ont pas été modifiés.
