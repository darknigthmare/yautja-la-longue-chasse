# V58 — Présentation de l’épreuve de clan Greyback / City Hunter

## Source et écart corrigé

Le classeur utilisateur `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx` reste lu sans modification. Son extraction de référence est `docs/v56-excel-priorities.json` (SHA-256 du classeur : `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`).

`08_CAMPAGNES!F18` demande une « Épreuve de clan non létale » entre Greyback et City Hunter. `H18` précise le caractère non létal entre mentor, allié ou rival d’épreuve. Le duel livré reprend le rival de `J18`. `07_PRESENTATIONS!J18` propose une clémence d’entraînement. Ces textes décrivent une adaptation ; ils ne prouvent pas l’existence de ce duel dans *Predator 2*.

V57 annonçait déjà une épreuve non létale, mais réutilisait le réglage visuel de violence de l’utilisateur, et sa défaite affichait uniquement le texte générique de reprise. V58 rend cette intention cohérente dans les présentations disponibles.

## Changement exact

- Seul l’extrait `greyback-city-rival` déclare la politique `non-lethal-clan-trial`.
- Durant cet extrait, le renderer existant reçoit `reducedGore=true` : ses anneaux de contact non bloqué sont dorés plutôt que rouges. Les parades gardent leur couleur habituelle.
- Le briefing explique la règle de présentation. La défaite et l’égalité disent explicitement que les chasseurs se retirent sans mort dans cette branche alternative. La victoire conserve le texte non létal de V57.
- La politique n’écrit aucun réglage, gain, sauvegarde, arme ou résultat de campagne. Les autres extraits reprennent exactement la préférence de violence choisie par l’utilisateur.
- Les règles de dégâts, de KO, de chronomètre, les animations, les armes et les hitboxes restent inchangées. Un KO ne reçoit aucune nouvelle animation de mort ou de clémence.

Il s’agit d’une correction de présentation et de conclusion narrative, **pas** d’un système inédit de combat non létal, d’un désarmement animé, d’une cinématique de remise du silex ni d’une reproduction 1:1 d’une scène canonique. Les poses de clémence de `07_PRESENTATIONS!J18` restent à produire. La continuité *Predator 2* reste séparée de Golden Angel et de *Prey*.

## Vérification

`tests/pit-narrative-presentation-v58.test.mjs` : 3/3 réussis. Les trois tests couvrent l’attribution aux cellules du classeur, l’isolation de la politique avec les deux préférences utilisateur, les issues non létales et l’absence de succès après abandon. Avec les régressions narratives V57 : **14/14 réussis**, dont huit vrais duels du moteur avec vainqueur opposé pour chaque extrait et contrôle des résultats d’extension.

La première exécution des tests a été bloquée par les restrictions de lecture du sous-processus esbuild, avant de charger le code. La même commande dans le contexte autorisé passe. Ce refus d’accès n’est pas compté comme un test fonctionnel réussi.

Recette navigateur : `scripts/verify-pit-nonlethal-v58.mjs`, variables `V58_NONLETHAL_QA_URL` et `V58_NONLETHAL_QA_OUTPUT`. Elle crée deux contextes Chrome de test, l’un avec la préférence normale, l’autre avec violence réduite. Pour chaque préférence, elle lance Greyback puis Berserker et observe passivement les couleurs des vrais anneaux de contact Canvas pendant les frappes de l’IA. Elle termine une vraie défaite de Greyback pour vérifier sa conclusion. Les réglages et la progression sont comparés octet pour octet avant/après. Aucune vie, phase ou issue de combat n’est injectée.

Premier passage navigateur : les vrais coups retirent de la vie, mais aucun anneau d’impact n’est observé tant que les gains de Traque suivent le coup. Le diagnostic passif capture 379 appels `arc` et 894 traits ; seuls les cercles d’anticipation (rayon 8, largeur 2, couleur `#f7ce79`) apparaissent, ce qui exclut une panne générale de l’observateur. L’examen du moteur et du Canvas révèle une régression préexistante : le Canvas conditionne son impact au dernier événement, alors que le moteur émet un gain de Traque après `hit` ou `block`. Les premières recettes échouées restent dans `work-local/v58/qa/nonlethal-local`, `nonlethal-next-diagnostic` et `nonlethal-next-diagnostic2`.

Après correction de la sélection d’événement par `getPitImpactFeedback`, la recette complète passe sur les deux candidats définitifs : Vinext `http://127.0.0.1:4177`, puis Next `http://127.0.0.1:4178`. Chaque passage valide sept groupes : quatre duels réels (Greyback et Berserker, avec chaque préférence), une vraie défaite de Greyback et deux contrôles de conservation des réglages et de la progression. Aucun point de vie ni résultat n’a été injecté. Aucune erreur JavaScript ou console n’a été relevée.

Les dix captures de ces deux passages ont été inspectées. Greyback reçoit bien les impacts dorés avec les deux préférences. Berserker conserve les impacts rouges en mode normal et dorés en mode réduit. La défaite de Greyback affiche clairement que City Hunter remporte l’épreuve, que Greyback se retire et qu’aucun des deux chasseurs n’est tué. Les commandes de reprise et le résultat restent lisibles.

Rapports et captures : `work-local/v58/qa/nonlethal-vinext-final` et `work-local/v58/qa/nonlethal-next-final`. Ces résultats qualifient les builds locaux intégrés après le correctif d’impact ; ils ne constituent pas à eux seuls une preuve de publication publique. Les premières recettes échouées sont conservées séparément.
