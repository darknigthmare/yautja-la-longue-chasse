# Revue visuelle locale des architectures V76

Inspection du2026-10-02, sur les sorties de la première recette, désormais archivées dans `work-local/v76/first-candidate/qa/angles-local`. Aucun navigateur supplémentaire n’a été lancé et aucun fichier du runtime n’a été modifié pour cette revue. Les quinze captures ont été ouvertes et vues individuellement avec l’outil de lecture d’images, sans montage ni retouche. Cette première recette précède les dernières corrections de circulation ; elle n’est pas présentée comme une validation des implantations finales.

Le rapport réellement lu indique PASS :9 contrôles,15 captures,0 erreur JavaScript et0 réponse HTTP en erreur. URL du batch local : `http://127.0.0.1:4194`, contenu attendu V76. Ce sont des preuves locales ; elles ne prouvent pas encore une publication ni une recette publique.

## Captures vues individuellement

Tous les chemins ci-dessous sont dans `work-local/v76/first-candidate/qa/angles-local/`.

|Capture|Constat visuel|
|---|---|
|`convoy-workshop-native-angle.png`|Côté gauche dessiné, angle de toiture et socle cohérents. Passage noir opaque, pieds des jambages au seuil. Le héros est visible devant l’entrée malgré la maison de premier plan atténuée. Les deux cheminées et les baies d’atelier distinguent cette fonction.|
|`convoy-workshop-interior.png`|Deux établis, stockage et parures séparés du couloir central. Héros et sortie sud visibles. Les équipements partagent des matériaux cohérents avec l’extérieur ; aucune prise canonique ni arme particulière n’est prétendue par ces décors.|
|`convoy-store-native-angle.png`|Côté droit réellement visible, dépôt plus bas et renforcé que la vigie. Porte large à sol plat. Le héros n’est pas coupé par le voisinage. Les caisses extérieures ne ferment pas le passage.|
|`convoy-store-interior.png`|Trois travées de stockage et galerie de manutention clairement réparties. Centre dégagé, seuil sud lisible. Les caisses des deux travées latérales réutilisent le même dessin natif : variation de contenu/layout, pas unicité artistique de chaque objet.|
|`dock-control-native-angle.png`|Côté droit, fenêtres cyan de contrôle et grandes nervures de toit. Sol/seuil obliques raccordés au héros. Maison de premier plan atténuée. Cartouche régional secondaire « Chaussée des Cendres » superposé à la fenêtre gauche : défaut d’habillage signalé ci-dessous.|
|`dock-control-interior.png`|Bureau des amarrages à gauche, inspection du convoi à droite, mobilier indépendant. Le préposé habillé se distingue du héros. Couloir et sortie visibles.|
|`trophy-mausoleum-native-angle.png`|Couronne mémorielle et niches vides ; silhouette différente du dépôt. Côté droit et seuil restent lisibles malgré la maison haute devant l’aile droite. Le héros est visible à l’entrée ; aucun trophée non possédé n’est ajouté au dessin.|
|`trophy-mausoleum-interior.png`|Galerie centrale, archiviste en tenue claire, bannière, registre et console de consultation. Sortie dégagée. Cette capture ne teste pas le contenu des huit sockets de trophées ni l’achat DLC ; ces mécanismes nécessitent leurs recettes séparées.|
|`rite-sanctum-native-angle.png`|Côté gauche, couronne et nervures cérémonielles. Portail opaque et assez haut ; bord avant du sol sans marche extérieure visible. Les habitants vêtus de violet et les bannières contribuent à la fonction du lieu. Une façade de premier plan est atténuée pour conserver le héros visible.|
|`rite-sanctum-interior.png`|Passage central vers le représentant vêtu de violet, gong et bannière dans des zones latérales. Seuil sud lisible. La pièce reste un agencement civil original ; elle n’est pas attribuée à un temple canonique précis.|
|`rampart-watch-native-angle.png`|Côté gauche et socle diagonal cohérents. Toit polygonal, fentes cyan et entrée haute identifient la vigie. Héros non occulté au seuil ; portique monumental à droite distinct du bâtiment visité.|
|`rampart-watch-interior.png`|Console d’observation dans l’axe, préparation latérale, bancs et rangement. Sortie dégagée. Les meubles proches de la cloison arrière apparaissent visuellement serrés contre son bord ; leur impression de profondeur mérite une future passe artistique, sans conclure à une collision incorrecte depuis cette seule image.|
|`dock-control-mobile-native-angle.png`|393×852 : héro entier, porte ouverte, sol de seuil et invite « Entrer · Contrôle des quais » visibles. Les ailes sont volontairement hors champ ; le jeu conserve l’échelle du monde. Cartouche « Chaussée des Cendres » ambigu sur la façade gauche. Le premier plan atténué produit des lignes fantômes qui traversent le voisinage du héros.|
|`dock-control-mobile-interior.png`|Héros et seuil « VERS LA CITÉ » entièrement visibles en portrait. La caméra ne réduit pas la pièce entière en miniature ; des ailes latérales sortent du champ. La partie gauche du libellé de zone est hors champ, mais l’invite de sortie reste lisible.|
|`native-angle-codex.png`|Fiche réelle `v76-facade:convoy-store`, empreinte inclinée, seuil et approche, dimensions570×340 et badge « CRÉATION ORIGINALE DU PROJET » visibles. Les contraintes d’angle se trouvent plus bas dans la fiche et ont été contrôlées par le parcours DOM ; cette capture seule montre surtout la géométrie.|

## Bilan et défauts concrets

Sur ces vues, aucun défaut bloquant de porte, d’appui du héros ou de transparence de cavité n’a été constaté. Les côtés gauche/droit, les lignes de fondation et les ailes suivent les angles natifs, sans apparence de simple rotation d’un rectangle. Les figures de premier plan sont atténuées là où elles gêneraient le héros ; celui-ci reste visible sur les six approches. Les six cavités civiques restent opaques, distinctes des arches régionales volontairement traversantes.

Défaut P2 à traiter ou conserver explicitement au backlog : au contrôle des quais, le cartouche du portique régional « Chaussée des Cendres / Approcher le seuil · interagir » se superpose à la fenêtre cyan gauche sur ordinateur et portrait alors que la porte active est `dock-control`. Le bandeau principal annonce correctement « Entrer · Contrôle des quais », mais le libellé secondaire peut faire croire que la façade est la sortie régionale. Ce cartouche n’est pas le texte des balises de direction déjà masqué par la règle V75. Signalement envoyé au coordinateur ; aucun correctif runtime n’est introduit ici.

Limites artistiques non bloquantes constatées : l’atténuation de maisons entières laisse des contours fantômes devant la porte sur les vues atelier/quais/rites, particulièrement visibles sur mobile ; une découpe de toit/facade serait plus nette dans un futur lot modulaire. Les intérieurs ont des plans et fonctions différents, mais répètent encore le même kit de murs et le même sol. Les petites légendes de zones sont discrètes, partiellement cachées sous le héros ou hors champ en portrait ; le seuil principal est lisible. Les parvis sont représentés par des contours de sol géométriques assez simples, sans affirmer un fini artistique commercial de toute la cité.

Les captures sont des arrêts sur image aux approches et aux spawns intérieurs. Elles ne prouvent ni toutes les occlusions en mouvement autour des quatre faces, ni un cycle complet de tous les habitants, ni la fidélité1:1 à un lieu officiel. Les six entrées/sorties au clavier, les six fiches de codex et les six PNG HTTP200/SHA sont prouvés par le rapport du batch ; la visite complète des37 plans et des43 portes reste couverte par les autres recettes coordonnées.

Ces captures appartiennent à une source initiale aux trois offsets désormais remplacés. Les cinq offsets finaux sont : quais(−110,+20), mausolée(−240,−50), rites(+200,−60), atelier(+120,−40), dépôt(−20,−60) ; la vigie reste immobile. Les meubles, balises, le banc et le raccord du mausolée sont décrits dans `v76-homeworld-architecture.md`. Les prochains parcours locaux devront vérifier ces nouvelles implantations et les modifications d’occlusion. La profondeur340, les identifiants de bâtiment/porte et les intérieurs restent conservés ; les positions de toutes les portes ne sont pas inchangées.

## Public

Revue des captures publiques encore à effectuer après READY et après création d’un dossier public neuf. Aucun résultat local ci-dessus n’est présenté comme une recette de production.
