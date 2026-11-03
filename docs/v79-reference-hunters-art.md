# Deux chasseurs référencés V79 — 3 octobre 2026

Deux identités du classeur V54 sont ajoutées à la fin du roster : `add-last-hunt-super` → `user-last-hunt-super`, `add-avp-classic` → `user-avp-classic-2000`. Le roster passe de 199 à 201 cases. IDs, ordre, variantes et pixels historiques restent conservés. Chaque ajout possède une pose bitmap native droite transparente, une icône dérivée et une association à un stage existant de son œuvre. Les PNG ne sont pas des plaquettes d’animation complètes ; le profil de duel reste partagé, sans techniques canoniques exclusives inventées.

## Références réellement inspectées

- Super Predator : grandes silhouettes des planches 3 et 5 de la [preview The Last Hunt #3](https://aiptcomics.com/2024/04/19/marvel-preview-predator-the-last-hunt-3/), avec contrôle de l’œuvre dans le [recueil officiel Marvel](https://www.marvel.com/comics/collection/110461/). Les deux petits chasseurs en médaillon sont exclus. Le premier PNG généré avait une couronne trop haute et un appui arrière ambigu ; il est conservé hors runtime, et une deuxième génération corrige ces deux points.
- AVP Classic 2000 : captures 03, 09 et 10 fournies par la [page officielle du jeu Rebellion](https://store.steampowered.com/app/3730/), avec vérification des armes dans son [manuel](https://store.steampowered.com/manual/3730). Il s’agit du modèle joueur de cette édition, sans nom individuel inventé ; il n’est pas Classic du film Predators ni un protagoniste AVP 2010. Aucun combi-stick n’est attribué à cette incarnation.

Les références locales demeurent dans `work-local/v79/references`, avec leurs sources et empreintes d’acquisition ; les planches/captures sources ne sont pas copiées dans les assets publics. Les dessins de jeu sont nouvellement produits avec OpenAI. Les origines et SHA exacts sont inscrits dans `scripts/install-pit-reference-hunters-v79.mjs` et `app/game/data/pitUserHuntersV79.json`. Les copies runtime sont byte-identiques aux PNG sélectionnés ; seul le thumbnail WebP est redimensionné.

## Limites et restant du classeur

Apparence référencée, aucune certification 1:1 des surfaces cachées ou microdétails. Les armes et mains sont contrôlées visuellement. Le miroir vers la gauche est une convention provisoire du renderer, pas un dessin gauche indépendant. Les appuis sont mesurés sur les pixels alpha ; à l’échelle de combat l’écart de profondeur illustrée reste inférieur à trois pixels. Les attaques et déplacements conservent leur pose fixe explicitement déclarée, sans revendication d’animation native.

Quatre entrées de ce lot restent ouvertes : Bloodshed (tenues masquée et démasquée à séparer), joueur Jaguar (silhouette complète encore non vérifiée), père et fils de Blood Ties (attribution individuelle à confirmer). Ne pas considérer leur simple référence visuelle comme une intégration. Les quatre chroniques V79 déjà produites concernent Greyback, Tracker, Machiko et Theta, pas les deux nouveaux chasseurs.
