# V117 — Pigments personnalisés et matières PHG simultanés

## Correction intégrée

Sur la V116, les matériaux PNG opaques étaient dessinés **après** la teinte dans le Canvas de chasse. Le matériau pouvait recouvrir la peinture sélectionnée. Dans la prévisualisation React/CSS, `background-image` masquait le `background-color` lorsque le PNG était opaque.

La V117 applique le **matériau d'abord**, puis une couche de pigment à alpha partagé de 40 %. La prévisualisation CSS utilise un dégradé uniforme à 40 % en premier fond, sur le matériau, et le Canvas un remplissage `source-atop` de même ratio. Le rendu garde les caractéristiques du rig et la correction morphologique/filtre initiale : peau, dreadlocks, filets et plaques restent **quatre canaux indépendants**.

## Contrôle QA automatisé

- Couleur seule : comportement historique.
- Matière seule : comportement historique.
- Couleur et PNG : calques combinés ; masque d'origine maintenu.
- Canvas de mission : le filtre du chasseur, l'alpha du sprite, les 256×384 et le cache à changement d'état `loading → ready` sont contrôlés.
- CI V114 : le fichier `tests/hunter-chromatic-blend-v117.test.mjs` est exécuté dans le job d'intégrité, avec contrôle TypeScript/lint dans le job complet.

## Fidélité et statut des ressources

Cette correction est **fonctionnelle**, et n'est pas une certification visuelle 1:1 de *Predator: Hunting Grounds*. Les 156 PNG Drive-only ne sont pas ajoutés ici ; aucune extraction d'UV n'a été revendiquée. Ne jamais déclarer les 25 dossiers artistiques V116 clos sans références vérifiables, vues face/dos/profil et contrôles d'assemblage à six morphologies.

### Intégration des PR

La #27 reste empilée sur la #24 : ne pas rebaser automatiquement vers `main` tant que les PR #25 et #26 modifient les mêmes systèmes Homeworld/sauvegarde. Réconcilier leurs neuf/six fichiers partagés après les fusions préalables, en privilégiant la sauvegarde propriétaire V116.
