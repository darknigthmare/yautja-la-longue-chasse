# Suivi Homeworld V110

Le suivi V110 ajoute huit feuilles aux **97 feuilles du classeur V109 certifié**, sans réécrire leurs cellules, formules, tableaux, parties XML ou styles historiques. La base est `docs/YAUTJA_V109_SUIVI.xlsx`, SHA256 `e80fcea5fdf768d5c9b6fd1874f89bc42badee24fbac9a3cf7cecb447c49ed3f`. Le générateur V109 n’est pas réexécuté contre le nouveau jeu.

Le certificat courant provient des quatre parcours complets R4 : **47 contrôles et 19 captures toutes inspectées**, sur le runtime `80123ba7ec1f77c266ce8532b9f3d8d45beb7110`, build `lKVX-RK9EV3tJNCiGVJSV`. Le gel `c54a5e97c199d16584a229f332692f5890874f5494b015657f66cf9659bfe3f1` contient 1 386 entrées ; les 903 sources avant/après la recette sont identiques et les erreurs JavaScript, console et Worker sont vides. Les cinq tests du suivi passent ensuite avec cette preuve publiée. Les résultats V109, les essais de développement, le premier échec compilé et l’ancien PASS R3 restent distincts du résultat courant.

Quatre correctifs sont suivis séparément : conversations résidentes physiquement possibles, arrivées tenant compte des lots cargo, objectif de l’Atlas correspondant à l’opération active, puis lisibilité des pièces K‑17 et de leur provenance. Leur état dépend des preuves épinglées dans [le registre V110](v110-homeworld-source.json). Un contrôle de modèle, de rendu HTML ou de structure Excel ne vaut pas un parcours dans le navigateur.

Les **56 exigences source et neuf actions ouvertes en V109 restent ouvertes**. Leur inventaire ne recensait pas la famille Homeworld ; ces corrections ne justifient donc aucune clôture de kit, campagne, variante ou autre cible source héritée. Chaque exigence reste visible dans `ManquantsSourceV110` avec ses données d’origine.

Le catalogue artistique reprend individuellement les **354 cibles du brief Homeworld §55–76** dans `CatalogueArtV110`. L’inventaire V81 distinguait 313 candidats nécessitant des variantes, 40 manquants et une animation manquante ; ces chiffres historiques ne constituent pas une revue du jeu V110. Toutes ces cibles sont marquées « non clôturées par V110 ». Aucun nouveau PNG, BODY, costume ou cycle métier n’est produit par ce lot.

La continuation volontaire de l’étude différée B vers A reste ouverte. ROLE03 exige notamment l’incertitude et des pièces séparées ; le corpus ne demande ni réparation du bord, ni attribution de l’empreinte, ni lignée ou récompense. Les trois études adaptées de ROLE03 et le transport ROLE19 gardent leurs objets et registres distincts.

La production navigateur ne peut être déclarée dans le classeur qu’à partir de `docs/v110-homeworld-validation.json` : recette V110 explicite, build commun et gel V110 dont chaque entrée est vérifiée, résultat brut gzip conservé, sources avant/après identiques, zéro erreur JavaScript/console et captures portables toutes inspectées. Les résultats V109 ne sont jamais additionnés à ceux de V110.

```sh
node --experimental-strip-types --test --test-concurrency=1 tests/excel-followup-v110.test.mjs
node scripts/build-excel-followup-v110.mjs
node scripts/build-excel-followup-v110.mjs --check
```

Les tests vérifient les 105 feuilles, l’intégrité des 97 feuilles historiques, les caches de cinq formules, le refus d’une modification historique ou d’une validation V109 réétiquetée, et la régénération exacte. Ils n’exécutent ni navigateur ni Excel natif.
