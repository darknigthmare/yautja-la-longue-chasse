# V73 — continuité narrative et cérémonie du prologue

Le début reste le prologue de jeunesse. Le contenu conserve le duel réel, la victoire superposée à la vue du village et la lune ; il ajoute les étapes qui expliquent pourquoi les deux jeunes sont là et comment le protagoniste rejoint la cité. Les dialogues et l’architecture sont une adaptation originale du clan du jeu, pas des institutions ou une géographie canonique certifiées.

## Parcours livré

1. Cinq cartes à lecture manuelle : enfance dans le clan, lieu de la nurserie, briefing du maître, parole du rival et acceptation explicite des consignes non létales.
2. Préparation par geste maintenu ou mode accessible par pression ; relâcher les commandes reste obligatoire avant le contrôle du duel.
3. Duel contre le CPU, mise à terre réelle, célébration native du Youngling et rival au sol, élargissement du village et titre sous la lune rouge.
4. Deux scènes de débrief : arrêt de l’exercice puis récupération du rival. Aucune commande d’attaque pendant le texte.
5. Les deux enfants rendent le matériel et quittent la nurserie à pied sur le chemin peint, avec leurs vraies cellules de marche distinctes.
6. Deux pages établissent l’ellipse de formation et la convocation. Aucun nombre d’années n’est présenté comme un fait du canon.
7. Le terminal affiche le nom déjà choisi lors de la création de la partie. Après l’annonce, deux panneaux du voile réel s’écartent ; l’Unblooded traverse le couloir avec ses sprites V48.
8. Audience : chef assis, instructeur et deux rangées de neuf habitants de rôles différents, composités indépendamment sur le décor. Code du clan, affectation et étapes suivantes sont expliqués.
9. Le jeune quitte le hall à pied avant la validation durable et l’entrée dans la cité jouable. La visite suivante au chef donne les consignes personnelles ; elle ne rejoue pas une première audience publique.

La victoire d’enfance donne seulement la reconnaissance de la nurserie. Ni Premier Sang, ni trophée, ni arme personnelle, ni mission adulte accomplie, ni vaisseau n’est accordé par ces nouvelles scènes. Dojo, armurerie, camp, baraquements et campagne ultérieure restent des étapes jouables séparées.

## Texte, reprise et durabilité

Les paroles du maître, du rival, du chef et de l’instructeur utilisent `YautjaTranslationV67` : glyphes décoratifs vers français et bouton « Lire immédiatement ». Les instructions système et le terminal restent directement lisibles. Lire le texte ne valide pas une scène ; terminer le déchiffrement n’est jamais une condition de sauvegarde. Pause conserve l’effet déjà avancé ; reduced motion affiche directement le français. Il n’y a pas de doublage vocal ajouté.

Le curseur `continuityV72` reste une extension facultative du checkpoint de nurserie version 1. Les phases actives antérieures reçoivent un récapitulatif figé, sans réinitialiser la position, le vainqueur ou le temps du duel déjà joué. Une ancienne fin acquise n’est pas rejouée. Les curseurs futurs ou impossibles sont refusés, jamais réparés en victoire. Le moteur ancien sans extension conserve aussi l’arrivée narrative distante de 720 ticks et son passage facultatif après 480 ticks ; le directeur étendu utilise 90 ticks après ses cinq pages explicites.

Chaque changement de carte émet un checkpoint. Lecture manuelle, pause, onglet caché et images manquantes suspendent la simulation. Une erreur d’image sur une reprise reste récupérable au même checkpoint. La fin n’émet sa preuve qu’après la dernière marche et la disponibilité du chapitre suivant. Un refus de stockage doit laisser la scène complète avec une action de réessai, sans retour forcé au duel.

## Images OpenAI natives

Les fichiers ci-dessous ont été intégrés sans modifier leurs pixels ; les sources générées et les images V47/V48 antérieures sont conservées. Les cinq prompts exacts figurent dans `docs/v72-prologue-imagegen-prompt.md`. Le chef assis reprend l’identité et la tenue du chef original de l’atlas civil du clan ; aucun roi nommé de la franchise n’est revendiqué.

| PNG dans `public/game/prologue/v72/` | Dimensions | Usage / SHA256 |
| --- | --- | --- |
| nursery-exit.png | 1672 × 941 | Passage de sortie ; 93505a26dd343b3b6cef3f049bf576ca45c0003e5923c5191c13b2fbb4be5c42 |
| clan-arrival-corridor.png | 1672 × 941 | Alcôve du terminal et porte ; 7df108ae617534f1a361c7aca0bd9ed1227db7b4da300998d344d868c79d3953 |
| clan-audience-hall.png | 1672 × 941 | Hall, trône vide, passages dégagés ; 646aced3fe9a62fa5ea6fcceb249546ff2bde87fc57d216475b5b3fdf9bb2b6c |
| clan-chief-seated.png | 1024 × 1536 | Chef assis RGBA ; 491c94e1ff66c7496871f729a952a5d09486aae4057015551604c2d3f0bc611f |
| clan-door-veil.png | 1448 × 1086 | Voile RGBA en deux panneaux ; f14d017cefcd5f4a940b9aaf70caf39c8c99f94976acff7013fb1b37f8891cb7 |

Les appuis utilisent les plans de sol mesurés dans chaque image : chemin .692, couloir .782 et hall .785 de la hauteur source. Les sprites Youngling et Unblooded prennent leurs orientations dessinées natives ; les figurants civils seuls peuvent retourner leur portrait d’origine pour regarder le protagoniste.

## Vérification

Après résolution de la fusion distante : **65/65 tests ciblés PASS**, ESLint ciblé PASS, TypeScript `--noEmit --incremental false` PASS. Ces tests jouent le CPU réel jusqu’à la fin, valident tous les checkpoints intermédiaires, la reconnaissance seule, les sauvegardes anciennes/futures, les interruptions, le passage physique et les PNG natifs.

La recette navigateur `scripts/verify-nursery-continuity-v72.mjs` utilise une nouvelle partie et un duel réellement gagné au clavier, sans modifier les phases ou points de vie. Elle vérifie desktop, mobile/reduced motion, glyphes/pause, reprise réelle, refus d’écriture entre deux cartes, refus de sauvegarde finale, réessai, image manquante, entrée dans la cité et égalité SHA des cinq PNG servis.

**V73 local, 2026-10-02 03:52:12 UTC : PASS — 8 contrôles, 26 captures, 5 PNG vérifiés, aucune erreur JavaScript ni requête défaillante hors panne volontaire.** Le serveur testé est le build final du 02/10 à 03:48:39 UTC sur `http://127.0.0.1:4192`, et la recette exige la version visible V73 après la création réelle de la partie. Rapport et captures : `work-local/v73/qa/nursery-continuity-local-final-css/`.

L’inspection visuelle initiale a repéré un vrai défaut portrait : le bitmap centré verticalement était caché par la carte, avec un grand vide au-dessus. Une règle CSS cale maintenant le canvas en haut quand une carte est affichée sur mobile. Après recompilation, le parcours complet a de nouveau passé ; les captures `mobile-clan-code.png` et `mobile-city-directions.png` ont été inspectées et montrent le hall, le chef et les figurants au-dessus du texte. La recette exige aussi que les 80% supérieurs du bitmap restent hors du panneau de dialogue et que les boutons aient au moins 44 pixels de hauteur.

**V73 production, 2026-10-02 04:09:49 UTC : PASS — les mêmes 8 contrôles, 26 captures et 5 PNG vérifiés**, sur [l’alias public](https://yautja-la-longue-chasse.vercel.app). Le parcours crée une nouvelle partie, exige la version V73, gagne de nouveau le CPU au clavier, puis rejoint la vraie cité seulement après l’écriture durable. Les pannes de stockage et d’image sont injectées sans changer les phases, positions, points de vie ou vainqueur. Aucun message d’erreur JavaScript ni HTTP hors panne volontaire. Rapport/captures : `work-local/v73/qa/nursery-continuity-public/`. Le hall natif, les indications de sortie en portrait et l’écran de réessai final ont également été inspectés sur les captures publiques.

La reprise mobile utilise une sauvegarde effectivement gagnée au clavier, copiée dans un contexte mobile isolé ; elle ne prétend pas vérifier une connexion ou synchronisation de compte réelle. Les dialogues restent des sous-titres sans doublage, et le clan garde son statut d’adaptation originale du jeu.
