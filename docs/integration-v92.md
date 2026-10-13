# Intégration V92 — 13 octobre 2026

Ce lot reprend les consommateurs existants de la campagne, du Homeworld, de THE PIT et de la Bible V6. Il ne termine pas l'ensemble des classeurs ni les animations du roster. Les originaux, anciennes archives et identités sont conservés.

| Domaine | Résultat du lot | Limite conservée |
| --- | --- | --- |
| Campagne | Esquive physique dans la préparation de triade, clavier/tactile/manette, dialogues de préparation, repère d'objectif et évaluation factuelle | Le Quatza-Rij et la reconnaissance Blooded ne sont pas attribués par cet entraînement |
| Homeworld | 23 objets natifs réutilisés, 16 compositions civiles sur six étages, 39 fiches de codex liées, contacts et accès contrôlés | Sept PNG existants, pas 23 nouvelles images ; la ville entière et la carte canonique 1:1 ne sont pas annoncées achevées |
| THE PIT mécanique | Lance de contact d'Ahab et katana/contre de Samurai PHG, chacun pour ses deux variantes exactes ; anciennes parties actives gardent leurs recettes | Deux profils d'équipement d'adaptation, pas 201 movesets certifiés 1:1 |
| THE PIT visuel | Douze PNG OpenAI admis, vingt-quatre dessins, douze clips orientés : préparation, contact et récupération d'un coup de chacun des deux costumes masqués | Un geste par costume masqué ; les autres coups, costumes et movesets complets ne sont pas couverts implicitement |
| Bible de guerre V6 | S11 constructible avec U18 et stock local ; consommables finis, deux tours de soin travaillés, patient stabilisé toujours blessé puis évacuation existante | Exercice indépendant du monde de campagne ; dose et durée sont des réglages déclarés, pas des chiffres canoniques |
| Drive | Quinze dossiers suivis relus, 239 identifiants comparés, aucun fichier nouveau ou modifié dans cette portée | Deux archives restent trop grandes pour le connecteur ; aucun nouveau PNG Drive importé dans ce rafraîchissement |

Les dix premiers originaux OpenAI ont été préservés dans le commit `c679126`, conformément au lot de dix demandé. Trois nouveaux originaux remplacent ensuite des admissions refusées, puis quatre récupérations complètent ces gestes, sans effacer les refus. [Le manifeste des dix-sept originaux](../art-source/v92/pit/intake/manifest.json) conserve prompts, SHA, référence, propriétaire et décision. Les copies publiques admises conservent exactement les mêmes octets ; aucun miroir ou rig ne complète leur couverture.

Les règles et sources détaillées restent dans [campagne](campaign-evasion-v92.md), [mobilier](homeworld-street-compositions-v92.md), [movesets](pit-authored-movesets-v92.md), [animations natives](pit-native-animations-v92.md), [S11](clan-war-medical-v92.md) et [Drive](drive-refresh-v92.md).

## Revue visuelle bornée

Les ateliers locaux utilisent les vrais composants de production avec des carnets synthétiques réellement rejoués, en mémoire seule. `/visual-qa-v90`, `/solo-qa-v92` et `/clan-war-qa-v92` exigent le drapeau serveur local exact et refusent Vercel avant tout streaming. Ils ne fournissent aucune récompense, sauvegarde de campagne ou route publique de contournement.

La revue navigateur a révélé puis confirmé la correction du contact apparent d'un figurant derrière un ancien auvent marchand. Le build Next final monte bien les 23 nouveaux objets, observés en parcourant les seize compositions au cadrage panoramique ; au cadrage rapproché, le culling laisse légitimement les objets éloignés hors du DOM. Les vues du marché, des archives et de l'audience ont aussi été revues visuellement. Les deux dessins de contact gauche d'Ahab et Samurai sont chargés et visibles dans l'atelier réel ; leurs récupérations sont revues dans les deux orientations originales, sans halo visible. Le vrai atelier de guerre reprend le carnet à un tour de soin puis accomplit le deuxième : la personne devient stabilisée, mais reste blessée et indisponible. Le débriefing de triade expose contributions et vitalité sans promotion. Cette portée ne représente pas une campagne entière jouée ni la revue des seize compositions en tous cadrages.

Le raccord des Trois Vents contourne physiquement le sanctuaire et le palais, qui gardent leurs collisions. Les réseaux City et World rejoignent leurs vraies arrivées, y compris sur +1. Le modèle comporte 222 sols : les 216 anciens sont conservés, avec trois bandes du trajet régional et trois bandes de desserte est du Conseil. Les 60 destinations du World restent atteignables dans les contrôles du modèle.

## Sauvegardes : anomalie de la session de navigateur

Une création locale refuse l'écriture parce que le navigateur fournit `null` au callback d'un verrou exclusif. Une sonde HTML indépendante du jeu, sans stockage ni campagne, observe aussi ce callback nul avec `{signal}` et avec `{mode:'exclusive',signal}` : contexte sécurisé et API présents, aucune attente ou détention du verrou de sonde. La cause du comportement de ce navigateur reste inconnue. Le jeu continue de protéger l'archive ; aucun verrou forcé, bail local concurrent, remplacement de sauvegarde ou repli non sûr n'a été ajouté.

Ce constat ne certifie ni la création/reprise dans tous les navigateurs ni la synchronisation d'un compte entre appareils. Les ateliers privés permettent la validation des nouveaux composants sans exposer ou modifier les sauvegardes du joueur.

## Validation et publication

Les résultats moteur/codec, ESLint, TypeScript, compilation Next, suite globale, captures de navigateur, GitHub, état Vercel et réponses publiques sont des preuves distinctes. Les journaux et captures détaillés restent privés dans `work-local/v92/qa/`. Un test historique qui échoue ne devient pas vert par suppression, exclusion ou simple changement d'attente.

Les chiffres ciblés des documents de domaine se recouvrent : ils ne doivent pas être additionnés pour annoncer une couverture globale. La première suite d'intégration comporte **3 573 tests, 3 516 réussites, 57 échecs, aucun test ignoré**. Elle précède les dernières corrections Homeworld et les quatre récupérations supplémentaires ; ce n'est pas une certification de la source finale.

Vingt échecs relèvent de THE PIT : quinze attentes de moteur10 au lieu de11, un helper de fixture ignorant la recette courante, un helper PNG ignorant la technique Samurai courante, une ancienne regex HUD et deux anciens compteurs de couverture. La regex HUD était déjà périmée dans `1bee8ac`, comme le compteur365 alors que le vrai registre de cette baseline avait375 clips. Les sources des anciens 53 atlas et les 201 définitions historiques restent identiques à la baseline. Six duels de720ticks ont en outre été comparés réellement à leurs replays directs, à leurs imports/exports V92 et aux replays moteur10 fabriqués par le vrai code de la baseline, avec les mêmes résultats mécaniques.

Le comparatif Homeworld confirme 33 échecs historiques déjà présents dans `1bee8ac`. Les trois régressions nouvelles de légendes historiques, de réserve de mobilier et de connexion physique ont été corrigées en conservant leurs attentes. Le montage V92 garde également les IDs historiques au lieu de les remplacer par les compositions. La réécriture des contrôles Pit historiques a été refusée par le contrôle d'approbation et n'a pas été effectuée ; un patch de revue privé est préparé mais non appliqué. Les nouveaux contrôles des recettes, compatibilités et PNG ont leur propre portée déclarée ; ils ne rendent pas l'ancienne suite verte artificiellement.

La source finale passe **189 tests ciblés sur 22 fichiers, sans échec ni test ignoré**, le lint de 35 fichiers TS/TSX, TypeScript et la compilation Next webpack. Les quatre contrats CSS vérifiés dans le bundle compilé passent aussi. Une deuxième suite complète est lancée sur cette source ; son résultat n'est pas anticipé par les chiffres ciblés. Le push GitHub, l'état Vercel READY et la vérification des PNG et ateliers privés sur le site publié restent des preuves de release séparées.

Les suites de campagne, nouveaux contrats et voix enregistrées, S13 énergie, tous les navires du classeur, les 178 autres profils importés génériques, les animations complètes et les fichiers des deux grandes archives restent des chantiers ouverts. Aucun statut du classeur original n'est réécrit pour les déclarer terminés.
