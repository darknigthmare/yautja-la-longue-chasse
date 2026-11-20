# The PIT — conversation sprites (17 November 2026)

Target: PR #146, branch `codex/project-archive-recovery-20261117`.

## Source inventory

18 final character appearances, 10 intermediate/alternate PNG renderings, and 10 JPEG reference images were recovered from this conversation. Final sprites are 1024×1536 RGBA PNGs, single combat-idle frames, not animated sprite sheets.

**Binary transfer status:** NOT UPLOADED by this commit. The images are recovered in the conversation workspace but the GitHub connector cannot read local binary files, and direct git networking is unavailable. Do not mark these assets as present or integration-complete until binary files have been pushed and SHA-256 checked.

| ID | Final PNG filename |
|---|---|
| 01 | `guerrier_à_la_lance_en_armure_sombre.png` |
| 02 | `guerrier_jade_aux_doubles_crochets.png` |
| 03 | `guerrier_vert_aux_armures_asymétriques.png` |
| 04 | `sprite_de_combattant_aux_jambières_asymétriques.png` |
| 05 | `sprite_de_combat_à_armure_asymétrique.png` |
| 06 | `guerrier_masqué_aux_armures_argentées.png` |
| 07 | `combattant_alien_en_armure_menthe.png` |
| 08 | `casque_bleu_argenté_à_mâchoire_mécanique.png` |
| 09 | `yautja_aux_yeux_ambrés_en_garde_de_combat.png` |
| 10 | `combattant_alien_au_couteau_argenté.png` |
| 11 | `alien_cuirassé_en_garde_de_combat.png` |
| 12 | `garde_dorée_de_l_épée_courbe.png` |
| 13 | `guerrier_au_casque_de_bronze_et_lance.png` |
| 14 | `guerrier_au_masque_d_os_et_plumes_rouges.png` |
| 15 | `brute_blanche_entière_sur_fond_transparent.png` |
| 16 | `sprite_squelettique_à_quatre_bras.png` |
| 17 | `guerrier_de_noël_au_trophée_anguleux.png` |
| 18 | `guerrier_aux_dreadlocks_et_grandes_défenses.png` |

Reference images: `IMG_4094.jpeg` through `IMG_4098.jpeg`, and `IMG_4106.jpeg` through `IMG_4110.jpeg`.

## Safe integration procedure

1. Compare each source SHA-256 against existing repository files, including previously merged PR assets. Do not overwrite a differing asset based on filename alone.
2. Transfer missing final PNGs individually in small batches; include original references and variants in a clearly marked archival folder.
3. Verify actual PNG alpha, dimensions, file hashes, and the game-facing side orientation.
4. Preserve the distinction between character-select portraits, single combat-idle frames, and full animation sequences. No animation has been created here.
5. Regenerate only genuinely absent/unrecoverable images; record provenance and do not silently substitute a different design.
6. Update this file with GitHub paths and verified checksums only after each successful transfer.
