# Homeworld V105 — le relevé depuis le viaduc

Le cartographe du registre propose maintenant l’option A de `D6-W-PNJ-ROLE-12`. Le joueur part du pupitre existant du port, rejoint à pied l’escalier public du Conseil, effectue sa montée physique de huit secondes, traverse la terrasse et le viaduc jusqu’au point haut, compare les deux repères connus, date son observation, puis redescend et revient présenter le relevé au même interlocuteur.

## Source et adaptation locale

L’extrait V104 reste inchangé : les onze lignes de la scène V6 comprennent la scène, les huit répliques et les deux options. Le classeur original `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx` a pour SHA-256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`, le corpus extrait `e36efdc3d5ac8fddb74dd683458b72873203446204e768b02aa13e4db17eed30`.

- Scène : `Scènes de dialogue V6!A392:Q392`.
- Option A : `Choix et actions V6!A806:I806`, « Atteindre le point haut, comparer les deux repères puis dater le relevé. »
- Choix exact : `Répliques V6!A3259:K3259`, « Je complète le relevé depuis le point haut. »
- Réponse exacte : `Répliques V6!A3260:K3260`, « Garde l’heure de ton observation. Une route peut changer après ton passage. »
- Le succès et la reprise viennent des mêmes lignes originales de cette scène. Cette scène est une création du projet, sans revendication de canon cinématographique.

Le viaduc supérieur et l’escalier étaient déjà jouables. Le point d’observation est `(6580,3440,+1)` sur `reserve-high-viaduct`. Le pupitre et le personnage restent à leurs positions V104. Les deux repères comparés sont le bac de basalte natif `street-v92:port-registers:basalt-planter-left` et la lampe native `urban-v81:port-4:light`. Le schéma d’observation utilise leurs positions physiques existantes ; il affiche directions et distances, sans peindre un terrain inobservé. La crête mentionnée dans l’ouverture V6 n’existe pas dans ce décor : cette ouverture demeure non jouée. Aucun nouvel accessoire, sprite, doublage ou décor de crête n’est annoncé.

## Parcours et persistance

`homeworldCartographyDefinitionV105.ts` expose les liaisons à la source et aux objets. `homeworldCartographyV105.ts` reçoit exclusivement les positions avant/après du moteur de marche et la dernière étape du véritable intégrateur d’escalier. Calculer un itinéraire, charger un étage supérieur ou cliquer un bouton ne valide aucun déplacement. Les révisions, propriétaire courant, vitesse, durée du pas, sol et collisions sont vérifiés. Le passage d’escalier exige son socket réel, son identité et sa durée native. Les deux comparaisons, puis la date, exigent la présence physique au point haut. Le rapport final exige le retour à pied et une descente de l’escalier après l’observation.

Le nouveau champ facultatif `homeworld.cartographyV105` conserve phases, dernière position et étage, distance marchée, traversées d’escalier, point haut atteint, comparaisons et date ISO réelle. Les phases sont `choice`, `ready`, `walking`, `observing`, `return`, `interrupted`, `completed`. Une interruption conserve la phase à reprendre et demande le même étage au dernier point confirmé. Les sauvegardes ordinaires embarquent la marche en cours avec leur position, pour ne pas associer un emplacement récent à un reçu ancien. Un échec d’écriture suspend les déplacements et expose un bouton de réessai dans le carnet, même avant le départ et après fermeture du dialogue. Le réessai ne rejoue jamais une action refusée.

Les actions qui remplacent leur bouton gardent le focus dans une section persistante du dialogue. Fermeture, reprise et réessai rendent le focus à la vue de la cité synchroniquement, avant le retrait du contrôle. Le moteur ne confond ainsi pas une mise à jour du dialogue avec une perte de focus de la fenêtre. Les contrôles navigateur vérifient le focus réellement produit par ces actions, sans le rétablir artificiellement après leur activation.

Le champ V104 et ses octets sont préservés. Une liaison B active garde son interface et sa progression ; A devient disponible une fois cette opération achevée. Un joueur sans liaison choisit A ou B. Un nouveau relevé A après B est une opération explicite, avec un reçu indépendant. A et B ne peuvent être simultanément actives. Les deux ordres séquentiels sont possibles : après A, la liaison B ordinaire est proposée ou peut reprendre ; le reçu A achevé reste conservé. Les anciens enregistrements n’acquièrent aucun champ A par normalisation. Une version future, une source différente, un propriétaire étranger, des champs inconnus ou des états contradictoires sont refusés avant remplacement des données stockées.

Aucune marque, relation, pièce d’équipement, trophée, territoire ou permission de campagne n’est accordée par cette scène. Les quartiers éventuellement visités pendant le déplacement restent reconnus par le système de visite physique existant.

## Vérification

Les dix cas de `tests/homeworld-cartography-v105.test.mjs` ont été exécutés directement avec Node 22 : source exacte, vrai trajet natif aller/retour, ordre des comparaisons et horodatage, rejets des téléportations et faux escaliers, identité/révision, interruption/rechargement, refus d’écriture, sauvegardes additives, import strict et rendu React. Les quatorze cas V104 restent passants. Le contrôle ESLint ciblé des fichiers Homeworld et de la recette est passé.

La recette `scripts/qa-homeworld-cartography-v105.mjs` commence par un unique checkpoint de ville explicite issu d’une campagne modèle. Après l’entrée, elle utilise uniquement l’interface et les touches réelles : accomplissement B, nouveau choix A, refus d’écriture/réessai, marche, montée de huit secondes, comparaison, rechargement par Continuer, seconde comparaison, refus de datation, datation, descente, retour et rapport, refus de rapport puis reprise, viewport mobile et rechargement final. Les hashes des sources exécutées encadrent chaque exécution.

La recette finale sur l’application compilée a réussi ses **52 contrôles**, sans exception navigateur. Ses **neuf captures** ont été ouvertes et inspectées. Elle exécute le commit `d0d66d39a8a90c6d039b4b27672dd29d27b78517`, build Next `Pq220rJsmklF7dV4DeXEz`, dont l’identité est vérifiée dans les pages réellement servies. Les seize sources suivies sont identiques avant et après le parcours. Le premier contrôle confirme aussi la visibilité de la note neutre distinguant le relevé du point haut de la liaison B. Les **50 tests Homeworld**, réexécutés après cette correction de texte, passent : dix V105, quatorze V104 et vingt-six cas d’entrée réels. Le [rapport portable](v105-homeworld-cartography-validation.json) conserve les empreintes, les contrôles et les limites ; les journaux et captures sont dans [le dossier de preuves](qa/v105-homeworld-cartography/).

Le préflight isolé de 42 contrôles, antérieur aux dernières assertions de la recette, est retiré des pièces portables. La preuve navigateur repose sur la recette de l’application compilée.
