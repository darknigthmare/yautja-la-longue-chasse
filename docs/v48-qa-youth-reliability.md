# V48 — campagne Unblooded et fiabilité

Profil QA simulé : sauvegardes et incidents. Aucun testeur humain ni matériel de manette physique revendiqué.

## Parcours raccordé

Une nouvelle partie commence toujours par la nurserie V47. Après le titre réel, les rencontres physiques du chef puis du mentor ouvrent un bouton local dans le dialogue du mentor. Ce bouton ne valide aucun exercice : il ouvre la scène du dojo. Le parcours moteur couvre les déplacements, le saut d’obstacle, l’esquive du coup annoncé, trois frappes distinctes et une projection jusqu’au retour au sol. La première lame demande ensuite une interaction proche du râtelier. Le premier biomask demande une sélection explicite de la teinte de son lien puis une interaction proche. Il est reçu et conservé pour la sortie ; le personnage reste non masqué pendant les exercices et dans la cité. Aucune armure transformée ni animation du masque porté n’est revendiquée. Le parcours du camp est chronométré ; sa réussite et celle du duel non létal sont distinctes. Le repos vient des baraquements, après approche de la couche, puis 180 ticks actifs avant le matin.

Le checkpoint, les six reçus de scène, l’équipement de jeunesse et le temps simulé sont conservés ensemble dans la sauvegarde principale. `training-completed` n’apparaît qu’après la réussite du camp et du duel, avec les étapes antérieures vérifiées. Aucun XP, honneur, loadout adulte, preuve `first-tracks` ou `unguided-hunt`, rite supplémentaire ou vaisseau n’est donné. Le rang reste Unblooded. L’écran de chronique est informatif et ne confère rien.

V48 finit au premier réveil. La quête du désert et le PIT secondaire de jeunesse, avec sa première fosse grillagée, restent à construire. Le PIT adulte reste donc verrouillé pour cette nouvelle jeunesse ; les anciennes parties adultes conservent leur accès historique.

## Schéma et protections

- Sauvegarde version 9, champ `youthTraining` distinct de la nurserie. Migration V7/V8 adulte : pas de formation rétroactive ; migration V8 avec nurserie terminée : accueil/formation encore à accomplir.
- Reprise `youth-training` prioritaire pendant la formation, même si un ancien indice de route indique le vaisseau. Matin réellement terminé : retour au Homeworld.
- Les sauvegardes jeunesse refusent les preuves inconnues, dupliquées ou des chasses et rites futurs encore non jouables ; cela ne rétrograde jamais une archive protégée en campagne adulte.
- Normalisation stricte des reçus : provenance, identifiant, tick, correspondance avec les milestones du moteur, unicité, équipement cohérent et statut terminé seulement au matin.
- Le checkpoint ordinaire ne peut pas ajouter un reçu. La remise d’équipement et les reçus nouveaux utilisent la transaction de progression.
- Un checkpoint plus récent ne peut pas reculer les phases ni les compteurs du dojo, effacer un reçu ni changer une teinte déjà remise. Un échec réel du parcours ou du duel conserve ses règles de retry.
- Quota, lecture impossible et écriture incertaine conservent la scène et refusent la sortie. La réconciliation d’une écriture qui avait réussi avant une exception ne recompte ni temps ni preuve. Un propriétaire ou un contenu concurrent reste protégé.

## Validation déjà exécutée

`node --experimental-strip-types --test --test-concurrency=1 tests/youth-campaign.test.mjs tests/nursery-campaign.test.mjs tests/campaign-slots.test.mjs tests/save*.test.mjs tests/exploration-progress.test.mjs`

130 tests réussis : 14 nouveaux tests campagne jeunesse et 116 régressions. Log : `work/v48/campaign-qa/targeted-tests.log`. Les fixtures de fin viennent des entrées du moteur exécutées jusqu’aux vraies transitions ; aucun état de victoire n’est fabriqué. Les rencontres NPC sont des préconditions explicites des tests unitaires, séparées de la recette navigateur qui les joue physiquement.

Lint ciblé : aucune erreur ; avertissement existant concernant une image dans `ClanChroniclePanel.tsx`.

## Recette navigateur

`scripts/verify-youth-reliability-v48.mjs` utilise une archive exportée par la recette scène **après** nurserie jouée et rencontres physiques, mais avant les exercices du dojo. Variables : `V48_QA_URL`, `V48_DOJO_ARCHIVE`, `V48_YOUTH_RELIABILITY_OUTPUT`. Elle couvre reprise/menu/checkpoint manuel, quota et retry, écriture après exception, conflit d’un autre écrivain, puis ancienne partie V8 avec vaisseau et PIT. La recette ne remplace aucune archive du joueur ; chaque scénario utilise un contexte navigateur isolé.

Le premier build V48 local a passé les cinq scénarios navigateur de cette recette : reprise/checkpoint manuel, quota et retry, écriture confirmée après exception, écrivain concurrent préservé octet par octet, ancienne partie V8 avec vaisseau et PIT. Rapport : `work/v48/youth-reliability-browser-qa/report.json`. Aucune erreur JavaScript ni ressource HTTP en échec. La première exécution de la recette a seulement révélé un sélecteur ambigu entre deux alertes de conflit légitimes ; le sélecteur cible désormais l’alerte de la scène.

Le message ancien des services du Homeworld a été corrigé après ce premier build : il distingue accueil à faire, formation active et formation terminée. Le build final incluant cette correction a repassé les cinq scénarios sans erreur JavaScript/HTTP : `work/v48/final-youth-reliability-qa/report.json`. Le rapport commun de livraison décrit la compilation globale, la publication et ses vérifications publiques.
