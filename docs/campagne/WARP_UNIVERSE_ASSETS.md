# Warp Universe — catalogue des illustrations et preuves techniques

Contrôle du 5 novembre 2026. Complément de [Warp Universe](WARP_UNIVERSE.md) dans la PR #116. Sources : les cinq archives originales récupérées depuis les livrables de la conversation et la Library du projet ; leur contenu a été ouvert et contrôlé, pas seulement leur nom.

## Statut exact

**170 PNG indépendants, 170 identifiants uniques et 170 empreintes SHA-256 de PNG distinctes.** Les dimensions réelles et les empreintes des images correspondent aux manifestes sources. Décodage PNG vérifié ; présence effective de pixels visibles et, pour les détourages, de pixels transparents : **146 sprites transparents et 24 fonds opaques**. Aucune nouvelle image générée pendant ce raccord documentaire.

Ce contrôle technique ne certifie ni le cadrage artistique, ni l'identité 1:1, ni l'animation, ni la collision, ni le chargement dans une scène. Statut commun : **illustration source disponible / contrôle technique effectué / intégration runtime non attestée / revue artistique humaine à faire**. `validated` ne doit pas être attribué automatiquement dans l'atlas du jeu.

**Cette PR contient le catalogue, pas les 170 binaires PNG.** Les chemins ci-dessous sont relatifs au dossier racine de chaque archive ; ils ne prétendent pas exister sous `public/` ni dans ce dossier Git. Les ZIP, leurs galeries et leurs manifestes restent les livrables sources. Ne pas remplacer ces références par d'anciens liens `sandbox:` temporaires dans le dépôt.

## Archives sources immuables

Les numéros sont historiques : 97 et 98 restent réservés aux deux demandes non livrées. Le dernier numéro planifié 210 n'est pas un total d'images produites.

| Lot | Archive exacte | Octets | Images | Détourées / fonds |
| --- | --- | --- | --- | --- |
| 01 | `Yautja_Warp_Universe_Sprites_v1.zip` | 90194078 | 48 | 48 / 0 |
| 02 | `Yautja_Warp_Universe_Sprites_Complement_02.zip` | 96701693 | 48 | 48 / 0 |
| 03 | `Yautja_Warp_Universe_Sprites_Complement_03.zip` | 91093662 | 40 | 28 / 12 |
| 04 | `Yautja_Warp_Universe_Sprites_Complement_04.zip` | 49630359 | 24 | 18 / 6 |
| 05 | `Yautja_Warp_Universe_Sprites_Complement_05_PARTIEL.zip` | 22390752 | 10 | 4 / 6 |
| Total | Cinq archives | 350010544 | 170 | 146 / 24 |

SHA-256 des archives contrôlées :

```text
c083a4ad53d13a12fea23351d5a64e854e795c5fd72b1f63d1b9db84a4e7409e  Yautja_Warp_Universe_Sprites_v1.zip
a791b353552fbb23504952988294a00fabbded017fde3dad18757874b0d61af4  Yautja_Warp_Universe_Sprites_Complement_02.zip
007843876b0108f6dd849745e859e88ba21103b43fc1de2a37c75a623fd34c31  Yautja_Warp_Universe_Sprites_Complement_03.zip
948ac24fec5a2fee83fb25ca6d28c79aa3adaa257dfdc5c88813f68730c8aa72  Yautja_Warp_Universe_Sprites_Complement_04.zip
967d5d79820280e69bab0c7ff74b18220a2c30e2091b3a3dc9e4d6282d8156ac  Yautja_Warp_Universe_Sprites_Complement_05_PARTIEL.zip
```

Repères de récupération des originaux (identités de fichiers, pas des URLs publiques) :

| Lot | Identité du livrable source |
| --- | --- |
| 01 | `file_00000000ad74820db135359b82290bd7` |
| 02 | `file_0000000024f48243aa0be1b92dceab60` |
| 03 | `file_000000002b6c81fd84b0ebbaf4622c8c` |
| 04 | `file_000000006fdc81fd97b2164888c52416` |
| 05 | `file_00000000c1388230b67af199e765aac7` |

Emplacements Library historiques : `/Yautja The Long Hunt/Warp_Universe_Sprites_v1/` et `/Yautja The Long Hunt/Warp_Universe_Sprites_Complement_02/` à `05/`. Le lot 05 partiel a aussi été récupéré depuis la pièce jointe de conversation. Les manifestes inclus enregistrent les SHA-256 par PNG, les prompts et les limites connues ; les conserver avec les images lors d'un futur import.

## Catalogue exhaustif des 170 fichiers livrés

Dimensions en pixels. Les **fonds opaques** sont les IDs **099–110, 157–162, 175, 176, 177, 181, 182, 183**. Les autres lignes sont les 146 sprites avec transparence. Le fond 110 mesure réellement **1672 × 940**, pas 941 ; conserver la mesure source.

| ID | Lot | PNG dans l'archive | Dimensions |
| --- | --- | --- | --- |
| 001 | 01 | `module/01_portail_warp_actif.png` | 1312 × 1199 |
| 002 | 01 | `module/02_portail_warp_inactif.png` | 1222 × 1287 |
| 003 | 01 | `module/03_console_coordonnees.png` | 1222 × 1287 |
| 004 | 01 | `module/04_coeur_warp.png` | 1214 × 1296 |
| 005 | 01 | `module/05_balise_ancrage.png` | 1182 × 1330 |
| 006 | 01 | `module/06_adjutant_yautja.png` | 1145 × 1374 |
| 007 | 01 | `module/07_gardien_du_seuil.png` | 1024 × 1536 |
| 008 | 01 | `module/08_alcove_trophees.png` | 1024 × 1536 |
| 009 | 01 | `epoques/09_cretace_tyrannosaure.png` | 1536 × 1024 |
| 010 | 01 | `epoques/10_cretace_triceratops.png` | 1536 × 1024 |
| 011 | 01 | `epoques/11_glaciaire_mammouth.png` | 1536 × 1024 |
| 012 | 01 | `epoques/12_glaciaire_pisteur.png` | 1024 × 1536 |
| 013 | 01 | `epoques/13_egypte_guerrier.png` | 1145 × 1374 |
| 014 | 01 | `epoques/14_egypte_portique.png` | 1254 × 1254 |
| 015 | 01 | `epoques/15_rome_centurion.png` | 1024 × 1536 |
| 016 | 01 | `epoques/16_rome_tour_guet.png` | 1024 × 1536 |
| 017 | 01 | `epoques/17_viking_guerriere.png` | 1024 × 1536 |
| 018 | 01 | `epoques/18_viking_maison_longue.png` | 1774 × 887 |
| 019 | 01 | `epoques/19_medieval_chevalier.png` | 1024 × 1536 |
| 020 | 01 | `epoques/20_medieval_beffroi.png` | 1024 × 1536 |
| 021 | 01 | `epoques/21_japon_samourai.png` | 1230 × 1278 |
| 022 | 01 | `epoques/22_japon_porte_fortifiee.png` | 1536 × 1024 |
| 023 | 01 | `epoques/23_caraibes_corsaire.png` | 1024 × 1536 |
| 024 | 01 | `epoques/24_caraibes_navire.png` | 1536 × 1024 |
| 025 | 01 | `epoques/25_west_tireur.png` | 1024 × 1536 |
| 026 | 01 | `epoques/26_west_locomotive.png` | 1774 × 887 |
| 027 | 01 | `epoques/27_1916_soldat.png` | 1024 × 1536 |
| 028 | 01 | `epoques/28_1916_tranchee.png` | 1536 × 1024 |
| 029 | 01 | `epoques/29_1942_pilote.png` | 1024 × 1536 |
| 030 | 01 | `epoques/30_1942_chasseur_aerien.png` | 1774 × 887 |
| 031 | 01 | `epoques/31_moderne_traqueur.png` | 1024 × 1536 |
| 032 | 01 | `epoques/32_moderne_relais_radio.png` | 1536 × 1024 |
| 033 | 01 | `cinema/33_prey_feral.png` | 1024 × 1536 |
| 034 | 01 | `cinema/34_predator_jungle_hunter.png` | 1024 × 1536 |
| 035 | 01 | `cinema/35_predator2_city_hunter.png` | 1024 × 1536 |
| 036 | 01 | `cinema/36_avp_scar.png` | 1024 × 1536 |
| 037 | 01 | `cinema/37_avpr_wolf.png` | 1024 × 1536 |
| 038 | 01 | `cinema/38_the_predator_fugitive.png` | 1024 × 1536 |
| 039 | 01 | `cinema/39_kok_chasseur_viking.png` | 1024 × 1536 |
| 040 | 01 | `cinema/40_kok_chasseur_japon.png` | 1024 × 1536 |
| 041 | 01 | `cinema/41_kok_pilote_yautja.png` | 1024 × 1536 |
| 042 | 01 | `objets/42_sceau_adjutant.png` | 1310 × 1200 |
| 043 | 01 | `objets/43_fragment_coordonnees.png` | 1024 × 1536 |
| 044 | 01 | `objets/44_masque_archive.png` | 1199 × 1312 |
| 045 | 01 | `objets/45_lance_serment.png` | 1774 × 887 |
| 046 | 01 | `objets/46_trophee_cretace.png` | 1536 × 1024 |
| 047 | 01 | `objets/47_trophee_viking.png` | 1226 × 1283 |
| 048 | 01 | `objets/48_enforcer_yautja.png` | 1024 × 1536 |
| 049 | 02 | `epoques/49_cretace_dromeosaure.png` | 1536 × 1024 |
| 050 | 02 | `epoques/50_glaciaire_smilodon.png` | 1536 × 1024 |
| 051 | 02 | `epoques/51_glaciaire_grotte.png` | 1536 × 1024 |
| 052 | 02 | `epoques/52_cretace_fougere_geante.png` | 1024 × 1536 |
| 053 | 02 | `epoques/53_egypte_colosse_ruine.png` | 1024 × 1536 |
| 054 | 02 | `epoques/54_egypte_archer.png` | 1024 × 1536 |
| 055 | 02 | `epoques/55_rome_baliste.png` | 1536 × 1024 |
| 056 | 02 | `epoques/56_viking_berserker.png` | 1024 × 1536 |
| 057 | 02 | `epoques/57_viking_drakkar.png` | 1536 × 1024 |
| 058 | 02 | `epoques/58_medieval_arbaletrier.png` | 1024 × 1536 |
| 059 | 02 | `epoques/59_medieval_pont_levis.png` | 1312 × 1199 |
| 060 | 02 | `epoques/60_japon_shinobi.png` | 1145 × 1374 |
| 061 | 02 | `epoques/61_japon_torii.png` | 1374 × 1145 |
| 062 | 02 | `epoques/62_caraibes_canon.png` | 1536 × 1024 |
| 063 | 02 | `epoques/63_west_sherif.png` | 1024 × 1536 |
| 064 | 02 | `epoques/64_west_cheval_selle.png` | 1536 × 1024 |
| 065 | 02 | `epoques/65_west_wagon_voyageurs.png` | 1971 × 798 |
| 066 | 02 | `epoques/66_1916_mitrailleuse.png` | 1536 × 1024 |
| 067 | 02 | `epoques/67_1942_bunker.png` | 1536 × 1024 |
| 068 | 02 | `epoques/68_1942_transport_militaire.png` | 1774 × 887 |
| 069 | 02 | `epoques/69_moderne_metro.png` | 2140 × 735 |
| 070 | 02 | `cinema/70_prey_naru.png` | 1024 × 1536 |
| 071 | 02 | `cinema/71_predator_dutch.png` | 1024 × 1536 |
| 072 | 02 | `cinema/72_predator2_harrigan.png` | 1024 × 1536 |
| 073 | 02 | `cinema/73_avp_lex.png` | 1024 × 1536 |
| 074 | 02 | `cinema/74_the_predator_quinn.png` | 1024 × 1536 |
| 075 | 02 | `cinema/75_kok_ursa.png` | 1024 × 1536 |
| 076 | 02 | `cinema/76_kok_torres.png` | 1024 × 1536 |
| 077 | 02 | `cinema/77_kok_kenji.png` | 1024 × 1536 |
| 078 | 02 | `cinema/78_avp_reine_alien.png` | 1222 × 1287 |
| 079 | 02 | `cinema/79_kok_kiyoshi.png` | 1024 × 1536 |
| 080 | 02 | `cinema/80_avp_facehugger.png` | 1536 × 1024 |
| 081 | 02 | `cinema/81_avp_oeuf.png` | 1246 × 1263 |
| 082 | 02 | `cinema/82_the_predator_chien.png` | 1536 × 1024 |
| 083 | 02 | `cinema/83_the_predator_assassin.png` | 1024 × 1536 |
| 084 | 02 | `module/84_kok_chasseur_aerien_yautja.png` | 1774 × 887 |
| 085 | 02 | `module/85_navette_chasse_yautja.png` | 1536 × 1024 |
| 086 | 02 | `module/86_capsule_avatar.png` | 1024 × 1536 |
| 087 | 02 | `module/87_station_soins.png` | 1145 × 1374 |
| 088 | 02 | `module/88_ratelier_armes.png` | 1024 × 1536 |
| 089 | 02 | `module/89_coffre_archives.png` | 1774 × 887 |
| 090 | 02 | `module/90_hologlobe_terre.png` | 1254 × 1254 |
| 091 | 02 | `objets/91_bracelet_selection_epoques.png` | 1536 × 1024 |
| 092 | 02 | `objets/92_disque_chasse.png` | 1254 × 1254 |
| 093 | 02 | `objets/93_lanceur_filet.png` | 1536 × 1024 |
| 094 | 02 | `objets/94_conteneur_echantillon.png` | 1208 × 1302 |
| 095 | 02 | `objets/95_sceau_chronique_accomplie.png` | 1254 × 1254 |
| 096 | 02 | `module/96_avatar_personnalise_yautja.png` | 1024 × 1536 |
| 099 | 03 | `decors/99_cretace_fond.png` | 1672 × 941 |
| 100 | 03 | `decors/100_glaciaire_fond.png` | 1672 × 941 |
| 101 | 03 | `decors/101_egypte_fond.png` | 1672 × 941 |
| 102 | 03 | `decors/102_rome_fond.png` | 1672 × 941 |
| 103 | 03 | `decors/103_viking_fond.png` | 1672 × 941 |
| 104 | 03 | `decors/104_medieval_fond.png` | 1672 × 941 |
| 105 | 03 | `decors/105_japon_fond.png` | 1672 × 941 |
| 106 | 03 | `decors/106_caraibes_fond.png` | 1672 × 941 |
| 107 | 03 | `decors/107_west_fond.png` | 1672 × 941 |
| 108 | 03 | `decors/108_1916_fond.png` | 1672 × 941 |
| 109 | 03 | `decors/109_1942_fond.png` | 1672 × 941 |
| 110 | 03 | `decors/110_moderne_fond.png` | 1672 × 940 |
| 111 | 03 | `epoques/111_cretace_arbre_lianes.png` | 1024 × 1536 |
| 112 | 03 | `epoques/112_glaciaire_arche_rocheuse.png` | 1536 × 1024 |
| 113 | 03 | `epoques/113_egypte_obelisque.png` | 1024 × 1536 |
| 114 | 03 | `epoques/114_rome_ruine_aqueduc.png` | 1536 × 1024 |
| 115 | 03 | `epoques/115_viking_ponton.png` | 1536 × 1024 |
| 116 | 03 | `epoques/116_medieval_puits.png` | 1024 × 1536 |
| 117 | 03 | `epoques/117_japon_pont_bois.png` | 1774 × 887 |
| 118 | 03 | `epoques/118_caraibes_grue_portuaire.png` | 1024 × 1536 |
| 119 | 03 | `epoques/119_west_chateau_eau.png` | 1024 × 1536 |
| 120 | 03 | `epoques/120_1916_abri_tranchee.png` | 1536 × 1024 |
| 121 | 03 | `epoques/121_1942_projecteur.png` | 1536 × 1024 |
| 122 | 03 | `epoques/122_moderne_escalier_secours.png` | 1024 × 1536 |
| 123 | 03 | `cinema/123_prey_taabe.png` | 1024 × 1536 |
| 124 | 03 | `cinema/124_predator_billy.png` | 1024 × 1536 |
| 125 | 03 | `cinema/125_predator_dillon.png` | 1024 × 1536 |
| 126 | 03 | `cinema/126_predator_anna.png` | 1024 × 1536 |
| 127 | 03 | `cinema/127_predator2_danny.png` | 1024 × 1536 |
| 128 | 03 | `cinema/128_predator2_keyes.png` | 1024 × 1536 |
| 129 | 03 | `cinema/129_avp_sebastian.png` | 1024 × 1536 |
| 130 | 03 | `cinema/130_avpr_kelly.png` | 1024 × 1536 |
| 131 | 03 | `cinema/131_avp_celtic.png` | 1024 × 1536 |
| 132 | 03 | `cinema/132_avp_chopper.png` | 1024 × 1536 |
| 133 | 03 | `epoques/133_cretace_mosasaure.png` | 1774 × 887 |
| 134 | 03 | `epoques/134_glaciaire_rhinoceros_laineux.png` | 1536 × 1024 |
| 135 | 03 | `epoques/135_egypte_crocodile_nil.png` | 1774 × 887 |
| 136 | 03 | `epoques/136_viking_loup.png` | 1536 × 1024 |
| 137 | 03 | `epoques/137_japon_sanglier.png` | 1536 × 1024 |
| 138 | 03 | `epoques/138_west_bison.png` | 1536 × 1024 |
| 139 | 04 | `epoques/139_cretace_racines_plateforme.png` | 1774 × 887 |
| 140 | 04 | `epoques/140_glaciaire_rebord_glace.png` | 1536 × 1024 |
| 141 | 04 | `epoques/141_egypte_passage_tombeau.png` | 1536 × 1024 |
| 142 | 04 | `epoques/142_rome_egout_voute.png` | 1536 × 1024 |
| 143 | 04 | `epoques/143_viking_tour_guet.png` | 1024 × 1536 |
| 144 | 04 | `epoques/144_medieval_rempart.png` | 1994 × 789 |
| 145 | 04 | `epoques/145_japon_toit_praticable.png` | 2172 × 724 |
| 146 | 04 | `epoques/146_caraibes_passerelle_cordes.png` | 2172 × 724 |
| 147 | 04 | `epoques/147_west_galerie_mine.png` | 1536 × 1024 |
| 148 | 04 | `epoques/148_1916_obstacle_barbeles.png` | 1774 × 887 |
| 149 | 04 | `epoques/149_1942_passage_bunker.png` | 1774 × 887 |
| 150 | 04 | `epoques/150_moderne_conduit_aeration.png` | 2098 × 749 |
| 151 | 04 | `epoques/151_cretace_ankylosaure.png` | 1774 × 887 |
| 152 | 04 | `epoques/152_cretace_pteranodon.png` | 1536 × 1024 |
| 153 | 04 | `epoques/153_glaciaire_ours_cavernes.png` | 1536 × 1024 |
| 154 | 04 | `epoques/154_egypte_lion.png` | 1536 × 1024 |
| 155 | 04 | `epoques/155_caraibes_iguane.png` | 1536 × 1024 |
| 156 | 04 | `epoques/156_japon_cerf_sika.png` | 1536 × 1024 |
| 157 | 04 | `cinema/157_prey_plaines_1719_fond.png` | 1672 × 941 |
| 158 | 04 | `cinema/158_predator_jungle_fond.png` | 1672 × 941 |
| 159 | 04 | `cinema/159_predator2_abattoir_fond.png` | 1672 × 941 |
| 160 | 04 | `cinema/160_avp_pyramide_fond.png` | 1672 × 941 |
| 161 | 04 | `cinema/161_avpr_egouts_fond.png` | 1672 × 941 |
| 162 | 04 | `cinema/162_the_predator_crash_fond.png` | 1672 × 941 |
| 163 | 05 | `cinema/163_predators_royce.png` | 1024 × 1536 |
| 164 | 05 | `cinema/164_predators_isabelle.png` | 1024 × 1536 |
| 175 | 05 | `decors/175_cretace_caverne_fond.png` | 1672 × 941 |
| 176 | 05 | `decors/176_glaciaire_grotte_profonde_fond.png` | 1672 × 941 |
| 177 | 05 | `decors/177_egypte_chambre_tombeau_fond.png` | 1672 × 941 |
| 181 | 05 | `decors/181_japon_dojo_fond.png` | 1672 × 941 |
| 182 | 05 | `decors/182_caraibes_cale_fond.png` | 1672 × 941 |
| 183 | 05 | `decors/183_west_saloon_fond.png` | 1672 × 941 |
| 187 | 05 | `epoques/187_cretace_bloc_rocher.png` | 1536 × 1024 |
| 188 | 05 | `epoques/188_glaciaire_stalactite.png` | 1024 × 1536 |

## Raccord aux contenus et réutilisation

- `module/` et `objets/` : propositions pour la baie, ses interactions, le retour et l'archivage. Le Gardien du Seuil, le sceau d'Adjutant et la mémoire d'avatar sont des concepts du projet, pas une nouvelle source de canon.
- `epoques/` et fonds d'époque : créations destinées aux familles WU-E01–E12. Une espèce, une arme ou un bâtiment doit encore être confronté à la région et à la date de la mission.
- `cinema/` : adaptations illustratives ; associer œuvre, scène, costume, angle et rôle avant d'attribuer une fidélité 1:1. Les IDs 163 et 164 relèvent de l'extension **Predators hors Terre**, non d'une mission terrestre disponible.
- Les noms de fichiers « praticable », « passage » ou « mécanisme » décrivent une intention artistique ; ils n'attestent aucune collision, porte animée ou interaction programmée.
- Les appareils 030, 084 et 085 sont des vues fixes : leur présence ne couvre ni les angles de vol, ni les mouvements de caméra, ni la propulsion ou le pilotage.
- Rechercher les assets déjà présents du même personnage/objet avant tout import. Ne pas écraser un asset validé ni créer un second ID runtime seulement parce qu'un nouveau PNG existe. Documenter l'association `lot + ID source → ID existant ou nouvelle demande`.

## Import futur et critères de validation

1. Récupérer l'archive exacte et comparer son SHA-256 ; lire son `MANIFESTE.json`, conserver sa provenance et son nom source.
2. Pour chaque PNG, revérifier empreinte, décodage, dimensions, alpha et pixels visibles ; inspecter les contours sur fonds clair et sombre, le cadrage et les ouvertures.
3. Mapper le fichier au registre existant ; inscrire la référence de scène/costume ou la création originale. Les dimensions du canevas ne constituent pas une échelle en mètres.
4. Fixer pivot, échelle, profondeur, empreinte de collision, enveloppe d'usage et points d'attache VFX. Produire les états et animations manquants au lieu d'étirer une image.
5. Tester une scène réelle : chargement, interactions, sorties, occlusion, lumière, clavier/manette, sauvegarde et budget mémoire. Le contrôle des ZIP n'a pas effectué ces tests.
6. Faire valider artistiquement avant de modifier `validated`. Le statut runtime reste indépendant du statut source.

Les 40 demandes non livrées figurent dans [la reprise](WARP_UNIVERSE_REPRISE.md). Les fichiers sources historiques ne sont ni renumérotés ni remplacés par des miniatures, et aucune disparition définitive n'est déduite d'une recherche sans résultat.
