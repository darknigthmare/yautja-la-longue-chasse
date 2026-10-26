# K-17 V111 — reprendre la recherche après un constat différé

La réplique ROLE03 3189 dit « pour l’instant » et l’option789 conserve les états déjà acquis. Le constat B terminé peut désormais précéder une étude A volontaire, sans effacer ni rejouer B. Cette fonctionnalité est distincte de la reprise d'une étude A simplement interrompue.

## Un document historique et un nouvel épisode

`archiveContinuationV111.receipt.baseLedgerJson` conserve exactement `JSON.stringify(archivePlaqueV109)` du B terminé. Le registre original V109 ne change pas : propriétaire, révision, choix B, répliques, objets, provenance, marche et interruptions restent dans ce document. Chaque action et chaque échantillon moteur vérifient que le B actuel est toujours identique.

Le nouveau préambule exige une présence physique au poste, la disponibilité de l’archiviste, une nouvelle ouverture, le choix A, sa réponse, puis le consentement et le départ de l’étude. Les trois lignes source OUV, CHOIX A et REPONSE A doivent réellement être présentées dans cette nouvelle conversation ; elles n’écrasent pas les lignes de B.

Au départ, la plaque et l’empreinte restent sur les deux supports où B les avait réellement déposées. Leurs observations et lieux copiés sont repris sans nouvelle prise, nouveau portage ou nouveau dépôt. Le moteur physique V109 est ensuite utilisé par une étude A séparée : bord manquant, comparaison, retour pour expliquer l’écart, interruption/reprise volontaire, observation et relevé du fragment, transport jusqu’à sa surface, comparaison puis rapport.

Le compteur `study.receipt.walked` conserve la marche B comme borne de départ. `archiveContinuationWalkedV111` donne uniquement la marche nouvelle. Ouvrir ou commencer la continuation n’invente donc aucune distance. Les deux objets déjà déposés sont comparés byte à byte avec le document B pendant toute l’étude. Seul le fragment candidat peut être déplacé dans ce nouvel épisode.

## Interfaces d’intégration

- `homeworldArchiveContinuationLedgerV111.ts` : types, défaut, normalisation, projection physique et indicateurs de phase/activité.
- `homeworldArchiveContinuationV111.ts` : actions, échantillonnage moteur, transaction atomique et action physique proche.
- `normalizeHomeworldArchiveContinuationV111(value, liveB)` vérifie la liaison au B actuel. Un second argument explicitement `undefined` refuse une continuation non vide ; le document stocké ne remplace pas un B supprimé.
- `archiveContinuationViewV111` fournit l’étude physique actuelle pour le rendu, sans jamais la sauvegarder dans `archivePlaqueV109`.
- Les révisions externes sont distinctes de la révision interne du moteur V109. Les contrôles UI doivent conserver la révision externe du rendu qui les a créés, afin de refuser un ancien callback.

Les versions futures, champs supplémentaires, propriétaires remplacés, révisions périmées, suppressions/modifications de B, déplacements incohérents et coercitions de phases sont refusés. En cas de quota, la transaction renvoie les documents confirmés et n’annonce aucun succès.

## Vérification et limites

Le helper `tests/helpers/archive-continuation-v111-route.mjs` termine d’abord B avec les gestes du vrai modèle V109, puis joue la nouvelle A avec le moteur cargo et le routage physique. Les six tests couvrent la complétion, les pièces B inchangées, le fragment séparé, le préambule et les consentements, les refus de quota/propriétaire/révision, les imports impossibles, la sérialisation et le portage interrompu.

Dix tests supplémentaires exécutent le vrai Save et les callbacks du Hub : import, écriture, rechargement, couplage acteur/fragment, quota puis Retry explicite, propriétaire remplacé, ancien contrôle retenu, révision externe du rendu, arrêt du moteur pendant un portage interrompu et coexistence avec l’outil de dépeçage. La fonction de migration globale Save11→12 reste une copie pure ; la normalisation intégrée après PR21 ajoute seulement le défaut `inventory.fieldToolIds: []` à une ancienne campagne V110 qui n’avait pas ce champ. Tous ses champs préexistants, dont le B complet, sont conservés. Le vrai client V110 extrait de sa capsule reconnaît ensuite la version12 comme future et ne peut ni supprimer le nouveau registre, ni réécrire ses octets, même en présence d’une sauvegarde de secours V11. Les 32 scénarios d’entrées existants conservent leurs corps de tests byte à byte ; seule leur fixture reçoit les nouveaux exports et références réels.

Le cas de coexistence déclare une campagne de schéma11 sans continuation, puis achète réellement `flaying-tool` avec `purchaseFieldToolV111`, inchangé depuis PR21. Le parseur Save courant migre cette campagne à12 en conservant l’outil, les marques restantes et B. L’ajout de la vraie continuation A conserve ensuite les deux documents et l’outil après écriture/rechargement. Un refus de quota ne modifie aucun octet du stockage primaire ou de secours ; la nouvelle action physique n’est persistée qu’au Retry réussi. `integrated-main-regressions.log` contient les dix tests après intégration de main ; `integrated-main-source-version.log` relève le schéma11 et le champ d’outil dans le Save publié de PR21.

La passe de régression Save12 exécute 18 fichiers existants couvrant les anciennes migrations, l’accès V69, l’exploration, les chapitres solo V66/V67/V69/V70/V90, le stockage, les imports, les slots et les registres culture/vaisseau. Tous passent. La fixture historique de récupération des visites reçoit également les vrais registres dormants et callbacks requis par le Hub courant ; ses 16 scénarios restent byte à byte identiques. Les journaux `save-v12-regressions.log`, `visit-recovery-tests.log` et `visit-recovery-assertions-unchanged.json` conservent ces résultats. La recherche des versions futures n’a identifié aucun ancien fixture de campagne qui considérerait encore 12 comme une version future ; les gardes utilisent `SAVE_VERSION + 1` ou une version explicitement supérieure.

Les journaux de travail initialement échoués sont conservés séparément : un adaptateur legacy acceptait encore le nouvel épisode ; un contrôle retenu pouvait contourner Retry et le garde moteur ne prenait pas encore le fragment de la continuation en compte. Le premier passage des régressions Save a aussi repéré les dépendances VM manquantes dans l’ancienne fixture des visites. Après intégration de PR21, `integrated-main-initial-failed.log` conserve le cas dont l’ancienne attente globale ne prévoyait pas encore le défaut `fieldToolIds: []` ; seule cette attente a été actualisée, sans changer la préimage historique. Ces tests ne sont pas des échecs du build publié V110. Après correction du Hub et adaptation des fixtures, les journaux sans suffixe `initial-failed` décrivent les vérifications courantes ; les échecs antérieurs ne sont pas promus.

Ces vérifications automatisées ne sont pas une recette navigateur ni une preuve d’animation. Elles ne ferment aucune exigence de kit, de campagne, ni aucun besoin artistique. Aucun dessin, auteur d’empreinte, réparation, lignée, rang ou récompense n’est ajouté. Le parcours navigateur et la production sont vérifiés séparément par le chantier V111.
