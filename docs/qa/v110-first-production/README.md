# Premier parcours de production V110 conservé

Le premier parcours compilé reste **FAIL et non promu** : 19 contrôles enregistrés, dont 18 réussis et un échec, avec 8 PNG. Il utilisait le runtime `dc9e2ea548df1bc0950c7ff8b81408580040f918` et le build `UV7GoRY1M4egPl1ykZJ8J`. Le [manifeste](manifest.json) conserve le JSON brut complet en gzip sans perte, les PNG exacts, leur liste d’ouverture et le journal original. Aucun contrôle ni capture de cet essai n’entre dans les totaux de certification courants.

Le parcours atteint réellement le point préservé grâce au Worker, puis effectue la reprise volontaire. La sauvegarde capturée à l’échec indique la phase `working`. L’objectif « étude interrompue » disparaît alors et son ancien guide est démonté. Le pilote attendait uniquement qu’un guide encore monté devienne `current=false` : cette attente trop restrictive expire alors que l’ancien guide a disparu.

La correction porte sur le protocole QA : accepter un guide absent ou un guide `current=false`, et refuser explicitement qu’un ancien guide `current=true` subsiste. L’application reste inchangée entre ces essais. Le fichier du pilote fait partie des sources épinglées ; sa correction exige donc un nouveau gel et un nouveau build avant une nouvelle recette complète. Le résultat initial n’est pas réécrit.

Cet essai enregistre zéro exception de page, zéro erreur console et zéro erreur Worker ; les sources observées avant/après sont identiques. Ces constats ne transforment pas l’échec en réussite et ne certifient pas les autres parcours qui n’ont pas été atteints.
