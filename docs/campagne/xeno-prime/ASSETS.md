# Xeno Prime — illustrations disponibles et preuves techniques

Complément documentaire de la bible, PR #116, contrôlé le **5 novembre 2026**. Le secteur **Le Berceau enfoui** dispose de **85 sprites PNG transparents**, **6 fonds opaques** et **25 fichiers de composition pour 12 tableaux**. La cible artistique reste 108 sprites : **23 demandes sont ouvertes** dans [REPRISE.md](REPRISE.md).

## Statut et périmètre

Les 91 PNG du manifeste ont été décodés, mesurés et comparés à leur SHA-256. Ils possèdent 91 empreintes distinctes. Pour les 85 sprites RGBA, le canal alpha comporte réellement des pixels transparents et visibles ; les six fonds sont RGB opaques. Cette vérification technique n’attribue aucune validation artistique humaine, aucune fidélité canonique 1:1, aucun cycle d’animation ni aucun comportement de jeu.

**Statut commun : image source disponible ; contrôle technique effectué ; validation artistique humaine non attestée ; intégration runtime non attestée.** Dans les données documentaires, `technical_verified` vaut `true`, `human_art_validation` et `runtime_integrated` valent `false`. Le contrat de `validated` du registre du jeu demeure réservé à la revue humaine.

Cette PR référence les ressources sources : **les PNG ne sont pas copiés dans `public/`**. Les chemins de cet inventaire sont relatifs à la racine de l’archive consolidée. `source_filename` désigne les sources brutes de l’archive séparée. Les sept ajouts sont déjà compris dans les 85 ; les sources et les compositions ne s’ajoutent pas au total de sprites.

Les clés documentaires **XENO-BE-001 à XENO-BE-108** préservent la numérotation d’origine sans entrer en collision avec les IDs identiques d’autres packs, notamment Warp Universe. Les fonds utilisent **XENO-BE-BG01 à XENO-BE-BG06**. Aucune de ces clés n’est déclarée comme nouvel identifiant runtime.

Données structurées : [DONNEES_ASSETS.json](DONNEES_ASSETS.json), [SCENES_ILLUSTREES.json](SCENES_ILLUSTREES.json) et [COMPOSITION_SOUFFLE.json](COMPOSITION_SOUFFLE.json).

## Archives de livraison

| Archive exacte et téléchargement | Octets | Contenu |
| --- | ---: | --- |
| [Xeno_Prime_V2_Actualise_85_Sprites_12_Tableaux.zip](https://chatgpt.com/library?file_id=libfile_f92f983ef05481919390053c29cc5411&account_id=personal) | 346867734 | Pack consolidé : 85 sprites, 6 fonds, 25 compositions et catalogue |
| [Xeno_Prime_V2_Ajouts_7_Sprites.zip](https://chatgpt.com/library?file_id=libfile_c9d2fccc70508191ae4dcc3bc4a82e49&account_id=personal) | 10429585 | Sous-ensemble des sept ajouts, déjà inclus dans les 85 |
| [Xeno_Prime_V2_85_Sources_et_Prompts.zip](https://chatgpt.com/library?file_id=libfile_e41f7de08ca88191b69955c07fa6aeb8&account_id=personal) | 145258155 | Sources sélectionnées, prompts et scripts de composition ; pas 85 assets supplémentaires |

```text
4f50a743700c746d0056dd7781c56cfdf418b12fab3e3ad07511e253de26da68  Xeno_Prime_V2_Actualise_85_Sprites_12_Tableaux.zip
8c2b97dfa780875cd34ecff806181fed115fd55f469d41e34b6bc4463476534f  Xeno_Prime_V2_Ajouts_7_Sprites.zip
16e587d91e411b8b264bae7b7a43e453ad25fc7f1636c1fb49d4b763cdc8a1b9  Xeno_Prime_V2_85_Sources_et_Prompts.zip
```

L’archive consolidée de 346867734 octets a été récupérée et revérifiée pendant cette intégration : SHA-256 identique à la livraison, CRC valide, 136 entrées et 120 PNG. Les 120 PNG se répartissent en 91 ressources du manifeste, 25 compositions et 4 planches/aperçus. Les empreintes du petit ZIP et du ZIP Sources sont conservées depuis leur reçu de livraison vérifié le 17 septembre 2026 ; leurs octets n’ont pas été retéléchargés pendant ce raccord documentaire.

## Inventaire des familles

| Famille | Sprites livrés |
| --- | ---: |
| vegetation | 12 |
| terrain | 12 |
| ruche | 6 |
| tentacules | 10 |
| accessoires | 8 |
| personnages | 8 |
| effets | 2 |
| environnement | 7 |
| reactions | 8 |
| boss_actions | 8 |
| props_effets | 4 |
| Total sprites | **85** |
| Fonds opaques séparés | **6** |

Les sept ajouts du dernier lot sont **026, 027, 066, 077, 078, 096 et 103**. Les 78 sprites précédents appartiennent au même snapshot consolidé ; leur continuité de livraison est conservée.

## Catalogue exhaustif des 91 ressources du manifeste

Dimensions en pixels de toile. Les empreintes portent sur les PNG finaux de l’archive consolidée. Le contour `content_bbox_px`, détaillé dans le JSON, est mesuré au-dessus de 16/255 d’alpha afin d’ignorer les pixels presque invisibles. Il sert au placement illustratif et ne définit aucune collision.

| Clé documentaire | Ressource | PNG dans l’archive | Dimensions | Alpha | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `XENO-BE-001` | Calice géant | `sprites/vegetation/001_calice_geant.png` | 1254 × 1254 | RGBA 0–255 | `c7947f23a30b0992def1e847dee8c939da46f7dd94c77e2b103d9611c2b20e07` |
| `XENO-BE-002` | Calice incliné | `sprites/vegetation/002_calice_incline.png` | 1254 × 1254 | RGBA 0–255 | `41593ed45fd6f9cd5d7480ebb4375dc7ab16fed7d87bb8fb845e824dcdcd6111` |
| `XENO-BE-003` | Calices juvéniles | `sprites/vegetation/003_calices_juveniles.png` | 1254 × 1254 | RGBA 0–255 | `ec08c6532b375111b5f9944471bb581abf6980a22d03c62a5eac225c29978220` |
| `XENO-BE-004` | Tronc étranglé | `sprites/vegetation/004_tronc_etrangle.png` | 1024 × 1536 | RGBA 0–254 | `69f202e222b6a2bb9b06a580f37ef154319c250b8342e2b4658777cd24b2fcd2` |
| `XENO-BE-005` | Branche praticable | `sprites/vegetation/005_branche_praticable.png` | 1774 × 887 | RGBA 0–255 | `0f46ce8561f9f0982062844ac9f5d28fe3a1cc6f411cb5c5b6a6f34c3c387469` |
| `XENO-BE-006` | Arche de racine pétrifiée | `sprites/vegetation/006_arche_racine_petrifiee.png` | 1536 × 1024 | RGBA 0–254 | `928ced7cffa05eb8571962eea4dd2fe2457cfa6b7f45836559967f86338babda` |
| `XENO-BE-007` | Liane suspendue | `sprites/vegetation/007_liane_suspendue.png` | 1024 × 1536 | RGBA 0–254 | `0998651499dc52fc96e62e1d781388d1d3a407720214f961ff505d95b4eea058` |
| `XENO-BE-008` | Pont de membrane | `sprites/vegetation/008_pont_membrane.png` | 1983 × 793 | RGBA 0–255 | `bd7da19b9206530db058a6ec931b095106edbfce65669aee6c8fee3add694fc7` |
| `XENO-BE-009` | Poche suspendue | `sprites/vegetation/009_poche_suspendue.png` | 1024 × 1536 | RGBA 0–254 | `c588e9846a8e44d133e7c58406a62c55ab49905b70133752cc4ab68e402cceec` |
| `XENO-BE-010` | Fougères sporifères | `sprites/vegetation/010_fougeres_sporiferes.png` | 1254 × 1254 | RGBA 0–255 | `34696139f5b23b48e35e1f4ee70d32847a02c736aa27932198a1353557285178` |
| `XENO-BE-011` | Coraux fongiques | `sprites/vegetation/011_coraux_fongiques.png` | 1254 × 1254 | RGBA 0–255 | `d7aca8a460476c28ff584d8036c4775e057d3414065f922662ccd12495c7c9b4` |
| `XENO-BE-012` | Silhouette lointaine de canopée | `sprites/vegetation/012_silhouette_canopee.png` | 1254 × 1254 | RGBA 0–255 | `d4091ab16f56a3d2baa2b686984fd03a0e35dce99b68ceb05a4382b85df7290f` |
| `XENO-BE-013` | Corniche de basalte | `sprites/terrain/013_corniche_basalte.png` | 2041 × 770 | RGBA 0–255 | `f17df84d7bc99c6121378c4d15711204b3ee4f99a11507cf2fcb8abbb1df7a23` |
| `XENO-BE-014` | Pilier de basalte | `sprites/terrain/014_pilier_abri.png` | 1196 × 1315 | RGBA 0–255 | `7bc67e755c4352c393da47fd4f130de32af65ee2e2b0ff8de7dafa38baf6caf2` |
| `XENO-BE-015` | Arche de caverne | `sprites/terrain/015_arche_caverne.png` | 1671 × 941 | RGBA 0–255 | `ab6c56dabc3a516903e2ad1a0fc57f9cd8227c5771ea04f0c71af2044b17b950` |
| `XENO-BE-016` | Bloc de sol en résine | `sprites/terrain/016_bloc_sol_resine.png` | 2172 × 724 | RGBA 0–255 | `db27cea17c3d5d210ab3e039222a4a0c2ea90d850915332eca97d5c60bee5998` |
| `XENO-BE-017` | Paroi de résine | `sprites/terrain/017_paroi_resine.png` | 1034 × 1521 | RGBA 0–255 | `c477fe1d5492346db919ca7e82f2dba9a166ddfb66d17a8f6394132e03d81f93` |
| `XENO-BE-018` | Colonne de ruche | `sprites/terrain/018_colonne_ruche.png` | 1024 × 1536 | RGBA 0–254 | `eb8fb6d884e172315139f1a04e2e5e4fbdf6183ed1ca5ddd236cdc7bfaaa1a13` |
| `XENO-BE-019` | Rampe racinaire | `sprites/terrain/019_rampe_racinaire.png` | 1672 × 941 | RGBA 0–255 | `b89455ab891bdd0cc9cdb94ffebcbb770c1300222d55ec88bc52df1d8cdb5f13` |
| `XENO-BE-020` | Appui de basalte | `sprites/terrain/020_appui_basalte.png` | 1536 × 1024 | RGBA 0–254 | `59b46fd8d636c2c898afc7370a01a796e42bfb7d237488848e6b5cc9ce44b689` |
| `XENO-BE-021` | Digue de résine | `sprites/terrain/021_digue_resine.png` | 2048 × 768 | RGBA 0–254 | `1749148bd886a2a98f324fdebbca83f05af98404bcf3ec0c51551a447aa3df01` |
| `XENO-BE-022` | Paroi de faille stratifiée | `sprites/terrain/022_paroi_stratifiee.png` | 1325 × 1187 | RGBA 0–255 | `a715d2a0e03e47cd99072b4368169dbe98973d683a2eace3873381863332029c` |
| `XENO-BE-023` | Flaque d’eau ordinaire | `sprites/terrain/023_flaque_eau.png` | 1672 × 941 | RGBA 0–255 | `b856d32f0ad86b6a44d071ba40b6ccd707aeb00f7a25844bc5fdd6b76ff00b0e` |
| `XENO-BE-024` | Empreinte de couronne | `sprites/terrain/024_empreinte_couronne.png` | 1672 × 941 | RGBA 0–255 | `a1cd23e0f8739a581080ae7efea68074f589a4a9b214c4275ba4c60b4b01b473` |
| `XENO-BE-025` | Œuf fermé | `sprites/ruche/025_oeuf_ferme.png` | 1310 × 1200 | RGBA 0–255 | `939c7ecd81eefdff04863bdb81838541a521b7f5283899ad68c4a4bf3ca58a5f` |
| `XENO-BE-026` | Œuf ouvert | `sprites/ruche/026_oeuf_ouvert.png` | 1310 × 1200 | RGBA 0–255 | `8c9d4299b6687a38a7f5d847defee38150c76d7c24de955a2a3357b9c8619307` |
| `XENO-BE-027` | Cocon de proie indigène | `sprites/ruche/027_cocon_proie.png` | 954 × 1649 | RGBA 0–255 | `b9357fbc3d2aee38de6e218144db16de6d5d985dcf8e5a8700c13306c1ea34b9` |
| `XENO-BE-029` | Réservoir acide | `sprites/ruche/029_reservoir_acide.png` | 1199 × 1312 | RGBA 0–255 | `d48f7579098e558c7a375b640bd69475099b3262df302802f76329a792ce226a` |
| `XENO-BE-032` | Conduit nourricier | `sprites/ruche/032_conduit_nourricier.png` | 2172 × 724 | RGBA 0–255 | `dd061367cdc91db41e71b30efd9f031f3b59b8483af839f7f6fd6ee309040de4` |
| `XENO-BE-033` | Évent respiratoire | `sprites/ruche/033_event_respiratoire.png` | 1366 × 1152 | RGBA 0–255 | `bd21ddd96aa8f4e5ea1a58fab4cf62b941eea84c6d382ae11b13c42fad46b699` |
| `XENO-BE-037` | Tentacule en arche | `sprites/tentacules/037_tentacule_arche.png` | 1536 × 1024 | RGBA 0–255 | `b8332f912e3fd8f2a8a522fa3d5f225a9ae8c27faaff09422175d0ff4e3ade96` |
| `XENO-BE-038` | Tentacule en balayage | `sprites/tentacules/038_tentacule_balayage.png` | 1774 × 887 | RGBA 0–255 | `64d3296210a3b17057e377ee2fa6501fc1040c60bab14487fd243687c5d0e8ba` |
| `XENO-BE-039` | Tentacule perforant | `sprites/tentacules/039_tentacule_perforation.png` | 1024 × 1536 | RGBA 0–255 | `08e9381b27da07b9dc5993ed30f6997d9f053d57e2853c7d5fee39a9192f6574` |
| `XENO-BE-040` | Tentacule planté | `sprites/tentacules/040_tentacule_plante.png` | 1536 × 1024 | RGBA 0–255 | `f2144866e4e64736c3f78f3d971991bed70ab84596d8c902f33d1cb88a6383dc` |
| `XENO-BE-041` | Anse de capture | `sprites/tentacules/041_anse_capture.png` | 1536 × 1024 | RGBA 0–255 | `166afc58b99e8d0621c285a80e574656003fab5d7e54601b482ec7d341df425f` |
| `XENO-BE-042` | Tentacule sectionné | `sprites/tentacules/042_tentacule_sectionne.png` | 1536 × 1024 | RGBA 0–254 | `78328b32e3f5ad26cb227d76bd53ff23f9e6e0585e1afc339a257182fc879be5` |
| `XENO-BE-043` | Tentacule inerte en pont | `sprites/tentacules/043_tentacule_pont_inerte.png` | 1983 × 793 | RGBA 0–255 | `5e63f47611044c4d97b1ffea6d1ee983bbf4e99493fe84ac54a939ace19d3786` |
| `XENO-BE-044` | Constricteur sur pilier | `sprites/tentacules/044_constricteur_pilier.png` | 1254 × 1254 | RGBA 0–255 | `6c7f6d873bd8d051b7d45a53cb5c3b71b52512c6c83da5a6e3184885c63ba01c` |
| `XENO-BE-045` | Fouet diagonal | `sprites/tentacules/045_fouet_diagonal.png` | 1536 × 1024 | RGBA 0–255 | `817cbd0bd2863d2c361b0fa23e5fe93751c30bb30a857bea6800bafe0d42f100` |
| `XENO-BE-046` | Membrane respiratoire royale | `sprites/tentacules/046_membrane_respiratoire.png` | 1774 × 887 | RGBA 0–255 | `fc05e7f2dafe893eb3ed3df4eefb2a9e89d06fc59d605f5139502939f87c4ef6` |
| `XENO-BE-047` | Balise Yautja | `sprites/accessoires/047_balise_yautja.png` | 1254 × 1254 | RGBA 0–255 | `1bdf15488ef3ce44a56ae2a39300f84f7e20d7d60518417749f4a41d846326a7` |
| `XENO-BE-048` | Cache de chasseur | `sprites/accessoires/048_cache_chasseur.png` | 1254 × 1254 | RGBA 0–255 | `1e6bd321a0935eb8614f7be6245f1aa519cda09f20a0f18530d167ea133c2dfe` |
| `XENO-BE-049` | Perchoir abandonné | `sprites/accessoires/049_perchoir_abandonne.png` | 1536 × 1024 | RGBA 0–254 | `fa76974cba398fe4046011d0602e9e5a8a7b2e4cebceae09ca6040b99a03f16c` |
| `XENO-BE-050` | Passerelle effondrée | `sprites/accessoires/050_passerelle_tombee.png` | 1536 × 1024 | RGBA 0–254 | `750b54fd938bb9447c2ffaeee6ab0353a914d7d243a0c7110dc751471951b9ca` |
| `XENO-BE-051` | Relevé de chasse gravé | `sprites/accessoires/051_stele_chasse.png` | 1254 × 1254 | RGBA 0–255 | `d1e6c834b50629811f76865e26322a62bdefb0a7c484bbaf59f6746cb3ba6cee` |
| `XENO-BE-052` | Support de masque | `sprites/accessoires/052_support_masque.png` | 1254 × 1254 | RGBA 0–255 | `fbd42635a06fbff425c0f4e0a49893a729d9d8f344a76ff6323abd2cc8d2c966` |
| `XENO-BE-053` | Ossements de proie | `sprites/accessoires/053_ossements_proie.png` | 1254 × 1254 | RGBA 0–255 | `00559510a628532999445e50e002b682d3bc4ada15cdf3c4e9e66e3be5308e9f` |
| `XENO-BE-054` | Fragment de couronne royale | `sprites/accessoires/054_fragment_couronne.png` | 1254 × 1254 | RGBA 0–255 | `698a75b29a8f503bf4ca7de4064baeb586167391917cf0805c68a638f2d70e7d` |
| `XENO-BE-055` | Chasseur Yautja entier | `sprites/personnages/055_yautja_chasseur.png` | 1536 × 1024 | RGBA 0–254 | `6e93455d611c3182c0ac949273daff63e1cf2dde42ef004a1c353d2c268481de` |
| `XENO-BE-058` | Facehugger | `sprites/personnages/058_facehugger.png` | 1774 × 887 | RGBA 0–255 | `d15a8ea8590d3eb6e65898aeb35618c4b5e5b0744967158663cbb9277bb2552b` |
| `XENO-BE-059` | Matriarche intacte | `sprites/personnages/059_matriarche_intacte.png` | 1672 × 941 | RGBA 0–255 | `b70bbde0ababb0cc5e43f0491a279cd5b281203d1c367ff74afc37d8fca2da70` |
| `XENO-BE-060` | Matriarche préparant le souffle | `sprites/personnages/060_matriarche_souffle.png` | 1672 × 941 | RGBA 0–255 | `4e5c62210dc37c353428be87f60de7d0ed8e483b4be4064bc6872a6c2ff494a2` |
| `XENO-BE-061` | Matriarche vulnérable | `sprites/personnages/061_matriarche_vulnerable.png` | 1671 × 941 | RGBA 0–255 | `c475a3c2db7cfdf0d1d45ced154aee2018a4d2bb532dec5317039da66d9173ce` |
| `XENO-BE-062` | Matriarche après victoire | `sprites/personnages/062_matriarche_morte.png` | 1672 × 941 | RGBA 0–255 | `7e02a2f697f4915cfe8130d818c3edbc7cca23968e95f753a1bd210585afdb73` |
| `XENO-BE-063` | Bulbe nerveux royal | `sprites/personnages/063_bulbe_nerveux.png` | 1672 × 941 | RGBA 0–255 | `9ce04105aef126188a5be8b43a11f4d0164ac5391a60d29ed263bd446419e5e8` |
| `XENO-BE-064` | Masse sous la croûte | `sprites/personnages/064_masse_sous_cutanee.png` | 1672 × 941 | RGBA 0–255 | `1328fdf656b221ac1977a2d625ada8db4562b696b271a165960d1c94b9132b7d` |
| `XENO-BE-065` | Flaque acide | `sprites/effets/065_flaque_acide.png` | 1536 × 1024 | RGBA 0–254 | `2c2db259c6cedca9bfc62cabb05f9265db7996c4b41ae5410ab7031b7ef838ad` |
| `XENO-BE-066` | Globule acide | `sprites/effets/066_globule_acide.png` | 1536 × 1024 | RGBA 0–254 | `da3ee0aa82e9c3f7636b3e932197a7c696bdcdc33e376cdf51d50c13b588fdec` |
| `XENO-BE-073` | Tronc creux horizontal | `sprites/environnement/073_tronc_creux_horizontal.png` | 1942 × 809 | RGBA 0–255 | `72841fcadffc2230c6a368c4c148fb12f63de6b4a41f5b0bf6663ec20e9eb852` |
| `XENO-BE-074` | Racine échelle | `sprites/environnement/074_racine_echelle.png` | 1024 × 1536 | RGBA 0–254 | `1a743277078ad4adcf8b19debb87e7c912631e9abe486a327e9e3c48a82be708` |
| `XENO-BE-075` | Racines de premier plan | `sprites/environnement/075_racines_premier_plan.png` | 1774 × 887 | RGBA 0–255 | `483dbb6176e3a3e63bc52c36525a92ca8f8ff11c81f41ae7244a59ea5b9d0066` |
| `XENO-BE-076` | Contrefort vertical | `sprites/environnement/076_contrefort_vertical.png` | 1024 × 1536 | RGBA 0–254 | `d9b23f948f8b382c966450585f1c9e5a9766bb1475aa0ce6548877e639d0fc25` |
| `XENO-BE-077` | Passerelle déployée | `sprites/environnement/077_passerelle_deployee.png` | 1881 × 836 | RGBA 0–255 | `1677dc3b71fe05cbe7762383ff77b0347043c0e305b69b409a974845749e01f9` |
| `XENO-BE-078` | Bouchon de résine intact | `sprites/environnement/078_bouchon_resine_intact.png` | 1254 × 1254 | RGBA 0–255 | `7d9b5211026bafbf787904ee691ec132b6681c686c5f63ebcf263b4220d747d3` |
| `XENO-BE-080` | Nid fongique de plafond | `sprites/environnement/080_nid_fongique_plafond.png` | 1536 × 1024 | RGBA 0–254 | `782e7cb41d27d7ec132e9efab4dc69439c4ee89ff9176eb46f98b03b2671bf5c` |
| `XENO-BE-081` | Pont de membrane affaissé | `sprites/reactions/081_pont_membrane_affaisse.png` | 1984 × 793 | RGBA 0–255 | `720502d7b30c746721808e1fd879945527c241706d49ddeb7695bcb1fcb391b5` |
| `XENO-BE-082` | Poche contractée | `sprites/reactions/082_poche_contractee.png` | 1024 × 1536 | RGBA 0–254 | `9c486e418d8d8968e67f851c231c558ab98bd9f89e12b9bdefa9fd34373b74ff` |
| `XENO-BE-083` | Réservoir vidé | `sprites/reactions/083_reservoir_vide.png` | 1199 × 1312 | RGBA 0–255 | `34e774f7aa38dfad1000673cb5b1a6405cba9b5378f98df4d00664a93193c2b2` |
| `XENO-BE-084` | Filaments en alerte | `sprites/reactions/084_filaments_alerte.png` | 1254 × 1254 | RGBA 0–255 | `b29c174c3e16978dff1b4beabb590c31bbf0e135ac71391c909f1a2c39ced096` |
| `XENO-BE-085` | Conduit éteint | `sprites/reactions/085_conduit_eteint.png` | 2172 × 724 | RGBA 0–255 | `a977500bae6eb53d8c13c716ce706a7c4b3157ea1e0a69d917e3c928d0afdc8e` |
| `XENO-BE-086` | Évent fermé | `sprites/reactions/086_event_ferme.png` | 1366 × 1151 | RGBA 0–255 | `9d8ac92536250b31ce02456d14383d7ee763870de125fe1ba05073d317ec1fca` |
| `XENO-BE-087` | Œuf en éclosion | `sprites/reactions/087_oeuf_eclosion.png` | 1254 × 1254 | RGBA 0–255 | `73dd973cc055573571a1eb84fbc385339c8b6579452262687fb7f82a874052a7` |
| `XENO-BE-088` | Amas de coques d’œufs | `sprites/reactions/088_amas_coques_oeufs.png` | 1536 × 1024 | RGBA 0–254 | `e32fa07c498298cb67a46150445d1426034cdf9b0872e0e782250b116750f669` |
| `XENO-BE-089` | Tentacule en armement | `sprites/boss_actions/089_tentacule_armement.png` | 1774 × 887 | RGBA 0–255 | `7dc2ce6e06c932dd90ffef859d3a9999f79e3b7363ceb4f1d1878b20fc80753f` |
| `XENO-BE-090` | Tentacule à l’impact | `sprites/boss_actions/090_tentacule_impact.png` | 1024 × 1536 | RGBA 0–254 | `93adc4dca6dd869bdc633c92416bf5edf72b5e909a255e7dc5822a68613230a4` |
| `XENO-BE-091` | Anse fermée | `sprites/boss_actions/091_anse_fermee.png` | 1536 × 1024 | RGBA 0–254 | `a240db1b1d47d0233fd20c0aec554ab2d7fe81fe4c0c9f3df1488a5b1c4ad59c` |
| `XENO-BE-092` | Fouet en retrait | `sprites/boss_actions/092_fouet_retrait.png` | 1536 × 1024 | RGBA 0–254 | `7d66505b067218899e8481150cc5dec947e035bf009307d74a0afd4001e2a8a0` |
| `XENO-BE-093` | Membrane déchirée | `sprites/boss_actions/093_membrane_dechiree.png` | 1774 × 887 | RGBA 0–255 | `24c9039542c5048f346383c7398859e4c7b354c8a5dd8f35b89df44dd24fabf7` |
| `XENO-BE-094` | Matriarche en morsure | `sprites/boss_actions/094_matriarche_morsure.png` | 1672 × 941 | RGBA 0–255 | `2509ec3b504bb99c7747d0c0b3143a4ac8037a16c623ad24f2e8b7d4a5f360e4` |
| `XENO-BE-095` | Matriarche en recul | `sprites/boss_actions/095_matriarche_recul.png` | 1671 × 941 | RGBA 0–255 | `e5460ef5884192340b7f7672938d1f3c0cfed7acabc8e7e0f06c8240814f6b9d` |
| `XENO-BE-096` | Matriarche au souffle actif | `sprites/boss_actions/096_matriarche_souffle_actif.png` | 1672 × 941 | RGBA 0–255 | `88d4c861e510d390906a4e97bc90d29dae63aa6ef7bfcff2d7b235f720c8053a` |
| `XENO-BE-099` | Glyphe de repère de chasse | `sprites/props_effets/099_glyphe_repere_chasse.png` | 1254 × 1254 | RGBA 0–255 | `9aa39af8c9246fb40c24286b0d5145c14fd611c2c51ec995a7e8344ea15e1c82` |
| `XENO-BE-100` | Trophée de couronne sur socle | `sprites/props_effets/100_trophee_couronne_socle.png` | 1254 × 1254 | RGBA 0–255 | `468211d8ae6e1b826deb781ebd52f87e6a81b17add55a28bd5ca7e5c423f8b80` |
| `XENO-BE-101` | Minerai ambre | `sprites/props_effets/101_minerai_ambre.png` | 1254 × 1254 | RGBA 0–255 | `4609970f3b2b3ed9fd4f81cd54463518dc27f1b14f5fb99e98684044d7d7298b` |
| `XENO-BE-103` | Jet acide horizontal | `sprites/props_effets/103_jet_acide_horizontal.png` | 1536 × 1024 | RGBA 0–254 | `6ba4c97fa6ed8a3ef31e7269fd8587d4a5127850009c64bf8619bb0c492c08fe` |
| `XENO-BE-BG01` | Horizon du bassin | `fonds/BG01_horizon_bassin.png` | 1672 × 941 | RGB opaque | `13a49aaeba2e8b40bd358b1591d7ea51b584b74210eb98139b0a0ffbbeeeeff5` |
| `XENO-BE-BG02` | Forêt profonde | `fonds/BG02_foret_profonde.png` | 1672 × 941 | RGB opaque | `eaf6dee5a388a34e3609e4f1f2ea99719e1660b238617b2f17109e48f7566168` |
| `XENO-BE-BG03` | Canopée lointaine | `fonds/BG03_canopee_lointaine.png` | 1672 × 941 | RGB opaque | `8d8c2d344bbb1cc62b5c503e47bdcb5cbad4862664aab13b6d81125389a6e048` |
| `XENO-BE-BG04` | Faille profonde | `fonds/BG04_faille_profonde.png` | 1672 × 941 | RGB opaque | `6211a220d542c6f0c6c40b0ee28fb2c941135c9ade441710d06071a061b705b0` |
| `XENO-BE-BG05` | Galeries lointaines | `fonds/BG05_galeries_lointaines.png` | 1672 × 941 | RGB opaque | `6eb1f80ba97c791236abb7c0694181d3aa20bdf722f08cc239e3eb8bb61e0432` |
| `XENO-BE-BG06` | Bassin royal | `fonds/BG06_bassin_royal.png` | 1672 × 941 | RGB opaque | `1f0b12e50097e74269e36fc13ca4a03795008e5549e9d5f8118eb8020df513b9` |

## Douze tableaux et leurs exports

**25 PNG de composition** = 12 paires avant/après + une illustration du souffle. Il s’agit de **12 lieux distincts**, non de 25 niveaux. Les vues avant/après de 01 et 11 ont les mêmes octets, car aucun changement visuel n’y est dessiné ; les 25 fichiers correspondent donc à 23 empreintes distinctes.

| Tableau | Lieu | Toile | Avant | Après |
| --- | --- | --- | --- | --- |
| 01 | La Lisière des exuvies | 3200 × 1440 | `tableaux/01_lisiere.png` | `tableaux/01_lisiere_apres.png` |
| 02 | La Forêt des calices noirs | 3200 × 1440 | `tableaux/02_calices.png` | `tableaux/02_calices_apres.png` |
| 03 | Le Lit de la rivière morte | 3200 × 1440 | `tableaux/03_riviere.png` | `tableaux/03_riviere_apres.png` |
| 04 | Les Troncs étranglés | 2000 × 2560 | `tableaux/04_troncs.png` | `tableaux/04_troncs_apres.png` |
| 05 | La Canopée des membranes | 3200 × 1440 | `tableaux/05_canopee.png` | `tableaux/05_canopee_apres.png` |
| 06 | Le Perchoir abandonné | 3200 × 1440 | `tableaux/06_perchoir.png` | `tableaux/06_perchoir_apres.png` |
| 07 | La Faille qui respire | 2100 × 2560 | `tableaux/07_faille.png` | `tableaux/07_faille_apres.png` |
| 08 | Les Galeries sous la peau | 3200 × 1440 | `tableaux/08_galeries.png` | `tableaux/08_galeries_apres.png` |
| 09 | La Pouponnière de dérivation | 3200 × 1440 | `tableaux/09_pouponniere.png` | `tableaux/09_pouponniere_apres.png` |
| 10 | Le Nœud des racines | 3200 × 1440 | `tableaux/10_noeud.png` | `tableaux/10_noeud_apres.png` |
| 11 | La Lèvre silencieuse | 3200 × 1440 | `tableaux/11_levre.png` | `tableaux/11_levre_apres.png` |
| 12 | Le Bassin de la Matriarche | 3200 × 1440 | `tableaux/12_matriarche.png` | `tableaux/12_matriarche_apres.png` |

L’export supplémentaire est `tableaux/12_matriarche_souffle.png`. Le JSON dédié conserve la géométrie de la tête 096, celle du jet 103 et leurs points d’attache de référence. Le jet s’étend de la gueule vers la gauche ; il reste une composition fixe, sans simulation de projectile ou dégâts.

Le manifeste de scènes comprend **312 placements avant action** et les remplacements après action. Les valeurs `tableaux` des sprites sont des destinations artistiques prévues ; `composition_usage` dans le JSON distingue les placements réellement présents des seules intentions. **012, 014, 054, 066, 091 et 092** restent disponibles au catalogue sans placement dans ces compositions ni le sélecteur des poses du boss. Leur présence n’est pas une animation manquante déguisée ni un niveau supplémentaire.

## Boss, variantes et limites à conserver

La tête entière de la Matriarche apparaît **uniquement au tableau 12**. Le tableau 09 est la pouponnière avec réservoir ; aucun ancien résumé annonçant une révélation complète à cet endroit ne doit remplacer la composition source.

Les **sept poses de tête livrées** sont 059 repos, 060 préparation du souffle, 061 vulnérabilité, 062 mort, 094 morsure, 095 recul et 096 souffle actif. **097 agonie et 098 bulbe rompu sont absents.** Les toiles et silhouettes de ces poses ne forment pas un cycle d’animation aligné.

Après victoire, les appendices moteurs s’affaissent, le trophée apparaît et la végétation reste présente. Le bulbe 063 est retiré de la composition tant que 098 manque : il n’existe pas de faux sprite de bulbe rompu. Les bouchons 078 restent intacts tant que 079 n’est pas produit. Le Perchoir comporte déjà une passerelle 077 déployée raccordée à la plateforme dans sa vue après action.

056 et 057 sont des **demandes futures de nid fermé et de cocon mural fermé**, sans créature visible. Aucun PNG de ces deux objets n’existe ici, et ils ne doivent pas être comptés comme ennemis livrés. Les bestiaires déjà présents dans le jeu demeurent des chantiers distincts.

## Raccord futur au moteur

- Chercher d’abord l’asset ou le rôle déjà présent dans le registre ; conserver l’identité source et les éventuelles références du jeu. L’association entre clé documentaire et ID runtime doit être explicite.
- Fixer pivot, échelle, profondeur, ouvertures, empreinte de collision et enveloppe d’usage à partir d’une scène réelle. Les coordonnées JSON sont des pixels d’illustration, sans calibration physique ni collision validée.
- Préparer les gestes, cycles et états manquants, puis attacher les VFX à la bouche, au sol ou à l’ancrage concerné. Un PNG de jet ne prouve pas un souffle jouable.
- Vérifier chargement, occlusion, circulation, interactions, sauvegarde et budget de rendu avant de déclarer l’intégration terminée. Les contrôles de cette PR sont documentaires et techniques sur les fichiers sources.
- Faire tracer la revue artistique humaine avant toute promotion à `validated`.
