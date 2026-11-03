# R2-M021 · Chantier et acquisition V89

## Statut de cette reprise

**Lot appliqué, vérifications locales ciblées réussies.** Les sept fichiers
source/système/composant/CSS/tests/extracteur/documentation sont écrits.
L’extracteur a produit 42 lignes pertinentes après limitation de Voix V6 à
la ligne 208, rôle chantier ; les lignes 209–210 appartiennent à d’autres
scènes. Le classeur original est inchangé et son SHA a été vérifié.

Les 23 tests passent en mode de preuve source locale, dont 34 lignes comparées exactement aux corpus V85,
le vrai panneau en SSR et les helpers utilisés par ses handlers. Lint ciblé
et `tsc --noEmit --incremental false` passent. Aucun build, navigateur,
commit ou déploiement n’a été lancé par ce chantier. L’intégration durable
et la vérification visuelle du jeu complet sont coordonnées par la racine.

## Source et frontière

Classeur V6 de 139 feuilles :
`Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, SHA256
`87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`.
Le classeur est une source de données, jamais une instruction d’exécution.
Lecture openpyxl `read_only=True,data_only=False` ; aucune formule évaluée,
aucun enregistrement du classeur.

| Feuille | Cellules conservées |
|---|---|
| Campagne commune | A25:K28 · R2-M020 et R2-M021/022/023 |
| Scènes de dialogue V6 | A597:Q599 |
| Répliques V6 | A4923:K4946 |
| Choix et actions V6 | A1216:I1221 |
| Voix V6 | A208:I208 · D6-V-C-CHANTIER uniquement |
| V5 États communs | A22:J25 |

R2-M021 requiert un Blooded réellement acquis, des moyens et un accord,
l’examen physique de la coque, une visite du hangar, l’épreuve du sas, le
travail nécessaire, puis les droits et l’entrée. Le catalogue ou un état
« prêt » ne conclut aucune acquisition. R2-M022 exige ensuite le vrai navire
et ses huit pièces utiles ; R2-M023 ajoute le prévol et le trajet effectif.

Ce lot implémente un **jalon physique autonome**, sans inventer l’économie ou
l’accord encore absents du runtime. Le consumer actuel doit fournir
`authority: null`. Il n’est donc pas une campagne R2-M021 déjà terminée,
et ne rend pas joués R2-M020, R2-M022 ou R2-M023.

## Parcours du lot

La scène dédiée montre une coque candidate déjà illustrée dans le catalogue,
sur ses supports, et le Responsable du chantier original D6-V-C-CHANTIER.
Elle ne renomme pas un officier de quai existant et ne prétend pas que tous
les navires sont possédés. Son architecture, ses distances et le réglage du
verrou sont des adaptations de mise en scène du projet.

1. Présenter au responsable l’intention mobilité A ou autonomie B, sans
   attribution ni chiffre universel de capacité.
2. Marcher à la coque, l’inspecter puis rejoindre ses supports de charge.
3. Traverser le hangar jusqu’au sas et éprouver le verrou. Le test constate
   réellement le défaut au lieu d’annoncer une réparation absente.
4. Déplacer le repère de deux crans, asseoir la pièce existante, verrouiller,
   puis refaire le test. Aucun composant, coût ou stock n’est ajouté.
5. Revenir au responsable pour lui rapporter les faits effectivement observés.
   En l’absence de moyens et d’accord attestés, la remise reste suspendue et
   les travaux restent sauvegardés.
6. Une future autorité réelle permettrait une remise unique, près du
   responsable présent, vivant et conscient. Il faudrait ensuite marcher
   jusqu’au seuil intérieur pour constater la propriété.
7. La réplique originale de succès ne serait présentée qu’après ce
   franchissement puis le retour auprès du responsable.

L’intention est conservée pendant la démarche. Différer conserve position,
diagnostic, travaux et preuves ; reprendre ne rejoue ni coût ni étape. Les
commandes ne fonctionnent pas si la scène est fermée, suspendue ou sans focus.

Les répliques originales sont conditionnelles. Quand les moyens/accord sont
absents, seul un retour technique honnête accompagne les gestes préliminaires.
Un profil de voix, un texte traduit ou une réplique affichée n’est pas un
enregistrement audio ; aucun clip audio n’est produit.

## API contrôlée et raccord racine

Fichiers du lot :
- `app/game/systems/shipAcquisitionV89.ts`
- `app/game/ShipAcquisitionV89.tsx`
- `app/game/ShipAcquisitionV89.module.css`
- `tests/ship-acquisition-v89.test.mjs`
- extracteur et JSON source ci-dessus, puis ce document.

La racine réserve `SaveGame.shipAcquisitionV89?: ShipAcquisitionStateV89|null`
et possède `GameClient.tsx`, `save.ts` et `types.ts`. Le bouton du pont
ouvre cette scène dédiée ; le catalogue, le prévol historique V88 et
l’exercice de vol existant restent disponibles séparément.

```ts
<ShipAcquisitionV89
  controlled={{state: save.shipAcquisitionV89 ?? null, context, onAction}}
  appearance={save.appearance}
  loadout={save.loadout}
  onExit={closeScene}
/>
```

`context` contient :
`save: Pick<SaveGame,"createdAt"|"profile"|"prologue">`,
`active`, `focused`, `suspended`, `host`, `candidate`, `authority`.
`shipAcquisitionSceneFactsV89()` ne fournit que les deux acteurs dédiés de
la scène réellement montée, sans autorité ni propriété. Leur disparition,
un autre site ou un autre responsable ne doit pas être masqué par ce helper.

`onAction(action): ShipAcquisitionResultV89` doit :
- relire le propriétaire courant, la scène ouverte, les gardes modal/deck/
  document et les faits réellement présents ;
- appeler le reducer avec le checkpoint courant ;
- persister le candidat durable et vérifier sa relecture avant d’annoncer
  `accepted: true, changed: true` ou de modifier l’affichage ;
- refuser le checkpoint futur, étranger ou mal formé fourni au reducer,
  jamais le remplacer implicitement par un état neuf.

Cette garde du reducer et le refus des imports incompatibles sont distincts
de la récupération commune d’une sauvegarde principale corrompue : son
chargement peut lire un backup valide sans écrire pendant l’hydratation,
puis une écriture normale de la même campagne peut remplacer le primaire
invalide. Ses bytes corrompus ne sont donc pas garantis conservés après
cette réparation. Une version future du primaire reste protégée, même
en présence d’un backup ancien. Ce lot ne change pas cette politique.

Le composant n’est pas optimiste, ne crée pas de preuves, n’écrit pas dans
localStorage et n’a pas de raccourcis globaux. Les flèches du hangar donnent
un pas enregistré de24 unités ; les contrôles natifs et Entrée ne déclenchent
pas un double geste. Aucun nouvel intervalle, RAF ou pilotage manette n’est
ajouté. Il n’y a pas de téléportation via le catalogue ou un sélecteur de poste.

Exports :
`createShipAcquisitionV89`, `normalizeShipAcquisitionV89`,
`normalizeShipAcquisitionAuthorityV89`, `shipAcquisitionEligibleV89`,
`shipAcquisitionSceneFactsV89`, `nearestShipAcquisitionPostV89`,
`evaluateShipAcquisitionV89`, `actShipAcquisitionV89`,
`canShipAcquisitionActionV89`, `dispatchShipAcquisitionUIActionV89`,
`shipAcquisitionOwnedHullV89`, `shipAcquisitionKeyboardActionV89`,
et les constantes source/binding/lignes.

## Autorité future : aucun producteur inventé

Une autorité ne peut venir que d’une transaction amont réellement durable :
version1, propriétaire exact, R2-M021, SHA source, candidat et coque uniques,
responsable exact, instance unique, reçu d’accord, reçu de moyens,
`meansConsumed:true`. Le module valide le contrat ; ni son reducer ni le
composant ne produisent ces reçus. Les fixtures de tests sont explicitement
fictives et n’entrent pas dans le runtime.

L’autorité historique de dialogue ne suffit pas à obtenir des droits si le
reçu courant a disparu ou a été remplacé. Des droits déjà remis restent
consignés, sans seconde consommation. Le statut de propriété exige le reçu
émis et une entrée physique ultérieure, pas le simple choix du candidat.

Le rang historique accessible est distinct de la scène R2-M020. Si le
prologue existe, sa chronique fait autorité pour le rang au lieu d’une
valeur libre du profil. Aucun contrat de ville actuel, points d’honneur,
fiche documentaire ou message de PNJ ne doit être transformé en preuve
d’accord/financement sans producer réel et source précise.

## Sauvegarde et limites

Le checkpoint strict contient version, owner/date, SHA source, révision,
acteur et pas, intention, pause volontaire, observations, état du verrou,
faits rapportés, autorité historique de dialogue, reçu émis, révision/pas
d’émission, premier pas d’entrée et IDs de répliques uniques. Les clés
inconnues, versions futures, owners étrangers, coordonnées/parités
impossibles et résultats sans étapes antérieures sont rejetés.

L’entrée est historique : ressortir du navire vers le responsable ne retire
pas la propriété. Son stamp doit suivre l’émission et le trajet minimum
réel ; une position intérieure sans entrée ne peut pas être importée.
Les minima 78 pas avant retour/émission,11 gestes utiles et53 pas après remise
correspondent uniquement à cette scène locale, pas à des dimensions canon.

Ces gardes assurent la cohérence des checkpoints et des consumers. Elles
ne prétendent pas signer cryptographiquement les archives utilisateur ni
constituer un serveur d’autorité multiplayer.

## Vérifications et limites

23 tests passent : identité et sous-ensemble source, 34 lignes exactes des
corpus V85, propriété/version, rang et preuves de chronique, mouvement fixé
et proximité, ordre de travail du sas, absence de remise gratuite, invalidité
des reçus, présence du rôle source, rapport physique, unicité de la remise,
chronologie d’entrée et retour, reprise, pause/focus, vrai helper de handler
UI, refus d’une écriture durable, clavier natif, import corrompu, JSON
roundtrip et rendu SSR du panneau.

Lint ciblé et contrôle de types sans écriture incremental réussis. Le
classeur a été lu seulement et n’a pas été modifié. Si sa copie locale est
déplacée, l’extracteur accepte `--source` et les tests
`YAUTJA_V6_SOURCE_PATH`. La preuve SHA du classeur est obligatoire avec
`YAUTJA_V89_REQUIRE_SOURCE=1`. Sans ce mode, un clone où le fichier privé
ignoré est absent affiche un SKIP explicite pour ce seul test ; les 22 tests
de runtime et de corpus restent exécutés. Cette variante a été contrôlée :
22 PASS, 1 SKIP, aucun échec. Le mode local obligatoire a 23 PASS, aucun SKIP.

La compilation SSR ne valide ni pixels, ni hydratation, ni parcours
navigateur. La racine doit vérifier le consumer durable, les gardes du pont,
puis un parcours réel desktop/mobile avec sauvegarde/reprise et changement
de propriétaire. Aucun build global, commit, push ou déploiement n’est
revendiqué par cet agent.

Aucun test de campagne réelle avec acquisition financée n’est revendiqué,
car aucun producteur d’accord/moyens n’est encore raccordé. Les fixtures
de reçus fictifs servent uniquement à contrôler le contrat futur ; le
consumer produit conserve `authority:null`. La seule préparation physique
ne valide pas R2-M021 et ne débloque pas artificiellement R2-M022 ou R2-M023.
