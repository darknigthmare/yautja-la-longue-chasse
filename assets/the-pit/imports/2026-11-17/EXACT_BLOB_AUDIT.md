# THE PIT — vérification réelle de présence (2026-11-17)

Source: `THE_PIT_CONVERSATION_18_SPRITES_COMPLETE_20261117.zip`, 18 PNG finaux, 10 variantes, 10 JPEG de référence.

Méthode: calcul du Git blob SHA-1 sur les octets originaux de chaque PNG de l'archive, puis comparaison avec les **31 918 entrées** de l'arbre récursif de la branche de PR #146 au commit `e950a5ead9e4b7deb4980e5fe94f44e18321727b`. Arbre non tronqué.

## Présents à l'identique : 8/18

| ID | Git blob SHA-1 | Chemin déjà présent |
|---|---|---|
| 08 | `afa3a2c279d092b7ad21101cecc2d5f1878d2769` | `art-source/project-recovery-20261117/corpus/collections/Casque bleu argenté à mâchoire mécanique.png` |
| 11 | `9c76e8060c845b972aa02f7eca189fa2dded3474` | `art-source/project-recovery-20261117/corpus/collections/Alien cuirassé en garde de combat.png` |
| 13 | `5bb5ba5dcaa99eb1155e329b6caebc62b37bc849` | `public/game/sprites/v43/user-packs/lot2-13-bronze-cape-rouge-lance.png` |
| 14 | `065a7ce969138ad202a9227543c267aa85009dbe` | `public/game/sprites/v43/user-packs/lot2-14-plumes-rouges-jade.png` |
| 15 | `f0293cd56d6d4ebcdf4d0b73ef6e535fa79203cc` | `public/game/sprites/v43/user-packs/lot2-15-colosse-blanc.png` |
| 16 | `00006f820b0e6a0efe4844df369df1e083db1200` | `public/game/sprites/v43/user-packs/lot2-16-creature-quatre-bras.png` |
| 17 | `c8db37410623e6c2e4b6e74d75d4c5e23320a89b` | `public/game/sprites/v43/user-packs/lot2-17-armure-noel.png` |
| 18 | `12159d6c465b839178d98c778d8f818a6e119f12` | `public/game/sprites/v43/user-packs/lot2-18-visage-orange-reconstitution.png` |

Les six PNG 13–18 sont également déjà dupliqués à l'identique sous `public/game/sprites/v44/user-hunters/`. Ne pas les renvoyer.

## Absents de l'arbre par empreinte : 10/18

| ID | Git blob SHA-1 | Nom source |
|---|---|---|
| 01 | `ad0fc29ccaddfac20df8dd7ef0160aebc0ad0cfa` | `01_guerrier_à_la_lance_en_armure_sombre.png` |
| 02 | `320a5da5b2e86611ea898ed4062662c416e2f84d` | `02_guerrier_jade_aux_doubles_crochets.png` |
| 03 | `01535925829bdb5c63e0a0d18cf1052760219fb6` | `03_guerrier_vert_aux_armures_asymétriques.png` |
| 04 | `2ff42e313552c515ae76a9beb71cf3d5665467e0` | `04_sprite_de_combattant_aux_jambières_asymétriques.png` |
| 05 | `70883f0e15338b630515d6d50a0561d62e3ef52b` | `05_sprite_de_combat_à_armure_asymétrique.png` |
| 06 | `74d6f0a2aea652e12356760edabd688b9dbd21e0` | `06_guerrier_masqué_aux_armures_argentées.png` |
| 07 | `e5296707e885b6110f77f1d899df674eda3c1c38` | `07_combattant_alien_en_armure_menthe.png` |
| 09 | `845225d312fc2d509301a13daa3f20599ffdc98c` | `09_yautja_aux_yeux_ambrés_en_garde_de_combat.png` |
| 10 | `17e9638bc5307be12095a9944d5a2a26ad21c06e` | `10_combattant_alien_au_couteau_argenté.png` |
| 12 | `471e28b031ef29da46a437b71ab19a1b147500e0` | `12_garde_dorée_de_l_épée_courbe.png` |

**Important:** absents signifie aucun blob identique *référencé dans cet arbre* ; des illustrations visuellement proches peuvent exister. La publication de ces 10 PNG n'est pas encore effectuée. Les octets sont récupérés dans l'archive locale, mais ne peuvent pas être transmis directement à l'API GitHub depuis les outils actuellement reliés. Ne pas annoncer un transfert réussi.

Prochaine opération: envoyer uniquement ces 10 PNG sur la branche PR #146, un fichier à la fois, sous `public/game/sprites/v44/user-hunters/` ou le dossier du registre approprié après examen du moteur, puis revérifier le SHA de chaque blob. Conserver les variantes et références en archives séparées.
