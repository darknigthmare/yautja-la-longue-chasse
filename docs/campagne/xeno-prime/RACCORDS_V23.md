# Xeno Prime — 42 raccords visuels V2.3

Le catalogue initial **001–108 était complet** après V2.2. Cette nouvelle production ajoute **42 PNG individuels**, `XENO-BE-A001` à `XENO-BE-A042`, pour les transitions, effets et éléments séparés décrits dans [le contrat d’animation](INTEGRATION_ET_QA.md). Le total atteint **150 sprites et six fonds**, soit **156 PNG distincts**. Les 114 PNG V2.2 sont conservés à l’octet près.

## Contenu et raccord

- **18 tête/bulbe/prélèvement** : respiration, morsure, retour, charge et fin de souffle, exposition, affaissement, contraction du bulbe, tête après prélèvement, preuve arrimée et preuve endommagée.
- **10 tentacules** : raccords de balayage, perforation, capture, fouet et séparation de la souche et du segment de 042. Les deux masques réunis ont une intersection sur union mesurée de 99,0801 % avec 042 au seuil 16, sans chevauchement ; ce contrôle ne signifie pas des surfaces identiques pixel à pixel.
- **14 effets/interactions** : évent, passage, vanne, filaments, membrane royale, fracture du bulbe, début/fin du jet, impact acide, poussière, avertissement physique du sol, vapeur et spores.

Les huit poses de tête historiques sont complétées par A001–A008, A010 et A037–A042, soit **23 états de tête disponibles**. A009 et A029 sont des états du bulbe séparé : avec 063 et 098, ils forment **quatre états de cet organe**. A011/A012 sont des variantes de la même preuve 054 ; elles ne créent ni trophée supplémentaire ni promotion automatique.

## Livraison

| Archive | Octets | PNG |
| --- | ---: | ---: |
| `Xeno_Prime_V2_3_Ajouts_42_Raccords.zip` — téléchargement dans la conversation | 49446077 | 42 |
| `Xeno_Prime_V2_3_150_Sprites_6_Fonds.zip` — téléchargement dans la conversation | 216561227 | 156 |

```text
8ea785712534ad17bc5b5c88f121e4ab22ed8565c716e50cc73d2b99cbf00de7  Xeno_Prime_V2_3_Ajouts_42_Raccords.zip
9adc5c12550a46cc06bf4d7cdec7ccbd4d3da41fb3d8dc10aa87b405df041547  Xeno_Prime_V2_3_150_Sprites_6_Fonds.zip
```

Les résultats d’enregistrement sont indiqués pour chaque archive dans le JSON. Les ZIP sans lien persistant sont disponibles en téléchargement direct dans la conversation. Les échecs consignés concernent les ZIP ; les 156 PNG sont également conservés dans le dépôt, avec les [chemins et empreintes](DEPOT_PNG.json).

Chaque archive contient un catalogue HTML, un inventaire, les prompts et les manifestes de production. Le pack complet ajoute un **lecteur de 23 suites de poses** (`PREVISUALISATION_POSES.html`) et le [registre des séquences](SEQUENCES_RACCORDS.json). Il conserve les cadres natifs pour comparer les images, sans masquer les écarts par une interpolation. Les cadences de ce lecteur sont des vitesses de revue, pas des durées de combat équilibrées.

## Fidélité et contrôles

Les références réellement utilisées sont les PNG du Berceau, inspectés avant génération. Le cadre 059 fixe l’identité, la position et l’échelle des nouvelles têtes A001–A008 et A037–A042 ; les autres têtes historiques servent de références d’état. La reine demeure une tête géante enracinée, tournée à gauche, avec couronne ajourée et berceau. Le réseau reste noir/cuivre, cyan discret et ambre ; l’acide reste jaune-vert. Ces images prolongent la création originale du projet et ne constituent pas une certification canonique de film.

Les 42 PNG ont été décodés et comparés par empreinte aux sorties natives retenues : **copies exactes, alpha réel, pixels visibles, aucun pixel de bord au-dessus de 16/255**. Les 156 empreintes du pack complet sont distinctes. Les contrôles CRC des deux ZIP passent. Les prompts initiaux, corrections et sorties sélectionnées restent dans [RACCORDS_V23.json](RACCORDS_V23.json).

La relecture indépendante a confirmé le cadre des nouvelles têtes, les sept tiges de A026, le prélèvement limité et les variantes de la preuve. A024 a reçu une correction de son faux fond interne : sa fente possède maintenant de l’alpha nul. A028 garde deux petites amorces ; le noyau gauche descend à alpha 1/255, le droit à 0, avec 129 et 146 pixels d’alpha inférieur ou égal à 16 dans les zones contrôlées. A034 a été corrigé pour rester un avertissement avant impact. Les corrections de cadrage ou d’anatomie des autres poses sont conservées dans leur historique.

## Calage encore à réaliser

Les dimensions natives sont conservées, sans redimensionnement après génération. Écarts de toile par rapport au plan : **A001, A002, A003, A004, A005, A006, A007, A008, A009, A010, A023, A029, A037, A038, A039, A040, A041, A042** ; les dimensions exactes sont dans le tableau ci-dessous et dans le JSON. Ces écarts sont consignés, pas assimilés à un rendu strictement pixel à pixel.

La ligne de base de A015 est à y = 1489 contre y = 1507 sur 039 ; celle de A019 est à y = 965, comme sur 092, contre y = 987 sur 045. Le futur import doit régler les attaches et les décalages. Les poses historiques 060/061/096/097/062 gardent leurs cadrages antérieurs. Pour éviter leur saut d’échelle, six variantes A037–A042 ont été générées au cadre 059 ; le lecteur utilise ces variantes pour le souffle, la vulnérabilité, la mort et le prélèvement. Le calage moteur reste à vérifier. A021/A022 sont deux **calques simultanés** de 042, pas deux images consécutives ; leur recomposition exacte reste à qualifier. La correspondance géométrique entre les encoches A010/A042 et le fragment 054 reste également à qualifier lors du prélèvement.

Le lecteur HTML a fait l’objet de contrôles de chemins et de syntaxe, sans rendu navigateur revendiqué. Aucun import moteur, collision, cycle fluide, son, test comportemental ou validation artistique humaine n’est déclaré. Les **28 critères XBE-Q01 à XBE-Q28 restent ouverts**. `human_art_validation`, `runtime_integrated` et `animation_cycle_verified` restent `false`.

Le raccord PLAN08 / XP-Z11 → XP-Z12, le vestige mort XP-Z09, les douze tableaux locaux, la révélation de la tête en T12, les conditions d’Élite et l’extraction physique restent inchangés. Les 25 compositions V2.1 et leurs 312 placements n’ont pas été recalculés.

## Inventaire des 42 images

| ID | Image | Fichier | Dimensions natives | Références |
| --- | --- | --- | --- | --- |
| `XENO-BE-A001` | Inspiration au repos | `sprites/tete_bulbe/A001_059_inspiration.png` | 1671 × 941 | 059 |
| `XENO-BE-A002` | Anticipation de morsure | `sprites/tete_bulbe/A002_094_anticipation_morsure.png` | 1671 × 941 | 059, 094 |
| `XENO-BE-A003` | Fermeture de la morsure | `sprites/tete_bulbe/A003_094_fermeture_contact.png` | 1671 × 941 | 059, 094 |
| `XENO-BE-A004` | Retour au repos après recul | `sprites/tete_bulbe/A004_095_retour_repos.png` | 1671 × 941 | 059, 095 |
| `XENO-BE-A005` | Charge intermédiaire du souffle | `sprites/tete_bulbe/A005_060_charge_intermediaire.png` | 1671 × 941 | 059, 060 |
| `XENO-BE-A006` | Fin du souffle | `sprites/tete_bulbe/A006_096_fin_souffle.png` | 1671 × 941 | 059, 096, 060 |
| `XENO-BE-A007` | Exposition progressive du bulbe | `sprites/tete_bulbe/A007_061_exposition_progressive.png` | 1671 × 941 | 059, 061 |
| `XENO-BE-A008` | Affaissement final de la tête | `sprites/tete_bulbe/A008_097_affaissement_final.png` | 1671 × 941 | 059, 097, 062 |
| `XENO-BE-A009` | Bulbe nerveux contracté | `sprites/tete_bulbe/A009_063_bulbe_contracte.png` | 1671 × 941 | 063 |
| `XENO-BE-A010` | Tête après prélèvement de la crête | `sprites/tete_bulbe/A010_062_crete_prelevee.png` | 1671 × 941 | 062, 054 |
| `XENO-BE-A011` | Crête arrimée pour le transport | `sprites/tete_bulbe/A011_054_crete_arrimee_transport.png` | 1254 × 1254 | 054, 100 |
| `XENO-BE-A012` | Crête endommagée | `sprites/tete_bulbe/A012_054_crete_endommagee.png` | 1254 × 1254 | 054 |
| `XENO-BE-A013` | Déploiement intermédiaire du balayage | `sprites/tentacules/A013_089_balayage_deploiement_intermediaire.png` | 1774 × 887 | 089, 038 |
| `XENO-BE-A014` | Retour du balayage | `sprites/tentacules/A014_038_balayage_retour.png` | 1774 × 887 | 038, 089 |
| `XENO-BE-A015` | Descente de perforation | `sprites/tentacules/A015_039_perforation_descente.png` | 1024 × 1536 | 039, 090 |
| `XENO-BE-A016` | Retrait de perforation | `sprites/tentacules/A016_090_perforation_retrait.png` | 1024 × 1536 | 090, 039 |
| `XENO-BE-A017` | Anse à demi refermée | `sprites/tentacules/A017_041_anse_fermeture_intermediaire.png` | 1536 × 1024 | 041, 091 |
| `XENO-BE-A018` | Libération de l’anse | `sprites/tentacules/A018_091_anse_liberation.png` | 1536 × 1024 | 091, 041 |
| `XENO-BE-A019` | Armement du fouet diagonal | `sprites/tentacules/A019_045_fouet_armement.png` | 1536 × 1024 | 045, 092 |
| `XENO-BE-A020` | Descente intermédiaire du fouet | `sprites/tentacules/A020_045_fouet_descente_intermediaire.png` | 1536 × 1024 | 045, 092 |
| `XENO-BE-A021` | Souche sectionnée indépendante | `sprites/tentacules/A021_042_souche_separee.png` | 1536 × 1024 | 042 |
| `XENO-BE-A022` | Segment détaché indépendant | `sprites/tentacules/A022_042_segment_detache_separe.png` | 1536 × 1024 | 042 |
| `XENO-BE-A023` | Évent entrouvert | `sprites/effets_interactions/A023_033_event_entrouvert.png` | 1366 × 1151 | 033, 086 |
| `XENO-BE-A024` | Membrane de passage entrouverte | `sprites/effets_interactions/A024_034_membrane_passage_entrouverte.png` | 1312 × 1199 | 034, 035 |
| `XENO-BE-A025` | Vanne en cours de drainage | `sprites/effets_interactions/A025_030_vanne_drainage_intermediaire.png` | 2172 × 724 | 030, 036 |
| `XENO-BE-A026` | Filaments à demi dressés | `sprites/effets_interactions/A026_031_filaments_demi_alerte.png` | 1254 × 1254 | 031, 084 |
| `XENO-BE-A027` | Membrane royale gonflée | `sprites/effets_interactions/A027_046_membrane_gonflee.png` | 1774 × 887 | 046, 093 |
| `XENO-BE-A028` | Déchirure initiale de la membrane royale | `sprites/effets_interactions/A028_093_membrane_dechirure_initiale.png` | 1774 × 887 | 046, 093 |
| `XENO-BE-A029` | Rupture initiale du bulbe | `sprites/effets_interactions/A029_063_bulbe_rupture_initiale.png` | 1671 × 941 | 063, 098 |
| `XENO-BE-A030` | Naissance du jet acide | `sprites/effets_interactions/A030_103_jet_naissance.png` | 1536 × 1024 | 103 |
| `XENO-BE-A031` | Extinction du jet acide | `sprites/effets_interactions/A031_103_jet_extinction.png` | 1536 × 1024 | 103 |
| `XENO-BE-A032` | Premier contact acide | `sprites/effets_interactions/A032_104_acide_premier_contact.png` | 1536 × 1024 | 104, 065 |
| `XENO-BE-A033` | Début de l’impact de poussière | `sprites/effets_interactions/A033_070_poussiere_debut_impact.png` | 1536 × 1024 | 070 |
| `XENO-BE-A034` | Télégraphe de sol fissuré | `sprites/effets_interactions/A034_071_telegraphe_sol_fissure.png` | 1536 × 1024 | 071, 013 |
| `XENO-BE-A035` | Amorce de vapeur | `sprites/effets_interactions/A035_068_vapeur_amorce.png` | 1536 × 1024 | 068, 033 |
| `XENO-BE-A036` | Dissipation des spores | `sprites/effets_interactions/A036_067_spores_dissipation.png` | 1536 × 1024 | 067 |
| `XENO-BE-A037` | Préparation complète du souffle au cadre 059 | `sprites/tete_bulbe/A037_060_preparation_cadre_059.png` | 1671 × 941 | 059, 060 |
| `XENO-BE-A038` | Souffle actif au cadre 059 | `sprites/tete_bulbe/A038_096_souffle_actif_cadre_059.png` | 1671 × 941 | 059, 096 |
| `XENO-BE-A039` | Vulnérabilité complète au cadre 059 | `sprites/tete_bulbe/A039_061_vulnerable_cadre_059.png` | 1671 × 941 | 059, 061 |
| `XENO-BE-A040` | Agonie au cadre 059 | `sprites/tete_bulbe/A040_097_agonie_cadre_059.png` | 1671 × 941 | 059, 097 |
| `XENO-BE-A041` | Tête morte au cadre 059 | `sprites/tete_bulbe/A041_062_morte_cadre_059.png` | 1670 × 942 | 059, 062 |
| `XENO-BE-A042` | Tête après prélèvement au cadre 059 | `sprites/tete_bulbe/A042_062_prelevee_cadre_059.png` | 1670 × 942 | A041, 054 |
