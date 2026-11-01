# V151 — un ZIP complet avec altitude, climat et précontrôle sans casser V124

Les V146–V150 apportent des outils cohérents mais possèdent leurs propres téléchargements. V151 regroupe leurs **valeurs par défaut canoniques de lecture seule** dans le ZIP existant « Télécharger tous les calques » :

- `environment-study-v146.json` : saison de référence à l'équinoxe et inclinaison théorique documentée, sans simulation d'orbite.
- `world-preflight-v149.json` : appartenance des régions/territoires, routes symétriques, HQ, hydrologie et avertissements climatiques.
- Pour une planète V115 **avec rayon enregistré**, `relief-height-rg16-map.png` et `relief-preview-map.png`, 512×256, issus exactement du même algorithme V150 et du **vrai masque de terres V124**.
- `manifest.json` garde le **schéma V124 et son code**, avec un champ additionnel `supplementaryStudiesV151` décrivant les noms, dimensions et le décodage RG16. Les anciens consommateurs du manifeste ne perdent ni leurs couches ni leurs catalogues de matières V125/V130.

Les réglages du panneau V150 peuvent produire d'autres variantes, mais **le pack de référence utilise explicitement 8 000 m, escarpement 0,55 et la graine du monde**. Les anciens mondes sans rayon restent exportables avec les diagnostics JSON, mais aucune altitude métrique artificielle ne leur est attribuée.

Aucune carte n'est re-générée au cours de l'export, aucune donnée de conquête n'est insérée, et aucun niveau d'altitude ne devient une collision ou une restriction tactique sans un moteur terrain distinct.

Tests de domaine : `tests/planet-export-studies-v151.test.mjs`. QA Chromium : ouverture réelle du ZIP V124, présence des sidecars V151, décodage d'un PNG RG16, identité du code et maintien des calques modulaires anciens.
