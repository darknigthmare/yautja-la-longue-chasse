# Recette native de l’archive V115 — 9 novembre 2026

Cette recette utilise le vrai composant V115 et ses reducers dans la fixture esbuild V151 existante. Elle ne constitue pas une recette Next ou du GameClient complet. Aucun état V115 n’est injecté dans le stockage : le lancement, les ticks, la pause et la réparation passent par l’interface de production.

Le seul failpoint appelle le vrai `IDBObjectStore.put` de confirmation puis `abort()` sur sa transaction native, une seule fois dans un contexte navigateur neuf. L’intention précédente reste dans le vrai IndexedDB. La recharge et la réparation relisent les vraies APIs. Le wrapper de `Storage.setItem` observe et délègue chaque écriture ; il n’en modifie ni les octets ni le résultat.

Le double clic de réparation est constitué de deux événements `button.click()` dans la même tâche afin d’exercer le verrou d’écriture réel pendant la première transaction asynchrone. Aucun DOM ni horloge n’est remplacé. Les captures originales doivent être ouvertes séparément pour une revue visuelle. Les fichiers JSON conservent les octets du miroir, les intentions et les appels observés.
