# Production visuelle et sonore — 50 dossiers, aucun asset final livré

Les 50 briefs individuels sont les champs `art_brief`, `silhouette`, `dimensions`, `abilities` et `unique_animations` du catalogue. Les animations communes et comptes de frames proposés sont conservés intégralement dans [metadata.json](catalogue/metadata.json). Le script d'export restitue **un prompt nommé par identifiant** ; il ne génère ni image ni audio.

## Instruction commune à chaque prompt

Produire un concept 2D/2,5D pour Yautja : La Longue Chasse. Sujet entier, sans recadrage, silhouette lisible à l'échelle du jeu, matériaux usés, éclairage neutre. Le brief de l'entrée définit sa différence propre. Dimensions proposées à calibrer face au modèle Yautja du projet, pas dimensions officielles. Le statut de référence de l'annexe prime sur toute mention de fidélité du pack.

Fournir séparément profil gauche, profil droit et vues 3/4 nécessaires à la projection réelle ; face/arrière/dessus seulement si la scène les utilise. Une image par sujet et vue de production. Les planches comparatives peuvent servir au concept, jamais comme atlas runtime improvisé. Aucun retournement horizontal automatique d'armements, glyphes, selle ou coque asymétrique.

Version vide et version occupée, comparaison d'échelle distincte, points d'articulation et états intact/endommagé/critique. Yautja entier et cohérent pour chaque posture : jambes au point de selle, mains à la prise, arme à son socket, pas de collage de membres. Pour les montures : pieds, contacts au sol, poids, inertie, souffle, respiration et ombre cohérents. Ni cavalier ni passager pour un drone autonome. Les silhouettes de référence de taille sont exclues du sprite final.

Fond transparent pour sprites ; gris neutre possible pour concept. Pas de texte, logo, interface ou décor narratif dans un asset isolé. Distinguer support biologique, machine et variante cosmétique. Un skin final peut inclure des trophées, sans pièces flottantes ni collision visible incohérente. Les variantes supplémentaires ne sont pas automatiquement de nouvelles entrées du catalogue.

## Lots séparés

Locomotion ; montée/descente et interaction ; combat ; dégâts/panne/KO ; appel/stockage ; cargo ; effets. Chaque feuille a cellules uniformes, marges anti-découpe, pivot constant, orientation, cadence et ordre documentés. Ne pas rassembler toutes les animations et toutes les vues dans une seule image. Les nombres de frames de metadata sont des besoins, non des fichiers déjà créés. Les familles sans conducteur, sans saut ou sans armement n'héritent pas de clips impossibles.

Cavalier séparé pour synchronisation technique possible, mais silhouette finale toujours entière ; équipements et VFX aux sockets. Respecter `mount_socket`, poignées, arme, propulsion, impact, ombre/contact, attache cargo ; noms définitifs à faire correspondre aux manifestes existants, pas imposés comme déjà disponibles.

VFX à prévoir selon modèle : sustentation, poussière/boue/eau/neige, propulsion, boost, freinage, thermique, camouflage partiel, EMP, surchauffe, fuite, choc, débris, feu, protection, charge, souffle, pas, griffes et sang de fiction non gratuit. Les particules restent attachées au point émetteur puis évoluent dans le bon espace monde ; la traînée suit la vitesse réelle, pas uniquement l'orientation du sprite. Respecter l'éclairage et l'occlusion de la scène.

SFX à prévoir : ralenti, moteur/locomotion par vitesse, départ/arrêt, boost, saut/réception, arme/capacité, dégâts, panne, appel/rappel, ouverture, réparation, cargo ; pour bêtes, pas par matériau, souffle, cris, peur, apaisement, soin et lien. Boucles et transitions sans clic, distances et priorités bornées, aucune lecture audio depuis un placeholder texte. L'ambiance et les 48 prompts musicaux de la bible restent distincts ; pas de nouvelle bande-son annoncée comme livrée.

## Fidélité et validation

Kenner/Badlands : collecter les références primaires exactes avant certification ; ne pas remplacer la silhouette de référence par des enjolivements inventés puis annoncer « 1:1 ». Les mécaniques et armements proposés ne prouvent pas leur présence dans l'œuvre. Concepts originaux de destriers : ne pas attribuer leur dessin à un artiste non identifié.

Contrôles : RGBA avec alpha réellement utile, dimensions, sujet non coupé, pivot, échelle, contacts, sens du mouvement, profondeur, pose du pilote, stabilité caméra, feu/camouflage/cargo synchronisés, toutes vues utiles et lecture en jeu. Les comptes et hashes sont des preuves techniques, jamais une revue artistique humaine. Ne jamais passer `hunterSpriteAtlas.validated` à vrai à partir du seul export.
