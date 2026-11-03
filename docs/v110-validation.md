# Homeworld V110 — validation ciblée

Les corrections portent sur les contacts physiques des 98 résidents existants, l'admission des passages et des portes avec les cargaisons actuelles, le guidage de six opérations et la lecture des pièces K-17. Aucun nouveau dessin, PNJ, rang ou résultat de quête n'est accordé.

## Identité de production

- Runtime : `80123ba7ec1f77c266ce8532b9f3d8d45beb7110`.
- Build : `lKVX-RK9EV3tJNCiGVJSV`.
- Gel : [v110-runtime-freeze.json](v110-runtime-freeze.json), 1 386 entrées ; SHA256 `c54a5e97c199d16584a229f332692f5890874f5494b015657f66cf9659bfe3f1`.
- Les 398 entrées publiques et leurs sources artistiques héritées restent identiques.
- Compilation de production, types et contrôle CSS : PASS dans [production-build-r4.log](qa/v110-homeworld/production-build-r4.log).

Le premier build et le premier lancement des tests ont échoué sur `ENOSPC`. Leurs journaux restent conservés. Seuls nos caches de compilation ont été déplacés vers `/tmp` ; le gel des sources est resté identique. Aucun résultat de cet essai n'est promu.

## Vérifications locales

Les 56 tests V110 passent dans [current-v110-suite-r5.log](qa/v110-homeworld/current-v110-suite-r5.log) : 11 contacts résidents, 9 admissions de passages, 3 intégrations de porte/sauvegarde/reprise, 13 objectifs, 7 relevés K-17, 5 gardes de preuves, 5 assertions Excel et 3 assertions d'isolation historique. Les cinq tests Excel ont ensuite repassé sur le rapport final, sans être ajoutés une seconde fois au total : [final-tests.log](qa/v110-excel-followup/final-tests.log). Le classeur final contient 105 feuilles dont 97 historiques intactes, 1 440 entrées vérifiées et cinq formules contrôlées ; sa régénération exacte passe.

Les 32 scénarios des entrées actuelles passent avec la vraie fonction V110, sans changement de leurs assertions : [input-runtime-final.log](qa/v110-homeworld/input-runtime-final.log). Les 4 régressions d'interface Atlas, les 8 régressions de navigation V109 et les 9 conversations V75/V100 restent documentées dans leurs journaux séparés.

Les 95 assertions V109 originales et leur générateur s'exécutent dans une capsule privée issue du commit certifié `876a229f43cf01a8135df7ca864e4e11487d8613`. Le classeur V109 est régénéré exactement, SHA256 `e80fcea5fdf768d5c9b6fd1874f89bc42badee24fbac9a3cf7cecb447c49ed3f`. Ces vérifications historiques ne certifient pas le jeu V110 : [contexte et journaux](qa/v110-excel-history/README.md).

## Parcours navigateur

La recette complète de production passe 47 contrôles et produit 19 captures, toutes inspectées avant publication du [rapport courant](v110-homeworld-validation.json). K-17, les résidents, le palier occupé et la porte avec sauvegarde/reprise sont joués sur le même build. Les erreurs JavaScript, console et Worker restent nulles ; sources avant/après identiques. Aucun résultat de développement ne participe à ce bilan.

Les conditions initiales sont déclarées dans le brut : checkpoint de campagne connu ; pour le Conseil, charge préparée par 1 418 pas du vrai moteur et départ au palier supérieur ; pour la porte, dépôt et approche préparés par 603 pas du vrai moteur. Ces préparations de modèle ne sont pas comptées comme des déplacements joués dans le navigateur. Les actions d'étude, conversations, descentes, entrées, sauvegardes, reprises et sorties sont ensuite exécutées dans l'interface.

Les quatre essais de développement échoués restent portables dans [v110-development-attempts](qa/v110-development-attempts/README.md). Ils ont révélé le terrain écrasé par le carnet déplié, corrigé par une hauteur de carnet limitée et un défilement interne. L'échec de démarrage du Worker DEV reste non attribué ; les diagnostics ne justifient aucune cause certaine. Les ajustements du pilote clavier ne réduisent pas le rayon de reprise de trois unités.

Le premier parcours compilé est conservé dans [v110-first-production](qa/v110-first-production/README.md). Sa reprise avait correctement retiré l'ancien guide, mais le test attendait uniquement un guide présent et périmé : 18 contrôles avaient passé avant cet échec de protocole. Le test corrigé accepte le retrait ou l'invalidation, et vérifie explicitement la reprise ainsi que l'absence d'ancien guide actif. La version courante ajoute aussi une notification visible aux refus de passage et retire les descriptions techniques du codex des conseils de lieux des résidents. Le PASS compilé précédent reste conservé avec son gel dans [v110-previous-production-r3](qa/v110-previous-production-r3/README.md), sans être additionné au bilan courant. Les 47 contrôles ont été rejoués en entier.

## Limites conservées

Le choix B différé ne possède pas encore de continuation B→A. Les anciens checkpoints intérieurs dont l'ancrage était déjà occupé ne reçoivent aucune sortie ou téléportation inventée ; une sortie impossible reste refusée. Les nouvelles entrées conservent leur point réel, physiquement libre, et n'enregistrent plus le centre occupé d'une porte.

Les 56 exigences source et neuf actions héritées restent ouvertes. Les 354 cibles artistiques du Homeworld sont un catalogue distinct, sans nouvelle clôture artistique ni affirmation qu'elles seraient toutes absentes. Les contrôles de classeur vérifient ZIP/XML et caches de formules, sans exécuter Excel natif. Ni l'achèvement du Homeworld ni une fidélité canonique globale ne sont revendiqués.
