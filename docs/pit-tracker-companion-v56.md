# Tracker et Hellhounds — V56

Le duel Tracker possède une véritable entité quadrupède au sol. Ce système ne recrute aucun animal dans la campagne, ne place aucun allié à bord et n’équipe aucun module de vaisseau. Les compagnons originaux fournis par l’utilisateur restent des identités séparées ; aucun de ces dessins n’est réattribué au chien du film.

## Sources et apparences

La référence de production du premier chien est la fiche primaire [Hot Toys — Tracker Predator with Hound, MM#147](https://www.hottoys.jp/item/view/100001667), liée à *Predators* (2010), et ses photographies 18 et 21. Ces photographies restent dans `work-local/v56/references`, hors publication. Le second dessin répond à la demande utilisateur de conserver une autre variante, avec longues cornes avant, écailles ocre/vert et filaments dorsaux. Aucune variante n’est présentée comme une nouvelle espèce canonique ou une réplique certifiée 1:1.

| Variante | Production intégrée | Limite |
| --- | --- | --- |
| Hellhound — crête dorsale (`tracker-hound`) | Deux atlas natifs, un par côté, avec six poses chacun : repos, annonce, deux dessins de charge, morsure et recul. | Cycle de charge limité à deux dessins ; pas de grande plaquette complète pour chaque action. |
| Hellhound — longues cornes (`hellhound-longhorn`) | Deux vues natives indépendantes, une par côté. | Monopose tenue et déplacée ; aucun cycle de marche ou d’attaque animé revendiqué. |

Les quatre PNG OpenAI sont copiés sans transformation. Le registre `app/game/data/pitCompanionArtV56.json` contient les dimensions, rectangles non uniformes, pivots de pattes et SHA256. Les reçus et contrôles des sources sont dans `art-source/v56/hellhounds/source-records.json`. Une grille régulière découperait la langue ou les pointes de certaines poses : le rendu utilise exclusivement les rectangles individuels validés. Les variantes natives ne sont jamais retournées par miroir.

## Fonctionnement livré

- Technique de Tracker : **appel / rappel du chien de chasse**. Après le démarrage de la commande, l’entité annonce sa charge pendant 24 ticks de simulation, soit 0,4 seconde à 60 Hz.
- Une seule entité par Tracker. Une autre commande rappelle cette même entité ; elle n’en duplique pas une seconde.
- Charge horizontale, sur le plan du sol, avec hitbox distincte du chasseur. Un coup adverse peut interrompre l’annonce ou la charge. Garde et saut permettent de défendre ou d’éviter l’attaque.
- Un seul contact, puis six ticks de réaction et retour inoffensif. La morsure et le recul sélectionnent des poses réellement dessinées sur le premier atlas. Le second reste dans sa pose native.
- Le KO du propriétaire et la fin de manche suppriment le compagnon. Les intros, le compte à rebours, les résultats et les pauses conservent le verrou de simulation de THE PIT.
- Le sélecteur des deux apparences se trouve dans **Options & parcours** lorsque Tracker participe. Même mécanique et mêmes dégâts pour les deux apparences.
- Si une image ou une vue native manque, le duel reste suspendu et propose **Réessayer le Hellhound**. Aucun drone, silhouette CSS ou attaque invisible ne sert de remplacement.

## Sauvegarde et relecture

Le moteur est en version **7**, avec `houndVariantId` optionnel dans les options, l’état et le replay. Ce champ n’accepte que les deux IDs enregistrés et seulement lorsqu’un participant est Tracker. Il participe au checksum, persiste pendant les manches, la revanche et le reset d’entraînement. L’absence du champ sélectionne la crête dorsale.

Les replays V4, V5 et V6 gardent leur stepper historique. En particulier, Tracker conserve son ancien contre au gantelet dans les replays V6 ; le nouveau chien n’est pas substitué rétroactivement. La fixture `tests/fixtures/pit-replay-v6-tracker-counter.json` a été enregistrée avant modification du moteur et conserve son checksum `ad1d9cc9`. Les cinq anciens checksums de parcours V6 restent vérifiés sans réécriture. Un moteur futur inconnu reste refusé.

## Vérifications

Les onze tests de mécanique couvrent télégraphie, rappel unique, contact unique, interruption réelle, KO, garde, évitement aérien, fin de manche, restauration à chaque phase et les deux variantes dans les replays/reset/revanche. Trois tests d’art relisent les vrais PNG, leurs SHA256, l’alpha et les marges de toutes les poses ; ils vérifient le rectangle natif choisi, les pivots au sol, l’absence de miroir et l’immuabilité de la simulation pendant le dessin. Les 81 tests ciblés Tracker, projections et parcours/replays historiques ont réussi.

La recette navigateur `scripts/verify-pit-hounds-v56.mjs` a réussi sur le build local V56, port4175 : quatre vrais duels au clavier (deux variantes × deux côtés), télégraphie/charge/morsure réellement dessinées pour la crête, vues natives opposées au retour, second ordre de rappel sans doublon avec pose de recul réellement atteinte, pause exacte, intro verrouillée et stockage campagne inchangé. Les quatre captures ont été inspectées : appui des pattes sur le sol, silhouettes et cornes conservées, absence de miroir. L’observation Canvas intervient après le vrai dessin ; moteur, PV, positions et horloge ne sont pas modifiés. Rapport : `work-local/v56/qa/hound-browser/report.json`.

La recette `scripts/verify-pit-hound-retry-v56.mjs` a également réussi : panne réseau volontaire d’une seule vue longues cornes, combat bloqué en frame0 et aucune attaque invisible, puis chargement réessayé par le bouton réel et appel clavier effectif. Rapport : `work-local/v56/qa/hound-retry/report.json`. Ces résultats locaux ne constituent pas une preuve de déploiement public.
