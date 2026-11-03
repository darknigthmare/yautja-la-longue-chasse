# V22 — Structures et installations modulaires du vaisseau

Ce lot complète le niveau à deux ponts livré en V21. La révision V21 `1636bcc` a déjà été publiée sur https://yautja-la-longue-chasse.vercel.app. Ce document décrit la révision V22 préparée pour le même site ; les preuves du déploiement correspondant sont conservées dans `outputs/qa-ship-v22/` après publication.

Les descriptions du grand pont rectangulaire et des portes encore à construire dans `continuity-delivery-2026-08-31.md` et le contrat V20 sont historiques. V21 les a remplacées par huit salles reliées, des coursives, des puits, des portes motorisées et des reliefs internes. V22 conserve ce niveau et habille ses surfaces et installations ; il ne crée pas un troisième hub.

## Contenu intégré

Sept images ont été générées séparément avec OpenAI. Chaque ressource possède une source PNG conservée (`<id>.generated.png`), un master RGBA (`<id>.png`) et un export WebP transparent. Les sources et métadonnées sont dans `art-source/v22/ship-interior/`, les fichiers servis dans `public/game/ship-interior/v22/`. Les sept WebP totalisent **715 648 octets**.

| Identifiant | Module et usage dans le niveau |
| --- | --- |
| `floor-edge` | Bord de sol répété horizontalement, épaisseur visible de 20 unités |
| `gantry` | Passerelle répétée horizontalement, épaisseur visible de 16 unités |
| `service-ladder` | Échelle répétée verticalement, largeur visible de 56 unités |
| `medbay-bed` | Lit de la baie médicale, indépendant de sa console |
| `armory-rack` | Râtelier vide recevant les images des armes réellement équipées |
| `archive-terminal` | Borne propre aux archives, remplaçant leur console générique |
| `forge-station` | Installation de forge, remplaçant l'alcôve composée d'un cadre de porte |

Le registre `app/game/shipInteriorV22.ts` est séparé du kit V21. Il expose les dimensions source, les contours alpha, les pivots et les tailles nominales. `ShipLevelScene.tsx` consomme ces données : les surfaces utilisent des modules répétés à échelle constante, sans étirement sur toute la longueur du couloir ou du puits. Les dernières pièces sont limitées à la surface à couvrir.

Les collisions, les points d'interaction, les portes et les accès restent définis par `shipLevelLayout.ts` et le moteur physique. Un détail peint ne crée pas d'obstacle. Armes, équipements et trophées demeurent des couches séparées issues des données du joueur ; les meubles ne contiennent ni équipement attribué artificiellement ni trophée peint dans un fond. Les textes et les commandes restent programmés.

## Sources, traitement et contrôle artistique

`generation-prompts.json` conserve les prompts et les références de production. `alpha-preparation.json` décrit le retrait technique des fonds neutres, et `manifest.json` distingue les sources, masters et exports avec leurs propriétés et empreintes. Le traitement alpha conserve les canaux RGB des sources, sans redessin, redimensionnement ni découpe ; les PNG reçus restent intacts. Le nom exact du modèle n'a pas été retourné et n'est pas inventé.

Le rapport `outputs/qa-ship-v22/art-audit.json` indique la réussite du contrôle technique des sept modules. Ce résultat ne constitue pas un essai interactif du jeu. Les commandes de reproduction sont :

```sh
npm run ship-interior:v22:prepare
npm run ship-interior:v22:export
npm run ship-interior:v22:audit
```

## Preuves de validation

Neuf vues statiques du composant réel `ShipLevelScene` sont conservées en SVG et PNG dans `outputs/qa-ship-v22/` : infirmerie, armurerie, archives, forge, navigation, sas, galerie, galerie avec une collection de test et vue d'ensemble. Leur manifeste conserve la méthode et les empreintes des sources utilisées.

Ces vues sont produites par rendu React côté serveur puis rasterisation SVG. **Ce ne sont pas des captures navigateur.** Le rig `HunterRigPreview`, construit en HTML/CSS dans un `foreignObject`, est omis sans personnage de remplacement. Les WebP sont réencodés en PNG pour ce seul export, avec égalité vérifiée des pixels décodés ; aucun asset runtime n'est réécrit. La galerie remplie emploie huit vrais trophées V15 comme données de test explicites, sans modifier une sauvegarde ni prétendre qu'ils appartiennent au joueur.

Les 391 tests du dépôt ont réussi, sans échec ni test ignoré. ESLint et TypeScript ont réussi, ainsi que les builds Vinext et Next.js. Les audits du kit V21, du lot V22 et des assets de vaisseaux existants ont réussi. Les 39 contrôles HTTP locaux couvrent les deux pages, les 14 scripts initiaux, les images V21/V22 et témoins V20/V15 ; les images servies correspondent exactement aux fichiers locaux par SHA-256 et les chemins privés répondent 404. Le contrôle de paquet Vercel porte sur 1 877 fichiers ordinaires : sept WebP V22 et aucun fichier privé. Les journaux, neuf vues finales, planche des silhouettes et rapports sont dans `outputs/qa-ship-v22/`. La publication est ciblée sur l'URL canonique ci-dessus ; le rapport HTTP public et les métadonnées de déploiement sont enregistrés après publication. Aucun contrôle navigateur du focus, du clavier, de la manette, du tactile, des animations ou d'une sauvegarde en direct n'est revendiqué par les exports SSR.

## Périmètre restant

Ce lot ne termine pas tous les meubles possibles du vaisseau : les supports de trophées, le simulacre d'entraînement et le pupitre du sas conservent leurs compositions existantes. Il ne modifie pas la progression, les récompenses ni les missions.

Le backlog historique des décors V19 reste distinct : **452 paires master/runtime présentes sur 800 prévues, soit 348 absentes**, selon l'audit antérieur. Aucun de ces lots de biome n'est traité ou déclaré terminé par V22. Ce décompte ne constitue pas une nouvelle inspection visuelle exhaustive des 452 images. Les 348 ressources absentes restent à produire dans des lots distincts.
