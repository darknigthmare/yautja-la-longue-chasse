# Normales Feral et Scar — recette V104

Les neuf attaques normales de chaque combattant utilisent désormais les préparations, contacts, récupérations, dégâts de base et hauteurs proposés dans le classeur. L’activation est explicite dans **Options & parcours → Gestes du classeur · Feral et Scar**, pour un duel CPU, un versus local ou un entraînement. Les données affichées appartiennent aux combattants BODY effectivement sélectionnés.

La source reste l’extraction V56 épinglée par `pitWorkbookAnimationPlanV100.json` : `05_MOVES_PROPOSES!D10:L10` pour Feral et `D7:L7` pour Scar. Le classeur privé V54 demeure absent. Ce sont des propositions originales de simulation, sans certification d’équilibrage ni de canon filmique. Les 18 entrées de `PIT_WORKBOOK_NORMALS_V104` conservent le texte, la cellule et l’identité de chaque action.

## Commandes et portée

L, M et H sélectionnent une normale debout ; bas + L/M/H une normale accroupie ; L/M/H pendant le saut une normale aérienne. La posture source est fixée au début de l’action : l’atterrissage ou une nouvelle direction ne changent ni son identité ni sa récupération. Les neuf attaques reprennent les valeurs suivantes, communes aux deux lignes source :

| Commande | Préparation / actif / récupération, à 60 Hz | Dégâts de base | Garde |
| --- | --- | --- | --- |
| 5L | 5 / 3 / 10 | 45 | Haut |
| 5M | 9 / 4 / 16 | 70 | Milieu |
| 5H | 16 / 5 / 26 | 110 | Milieu |
| 2L | 6 / 3 / 12 | 35 | Bas |
| 2M | 11 / 4 / 21 | 65 | Bas |
| 2H | 14 / 5 / 29 | 90 | Milieu, anti-air |
| jL | 6 / 3 / 12 | 35 | Haut |
| jM | 10 / 5 / 18 | 65 | Haut |
| jH | 15 / 6 / 24 | 100 | Haut |

Les portées, les boîtes de contact, la puissance du combattant, les réactions, les poussées et les limites de combo sont les adaptations existantes du moteur. Puissance et réduction de combo continuent à modifier les dégâts effectivement infligés. Les projections, techniques, accessoires, victimes synchronisées, finitions et autres apparences gardent leur suivi distinct. Cette livraison ne clôt pas les personnages complets ni les autres mécaniques du classeur.

## Dessins natifs

Les 18 atlas V104 exposent 108 clips de phase : trois phases × deux orientations × 18 actions. Ils réutilisent exclusivement les pages et rectangles déjà admis en V100, dont le bouclier Feral V59. Aucun nouveau PNG, miroir, interpolation ou peinture n’est produit. Les répétitions de tenue restent des répétitions ; le passage entre actif et récupération du bouclier historique peut partager le même dessin.

La banque V104 est chargée seulement pour la recette choisie. Les costumes fournis et les autres chasseurs conservent leur banque propre. Les métadonnées de cadrage, pages, références corporelles et poses sont filtrées aux frames réellement conservées ; le validateur complet reste inchangé. Le cadrage du duel inclut l’ensemble des normales de la recette dès son départ.

## Archives et compatibilité

La recette appartient à `rules.normalMoves: "workbook-v104"`, au profil BODY du combattant et à la normale fixée dans son action. **Seuls ces nouveaux snapshots et replays utilisent la version moteur 12.** Les duels sans cette option restent en version 11, avec leurs valeurs et leur sérialisation historiques. Un ancien lecteur 11 refuse donc le snapshot 12 au lieu de réinterpréter silencieusement ses délais.

Le nouveau lecteur refuse un snapshot 11 contenant la recette V104, un snapshot 12 sans recette valide, une recette étrangère ou future, un profil associé au mauvais costume et une normale incompatible avec son bouton. Les rematches, resets d’entraînement et changements de manche conservent la recette sélectionnée. Le sidecar de replays conserve également sa version 12 et son propriétaire.

Les sept fixtures publiées V4–V10 acceptées gardent leurs checksums. L’archive d’équipement V54 continue son refus fermé documenté, avec ses octets et son checksum `4d7dd050` préservés.

## Vérifications

- `tests/pit-workbook-normals-v104.test.mjs` : 11 cas réussis, dont les 18 attaques, les délais des phases, les gardes, l’atterrissage, les refus d’archives, le rejeu déterministe et le chargement des vrais PNG. Le validateur complet accepte les 18 atlas et le décodeur résout les 108 phases natives.
- Groupe final moteur/replays/stockage/movesets V92 et nouveaux tests : 86 cas réussis, zéro ignoré.
- Groupe ciblé projections, équipements Feral/Tracker/Falconer, resets et mouvement natif : 90 cas réussis après la migration optionnelle 12. Ces groupes se recoupent ; leurs comptes ne constituent pas un total de tests uniques.
- Lint strict des fichiers Pit modifiés : zéro avertissement.

`scripts/qa-pit-normals-v104.mjs` conduit le véritable versus local par clavier : choix visible de la recette, 18 normales dans les deux sens, crops et phases réelles, échelle corporelle, pause, mobile et exclusion de costumes fournis. Deux duels mixtes avec la banque V104 réellement activée croisent un BODY et un costume sur les deux côtés. Il observe passivement le Canvas ; aucun acteur ni registre n’est injecté. La recette finale passe312 contrôles sur le build de production `KfYVJdIUFim-1m9MRRQ6_` :36 orientations natives,2 duels mixtes V104 et4 orientations de costumes historiques, sans erreur JavaScript. Les48 captures finales ont été réellement ouvertes par deux inspecteurs et leurs SHA vérifiés. Les reçus, commandes, contrôles et limites sont conservés dans `docs/v104-pit-normals-validation.json`. Les captures seules ne certifient pas la continuité d’animation ni un nouvel équipement canonique.
