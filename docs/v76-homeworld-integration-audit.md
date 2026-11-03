# Relecture de l’intégration Homeworld V76

Audit des sources en lecture seule, effectué le 2 octobre 2026 avant les parcours navigateur finaux. Aucun changement du runtime n’a été effectué par cet audit.

## Périmètre

`HomeworldHub`, `HomeworldCityScene`, `HomeworldOutskirtsV71`, `HomeworldElementCodex`, `homeworldContextCodexV71`, `homeworldSceneAssetsV76`, `useHomeworldMotionAssetsV74`, ainsi que leurs contrats de géométrie, façade, mobilier et collision.

## Contrôles effectués

- Import réel du registre agrégé : **2 078 fiches** sur le plan final avec ses six parvis et sa liaison latérale, aucun identifiant en double, aucun lien associé absent, aucune position ou dimension non finie ou négative. Les liens `exit:<buildingId>` pointent vers les sorties existantes. Le premier relevé de 2 071 fiches précédait ces sept sols ajoutés.
- En-têtes des **15 PNG de scène** comparés aux dimensions du manifeste : tous identiques. La déduplication porte sur l’URL complète de la source, non sur les cellules d’un atlas.
- Graphe des imports de valeurs : 111 modules parcourus, aucun nouveau cycle dans les ajouts V76. Le cycle entre `youthCampaign` et les campagnes 66/67/68 est antérieur à ce lot et ses quatre sources ne sont pas modifiées.
- Chargement V74 existant : **8/8 tests réussis**, dont annulation du décodage et des requêtes de reprise.
- Fixture supplémentaire avec les **39 sources jeune + scène** : cinq contrôles réussis — une URL dupliquée décodée une fois, erreur d’un décor maintenant le blocage après 38 décodages réussis, dimensions de décor incompatibles refusées, reprise des 39 URL originales, annulation des 39 images en attente sans publication tardive.
- Test intérieur V76 : **47/47 réussis** après correction des deux erreurs de lint du test ; lint de ce fichier : code de sortie 0. Les anciennes données de pièce sont toujours vérifiées séparément du champ de décor V76.

## Contrats relus

Le jeu n’accorde aucun service ou récompense à partir de ces nouveaux décors. Les identifiants persistants des bâtiments, portes et interactions ne changent pas. Les placements de décor restent des données statiques ; aucun nouveau champ de sauvegarde ni déplacement automatique n’est introduit.

La liste supplémentaire de sources passée au hook est une constante de module, donc les mises à jour du joueur ne relancent pas son effet. Une nouvelle tentative ou un changement de liste rend immédiatement le résultat non prêt. Les commandes, les invites de déplacement et la simulation restent bloquées jusqu’au résultat prêt ; les anciens callbacks de chargement sont abandonnés à l’annulation. Le hook conserve des métadonnées, pas une banque d’images décodées.

Pour les façades obliques, le tri du renderer et l’atténuation utilisent désormais la même profondeur interpolée sur le segment de fondation, à l’abscisse du joueur. Le seuil, l’approche et le polygone de devanture proviennent du même contrat mesuré ; aucune rotation du bitmap ne fabrique l’orientation.

## Limites et points mineurs

Le poids reste élevé : les 15 sources de scène représentent **29,896 Mio** de fichiers PNG et **89,996 Mio** de pixels RGBA. Les 39 sources avec le jeune représentent **69,611 Mio** de fichiers et **233,985 Mio** de pixels RGBA. Ce calcul ne mesure pas la mémoire totale du navigateur, les copies GPU, la politique d’éviction du cache ni les autres écrans. Il ne prouve pas le confort sur un téléphone à mémoire réduite ; les captures en émulation ne remplacent pas un essai sur ce matériel.

Certains anciens meubles V72/V75 affichent leur hauteur peinte dans la fiche historique, tandis que les fiches V76 soustraient la profondeur projetée pour estimer la hauteur physique. Cela n’altère pas leur collision ou leur dessin ; une harmonisation documentaire peut préciser ces deux mesures. La hauteur estimée et les angles demandés à la génération ne constituent pas une reconstruction 3D calibrée ni une preuve de fidélité canonique 1:1.

L’écran de chargement conserve les libellés génériques « Animations » et « Réessayer les animations », même lorsqu’un décor est en cause. Le diagnostic d’erreur précise néanmoins le décor et son URL ; ce point est éditorial.

Cet audit ne remplace pas les sept entrées de pièces jouées au clavier, les six approches de façades obliques, le contrôle de collision du nouveau rayonnage, la composition portrait, les essais de reprise ni les vérifications de publication. Ces parcours sont exécutés séparément par le lot QA du parent.

## Régression complète examinée après cet audit

La suite ancienne V74 a ensuite signalé une approche isolée aux parures de The Pit, que les premiers contrôles V76 ne vérifiaient pas individuellement. Le nouveau rayonnage `pit-gate-v76-1` est seul déplacé de512/240 à176/296 ; les anciens meubles et les92ajouts restent conservés. L’approche historique revient de66,057 à18,016 unités. Le test V76 exige désormais une approche<60 pour chaque ancien meuble, sauf l’unique meuble d’archive V72 déjàà78sansV76, dont la baseline est calculée et strictement préservée. Les trois suites d’intérieurs passent ensemble **132/132** et le lint ciblé passe. La description exacte, l’exception préexistante et la portée des nouvelles preuves figurent dans `v76-homeworld-interior-decor.md`. Les parcours navigateur doivent être rejoués sur le build contenant ce correctif ; les résultats antérieurs ne sont pas présentés comme un nouveau build final.
