# Lecture indépendante des sources récentes V86

Lecture du 7 octobre 2026, complétée par comparaison locale des octets et par
SSR isolée. Aucun fichier de code partagé n’a été modifié pour cette revue.
Cette preuve ne vaut ni test global, ni validation navigateur, ni publication.

## Ce qui a été confirmé

- Les quatre lots V6.8 apportent 72 PNG distincts, 18 groupes et quatre fonctions
  par groupe : garde des remparts, Enforcer de traque, Hydra vétéran, Blazer de
  brèche. Les archives comptent respectivement 20, 20, 16 et 16 PNG.
- Les 72 fichiers montés localement correspondent aux SHA256, longueurs et
  dimensions de leurs fiches producteur préservées. Total : 170 595 836 octets,
  1024 × 1536 par fichier. Les identités, fonctions et approbations déclarées
  par le producteur concordent. Cette dernière vérification porte sur la
  déclaration source, pas sur une nouvelle certification visuelle.
- Le registre agrégé actuel contient 1 885 fiches et 1 570 SHA256 distincts.
  Les 1 396 PNG uniques annoncés par la notice désignent le lot local initial,
  auquel s’ajoutent les 174 sources Drive récentes ; ce n’est pas le total actuel.
- L’importeur vérifie les archives, le manifeste, les identités, la signature
  de format, les dimensions, le mode RGBA, l’alpha et les SHA des PNG. Il ne
  lance pas les scripts contenus dans les archives et copie les octets natifs.
- Le nouveau lot reste `single-pose-static`, sans planche d’animation ni
  certification canonique 1:1. Aucun de ses 72 individus n’est affecté
  automatiquement à un résident mobile ou à un combattant de campagne.
- Les dix gardes régionaux immobiles utilisent un autre lot, les sentinelles
  des dix clans V4, selon les bindings adultes/classic documentés du provider
  `homeworldRegionalWatchArtV86`. Les corps mobiles, autres morphologies,
  identités personnelles et comportements existants sont conservés.

## Écart trouvé et corrigé par le propriétaire du provider

Quatre entrées V6.8 appartiennent à `human-accepted`. Leurs fiches décrivent
explicitement des humains biologiques adultes portant de l’équipement culturel
Yautja ; la fiche `human-accepted--gardes-03` interdit notamment mandibules,
appendices ou proportions biologiques Predator. Leur présence dans la famille
générique `npc` et dans la bibliothèque est correcte.

Le provider `findImportedYautjaArtV85` acceptait initialement ces quatre entrées,
y compris par ID explicite. Le propriétaire l’a corrigé : la lecture indépendante
actuelle confirme un résultat nul pour les quatre IDs et leurs recherches
historiques. Les fiches restent disponibles par `recentSpriteByIdV85` et dans
la bibliothèque. Aucun binding régional de garde ne les utilise.

## Limites documentaires restantes

1. `RECENT_SPRITE_GROUPS_V85` exporte uniquement les groupes du lot local initial.
   Huit groupes V6.8 ne sont donc pas dans cet export : `city-hunter`,
   `human-accepted`, `pilot-kok`, `grendel-kok`, `alpha`, `bionic`, `oni-kok`,
   `four-armed`. L’interface actuelle reconstruit les groupes depuis les assets
   et les affiche ; le déficit concerne l’export de métadonnées. Un futur
   consommateur ne doit pas prendre cet export pour la totalité du registre.
2. Les 72 nouveaux champs `masked` restent vides et 32 `morphotypeId` sont vides.
   Leur absence n’autorise aucune attribution de masque ou de morphologie par
   défaut. Le texte source décrit des anatomies et équipements spécifiques ;
   les 18 groupes ne sont pas une correspondance implicite avec les dix clans
   régionaux. Ces données restent des références statiques avant tout binding
   corporel plus précis.
3. Les marges alpha significatives enregistrées à seuil 16 sont positives,
   mais 60 PNG présentent au moins une marge inférieure à 40 pixels. Certains
   prompts demandent 40 pixels : cette cible de production ne doit pas devenir
   une affirmation de mesure. Les faits d’alpha proviennent de l’importeur et
   des fiches préservées ; cette revue n’a pas décodé de nouveau chaque alpha.
   Une petite marge positive ne prouve ni coupe ni adaptation sûre à tout
   renderer. Les PNG restent inchangés.
4. Le codex conserve la phrase historique « sans test, audit, build local ou
   examen navigateur exécuté » pour toutes les fiches. Elle décrit l’étape
   initiale V85 et ne résume plus la totalité des travaux suivants. Les tests
   ciblés des gardes et la présente comparaison de sources existent ; aucune
   conclusion de suite globale verte ou de validation navigateur n’en découle.
5. L’importeur garde les sorties dans le projet et refuse les chemins ZIP
   absolus ou contenant une remontée. Le nom de l’archive issu du reçu est
   utilisé directement sous `downloads` ; les quatre reçus actuels nomment
   les fichiers attendus. Avant une réutilisation avec des reçus non maîtrisés,
   ajouter un contrôle du nom et du chemin final de cette entrée serait un
   durcissement utile. Aucun échappement effectif n’a été observé ici.

## Serveur SSR isolé pour inspection

Script ignoré : `work-local/v86/qa/components-ssr-server.mjs`.
Adresse locale : `http://127.0.0.1:4208/`.

- `/region?region=storm-chain` : véritable `HomeworldRegionV68`, checkpoint QA
  valide sur l’approche publique du watcher-b, avec le voile initial réel.
- `/region?region=storm-chain&inspect=1` : même composant et même état ; une
  règle CSS QA cache seulement le voile de pause pour voir les pixels. La
  scène reste réellement `paused=true`, `ready=false`, sans déplacement.
  Les dix régions réelles sont accessibles depuis l’index.
- `/library` : véritable `RecentSpriteLibraryV85`, page initiale et sources
  réelles. Les nouveaux imports ne sont pas artificiellement présélectionnés.
- `/war` : véritable `ClanWarBibleV6Panel`, section initiale de simulation.
- `/war-exercise` : véritable `ClanWarExerciseV6`, reducer dans son état initial
  et règles `DEFAULT_WAR_RULES_V6`, sans résultat ni sauvegarde de campagne.
- `/garrisons` : document QA des 72 reçus PNG, explicitement distinct de la
  bibliothèque du jeu et d’une scène jouable.

Les six routes ont répondu HTTP 200. Les marqueurs du watcher natif, de la
bibliothèque, de la Bible et de l’exercice proviennent des composants réels.
Le serveur sert les PNG originaux sans transformation et n’accepte aucune
écriture. Les callbacks régionaux refusent toute sauvegarde.

Il s’agit de SSR statique : pas d’hydratation, filtre actif, mouvement,
préchargement à effet React ou test de focus. Le message initial « Chargement »
de la bibliothèque ne peut donc pas être effacé par son callback `onLoad`.
La caméra conserve la taille initiale SSR de 1200 × 720. Les noms CSS-module
sont isolés à partir des CSS réels ; les utilitaires Tailwind et polices Next
ne sont pas compilés. Aucune preuve mobile, campagne ou navigateur réel n’est
revendiquée dans ce document.

Reçu détaillé ignoré : `work-local/v86/qa/recent-import-provenance-facts.json`.
Script reproductible : `work-local/v86/qa/review-recent-provenance.mjs`.
