# Revue locale jouable du solo — V92

`/solo-qa-v92` monte le **vrai `FirstHuntSoloV90`**, avec son chargement d'images,
canvas, simulation, sons, caméra, commandes clavier/tactiles/manette, pause,
esquive et bilan. Le wrapper ne dessine aucune autre scène et n'en remplace
pas les contrôles. Les fixtures sont des états **synthétiques rejoués**, pas
les parties privées d'un joueur ni une campagne déclarée terminée.

## Protection et périmètre

La page serveur refuse avant suspension si
`YAUTJA_LOCAL_VISUAL_QA_V90 !== '1'` ou `VERCEL === '1'`. Le drapeau est relu
à chaque requête ; query, cookie, drapeau public et stockage navigateur ne
peuvent pas activer la route. Le proxy existant doit également inclure
`/solo-qa-v92/:path*`, à côté de `/visual-qa-v90/:path*`, pour garantir un
**HTTP 404 avant le streaming** sur les environnements refusés. Aucun matcher
ne couvre le jeu, les API ou les PNG. Le titre et les métadonnées demandent
`noindex, nofollow`.

Le wrapper importe uniquement le composant, ses contrôles par défaut, le
codec et les fixtures. Il ne charge ni GameClient, profil, sauvegarde,
inventaire, rang, permissions de voyage ou service réseau. Les callbacks
normalisent les checkpoints et vérifient les reçus de la scène avant de les
accepter **en mémoire seulement**. Ils ne remplacent pas le vérificateur
durable du propriétaire de campagne. Les boutons natifs « sauvegarder » ou
« cité » restent les boutons du vrai composant ; la bannière QA précise
qu'ici ils n'écrivent aucun fichier et ne déclenchent aucun voyage réel.

## Fixtures disponibles

Les quatre copies minimales de `fixtures.json` dérivent des fichiers rejoués
`work-local/v92/qa/campaign-played-{arsenal,combat,dodge,complete}.json`.
Seuls les champs du checkpoint de cette scène et son SHA source sont copiés.
Aucune identité, date propriétaire, profil ou progression globale n'est
importée dans les sources déployables. Le codec réel rejette un état non
pris en charge, sans le remplacer par une nouvelle partie.

| Choix | Phase | Frame | Position X | Usage de revue |
| --- | --- | ---: | ---: | --- |
| Arsenal | arsenal | 1 | 160 | Marche, outils prêtés, dialogue et caméra |
| Combat | combat | 1634 | 2589 | Annonce du drone, déplacement et esquive clavier réelle |
| Esquive | combat | 1635 | 2583,8 | Première frame d'esquive : 23 ticks, récupération 60 |
| Débriefing | complete | 7047 | 163,5 | Bilan factuel de la triade et sortie locale |

Le sélecteur et **Réinitialiser / rouvrir** remontent le composant avec sa
fixture source. Ils abandonnent l'essai local, sans réécrire le checkpoint
source. Le compteur de reçus compte les transitions de l'essai en cours,
pas la progression d'un compte. Quitter ou demander la cité démonte seulement
la scène QA ; son état accepté reste en mémoire jusqu'à réinitialisation ou
rechargement. Le son est désactivé par défaut, activable dans la barre QA.

## Revue humaine

La barre QA est séparée du viewport du composant, sans masquer le HUD.
Après le chargement des PNG, cliquer le canvas si nécessaire et relâcher les
commandes avant d'agir. Contrôles par défaut : `Q/D` ou flèches pour marcher,
`Espace` pour sauter, **`U` pour esquiver**, `K` pour lame/signal, `H` pour
interagir, `Échap` pour pause. Le composant conserve sa neutralisation après
changement de focus, ses commandes tactiles et sa pause de visibilité.

La fixture Combat permet de tester réellement `U` depuis un état avant
esquive ; la fixture Esquive sert à observer l'animation déjà commencée.
Une validation du codec, un rendu SSR et le pipeline clavier pur ne prouvent
pas à eux seuls la peinture, les images chargées, le focus ou le gameplay
dans le navigateur. Les captures et la navigation humaines restent une
preuve distincte. La fixture Débriefing ne certifie ni la campagne complète,
ni Quatza-Rij, ni le marquage Blooded.
