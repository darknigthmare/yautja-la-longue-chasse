# V0.3.0 — FILM JOUABLE / CHASSE ASYMÉTRIQUE

Cette passe ajoute identités tactiques, pression de traque, pièges construits et persistants, 6 trophées Jungle Hunter, duel final en trois phases et migration des sauvegardes V0.1/V0.2. Les résultats canoniques restent verrouillés. Les chorégraphies hors champ sont signalées comme interprétations gameplay.

# PREDATOR 1987 — CHASSEUR / PROIE

Prototype DLC autonome **v0.3.0** pour **Yautja : La Longue Chasse**, construit sur la base observée du dépôt `darknigthmare/yautja-la-longue-chasse` au commit `3d8efbcfb42939a33093ee3ad923c0e97ff53ff5`.

## Contenu

- **Campagne humaine** : 16 chapitres, de l’insertion de l’équipe de Dutch à l’extraction finale.
- **Campagne Predator** : 12 chapitres, mêmes événements vus depuis le Jungle Hunter.
- **36 zones de référence** : briefing, jungle, épave, camp, traque, bivouac, ravin, pont, falaise, cascade, berge boueuse, zone de préparation, pièges, clairière finale et LZ.
- Résultats canoniques verrouillés ; les événements hors champ restent abstraits et explicitement signalés.
- Arsenal humain et kit Jungle Hunter documentés dans `docs/PERSONNAGES_EQUIPEMENT.md`.
- Sauvegarde locale séparée dans le navigateur (`yautja.predator1987.v03`, avec reprise des clés V0.1/V0.2).
- Aucun visuel, son, voix ou extrait vidéo officiel embarqué.

## Jouer

Sous Windows, double-cliquer `JOUER_PREDATOR_1987.bat`, ou ouvrir directement `JOUER_PREDATOR_1987.html` dans un navigateur moderne.

### Commandes

**Communes** : `Q/D` ou flèches pour avancer/reculer, `E` interaction, `V` scan/vision, `Échap` menu.

**Humains** : `J` tir principal, `K` action explosive/secondaire selon la séquence.

**Predator** : `J` lames de poignet, `K` plasmacaster, `C` camouflage, `V` vision thermique, `F` piège ou imitation vocale selon l’objectif, `Z/S` pour changer de plan quand la canopée est disponible.

## Installer dans le dépôt comme DLC privé

```bash
node INSTALLER_DLC_LOCAL.mjs /chemin/vers/yautja-la-longue-chasse
```

Le script copie le pack uniquement vers `private-dlc/predator-1987/` et ne modifie ni les routes publiques, ni `package.json`, ni les fichiers de jeu public. Pour retirer cette copie :

```bash
node DESINSTALLER_DLC_LOCAL.mjs /chemin/vers/yautja-la-longue-chasse
```

## Validation

```bash
node scripts/build.mjs
node --test tests/*.test.mjs
```

La validation finale du pack est consignée dans `VALIDATION.json`. Le navigateur automatisé de cet environnement bloque les navigations `file://` et localhost ; les images du rapport sont donc des **prévisualisations originales de mise en scène**, pas des captures prétendument issues de l’exécutable.

## Fidélité

Voir `docs/FIDELITE_1_1.md`. Ici, la fidélité vise l’ordre des événements, les personnages, l’équipement, les résultats canoniques et les situations montrées à l’écran. Les distances exactes dans la jungle, les raccords non filmés et les actions volontairement hors champ ne sont pas inventés comme des faits canoniques.

## V0.2.0 — Traque totale

Cette passe conserve les 36 secteurs et les résultats du film mais densifie le prototype : exploration sur **sol / arrière-plan / canopée** lorsque le décor le permet, 36 dossiers de terrain persistants, objectifs optionnels et maîtrises de chapitre. Les transitions supplémentaires sont des abstractions de level design clairement distinctes des événements canoniques ; elles ne prétendent pas reconstituer une géométrie métrique du tournage.

## Import GitHub

Les trois archives originales sont conservées dans `../archives/`. La preuve de cette intégration est `../qa/IMPORT_VALIDATION.json`. `VALIDATION.json` reste la preuve historique livrée avec la V0.3, pas une nouvelle validation navigateur. Les sept PNG sont des prévisualisations. Ne pas lancer `scripts/generate_content.py` : c’est le générateur historique V0.1 avec un chemin absolu, conservé pour provenance. Le build actuel est `node scripts/build.mjs`.
