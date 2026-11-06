# Catalogue des images — planètes et communautés

Retour au [contrat de raccord](README.md). Les [données complètes](DONNEES_ASSETS.json) conservent les enregistrements des manifestes, consignes d’origine, usages proposés, identifiants, SHA-256 et contrôles des fichiers. Les [références de franchise](SOURCES_LORE.md) précisent leur portée ; la [reprise](REPRISE.md) et ses [40 consignes sources V5](REPRISE_V5.json) sont reliées aux PNG et aux consignes réellement utilisées dans [la livraison V5](LIVRAISON_V5.md).

## Livraison, référencement et usage

**246 PNG sources sont livrés : les 204 historiques V2-V4, les 40 sujets V5 et deux variantes corrigées de citerne.** La [livraison V5](LIVRAISON_V5.md) apporte 27 PNG avec alpha, dix scènes et cinq matières opaques.

Les **42 PNG produits et contrôlés sont remis dans la conversation**, dans six archives. **Nouvelles archives sauvegardées durablement : 0 sur 6.** La sauvegarde durable a échoué lors de `prepare_uploads`, avant transfert/finalisation. Pour les fichiers sans identifiant retourné, aucun lien durable n'est annoncé : **fichier remis dans la conversation ; lien durable en attente**. Les liens de session sont fournis dans la conversation et ne sont pas publiés comme adresses web dans ce dépôt.

Le relevé suivant décrit les sources historiques V2-V4 : Les 204 fichiers sont distincts par SHA-256. Ils totalisent 508 496 994 octets décompressés, avec 143 images possédant une transparence effective et 61 opaques : 41 scènes et 20 illustrations de matière.

Les 204 sources ont déjà des références dans la bibliothèque statique [V37](../../../app/game/tribeArtV37.json) et son [rapport d’import](../../tribe-art-import-v37.json). Le [raccord au dépôt](RACCORD_EXISTANT.md) et ses [données](RACCORD_EXISTANT.json) qualifient les identifiants et usages existants. Ce référencement ne prouve pas que chaque image est placée, animée, interactive ou validée artistiquement. Les dérivés WebP/PNG du catalogue ne s’ajoutent pas au compte des 204 sources ; cette annexe ne crée pas une seconde bibliothèque ni un nouvel import binaire.

| Pack | PNG sources | Avec transparence effective | Opaques | Nature de la livraison |
| --- | ---: | ---: | ---: | --- |
| V2 | 119 | 68 | 51 | 64 sujets régénérés depuis V1, 40 nouveaux sujets V2 et 15 originaux V1 récupérés |
| V3 | 45 | 45 | 0 | Trois éléments de niveau pour chacune des quinze directions planétaires |
| V4 | 40 | 30 | 10 | Quatre membres, deux objets et deux lieux pour chacune des cinq communautés |
| V5 | **40** | 25 | 15 | Dix membres, quinze objets, dix lieux et cinq matières livrés |
| Corrections V5 | **2** | 2 | 0 | Deux variantes protégées de citernes, originaux conservés |

Un fichier distinct ne crée pas un individu supplémentaire. Les vétérans, trônes, objets et refuge V1 récupérés restent des variantes de sujets déjà représentés. Les noms de fonction ne constituent pas des rangs officiels. Les **15 prompts des originaux V1 sont absents des sources** et restent nuls ; ils n’ont pas été reconstruits. Les 189 consignes connues des autres PNG et les 40 consignes sources V5 sont conservées intégralement dans les JSON. Les 42 consignes réellement utilisées le 6 novembre sont enregistrées séparément dans [LIVRAISON_V5.json](LIVRAISON_V5.json), sans reconstruction des quinze consignes V1 absentes.

Les personnages sont des illustrations statiques en pied. Les scènes sont des compositions complètes. Les images de matière ne sont ni des jeux de cartes PBR ni des raccords répétables certifiés. Les contrôles de SHA, dimensions et alpha ne remplacent pas la revue des silhouettes, de l’échelle, des institutions représentées ou de la cohérence de chaque scène : voir [Vérification](VERIFICATION.md).

## Archives sources contrôlées

Les liens ouvrent les fichiers sources conservés. Les tailles ci-dessous sont celles des ZIP ; les empreintes ont été recalculées le 5 novembre 2026. Le [rapport des archives](VERIFICATION_ARCHIVES.json) conserve les mesures sans modification. Les CRC de toutes les entrées sont valides. Les trois manifestes d’images séparés, leurs copies embarquées dans V2–V4 et celles conservées dans V5 correspondent octet pour octet.

| Pack | Archive | Taille exacte | Entrées ZIP | PNG |
| --- | --- | ---: | ---: | ---: |
| V2 | [YAUTJA_PLANETES_TRIBUS_V2_119_PNG.zip](https://chatgpt.com/library?file_id=libfile_65be4443878c81919ae5072a28331ff3&account_id=personal) | 325 670 728 octets | 126 | 119 |
| V3 | [YAUTJA_PLANETES_TRIBUS_V3_45_NOUVEAUX_PNG.zip](https://chatgpt.com/library?file_id=libfile_147af5a25cc08191b58fb6f459858b42&account_id=personal) | 93 053 810 octets | 52 | 45 |
| V4 | [YAUTJA_TRIBUS_V4_40_NOUVELLES_IMAGES.zip](https://chatgpt.com/library?file_id=libfile_36973d285c7881918b59b9c8bb57d315&account_id=personal) | 100 353 957 octets | 49 | 40 |
| V5 — préparation historique | [YAUTJA_TRIBUS_V5_PREPARATION_40_SUJETS.zip](https://chatgpt.com/library?file_id=libfile_b7488900b51081918b2e2416c698230c&account_id=personal) | 154 075 octets | 53 | 0 |

| Pack | SHA-256 du ZIP |
| --- | --- |
| V2 | `7559df362413f29769b358fbd15649cc08736c01afb0996f6064e36f8e4ed4bd` |
| V3 | `1b74f4c3948077b1a6a98903ae51f0daaa349a59d923a1967bb8e57818b04c74` |
| V4 | `5298de3424ea4b3adbcb9b6d2819076339797fd91e87acb845ea8819baca71af` |
| V5 — préparation historique | `f14d66fcf1cfab9bb85b938e9aeb2e721e197ac169fd80c938b12e6b0a178fe4` |

L’archive de préparation V5 comprend toujours ses 53 fichiers historiques : guides, inventaires, sources et prompts, sans PNG. Ses chemins `images/…` restent les sorties attendues de cette archive du 17 septembre 2026, conservée sans modification. La [livraison du 6 novembre](LIVRAISON_V5.md) fournit désormais les 40 PNG correspondants et deux variantes corrigées dans de nouvelles archives. Le quota de septembre décrit uniquement la passe historique.

## Quinze directions planétaires — 90 PNG

Chaque direction possède six fichiers : chasseur, paysage et matière V2 ; élément naturel, passage et objet V3. Les noms de production restent conservés tels quels ; leur correspondance avec les destinations et identifiants du jeu est définie dans [Planètes et concordance](PLANETES.md). Aucun `PLANxx`, accès ou mission supplémentaire ne découle de ce tableau.

Les chemins ci-dessous désignent les membres internes de l’archive indiquée, pas des liens vers des fichiers PNG de cette annexe. Toutes les résolutions sont notées largeur × hauteur, en pixels, sans redimensionnement des sources.

### Mycora-Nox — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_mycora_nox_v2` | Chasseur — Mycora-Nox | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_MYCORA_NOX_V2.png` |
| `decor_mycora_nox_v2` | Paysage — Mycora-Nox | V2 | 1536 × 1024 | Paysage | `images/planet_environments/DECOR_MYCORA_NOX_V2.png` |
| `texture_mycora_nox_v2` | Matière — Mycora-Nox | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_MYCORA_NOX_V2.png` |
| `nature_mycora_nox_v3` | Souche aux mycéliums lumineux | V3 | 1536 × 1024 | Élément naturel | `images/nature/NATURE_MYCORA_NOX_V3.png` |
| `passages_mycora_nox_v3` | Pont de racines tressées | V3 | 1774 × 887 | Passage / structure | `images/passages/PASSAGES_MYCORA_NOX_V3.png` |
| `objets_mycora_nox_v3` | Collecteur de spores | V3 | 1224 × 1285 | Objet | `images/objets/OBJETS_MYCORA_NOX_V3.png` |

### Serekh-9 — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_serekh_9_v2` | Chasseur — Serekh-9 | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_SEREKH_9_V2.png` |
| `decor_serekh_9_v2` | Paysage — Serekh-9 | V2 | 1774 × 887 | Paysage | `images/planet_environments/DECOR_SEREKH_9_V2.png` |
| `texture_serekh_9_v2` | Matière — Serekh-9 | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_SEREKH_9_V2.png` |
| `nature_serekh_9_v3` | Éperons de verre désertique | V3 | 1226 × 1283 | Élément naturel | `images/nature/NATURE_SEREKH_9_V3.png` |
| `passages_serekh_9_v3` | Arche de caravane vitrifiée | V3 | 1404 × 1120 | Passage / structure | `images/passages/PASSAGES_SEREKH_9_V3.png` |
| `objets_serekh_9_v3` | Résonateur éolien des dunes | V3 | 1145 × 1374 | Objet | `images/objets/OBJETS_SEREKH_9_V3.png` |

### Ferrum-6 — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_ferrum_6_v2` | Chasseur — Ferrum-6 | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_FERRUM_6_V2.png` |
| `decor_ferrum_6_v2` | Paysage — Ferrum-6 | V2 | 1774 × 887 | Paysage | `images/planet_environments/DECOR_FERRUM_6_V2.png` |
| `texture_ferrum_6_v2` | Matière — Ferrum-6 | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_FERRUM_6_V2.png` |
| `nature_ferrum_6_v3` | Concrétion de fer et de sel | V3 | 1536 × 1024 | Élément naturel | `images/nature/NATURE_FERRUM_6_V3.png` |
| `passages_ferrum_6_v3` | Rampe de la carrière | V3 | 1774 × 887 | Passage / structure | `images/passages/PASSAGES_FERRUM_6_V3.png` |
| `objets_ferrum_6_v3` | Broyeur de minerai compact | V3 | 1536 × 1024 | Objet | `images/objets/OBJETS_FERRUM_6_V3.png` |

### Nivalis-C — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_nivalis_c_v2` | Chasseur — Nivalis-C | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_NIVALIS_C_V2.png` |
| `decor_nivalis_c_v2` | Paysage — Nivalis-C | V2 | 1942 × 809 | Paysage | `images/planet_environments/DECOR_NIVALIS_C_V2.png` |
| `texture_nivalis_c_v2` | Matière — Nivalis-C | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_NIVALIS_C_V2.png` |
| `nature_nivalis_c_v3` | Buisson de mousse carmin | V3 | 1536 × 1024 | Élément naturel | `images/nature/NATURE_NIVALIS_C_V3.png` |
| `passages_nivalis_c_v3` | Ponceau de moraine | V3 | 1774 × 887 | Passage / structure | `images/passages/PASSAGES_NIVALIS_C_V3.png` |
| `objets_nivalis_c_v3` | Station météo de la toundra | V3 | 1024 × 1536 | Objet | `images/objets/OBJETS_NIVALIS_C_V3.png` |

### Nivalis-K — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_nivalis_k_v2` | Chasseur — Nivalis-K | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_NIVALIS_K_V2.png` |
| `decor_nivalis_k_v2` | Paysage — Nivalis-K | V2 | 1942 × 809 | Paysage | `images/planet_environments/DECOR_NIVALIS_K_V2.png` |
| `texture_nivalis_k_v2` | Matière — Nivalis-K | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_NIVALIS_K_V2.png` |
| `nature_nivalis_k_v3` | Bloc de glace stratifié | V3 | 1536 × 1024 | Élément naturel | `images/nature/NATURE_NIVALIS_K_V3.png` |
| `passages_nivalis_k_v3` | Passerelle de crevasse | V3 | 1942 × 809 | Passage / structure | `images/passages/PASSAGES_NIVALIS_K_V3.png` |
| `objets_nivalis_k_v3` | Carotteuse polaire | V3 | 1145 × 1374 | Objet | `images/objets/OBJETS_NIVALIS_K_V3.png` |

### Kaail-Prime — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_kaail_prime_v2` | Chasseur — Kaail-Prime | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_KAAIL_PRIME_V2.png` |
| `decor_kaail_prime_v2` | Paysage — Kaail-Prime | V2 | 1942 × 809 | Paysage | `images/planet_environments/DECOR_KAAIL_PRIME_V2.png` |
| `texture_kaail_prime_v2` | Matière — Kaail-Prime | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_KAAIL_PRIME_V2.png` |
| `nature_kaail_prime_v3` | Arbre parasol de savane | V3 | 1247 × 1261 | Élément naturel | `images/nature/NATURE_KAAIL_PRIME_V3.png` |
| `passages_kaail_prime_v3` | Belvédère des migrations | V3 | 1536 × 1024 | Passage / structure | `images/passages/PASSAGES_KAAIL_PRIME_V3.png` |
| `objets_kaail_prime_v3` | Borne des pistes migratoires | V3 | 1024 × 1536 | Objet | `images/objets/OBJETS_KAAIL_PRIME_V3.png` |

### Eryndor-V — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_eryndor_v_v2` | Chasseur — Eryndor-V | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_ERYNDOR_V_V2.png` |
| `decor_eryndor_v_v2` | Paysage — Eryndor-V | V2 | 1672 × 941 | Paysage | `images/planet_environments/DECOR_ERYNDOR_V_V2.png` |
| `texture_eryndor_v_v2` | Matière — Eryndor-V | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_ERYNDOR_V_V2.png` |
| `nature_eryndor_v_v3` | Fougères des dolines | V3 | 1536 × 1024 | Élément naturel | `images/nature/NATURE_ERYNDOR_V_V3.png` |
| `passages_eryndor_v_v3` | Entrée de crypte calcaire | V3 | 1536 × 1024 | Passage / structure | `images/passages/PASSAGES_ERYNDOR_V_V3.png` |
| `objets_eryndor_v_v3` | Cloche de veille forestière | V3 | 1224 × 1285 | Objet | `images/objets/OBJETS_ERYNDOR_V_V3.png` |

### Oseris-IV — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_oseris_iv_v2` | Chasseur — Oseris-IV | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_OSERIS_IV_V2.png` |
| `decor_oseris_iv_v2` | Paysage — Oseris-IV | V2 | 1942 × 809 | Paysage | `images/planet_environments/DECOR_OSERIS_IV_V2.png` |
| `texture_oseris_iv_v2` | Matière — Oseris-IV | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_OSERIS_IV_V2.png` |
| `nature_oseris_iv_v3` | Broméliacée géante | V3 | 1213 × 1296 | Élément naturel | `images/nature/NATURE_OSERIS_IV_V3.png` |
| `passages_oseris_iv_v3` | Palier de la canopée | V3 | 1536 × 1024 | Passage / structure | `images/passages/PASSAGES_OSERIS_IV_V3.png` |
| `objets_oseris_iv_v3` | Treuil de lianes | V3 | 1536 × 1024 | Objet | `images/objets/OBJETS_OSERIS_IV_V3.png` |

### Sequoia-IX — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_sequoia_ix_v2` | Chasseur — Sequoia-IX | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_SEQUOIA_IX_V2.png` |
| `decor_sequoia_ix_v2` | Paysage — Sequoia-IX | V2 | 1774 × 887 | Paysage | `images/planet_environments/DECOR_SEQUOIA_IX_V2.png` |
| `texture_sequoia_ix_v2` | Matière — Sequoia-IX | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_SEQUOIA_IX_V2.png` |
| `nature_sequoia_ix_v3` | Vieille souche à polypores | V3 | 1536 × 1024 | Élément naturel | `images/nature/NATURE_SEQUOIA_IX_V3.png` |
| `passages_sequoia_ix_v3` | Monte-charge de la scierie | V3 | 1536 × 1024 | Passage / structure | `images/passages/PASSAGES_SEQUOIA_IX_V3.png` |
| `objets_sequoia_ix_v3` | Tendeur des câbles forestiers | V3 | 1536 × 1024 | Objet | `images/objets/OBJETS_SEQUOIA_IX_V3.png` |

### Umbra-Terminus — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_umbra_terminus_v2` | Chasseur — Umbra-Terminus | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_UMBRA_TERMINUS_V2.png` |
| `decor_umbra_terminus_v2` | Paysage — Umbra-Terminus | V2 | 1881 × 836 | Paysage | `images/planet_environments/DECOR_UMBRA_TERMINUS_V2.png` |
| `texture_umbra_terminus_v2` | Matière — Umbra-Terminus | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_UMBRA_TERMINUS_V2.png` |
| `nature_umbra_terminus_v3` | Arbuste à feuilles de cuivre | V3 | 1218 × 1291 | Élément naturel | `images/nature/NATURE_UMBRA_TERMINUS_V3.png` |
| `passages_umbra_terminus_v3` | Abri à volets thermiques | V3 | 1536 × 1024 | Passage / structure | `images/passages/PASSAGES_UMBRA_TERMINUS_V3.png` |
| `objets_umbra_terminus_v3` | Héliostat de frontière | V3 | 1145 × 1374 | Objet | `images/objets/OBJETS_UMBRA_TERMINUS_V3.png` |

### Khar-Sul — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_khar_sul_v2` | Chasseur — Khar-Sul | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_KHAR_SUL_V2.png` |
| `decor_khar_sul_v2` | Paysage — Khar-Sul | V2 | 1774 × 887 | Paysage | `images/planet_environments/DECOR_KHAR_SUL_V2.png` |
| `texture_khar_sul_v2` | Matière — Khar-Sul | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_KHAR_SUL_V2.png` |
| `nature_khar_sul_v3` | Rocher à lichens d’altitude | V3 | 1536 × 1024 | Élément naturel | `images/nature/NATURE_KHAR_SUL_V3.png` |
| `passages_khar_sul_v3` | Ancrage du sentier suspendu | V3 | 1536 × 1024 | Passage / structure | `images/passages/PASSAGES_KHAR_SUL_V3.png` |
| `objets_khar_sul_v3` | Avertisseur de vent des cimes | V3 | 1024 × 1536 | Objet | `images/objets/OBJETS_KHAR_SUL_V3.png` |

### Cinder-12 — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_cinder_12_v2` | Chasseur — Cinder-12 | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_CINDER_12_V2.png` |
| `decor_cinder_12_v2` | Paysage — Cinder-12 | V2 | 1942 × 809 | Paysage | `images/planet_environments/DECOR_CINDER_12_V2.png` |
| `texture_cinder_12_v2` | Matière — Cinder-12 | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_CINDER_12_V2.png` |
| `nature_cinder_12_v3` | Cheminée de basalte refroidi | V3 | 1374 × 1145 | Élément naturel | `images/nature/NATURE_CINDER_12_V3.png` |
| `passages_cinder_12_v3` | Pont aux écrans thermiques | V3 | 1774 × 887 | Passage / structure | `images/passages/PASSAGES_CINDER_12_V3.png` |
| `objets_cinder_12_v3` | Creuset de transport fermé | V3 | 1225 × 1284 | Objet | `images/objets/OBJETS_CINDER_12_V3.png` |

### Pelagos-M — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_pelagos_m_v2` | Chasseur — Pelagos-M | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_PELAGOS_M_V2.png` |
| `decor_pelagos_m_v2` | Paysage — Pelagos-M | V2 | 1903 × 826 | Paysage | `images/planet_environments/DECOR_PELAGOS_M_V2.png` |
| `texture_pelagos_m_v2` | Matière — Pelagos-M | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_PELAGOS_M_V2.png` |
| `nature_pelagos_m_v3` | Corail des arches océaniques | V3 | 1223 × 1286 | Élément naturel | `images/nature/NATURE_PELAGOS_M_V3.png` |
| `passages_pelagos_m_v3` | Sas de plongée littoral | V3 | 1377 × 1142 | Passage / structure | `images/passages/PASSAGES_PELAGOS_M_V3.png` |
| `objets_pelagos_m_v3` | Échantillonneur abyssal | V3 | 1145 × 1374 | Objet | `images/objets/OBJETS_PELAGOS_M_V3.png` |

### Xeno Prime — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_xeno_prime_v2` | Chasseur — Xeno Prime | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_XENO_PRIME_V2.png` |
| `decor_xeno_prime_v2` | Paysage — Xeno Prime | V2 | 1672 × 941 | Paysage | `images/planet_environments/DECOR_XENO_PRIME_V2.png` |
| `texture_xeno_prime_v2` | Matière — Xeno Prime | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_XENO_PRIME_V2.png` |
| `nature_xeno_prime_v3` | Évent de résine côtelée | V3 | 1536 × 1024 | Élément naturel | `images/nature/NATURE_XENO_PRIME_V3.png` |
| `passages_xeno_prime_v3` | Arche de couloir assimilée | V3 | 1536 × 1024 | Passage / structure | `images/passages/PASSAGES_XENO_PRIME_V3.png` |
| `objets_xeno_prime_v3` | Enregistreur pris dans la résine | V3 | 1536 × 1024 | Objet | `images/objets/OBJETS_XENO_PRIME_V3.png` |

### Vardos-III — 6 PNG

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `personnage_vardos_iii_v2` | Chasseur — Vardos-III | V2 | 1024 × 1536 | Chasseur | `images/planet_characters/PERSONNAGE_VARDOS_III_V2.png` |
| `decor_vardos_iii_v2` | Paysage — Vardos-III | V2 | 1774 × 887 | Paysage | `images/planet_environments/DECOR_VARDOS_III_V2.png` |
| `texture_vardos_iii_v2` | Matière — Vardos-III | V2 | 1254 × 1254 | Matière | `images/materials/TEXTURE_VARDOS_III_V2.png` |
| `nature_vardos_iii_v3` | Arbre des jardins suspendus | V3 | 1211 × 1299 | Élément naturel | `images/nature/NATURE_VARDOS_III_V3.png` |
| `passages_vardos_iii_v3` | Accès technique du métro aérien | V3 | 1536 × 1024 | Passage / structure | `images/passages/PASSAGES_VARDOS_III_V3.png` |
| `objets_vardos_iii_v3` | Consigne de livraison blindée | V3 | 1024 × 1536 | Objet | `images/objets/OBJETS_VARDOS_III_V3.png` |

## Cinq communautés — 156 PNG sources, dont 114 historiques V2-V4

Les tableaux détaillés ci-dessous conservent les 114 fichiers V2 et V4 des cinq communautés : membres, lieux, trônes, équipements, végétation, faune, automate et matières. Les 42 nouvelles sorties sont détaillées dans [LIVRAISON_V5.md](LIVRAISON_V5.md). Le tableau de synthèse inclut toutes les sources livrées. Les [fiches de communautés](TRIBUS.md) règlent leurs relations, l’architecture et les services. Leur présence dans un inventaire ne recrute aucun habitant, ne valide aucun rang et ne donne aucun droit à bord d’un vaisseau.

| Communauté | Clé source | V2 | V4 | Sujets V5 livrés | Citernes corrigées | Total livré |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Peuple des Citernes | `DESERT` | 15 | 8 | 8 | 2 | 33 |
| Terrasses des Hautes Branches | `FOREST` | 15 | 8 | 8 | 0 | 31 |
| Cour des Forges Basses | `SLUMS` | 15 | 8 | 8 | 0 | 31 |
| Forges de la Caldeira | `LAVA` | 15 | 8 | 8 | 0 | 31 |
| Refuge des Veilleurs | `DARKJUNGLE` | 14 | 8 | 8 | 0 | 30 |

### Peuple des Citernes — 23 PNG historiques V2-V4

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `elite_desert_v2` | Membre vétéran — Peuple des Citernes | V2 | 1024 × 1536 | Vétéran / variante | `images/homeworld_characters/ELITE_DESERT_V2.png` |
| `pnj_desert_hydrologue_v2` | Hydrologue des Citernes | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_DESERT_HYDROLOGUE_V2.png` |
| `pnj_desert_intendante_v2` | Intendante des caravanes | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_DESERT_INTENDANTE_V2.png` |
| `homeworld_desert_v2` | Lieu de vie — Peuple des Citernes | V2 | 1942 × 809 | Cité / refuge | `images/homeworld_scenes/HOMEWORLD_DESERT_V2.png` |
| `salle_trone_desert_v2` | Salle du trône — Peuple des Citernes | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/SALLE_TRONE_DESERT_V2.png` |
| `interieur_desert_v2` | Intérieur — Peuple des Citernes | V2 | 1942 × 809 | Intérieur | `images/homeworld_scenes/INTERIEUR_DESERT_V2.png` |
| `trone_desert_v2` | Trône — Peuple des Citernes | V2 | 1024 × 1536 | Trône | `images/objects/TRONE_DESERT_V2.png` |
| `prop_desert_nouveau_v2` | Équipement — Peuple des Citernes | V2 | 1374 × 1145 | Objet | `images/objects/PROP_DESERT_NOUVEAU_V2.png` |
| `faune_desert_v2` | Faune ou automate — Peuple des Citernes | V2 | 1374 × 1145 | Faune / automate | `images/objects/FAUNE_DESERT_V2.png` |
| `flore_desert_v2` | Végétation — Peuple des Citernes | V2 | 1024 × 1536 | Végétation | `images/flora/FLORE_DESERT_V2.png` |
| `matiere_tribu_desert_v2` | Matière de tribu — Peuple des Citernes | V2 | 1254 × 1254 | Matière communautaire | `images/materials/MATIERE_TRIBU_DESERT_V2.png` |
| `prop_desert_origine_v2` | Citerne communautaire | V2 | 1024 × 1536 | Objet | `images/objects/PROP_DESERT_ORIGINE_V2.png` |
| `original_citerne_desert_v1` | Citerne sanctuaire du désert Yautja | V2 | 1024 × 1536 | Objet | `images/originaux_recuperes/ORIGINAL_CITERNE_DESERT_V1.png` |
| `original_elite_desert_v1` | Gardien Yautja des citernes | V2 | 1024 × 1536 | Vétéran / variante | `images/originaux_recuperes/ORIGINAL_ELITE_DESERT_V1.png` |
| `original_trone_desert_v1` | Trône-citerne du peuple des citernes | V2 | 1024 × 1536 | Trône | `images/originaux_recuperes/ORIGINAL_TRONE_DESERT_V1.png` |
| `personnages_desert_doyenne_v4` | Doyenne des Pactes | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_DESERT_DOYENNE_V4.png` |
| `personnages_desert_sentinelle_v4` | Sentinelle des Réservoirs | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_DESERT_SENTINELLE_V4.png` |
| `personnages_desert_pisteur_v4` | Pisteur des Vents de sable | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_DESERT_PISTEUR_V4.png` |
| `personnages_desert_instructrice_v4` | Instructrice du Premier Cercle | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_DESERT_INSTRUCTRICE_V4.png` |
| `objets_desert_table_v4` | Table des engagements | V4 | 1536 × 1024 | Objet | `images/objets/OBJET_DESERT_TABLE_V4.png` |
| `objets_desert_ratelier_v4` | Râtelier des lances de route | V4 | 1145 × 1374 | Objet | `images/objets/OBJET_DESERT_RATELIER_V4.png` |
| `lieux_desert_cour_v4` | Cour des départs | V4 | 1672 × 941 | Lieu | `images/lieux/LIEU_DESERT_COUR_V4.png` |
| `lieux_desert_maison_v4` | Maison des Pactes | V4 | 1536 × 1024 | Lieu | `images/lieux/LIEU_DESERT_MAISON_V4.png` |

### Terrasses des Hautes Branches — 23 PNG historiques V2-V4

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `elite_forest_v2` | Membre vétéran — Terrasses des Hautes Branches | V2 | 1024 × 1536 | Vétéran / variante | `images/homeworld_characters/ELITE_FOREST_V2.png` |
| `pnj_forest_batieur_v2` | Bâtisseur des canaux | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_FOREST_BATIEUR_V2.png` |
| `pnj_forest_archiviste_v2` | Archiviste des Hautes Branches | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_FOREST_ARCHIVISTE_V2.png` |
| `homeworld_forest_v2` | Lieu de vie — Terrasses des Hautes Branches | V2 | 1942 × 809 | Cité / refuge | `images/homeworld_scenes/HOMEWORLD_FOREST_V2.png` |
| `salle_trone_forest_v2` | Salle du trône — Terrasses des Hautes Branches | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/SALLE_TRONE_FOREST_V2.png` |
| `interieur_forest_v2` | Intérieur — Terrasses des Hautes Branches | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/INTERIEUR_FOREST_V2.png` |
| `trone_forest_v2` | Trône — Terrasses des Hautes Branches | V2 | 1024 × 1536 | Trône | `images/objects/TRONE_FOREST_V2.png` |
| `prop_forest_nouveau_v2` | Équipement — Terrasses des Hautes Branches | V2 | 1145 × 1374 | Objet | `images/objects/PROP_FOREST_NOUVEAU_V2.png` |
| `faune_forest_v2` | Faune ou automate — Terrasses des Hautes Branches | V2 | 1536 × 1024 | Faune / automate | `images/objects/FAUNE_FOREST_V2.png` |
| `flore_forest_v2` | Végétation — Terrasses des Hautes Branches | V2 | 1182 × 1330 | Végétation | `images/flora/FLORE_FOREST_V2.png` |
| `matiere_tribu_forest_v2` | Matière de tribu — Terrasses des Hautes Branches | V2 | 1254 × 1254 | Matière communautaire | `images/materials/MATIERE_TRIBU_FOREST_V2.png` |
| `prop_forest_origine_v2` | Porte et canal suspendu | V2 | 1024 × 1536 | Objet | `images/objects/PROP_FOREST_ORIGINE_V2.png` |
| `original_porte_forest_v1` | Porte monumentale Yautja en pierre | V2 | 1024 × 1536 | Objet | `images/originaux_recuperes/ORIGINAL_PORTE_FOREST_V1.png` |
| `original_elite_forest_v1` | Vétéran Yautja des Hautes Terrasses | V2 | 1024 × 1536 | Vétéran / variante | `images/originaux_recuperes/ORIGINAL_ELITE_FOREST_V1.png` |
| `original_trone_forest_v1` | Trône ancestral du clan Yautja | V2 | 1024 × 1536 | Trône | `images/originaux_recuperes/ORIGINAL_TRONE_FOREST_V1.png` |
| `personnages_forest_gardien_v4` | Gardien des Mémoires | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_FOREST_GARDIEN_V4.png` |
| `personnages_forest_traqueuse_v4` | Traqueuse de Canopée | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_FOREST_TRAQUEUSE_V4.png` |
| `personnages_forest_maitre_v4` | Maître des Duels | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_FOREST_MAITRE_V4.png` |
| `personnages_forest_garde_v4` | Garde des Aqueducs | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_FOREST_GARDE_V4.png` |
| `objets_forest_stele_v4` | Stèle des lignées | V4 | 1024 × 1536 | Objet | `images/objets/OBJET_FOREST_STELE_V4.png` |
| `objets_forest_masques_v4` | Support des masques de chasse | V4 | 1536 × 1024 | Objet | `images/objets/OBJET_FOREST_MASQUES_V4.png` |
| `lieux_forest_epreuves_v4` | Cour des Épreuves | V4 | 1536 × 1024 | Lieu | `images/lieux/LIEU_FOREST_EPREUVES_V4.png` |
| `lieux_forest_galerie_v4` | Galerie des Lignées | V4 | 1536 × 1024 | Lieu | `images/lieux/LIEU_FOREST_GALERIE_V4.png` |

### Cour des Forges Basses — 23 PNG historiques V2-V4

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `elite_slums_v2` | Membre vétéran — Cour des Forges Basses | V2 | 1024 × 1536 | Vétéran / variante | `images/homeworld_characters/ELITE_SLUMS_V2.png` |
| `pnj_slums_mecanicienne_v2` | Mécanicienne des passerelles | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_SLUMS_MECANICIENNE_V2.png` |
| `pnj_slums_negociant_v2` | Négociant des pièces retrouvées | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_SLUMS_NEGOCIANT_V2.png` |
| `homeworld_slums_v2` | Lieu de vie — Cour des Forges Basses | V2 | 1774 × 887 | Cité / refuge | `images/homeworld_scenes/HOMEWORLD_SLUMS_V2.png` |
| `salle_trone_slums_v2` | Salle du trône — Cour des Forges Basses | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/SALLE_TRONE_SLUMS_V2.png` |
| `interieur_slums_v2` | Intérieur — Cour des Forges Basses | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/INTERIEUR_SLUMS_V2.png` |
| `trone_slums_v2` | Trône — Cour des Forges Basses | V2 | 1024 × 1536 | Trône | `images/objects/TRONE_SLUMS_V2.png` |
| `prop_slums_nouveau_v2` | Équipement — Cour des Forges Basses | V2 | 1145 × 1374 | Objet | `images/objects/PROP_SLUMS_NOUVEAU_V2.png` |
| `faune_slums_v2` | Faune ou automate — Cour des Forges Basses | V2 | 1241 × 1268 | Faune / automate | `images/objects/FAUNE_SLUMS_V2.png` |
| `flore_slums_v2` | Végétation — Cour des Forges Basses | V2 | 1145 × 1374 | Végétation | `images/flora/FLORE_SLUMS_V2.png` |
| `matiere_tribu_slums_v2` | Matière de tribu — Cour des Forges Basses | V2 | 1254 × 1254 | Matière communautaire | `images/materials/MATIERE_TRIBU_SLUMS_V2.png` |
| `prop_slums_origine_v2` | Établi de forge | V2 | 1024 × 1536 | Objet | `images/objects/PROP_SLUMS_ORIGINE_V2.png` |
| `original_forge_slums_v1` | Établi de forge yautja en acier | V2 | 1145 × 1374 | Objet | `images/originaux_recuperes/ORIGINAL_FORGE_SLUMS_V1.png` |
| `original_elite_slums_v1` | Vétéran Yautja, maître forgeron en armure | V2 | 1024 × 1536 | Vétéran / variante | `images/originaux_recuperes/ORIGINAL_ELITE_SLUMS_V1.png` |
| `original_trone_slums_v1` | Trône Yautja des basses forges | V2 | 1024 × 1536 | Trône | `images/originaux_recuperes/ORIGINAL_TRONE_SLUMS_V1.png` |
| `personnages_slums_doyen_v4` | Doyen des Assemblages | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_SLUMS_DOYEN_V4.png` |
| `personnages_slums_gardienne_v4` | Gardienne des Contrats | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_SLUMS_GARDIENNE_V4.png` |
| `personnages_slums_armurier_v4` | Armurier des Gantelets | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_SLUMS_ARMURIER_V4.png` |
| `personnages_slums_eclaireur_v4` | Éclaireur des Toits | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_SLUMS_ECLAIREUR_V4.png` |
| `objets_slums_coffre_v4` | Coffre des contrats scellés | V4 | 1374 × 1145 | Objet | `images/objets/OBJET_SLUMS_COFFRE_V4.png` |
| `objets_slums_troc_v4` | Table de troc | V4 | 1536 × 1024 | Objet | `images/objets/OBJET_SLUMS_TROC_V4.png` |
| `lieux_slums_place_v4` | Place du Troc | V4 | 1672 × 941 | Lieu | `images/lieux/LIEU_SLUMS_PLACE_V4.png` |
| `lieux_slums_armements_v4` | Salle des Armements | V4 | 1536 × 1024 | Lieu | `images/lieux/LIEU_SLUMS_ARMEMENTS_V4.png` |

### Forges de la Caldeira — 23 PNG historiques V2-V4

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `elite_lava_v2` | Membre vétéran — Forges de la Caldeira | V2 | 1024 × 1536 | Vétéran / variante | `images/homeworld_characters/ELITE_LAVA_V2.png` |
| `pnj_lava_fondeur_v2` | Fondeur de la Caldeira | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_LAVA_FONDEUR_V2.png` |
| `pnj_lava_medecin_v2` | Soigneuse des Forges | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_LAVA_MEDECIN_V2.png` |
| `homeworld_lava_v2` | Lieu de vie — Forges de la Caldeira | V2 | 1774 × 887 | Cité / refuge | `images/homeworld_scenes/HOMEWORLD_LAVA_V2.png` |
| `salle_trone_lava_v2` | Salle du trône — Forges de la Caldeira | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/SALLE_TRONE_LAVA_V2.png` |
| `interieur_lava_v2` | Intérieur — Forges de la Caldeira | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/INTERIEUR_LAVA_V2.png` |
| `trone_lava_v2` | Trône — Forges de la Caldeira | V2 | 1024 × 1536 | Trône | `images/objects/TRONE_LAVA_V2.png` |
| `prop_lava_nouveau_v2` | Équipement — Forges de la Caldeira | V2 | 1312 × 1199 | Objet | `images/objects/PROP_LAVA_NOUVEAU_V2.png` |
| `faune_lava_v2` | Faune ou automate — Forges de la Caldeira | V2 | 1536 × 1024 | Faune / automate | `images/objects/FAUNE_LAVA_V2.png` |
| `flore_lava_v2` | Végétation — Forges de la Caldeira | V2 | 1312 × 1199 | Végétation | `images/flora/FLORE_LAVA_V2.png` |
| `matiere_tribu_lava_v2` | Matière de tribu — Forges de la Caldeira | V2 | 1254 × 1254 | Matière communautaire | `images/materials/MATIERE_TRIBU_LAVA_V2.png` |
| `prop_lava_origine_v2` | Porte fortifiée | V2 | 1024 × 1536 | Objet | `images/objects/PROP_LAVA_ORIGINE_V2.png` |
| `original_porte_lava_v1` | Porte fortifiée du bastion Yautja | V2 | 1024 × 1536 | Objet | `images/originaux_recuperes/ORIGINAL_PORTE_LAVA_V1.png` |
| `original_elite_lava_v1` | Vétéran Yautja en armure basaltique | V2 | 1024 × 1536 | Vétéran / variante | `images/originaux_recuperes/ORIGINAL_ELITE_LAVA_V1.png` |
| `original_trone_lava_v1` | Trône Yautja des Forges de la Caldeira | V2 | 1024 × 1536 | Trône | `images/originaux_recuperes/ORIGINAL_TRONE_LAVA_V1.png` |
| `personnages_lava_ancienne_v4` | Ancienne des Scories | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_LAVA_ANCIENNE_V4.png` |
| `personnages_lava_gardien_v4` | Gardien des Ponts Chauds | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_LAVA_GARDIEN_V4.png` |
| `personnages_lava_traqueuse_v4` | Traqueuse des Cendres | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_LAVA_TRAQUEUSE_V4.png` |
| `personnages_lava_maitre_v4` | Maître des Épreuves | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_LAVA_MAITRE_V4.png` |
| `objets_lava_enclume_v4` | Enclume des marques | V4 | 1374 × 1145 | Objet | `images/objets/OBJET_LAVA_ENCLUME_V4.png` |
| `objets_lava_ratelier_v4` | Râtelier refroidi des armures | V4 | 1145 × 1374 | Objet | `images/objets/OBJET_LAVA_RATELIER_V4.png` |
| `lieux_lava_terrasse_v4` | Terrasse des Épreuves | V4 | 1536 × 1024 | Lieu | `images/lieux/LIEU_LAVA_TERRASSE_V4.png` |
| `lieux_lava_refectoire_v4` | Réfectoire des Forges | V4 | 1536 × 1024 | Lieu | `images/lieux/LIEU_LAVA_REFECTOIRE_V4.png` |

### Refuge des Veilleurs — 22 PNG historiques V2-V4

| ID source | Sujet | Pack | Pixels | Type | Chemin dans l’archive |
| --- | --- | --- | --- | --- | --- |
| `elite_darkjungle_v2` | Membre vétéran — Refuge des Veilleurs | V2 | 1024 × 1536 | Vétéran / variante | `images/homeworld_characters/ELITE_DARKJUNGLE_V2.png` |
| `pnj_darkjungle_botaniste_v2` | Botaniste des Veilleurs | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_DARKJUNGLE_BOTANISTE_V2.png` |
| `pnj_darkjungle_guide_v2` | Guide des racines profondes | V2 | 1024 × 1536 | Habitant | `images/homeworld_characters/PNJ_DARKJUNGLE_GUIDE_V2.png` |
| `homeworld_darkjungle_v2` | Lieu de vie — Refuge des Veilleurs | V2 | 1672 × 941 | Cité / refuge | `images/homeworld_scenes/HOMEWORLD_DARKJUNGLE_V2.png` |
| `salle_trone_darkjungle_v2` | Salle du trône — Refuge des Veilleurs | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/SALLE_TRONE_DARKJUNGLE_V2.png` |
| `interieur_darkjungle_v2` | Intérieur — Refuge des Veilleurs | V2 | 1774 × 887 | Intérieur | `images/homeworld_scenes/INTERIEUR_DARKJUNGLE_V2.png` |
| `trone_darkjungle_v2` | Trône — Refuge des Veilleurs | V2 | 1024 × 1536 | Trône | `images/objects/TRONE_DARKJUNGLE_V2.png` |
| `prop_darkjungle_nouveau_v2` | Équipement — Refuge des Veilleurs | V2 | 1145 × 1374 | Objet | `images/objects/PROP_DARKJUNGLE_NOUVEAU_V2.png` |
| `faune_darkjungle_v2` | Faune ou automate — Refuge des Veilleurs | V2 | 1536 × 1024 | Faune / automate | `images/objects/FAUNE_DARKJUNGLE_V2.png` |
| `flore_darkjungle_v2` | Végétation — Refuge des Veilleurs | V2 | 1312 × 1199 | Végétation | `images/flora/FLORE_DARKJUNGLE_V2.png` |
| `matiere_tribu_darkjungle_v2` | Matière de tribu — Refuge des Veilleurs | V2 | 1254 × 1254 | Matière communautaire | `images/materials/MATIERE_TRIBU_DARKJUNGLE_V2.png` |
| `original_refuge_darkjungle_v1` | Refuge des Veilleurs dans la jungle bioluminescente | V2 | 1855 × 848 | Cité / refuge | `images/originaux_recuperes/ORIGINAL_REFUGE_DARKJUNGLE_V1.png` |
| `original_elite_darkjungle_v1` | Veilleur Yautja des profondeurs bioluminescentes | V2 | 1024 × 1536 | Vétéran / variante | `images/originaux_recuperes/ORIGINAL_ELITE_DARKJUNGLE_V1.png` |
| `original_trone_darkjungle_v1` | Trône yautja des fleurs bioluminescentes | V2 | 1024 × 1536 | Trône | `images/originaux_recuperes/ORIGINAL_TRONE_DARKJUNGLE_V1.png` |
| `personnages_darkjungle_gardienne_v4` | Gardienne des Récits | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_DARKJUNGLE_GARDIENNE_V4.png` |
| `personnages_darkjungle_sentinelle_v4` | Sentinelle des Voûtes | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_DARKJUNGLE_SENTINELLE_V4.png` |
| `personnages_darkjungle_tisseur_v4` | Tisseur de Filets | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_DARKJUNGLE_TISSEUR_V4.png` |
| `personnages_darkjungle_chasseuse_v4` | Chasseuse de l’Ombre Basse | V4 | 1024 × 1536 | Membre | `images/personnages/MEMBRE_DARKJUNGLE_CHASSEUSE_V4.png` |
| `objets_darkjungle_memoire_v4` | Mémoire des chasses | V4 | 1024 × 1536 | Objet | `images/objets/OBJET_DARKJUNGLE_MEMOIRE_V4.png` |
| `objets_darkjungle_metier_v4` | Métier à filets | V4 | 1213 × 1296 | Objet | `images/objets/OBJET_DARKJUNGLE_METIER_V4.png` |
| `lieux_darkjungle_cour_v4` | Cour des Retours | V4 | 1536 × 1024 | Lieu | `images/lieux/LIEU_DARKJUNGLE_COUR_V4.png` |
| `lieux_darkjungle_salle_v4` | Salle des Récits | V4 | 1536 × 1024 | Lieu | `images/lieux/LIEU_DARKJUNGLE_SALLE_V4.png` |

## Livraison V5 du 6 novembre 2026

Les 40 sujets et les deux corrections sont catalogués dans [LIVRAISON_V5.md](LIVRAISON_V5.md), avec archives, catalogue PDF et preuves. Les tableaux détaillés V2-V4 ci-dessus conservent le relevé historique ; les synthèses incluent la nouvelle livraison. Le registre JSON contient désormais 246 sorties distinctes ; V37 en référence toujours 204.

## Travail restant

Les quarante sujets V5 sont entièrement décrits dans [REPRISE_V5.json](REPRISE_V5.json), avec les consignes, sources et statuts historiques conservés. La [reprise de production](REPRISE.md) sépare génération, choix des variantes, raccord de scène, identité des habitants, animation, interactions, audio et tests. La génération des 40 sujets et des deux variantes de citerne est terminée ; les autres étapes conservent leur état non réalisé.

Pour les 204 sources historiques déjà référencées dans V37, réutiliser l’identité existante et documenter le choix d’une variante avant de produire les états manquants. Les 42 nouvelles sources doivent recevoir leur raccord et leur usage avant import ; leur livraison ne crée aucune entrée V37 supplémentaire. Une retouche ou une conversion conserve sa filiation avec la source ; elle ne crée pas automatiquement une nouvelle communauté, une nouvelle personne ou une mission supplémentaire.
