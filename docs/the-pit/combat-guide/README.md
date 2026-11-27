# Guide commun de jeu de combat — sources de The PIT

Les trois documents d’origine sont conservés **intégralement, sans modification**. Ils sont les exigences de conception fournies par le projet ; leurs exemples ne sont pas des faits de canon Predator.

| Document | Version interne | Sections | Octets UTF-8 |
| --- | --- | --- | ---: |
| [Guide général](sources/Combat_Games_Guide_General_v1.0.txt) | 1.0 · 25 novembre 2026 | 00–29 | 55 172 |
| [Extension 01 — personnalité, équipes, entités et bonus](sources/Combat_Games_Extension_01_Tag_Taunts_Bonus_v1.0.txt) | 1.0 · 26 novembre 2026 | 30–49 | 60 589 |
| [Extension 02 — accès et déblocages](sources/Combat_Games_Extension_02_Slots_Verrouilles_Deblocages_Abonnes_v1.0.txt) | 1.0 · 27 novembre 2026 | 50–67 | 47 334 |

Le [manifeste](combat_guides_manifest.json) conserve la provenance, les tailles et les SHA-256. Les tailles correspondent aux métadonnées des fichiers d’origine ; leurs checksums distants n’étaient pas exposés. Les SHA-256 identifient les copies importées, sans prétendre à une comparaison cryptographique non effectuée.

L’[index des 68 rubriques](combat_guides_sections.json) donne les emplacements exacts. La [checklist des extensions](combat_extensions_requirements.json) comprend 172 critères reformulés et les 40 cas d’acceptation d’origine. Ses statuts individuels restent non évalués : une source copiée n’est pas une fonction de jeu validée.

L’adaptation concrète est dans la [bible The PIT](../BIBLE_THE_PIT.md) et la [matrice de traçabilité](../TRACEABILITE_GUIDES_20261127.md). Les écarts entre les exigences et le code sont conservés, ainsi que les éléments différés. Le [point de reprise](../CONTINUATION_20261127.md) indique le lot en cours.

## Périmètre des deux extensions

L’extension 01 inclut aussi les clashes/QTE, les entités natives, les objets placés, les projectiles persistants et l’espace d’exploration. Ces rubriques restent présentes même lorsque The PIT ne possède pas encore leur réalisation complète.

L’extension 02 distingue découverte, droit d’accès, disponibilité technique et compatibilité avec la partie. Un verrou ne masque pas un asset manquant. Un costume ou un stage dédié au soutien conserve les mêmes exigences de lore et de lisibilité ; le document n’active aucune offre ni aucun paiement.

Les références fournisseur et les liens de jeux présents dans les sources sont conservés comme références des documents datés. Ils doivent être revérifiés lorsqu’une intégration externe ou une nouvelle affirmation de canon s’appuie dessus.
