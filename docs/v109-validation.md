# Validation ciblée V109

Les quatre parcours finaux utilisent le même build de production `pVNPLCZV9ZFtFCd87NSTa`, construit depuis `c97c7d903486ed2c7cb2529ac27f713c0aba8987` après les corrections de revue. Le gel courant contient 1 361 entrées, dont 398 fichiers publics ; son SHA256 est `b4f097daa655b119051675bd7acc2540a90cb4fd466c69955de6c0858519c4c0`.

Le [certificat commun](v109-validation-summary.json) vérifie les quatre résultats bruts complets, leurs sources avant/après, les réponses HTML du build attendu, les empreintes de toutes les captures et leur inspection effective. Les JSON bruts sont conservés en gzip sans perte. Aucun résultat de développement ne certifie ce build.

| Domaine | Contrôles passés | PNG inspectés | Portée jouée |
| --- | ---: | ---: | --- |
| Pit | 65 | 19 | Les deux ordres Feral/Scar, quatre projections, chaque victime peinte pendant 61 frames, déchoppes, victoire réelle sur deux manches et replay exporté/rejoué. |
| Homeworld | 55 | 11 | ROLE03 A/B, consentement, observation, portage de trois pièces indépendantes, échec/reprise, rapport, sauvegarde ; Atlas avant/après une cargaison réellement déplacée. |
| Clans | 38 | 8 | Migration et quota, second onglet V108, six dépôts, même groupe/skiff, chenal, rechargement, retour, conservation des 600 RAV et séparation des montures. |
| Preserve | 50 | 27 | Désert/glace, deux entrées saines avec combat/trophée, tactile, relevés et retours, travaux vivants, sauvegardes et callbacks de campagne. |
| Total | 208 | 65 | Périmètres ciblés, zéro erreur JavaScript ou console dans les quatre parcours retenus. |

Les sources et les images admises restent identiques pendant chaque exécution. Les notes d’inspection sont conservées dans `docs/qa/v109-{pit,homeworld,clans,preserve}/visual-inspection.json`.

## Vérifications locales

La suite V109 initiale a passé ses 95 tests. Après corrections, les 34 tests Pit ont été rejoués et les 11 contrôles du suivi Excel, de son histoire et de la publication sont exécutés sur le suivi final. Les régressions supplémentaires conservées passent également : 135 contrôles de commandes et de cycle de vie, 46 tests V104, 126 tests V105/V106 et 81 tests d’archives. Ces groupes se recouvrent et ne sont pas additionnés. Les 75 assertions V108 originales sont exécutées dans leur capsule historique privée ; elles ne prétendent pas couvrir l’app courante. Les journaux intégraux se trouvent dans `docs/qa/v109-validation/` et `docs/qa/v109-excel-followup/`.

Le build Next de production et les contrôles de types passent. Le lint global termine sans erreur ; ses 171 avertissements concernent des fichiers historiques inchangés. Les contrôles ciblés des nouveaux chantiers terminent sans avertissement.

## Corrections de revue et nouveau certificat

Le titre et la notice Preserve présentent les quatre réserves disponibles. Les cinq lanceurs QA acceptent les deux variables Chromium. Le contrôle des bords natifs compte désormais les pixels ajoutés à leur position réelle et refuse aussi tout retrait du cœur opaque : six cas Python complémentaires et la revue stricte des 48 poses passent. Aucun PNG, rectangle UV ou pivot n’a changé ; les constantes CPU nommées conservent leurs valeurs. Les outils Python locaux n’ajoutent pas de dépendance à la CI.

Les quatre recettes R3 ont été rejouées intégralement sur le nouveau build et leurs 65 captures ouvertes. Le certificat précédent `FJ6IbT6OZx1H51wYnNmex` reste historique, avec ses [métadonnées exactes](qa/v109-review-corrections/previous-certified-manifest.json) et son classeur dans le commit `1252a5909b317d4e0c400683818a3f736b7e6431` ; ses résultats ne sont pas réutilisés dans les totaux courants.

## Essais conservés et mesure des animations

Le premier parcours Pit compilé échouait parce que les lectures ponctuelles du DOM omettaient des états pourtant réellement dessinés. Le diagnostic conserve tous les appels natifs montrant les âges 0–60. Le pilote final exige désormais chaque frame peinte, le PNG et le rectangle exacts de la victime, la trajectoire avec la seule tolérance d’arrondi, les transformations uniformes positives et la continuité entre frames. Le polling brut reste disponible. L’app, le moteur et les PNG n’ont pas changé pour cette correction du protocole. L’échec, ses quatre PNG et son diagnostic sont conservés dans [le dossier du premier essai](qa/v109-pit-first-production/manifest.json).

Un essai Preserve du second build a atteint le dialogue de pause pendant le contrôle tactile Iskhel, puis a expiré en attendant les commandes. Il reste classé FAIL. Le même pilote, sans modification, a ensuite accompli ses 50 contrôles et ses 27 captures dans une nouvelle exécution complète. Les observations passives supplémentaires n’ont pas reproduit cet arrêt ; sa cause n’est pas attribuée. Les données, images et limites du diagnostic figurent dans [le dossier de cet essai](qa/v109-preserve-paused-trial/manifest.json). Aucun garde de pause, de focus ou de sauvegarde n’a été désactivé.

## Limites de livraison

Les 48 dessins BODY et les deux projections liées concernent uniquement Feral et Scar sans costumes. Les PNG bruts, références, reçus et rectangles natifs restent conservés ; aucune action source globale ni variante complète n’est clôturée.

Les trois pièces K-17 sont des créations locales originales ; l’archiviste réutilise son corps existant. Le fragment reste candidat, sans réparation, attribution de lignée ou récompense. Le parcours cargo vérifie son déplacement et le recalcul du trajet ; il ne certifie pas une nouvelle livraison ROLE19 complète.

La tournée des clans part d’une fixture déclarée dont les six ouvrages et les anciens soins ont été préparés par le modèle. Les livraisons sont jouées dans le navigateur. L’aller-retour orbital est couvert par les tests du modèle ; aucune acquisition ou ressource de campagne n’est accordée.

Les parcours complets du terrain Preserve emploient des fixtures explicites où les seize adultes sont déjà neutralisés ; les entrées saines jouent séparément un combat et un trophée réels par biome. Les objectifs mécaniciens/interception Iskhel sont couverts par les tests métier, sans être présentés comme gagnés dans ce parcours navigateur. Le catalogue atteint 32 secteurs et 64 adultes uniques ; les cibles 80/100 et les illustrations H001–H100 restent ouvertes.

Les 56 exigences source incomplètes restent suivies ouvertes dans le classeur V109. Cette validation concerne les ajouts décrits, sans certification de fidélité canonique ni déploiement public.
