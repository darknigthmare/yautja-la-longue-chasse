# Concordance de campagne — 9 novembre 2026

Cette mise à jour part de `39b601ce`, après la reprise de `main` à `19317af4`.
Elle corrige des contradictions du document vivant, sans transformer les
fiches historiques du classeur V6 en chapitres réalisés.

## Ordre des rites et accès

| Étape | Condition conservée | Confusion corrigée |
| --- | --- | --- |
| L-02, puis L-03 | Quatza-Rij du monde natal chassé à trois, retour et cérémonie : Young Blood. | La reine de la pyramide n'est pas un Quatza-Rij. |
| L-04 | Pyramide des Kainde Amedha en trio, prise de chacun, marque à l'acide : Blooded. | Une répétition d'entraînement ne reconnaît pas Blooded. |
| Vaisseau et huit chasses | Vaisseau personnel déjà acquis à Blooded. | Le Quatza-Rij solitaire ne verrouille pas l'acquisition du vaisseau. |
| L-05, L-06 et L-07 | Après les huit chasses : Quatza-Rij solitaire, rites du clan, reine vaincue et crête extraite puis rapportée. | La seule première reine ne donne pas Élite. |
| Suite de campagne | Les niveaux, voies de clan et titres suivent la section « Échelle des rangs ». | Les propositions de Black God, d'Adjudicator et de Philosopher restent des créations du projet, pas une hiérarchie canonique universelle. |

Les sections « Campagne révisée lore 1:1 » et « Échelle des rangs » priment sur
les anciens ordres R2 quand ils divergent. Les corrections du 9 novembre
concernent la chaîne d'introduction, les écarts connus et le comblement du rite
Blooded. Les cartes source, leurs IDs et leurs versions historiques restent
conservés.

## Ce que le runtime ne réalise pas encore

`clanChronicle.ts` se déclare une fondation. Sa chaîne historique à sept rangs,
la reconnaissance locale Young Blood de V68 et sa fonction Adjutant ne sont pas
une implémentation complète de la nouvelle échelle à onze niveaux. Les modifier
exige de produire les vrais chapitres, leurs preuves et une migration compatible ;
cette correction documentaire ne réécrit aucune sauvegarde.

Le Berceau atteste une première reine, une extraction de crête et un retour dans
son périmètre. Il ne remplace pas L-02, L-04, L-05 ou L-06 et ne promeut pas le
joueur à Élite par simple débrief. Les campagnes adultes anciennes gardent leur
politique de compatibilité ; elles ne reçoivent pas rétroactivement des rites
inventés pour expliquer leur accès.

Les douze lots P1 `BUILD5-01` à `BUILD5-12` de la feuille **V5 Lots de réalisation**
du V6 exigent chacun une boucle complète : scène, interactions, sauvegarde et
recette. Une fonction voisine ne ferme pas le lot source. En particulier,
les résidences d'implantation V64 ne constituent pas la mission `HOME-CM07`,
les quatre actions du mini-jeu d'atelier ne sont pas ses dix-huit étapes de
tutoriel, et ses huit signaux ne sont pas six énigmes à huit manipulations.

## Provenance et fidélité du Clan Ship

Le [dossier OPS-B15 / OPS-F44](../../production/p0p1-20261109/lore/README.md)
associe les ressources réellement utilisées à leurs œuvres, aux déclarations
de génération et à des captures natives datées. Il distingue le film AVP 2004,
les récits licenciés distincts et les créations originales du projet.

Les notices, résumés et comptes rendus VFX ne fournissent pas un plan complet
des sept salles. Les pages et timecodes non consultables restent absents du
dossier ; les numéros de fichiers d'images ne deviennent pas des numéros de
plans. La préparation de comparaison ne constitue pas l'approbation artistique
humaine attendue par OPS-Q23. Aucun statut historique `validated` n'est changé.

Les anciens classeurs, reçus et snapshots restent datés de leur propre source.
Une évolution légitime de la bible ne doit pas conduire à réécrire leurs
empreintes pour présenter l'ancienne qualification comme une recette du nouveau
code.
