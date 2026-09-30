# V57 — poursuite du classeur The Pit

Date : 30 septembre 2026. Source utilisateur lue sans modification : `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx`, SHA256 `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`.

## Lot réalisé

| Demande | Implémentation | Limite conservée |
| --- | --- | --- |
| Équipement cohérent de Jungle Hunter au duel final | Apparence séparée, deux vues natives sans masque/canon/harnais, plasma désactivé uniquement pour cette variante | Deux poses tenues ; pas un cycle animé complet ; autres variantes démasquées inchangées |
| Capteur mécanique de Falconer | Un seul drone, même identifiant lors du rappel, retour après repérage, aucun dégât ni tir, compatibilité des replays historiques | Rendu du dispositif existant ; scénario Hanzo et liste complète des coups encore à produire |
| Confrontations de récit du classeur | Quatre rencontres CPU : Berserker–Classic, Enforcer–Bad Blood, Greyback–City Hunter, Machiko–Tichinde ; contexte, abandon, résultat et reprise | Extraits d'étape 7/8 explicitement signalés ; pas les campagnes complètes, aucun gain persistant |
| Marteau de Valkyrie | Huit dessins natifs OpenAI, quatre par côté, technique debout synchronisée avec le moteur et garde tenue | Apparence V31 du jeu uniquement, pas 18 familles ni fidélité commerciale 1:1 certifiée |
| Spectateurs des arènes 016/035 | Gestes espacés, réactions de manche, arrêt en pause et mouvement réduit | Réutilisation de six dessins existants ; pas les 522 événements du classeur |

Les sources précises par cellule, choix de lore et limites se trouvent dans `v57-equipment-drone.md`, `v57-narrative-trials.md`, `v57-valkyrie-hammer.md` et `v57-stage-life.md`. Les branches narratives alternatives ne sont pas présentées comme des événements canoniques. Aucun figurant nommé n'est ajouté aux gradins.

## Vérification et corrections

Le premier passage global a relevé huit contrats de tests devenus obsolètes : compte de surfaces chargées à la demande, verrouillage narratif, recette du drone, affichage de technique, inventaires d'animation et distinction entre archives V44 originales et variante V57 générée. Les 410 images d'archives restent vérifiées au SHA exact ; les deux nouveaux PNG font l'objet de contrôles séparés.

La première recette du build a révélé une erreur réelle de télémétrie : un champ `projectiles` inexistant interrompait le lancement des duels. Le compteur utilise maintenant les vraies entités de technique et filtre le plasma. La revue croisée a également corrigé le filtre de fin de match qui empêchait Greyback et Machiko de transmettre leur résultat au récit. Les échecs sont conservés dans `work-local/v57/qa`, distincts des nouveaux rapports.

Le moteur passe de V7 à V8 pour le drone rappelable. Les archives d'entrées V7 gardent leur ancien comportement et checksum ; les anciens snapshots repris sont migrés. La variante de duel final ne peut pas être introduite dans une archive prétendument antérieure.

Les recettes navigateur utilisent des sauvegardes synthétiques dans des contextes Chrome jetables, les sélections visibles et les commandes de jeu. Les observations Canvas sont passives. Une recette mobile simule un écran tactile, elle ne vaut pas essai sur matériel physique.

## État de livraison

Qualification locale : 1 827 / 1 827 tests de régression réussis, puis 23 / 23 contrôles ciblés après séparation du callback narratif. ESLint : zéro erreur, trois avertissements préexistants sur les images natives des catalogues de clan et de compagnons. Compilation Vinext réussie ; compilation Next.js de publication et son contrôle TypeScript réussis. Le laboratoire et les deux combats Valkyrie passent aussi sur le serveur Next.js, avec les dix groupes de vérification de la recette, avant publication.

Recettes réelles : six groupes / huit duels d'équipement et de drone, dix groupes de laboratoire et de combat Valkyrie, trois scénarios de spectateurs, douze groupes narratifs. Le candidat définitif passe en plus six groupes ciblant les fins Greyback/Machiko, leur callback dédié, reprise/abandon, les deux formats mobiles et le retour sans progression. Les captures sont inspectées et les limites détaillées dans les notes de lot. Les quatre PNG natifs servis localement sont identiques octet pour octet aux fichiers validés. L'apparence de nouvelle partie, Homeworld et les autres chantiers ne sont pas déclarés achevés par cette passe.

Les références de publication seront consignées après confirmation distante. Ne pas confondre les anciens builds V56, les recettes dev et la publication V57. Aucun nouvel exécutable Windows V57 n'est déclaré dans ce lot.

## Restant du classeur

Les mini-campagnes en huit étapes, les stages spéciaux à objectifs, les séquences narratives dédiées, l'ensemble des 18 familles d'actions par personnage, les planches des dispositifs encore manquantes et les événements de décor non cités ci-dessus restent ouverts. Le nombre de lignes inventoriées, de scènes déjà accessibles ou de clips présents n'est pas un pourcentage d'achèvement du jeu.
