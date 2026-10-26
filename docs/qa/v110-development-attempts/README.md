# Essais de développement V110 conservés

Ces quatre essais restent **FAIL, exploratoires et non promus**. Ils ont été exécutés sur le serveur de développement, sans identité de commit runtime ni BUILD_ID de production. Le [manifeste](manifest.json) conserve chaque JSON brut complet en gzip sans perte, les 14 PNG exacts et les quatre journaux bruts. Leurs contrôles et captures ne sont jamais additionnés aux résultats du parcours de production courant.

| Essai | Observation conservée | Correction ou limite |
| --- | --- | --- |
| R1 | Le bouton Continuer reste désactivé pendant l’attente ; 11 erreurs console HMR sont enregistrées sur l’origine DEV `127.0.0.1`. | Le pilote attend ensuite le rafraîchissement asynchrone réel du catalogue avant le clic. Les essais suivants utilisent `localhost`. Les erreurs restent présentes dans le résultat initial ; aucune cause unique n’est déduite de leur concomitance. |
| R2 | Après observation, relevé et prise réels de la plaque, le carnet ouvert écrase le terrain ; la capture de la zone de jeu invisible expire. | Vrai défaut d’interface corrigé dans la disposition CSS avant le gel courant. Un contrôle supplémentaire exige ensuite une fenêtre de terrain visible et une marche réelle avec le carnet ouvert. La capture d’échec est conservée. |
| R3 | Le parcours joue consentement, portage, pause, Continue, pose et sélection de l’objectif actuel. Le calcul Worker devient indisponible et le pilote expire ; aucune exception navigateur ni erreur console n’est enregistrée. | Cause de cette indisponibilité DEV non attribuée. Les diagnostics directs décrits ci-dessous ne sont ni un parcours UI complet ni un certificat de production. |
| R4 | Les échanges avec le résident, ses conseils et leur suspension sont joués. Le pilotage clavier expire près du repère `(7500, 3474.5)`, à `(7490, 3475)`. | La tolérance du pilote de marche ordinaire passe à 12 unités. Le contrôle du point de reprise garde son rayon métier de 3 unités et exige cette arrivée stricte. Cette correction de protocole ne déplace pas le joueur par écriture de coordonnées. |

Les sauvegardes initiales déclarées, événements de suspension synthétiques, sources avant/après, états visibles et limites du scénario figurent intégralement dans les résultats bruts. Les quatre essais rapportent leurs sources inchangées pendant leur exécution ; leurs sources peuvent différer entre essais. Le trajet est planifié pour fournir des repères au pilote, puis parcouru avec les commandes clavier ordinaires. Aucun garde de sauvegarde, de pause, d’admission ou de collision n’a été contourné pour promouvoir un résultat.

## Diagnostic Worker R3

Le [script original](diagnostics/worker-development/probe-original.mjs) et son [résultat exact](diagnostics/worker-development/result.json) sont copiés sans modification. Le script lit la sauvegarde complète du résultat R3, puis crée deux vrais Worker DEV : chacun répond `reachable`, sans échec de requête ni exception de page enregistrés. La [sauvegarde capturée](diagnostics/worker-development/r3-captured-save.json) est extraite sous forme de chaîne UTF-8 exacte, sans resérialisation ; son emplacement d’origine dans le JSON brut est indiqué dans le manifeste.

L’origine de requête du diagnostic est explicitement `(7520, 5350)`, étage 0, sans intérieur. La position extérieure de cette sauvegarde est `(7378.5657141399715, 5350)`. Le diagnostic utilise donc la sauvegarde réelle avec une origine construite pour ce test ; il ne rejoue pas exactement l’état de l’interface qui a échoué et n’attribue pas la cause de l’échec initial. Le script conserve ses chemins absolus d’origine. Il ne doit pas être présenté comme une recette publique reproductible ou un résultat de production.

## Premiers échecs locaux

Le dossier `checks/` conserve aussi les journaux initiaux distincts :

- Le premier groupe de tests intégrés rencontre deux `ReferenceError` parce que la fixture VM ne fournit pas `stepHomeworldTransitV110`. La fixture est ensuite liée à la vraie fonction V110 ; le journal final des commandes conserve 32 tests réussis. Cette correction de fixture ne remplace pas le comportement du jeu par un faux résultat.
- Le premier contrôle d’histoire V109, lancé dans le sandbox, échoue au lancement de son processus enfant sans sortie enfant exploitable : 2 tests réussis, 1 échec. La relance avec les permissions d’exécution requises passe ses 3 tests dans le journal existant également copié ici. Aucune assertion historique n’a été désactivée.

Ces journaux locaux gardent leur portée propre. Aucun de leurs échecs, diagnostics ou répétitions ne vaut certification du parcours navigateur compilé courant.

## Limites du stockage local et relances séparées

Le premier [build de production](../v110-homeworld/production-build.log) s’arrête avec `ENOSPC` pendant le pré-rendu de `/_global-error`. Un premier [groupe de tests du suivi](../v110-homeworld/current-v110-suite-failed-disk.log) conserve également un échec `ENOSPC` lors de la création d’un dossier temporaire : 4 tests réussis, 1 échec. La trace XML de refus volontaire visible dans ce dernier journal appartient à un autre test réussi ; elle n’est pas présentée comme la cause de l’échec disque.

Les journaux originaux restent à leur emplacement. Des copies exactes sont aussi conservées dans `checks/` pour fermer l’archive. Les relances réussies restent distinctes : [build R2](../v110-homeworld/production-build-r2.log) et [suite locale de 56 tests](../v110-homeworld/current-v110-suite.log), répartis en huit groupes sans échec. La compilation et ces tests locaux ne certifient pas à eux seuls un parcours navigateur. Le [premier parcours compilé en échec](../v110-first-production/manifest.json) possède sa propre archive et reste non promu.
