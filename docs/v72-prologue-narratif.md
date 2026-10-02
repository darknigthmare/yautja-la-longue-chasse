# V72 — Prologue narratif : avant la longue chasse

## Problème corrigé

La version V71 lançait correctement la nouvelle partie dans un duel non létal de Younglings, révélait ensuite le village, la lune rouge et le titre, puis envoyait le joueur dans la cité après une ellipse. La logique de progression était cohérente, mais la scène ne disait pratiquement jamais **pourquoi** le duel existait ni ce qu'il signifiait pour le personnage.

Le résultat donnait l'impression d'arriver directement dans un combat isolé, puis de voir le titre avant d'être déposé dans le Homeworld.

## Nouvelle intention

Le duel reste une épreuve de jeunesse locale au clan. Il **n'est pas** le Blooding, n'accorde aucun trophée, aucune marque de Blooded, aucun équipement adulte et aucun droit de chasse autonome.

La scène sert désormais de première reconnaissance du personnage :

1. **Lune rouge — Avant le masque**  
   Le joueur est présenté comme un Youngling élevé sous le regard du clan. La narration pose l'idée centrale : la chasse exige de savoir frapper mais aussi s'arrêter.

2. **Village — Le clan observe**  
   La caméra montre le lieu de vie avant l'arène. Le Maître de jeunesse explique que le clan ne l'envoie pas chasser : il juge maîtrise, courage et sang-froid.

3. **Cercle — Le rival n'est pas une proie**  
   Le second Youngling est présenté comme un pair de la même génération. Le duel est explicitement non létal ; la victoire correspond au KO, pas à l'exécution.

4. **Arène — Ce n'est pas le Blooding**  
   Le jeu annonce clairement qu'une victoire ici ne rend pas Blooded. Elle ouvre seulement la suite de l'apprentissage des Unblooded.

5. **Geste d'acceptation**  
   Le maintien/appui déjà existant est recontextualisé comme un geste volontaire d'entrée dans le cercle.

6. **Après la victoire**  
   La narration souligne que le joueur retient le coup final. Le clan reconnaît sa maîtrise mais ne lui remet ni trophée ni marque.

7. **Titre et ellipse**  
   Quelques années passent. Le personnage quitte la nurserie et entre dans la cité comme Unblooded. C'est à ce moment que commence réellement sa longue formation puis, bien plus tard, son propre rite de chasse.

## Cohérence franchise

La franchise cinématographique établit explicitement dans *Alien vs. Predator* (2004) l'existence d'un **rite de passage / coming-of-age rite** pour de jeunes Predators. Le prologue V72 évite donc de confondre le simple duel d'enfance avec cette initiation beaucoup plus tardive.

Les appellations Youngling, Unblooded, Young Blood et Blooded proviennent surtout de l'univers étendu et leur usage varie selon les clans et les œuvres. Le jeu assume donc une **continuité originale compatible avec cet univers étendu**, plutôt que de prétendre qu'une hiérarchie unique et immuable est établie par tous les films.

Références de contrôle :
- 20th Century Studios — *Alien vs. Predator* : https://www.20thcenturystudios.com/movies/alien-vs-predator
- Xenopedia — Yautja / Young Blood / Un-blooded / Blooding Ritual : https://avp.fandom.com/
- AvP Central — Blooding Ritual / Predator ranks : https://www.avpcentral.com/

## Implémentation

- `NURSERY_TIMING.arrivalTicks` passe à 720 ticks (12 s).
- Les trois décors déjà validés sont réutilisés comme plans de cinéma : lune rouge → village → arène.
- Après 180 ticks (3 s), le joueur peut passer le reste de la cinématique avec une nouvelle pression de confirmation.
- Les checkpoints existants restent au format `version: 1`; aucune nouvelle récompense ni preuve de progression n'est ajoutée.
- `getNurseryNarrativeBeat(state)` fournit au rendu une couche narrative indépendante de la simulation du combat.
- Le HUD de combat reste absent pendant le prologue.
- Le texte post-victoire maintient explicitement la différence entre reconnaissance de jeunesse et Blooding.
- La fin continue d'émettre uniquement `intro-completed` puis le rite interne `nursery-recognition`.

## Accessibilité et rythme

La narration est disponible dans le texte visible et dans la région `aria-live`. La cinématique peut être passée après un minimum de contexte, mais elle n'est pas sautée par une touche déjà maintenue. Le mode `Prêt par une pression` reste disponible.

Aucun dialogue important n'est uniquement transmis par l'audio ; le projet peut donc continuer à fonctionner avec les fichiers audio optionnels manquants.
