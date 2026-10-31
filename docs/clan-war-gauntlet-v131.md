# V131 — Deux présentations du mode Guerre des clans

## Intention

La vue principale provisoire fait lever le **gauntlet du chasseur Yautja** et projette le front sous forme d'un hologramme tactique. L'inspiration fonctionnelle est le terminal de terrain d'un jeu d'infiltration, mais les formes, couleurs et commandes sont propres à notre jeu. La seconde option, **Vue stratégique classique**, conserve la présentation V85–V129.

Cette expérimentation reste réversible en attendant la validation visuelle du joueur. Elle est empilée sur la branche de la PR #40 (V129) et n'efface aucune interface historique.

## Contrat d'intégration

- La présentation par défaut est `gauntlet`. Deux boutons à état `aria-pressed` permettent de choisir `gauntlet` ou `classic`.
- La préférence est isolée dans `yautja.clan-war.presentation.v1`. Lecture après l'hydratation React, puis écriture uniquement lors d'un changement demandé. Une défaillance de localStorage n'empêche pas l'interface de fonctionner.
- Le même `ClanWarPanelV85`, la même `createWarSessionV85` et le même `ClanWarAtlasV95` restent montés dans les deux présentations. Changer de vue ne recrée ni planète, ni personnage, ni partie ; les ordres, territoires, garnisons, tour et sauvegarde sont inchangés.
- La projection lit directement le nom de la planète, le tour, les territoires contrôlés, le départ, la destination, les ordres réservés et l'état de sauvegarde. Les clics sur la véritable carte restent actifs sous la surcouche visuelle (`pointer-events: none`).
- Le gauntlet actuellement dessiné en SVG/CSS est un **élément graphique de prototype**, et non un sprite de film validé 1:1. Pour une version artistique finale, remplacer cette silhouette sans modifier les contrats de simulation ni du panneau.
- Aucune nouvelle API graphique ou simulation supplémentaire n'est instanciée. Les animations décoratives sont neutralisées si `prefers-reduced-motion: reduce` est activé.
- Les exercices V3 et la Bible V6 restent accessibles. Le style holographique habille le panneau global, mais l'interface de carte/gauntlet est réservée à l'onglet Planètes · conquête.

## Scénarios QA à contrôler en navigateur

1. Ouvrir Guerres de territoires sur un profil existant : la nouvelle vue doit s'afficher sans toucher la sauvegarde de chasse.
2. Choisir un territoire, changer de mode, vérifier que la destination, le tour, la caméra de l'atlas et les ordres déjà réservés ne changent pas.
3. Réserver un ordre valide et rouvrir les deux présentations : un seul ordre doit exister et la confirmation de tour doit fonctionner pareil.
4. Changer de planète, changer de mode, recharger le jeu : la planète et son archive doivent rester les mêmes, le mode choisi doit revenir si le stockage est disponible.
5. Refuser localStorage, rendre la page inactive, changer d'onglet, tester mobile et clavier : la vue doit rester fonctionnelle et les mises à jour de combat doivent suivre le cycle existant.
6. Vérifier à la souris et au clavier tous les éléments de la carte : aucun scanline, bras ou faisceau ne doit bloquer leur activation.
7. Activer les mouvements réduits : absence d'animation du bras et du balayage ; conserver des contrastes et une navigation clavier utilisables.

## État des preuves

- Les tests automatisés V131 vérifient le parseur de préférences et la présence d'un seul atlas dans le JSX. Ils ne remplacent **pas** un test e2e de changement de vue ni une revue artistique.
- Les performances, le cadrage réel en jeu et le rendu 1:1 du brassard restent à vérifier sur une capture de navigateur avec validation du joueur.
- Ne pas déclarer V131 fusionnée dans `main` avant l'intégration des PR empilées.
