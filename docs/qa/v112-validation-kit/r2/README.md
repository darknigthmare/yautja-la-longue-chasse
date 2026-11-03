# Carnet R2 — protocoles sans JavaScript et téléchargements volontaires

Les six protocoles détaillés et les neuf objectifs novices résident désormais dans le HTML lisible. Le JavaScript lit ce contenu unique pour enrichir les formulaires et le rapport. Sans JavaScript, les protocoles sont ouverts, les objectifs restent lisibles et aucun résultat humain ou export n’est fabriqué.

Le [rapport logiciel](carnet-software-report.json) passe dans Chromium 154.0.8037.57 avec et sans JavaScript. Consentement, révocation, relecture du JSON, invalidation après édition, règles originales et 45 observations vierges sont conservés. Aucun critère humain ou matériel n’est fermé. Les captures [mobile](carnet-390.png), [bureau](carnet-1280.png) et [sans JavaScript](carnet-sans-js-1280.png) complètent cette reprise ; les captures initiales du dossier parent restent intactes.

La page n’émet aucune requête automatique supplémentaire et ne stocke pas le carnet dans le navigateur. Les liens XLSX/PDF constituent des téléchargements volontaires supplémentaires, seulement au clic : les deux fichiers sont effectivement téléchargés avec et sans JavaScript, puis comparés octet par octet aux copies publiques. Les requêtes sont des GET sans paramètres ni referrer ; les champs du carnet ne sont pas envoyés.

- XLSX : 734 128 octets, SHA-256 `f13dd1a3548aebac25ba77e11ad5c5835757fc49da94491dbe69dbd291b59989`.
- PDF : 1 480 498 octets, SHA-256 `e7b5793d7be0151b01bdc67919074f2bf21a713bdb037ec945b8b3d9d789e5dc`.

La référence XLSX a une seule source dans `#reference-workbook-sha256`. Le carnet indique que les statuts courants relèvent du journal Reprise et que le compagnon PDF conserve les 219 revues historiques et huit critères restants. Le carnet ne prononce pas les deux décisions existantes du journal.

Commande exécutée, code 0 : `node scripts/qa-qualification-kit-v112.mjs`. Cette recette contrôle le carnet local et ses téléchargements ; elle ne remplace aucun essai humain, périphérique physique ou session Microsoft Excel.
