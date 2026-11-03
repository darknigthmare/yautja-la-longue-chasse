# V47 — QA simulée : sauvegardes, reprise et migration du prologue

Profil : personne qui ferme l’onglet, manque de stockage ou utilise deux parties. Il s’agit d’un profil de test simulé, pas d’une certification par une personne externe.

## Intégration livrée

- Une nouvelle partie créée dans un des cinq slots commence directement à la nurserie. Le nom du slot devient le nom du joueur ; aucune identité adulte ni chasse Oseris ne précède le prologue.
- Le schéma principal passe en V8. `prologue: null` préserve les anciennes campagnes, leurs acquis et leurs accès. V7 ne se transforme ni en enfance à rejouer ni en enfance déjà réussie.
- Le checkpoint moteur, la chronique et la reconnaissance de fin sont dans la même sauvegarde principale. Une écriture atomique confirme ensemble la transition finale, `intro-completed` et `nursery-recognition` ; aucun honneur, trophée, équipement ou résultat adulte n’est ajouté.
- Les checkpoints intermédiaires ne peuvent pas enregistrer `complete`. Les données invalides ou futures sont refusées ; elles ne deviennent pas une campagne adulte par défaut.
- Une écriture qui réussit avant de lever une exception est réconciliée uniquement avec les octets de cette tentative. Un autre propriétaire ou une autre écriture bloque la confirmation. Même une pause sans changement relit le propriétaire et l’intégralité du snapshot durable.
- Les cinq parties, dix sauvegardes manuelles et deux autosauvegardes sont conservées. Le temps de jeu compte uniquement les nouvelles secondes de simulation, sans double compte à la reprise ni temps en pause. Une indication de route vers le vaisseau ne contourne pas une nurserie encore active. La fin durable résout la reprise vers Homeworld.
- Le prochain chapitre n’est annoncé prêt qu’après import de son composant et chargement des images requises. En cas de refus, le titre attend et propose de recharger la cité.

## Accueil après l’ellipse

L’apparence Unblooded est une image dédiée distincte des Younglings. L’accueil indique ce qui reste à produire. Le joueur doit réellement approcher le chef de la Citadelle puis l’instructeur des terrasses et interagir. Ces rencontres sauvegardent seulement les PNJ rencontrés, pas des preuves de dojo, d’armement ou de formation. Parler au maître avant le chef ne termine pas cet accueil.

Les textes et accès prématurés au vaisseau personnel, à la galaxie et aux panneaux d’équipement adulte sont fermés pour cette nouvelle progression. Les anciennes campagnes restent inchangées. Les dialogues d’accueil sont des adaptations originales, pas une transcription canonique.

## Vérifications exécutées

`node --test --test-concurrency=1 tests/nursery-campaign.test.mjs tests/campaign-slots.test.mjs tests/save-recovery-import.test.mjs tests/save-storage-status.test.mjs tests/save-homeworld-v7.test.mjs tests/save-v2.test.mjs tests/complete-archive.test.mjs tests/complete-archive-adversarial.test.mjs tests/homeworld-visit-recovery.test.mjs tests/homeworld.test.mjs tests/clanChronicle.test.ts`

Résultat : **158 réussites, 0 échec, 0 ignoré**, 5 233,5695 ms. Trace locale : `work/v47/nursery-integration-tests.log`.

Les neuf nouveaux scénarios de `nursery-campaign.test.mjs` couvrent une vraie victoire obtenue uniquement par les commandes du moteur, la transaction finale, les refus de quota, l’exception après écriture, les propriétaires concurrents, les versions futures, la migration, la reprise gérée par slots et le comptage idempotent des secondes réellement simulées.

ESLint ciblé : aucune erreur ; avertissement `img` déjà existant dans `ClanChroniclePanel`. La vérification TypeScript globale passe après assemblage du manifest artistique (`work/v47/prologue-typecheck.log`).

## Vérification navigateur exécutée

`scripts/verify-nursery-reliability-v47.mjs` passe sur le premier build V47 local à `http://127.0.0.1:4174` : **4 parcours réussis, aucune erreur JavaScript ni réponse HTTP en échec**. Trace : `work/v47/nursery-reliability-browser-qa/report.json`.

1. Nouvelle partie dans la nurserie ; pause, sauvegarde et Continuer reviennent à la même phase et au même propriétaire (tick sauvegardé 183, repris puis remis en pause 238), sans écran adulte ni preuve finale.
2. Dix checkpoints manuels et deux autos ; nouvelle partie isolée, sauvegarde de la seconde sans changement des octets de la première, puis chargement du checkpoint manuel de nurserie.
3. Quota injecté sur la sauvegarde principale et les slots : pause obligatoire, reprise et sortie refusées, octets antérieurs inchangés. Après retrait du refus, la reprise réussit sans double temps ni fausse fin.
4. Vraie fixture historique V7 sans champ prologue : migration gérée, pont et roster THE PIT toujours accessibles, aucune preuve de jeunesse inventée. La lecture préserve les octets primaires historiques.

La revue a aussi corrigé les textes du menu qui annonçaient encore une ouverture en jungle, ainsi que le fallback audio parental qui jouait une ambiance de vaisseau sur la nurserie. Ces deux corrections passent TypeScript, ESLint et les quatre tests du menu ; elles seront incluses dans le build final commun. La recette a depuis été relancée sur le build final, comme détaillé ci-dessous ; le contrôle de publication reste à effectuer après déploiement.

Ce document ne prétend pas qu’une panne du système, une manette physique ou une corruption de matériel a été testée.

## Correction visuelle Homeworld après la recette

Le registre des PNJ utilisait des couches de vêtements transparentes seules. Le chef, le maître et les autres originaux de la cité utilisent maintenant leur corps de même morphologie, leurs filets et pagnes, puis les dreadlocks existantes recalées au crâne de la vue trois quarts. Les personnages personnalisés historiques utilisent cette même composition ; les plaques de chasseurs nommés et l’image Unblooded dédiée restent intactes. Aucune image source n’a été retouchée et ces poses statiques ne sont pas annoncées comme des animations complètes.

Une capture Chrome de la composition React réelle vérifie cinq morphologies (elder, classic, huntress, super, young), cinquante images chargées avec leur canevas 256 × 384 et aucune erreur JavaScript. Inspection visuelle : corps, dreadlocks et pagne brun présents ; le pagne est conservé sur une couche découpée indépendante du masque de silhouette. Capture locale : `work/v47/homeworld-modular-qa/composition.png`. Ces anciens modules conservent leurs limites de pose et d’alignement détaillé ; ce correctif ne prétend pas constituer une refonte du rig.

L’accueil jeunesse masque aussi le dossier de trophée contesté, le journal d’enquête adulte, les trois preuves d’audience et le choix du témoin. Son journal suit uniquement le chef puis le mentor et annonce honnêtement les formations encore à accomplir. Les campagnes historiques gardent leur enquête.

## Revalidation du build final

Le 23 septembre 2026 à 13:04:24 UTC, les quatre mêmes parcours passent sur le build final compilé à `http://127.0.0.1:4174`, avec **0 erreur JavaScript et 0 réponse HTTP en échec**. Rapport : `work/v47/final-reliability-browser-qa/report.json`.

- Pause et Continuer : phase `ready`, tick durable 183 puis reprise remise en pause à 238 ; même partie et aucune introduction adulte.
- Isolation : dix manuelles et deux autos confirmées, octets de l’autre partie inchangés, chargement manuel dans la nurserie.
- Quota : simulation figée au tick 230, reprise et sortie refusées tant que le stockage refuse ; reprise à 233 après rétablissement, temps sans doublon et aucune preuve finale inventée.
- Fixture historique V7 : migration normalisée sans prologue rétroactif, pont et THE PIT accessibles.

Le navigateur de cette recette est fermé. Cette revalidation ne modifie aucun fichier de runtime.
