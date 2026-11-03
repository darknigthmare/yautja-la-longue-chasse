# V135 — Suivi de qualité chromatique et decals

Document de référence : `docs/production/Yautja_PHG_Personnalisation_Audit_Production_V135.xlsx`, également archivé sur Google Drive dans le dossier PHG. Le classeur conserve 14 onglets V134 et ajoute une 15e feuille **Régressions V135**, avec 12 entrées sourcées, 8 priorités P0 et deux indicateurs calculés par formule.

## Correctifs réels publiés

- V133 : test de sélection de decals aligné sur l'objet de sauvegarde réel, avec rejet des chaînes d'URL arbitraires.
- V135 : correctif de perte de l'identité Alpha/Samurai après le premier changement de peau/armure/masque. La persistance V116 calcule cette provenance à partir du dernier propriétaire enregistré, jamais de la palette provisoire fournie par l'atelier.
- Tests : `hunter-chromatic-persistence-v116.test.mjs` inclut les parcours Alpha, Samurai et la tentative d'usurpation d'identité.
- Les tests de matériaux et de compilations TypeScript, linters, gameplay, domaines et intégrité ont été observés verts sur le commit `3652aa75662ce22b156319b000b3c30b61c58655`. Le navigateur complet n'était pas encore terminé au moment du rapport.

## Limites persistantes

Les 48 decals V133 et 7 coques originales sont bien des contenus *jouables en branche*, pas des actifs pixel-perfect issus de *Predator: Hunting Grounds*. Les 7 finitions de biomask V132 utilisent des matériaux originaux reconstruit. Les 34 questions de fidélité du registre V122 restent ouvertes, tout comme l'import complet des 156 textures V120 et la QA multi-morphologie (six morphs, face/profil/dos, plusieurs poses).

Aucune fusion vers `main` ne doit être revendiquée avant validation des derniers jobs CI.
