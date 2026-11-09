# Régression P0/P1 et checkout ciblé

Le nouveau workflow exécute la suite sélectionnée sur chaque PR vers main et par lancement manuel. Les filtres de chemins ont été retirés après revue indépendante : un changement limité à la sauvegarde, au rig, à PHG ou à une ressource reste couvert.

Le lanceur portable utilise le vrai Node22 et chaque fichier node:test directement. Le verdict exige des compteurs TAP présents, des tests exécutés, zéro échec/annulation/skip/todo et aucun échec de création de sous-processus. Un refus EPERM du sandbox avait un status0 avec error et stdoutvide ; le probe a été refusé, conservé, puis réexécuté horssandbox avec vrais résultats.

Les110 entrées de runtime-file-inputs.json sont issues des lectures de fichiers réelles de cette suite. Elles représentent198031213octets, distincts du répertoire public complet. include-p0p1-ci-inputs vérifie les chemins et empreintes puis peut ajouter ces entrées au vrai sparse-checkout. Les dépendances/source/tests sont présents séparément.

Le sous-dossier cold-checkout conserve une exécution dans un nouveau dépôt Git local : les ressources ont vraiment été omises initialement puis incluses par le script prévu pour la CI. Les70fichiers et677cas étaient verts à cette version. Les dépendances verrouillées installées ont été partagées ; cela ne constitue ni un nouveau npm ci ni une exécution distante GitHub Actions. Les nouveaux changements de protocole ultérieurs demandent leur propre reçu de régression.

Régénération d’une sélection modifiée : exécuter le lanceur sur une source complète avec P0P1_FILE_TRACE et le preload de découverte, examiner les lectures non-source, puis mettre à jour le manifeste et refaire la vérification du checkout isolé. Ne pas recopier des rapports de test comme des ressources d’entrée.
