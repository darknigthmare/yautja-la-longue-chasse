# Contrôle de dossiers de production V108

Le contrôleur vérifie un paquet de PNG et de reçus sans les publier ni modifier les classeurs historiques. Il compare l’ID du dossier, les SHA et tailles du PNG et du reçu, la tentative sélectionnée et son prompt réellement enregistré, puis décode le PNG et mesure sa transparence et sa silhouette. Un prompt seulement planifié, une tentative différente, une image modifiée, un ID dupliqué ou un chemin sortant du paquet est refusé.

```sh
node scripts/inspect-production-evidence-v108.mjs RACINE_PAQUET MANIFESTE.json NOUVEAU_RAPPORT.json
```

Le manifeste contient `schemaVersion: 1` et une liste `assets`. Chaque entrée précise `id`, `pngPath`, `receiptPath`, `sha256`, `receiptSha256` et `bytes`. Les IDs sont ceux des dossiers source suivis. Les chemins sont relatifs à la racine du paquet. Le fichier de rapport doit être nouveau ; aucun fichier fourni n’est réécrit.

Les deux manifestes réels dans [qa/v108-production-evidence](qa/v108-production-evidence) permettent de reproduire le contrôle sur les dix-huit poses V107 et les dix-huit PNG V6.14 déjà présents. Les trente-six couples passent. Ce sont des produits statiques existants : aucune animation ou nouvelle identité n’est admise par ce contrôle.

Un reçu fourni cohérent ne constitue pas une authentification indépendante du fournisseur. La revue visuelle enregistrée ne certifie ni anatomie cachée, ni fidélité canonique, ni kit complet. Les vingt-et-un reçus V6.13 et les trente-six PNG/traces V6.10 encore absents restent ouverts ; les lots V6.14/V107 ne sont pas leurs remplaçants.
