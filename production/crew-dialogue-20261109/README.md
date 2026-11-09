# Dialogues du cercle — suivi du 9 novembre 2026

Ce nouveau lot suit **OPS-B05**, priorité P1 : « Accueils, refus, preuve récente,
recrutement et retour d’opération ont des répliques propres. » Le critère original
est conservé dans
`production/clan-ship-20261104/clan-ship-operations-20261105.xlsx`,
**Opérations!A62:L62**, et sa spécification dans `operations-spec.md`, §13.1.

La base de reprise est `19317af4f6cf05532a8ba56dbfe8f56fc4b225d9`.
Les dialogues sont raccordés aux six membres et à leurs cinq contextes : preuve
manquante, preuve récente, accord, retour d’opération et cercle confirmé. Seul
l’interlocuteur réellement rencontré à son poste disponible reçoit une réplique.
Les autres cartes restent des dossiers factuels. L’écoute ne modifie ni sauvegarde,
récompense, recrutement ou rang.

[Le rapport final](verification.json) atteste **248 tests réussis, zéro échec et
zéro ignoré** sur 17 fichiers, avec typegen, TypeScript, lint et build de production
réussis. Les 45 tests de domaine et six tests SSR nouveaux sont inclus dans ces
248, sans addition supplémentaire des matrices de 30 combinaisons.

La [recette native](qa/native/attempt-1/report.json) a réussi **52 contrôles** sur
le vrai GameClient Next de production : 30 entretiens, six résidents dans leurs
quartiers gérés et 50 comparaisons de sauvegarde brute inchangée. Ses neuf PNG
originaux ont été ouverts et inspectés. Les formats 1440, 390 et 320 pixels,
le clavier, le focus et un contrôleur synthétique ont été exercés. Les prérequis
des fixtures restent déclarés ; cela ne constitue pas une campagne intégrale.

## Portée et conservation

La qualification distingue implémentation, tests de domaine, vrais composants
en SSR, parcours navigateur, manette physique et revue artistique humaine.
La portée visée est de six membres et cinq contextes, avec des faits issus de la
campagne et un entretien à leur poste disponible. Elle ne produit aucune
animation, routine entre postes, récompense, recrutement ou progression de rang.

**OPS-Q27 reste partielle** : ses routines et animations ne sont pas produites
par B05. **OPS-B04 reste ouverte** : les dialogues n’accompagnent aucun groupe
du hangar aux soins. Les recettes de contrôleur synthétique et les captures
ne deviennent pas une manette physique ou une revue artistique humaine.

Le dernier classeur antérieur faisant autorité pour ce suivi est
`production/excel-bible-witnesses-20261108/suivi/Yautja_Audience_C37_20261108.xlsx`.
Le nouveau [classeur daté](suivi/Yautja_Dialogues_Equipage_20261109.xlsx)
conserve ses feuilles **Audience** et **Sources**, puis ajoute
cinq feuilles datées : synthèse, matrice B05, critères, preuves et sources.
Les feuilles, tables, chaînes partagées et autres parts historiques restent
identiques à l’octet. Quatre parts d’assemblage doivent évoluer pour les nouveaux
liens : workbook, relations, types de contenu et suffixe des styles ; leurs
déclarations historiques sont vérifiées.

Les **108 classeurs originaux** et les **198 fichiers des trois lots Excel/bible
du 8 novembre** sont protégés par
[historique-preserve.json](suivi/historique-preserve.json). Leurs SHA-256,
tailles et blobs Git du commit de base sont vérifiés avant génération et à chaque
contrôle. Aucun original ni ancien reçu n’est réécrit.

Les qualifications initiales du classeur témoins restent datées. Les 27 contrôles
navigateurs et six captures ultérieurs sur `bdc2b4af`, ainsi que l’échec puis la
correction de cadrage du complément post-clôture, conservent leurs propres reçus.
Ce nouveau suivi ne leur attribue aucun résultat rétroactif.

## Reproduction

Les sources de ce lot sont
[qualification-dialogue.json](suivi/qualification-dialogue.json),
[verification.json](verification.json) et les preuves réellement produites
dans `qa/`. Les commandes exactes et sorties sont conservées dans
[commands.json](qa/root/commands.json) et les 17 journaux TAP. Les premières
tentatives d’outillage restent datées ; les hashes courants et la suite finale
font foi après la correction grammaticale du sélecteur.

Le [contrôle du classeur](suivi/verification-classeur.json) compare les cellules,
la formule et son cache, les parts historiques et les octets reconstruits.
Le builder ne lance ni navigateur ni application Excel. Les neuf captures du
jeu ne sont pas présentées comme des rendus d’un moteur Excel natif.

```sh
python3 production/crew-dialogue-20261109/tools/build-tracker.py --ready-check
python3 production/crew-dialogue-20261109/tools/build-tracker.py --build
python3 production/crew-dialogue-20261109/tools/verify-tracker.py --check
```

`--ready-check` et `--check` ne modifient aucun fichier. `--build` exige les vrais
résultats, un relevé courant cohérent et `readyForWorkbook:true`; il écrit seulement
le nouveau classeur et sa requête reproductible dans `suivi/`.
Le helper `scripts/lib/excel_followup_append.py` et son layout V100 sont réemployés
sans modification, avec leurs propres empreintes contrôlées. Le vérificateur
compare les cellules aux sources qualifiées, les formules et caches, les parts
historiques et les octets d’une seconde construction déterministe.

Le relevé courant peut être régénéré par son propriétaire avec
`scripts/snapshot-runtime-v113.mjs --write` puis `--check` vers
`docs/qa/current-integration-20261103/runtime-inputs.json`. Les gels historiques
et les publications R7/V112 ne sont jamais des sorties de ce lot.
