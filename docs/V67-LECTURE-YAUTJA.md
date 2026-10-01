# V67 — Déchiffrage visuel des paroles

`YautjaTranslationV67` dévoile progressivement les mots français à la place de huit motifs graphiques angulaires originaux. L’inspiration cinématographique demandée est la bande-annonce officielle de **Predator: Badlands** : https://www.youtube.com/watch?v=43R9l7EkJwE. La page et son titre ont été vérifiés ; cette livraison ne prétend ni reproduire un plan à l’identique, ni transcrire une langue, une grammaire ou un alphabet Yautja canonique. Aucun nouveau dialogue canonique n’est inventé et aucune voix n’est générée.

Le composant accepte `text`, `paused`, `reducedMotion`, `className` et `showSkip`. Le français complet est présent dès le premier rendu pour les technologies d’assistance ; la couche de glyphes est décorative et masquée à ces technologies. Il n’existe ni région live répétée à chaque lettre, ni déplacement automatique du focus, ni condition de jeu liée à la fin de l’effet.

La progression est monotone, sans brouillage aléatoire ni clignotement. Elle dure de 480 à 1600 ms de temps actif, selon la longueur. La pause du jeu et la visibilité de la page suspendent ce temps. Le réglage système `prefers-reduced-motion` ou la prop dédiée affichent directement le français ; leur retrait ne réencode pas une phrase déjà révélée. Une phrase identique conserve son avancement malgré les mises à jour du parent. Une nouvelle phrase redémarre son propre effet.

« Lire immédiatement » fonctionne au clavier et conserve son focus lorsqu’il devient « Texte affiché ». Une fois quitté, ce bouton n’est plus visible ni accessible, mais son emplacement est conservé pour empêcher les commandes voisines de se déplacer pendant une action. Le marqueur `data-youth-control` évite que son utilisation déclenche la pause automatique du canvas de formation. Les chaînes longues, les espaces et les graphèmes composés restent intacts ; les mots de plus de 32 graphèmes et les caractères au-delà du budget de 360 symboles restent en français direct.

## Raccords

- L’annexe emploie l’effet pour l’invitation, les archives, l’aveu transmis et la conclusion. Puzzles, choix, conséquences à décider, retours de sauvegarde et boutons restent immédiatement lisibles.
- Les demandes de la soigneuse l’emploient sur ses paroles. Objectifs, propositions de réponse et progression restent en français direct. Les rappels destinés au personnage jeune sont directs.
- La formation l’emploie sur la lecture du dernier indice du carnet et le bilan narratif de patrouille. HUD, télégraphes, temps, actions de combat et instructions urgentes ne sont pas animés.
- Le raccord HomeworldHub effectué par le responsable principal couvre séparément les salutations et les paroles de l’enquête.

## Vérifications

48 tests ciblés passent : 4 nouveaux tests de texte, temporisation et rendu accessible, plus 44 contrôles existants d’annexe, PNJ, sauvegarde et présentation jeunesse. Le lint des fichiers possédés passe sans erreur.

Le véritable composant React et son CSS ont été exécutés dans un harnais Chrome isolé : 8 groupes passent, avec quatre captures inspectées. La recette vérifie le français accessible initial, la pause, la stabilité lors des mises à jour, le dévoilement final, les dimensions avant/après, le changement de phrase, la commande clavier, la conservation du focus, les réglages de mouvement réduit et le cas d’un long texte mobile. La visibilité masquée y est simulée par l’événement du navigateur ; elle n’est pas présentée comme une manipulation d’une fenêtre système.

La recette réelle de la compilation V67 sur `http://127.0.0.1:4186` passe aussi : quatre groupes et six captures inspectées. Elle parcourt physiquement la cité et les salles jusqu’aux dialogues de l’instructeur et de la soigneuse, vérifie leurs salutations, le français accessible initial, leurs actions actives et le focus clavier de lecture, puis leur présentation mobile. Une sauvegarde produite par le moteur à la dernière trame de l’embuscade de jeunesse est ensuite importée avant le jeu : le moteur réel déclenche l’évaluation, « Lire immédiatement » laisse les ticks continuer sans pause, puis le menu de pause arrête et reprend la formation. Ce n’est pas une campagne entière rejouée dans le navigateur. Le focus après clic jeunesse n’a pas été vérifié séparément dans cette recette, contrairement au focus des deux dialogues adultes et au composant isolé.

Les horloges contrôlées du harnais avancent durant le chargement différé et le décodage des images ; leur arrêt complet empêchait la scène de se monter. Ces corrections concernent la recette, pas le jeu. Les deux échecs de harnais sont conservés et expliqués dans `docs/v67-translation-application-qa.json`, séparé des preuves du composant.

La recette publique V67 attend le signal de publication READY. Les preuves publiques V66 demeurent dans leurs fichiers séparés et ne sont pas renommées V67. Les corrections ultérieures du codex des passages ou du texte du Solo ne sont pas couvertes par cette preuve locale limitée aux fichiers de traduction répertoriés avec leur SHA.

Commande de répétition publique, à lancer uniquement après READY :

```powershell
$env:TEMP='I:\CodexTemp\yautja-v66-20261001\browser-temp'
$env:TMP=$env:TEMP
$env:CAMPAIGN_QA_FIXTURE_FILE='work-local/v66/campaign-fixture.json'
$env:V67_QA_URL='https://yautja-la-longue-chasse.vercel.app'
$env:V67_TRANSLATION_APPLICATION_OUTPUT='work-local/v67/qa/translation-public'
node scripts/verify-yautja-translation-application-v67.mjs
```

Le futur rapport public sera `docs/v67-translation-public-qa.json`, sans écraser la recette locale.
