# Homeworld V84 — quais, convois et haltes civiles

Ce lot reprend la base V83 `9456292f1e60f506b0c982187ca782eefbab2a81`, publiée sur Git et observée `READY` en production au lot précédent. Il poursuit les briefs Homeworld archivés sans remplacer le jeu, ses sauvegardes ou ses assets historiques. La refonte complète de la capitale et de toutes ses régions reste ouverte.

La consigne de l'utilisateur demeure **commit et publication sans vérification**. Aucun test, audit, lint, typecheck, build local de validation, inspection navigateur, parcours mobile ou recette publique V84 n'a été lancé. Le build nécessaire à la publication Vercel reste inchangé. Le reçu de publication ne constitue pas une validation du jeu.

## Contrôle des quais, atelier et dépôt

Trois intérieurs existants disposent de compositions publiques distinctes : `dock-control`, `convoy-workshop` et `convoy-store`. Les plans différencient accueil et attente, inspection, préparation, stock et manutention selon le lieu. Les mobiliers sont des instances natives séparées ; les rangements et outils fusionnés dans un dessin ne sont pas comptés comme des sprites supplémentaires.

Les enveloppes utiles restent proportionnées aux bâtiments physiques existants. Apparitions, sorties, identifiants persistants, officier, preuve du convoi et services historiques restent ceux du jeu. Une zone de stockage ne donne pas de cargaison gratuite ; le poste de maintenance ne crée pas un nouveau véhicule, voyage ou équipement. Les cloisons et décors sont fournis au renderer et à la collision du même modèle intérieur, avec les fiches du codex contextuel.

Ces trois plans composent quinze zones et quarante-cinq instances de mobilier, dont vingt-cinq ajouts. Sept cloisons comprennent les six identifiants historiques conservés et un écran supplémentaire ; dix repères de traversée sont composés à 144–162 unités. Le registre détaillé figure dans la note dédiée du lot. Ces mesures de composition ne constituent pas une certification d'accès ou de circulation corporelle après le lot.

## Quatre nouvelles sources indépendantes

Le lot produit et conserve quatre PNG OpenAI à transparence native : console de maintenance droite, meuble fermé de soins gauche, râtelier de pratique gauche et brasero rituel droit. Ils sont copiés sans transformation dans `public/game/homeworld/v84/`, avec leurs dimensions et SHA ; les paramètres exacts restent dans `homeworld-native-prompts-v84.json` et les sources originales dans le dossier de génération.

Les hauteurs du monde, appuis au sol, pivots, faces d'usage et orientations proviennent du fournisseur de placement. Un fichier de 1254 pixels ne devient pas un objet de 1254 unités. Les contours de contact, positions et échelles sont communs au dessin, aux collisions et au codex. Les orientations sont peintes dans les PNG, sans rotation ou déformation pour les simuler.

Les nouveaux candidats de décor extérieur préservent les portes, voies, paliers et usages existants, y compris ceux des anciens décors V83. La politique de placement du runtime peut refuser un candidat incompatible ; celui-ci reste inventorié, sans être déplacé ou réduit arbitrairement. Le nombre réellement visible n'est pas certifié par cette note. Le Hub précharge les quatre nouvelles sources utilisées dans les scènes.

Ces créations sont des meubles originaux de la cité du jeu. Aucun contenu d'arme canonique, accessoire officiel nommé, écriture Yautja officielle, emblème ou reproduction 1:1 n'est affirmé. La flamme du brasero reste peinte dans une image statique ; aucune animation mécanique ou sociale à plusieurs frames n'est livrée par ces PNG.

## Des rythmes différents pour les habitants

Les habitants existants suivent les segments de leur trajet, à leur vitesse propre, marquent une halte au terme du parcours, reviennent puis attendent à l'autre extrémité. Les durées sont asymétriques et les phases désynchronisées selon l'identité et le rôle d'origine. Les familles et groupes de métier sont des descriptions cohérentes des personnes existantes, pas des regroupements spatiaux ou discussions simulées.

Le moteur utilise uniquement l'horloge active de la cité. La recherche du dialogue proche, l'occupancy et le rendu consomment le même alias de pose physique ; les libellés de phase/groupe sont présentés dans le dialogue. Les cellules de marche natives V74 et portraits de halte sont conservés. Le mode de mouvements réduits fige les cellules graphiques sans modifier la position réelle de l'habitant.

Les pauses, carte, dialogues, chargements ou perte de focus ne sont pas rattrapés par le temps réel. Aucun champ de sauvegarde, visite, service, preuve, rang, récompense, costume, accès ou habitant supplémentaire n'est créé. Les fiches de routine décrivent les véritables routes en coordonnées de monde, sans deuxième translation du Port.

Il ne s'agit pas de nouveaux gestes de travail, salutation, port de colis ou conversation animée. Les haltes utilisent les portraits existants ; elles ne prétendent pas montrer la manipulation d'un outil ou un meuble absent.

## Limites conservées

- Les quatre PNG ne terminent pas les 354 besoins du catalogue d'assets.
- Les étages privés, nouvelles régions, quartiers supplémentaires, faune, montures et toutes les animations sociales ne sont pas finalisés dans ce lot.
- L'effet de densité, la cohérence visuelle de la ville entière, le lore 1:1 et les performances ne sont pas certifiés par les sources ou le codex.
- Les sauvegardes et parcours clavier, manette et mobile ne sont pas revalidés après ce lot, conformément à la consigne sans vérification.

Cette note décrit les sources intégrées. Elle ne déclare pas à elle seule un commit effectué, un reçu Vercel `READY` ou une recette de production.
