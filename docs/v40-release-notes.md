# V40 — gardes, déplacements et continuité des contrôles

## Animations

- **Machiko Noguchi, armure de clan** : garde haute dans les deux orientations, deux dessins par côté. Une nouvelle planche OpenAI est retenue après trois essais, dont une alternative magenta non utilisée. Les mains, le fusil, le canon unique, les pieds et les proportions ont été comparés aux poses V34 et à la présentation V28. Le PNG alpha est conservé à l'identique ; les rectangles mesurés excluent le bruit alpha lointain et ont des bords entièrement transparents. La garde basse et les réactions au blocage ne sont pas couvertes. Le fusil et le canon restent légèrement plus massifs que dans V34 ; aucune fidélité officielle 1:1 n'est certifiée.
- **Scar** : marche avant dans les deux orientations par lecture temporelle inverse `[0,3,2,1]` des huit dessins du recul corrigé V34. Aucun nouveau dessin de Scar, miroir ou déplacement physique artificiel. Le recul existant reste inchangé. La boucle conserve la cadence courte à quatre poses de la source ; les anciennes planches de marche rejetées restent exclues.

Le total passe à **263 clips orientés sur 11 combattants animés**, avec **16 combattants sélectionnables**, **20 arènes jouables** et **zéro moveset complet déclaré**. L'atelier contient **551 sources** : une nouvelle page sélectionnée, pas trois nouvelles pages de jeu. Le laboratoire continue de dédupliquer les dessins réutilisés par chemin et rectangle.

## Contrôles

- **THE PIT** : une manette située après un emplacement vide du navigateur fonctionne aussi bien dans le menu qu'en combat. Les rôles J1/J2 restent réservés pendant le duel : débrancher J1 ne transfère pas J2 au premier combattant. Après reconnexion, les commandes doivent être relâchées avant de reprendre. Le retour à la sélection permet de réattribuer les rôles. Fermer Commandes ou le laboratoire rend le focus au combat et purge les anciennes entrées. Une sélection incohérente de deux combattants identiques est également rejetée avant le moteur, même si une automatisation force une option désactivée.
- **Marches de Cendre** : prise en charge d'une manette à un emplacement non nul, navigation/validation des dialogues, annulation sûre, pause Start et pause clavier remappée. Un bouton ou un stick maintenu ne traverse plus automatiquement les changements de contexte, pertes de focus ou reprises. Aucune règle de mission, collision, récompense ou sauvegarde n'est modifiée.

## Limites

La campagne de jeunesse, le Berceau, les 80 arènes supplémentaires, les véhicules pilotables et les bibliothèques d'animation complètes restent ouverts. Les extensions humaines restent limitées aux duels CPU, au Versus local et à l'entraînement. Le paquet Windows livré reste V35. Les recettes utilisent un navigateur et des manettes virtuelles ; elles ne certifient ni matériel réel ni Steam Deck. L'accès privé ChatGPT reste différé au choix du propriétaire.

Les tests, contrôles de pixels, recettes navigateur et preuves du déploiement exact sont consignés séparément dans les fichiers de vérification V40.
