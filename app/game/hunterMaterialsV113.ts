/** PHG-inspired reconstructed texture swatches already checked into V85. Not original PHG game textures. */
export type HunterMaterialCategoryV113 = "skin" | "dread" | "outfit";
export interface HunterMaterialV113 {
  readonly id: string;
  readonly category: HunterMaterialCategoryV113;
  readonly label: string;
  readonly src: string;
  readonly byteLength: number;
  readonly gitBlobSha: string;
  readonly provisional: boolean;
  readonly archived: boolean;
}
/** Reuse existing original-size PNGs: never invent missing filenames or duplicate binary assets. */
export const PHG_MATERIALS_V113: readonly HunterMaterialV113[] = [
  {
    "id": "anneau_ligature_fil_rouge_observe_2022",
    "category": "dread",
    "label": "Ligature Fil Rouge Observe 2022",
    "src": "/game/imports/v85/drive-latest/anneau_ligature_fil_rouge_observe_2022.png",
    "byteLength": 3436801,
    "gitBlobSha": "394da256e9577a6c6d1fcc1bc587354686b09731",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_alpha_ceinture_ivoire_cannelee",
    "category": "outfit",
    "label": "Classe Alpha Ceinture Ivoire Cannelee",
    "src": "/game/imports/v85/drive-latest/armor_classe_alpha_ceinture_ivoire_cannelee.png",
    "byteLength": 3129783,
    "gitBlobSha": "ee9a63db2d6d72db982c92d7b1171514f26e883f",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_alpha_fibres_brun_noir",
    "category": "outfit",
    "label": "Classe Alpha Fibres Brun Noir",
    "src": "/game/imports/v85/drive-latest/armor_classe_alpha_fibres_brun_noir.png",
    "byteLength": 3331361,
    "gitBlobSha": "c117bcbbb5a1adab821571c954cc4046ef90c905",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_anubis_etoffe_claire",
    "category": "outfit",
    "label": "Classe Anubis Etoffe Claire",
    "src": "/game/imports/v85/drive-latest/armor_classe_anubis_etoffe_claire.png",
    "byteLength": 4245821,
    "gitBlobSha": "e2dbe590a60fd4f2b60e5b957dff3eb90a56128b",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_avp_cuir_noir",
    "category": "outfit",
    "label": "Classe Avp Cuir Noir",
    "src": "/game/imports/v85/drive-latest/armor_classe_avp_cuir_noir.png",
    "byteLength": 4175072,
    "gitBlobSha": "f23f44fadce6674c94f15640e5d20279bd73efad",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_bionic_etoffe_gris",
    "category": "outfit",
    "label": "Classe Bionic Etoffe Gris",
    "src": "/game/imports/v85/drive-latest/armor_classe_bionic_etoffe_gris.png",
    "byteLength": 4447447,
    "gitBlobSha": "fa2297ae599f00e7bc13b5856b8f56041edaef24",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_cleopatra_etoffe_ivoire_ocre",
    "category": "outfit",
    "label": "Classe Cleopatra Etoffe Ivoire Ocre",
    "src": "/game/imports/v85/drive-latest/armor_classe_cleopatra_etoffe_ivoire_ocre.png",
    "byteLength": 4396348,
    "gitBlobSha": "02a963cc597ad75158e7c854a5dcbccc41edb832",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_emissary_toile_brune",
    "category": "outfit",
    "label": "Classe Emissary Toile Brune",
    "src": "/game/imports/v85/drive-latest/armor_classe_emissary_toile_brune.png",
    "byteLength": 3964701,
    "gitBlobSha": "6364627e48651070cff3cc2da220c20b3dd6f5cc",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_exiled_fibres_brun_sombre",
    "category": "outfit",
    "label": "Classe Exiled Fibres Brun Sombre",
    "src": "/game/imports/v85/drive-latest/armor_classe_exiled_fibres_brun_sombre.png",
    "byteLength": 3851321,
    "gitBlobSha": "adf7a934e95de38810a94b5d4bc90fa701526c02",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_father_etoffe_bleu_ardoise",
    "category": "outfit",
    "label": "Classe Father Etoffe Bleu Ardoise",
    "src": "/game/imports/v85/drive-latest/armor_classe_father_etoffe_bleu_ardoise.png",
    "byteLength": 4066588,
    "gitBlobSha": "c403977683a804b2aafcd6b697daefb4ba349812",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_father_masque_beige_strie",
    "category": "outfit",
    "label": "Classe Father Masque Beige Strie",
    "src": "/game/imports/v85/drive-latest/armor_classe_father_masque_beige_strie.png",
    "byteLength": 4129591,
    "gitBlobSha": "a6f4017794dd88388740954cf5d54d99e0452a0c",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_father_tissu_gris_prune",
    "category": "outfit",
    "label": "Classe Father Tissu Gris Prune",
    "src": "/game/imports/v85/drive-latest/armor_classe_father_tissu_gris_prune.png",
    "byteLength": 4414700,
    "gitBlobSha": "4abcb729893e8019bc2ddabcba94799862247b87",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_gladiator_cuir_grave",
    "category": "outfit",
    "label": "Classe Gladiator Cuir Grave",
    "src": "/game/imports/v85/drive-latest/armor_classe_gladiator_cuir_grave.png",
    "byteLength": 4149726,
    "gitBlobSha": "dbe92598652b959c4cf3c7e331577b82be3df005",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_gladiator_etoffe_bordeaux",
    "category": "outfit",
    "label": "Classe Gladiator Etoffe Bordeaux",
    "src": "/game/imports/v85/drive-latest/armor_classe_gladiator_etoffe_bordeaux.png",
    "byteLength": 3797074,
    "gitBlobSha": "6388a8354ec58c89d4da8281b9720c0bcdb0555b",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_jotun_sangle_brun_grave",
    "category": "outfit",
    "label": "Classe Jotun Sangle Brun Grave",
    "src": "/game/imports/v85/drive-latest/armor_classe_jotun_sangle_brun_grave.png",
    "byteLength": 3856318,
    "gitBlobSha": "534ffd8130d591761b370db75f1e7e2db2c5d4ce",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_oni_tissu_anthracite",
    "category": "outfit",
    "label": "Classe Oni Tissu Anthracite",
    "src": "/game/imports/v85/drive-latest/armor_classe_oni_tissu_anthracite.png",
    "byteLength": 4061229,
    "gitBlobSha": "011a92f278dec0813228fc994c2d392a42c6bd85",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_pirate_cuir_brun_sombre",
    "category": "outfit",
    "label": "Classe Pirate Cuir Brun Sombre",
    "src": "/game/imports/v85/drive-latest/armor_classe_pirate_cuir_brun_sombre.png",
    "byteLength": 4051332,
    "gitBlobSha": "91d45c092f3fd714028ca6932ddf9c95b5e8c54b",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_pirate_etoffe_vert_sauge",
    "category": "outfit",
    "label": "Classe Pirate Etoffe Vert Sauge",
    "src": "/game/imports/v85/drive-latest/armor_classe_pirate_etoffe_vert_sauge.png",
    "byteLength": 4413084,
    "gitBlobSha": "7c2497dd3d21ee745be3137361cc298b430414c9",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_samurai_laque_rouge_volutes",
    "category": "outfit",
    "label": "Classe Samurai Laque Rouge Volutes",
    "src": "/game/imports/v85/drive-latest/armor_classe_samurai_laque_rouge_volutes.png",
    "byteLength": 2616053,
    "gitBlobSha": "4a422a4b469ed295d6d358602a0defe1b49190de",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_samurai_tressage_brun",
    "category": "outfit",
    "label": "Classe Samurai Tressage Brun",
    "src": "/game/imports/v85/drive-latest/armor_classe_samurai_tressage_brun.png",
    "byteLength": 4041965,
    "gitBlobSha": "fb1c5b576d1b51bc161cd7b61985815c52f422da",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_valkyrie_entrelacs_cuivres",
    "category": "outfit",
    "label": "Classe Valkyrie Entrelacs Cuivres",
    "src": "/game/imports/v85/drive-latest/armor_classe_valkyrie_entrelacs_cuivres.png",
    "byteLength": 3288215,
    "gitBlobSha": "8514277c6148e43aba6b1ff01db200dbe2b103a6",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_viking_fourrure_gris_taupe",
    "category": "outfit",
    "label": "Classe Viking Fourrure Gris Taupe",
    "src": "/game/imports/v85/drive-latest/armor_classe_viking_fourrure_gris_taupe.png",
    "byteLength": 4431957,
    "gitBlobSha": "d84febfa0a07fc07bac28af0960322470def7b6e",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_witch_etoffe_taupe_usee",
    "category": "outfit",
    "label": "Classe Witch Etoffe Taupe Usee",
    "src": "/game/imports/v85/drive-latest/armor_classe_witch_etoffe_taupe_usee.png",
    "byteLength": 4367210,
    "gitBlobSha": "6330bb27d8c692e01da4b965d89d17481c92c8e7",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_wolf_cuir_brun_sangles",
    "category": "outfit",
    "label": "Classe Wolf Cuir Brun Sangles",
    "src": "/game/imports/v85/drive-latest/armor_classe_wolf_cuir_brun_sangles.png",
    "byteLength": 4172365,
    "gitBlobSha": "ff20c92f90538d6ad1401c740be9fb72cd75fe19",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_classe_wolf_tablier_gris_brun",
    "category": "outfit",
    "label": "Classe Wolf Tablier Gris Brun",
    "src": "/game/imports/v85/drive-latest/armor_classe_wolf_tablier_gris_brun.png",
    "byteLength": 4359700,
    "gitBlobSha": "c552e16d9fc69cf6022ef1f40cf6df2a85c5734d",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_epic_promo_2020",
    "category": "outfit",
    "label": "Epic Promo 2020",
    "src": "/game/imports/v85/drive-latest/armor_epic_promo_2020.png",
    "byteLength": 4697650,
    "gitBlobSha": "37a8b0dbf1bf7751dd7b4dc950df4993a9fc63a0",
    "provisional": true,
    "archived": false
  },
  {
    "id": "armor_filet_epais_brun_losanges",
    "category": "outfit",
    "label": "Filet Epais Brun Losanges",
    "src": "/game/imports/v85/drive-latest/armor_filet_epais_brun_losanges.png",
    "byteLength": 2022183,
    "gitBlobSha": "1e571fdcf0bb719c4e6e7745fcca02c2c862b3fa",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_filet_fin_noir_losanges",
    "category": "outfit",
    "label": "Filet Fin Noir Losanges",
    "src": "/game/imports/v85/drive-latest/armor_filet_fin_noir_losanges.png",
    "byteLength": 1850203,
    "gitBlobSha": "ae7b62f12bd5ab5135e1a7b66467839271d1907e",
    "provisional": false,
    "archived": false
  },
  {
    "id": "armor_playstation_promo_2019",
    "category": "outfit",
    "label": "Playstation Promo 2019",
    "src": "/game/imports/v85/drive-latest/armor_playstation_promo_2019.png",
    "byteLength": 4293720,
    "gitBlobSha": "c02f46c2497f3555b845132a601a83b6b022e7c8",
    "provisional": true,
    "archived": false
  },
  {
    "id": "dread_anubis_gris_motif_ecaille",
    "category": "dread",
    "label": "Anubis Gris Motif Ecaille",
    "src": "/game/imports/v85/drive-latest/dread_anubis_gris_motif_ecaille.png",
    "byteLength": 3309674,
    "gitBlobSha": "01c780ba1215ef1e0836a93e50412212809f0603",
    "provisional": false,
    "archived": false
  },
  {
    "id": "dread_exalted_noir_annele_fin",
    "category": "dread",
    "label": "Exalted Noir Annele Fin",
    "src": "/game/imports/v85/drive-latest/dread_exalted_noir_annele_fin.png",
    "byteLength": 3337319,
    "gitBlobSha": "977550560715fc662b97e4791b3fb8c8eeeb549a",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_classe_captured_base_observee",
    "category": "skin",
    "label": "Classe Captured Base Observee",
    "src": "/game/imports/v85/drive-latest/skin_classe_captured_base_observee.png",
    "byteLength": 3274130,
    "gitBlobSha": "335cd6fed229a5089f6348b52a31cfb880d0a092",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_classe_cityhunter97_sector_provisoire",
    "category": "skin",
    "label": "Classe Cityhunter97 Sector Provisoire",
    "src": "/game/imports/v85/drive-latest/skin_classe_cityhunter97_sector_provisoire.png",
    "byteLength": 3611758,
    "gitBlobSha": "956a428da56847e1816468d515c74d0be41bfe57",
    "provisional": true,
    "archived": false
  },
  {
    "id": "skin_classe_cityhunter97_tract_provisoire",
    "category": "skin",
    "label": "Classe Cityhunter97 Tract Provisoire",
    "src": "/game/imports/v85/drive-latest/skin_classe_cityhunter97_tract_provisoire.png",
    "byteLength": 3666894,
    "gitBlobSha": "c6811ca32bae7d6cbe83830fe81d602b81a9363a",
    "provisional": true,
    "archived": false
  },
  {
    "id": "skin_classe_cityhunter97_ward_provisoire",
    "category": "skin",
    "label": "Classe Cityhunter97 Ward Provisoire",
    "src": "/game/imports/v85/drive-latest/skin_classe_cityhunter97_ward_provisoire.png",
    "byteLength": 3574092,
    "gitBlobSha": "a79f398cb0e624b9b0ae9637e84a36f023721c9d",
    "provisional": true,
    "archived": false
  },
  {
    "id": "skin_classe_cleopatra_base_observee",
    "category": "skin",
    "label": "Classe Cleopatra Base Observee",
    "src": "/game/imports/v85/drive-latest/skin_classe_cleopatra_base_observee.png",
    "byteLength": 3883986,
    "gitBlobSha": "9cecdac738409a130283e740cc18b226e58a05b5",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_classe_exiled_base_observee",
    "category": "skin",
    "label": "Classe Exiled Base Observee",
    "src": "/game/imports/v85/drive-latest/skin_classe_exiled_base_observee.png",
    "byteLength": 4070141,
    "gitBlobSha": "25f44b7659ff5c7b7f2e7f9709663c92d7074081",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_classe_samurai_base_observee",
    "category": "skin",
    "label": "Classe Samurai Base Observee",
    "src": "/game/imports/v85/drive-latest/skin_classe_samurai_base_observee.png",
    "byteLength": 3928611,
    "gitBlobSha": "810583f1e07e4daaf6e1ffddca8968c6acaea089",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_classe_valkyrie_base_observee",
    "category": "skin",
    "label": "Classe Valkyrie Base Observee",
    "src": "/game/imports/v85/drive-latest/skin_classe_valkyrie_base_observee.png",
    "byteLength": 3982362,
    "gitBlobSha": "825ec85d4ae8db9858720e772d626ae4bbb42460",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_classe_viking_base_observee",
    "category": "skin",
    "label": "Classe Viking Base Observee",
    "src": "/game/imports/v85/drive-latest/skin_classe_viking_base_observee.png",
    "byteLength": 3413502,
    "gitBlobSha": "e9505753fe0b900e3c7d2e6a2f144ae2dd291f73",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_default_epic_exclusive",
    "category": "skin",
    "label": "Default Epic Exclusive",
    "src": "/game/imports/v85/drive-latest/skin_default_epic_exclusive.png",
    "byteLength": 3525171,
    "gitBlobSha": "4efbce36de4aaed7d3b5280fda204a76591f7294",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_default_ps_exclusive",
    "category": "skin",
    "label": "Default Ps Exclusive",
    "src": "/game/imports/v85/drive-latest/skin_default_ps_exclusive.png",
    "byteLength": 3600437,
    "gitBlobSha": "0eec2846b7b7a13f8311a06ff01d5e9888be7c1e",
    "provisional": false,
    "archived": false
  },
  {
    "id": "skin_shatter_demon_provisoire",
    "category": "skin",
    "label": "Shatter Demon Provisoire",
    "src": "/game/imports/v85/drive-latest/skin_shatter_demon_provisoire.png",
    "byteLength": 2841876,
    "gitBlobSha": "f23bd233fdf9b6d720629c71ac2bc94abef0eb1c",
    "provisional": true,
    "archived": true
  },
  {
    "id": "skin_shatter_demon_revision_mrblack",
    "category": "skin",
    "label": "Shatter Demon Revision Mrblack",
    "src": "/game/imports/v85/drive-latest/skin_shatter_demon_revision_mrblack.png",
    "byteLength": 3712552,
    "gitBlobSha": "afcb433aa0b6ae02fbb8beab53e90e4c3f0e2cda",
    "provisional": false,
    "archived": false
  }
];
export function phgMaterialForV113(category: HunterMaterialCategoryV113, candidate: unknown): HunterMaterialV113 | undefined {
  if (typeof candidate !== "string" || candidate.length > 128) return undefined;
  return PHG_MATERIALS_V113.find((entry) => entry.category === category && entry.id === candidate && !entry.archived);
}
export function phgMaterialLabelV113(material: HunterMaterialV113): string {
  return material.provisional ? "Reconstitution provisoire · fidélité non certifiée" : "Reconstitution d’après référence PHG · non pixel-à-pixel";
}
