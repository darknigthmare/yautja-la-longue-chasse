# Livraison V113/R8 — version B2 du 2 novembre 2026

Le Homeworld reçoit treize jonctions physiques de sol et le feu de forge lié à son horloge. La réserve propose les quatre grandes traques V6, sans convertir les terrains/sauvegardes V1–V5. La chasse conserve ses commandes accessibles, son atelier suspendable et son guide ; le menu donne maintenant priorité au corps porté valide et le badge distingue la cause d’un signal de la réponse demandée.

Version compilée : `719fe0d77e65be5349b76f507938309f56a67619`, build `OzWVxNAbS8mWbL_Pue9Zg`. Le [gel courant](../../v113-runtime-freeze.json) couvre 1964 fichiers, leurs octets et leurs vrais blobs Git. Les deux publications courantes utilisent ce même build : [Homeworld](../../v113-homeworld-validation.json), [Pit](../../v113-pit-validation.json). Leurs bruts gzip intégraux et toutes les captures originales sont portables dans les dossiers `v113-homeworld` et `v113-pit` voisins.

| Vérification réelle B2 | Résultat | Captures réellement ouvertes |
| --- | --- | --- |
| Modèles courants et compatibilité monde V77 | 556 PASS, 60 fichiers, 0 échec/ignoré | sans objet |
| Cohérence des deux publications courantes | 1 PASS, bruts/Git/HTML/images vérifiés | 78 vérifiées par le test après ouverture |
| Homeworld canonique, 6 parcours dont 5 restaurations anciennes | 249 PASS, 4 tableaux d’erreurs vides | 39 |
| Pit canonique FeralScar/ScarFeral | 127 PASS, 4 tableaux d’erreurs vides | 39 |
| Preserve V6 ciblée | 32 PASS, 77 textures, 92 dessins de couverts observés | 15 fichiers/14 contenus uniques |
| Passages Homeworld ciblés | 57 PASS,3 traversées/retours et vrai Worker/E entrée/sortie | 18 |
| Forge ciblée | 7 PASS ; 4 consoleErrors + 4 requêtes avortées intentionnellement conservées, 0 erreur ordinaire | 11 |
| Serveur HTTP compilé et routes QA protégées | 5 PASS | sans objet |

Le [replay Pit unique réellement exporté](../v113-pit-replay/entry.json) est conservé dans ses octets JSON d’origine. Le premier parcours finit une vraie victoire en deux manches et sa relecture publique V17 ; le second vérifie l’autre orientation et ses phases sans revendiquer une seconde victoire/export. Les profils et checkpoints initiaux sont explicitement déclarés dans les bruts. Les passages/relevés de la réserve ne constituent pas une victoire contre 24 adultes ni une campagne complète.

Les [preuves Preserve B2](../preserve-v6-r8-combined-20261102/b2/README.md), [Forge/Marais B2](../homeworld-r8-combined-20261102/b2/README.md) et [corrections chasse](../hunt-pr62-followup-r8-20261102/README.md) décrivent leurs propres limites. La vérification Canvas du badge prouve les bornes de texte, pas la lecture humaine sur téléphone.

La publication R7/V112 reste historique et byte-identique : cinq tests de capsule ont exécuté ses neuf assertions et trois CLI d’origine. Le nouveau test de trajet rejoue aussi les six assertions originales sur les vrais fichiers 03cf ; leur attente 1421 pas/>7100 unités est conservée. Le graphe courant choisit un chemin physique 1394 pas/7034,49256 unités. L’audit causal et son premier échec de harnais sont conservés dans `connector-counter-review/`. Ces historiques ne certifient pas l’application B2.

Le [classeur V114](../../../production/YAUTJA_V114_SUIVI.xlsx) possède 135 feuilles ; les 130 feuilles V113 sont byte-identiques. Il conserve 39 nouveaux PNG bruts : 35 cibles Homeworld avec une variante chacune, deux atlas Xeno de six réactions chacun pour le chantier Scar, et deux tentatives rejetées gardées. Avec les quatre PNG V113 antérieurs, 43 originaux sont contrôlés. La [galerie](../../../production/native-open-gallery-20261102.html) permet leur examen. Aucun pixel n’a été retouché ; les candidats restent non admis, avec leurs défauts de marge alpha et pivots/échelle/intégration à qualifier. Aucun NPC/action Xeno n’est activé par ces atlas et les vingt variantes/famille ne sont pas livrées.

Restent ouverts : grand vide `(6653,2800)`, bords/relief et finition du Homeworld ; quatre libellés hérités `edge_cluster`, `edge_stagger`, `single_anchor`, `rest_pocket` ; chevauchement des notifications basses du Pit ; autres partenaires/costumes et kits complets Feral/Scar ; durée 20–35 min, victoire contre 24 adultes, équilibrage/FPS de la réserve et admission artistique. Les 56 exigences source et 354 cibles ne sont pas déclarées fermées. Les étapes spécifiques au répertoire Vercel sont ignorées par le build local ; aucun déploiement ni Excel natif n’est attesté.

Les PR #62 et #82 restent ouvertes pour leurs reliquats. L’[audit daté au B1](pr62-pr82-audit-at-b1/remaining-pr62-pr82.md) est conservé ; ses deux manques applicatifs chasse ont depuis été portés dans B2. L’édition classeur chasse/téléchargements, d’autres qualifications et le décor legacy de la réserve restent distincts.

L’[index final](final-proof-index.json) fixe les empreintes des livrables. Les diagnostics B1 sont conservés et explicitement séparés de la publication B2 ; la première commande Homeworld refusée pour ordre incorrect n’a pas été utilisée comme réussite.

Les ajustements CI ont été éprouvés sur deux vrais clones réseau du commit de publication `837684333b42ee1a5e3a0be9ce1967e2486a2fd3`. Le [clone applicatif](ci-cold-application/README.md) reproduit les 564 motifs publiés : le bootstrap candidat corrigé apporte uniquement le commit B2 manquant par fetch canonique borné, sans lazy-fetch implicite ni changement de HEAD. Le gel 1964 et le test des deux rapports/78 PNG passent. Seul `node_modules` est partagé après vérification des deux manifestes de dépendances ; aucun nouveau build ou navigateur n’est revendiqué par ce contrôle froid.

Le [clone classeurs](ci-cold-workbooks/README.md) rejoue les huit blocs du workflow candidat, dont les cinq tests V113, l’installation isolée de Pillow 12.3.0 et les trois commandes V114/dix tests. Les 208 pins V113 et 152 pins V114 sont couverts par les 198 motifs d’origine. Ces essais locaux de commandes CI ne sont pas présentés comme un run GitHub Actions hébergé. Le bundle Canvas brut reste inchangé et son chemin précis est exclu du lint, comme les autres exports générés.

Le sélecteur des 41 fichiers V112 courants a été regroupé dans une seule étape avant le navigateur. La capsule R7 reste exécutée une seule fois séparément ; son adaptateur manuel est exclu du glob courant. Aucun test ni assertion n’est retiré. Le [contrôle de sélection](ci-current-selection-once.json) compare les fichiers effectivement choisis.
