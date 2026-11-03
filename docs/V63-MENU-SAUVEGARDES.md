# V63 — Menu principal et remplacement de campagne

## Diagnostic reproduit

La production antérieure fonctionne dans un contexte neuf et avec une campagne compatible. Aucun accès aux sauvegardes réelles de l’utilisateur n’a été réalisé. Les causes suivantes ont été reproduites avec des fixtures isolées dans Chrome :

- Cinq emplacements occupés : `Nouvelle partie` était explicitement désactivé, sans possibilité de remplacement.
- Campagne de travail corrompue ou future : le catalogue devenait protégé et `CampaignFrontEnd` le remplaçait par `null`, masquant les cinq slots pourtant lisibles. Continuer, Nouvelle partie et Charger devenaient indisponibles.
- Stockage refusé : refus sûr, mais catalogue invisible.
- Verrou réellement indisponible simulé par `callback(null)` : retour rapide, pas de blocage permanent.
- API de verrou simulée ne résolvant jamais : `busy` restait vrai et tous les boutons étaient désactivés. Ce scénario adversarial est une faiblesse confirmée, **pas la cause personnelle établie du problème utilisateur**.

Preuve antérieure : `docs/v63-menu-before-qa.json` (9 contextes en production). Preuve corrigée : `docs/v63-menu-after-qa.json` (12 contextes sur serveur local).

## Comportement corrigé

Le menu conserve les résumés lisibles même si la campagne de travail est protégée. Nouvelle partie ouvre aussi les cinq emplacements lorsqu’ils sont tous occupés. Sélectionner un slot compatible occupé ouvre une confirmation indiquant son numéro, son ancien chasseur, la perte d’accès aux dix checkpoints manuels/deux autos dans ce slot et le nom de la nouvelle campagne. Annuler n’écrit rien. La confirmation conserve le propriétaire et la révision observés ; une modification concurrente invalide l’opération.

`replaceCampaignSlot` écrit dans un même journal transactionnel les six clés de travail, le slot, sa copie de secours et une archive immuable `campaign-slot.<id>.replaced.<ancien propriétaire>`. Cette dernière conserve le document original (tous ses checkpoints) et le dernier état vivant complet. La campagne de travail est écrite en dernier. Le contrôle compare les octets observés avant chaque écriture et vérifie l’ensemble avant le marqueur de commit. Échec ou interruption déclenchent la restauration des préimages ; aucune réussite n’est annoncée avant confirmation durable. Les autres campagnes ne sont pas remplacées (la campagne active différente reçoit sa sauvegarde de sécurité habituelle).

La copie immuable est conservée même quand les autosauvegardes de la nouvelle campagne tournent. Elle reste une archive technique locale : aucun nouveau bouton d’import/export de cette copie n’est ajouté dans ce lot. Si l’espace ne suffit pas à la copie et au journal, le remplacement est refusé ; aucune suppression automatique ne libère la place.

Une campagne de travail endommagée peut être récupérée explicitement depuis un checkpoint lisible : les octets bruts de toutes les clés remplacées sont conservés dans une archive `campaign-slot.workspace-recovery.<uuid>` avant la restauration. Les versions futures restent refusées. Les slots corrompus avec backup ont leur récupération explicite existante ; les slots futurs ne sont jamais rétrogradés depuis un ancien backup.

S’il n’existe aucun slot lisible et que la campagne de travail ainsi que son backup sont endommagés, `Conserver les données endommagées et repartir…` propose une nouvelle chronique **uniquement dans un emplacement vide sans backup**. La confirmation précise que les progrès corrompus ne peuvent pas être reconstruits. `recoverAsNewCampaignSlot` conserve exactement les huit préimages remplacées dans l’archive brute et les écrit avec elle dans le même journal de neuf clés. Tout slot occupé (même corrompu), toute copie encore lisible et toute version future sont refusés. Si aucun emplacement n’est vide, cette récupération ne supprime rien pour faire de la place.

L’attente du verrou est bornée à cinq secondes et un callback arrivant après expiration n’exécute aucune mutation. Un stockage inaccessible ou un verrou refusé laisse les diagnostics, l’actualisation et le Mausolée accessibles. Les protections de données ne sont pas contournées.

## Vérifications

- 91 tests ciblés : slots, menu, confirmations manuelles existantes, import intégral, journal de reprise et tests adversariaux. Tous passent. Trace : `work-local/v63/qa/menu/tests-targeted.txt`.
- Interruption de remplacement à cinq points d’écriture ; propriétaire/révision périmés ; archives et secours futurs/corrompus ; capture des derniers progrès ; restauration explicite ; callback de verrou tardif.
- Navigateur réel : neuf états initiaux plus slot individuellement corrompu/futur et workspace corrompu sans aucun slot lisible. Nouvelle partie, Continuer, annulation sans écritures, remplacement avec quatre autres slots inchangés, récupération explicite, nouveau départ de secours et refus de quota.
- Checkpoint manuel dans les réglages : première sauvegarde, ouverture de la confirmation existante, annulation sans écriture puis écrasement confirmé. Révision incrémentée une fois ; les autres checkpoints restent identiques. Capture `manual-checkpoint-confirmation.png`. Aucun changement runtime de cette confirmation n’était nécessaire.
- La création/le remplacement atteignent l’invite du prologue après chargement, pas seulement le composant de chargement. Cette recette n’est pas un parcours complet du duel de nurserie.
- Dialogue de remplacement capturé et inspecté à 1365 × 950 et 390 × 844 ; aucun bouton tronqué.
- ESLint des fichiers modifiés : réussi. `tsc --noEmit` ne relève que trois erreurs dans `.next/types/validator.ts` sur les types générés `AppRoutes`, `LayoutRoutes`, `ParamMap`, hors périmètre de ces modifications.

Aucun build global, commit, push ou déploiement effectué par ce chantier. Les preuves locales n’établissent pas encore une publication V63.
