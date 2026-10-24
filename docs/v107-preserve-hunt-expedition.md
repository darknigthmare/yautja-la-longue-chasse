# V107 — Traversée de Vharuun

Cette expédition poursuit le chantier `PRESERVE-EXPANSION-80` du suivi Excel, la première sortie V66 et les Balises V104. Les sources publiques ne fournissent pas les cartes des neuf autres réserves ni les images H001–H100. Le présent terrain et les huit nouveaux adultes sont donc des créations originales déclarées du projet.

## Une sortie V3 distincte

La sélection libre et le dossier de campagne proposent explicitement « Traversée de Vharuun · huit secteurs et seize combattants ». Les sauvegardes V1 et V2 conservent leur identité, leurs coordonnées, leur nombre de personnes et leurs règles. Elles ne sont pas converties silencieusement.

Le terrain relie huit secteurs sur 12 800 unités. Les quatre premiers restent la Jungle des Parachutes, la Lisière de la Foreuse, le Camp des Trophées et la Crête des Balises. Le Bassin des Racines ajoute une route haute de branches basses ; les Serres Renversées une montée par étais jusqu’à 226 unités ; la Carrière des Échos un parcours de corniches à hauteurs différentes ; le Quai des Brumes des pontons et un poste oriental à 290 unités. Le sol relie toujours les secteurs, sans téléportation ni danger aléatoire ajouté.

Quatre relevés demandent chacun 120 ticks d’interaction immobile et exposée : Balises, passage au sol des Racines, signal haut des Serres, repère oriental du Quai. Les enregistrements conservent séparément leur tick et la position réellement échantillonnée. Marcher, être blessé ou quitter le poste interrompt le travail. Le carnet distingue notes consignées, notes rapportées par un retour physique et notes conservées après une mise hors combat. Un retour anticipé reste possible et ne complète aucun relevé absent.

## Seize combattants et quatre évasions

Les huit personnes historiques sont conservées. Ilye, Darek, Sava, Lem, Neme, Rahel, Varo et Eira sont huit nouveaux adultes combattants originaux armés de fusils. Ils se répartissent avec les anciens en quatre groupes de quatre. Chaque groupe dispose d’un appareil réel et de dépôts physiques. Les nouveaux profils ont des portées d’observation, cercles de témoins, vitesses de marche et de portage, contributions de réparation, annonces et cadences de tir distincts réellement appliqués au moteur.

Les seize dépôts contiennent initialement 32 lots. Ces lots restent conservés entre dépôts, porteurs, corps, appareils et neutralisations. Les personnes transportent les composants à pied, réparent, rejoignent la rampe et embarquent avant le départ. Un survivant dont l’appareil est déjà parti recherche un autre appareil encore présent par distance physique. Le carnet ne dévoile ni les personnes lointaines ni l’inventaire des appareils non inspectés.

Les trois atlas humains V7 sont partagés : aucune nouvelle image, identité H001–H100 ou animation complète du chasseur n’est certifiée. Les dix images natives historiques servent aussi au nouveau terrain ; les atmosphères, repères, tirs et jauges restent des couches de rendu déclarées. Les nouveaux noms ne sont pas une admission des cent portraits annoncés.

## Sauvegarde et validation

Le schéma V3 exige ses seize identités, quatre appareils, seize dépôts et quatre enregistrements. Il refuse identités mélangées, mauvais format de route, coordonnées/ticks incohérents, propriétés autoritaires inconnues et autres versions. Les observations déjà consignées, blessures, visites, évasions et matériaux ne peuvent pas régresser à l’écriture. Les imports, emplacements manuels et archives intégrales passent par les mêmes validations. Un refus d’écriture conserve l’ancien état durable et permet un réessai.

Les tests ciblés totalisent **64 cas PASS** : 46 cas historiques de simulation/carnet/logistique/Balises, 9 nouveaux cas de terrain/profils/imports/évasions, 4 transactions V3 et 5 cas historiques de slots/imports. Une comparaison avec les sources V106 gelées contrôle deux factories, trois graines et 900 pas par cas ; les documents V1/V2 restent identiques à l’octet près. Le parcours complet obtient les quatre relevés par marche, saut et interaction puis revient à l’extraction. Sa fixture déclare les seize humains déjà abattus : elle ne certifie pas une victoire de combat jouée. Un test distinct laisse les quatre groupes transporter, réparer et embarquer réellement.

```sh
node --experimental-strip-types --test --test-reporter=spec --test-concurrency=1 \
  tests/game-reserve-v66.test.mjs tests/game-reserve-campaign-slots-v66.test.mjs \
  tests/game-reserve-tactical-v98.test.mjs tests/game-reserve-interception-review-v98.test.mjs \
  tests/game-reserve-supply-denial-v99.test.mjs tests/game-reserve-logistics-review-v99.test.mjs \
  tests/game-reserve-lookout-v104.test.mjs tests/game-reserve-lookout-persistence-v104.test.mjs \
  tests/game-reserve-expedition-v107.test.mjs tests/game-reserve-expedition-persistence-v107.test.mjs
```

La recette compilée `scripts/qa-preserve-expedition-v107.mjs` a passé **31 contrôles**, sans erreur JavaScript, sur le build commun `7SF-x09qAzuBDG33EbB1i` du runtime `e93d43046dde641e1637faf9f72b4e5fa8d48404`. Ses **14 captures finales ont toutes été ouvertes et inspectées** : sélection libre et campagne, clavier et tactile paysage, V1 préservée, quatre postes, parcours des corniches, carnet desktop/mobile et retour fermé. Les quatre relevés ont été obtenus par les déplacements et interactions montés, puis conservés après refus/réessai d’écriture et rechargement. La fixture de ce parcours déclare toujours les seize combattants déjà neutralisés ; aucune victoire de combat jouée n’est revendiquée.

Le [rapport portable](v107-preserve-expedition-validation.json) conserve l’identité compilée, les huit réponses HTML vérifiées, les contrôles, les empreintes des sources avant/après identiques et les SHA256/tailles de toutes les preuves dans `docs/qa/v107-preserve-expedition/`. Les captures et le journal moteur détaillé sont complémentaires ; ils ne remplacent pas les tests de simulation.

Le chantier global reste partiel : **8/80 secteurs jouables**, **16/100 combattants originaux effectifs**, neuf autres réserves encore absentes. Les cent identités visuelles H001–H100, portraits, animations complètes, rivaux Yautja, coopération et trophées de campagne persistants restent des livraisons distinctes. Aucune durée officielle, fidélité canonique 1:1 ou publication publique n’est déduite de ce lot.
