# V63 — sauvegardes, ancien visage et scènes de The Pit

Ce lot conserve toutes les anciennes images et ne prétend pas terminer le classeur V54. La refonte complète du Homeworld demandée ensuite appartient au chantier V64 ; seule sa simulation de dreadlocks est modifiée ici.

## Changements jouables

- **Têtes** : la forge propose l'ancienne tête V3 comme second choix pour chacune des six morphologies, à côté de la tête référencée V62. Choix indépendant, enregistré et réutilisé en chasse et au Homeworld.
- **Dreadlocks** : sept attaches arrière et ressorts amortis communs à la chasse et au Homeworld. Le placement tient compte des volumes approximatifs du crâne, du cou et du torse et se fige en pause. Ce n'est pas une simulation de mèches 3D.
- **Menu** : cinq campagnes occupées ne désactivent plus Nouvelle partie. Le remplacement exige une confirmation et conserve les anciens checkpoints ainsi que le dernier état vivant dans une copie immuable. La sauvegarde manuelle dispose aussi d'une confirmation vérifiée dans l'interface.
- **Archives endommagées** : les emplacements lisibles restent visibles. Récupération explicite depuis un checkpoint, ou nouveau départ dans un emplacement vide si aucune campagne n'est lisible, avec conservation des données brutes. Les versions futures ne sont jamais écrasées. Un verrou navigateur sans réponse expire après cinq secondes sans écriture tardive.
- **Deux variantes PHG** : Elder rejoint la case Greyback et Captured la case Classic 2010. Chacune possède un portrait et deux gardes de six dessins, une par orientation. Six PNG, 26 dessins ; pas deux nouveaux personnages ni deux kits d'animation complets.
- **Deux stages enrichis** : toit de Gunnison et station AVP Classic 2000 reçoivent chacun trois nouvelles animations indépendantes, soit six PNG / 36 dessins. Les cinq animations antérieures compatibles restent utilisées. Le nouveau fond de Gunnison supprime les civils incompatibles avec la scène ; l'ancienne image et l'animation d'évacuants sont conservées mais celle-ci est désactivée sur ce toit.
- **Quatre arènes originales** : la façade du sol couvre maintenant le recul de caméra dans les arènes 051, 081, 085 et 087. Les textures d'origine restent intactes ; seuls le cadrage natif et le placement runtime changent.

Total de nouvelles images acceptées : **13 PNG / 63 dessins**, dont sept PNG de décor et six de combattants. Aucun fichier d'art antérieur supprimé. Aucun nouveau stage ajouté dans ce lot.

## Validation

Les compilations Next webpack et Vinext, TypeScript et le contrôle des CSS HUD compilés ont réussi. ESLint : zéro erreur, trois avertissements historiques sur des images. Les résultats définitifs de la suite complète, du déploiement et de la recette publique sont consignés séparément dans `v63-release-gates.json`.

Essais locaux : 12 états du menu ; 48 compositions modulaires ; 5 760 configurations de dreadlocks ; forge avec rechargement ; quatre chasses Canvas ; deux variantes de tête en mouvement/pause/freinage au Homeworld ; six parcours de variantes de The Pit et 24 poses ; six stages dans 58 configurations de caméra, 66 poses de fond, puis 13 contrôles dans l'application. Les captures représentatives ont été inspectées. Les tests utilisent des campagnes de test isolées, jamais les sauvegardes personnelles.

## Restes identifiés

- Six dossiers de personnages sans correspondance : Bloodshed, Super Predator de The Last Hunt, AVP Jaguar, AVP Classic 2000, père et fils de Blood Ties. **199/205 dossiers reliés ne signifie pas 199 kits d'animation terminés.** Le roster conserve 199 cases distinctes.
- Les 174 dossiers de stages ont une correspondance parmi 170 cibles runtime ; le jeu contient 187 arènes. Cela ne certifie ni leurs scènes complètes ni une fidélité canonique exacte. 136 dossiers / 135 cibles n'ont pas de registre ambiant natif V60–V63. D'anciennes animations peuvent exister : ne pas confondre absence de ce registre avec absence de toute animation.
- Les exigences littérales des 522 événements du classeur restent ouvertes individuellement, notamment ST103, E62 hors du toit et les chapitres 178–180. La liste complète est dans `v63-stage-open-work.json`.
- Les autres attaques, déplacements, intros, victoires et défaites manquantes des combattants restent à produire. Les références partielles ne justifient aucune annonce de fidélité globale « 1:1 ».
- Le Homeworld V63 n'est pas la refonte complète demandée : perspectives hétérogènes, échelles et intérieurs sont traités dans le chantier suivant. Les archives de remplacement sont conservées techniquement ; aucun nouveau écran de restauration de ces copies immuables n'est fourni ici.

Le classeur source V54 est inchangé. `THE_PIT_V63_SUIVI.xlsx` distingue correspondance jouable, dessins effectivement livrés, réemplois et demandes encore ouvertes.
