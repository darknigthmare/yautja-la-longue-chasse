# Berceau enfoui — raccord de campagne du 8 novembre 2026

Ce lot raccorde les douze salles du modèle `buriedCradle.ts` à une scène de jeu,
à la campagne, à ses sauvegardes et au débrief. Il utilise le pack illustré
existant, sans présenter ces 156 imports comme de nouvelles générations.

## Parcours livré

Après les huit chasses de base, le dossier de campagne permet de préparer puis
de lancer le Berceau avec une coque possédée. Une chronique présente doit avoir
reconnu Blooded ; le rite Élite reste indépendant. PLAN08, l'entrée XP-Z11 et la
zone XP-Z12 conservent leurs identités. La pouponnière locale T09 n'est pas le
vestige de reine global XP-Z09.

La scène affiche les douze tableaux, les quatorze liaisons, les deux détours,
les trois raccourcis, le drainage et l'anneau racinaire. La Matriarche expose ses
ancrages, ses membranes puis son bulbe selon les attaques du modèle. La victoire,
le prélèvement de crête, l'extraction et le débrief sont des étapes distinctes.
Un repli physique dans T01, T11 ou T12 laisse intacte une reine encore vivante.
La preuve de chasse de reine exige une crête rapportée et ne déclenche pas le
rite Élite ni une récompense économique implicite.

## Reprise exacte et protection des campagnes

`buriedCradle`, version 1, conserve le propriétaire, la coque, la difficulté,
la progression et un snapshot versionné. Le snapshot contient la salle, la
position, les vitesses, les points de vie, les temporisations, l'état du piège,
l'anatomie et la phase du boss, ainsi que ses nappes acides. Les commandes
maintenues et les objets du navigateur ne sont pas sérialisés.

Les sauvegardes antérieures sans snapshot restent lisibles et repartent de leur
balise. Les nouvelles sauvegardes reprennent leur état exact. Une sauvegarde
manuelle et « Continuer » identifient explicitement le Berceau ; une extraction
ramène la reprise sur le pont. Les archives complètes refusent une coque
différente et une chasse simultanée. Les formats futurs, valeurs incohérentes et
écritures non confirmées ne remplacent pas silencieusement les données existantes.

Les balises intermédiaires suivent le budget 2 / 1 / 0 / 0 de Young Blood,
Hunter, Élite et Elder. Le retour T11→T10→T07 conserve désormais la balise 11.
Un KO conserve les modifications du lieu et reconstruit la tentative de combat
à la balise ; une pause conserve le combat vivant. Le clavier, le tactile et la
manette possèdent des remises à zéro explicites à la pause et à la perte de focus.

## Vérifications exécutées

- 43 tests passent : 16 tests du modèle existant, 18 tests du raccord de campagne
  et 9 tests de snapshot. Le journal intégral est `tests-run.txt`.
- Les tests utilisent la simulation de production : victoire aux trois phases
  par déplacement/saut/lames ordinaires, sauvegardes aux différentes attaques,
  KO, racines, drainage, raccourcis, extraction et reprise.
- Export léger, archive complète, archive de compte, créneaux manuels,
  « Continuer », quota et confirmation incertaine sont contrôlés.
- Le rendu React côté serveur contrôle les vrais composants et leurs commandes.
  Il ne mesure ni les pixels, ni l'hydratation, ni la réactivité d'un navigateur.
- La relecture indépendante et son sondage de simulation sont décrits dans
  `relecture-independante.md` ; ils complètent les tests sans constituer une
  recette de jeu sur appareil physique.
- `node scripts/import-buried-cradle-runtime.mjs --check` compare les 156 copies
  natives et le registre avec leurs sources et empreintes SHA-256.

Commande des 43 tests :

```sh
node --experimental-strip-types --test --test-concurrency=1 \
  tests/buriedCradle.test.ts \
  tests/buried-cradle-campaign.test.mjs \
  tests/buried-cradle-snapshot.test.mjs
```

La vérification TypeScript, le lint et la compilation de production finale sont
consignés dans le dossier parent `verification.json` lorsqu'ils sont terminés.

## Limites conservées dans le suivi

Le lancement local de Chromium est refusé par la politique des sockets Unix
(`socket() failed: Operation not permitted`). L'accès du navigateur partagé au
serveur local a également échoué. La demande d'exécution élargie a été rejetée
automatiquement par la politique d'approbation. Aucune recette navigateur n'est
donc attestée dans ce lot. Le script
`scripts/qa-buried-cradle-browser-20261108.mjs` reste disponible pour une exécution
dans un environnement autorisé.

Les ancrages de bouche et les zones de dégâts sont mesurés dans le code ; les
attaches de tous les sprites et transitions ne sont pas certifiées par une revue
artistique humaine. La géométrie reste une adaptation jouable des planches.
Les commandes sur matériel réel, le mixage complet et les performances mobiles
restent à éprouver. Les compagnons de terrain, transports et extractions de
blessés ne sont pas ajoutés au Berceau par ce raccord. En particulier, XBE-Q23
progresse sur la reprise exacte mais reste partiel sur l'équipe de terrain.
