# V148 — Un onglet périmé ne peut plus réinitialiser les opérations V115

**PR de travail :** [#42](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42), brouillon empilé sur #40, non fusionné dans `main`.

## Défaut corrigé

La V147 garantissait le lancement/rechargement des **quatre types de missions V115**, mais la commande `Réinitialiser V115 uniquement` écrivait directement sur `WAR_OPERATIONS_STORAGE_V115`. Elle pouvait ainsi effacer la mission et les rapports écrits entre-temps dans un autre onglet, malgré la vérification de version déjà présente dans `commit()`.

Le V148 dans `app/game/ClanWarOperationsV115.tsx` :
1. Recompare les **octets exacts de l'archive** connus de cet onglet avec `localStorage` avant toute action de `commit()`.
2. Désactive le reset quand le panneau est périmé, désactivé ou non hydraté.
3. Revérifie **avant et après** la confirmation utilisateur, pour refuser une écriture si la source a changé pendant la boîte de dialogue.
4. Bloque l'archive en cas de lecture refusée ou de stockage corrompu ; aucun état optimiste trompeur n'est présenté.
5. Contrôle l'identité de `storageArea`, puis détecte l'obsolescence au retour du focus et de la visibilité, même si l'événement `storage` a été reçu en arrière-plan.
6. Réinitialise les sélections de mode, territoire et équipe après une **vraie** réinitialisation autorisée, sans toucher aux autres archives V85, à la chasse ou aux gauntlets.

Ces protections sont uniquement **cosmétiques et transactionnelles pour l'exercice local V115**. Aucun ordre de guerre, avantage, récompense ou statistique de campagne n'a été ajouté.

## Preuves réellement obtenues

[GitHub Actions V148 — run 41255089252](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41255089252) : les tests Node de V148 et de non-régression V147, **8 scénarios avec deux vrais onglets Chrome**, et l'intégrité du classeur XLSX ont réussi.

Le navigateur a vérifié :
- A et B chargent la même archive V115 initialement vide.
- A engage un mandat **Outer Ops** avec équipe et RAV réels de la Bible V6.
- B revient à l'avant-plan, voit une alerte et ne peut plus lancer ou réinitialiser.
- Un clic DOM sur son reset désactivé ne modifie aucun octet de l'archive.
- A, toujours propriétaire de l'état à jour, réinitialise après confirmation.
- B reste bloqué jusqu'à recharger l'archive nouvelle.
- B peut alors démarrer une **infiltration** et recevoir le reçu V115 correspondant.
- A devient périmé après l'écriture de B et ne peut pas effacer cette nouvelle mission.

La **sentinelle de sauvegarde de campagne** est restée inchangée. Aucun dégât, rang, trophée ni front de planète V85 n'a été modifié.

[Captures et manifeste Chrome de deux onglets](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41255089252/artifacts/13062995334).

## Tableur V148

[Annexe Excel de sécurité V148](Yautja_ClanWar_V148_Securite_Multionglets.xlsx) — **5 feuilles** : bilan, scénarios deux onglets, garde-fous du code, éléments non clos et liens des sources. Les lignes marquées PASS citent l'exécution ci-dessus ; une formule de synthèse calcule les états.

## Limites à conserver comme ouvertes

- **Pas de compare-and-swap atomique cross-tab :** `localStorage.getItem` suivi de `setItem` n'est pas une transaction. Deux écritures réellement simultanées peuvent encore entrer en concurrence ; un verrou IndexedDB/Web Locks partagé doit être conçu et testé avant de prétendre assurer cette garantie. Les protections V85 basées sur IndexedDB ne sont pas automatiquement celles de V115.
- Le test concerne **deux onglets du même navigateur**, non deux appareils ou un service cloud.
- Les timers actifs d'assaut/RTS et plusieurs mandats Outer Ops entre onglets nécessitent un test de concurrence supplémentaire avant clôture des rapports.
- La V147 a testé le **lancement et la reprise** des quatre modes ; leurs victoires/défaites intégrales et rapports finaux en navigateur sont encore à démontrer.
- La V115 reste une simulation d'opérations dérivée de la Bible V6. Elle n'est **pas** automatiquement projetée sur les 30 cartes V85 prouvées en V146.
- Les 54 visuels de gauntlets restent des **prototypes non homologués 1:1** ; aucun test de stockage ne valide proportions, glyphes, texture, animation ni droits de diffusion.

**Critère de fusion :** revue des dépendances de PR empilées, tests des écritures simultanées, missions complètes, exactitude artistique si affichée comme canonique, et validation humaine. La PR demeure en brouillon.
