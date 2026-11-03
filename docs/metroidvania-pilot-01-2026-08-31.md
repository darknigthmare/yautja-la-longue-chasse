# Région pilote 01 — Branche de la canopée

Cette livraison prolonge l’audit commercial avec un parcours jouable dans **Vey’rath / jungle-vey**. La branche est facultative : les objectifs de chasse, l’Apex et l’extraction restent accessibles au sol. Les sept autres missions ne sont pas présentées comme des régions metroidvania refondues.

## Parcours livré

1. À gauche, une galerie à 232 pixels au-dessus du sol est visible mais hors de portée du saut normal.
2. Le passage inférieur conduit à un module d’impulsion aérienne, accessible sans capacité préalable.
3. Après interaction, la commande de saut permet une seconde impulsion en l’air. Elle se recharge à la réception, pas en attrapant une corde.
4. Revenir à gauche permet d’atteindre la galerie et d’ouvrir son sceau.
5. La cache du clan augmente l’énergie maximale de 15, une seule fois, sans monnaie à récupérer en boucle.
6. La trappe s’ouvre depuis l’étage. Elle permet de redescendre ; une corde permet ensuite de remonter. La chasse principale peut continuer à droite.

Les six salles ont une identité et un niveau physique, avec une carte de pause qui distingue les étages, les accès verrouillés, les salles inconnues et la position. La carte reste un repère : aucun déplacement instantané n’est ajouté.

## Géométrie et présentation

Les dalles, parois et trappes sont des solides, pas des plateformes traversables. Le solveur continu traite les collisions avec murs, plafonds et sols dans l’ordre du mouvement. Les anciennes plateformes traversables conservent leur comportement ailleurs. La zone pilote remplace les supports historiques entre x400 et x2240, qui auraient permis de contourner sa progression. Un mur à droite interdit l’entrée par la vigne extérieure.

Le fond architectural, les colonnes décoratives, les pièces de sol, le sceau, le module et la cache sont dessinés séparément. Les textures de pierre et le sprite autonome du module proviennent des ressources existantes. La cellule d’énergie et les inscriptions ont actuellement un rendu Canvas : aucune nouvelle illustration OpenAI ni finition artistique commerciale n’est revendiquée. Les tirs sont bloqués par les solides du pilote ; les sols traversables ne deviennent pas des murs balistiques.

## Progression et compatibilité

Le schéma de campagne passe à **5**. Les campagnes version 4 reçoivent une progression d’exploration vierge sans perte des éléments existants. Les identifiants inconnus sont filtrés. Capacités, portes, secret et salles découvertes sont fusionnés lors d’un échec, d’un abandon, d’un retry ou d’une reprise. Une découverte valide est enregistrée pendant la chasse, sans attendre une victoire.

La configuration de chasse reste figée pour éviter un redémarrage du moteur après chaque découverte. Les écritures vérifient propriétaire de campagne, tentative, identité et séquence de chasse. En cas de quota ou de lecture indisponible, le résultat reste en mémoire avec avertissement ; ne pas fermer sans export ou confirmation de sauvegarde. Un autre onglet ne doit pas pouvoir écraser une reprise plus récente.

Un ancien checkpoint situé dans une paroi ajoutée est replacé à l’insertion avec un message explicite ; objectifs, inventaire et progression sont conservés. Le bonus est recalculé à partir de l’identité de la cache et ne se cumule pas au chargement.

## Vérification et limites

Les suites exécutent le véritable contrôleur de saut, le système de sauvegarde, les fonctions de checkpoint et les collisions. Des simulations parcourent module → retour → double saut → sceau → cache → trappe, puis remontent par corde. Elles vérifient également les tentatives de contournement et les jonctions entre dalles.

Les résultats finaux de compilation, tests et HTTP sont conservés dans `outputs/qa-metroidvania-pilot/`. Les tests de physique ne modélisent pas l’ensemble du combat, de la boue et du rythme. Le navigateur intégré échoue avant connexion à cause des ACL Windows : aucune partie manette en main, mesure de FPS, certification Steam Deck ou validation de jeu natif n’est revendiquée.

## Suite du chantier

- Jouer et mesurer cette branche sur le matériel cible ; ajuster rythme, lisibilité et sensations à partir de cette observation.
- Étendre le modèle de régions et les capacités aux autres biomes, sans recopier simplement la même boucle.
- Approfondir combat, rencontres et boss ; compléter les ressources artistiques nécessaires au parcours.
- Les 336 références V19 manquantes, la distribution native et les droits commerciaux de franchise restent des sujets ouverts de l’audit général.


## Résultats de livraison

- `npm run qa:release` : lint, TypeScript, audit des paires V19 disponibles, build Vinext et **567/567 tests réussis**, aucun test ignoré.
- Audit V19 : 464 paires disponibles, inventaire inchangé par ce pilote.
- Projection Vercel : **1 899 fichiers réguliers**, sources du pilote présentes, aucun fichier privé interdit.
- `npx next build` : réussi. HTTP local : **60 contrôles réussis**, dont 15 scripts initiaux, code de progression du pilote, empreintes des textures et chemins privés en 404.
- L’identifiant de publication et le contrôle HTTP public sont consignés dans les preuves de livraison ; ne pas les confondre avec un essai interactif.
