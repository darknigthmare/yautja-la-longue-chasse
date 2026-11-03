# PR 4 — Atelier de trophées : cycle complet et interruptions

Base : d1d2a4bbcd86b006c251fe5c6f6e605432bb0132 (16 octobre 2026).

Le composant existant marquait la réussite comme envoyée avant son minuteur de 520 ms. Un changement de callback parent annulait ce minuteur ; le nouvel effet, voyant le marqueur, ne le reprogrammait pas. Le trophée pouvait ainsi rester sur un atelier réussi sans que le parent reçoive son résultat.

La simulation, les commandes manette et la livraison différée sont désormais regroupées dans `useTrophyWorkshopRuntimeV94`. Le délai de présentation est mesuré en temps actif, son callback est celui du dernier rendu validé et son marqueur n'est posé qu'au moment de l'appel. Une annulation invalide l'essai immédiatement, même si le parent tarde à retirer la fenêtre. La suppression du composant annule ses images programmées. Aucun enregistrement de campagne n'est réalisé dans ce hook : le contrat `onComplete` existant et la persistance du parent sont conservés.

Le rythme est suspendu lorsque la page est cachée, que la fenêtre perd le focus, qu'un ancêtre rend l'atelier indisponible ou que le parent utilise la nouvelle option `suspended`. Aucun temps de rattrapage ni geste resté en attente n'est appliqué à la reprise. Le message de pause et la désactivation des boutons tactiles reflètent la pause de page/parent. Les commandes clavier personnalisées et les interactions natives des boutons sont conservées.

La manette exige un retour au neutre à l'entrée, après une interruption, un changement de contrôleur ou un refus de l'API. Une manette déconnectée et des axes non finis ne produisent pas de gestes. B ferme l'atelier une seule fois et prend la priorité sur A simultané. A permet de recommencer après un échec, mais doit être relâché avant de commencer la nouvelle tentative. Un échantillon ne produit pas plusieurs pénalités à cause d'une diagonale.

## Preuves locales

Les 21 nouveaux tests exécutent le code réel du hook et les règles existantes, avec ordonnancement React, DOM et horloge instrumentés. Les quatre actions utilisent leurs séquences complètes : nettoyage, préparation, exposition et rite. Sur la source précédente, 17 assertions différencient l'ancien comportement ; les 21 passent avec la correction. Ces nombres incluent les nouveaux comportements de suspension et de retour manette, pas 17 bugs indépendants.

Les neuf tests du rituel de chasse sont conservés et passent : 30/30 contrôles Node locaux pour ce groupe. Le montage navigateur réel compile localement avec esbuild. L'ancienne suite `trophy-workshop.test.mjs` conserve ses six tests de règles/interface ; seules les assertions de raccord sont redirigées vers le hook extrait.

La CI permanente (toujours `contents: read`) lance aussi les six tests historiques de l'atelier et dix scénarios Chrome. Ils effectuent les gestes via les boutons natifs, avec rafraîchissements continus du parent, puis vérifient pause, échec/reprise, fermeture, démontage et API manette refusée. Les résultats CI doivent être associés au commit réellement exécuté, pas présumés à partir de cette note.

## Limites

Pas de changement de sauvegarde, d'arsenal, d'équilibrage, d'image ou de lore. Les callbacks de réussite du montage navigateur sont observés sans campagne réelle ; cela ne qualifie ni la persistance complète des trophées ni une campagne entière. La manette est émulée, pas matérielle. Le patch de combat précédemment livré à part reste hors de cette modification. Aucune fusion, publication de production, modification de compte ou relance forcée de Vercel.
