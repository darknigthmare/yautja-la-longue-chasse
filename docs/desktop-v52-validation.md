# Recette PC V52

La recette `scripts/verify-desktop.mjs` exécute le véritable EXE Windows construit par les scripts du dépôt. Son adaptation V52 ne constitue pas, à elle seule, une livraison qualifiée. Le résultat de référence est le fichier `verification.json` écrit uniquement après réussite de tous les contrôles, puis l’inspection ASAR/ZIP distincte.

## Isolation et sécurité

La sortie prévue est `work/v52-pc`, choisie par `YAUTJA_DESKTOP_OUTPUT_ROOT`. Les fichiers V41 et les sauvegardes personnelles ne sont pas réutilisés ou supprimés. Le packaging conserve les exigences de sources committées propres, d’empreinte du renderer identique aux sources, de place disque disponible et de chemins de sortie sûrs. Le ZIP Electron 44.2.0 déjà présent peut être utilisé via `YAUTJA_ELECTRON_ZIP_DIR` ; aucun téléchargement n’est nécessaire s’il est valide.

Trois profils QA temporaires distincts sont créés sous le répertoire des preuves :

- **Nouvelle partie** : profil vide, menu immersif, 5 emplacements, création au clavier du cinquième emplacement dans la nurserie, puis chargement réel parmi 10 sauvegardes manuelles et 2 automatiques.
- **Partie adulte historique** : fixture explicitement identifiée pour exercer la migration et les parcours existants. Ce profil ne prétend pas avoir obtenu un vaisseau par le nouveau prologue.
- **Patrouille** : archive V49 réellement jouée, importée dans le seul profil QA avant tout gameplay. Le parcours du mentor, les obstacles, une défaite, sa reprise, les trois charges évitées et le retour sont joués au clavier. Aucune position, santé, phase ou preuve n’est injectée.

Les vérifications historiques restent actives : sandbox et isolation du renderer, absence de Node dans la page, blocage réseau, rejet des fichiers privés et des fenêtres non autorisées, galerie bitmap locale, export natif de sauvegarde, Homeworld/Justice, trois duels supplémentaires, chasse suspendue, puis conservation des données après fermeture réelle et redémarrage à froid. Les tests du protocole refusent toujours les schémas, ports, méthodes et chemins étrangers.

## Ajouts de la recette V52

Les sélecteurs de roster et d’arène passent par l’interface publique actuelle. Le premier duel observe les deux introductions puis chaque chiffre 3/2/1 ; un déplacement maintenu ne doit avancer ni les acteurs ni la simulation avant le combat. Les autres duels attendent la phase de combat réelle. L’horloge contrôlée ne force jamais une phase.

La patrouille conserve les contrôles de la recette web `verify-youth-patrol-v52.mjs`, adaptés aux captures natives de la fenêtre Electron cachée. Les 16 preuves acquises et le retour dans la cité doivent encore être présents après un nouveau processus EXE.

## Exécution et limites

Après les gates de construction et de packaging, avec le même répertoire de sortie configuré, lancer `npm run qa:desktop`, puis `npm run qa:desktop:package`. L’archive portable se construit et se vérifie séparément avec `scripts/archive-desktop.mjs` et `scripts/verify-desktop-package.mjs --zip`.

Les helpers sont `scripts/desktop-current-flows.mjs` et `scripts/desktop-youth-patrol-v52.mjs`. La fenêtre reste cachée grâce au profil QA ; la capture native peut être en retard sur les pixels Canvas, qui sont également exportés pour les duels. Cette recette ne certifie pas la cadence matérielle, une manette physique, une session longue, une signature Windows, une campagne complète ou les droits de commercialisation.
