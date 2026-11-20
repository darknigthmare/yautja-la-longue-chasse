# AVP:R — WOLF / Le Nettoyeur 0.7.0-candidate.1

## Jouer immédiatement

Ouvrir `JOUER_AVPR_WOLF_V07.html`. Le standalone embarque les six sprite-sheets nécessaires et ne requiert ni serveur ni dépendance distante.

## Contenu principal

- 47 zones / 14 chapitres ; route Cinéma ou Unrated.
- Point de vue exclusivement Wolf.
- 6 sprite-sheets : Wolf masqué, Wolf démasqué, Xénomorphe, Predalien, Facehugger et looter humain.
- 8 armes/équipements de combat.
- Gameplay 2D multi-plans, cloak, visions, scan, pounces, parade, esquive, mines, Cleaner Fluid, Medicomp et acide persistant.
- Fidélité écran par écran conservée : forêt sans Facehuggers vivants, deux Xénomorphes d'égout, Power Punch obligatoire, Combistick piscine, Earl/Scotty puis cinq Xénomorphes, maternité en scan, un Xénomorphe sur le toit avant le Predalien.
- Correction v0.7 de l'hôpital : 2 cibles au Plasma Pistol + 1 cible au Cleaner Fluid = 3 Xénomorphes dans la première mêlée, puis 2 Xénomorphes au shuriken.
- Duel final : gauntlet endommagé → retrait volontaire équipement/biomask → mâchoire interne arrachée → grapple F/E → dard caudal → frappe nucléaire.
- Protocole de chasse v0.7 : score d'honneur, rang D à S, chaîne temporaire, multiplicateur de chaîne, statistiques et bonus de pièce parfaite.
- Trauma persistant et charge acide ; la blessure canonique de la centrale ralentit légèrement Wolf jusqu'au Medicomp.
- Mémoire d'alerte : attaquer un Xénomorphe sous cloak ne le rend pas instantanément aveugle lorsque Wolf se recamoufle.
- IA de meute : les Xénomorphes peuvent flanquer entre les plans quand plusieurs sont actifs.
- Predalien : attaques spéciales télégraphiées (charge puis dard caudal après retrait de l'équipement) lisibles et esquivables sans modifier la fin canonique.
- Débrief court à chaque changement de chapitre.
- Trois presets de combat qui ne changent jamais les événements du film.
- Checkpoint automatique à chaque pièce, incluant maintenant trauma et chaîne de chasse.
- Options pour couper secousses et flash.
- Sauvegarde `tantalus.avpr.wolf.v07`, migration automatique depuis v0.6/v0.5/v0.4/v0.3.
- SFX WebAudio originaux ; aucun son ou dialogue du film copié.

## Intégration légère Tantalus

Hôte observé : `ALIENS: TANTALUS FRONTIER 86.0.0`.

```bash
node tools/INSTALL_AVPR_WOLF.mjs /chemin/vers/aliens-tantalus-frontier
```

Désinstallation :

```bash
node tools/UNINSTALL_AVPR_WOLF.mjs /chemin/vers/aliens-tantalus-frontier
```

Cette intégration copie le DLC et ajoute un bouton balisé au menu titre. Elle ne fusionne pas encore le DLC avec le `GameEngine` ou le `SaveSystem` natifs du projet principal.

## QA

```bash
node tools/build-standalone.mjs
node tools/validate.mjs
node tools/runtime-smoke.mjs
node tools/deep-runtime-tests.mjs
node tools/full-route-tests.mjs
node tools/build-integrity.mjs
node tools/verify-integrity.mjs
```

Résultat courant : **94/94 tests ciblés**, parcours Cinéma **45/45**, Unrated **47/47**, preuves **16/16** et synchronisation **100 %** sur les deux routes.

Chromium 144 reste incapable de produire une capture headless dans ce conteneur à cause du blocage DBus/zygote. Les captures navigateur historiques v0.3 sont conservées mais ne sont pas présentées comme certification visuelle v0.7.
