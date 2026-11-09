# Premier essai Next migration — attente QA incomplète

Essai conservé sur le build final `lSBcQd-2LuUCPafGoIZvC`. Les sept premiers contrôles réussissent : origine initiale, parcours Conseil/BibleV6, lecture seule, export initial, adoption exacte avec fence native, export après adoption et séparation de la branche ancienne écrite depuis une seconde page.

Le pilote appelle ensuite `confirmed()` immédiatement après le bouton d’ordre asynchrone. Ce helper acceptait toute fence confirmée, donc il a relu l’ancienne transaction au tick1 et a échoué en attendant déjà tick2. Ce résultat ne prouve pas un échec applicatif. Le pilote suivant attend explicitement le tick attendu et sa fence confirmée ; aucun code du jeu n’a été changé.

Rapport brut, pilote exécuté, snapshots, exports et captures restent inchangés. Ne pas compter cet essai comme une recette entière réussie. La preuve finale est dans attempt-2.
