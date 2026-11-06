# Xeno Prime — suivi des 23 demandes complétées

**Suite V2.3 :** les 42 raccords A001–A042 sont également produits. Le catalogue atteint **150 sprites + 6 fonds** ; voir [RACCORDS_V23.md](RACCORDS_V23.md). Les [156 PNG sont versionnés dans la PR](../../../art-source/xeno-prime/berceau-enfoui/v2.3/INDEX_SPRITES.md), avec leurs [chemins et empreintes](DEPOT_PNG.json). Le tableau des 23 demandes ci-dessous conserve l’historique de complétion V2.2.

**Les 23 demandes d’images ouvertes au 5 novembre sont produites le 6 novembre 2026.** Le catalogue atteint **108/108 sprites et six fonds** ; aucune de ces 23 demandes ne reste `non_produit`. Les PNG indépendants, prompts et mesures figurent dans les [archives](ASSETS.md), le [catalogue](DONNEES_ASSETS.json) et le [suivi structuré](REPRISE_ASSETS.json).

Les ZIP V2.2 sont joints à la conversation ; leur publication durable reste ouverte après échec de préparation de l’enregistrement. Cet état de livraison reste distinct de la production effective des 23 PNG.

## Images livrées

| Clé | Image | Fichier | Dimensions | Référence(s) |
| --- | --- | --- | --- | --- |
| `XENO-BE-028` | Exuvie suspendue | `sprites/ruche/028_exuvie_suspendue.png` | 1024 × 1536 | BG01 |
| `XENO-BE-030` | Vanne tissulaire fermée | `sprites/ruche/030_vanne_tissulaire.png` | 2172 × 724 | 032 |
| `XENO-BE-031` | Filaments sensoriels | `sprites/ruche/031_filaments_sensoriels.png` | 1254 × 1254 | 084 |
| `XENO-BE-034` | Passage fermé | `sprites/ruche/034_porte_membrane_fermee.png` | 1312 × 1199 | 017 |
| `XENO-BE-035` | Passage sectionné | `sprites/ruche/035_porte_membrane_ouverte.png` | 1312 × 1199 | 034 |
| `XENO-BE-036` | Vanne après drainage | `sprites/ruche/036_vanne_drainee.png` | 2172 × 724 | 030 |
| `XENO-BE-056` | Nid de guetteur fermé | `sprites/ruche/056_nid_guetteur.png` | 2172 × 724 | 025 |
| `XENO-BE-057` | Cocon mural fermé | `sprites/ruche/057_cocon_mural.png` | 1024 × 1536 | 017 |
| `XENO-BE-067` | Nuage de spores | `sprites/effets/067_nuage_spores.png` | 1536 × 1024 | 001 |
| `XENO-BE-068` | Souffle de vapeur | `sprites/effets/068_souffle_vapeur.png` | 1536 × 1024 | 033 |
| `XENO-BE-069` | Pulsation nerveuse | `sprites/effets/069_pulsation_nerveuse.png` | 1254 × 1254 | 063 |
| `XENO-BE-070` | Impact de poussière | `sprites/effets/070_impact_poussiere.png` | 1536 × 1024 | 013 |
| `XENO-BE-071` | Onde tellurique | `sprites/effets/071_onde_sol.png` | 1536 × 1024 | 013 |
| `XENO-BE-072` | Voile de brume | `sprites/effets/072_voile_brume.png` | 1536 × 1024 | 001 |
| `XENO-BE-079` | Bouchon de résine brisé | `sprites/environnement/079_bouchon_resine_brise.png` | 1254 × 1254 | 078 |
| `XENO-BE-097` | Matriarche en agonie | `sprites/boss_actions/097_matriarche_agonie.png` | 1670 × 941 | 061 |
| `XENO-BE-098` | Bulbe nerveux rompu | `sprites/boss_actions/098_bulbe_rompu.png` | 1671 × 941 | 063 |
| `XENO-BE-102` | Éclats de chitine | `sprites/props_effets/102_eclats_chitine.png` | 1254 × 1254 | 054 |
| `XENO-BE-104` | Éclaboussure acide | `sprites/props_effets/104_acide_eclaboussure.png` | 1536 × 1024 | 065 |
| `XENO-BE-105` | Condensation de bouche | `sprites/props_effets/105_condensation_bouche.png` | 1672 × 941 | 068 |
| `XENO-BE-106` | Poussière de chute | `sprites/props_effets/106_poussiere_chute.png` | 1024 × 1536 | 070 |
| `XENO-BE-107` | Étincelles d’impact | `sprites/props_effets/107_etincelles_impact.png` | 1254 × 1254 | 069 |
| `XENO-BE-108` | Suintement acide | `sprites/props_effets/108_suintement_acide.png` | 1024 × 1536 | 066 |

Les cinq dépendances ont été produites dans le bon ordre : **030→036, 034→035, 068→105, 070→106 et 069→107**. 079 utilise le bouchon intact 078, 108 le globule 066 et 102 le fragment de couronne 054. Le suivi JSON conserve le plan initial, les prompts prévus, les prompts réellement soumis et les anciens statuts avant complétion.

La demande 028 garde BG01 comme référence principale de matière/palette, conformément au prompt consolidé ; l’ancien résumé citait 025. 056/057 restent des capsules de décor fermées, sans ennemi visible ni recrutement. 097 conserve la reine enracinée et complète l’agonie ; 098 représente un état rompu de 063.

## Travail restant au-delà de ces PNG

- Placer les nouvelles ressources dans les compositions et dans le vrai moteur, avec pivots, échelles, attaches, profondeur et collisions adaptés.
- Raccorder les variantes de passage, drainage et rupture aux événements et aux sauvegardes ; les 25 images V2.1 gardent pour l’instant leur état historique.
- Assembler les poses de raccord V2.3 en cycles animés, caler les attaches et définir les durées et émissions des VFX, réaliser les SFX et qualifier le rendu à l’échelle du jeu.
- Exécuter les **28 contrôles XBE-Q01 à XBE-Q28** de [INTEGRATION_ET_QA.md](INTEGRATION_ET_QA.md), puis effectuer la revue artistique humaine prévue par le projet.

Les images disponibles ne valent pas validation d’animation, de comportement ou de fidélité canonique générale. Le contrôle technique et la comparaison visuelle par l’assistant sont consignés séparément dans [PRODUCTION_20261106.md](PRODUCTION_20261106.md).

## Historique conservé

La limite de génération mentionnée dans le reçu de septembre reste un événement historique, avec réinitialisation annoncée le 17 septembre à 23:04:48 UTC. Elle n’a pas empêché cette nouvelle production du 6 novembre. Les archives précédentes et leurs empreintes restent conservées ; les 85 anciens sprites ne sont ni remplacés ni comptés deux fois.
