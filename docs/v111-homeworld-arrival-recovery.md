# Restauration d’un ancien point extérieur — V111

Une ancienne entrée pouvait sauvegarder le centre authored d’une porte occupée par une charge, alors que le joueur avait approché cette porte depuis un point libre. V110 conserve désormais le vrai point d’entrée, mais les anciennes sauvegardes intérieures pouvaient rester bloquées.

V111 propose une **restauration volontaire du dernier point extérieur conservé**, demandée au véritable seuil intérieur. Il ne s’agit pas d’une marche à travers la charge ni d’un déplacement automatique au chargement. Une recherche de simple point libre autour de la porte pourrait choisir une poche sans issue ; elle n’est pas utilisée.

Le seul candidat de cette restauration est `cargoV108.receipt.last`, qui était déjà enregistré par la manutention. Le registre doit appartenir à la partie courante, être strictement valide, interrompu et sans objet porté. Le point doit rester dans les 96 unités de l’approche de la même porte, au niveau 0, et être actuellement praticable pour le corps entier avec toutes les charges présentes. Aucun autre registre ne peut être en mouvement ou porter un objet. Si ces faits ne sont pas disponibles, la récupération est refusée ; aucun offset libre, point du Port ou chemin inventé n’est substitué.

Une consultation ne déplace rien. La confirmation relit propriétaire, checkpoint, sept registres d’opération, position locale et disponibilité de la sortie, puis compare leurs valeurs exactes à la consultation. Un seul callback de sauvegarde doit confirmer ensemble le checkpoint extérieur et le reçu de restauration. Quota, conflit, document futur, propriétaire remplacé, pause, changement de pièce ou déplacement d’une charge refusent l’opération sans succès local. Le contrôleur conserve ou restaure ses références et états en cas d’échec.

Le reçu optionnel `arrivalRecoveryV111` conserve les JSON originaux du checkpoint intérieur et des registres présents, leur propriétaire, la révision cargo source, la position locale de confirmation et le checkpoint extérieur restauré. Les JSON restent byte-exact par rapport aux valeurs consultées. Les lots, propriétaires, pièces, consentements, distances mesurées, preuves et récompenses restent inchangés. La reprise d’une opération demeure une action séparée.

## API et intégration

- `homeworldArrivalRecoveryLedgerV111.ts` : types, sélection des sept documents, normalisation pure du reçu ; aucune géométrie ou mutation de jeu à l’import.
- `homeworldArrivalRecoveryV111.ts` : `planHomeworldArrivalRecoveryV111(ledger, context)` retourne une inspection avec raison et proposition ; `createHomeworldArrivalRecoveryTransactionV111(readLedger, readContext, persistAtomic)` confirme une clé de consultation exacte et attend l’acquittement durable.
- Le contrôleur conserve son checkpoint intérieur pendant la consultation. Il enregistre le nouveau checkpoint et le reçu dans la même campagne, puis actualise l’acteur uniquement après succès. Aucun enregistrement auxiliaire séparé ne peut consommer le quota avant le checkpoint principal.

## Vérification ciblée

Le helper `tests/helpers/arrival-recovery-v111-route.mjs` réutilise les 603 pas réels de la manutention V110. La charge étroite est posée à l’approche de `residence-port-2` ; le dernier point extérieur enregistré reste `(7570,3470)`, libre à 60 unités de cette approche. Le checkpoint intérieur reproduit uniquement l’ancien mauvais ancrage. Les tests marchent ensuite réellement dans l’intérieur jusqu’à la sortie.

Neuf tests vérifient cette proposition, les refus de contexte, les documents futurs ou portés, la consultation périmée, l’import strict, le vrai quota et le vrai conflit de stockage, puis une sauvegarde/relecture et un déplacement ordinaire depuis le point restauré. Ils ne certifient pas à eux seuls le rendu ni un parcours navigateur.

Cinq tests d’intégration supplémentaires extraient les callbacks actuels de `HomeworldHub` : consultation sans mutation, sauvegarde/relecture et déplacement ordinaire, restauration complète des références après quota ou exception, confirmation devenue périmée, conservation des sept documents malgré un brouillon plus récent et conflit réel avec un autre onglet. Les trois scénarios de porte V110 sont également rejoués avec leurs assertions inchangées ; seuls les modules et références fournis à leur fixture sont complétés pour V111, ainsi que l’installation du checkpoint intérieur déclaré par le cas ancien.

Les journaux sont conservés dans `docs/qa/v111-arrival-recovery/`. Le premier passage des trois scénarios V110 montrait le checkpoint extérieur encore présent dans le faux contexte de chargement ; le journal d’échec est conservé séparément. Après installation cohérente de la campagne ancienne dans la fixture, les mêmes assertions passent.

La restauration reste volontaire et bornée à ce fait durable. Elle ne répare pas tous les checkpoints arbitrairement bloqués, les points sans relevé antérieur ou les portes sans candidat appartenant à la même partie.
