# Originaux et mesures V94

Les 35 PNG de ce dossier sont les originaux non retouchés des générations V94, y compris les propositions refusées. Les trois reçus de lots comptent exactement dix PNG chacun ; les cinq derniers originaux Wolf appartiennent au commit d’intégration. Une tentative Berserker 008 n’a produit aucun PNG, comme l’indique son fichier d’erreur.

Les admissions utilisées dans le jeu sont décrites par les quatre `pitLifecycle*V94.json` et leurs manifestes propres au personnage. La preuve finale est `app/game/data/pitLifecycleReviewV94.json` : 19 pages publiques, 21 clips orientés, 144 dessins distincts. Les PNG publics sont des copies byte-identiques ; leurs cellules exclues ne sont jamais référencées dans un clip.

Certains fichiers Berserker `*.measurement.json` et `*.columns-first.json` sont vides parce que cette mesure initiale a échoué. Leur erreur correspondante est conservée dans `*.error.log`. Ces fichiers vides ne sont pas des preuves de géométrie et ne sont pas lus par le jeu. Seul `partial-native-geometry.json` décrit les fenêtres finales retenues. Conserver les échecs ne constitue pas une admission.

Le dossier entier est exclu du paquet Vercel par `.vercelignore`. Aucun cycle complet des 201 combattants, fidélité 1:1 ou fluidité n’est certifié par ce lot.
