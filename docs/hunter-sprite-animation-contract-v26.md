# Contrat des animations Yautja V26

Périmètre : personnages Yautja connus, sprites réellement dessinés. Aucun changement du hub, du combat simulé ou des replays.

## État de livraison

Le manifeste art-source/v26/known-yautja/manifest.json contient huit essais sélectionnés, cinquante cellules et leur contrôle individuel. Aucune animation complète de personnage ni aucun clip prêt pour le gameplay n'est déclaré. Une image statique, un segment de rig, une cellule répétée ou une interpolation ne constitue pas une nouvelle pose dessinée.

Le lecteur app/game/hunterSpriteAtlas.ts gère des rectangles, pivots, durées et orientations explicites. Les états draft/rejected/validated sont séparés. Un clip non validé, une page non prête ou une orientation absente renvoie null, sans miroir ni rig de remplacement caché. La grille est optionnelle ; une grille déclarée doit être exactement divisible. La lecture des pixels vérifie la taille, la présence de contenu et les bords.

Les PNG OpenAI actuels sont RGB opaques. Le mode color-key retire la couleur déclarée uniquement du Canvas privé en mémoire. Les sources restent intactes. Les deux essais de transparence ont donné un damier opaque et ont été refusés. Une frange magenta subsiste sur certaines silhouettes après la clé simple : elle est un défaut artistique ouvert.

## Couverture nécessaire avant le mot complet

Chaque combinaison personnage, version, équipement, action, posture et orientation possède son clip. Les deux côtés doivent être dessinés et revus indépendamment pour préserver les asymétries. Ne pas faire disparaître les variantes film/jeu/comic par une déduplication d'alias non prouvée. Les personnages littéraires sans canon visuel fixe restent des interprétations signalées.

PIT :
- Attente, marche avant/arrière, accroupissement et mouvement bas.
- Départ de saut, montée, sommet, chute et réception.
- Gardes haute/basse et réactions aux impacts sur chaque garde.
- Coups reçus debout, accroupi et en l'air ; chute, maintien au sol, relevée et KO.
- light, medium, heavy et technique dans les trois postures autorisées ; anticipation, contact et récupération.
- Projection réussie et ratée ; transitions de camouflage, rupture et instinct.
- Les ressources ne doivent pas imposer de verrou de gameplay supplémentaire.

Chasse :
- Attente, course dans les deux sens pendant la visée, saut, impulsion aérienne, chute, réception.
- Entrée/sortie d'escalade, montée/descente, suspension et saut depuis une paroi.
- Trois frappes de combo, lourde, aérienne, brise-garde, projection, exécution, parade, esquives.
- Visée, charge, tir/recul, lancement/récupération et changement d'arme selon équipement réel.
- Masque mis/retiré, gantelet, scan, camouflage, medicomp, pose/lancer d'équipement.
- Blessure, mort, interaction, prélèvement et levée/maintien/rangement de trophée, embarquement.

Le postulat des conversations ajoute supers, ultime, exécution honorable, fatalité, brutality, autodestruction interrompable et Dernière Chasse. Les systèmes de synchronisation attaquant/victime ne sont pas encore tous présents. Les budgets de finishers ne sont pas des animations déjà livrées.

## Temps et intégration

Le PIT utilise60 ticks/s ; la chasse des durées en secondes. Une animation se cale sur les phases réelles, sans déplacer hitboxes, dégâts ou résolution du replay. Une cellule peut être tenue plusieurs ticks sans augmenter le nombre de dessins.

Exemple Jungle léger PIT : anticipation5 ticks, active3, récupération10 ; sept dessins peuvent être distribués en 2, 3, 1, 2, 3, 3, 4 ticks. Ne pas inventer dix frames visibles dans une phase active de trois ticks.

Pour la chasse, répartir les dessins par poids à l'intérieur des phases réelles de HuntMeleeAttackSpec. La réception et la relevée peuvent nécessiter un état de présentation séparé, sans changer la simulation. Attention aux conventions verticales opposées des deux moteurs.

Les tests couvrent intervalles semi-ouverts, boucles, maintien terminal, refus des orientations absentes, JSON invalide, pages/durées/rectangles incorrects, alpha réel, clé de couleur, damier refusé, contexte Canvas sauvegardé et nombre réel de dessins uniques. Les empreintes distinctes ne prouvent pas une bonne animation : la revue anatomique reste obligatoire.

## Réserves de fidélité

Jungle possède actuellement des mouvements de disque/combistick dans le PIT, et Berserker une onde au sol. Ce sont des adaptations de gameplay, pas des références film à recopier. Valkyrie est associée officiellement au marteau à deux mains ; la lance du jeu ne doit pas devenir un attribut canon exclusif. L'arc de Witch dans le runtime ne certifie pas son identité officielle. Les sources de silhouette sont conservées séparément dans fidelity-references.json.

## Commandes

npm run sprites:qa
npm run sprites:preview

Le lecteur autonome généré dans outputs/known-yautja-v26/preview.html affiche volontairement brouillons et rejets. Il ne modifie jamais les statuts du manifeste et n'est pas une intégration dans le PIT ou une chasse.
