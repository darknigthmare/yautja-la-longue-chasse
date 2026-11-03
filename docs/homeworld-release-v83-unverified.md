# Homeworld V83 — maisons, métiers et ascenseur à appel

Ce lot poursuit les deux briefs Homeworld V81 dans le jeu existant. Il ne livre pas l'intégralité de la cité, des animations et des régions demandées. La V82 `e0229384387d17eb5349cceae019d655f3c6479a` a été publiée par Git et son reçu Vercel a été observé `READY` en production ; ce statut ne certifie pas le comportement du jeu publié.

La consigne actuelle est de commit et publier **sans vérification**. Aucun test, audit, lint, typecheck, build local de validation, inspection navigateur ou recette publique V83 n'a été exécuté. Le build obligatoire de publication Vercel reste inchangé. Les résultats anciens ne constituent pas une validation de ce lot.

## Tissu urbain et décors natifs

Huit façades de décor fermées réemploient huit sources architecturales natives distinctes : deux V81 et six V76. Les parcelles et seuils graphiques sont adaptés aux proportions des dessins, à échelle uniforme ; les orientations existent dans les PNG et ne sont pas fabriquées par rotation ou écrasement CSS. Ces huit volumes ne sont pas huit nouveaux bâtiments visitables. Les 43 identifiants visitables existants et leurs services restent conservés.

Cinq nouvelles images OpenAI séparées sont enregistrées dans `public/game/homeworld/v83/` : comptoir marchand oblique gauche, établi de forge oblique droit, rack de fret droit, jardinière de basalte gauche et stèle de clan droite. Les dessins, prompts, sources, dimensions, alpha et SHA sont consignés dans `homeworld-native-prompts-v83.json` et `homeworld-native-props-v83.md`. Le premier cadrage tronqué de la stèle est conservé parmi les références de génération ; seul le dessin complet est actif.

Le fournisseur de décor extérieur expose douze placements candidats. Il refuse à l'exécution ceux qui empiètent sur les portes, voies, usages, volumes et sols existants, sans les déplacer automatiquement ni réduire leur dessin. Le nombre réellement retenu et leur lisibilité en jeu ne sont pas certifiés. Les pivots d'appui, empreintes physiques, rendu et fiches de codex partagent les mêmes données ; la boîte alpha entière n'est pas utilisée comme collision corporelle.

Les cinq sources sont ajoutées au préchargement réel du Hub. Les capsules du comptoir, outils de l'établi et caisses du rack sont intégrés à leur dessin : ils ne comptent pas comme autant de sprites indépendants, d'objets collectables, d'armes canoniques ou de récompenses. Les décorations sont des créations compatibles avec l'univers du jeu, sans prétention de plan officiel, d'emblème canonique ou de reproduction 1:1.

## Trois complexes publics

Le marché, la forge et la loge sont recomposés en cinq zones fonctionnelles chacun. Les éléments historiques sont repositionnés, pas supprimés, et quatorze instances supplémentaires de mobilier sont ajoutées au total. Ce ne sont pas quatorze nouvelles images : deux instances utilisent le nouveau comptoir et le nouvel établi V83, les autres réemploient les sources natives existantes.

Les zones de passage, de service, de stockage et de préparation sont distinctes. La loge sépare accueil, soins, espace commun et repos ; le marché et la forge séparent leurs allées publiques et leurs réserves. Le service C'ntlip garde sa table, son hôte et son approche, ainsi que ses règles de progression existantes. Le renderer intérieur et le codex contextuel consomment les nouvelles données dans le jeu réel.

Ces espaces restent les complexes publics des bâtiments existants. Le lot n'ajoute pas de suites privées, d'étages habités complets, d'animations de travail ou de nouvelles conversations implicites à chaque meuble. Les accès et dégagements n'ont pas été parcourus après recomposition.

## Une cabine indépendante de l'étage du joueur

L'ascenseur conserve une position locale par identité de partie et session d'onglet. Il ne se retrouve plus automatiquement au palier du joueur après un escalier, une porte ou un retour de région. Depuis le palier opposé, la première interaction appelle la cabine à vide ; une nouvelle interaction après son arrivée embarque le joueur. Le trajet passager existant de cinq secondes et sa phase d'embarquement sont conservés.

Les appels et trajets avancent avec l'horloge active du Homeworld, sans rattrapage lors d'une pause, carte, dialogue ou perte de focus. Le stockage utilise une clé `sessionStorage` dédiée et une mémoire locale ; il ne change pas le schéma des sauvegardes de campagne et ne synchronise pas la cabine entre comptes, appareils ou onglets. Un rechargement pendant un trajet reprend le checkpoint campagne déjà enregistré, sans inventer un checkpoint passager.

Le renderer reçoit le véritable état de station pour déplacer la cabine PNG séparée. Il s'agit d'une interpolation d'image native, pas d'une plaquette mécanique à plusieurs frames, d'une porte animée ou d'un service multijoueur. Les détails et limites de conservation figurent dans `homeworld-lift-session-v83.md`.

## Repères sur la carte réellement utilisée

L'atlas du Hub reçoit la partie active et propose une recherche des bâtiments, services, interlocuteurs et sorties visibles sur tous les étages. Un conseil de PNJ est résolu en lieu réel. Un service intérieur est placé sur sa véritable porte extérieure, avec l'étage et les conditions narratives actuelles.

Choisir un lieu affiche son niveau et son emplacement sans déplacer le joueur ni valider un service. Les indications entre étages utilisent les sept connecteurs existants : elles décrivent une liaison topologique, pas un itinéraire A* vérifié ni une promesse de chemin optimal. Les sorties ordinaires fermées annoncent leur condition ; la réserve sensible reste masquée tant que la visibilité narrative existante ne l'autorise pas.

## Travaux encore ouverts

- Les 354 besoins du catalogue cible ne sont pas tous produits. Les cinq nouvelles sources ne constituent pas toute la décoration de la capitale.
- Les quartiers, régions, espaces privés, faune, montures et cycles animés civils demandés restent à compléter.
- La cohérence artistique et la fidélité aux références ne sont pas certifiées à partir des seuls fichiers ou codex.
- La circulation corporelle, les transitions, sauvegardes, performances, clavier, manette et mobile restent sans recette après ce lot, conformément à la consigne sans vérification.

Le suivi V81/V82 reste conservé comme historique. Ce document est l'addendum d'implémentation V83 ; il ne transforme pas une intention, un candidat refusé, un reçu de publication ou une ancienne capture en preuve de jouabilité.
