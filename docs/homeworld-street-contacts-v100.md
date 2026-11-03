# Habitants urbains abordables — V100

La cité dessinait déjà les habitants des cours du quai et des bas-quartiers,
ainsi que les quatre personnes des écuries et chenils, mais leur provider V78
les excluait explicitement de toute recherche de dialogue. La couche V100
permet de parler aux **seize personnes réellement acceptées et rendues** :
douze habitants de cour et quatre personnes de service. Les deux candidats
refusés pour leur passage obstrué ne deviennent pas des interlocuteurs.

Le besoin provient de la mission utilisateur conservée dans
`docs/specifications/homeworld-v81/mission-homeworld-original.txt` : ville
peuplée, circulation des habitants, échanges et réactions. Les personnes,
métiers et trajets proviennent de `homeworldUrbanPopulationV78.ts`, des cours
V81 et de `homeworldNpcAdditionsV84.json`. Les phrases V100 sont une écriture
locale nouvelle ; elles ne sont pas présentées comme des lignes d’un classeur
ou des paroles officielles de la franchise.

## Parcours intégré

Le joueur approche une personne à moins de 96 unités sur **son étage réel**.
Un anneau au sol et son métier identifient la personne seulement lorsque le
prompt peut lui être attribué. Interagir ouvre la fenêtre de dialogue existante
du Hub, arrête les entrées et la vitesse sans déplacer le corps, puis suspend
la même horloge de cité que les autres conversations.

Les portes, passages, points de mission, hôtes et habitants interactifs
historiques conservent leur priorité. La position du contact utilise
`homeworldResidentPoseV77`, donc les allers, haltes et retours V84 réellement
dessinés. Le contrôle de segment complet V77 vérifie tout l’approche au sol,
avec les décorations tardives V84/V92 ; un obstacle ou une autre profondeur
ne donne pas un dialogue à travers une paroi. La même fonction d’occlusion
qu’emploie le dessin des résidents masque le prompt d’une personne cachée
par la peinture opaque d’un bâtiment.

Trois sujets sont disponibles : travail, prochaine halte et repères du
quartier. Les métiers des écuries et chenils ont leurs propos dédiés ; les
aspirants restent des personnes en formation. L’accueil distingue le profil
de jeunesse réel du chasseur autonome. Le sujet de halte reprend la phase
réelle de la routine et ne prétend pas montrer un geste social absent.

Les repères ne comprennent que des bâtiments publics déjà associés au
quartier de cette personne, et seulement si ce quartier a été enregistré
comme visité. Les régions, départs, réserves cachées et conditions de quête
ne sont pas révélés. Choisir un repère repasse par l’atlas actuel ; le callback
revalide la personne, le propriétaire, le contexte et les lieux connus avant
de demander ce repère. Il ne guide pas automatiquement le corps.

Une conversation devenue distante, sur un autre étage/espace ou appartenant
à une autre sauvegarde perd ses contrôles immédiatement, puis se ferme à la
frame suivante. Une nouvelle fenêtre ne peut pas être fermée par l’ancienne
frame. Le focus revient au viewport ; les boutons du dialogue gardent la
navigation clavier/manette du Hub et des cibles tactiles d’au moins 44 px.

## Persistance et limites

Les métadonnées V78 restent historiques : ces personnes ne sont toujours pas
ajoutées aux visites, aux registres de quête ni aux corps solides. La couche
de dialogue est locale et ne change aucun schéma, clé, checkpoint, costume,
vitesse, identité, nombre d’habitants ou route. Discussion et consultation ne
donnent aucun objet, monture, soin, trophée, permission, rang ou récompense.
Leur absence de sauvegarde personnelle n’efface pas la sauvegarde de position
ou les découvertes déjà gérées par le Hub.

Aucun nouvel asset ni animation sociale n’est produit par ce chantier.
Les dessins de marche natifs existants restent utilisés ; les nouveaux textes
et l’anneau de sélection ne sont pas comptés comme des animations. Les propos
décrivent les usages de cette cité du projet, pas une institution universelle
ou une nouvelle règle canonique.

## Validation

`tests/homeworld-street-contacts-v100.test.mjs` exécute le modèle réel, le rendu
React de la scène et du dialogue, ainsi que le callback de repère extrait du
Hub et compilé sans remplacer le moteur. Sept tests vérifient seize approches
physiques, les refus de contexte, les poses natives, le masque de peinture,
la confidentialité des repères, les sujets accessibles et le rejet des
callbacks devenus étrangers ou distants. Les régressions ciblées de population
urbaine, conversations V75, entrées et scène native V77 passent également :
**43 tests réussis au total, aucun échec ni ignoré**. Le lint strict des fichiers
du lot ne signale aucune erreur ni avertissement. La recette Chromium est
consignée séparément par la QA V100.
