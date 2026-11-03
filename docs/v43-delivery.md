# V43 — Menu Campagne, arènes et références

Le jeu démarre sur Nouvelle partie / Continuer / Charger, avant le vaisseau. Cinq parties indépendantes disposent chacune de dix sauvegardes manuelles et deux automatiques. Les annexes et le lieu de reprise, y compris le monde natal, sont conservés. La rotation des autos nécessite un changement utile ; remplacement, récupération, quota et conflits entre onglets sont protégés.

THE PIT propose 136 scènes : les 100 entrées historiques sont conservées, avec 27 nouvelles scènes pour neuf films et neuf scènes pour trois jeux, soit trois par œuvre couverte. Les nouveaux ajouts restent exclusivement Predator et Alien vs Predator. La sélection dispose de filtres de collection et d’œuvre, avec pagination.

Les 36 nouvelles scènes utilisent six plans P0–P5, 36 fonds et 31 modules OpenAI uniques. Les originaux, empreintes et propriétaires des modules partagés sont préservés. Huit poses fournies par l’utilisateur sont consultables dans « Références fournies », sans ajout fictif de combattants ou de clips.

## Vérifications

- Compilation finale et TypeScript réussis. Lint : aucune erreur, un avertissement img préexistant dans ClanChroniclePanel.
- Menu : onze contrôles navigateur réussis, dont première chasse, reprise, monde natal, migration, stockage plein et conflits entre onglets.
- Sélection : quatorze contrôles réussis, dont City Hunter adverse vers la gauche, filtres, pagination, manette simulée et reprise après échec d’image ou d’enregistrement.
- 36 scènes parcourues dans le jeu compilé : six plans, images chargées, simulation active, mobile sans débordement, aucune écriture dans les sauvegardes de test.
- Galerie ouverte depuis le jeu : 75 nouveaux fichiers chargés. Les huit références sont aussi contrôlées pour leur orientation native et l’absence de commandes animées actives.
- Captures du menu et planche des 36 scènes inspectées. Rapports dans docs/v43-*-qa.json ; captures dans work/v43.
- Le test SSR historique a été mis à jour : il exige maintenant le menu avant hydratation, quatre actions protégées et aucune session prématurée. Tests ciblés : 2/2 réussis. Résultat complet final conservé dans le rapport de validation.

## Limites

- Le nouveau lot de jeux couvre AVP Classic 2000, AVP 2010 et Predator Hunting Grounds. Les autres jeux restent à produire.
- Adaptations 2D : fidélité 1:1 non certifiée. Secteurs et accessoires interactifs, animations complètes et totalité des chasseurs ne sont pas annoncés terminés.
- Les huit imports sont des poses fixes, pas des animations jouables. Les gros ZIP restent à dédoublonner par SHA, inspecter et rattacher aux bonnes identités. L’inventaire contient 629 entrées PNG, pas 629 chasseurs uniques. Le RAR reste non extrait.
- Aucun nouveau contenu de campagne Homeworld n’est annoncé ici ; ses données et son lieu de reprise sont préservés.
- Aucun nouvel exécutable Windows V43 n’est certifié. Les tests mobile et manette virtuelle ne certifient pas du matériel physique.

## Préservation locale

Après saturation de C:, les preuves générées work/v37 et work/v43 ont été copiées sur E:/CodexTemp/yautja-v43-work-preserved-20260923. Chaque fichier a été comparé par SHA-256 avant retrait de la copie de C:, puis une jonction a conservé le chemin initial. 1 428 fichiers V37 et 485 fichiers V43 ont été préservés. Les archives utilisateur et sauvegardes n’ont pas été touchées. Les tests suivants utilisent un dossier temporaire dédié sur E:.
