# V88 — validation locale et limites de publication

Lot vérifié le 8 octobre 2026, heure de Paris. Le [bilan des sources et chantiers](yautja-v88-import-and-excel-status.md) distingue les contenus disponibles des fonctions encore ouvertes.

## Contrôles locaux

- 247 tests ciblés réussis dans 21 fichiers, sans échec ni test ignoré : ouvrages, logistique, extraction, relais/treuil, Bible, vols, inspections, import natif, sauvegardes, archives complètes et comptes.
- Sept de ces tests vérifient le raccord de sauvegarde des inspections : anciennes parties, versions futures et propriétaires étrangers, export/recharge, quota ou relecture incertaine, archives complètes et remise à zéro du propriétaire.
- Lint ciblé réussi, sans avertissement ; compilation Next 16.3.5 avec webpack et vérification TypeScript réussies. Le CSS compilé de The Pit conserve ses quatre garde-fous de HUD. Ces contrôles ne constituent pas une validation de tous les parcours du jeu.
- Relecture indépendante du raccord propriétaire/coque/écriture durable et des profils de voix : aucun défaut bloquant relevé. Une optimisation possible reste la lecture du registre de flotte hors du pont.

Les logs, captures et points de reprise QA sont conservés dans `work-local/v88/qa/`, hors des assets distribués et du dépôt. Aucun compte de production ou fichier source Drive n'a été modifié.

## Parcours réellement joués

Le jeu compilé a servi à ces vérifications, sans crédit de campagne artificiel :

1. **Archives natives.** Les deux planches Badlands V2 et V4 sont décodées à leurs dimensions originales, 2200 × 4011 et 2400 × 7026. Le grand format demande une ouverture explicite. L'interface indique 1 871 empreintes référencées et les limites de ces références.
2. **Relais S12.** Départ avec 120 RAV et U28. Reconnaissance de K01 et K02, aller-retour physique sur L01, livraison du kit, deux tours travaillés, puis arrivée et déplacement du destinataire. Fermer L01 refuse le signal sans coût. À sa réouverture, remise au tour 11, stock 82/120 ; les observations restent datées des tours 2 et 4, avec leur observateur. Une répétition ne crée ni tour, ni résultat. Export/reprise puis nouvel export : texte identique.
3. **Treuil S17.** Deux artisans U20, reconnaissance de K01/K07 et construction en trois tours sur L31. La fermeture refuse le levage sans dépense. Réouverture : même kit déplacé au tour 9, stock 82/120, artisans restés à K01 et abri encore non construit. Export/reprise puis nouvel export : texte identique. Une vraie équipe U17 recrutée après deux tours rejoint K07, récupère et livre ce même kit, puis travaille deux tours : abri installé au tour 14, stock 50/120.
4. **Voix documentaires.** Depuis la console réelle du vaisseau, Archives → lecteur de sources → scène D6-O2-M05. Orha affiche les deux profils D6-V-O-06 et D6-V-H087, leurs cellules, connaissances et limites. Aucun profil n'est choisi automatiquement ; lire la scène ne crédite ni mission ni inspection.
5. **Inspection du vaisseau.** Affichage et suspension dans les modales contrôlés sur une fixture historique explicitement nommée, dans un autre origin localhost, sans acquisition ou campagne jouée prétendues. Le compteur reste 0/8 après utilisation des accès rapides. Les huit inspections, leurs refus de portée/focus et leur sauvegarde sont couvertes par les tests de modèle et de raccord ; le parcours physique complet des huit salles n'est pas certifié par ce contrôle navigateur.

Empreintes des checkpoints exportés par l'interface :

| Point joué | SHA-256 |
| --- | --- |
| Relais, tour 11 | `d89e6e5c4c56da75b45e5162ae8ac2cde3a0c86bb135638f1ed2efc249110321` |
| Treuil, charge déposée, tour 9 | `76ada5c016ecb41b7a18903a1d32e21ddef38d582ed9559ca83a0f5e6a141ca5` |
| Abri livré et construit, tour 14 | `ee25900128f2f300e1fa4b5e76f62a26fbf089bbe1ad1014f2cd76759e5389b1` |

Le contrôle mobile du lecteur a détecté une largeur intrinsèque excessive du champ d'import, puis du sélecteur de phase dans la grille de répétition. Le lot contraint leurs minima et largeurs. Le dernier build a été rechargé : viewport demandé 390 × 844, largeur utile 375 px, racine 375/375 px et modale développée 320/320 px ; aucun conteneur visible de plus de 30 px ne dépasse sa largeur de plus de 2 px. Les deux candidats d'Orha restent présents. La mesure de la racine seule n'aurait pas été une preuve d'absence de débordement à l'intérieur d'une modale. Le viewport temporaire a été restauré.

Une nouvelle partie locale QA a été conservée dans le slot 5. Son écran de nurserie a pu rester au chargement pendant les essais d'entrée navigateur ; aucune cause unique ni correction n'est certifiée ici. Les contrôles V88 ci-dessus ne valident pas la totalité du prologue, des entrées maintenues ou des mouvements de la campagne.

## Publication, vérifiée séparément

L'inspection authentifiée Vercel du 7 octobre 2026 à environ 22:09 UTC confirme que l'alias de production pointe toujours sur **V86**, déploiement `dpl_EdysamzjLekj3W8XuPvmHMJyrBuY`, commit `216318abccecb6a0d6e3545a9fec7db02a797de4`, état READY. Les trois tentatives les plus récentes restent ERROR ; la dernière est `dpl_6RPhuL7DsTUUtmTgcU5T6gjDCRyd`, commit `161c2d44fc4656dee73df264d54ff11cb5f4e71c`.

Le pipeline antérieur manque d'espace pour l'output statique et refuse de supprimer un arbre contenant des montages. V88 n'a pas été déployée ; aucune répétition inchangée du pipeline, suppression d'asset/source, baisse des protections, installation de runtime ou dépense de runner n'a été effectuée. Une compilation locale réussie ne signifie donc pas que ces nouveautés sont en ligne.
