import type { PitSpriteSheetAnimationDefinition } from "./pitSpriteSheetAnimation";

/** V32/V33: reviewed, independently drawn facings; uncovered states retain an honest drawn-pose fallback. */
export const PIT_SPRITE_SHEET_REGISTRY: readonly PitSpriteSheetAnimationDefinition[] = [
  {
    "fighterId": "jungle-hunter",
    "bodyHeightPx": 350,
    "pageBodyHeightPx": {
      "jungle-hunter-idle": 350,
      "jungle-hunter-light": 333,
      "jungle-hunter-v34-hurt": 446,
      "jungle-hunter-v34-repair-walk-forward-alternation": 440,
      "jungle-hunter-v34-repair-crouch-planted": 380
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "jungle-hunter-pit-v32",
      "characterId": "jungle-hunter",
      "variantId": "the-pit-v32",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "jungle-hunter-idle",
          "src": "/game/sprites/v32/pit/jungle-hunter-idle.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "jungle-hunter-light",
          "src": "/game/sprites/v32/pit/jungle-hunter-light.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "jungle-hunter-v34-hurt",
          "src": "/game/sprites/v34/pit/jungle-hunter/jungle-hunter-hurt-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "jungle-hunter-v34-repair-walk-forward-alternation",
          "src": "/game/sprites/v34/pit/jungle-hunter/jungle-hunter-repair-walk-forward-alternation-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "jungle-hunter-v34-repair-crouch-planted",
          "src": "/game/sprites/v34/pit/jungle-hunter/jungle-hunter-repair-crouch-planted-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-idle",
              "rect": [
                58,
                106,
                260,
                358
              ],
              "pivot": [
                126.5,
                353
              ],
              "durationTicks": 10
            },
            {
              "pageId": "jungle-hunter-idle",
              "rect": [
                432,
                105,
                264,
                359
              ],
              "pivot": [
                131.5,
                354
              ],
              "durationTicks": 10
            },
            {
              "pageId": "jungle-hunter-idle",
              "rect": [
                809,
                102,
                264,
                362
              ],
              "pivot": [
                131.5,
                357
              ],
              "durationTicks": 10
            },
            {
              "pageId": "jungle-hunter-idle",
              "rect": [
                1199,
                108,
                261,
                356
              ],
              "pivot": [
                130,
                351
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-idle",
              "rect": [
                71,
                564,
                263,
                362
              ],
              "pivot": [
                131,
                357
              ],
              "durationTicks": 10
            },
            {
              "pageId": "jungle-hunter-idle",
              "rect": [
                452,
                564,
                274,
                361
              ],
              "pivot": [
                136.5,
                356
              ],
              "durationTicks": 10
            },
            {
              "pageId": "jungle-hunter-idle",
              "rect": [
                835,
                563,
                271,
                362
              ],
              "pivot": [
                135,
                357
              ],
              "durationTicks": 10
            },
            {
              "pageId": "jungle-hunter-idle",
              "rect": [
                1210,
                564,
                268,
                362
              ],
              "pivot": [
                133.5,
                357
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-light",
              "rect": [
                56,
                126,
                264,
                333
              ],
              "pivot": [
                121.5,
                328
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-light",
              "rect": [
                420,
                122,
                385,
                336
              ],
              "pivot": [
                134,
                331
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-light",
              "rect": [
                812,
                120,
                262,
                340
              ],
              "pivot": [
                130.5,
                335
              ],
              "durationTicks": 10
            },
            {
              "pageId": "jungle-hunter-light",
              "rect": [
                1216,
                116,
                252,
                346
              ],
              "pivot": [
                125.5,
                341
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-light",
              "rect": [
                65,
                583,
                270,
                341
              ],
              "pivot": [
                142.5,
                336
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-light",
              "rect": [
                364,
                580,
                386,
                344
              ],
              "pivot": [
                243.5,
                339
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-light",
              "rect": [
                837,
                581,
                273,
                344
              ],
              "pivot": [
                139,
                339
              ],
              "durationTicks": 10
            },
            {
              "pageId": "jungle-hunter-light",
              "rect": [
                1212,
                574,
                266,
                353
              ],
              "pivot": [
                132.5,
                348
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-v34-hurt",
              "rect": [
                431,
                38,
                298,
                449
              ],
              "pivot": [
                151,
                445
              ],
              "durationTicks": 2
            },
            {
              "pageId": "jungle-hunter-v34-hurt",
              "rect": [
                784,
                78,
                315,
                409
              ],
              "pivot": [
                175,
                405
              ],
              "durationTicks": 3
            },
            {
              "pageId": "jungle-hunter-v34-hurt",
              "rect": [
                1183,
                46,
                315,
                441
              ],
              "pivot": [
                136.5,
                437
              ],
              "durationTicks": 3
            },
            {
              "pageId": "jungle-hunter-v34-hurt",
              "rect": [
                40,
                24,
                310,
                463
              ],
              "pivot": [
                146,
                459
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-v34-hurt",
              "rect": [
                407,
                547,
                294,
                431
              ],
              "pivot": [
                143.5,
                427
              ],
              "durationTicks": 2
            },
            {
              "pageId": "jungle-hunter-v34-hurt",
              "rect": [
                786,
                584,
                306,
                394
              ],
              "pivot": [
                143.5,
                390
              ],
              "durationTicks": 3
            },
            {
              "pageId": "jungle-hunter-v34-hurt",
              "rect": [
                1178,
                557,
                314,
                421
              ],
              "pivot": [
                173,
                417
              ],
              "durationTicks": 3
            },
            {
              "pageId": "jungle-hunter-v34-hurt",
              "rect": [
                34,
                540,
                311,
                437
              ],
              "pivot": [
                165,
                433
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "walk",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-v34-repair-walk-forward-alternation",
              "rect": [
                41,
                541,
                285,
                437
              ],
              "pivot": [
                146,
                433
              ],
              "durationTicks": 8
            },
            {
              "pageId": "jungle-hunter-v34-repair-walk-forward-alternation",
              "rect": [
                432,
                541,
                260,
                434
              ],
              "pivot": [
                144,
                430
              ],
              "durationTicks": 8
            },
            {
              "pageId": "jungle-hunter-v34-repair-walk-forward-alternation",
              "rect": [
                775,
                539,
                297,
                436
              ],
              "pivot": [
                176,
                432
              ],
              "durationTicks": 8
            },
            {
              "pageId": "jungle-hunter-v34-repair-walk-forward-alternation",
              "rect": [
                1179,
                540,
                288,
                438
              ],
              "pivot": [
                168,
                434
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-v34-repair-crouch-planted",
              "rect": [
                61,
                90,
                280,
                389
              ],
              "pivot": [
                139.5,
                385
              ],
              "durationTicks": 2
            },
            {
              "pageId": "jungle-hunter-v34-repair-crouch-planted",
              "rect": [
                455,
                128,
                276,
                351
              ],
              "pivot": [
                123.5,
                347
              ],
              "durationTicks": 2
            },
            {
              "pageId": "jungle-hunter-v34-repair-crouch-planted",
              "rect": [
                830,
                185,
                268,
                296
              ],
              "pivot": [
                121.5,
                292
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-v34-repair-crouch-planted",
              "rect": [
                53,
                540,
                292,
                380
              ],
              "pivot": [
                149.5,
                376
              ],
              "durationTicks": 2
            },
            {
              "pageId": "jungle-hunter-v34-repair-crouch-planted",
              "rect": [
                432,
                571,
                283,
                348
              ],
              "pivot": [
                154,
                344
              ],
              "durationTicks": 2
            },
            {
              "pageId": "jungle-hunter-v34-repair-crouch-planted",
              "rect": [
                803,
                632,
                268,
                288
              ],
              "pivot": [
                132.5,
                284
              ],
              "durationTicks": 30
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "city-hunter",
    "bodyHeightPx": 448,
    "pageBodyHeightPx": {
      "city-hunter-idle": 448,
      "city-hunter-light": 430
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "city-hunter-pit-v32",
      "characterId": "city-hunter",
      "variantId": "the-pit-v32",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "city-hunter-idle",
          "src": "/game/sprites/v32/pit/city-hunter-idle.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "city-hunter-light",
          "src": "/game/sprites/v32/pit/city-hunter-light.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-idle",
              "rect": [
                73,
                21,
                239,
                457
              ],
              "pivot": [
                118.5,
                452
              ],
              "durationTicks": 10
            },
            {
              "pageId": "city-hunter-idle",
              "rect": [
                458,
                21,
                238,
                457
              ],
              "pivot": [
                117.5,
                452
              ],
              "durationTicks": 10
            },
            {
              "pageId": "city-hunter-idle",
              "rect": [
                839,
                19,
                241,
                459
              ],
              "pivot": [
                120.5,
                454
              ],
              "durationTicks": 10
            },
            {
              "pageId": "city-hunter-idle",
              "rect": [
                1228,
                21,
                236,
                457
              ],
              "pivot": [
                115.5,
                452
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-idle",
              "rect": [
                66,
                530,
                245,
                459
              ],
              "pivot": [
                122,
                454
              ],
              "durationTicks": 10
            },
            {
              "pageId": "city-hunter-idle",
              "rect": [
                449,
                530,
                245,
                459
              ],
              "pivot": [
                123,
                454
              ],
              "durationTicks": 10
            },
            {
              "pageId": "city-hunter-idle",
              "rect": [
                834,
                527,
                245,
                462
              ],
              "pivot": [
                122,
                457
              ],
              "durationTicks": 10
            },
            {
              "pageId": "city-hunter-idle",
              "rect": [
                1217,
                530,
                245,
                459
              ],
              "pivot": [
                123,
                454
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-light",
              "rect": [
                55,
                38,
                274,
                438
              ],
              "pivot": [
                135.5,
                433
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-light",
              "rect": [
                407,
                38,
                385,
                438
              ],
              "pivot": [
                138,
                433
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-light",
              "rect": [
                823,
                37,
                278,
                439
              ],
              "pivot": [
                138,
                434
              ],
              "durationTicks": 10
            },
            {
              "pageId": "city-hunter-light",
              "rect": [
                1229,
                36,
                246,
                442
              ],
              "pivot": [
                119,
                437
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-light",
              "rect": [
                53,
                536,
                277,
                439
              ],
              "pivot": [
                144.5,
                434
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-light",
              "rect": [
                351,
                534,
                387,
                441
              ],
              "pivot": [
                247,
                436
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-light",
              "rect": [
                812,
                533,
                284,
                441
              ],
              "pivot": [
                147.5,
                436
              ],
              "durationTicks": 10
            },
            {
              "pageId": "city-hunter-light",
              "rect": [
                1211,
                533,
                257,
                442
              ],
              "pivot": [
                134.5,
                437
              ],
              "durationTicks": 10
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "berserker",
    "bodyHeightPx": 460,
    "pageBodyHeightPx": {
      "berserker-idle": 460,
      "berserker-crouch": 465,
      "berserker-high-guard": 385,
      "berserker-walk-backward": 451,
      "berserker-light": 329,
      "berserker-medium": 298,
      "berserker-heavy": 339
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "berserker-pit-v33",
      "characterId": "berserker",
      "variantId": "the-pit-v33-v23-identity",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "berserker-idle",
          "src": "/game/sprites/v33/pit/berserker/berserker-idle-v33.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "berserker-crouch",
          "src": "/game/sprites/v33/pit/berserker/berserker-crouch-v33.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "berserker-high-guard",
          "src": "/game/sprites/v33/pit/berserker/repairs/berserker-guard-repair-v33.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "berserker-walk-backward",
          "src": "/game/sprites/v33/pit/berserker/repairs/berserker-walk-backward-joints-repair-v33.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "berserker-light",
          "src": "/game/sprites/v33/pit/berserker/repairs/berserker-light-spacing-repair-v33.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "berserker-medium",
          "src": "/game/sprites/v33/pit/berserker/repairs/berserker-medium-repair-v33.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "berserker-heavy",
          "src": "/game/sprites/v33/pit/berserker/repairs/berserker-heavy-repair-v33.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-idle",
              "rect": [
                35,
                15,
                321,
                469
              ],
              "pivot": [
                162,
                465
              ],
              "durationTicks": 10
            },
            {
              "pageId": "berserker-idle",
              "rect": [
                420,
                13,
                336,
                470
              ],
              "pivot": [
                167,
                466
              ],
              "durationTicks": 10
            },
            {
              "pageId": "berserker-idle",
              "rect": [
                802,
                21,
                307,
                461
              ],
              "pivot": [
                161.5,
                457
              ],
              "durationTicks": 10
            },
            {
              "pageId": "berserker-idle",
              "rect": [
                1189,
                18,
                314,
                464
              ],
              "pivot": [
                158.5,
                460
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-idle",
              "rect": [
                43,
                516,
                307,
                469
              ],
              "pivot": [
                147.5,
                465
              ],
              "durationTicks": 10
            },
            {
              "pageId": "berserker-idle",
              "rect": [
                413,
                515,
                317,
                470
              ],
              "pivot": [
                156,
                466
              ],
              "durationTicks": 10
            },
            {
              "pageId": "berserker-idle",
              "rect": [
                813,
                525,
                305,
                460
              ],
              "pivot": [
                145,
                456
              ],
              "durationTicks": 10
            },
            {
              "pageId": "berserker-idle",
              "rect": [
                1197,
                521,
                300,
                464
              ],
              "pivot": [
                145.5,
                460
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-crouch",
              "rect": [
                11,
                21,
                357,
                476
              ],
              "pivot": [
                175,
                472
              ],
              "durationTicks": 2
            },
            {
              "pageId": "berserker-crouch",
              "rect": [
                396,
                57,
                372,
                438
              ],
              "pivot": [
                188.5,
                434
              ],
              "durationTicks": 2
            },
            {
              "pageId": "berserker-crouch",
              "rect": [
                777,
                157,
                373,
                338
              ],
              "pivot": [
                189,
                334
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-crouch",
              "rect": [
                16,
                529,
                362,
                467
              ],
              "pivot": [
                184,
                463
              ],
              "durationTicks": 2
            },
            {
              "pageId": "berserker-crouch",
              "rect": [
                388,
                565,
                364,
                430
              ],
              "pivot": [
                179,
                426
              ],
              "durationTicks": 2
            },
            {
              "pageId": "berserker-crouch",
              "rect": [
                773,
                660,
                371,
                336
              ],
              "pivot": [
                184,
                332
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-high-guard",
              "rect": [
                70,
                67,
                236,
                397
              ],
              "pivot": [
                117.5,
                393
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-high-guard",
              "rect": [
                436,
                67,
                267,
                397
              ],
              "pivot": [
                125,
                393
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-high-guard",
              "rect": [
                800,
                90,
                291,
                374
              ],
              "pivot": [
                128.5,
                370
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-high-guard",
              "rect": [
                1190,
                74,
                263,
                390
              ],
              "pivot": [
                125,
                386
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-high-guard",
              "rect": [
                63,
                570,
                260,
                382
              ],
              "pivot": [
                129.5,
                378
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-high-guard",
              "rect": [
                444,
                567,
                267,
                386
              ],
              "pivot": [
                134.5,
                382
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-high-guard",
              "rect": [
                808,
                592,
                289,
                362
              ],
              "pivot": [
                154,
                358
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-high-guard",
              "rect": [
                1197,
                567,
                266,
                388
              ],
              "pivot": [
                135.5,
                384
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-walk-backward",
              "rect": [
                15,
                25,
                364,
                457
              ],
              "pivot": [
                178,
                453
              ],
              "durationTicks": 8
            },
            {
              "pageId": "berserker-walk-backward",
              "rect": [
                399,
                23,
                354,
                459
              ],
              "pivot": [
                181,
                455
              ],
              "durationTicks": 8
            },
            {
              "pageId": "berserker-walk-backward",
              "rect": [
                799,
                24,
                352,
                456
              ],
              "pivot": [
                179,
                452
              ],
              "durationTicks": 8
            },
            {
              "pageId": "berserker-walk-backward",
              "rect": [
                1183,
                24,
                341,
                453
              ],
              "pivot": [
                178,
                449
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-walk-backward",
              "rect": [
                13,
                531,
                364,
                460
              ],
              "pivot": [
                182,
                456
              ],
              "durationTicks": 8
            },
            {
              "pageId": "berserker-walk-backward",
              "rect": [
                399,
                533,
                350,
                458
              ],
              "pivot": [
                176,
                454
              ],
              "durationTicks": 8
            },
            {
              "pageId": "berserker-walk-backward",
              "rect": [
                781,
                532,
                359,
                450
              ],
              "pivot": [
                184,
                446
              ],
              "durationTicks": 8
            },
            {
              "pageId": "berserker-walk-backward",
              "rect": [
                1167,
                532,
                342,
                452
              ],
              "pivot": [
                181,
                448
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-light",
              "rect": [
                69,
                118,
                210,
                334
              ],
              "pivot": [
                104.5,
                330
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-light",
              "rect": [
                437,
                118,
                336,
                334
              ],
              "pivot": [
                108.5,
                330
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-light",
              "rect": [
                845,
                118,
                211,
                334
              ],
              "pivot": [
                105,
                330
              ],
              "durationTicks": 1
            },
            {
              "pageId": "berserker-light",
              "rect": [
                1237,
                116,
                221,
                336
              ],
              "pivot": [
                104,
                332
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-light",
              "rect": [
                89,
                594,
                223,
                339
              ],
              "pivot": [
                111,
                335
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-light",
              "rect": [
                397,
                597,
                332,
                335
              ],
              "pivot": [
                218.5,
                331
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-light",
              "rect": [
                873,
                595,
                223,
                337
              ],
              "pivot": [
                111,
                333
              ],
              "durationTicks": 1
            },
            {
              "pageId": "berserker-light",
              "rect": [
                1227,
                593,
                224,
                339
              ],
              "pivot": [
                116.5,
                335
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-medium",
              "rect": [
                84,
                163,
                211,
                305
              ],
              "pivot": [
                103,
                301
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-medium",
              "rect": [
                433,
                163,
                369,
                303
              ],
              "pivot": [
                119,
                299
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-medium",
              "rect": [
                852,
                163,
                208,
                305
              ],
              "pivot": [
                102,
                301
              ],
              "durationTicks": 1
            },
            {
              "pageId": "berserker-medium",
              "rect": [
                1250,
                163,
                193,
                306
              ],
              "pivot": [
                96,
                302
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-medium",
              "rect": [
                92,
                633,
                209,
                304
              ],
              "pivot": [
                104,
                300
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-medium",
              "rect": [
                383,
                633,
                364,
                301
              ],
              "pivot": [
                242.5,
                297
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-medium",
              "rect": [
                871,
                633,
                210,
                304
              ],
              "pivot": [
                104.5,
                300
              ],
              "durationTicks": 1
            },
            {
              "pageId": "berserker-medium",
              "rect": [
                1246,
                633,
                192,
                304
              ],
              "pivot": [
                95.5,
                300
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-heavy",
              "rect": [
                82,
                118,
                240,
                344
              ],
              "pivot": [
                102.5,
                340
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-heavy",
              "rect": [
                436,
                131,
                292,
                330
              ],
              "pivot": [
                118,
                326
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-heavy",
              "rect": [
                823,
                166,
                268,
                296
              ],
              "pivot": [
                124.5,
                292
              ],
              "durationTicks": 1
            },
            {
              "pageId": "berserker-heavy",
              "rect": [
                1225,
                117,
                218,
                345
              ],
              "pivot": [
                108,
                341
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-heavy",
              "rect": [
                75,
                598,
                254,
                341
              ],
              "pivot": [
                143,
                337
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-heavy",
              "rect": [
                430,
                609,
                302,
                330
              ],
              "pivot": [
                182.5,
                326
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-heavy",
              "rect": [
                839,
                647,
                268,
                296
              ],
              "pivot": [
                140,
                292
              ],
              "durationTicks": 1
            },
            {
              "pageId": "berserker-heavy",
              "rect": [
                1224,
                596,
                226,
                347
              ],
              "pivot": [
                110,
                343
              ],
              "durationTicks": 1
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "wolf",
    "bodyHeightPx": 405,
    "pageBodyHeightPx": {
      "wolf-repair-idle-cannons": 405,
      "wolf-repair-crouch-cannons": 400,
      "wolf-repair-guard-blades": 400,
      "wolf-hurt": 420,
      "wolf-repair-light-spacing": 250,
      "wolf-repair-heavy-hand": 405
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "wolf-pit-v34",
      "characterId": "wolf",
      "variantId": "the-pit-v34-v23-identity",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "wolf-repair-idle-cannons",
          "src": "/game/sprites/v34/pit/wolf/wolf-repair-idle-cannons-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "wolf-repair-crouch-cannons",
          "src": "/game/sprites/v34/pit/wolf/wolf-repair-crouch-cannons-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "wolf-repair-guard-blades",
          "src": "/game/sprites/v34/pit/wolf/wolf-repair-guard-blades-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "wolf-hurt",
          "src": "/game/sprites/v34/pit/wolf/wolf-hurt-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "wolf-repair-light-spacing",
          "src": "/game/sprites/v34/pit/wolf/wolf-repair-light-spacing-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "wolf-repair-heavy-hand",
          "src": "/game/sprites/v34/pit/wolf/wolf-repair-heavy-hand-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-idle-cannons",
              "rect": [
                65,
                44,
                274,
                435
              ],
              "pivot": [
                137,
                431
              ],
              "durationTicks": 10
            },
            {
              "pageId": "wolf-repair-idle-cannons",
              "rect": [
                451,
                45,
                272,
                435
              ],
              "pivot": [
                133.5,
                431
              ],
              "durationTicks": 10
            },
            {
              "pageId": "wolf-repair-idle-cannons",
              "rect": [
                828,
                48,
                268,
                432
              ],
              "pivot": [
                136.5,
                428
              ],
              "durationTicks": 10
            },
            {
              "pageId": "wolf-repair-idle-cannons",
              "rect": [
                1215,
                47,
                257,
                433
              ],
              "pivot": [
                135,
                429
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-idle-cannons",
              "rect": [
                62,
                547,
                261,
                438
              ],
              "pivot": [
                126,
                434
              ],
              "durationTicks": 10
            },
            {
              "pageId": "wolf-repair-idle-cannons",
              "rect": [
                436,
                546,
                267,
                439
              ],
              "pivot": [
                134.5,
                435
              ],
              "durationTicks": 10
            },
            {
              "pageId": "wolf-repair-idle-cannons",
              "rect": [
                823,
                561,
                268,
                424
              ],
              "pivot": [
                132,
                420
              ],
              "durationTicks": 10
            },
            {
              "pageId": "wolf-repair-idle-cannons",
              "rect": [
                1218,
                546,
                256,
                439
              ],
              "pivot": [
                121,
                435
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-crouch-cannons",
              "rect": [
                32,
                63,
                306,
                412
              ],
              "pivot": [
                148,
                408
              ],
              "durationTicks": 2
            },
            {
              "pageId": "wolf-repair-crouch-cannons",
              "rect": [
                412,
                106,
                315,
                369
              ],
              "pivot": [
                149.5,
                365
              ],
              "durationTicks": 2
            },
            {
              "pageId": "wolf-repair-crouch-cannons",
              "rect": [
                806,
                184,
                287,
                289
              ],
              "pivot": [
                158,
                285
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-crouch-cannons",
              "rect": [
                42,
                543,
                310,
                412
              ],
              "pivot": [
                161.5,
                408
              ],
              "durationTicks": 2
            },
            {
              "pageId": "wolf-repair-crouch-cannons",
              "rect": [
                425,
                586,
                312,
                369
              ],
              "pivot": [
                164.5,
                365
              ],
              "durationTicks": 2
            },
            {
              "pageId": "wolf-repair-crouch-cannons",
              "rect": [
                821,
                662,
                291,
                293
              ],
              "pivot": [
                131.5,
                289
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-guard-blades",
              "rect": [
                60,
                56,
                292,
                416
              ],
              "pivot": [
                137,
                412
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-repair-guard-blades",
              "rect": [
                415,
                56,
                300,
                417
              ],
              "pivot": [
                143,
                413
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-repair-guard-blades",
              "rect": [
                813,
                85,
                313,
                389
              ],
              "pivot": [
                137.5,
                385
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-repair-guard-blades",
              "rect": [
                1184,
                56,
                302,
                418
              ],
              "pivot": [
                140,
                414
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-guard-blades",
              "rect": [
                61,
                538,
                291,
                415
              ],
              "pivot": [
                146,
                411
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-repair-guard-blades",
              "rect": [
                443,
                538,
                288,
                416
              ],
              "pivot": [
                143.5,
                412
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-repair-guard-blades",
              "rect": [
                810,
                566,
                297,
                389
              ],
              "pivot": [
                157,
                385
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-repair-guard-blades",
              "rect": [
                1192,
                538,
                296,
                416
              ],
              "pivot": [
                153,
                412
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-hurt",
              "rect": [
                45,
                45,
                260,
                436
              ],
              "pivot": [
                137.5,
                432
              ],
              "durationTicks": 2
            },
            {
              "pageId": "wolf-hurt",
              "rect": [
                430,
                61,
                290,
                416
              ],
              "pivot": [
                160,
                412
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-hurt",
              "rect": [
                826,
                68,
                246,
                412
              ],
              "pivot": [
                122.5,
                408
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-hurt",
              "rect": [
                1221,
                44,
                266,
                437
              ],
              "pivot": [
                144,
                433
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-hurt",
              "rect": [
                48,
                539,
                263,
                432
              ],
              "pivot": [
                125,
                428
              ],
              "durationTicks": 2
            },
            {
              "pageId": "wolf-hurt",
              "rect": [
                425,
                553,
                288,
                415
              ],
              "pivot": [
                122.5,
                411
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-hurt",
              "rect": [
                838,
                559,
                255,
                413
              ],
              "pivot": [
                127,
                409
              ],
              "durationTicks": 3
            },
            {
              "pageId": "wolf-hurt",
              "rect": [
                1212,
                536,
                274,
                435
              ],
              "pivot": [
                127,
                431
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-light-spacing",
              "rect": [
                93,
                137,
                181,
                273
              ],
              "pivot": [
                86.5,
                269
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-light-spacing",
              "rect": [
                472,
                136,
                265,
                274
              ],
              "pivot": [
                87,
                270
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-light-spacing",
              "rect": [
                851,
                137,
                186,
                273
              ],
              "pivot": [
                88,
                269
              ],
              "durationTicks": 1
            },
            {
              "pageId": "wolf-repair-light-spacing",
              "rect": [
                1247,
                137,
                187,
                273
              ],
              "pivot": [
                88,
                269
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-light-spacing",
              "rect": [
                98,
                610,
                187,
                278
              ],
              "pivot": [
                95.5,
                274
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-light-spacing",
              "rect": [
                419,
                610,
                271,
                278
              ],
              "pivot": [
                177.5,
                274
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-light-spacing",
              "rect": [
                861,
                610,
                196,
                278
              ],
              "pivot": [
                104.5,
                274
              ],
              "durationTicks": 1
            },
            {
              "pageId": "wolf-repair-light-spacing",
              "rect": [
                1238,
                610,
                194,
                278
              ],
              "pivot": [
                102,
                274
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-heavy-hand",
              "rect": [
                28,
                569,
                339,
                376
              ],
              "pivot": [
                181.5,
                372
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-heavy-hand",
              "rect": [
                377,
                567,
                410,
                382
              ],
              "pivot": [
                250.5,
                378
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-repair-heavy-hand",
              "rect": [
                835,
                568,
                313,
                379
              ],
              "pivot": [
                172.5,
                375
              ],
              "durationTicks": 1
            },
            {
              "pageId": "wolf-repair-heavy-hand",
              "rect": [
                1238,
                541,
                222,
                413
              ],
              "pivot": [
                109.5,
                409
              ],
              "durationTicks": 1
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "feral-hunter",
    "bodyHeightPx": 410,
    "pageBodyHeightPx": {
      "feral-hunter-idle": 410,
      "feral-hunter-repair-walk-forward-cycle": 405,
      "feral-hunter-repair-walk-backward-contacts": 405,
      "feral-hunter-crouch": 410,
      "feral-hunter-guard": 405,
      "feral-hunter-hurt": 400,
      "feral-hunter-light": 390,
      "feral-hunter-repair-medium-spacing": 282,
      "feral-hunter-heavy": 370
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "feral-hunter-pit-v34",
      "characterId": "feral-hunter",
      "variantId": "the-pit-v34-v28-identity",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "feral-hunter-idle",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-idle-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "feral-hunter-repair-walk-forward-cycle",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-repair-walk-forward-cycle-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "feral-hunter-repair-walk-backward-contacts",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-repair-walk-backward-contacts-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "feral-hunter-crouch",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-crouch-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "feral-hunter-guard",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-guard-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "feral-hunter-hurt",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-hurt-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "feral-hunter-light",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-light-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "feral-hunter-repair-medium-spacing",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-repair-medium-spacing-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "feral-hunter-heavy",
          "src": "/game/sprites/v34/pit/feral-hunter/feral-hunter-heavy-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-idle",
              "rect": [
                88,
                54,
                230,
                424
              ],
              "pivot": [
                119.5,
                420
              ],
              "durationTicks": 10
            },
            {
              "pageId": "feral-hunter-idle",
              "rect": [
                467,
                51,
                225,
                428
              ],
              "pivot": [
                116,
                424
              ],
              "durationTicks": 10
            },
            {
              "pageId": "feral-hunter-idle",
              "rect": [
                841,
                64,
                225,
                414
              ],
              "pivot": [
                114.5,
                410
              ],
              "durationTicks": 10
            },
            {
              "pageId": "feral-hunter-idle",
              "rect": [
                1200,
                53,
                234,
                426
              ],
              "pivot": [
                124,
                422
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-idle",
              "rect": [
                96,
                539,
                237,
                422
              ],
              "pivot": [
                114,
                418
              ],
              "durationTicks": 10
            },
            {
              "pageId": "feral-hunter-idle",
              "rect": [
                477,
                537,
                235,
                424
              ],
              "pivot": [
                112,
                420
              ],
              "durationTicks": 10
            },
            {
              "pageId": "feral-hunter-idle",
              "rect": [
                845,
                559,
                231,
                402
              ],
              "pivot": [
                111.5,
                398
              ],
              "durationTicks": 10
            },
            {
              "pageId": "feral-hunter-idle",
              "rect": [
                1218,
                540,
                233,
                421
              ],
              "pivot": [
                111,
                417
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "walk",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-walk-forward-cycle",
              "rect": [
                87,
                54,
                282,
                418
              ],
              "pivot": [
                153,
                414
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-forward-cycle",
              "rect": [
                471,
                54,
                255,
                415
              ],
              "pivot": [
                139,
                411
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-forward-cycle",
              "rect": [
                817,
                54,
                261,
                418
              ],
              "pivot": [
                150,
                414
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-forward-cycle",
              "rect": [
                1202,
                54,
                249,
                417
              ],
              "pivot": [
                136,
                413
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-walk-forward-cycle",
              "rect": [
                90,
                534,
                282,
                417
              ],
              "pivot": [
                126,
                413
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-forward-cycle",
              "rect": [
                462,
                535,
                259,
                412
              ],
              "pivot": [
                122,
                408
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-forward-cycle",
              "rect": [
                811,
                534,
                261,
                416
              ],
              "pivot": [
                142,
                412
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-forward-cycle",
              "rect": [
                1191,
                534,
                260,
                417
              ],
              "pivot": [
                125,
                413
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-walk-backward-contacts",
              "rect": [
                91,
                59,
                265,
                411
              ],
              "pivot": [
                142,
                407
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-backward-contacts",
              "rect": [
                1199,
                62,
                223,
                408
              ],
              "pivot": [
                131,
                404
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-backward-contacts",
              "rect": [
                835,
                60,
                237,
                410
              ],
              "pivot": [
                140,
                406
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-backward-contacts",
              "rect": [
                476,
                59,
                223,
                408
              ],
              "pivot": [
                125,
                404
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-walk-backward-contacts",
              "rect": [
                113,
                536,
                257,
                415
              ],
              "pivot": [
                97,
                411
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-backward-contacts",
              "rect": [
                1209,
                536,
                237,
                415
              ],
              "pivot": [
                106,
                411
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-backward-contacts",
              "rect": [
                817,
                538,
                247,
                411
              ],
              "pivot": [
                133,
                407
              ],
              "durationTicks": 8
            },
            {
              "pageId": "feral-hunter-repair-walk-backward-contacts",
              "rect": [
                474,
                536,
                235,
                410
              ],
              "pivot": [
                101,
                406
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-crouch",
              "rect": [
                72,
                56,
                277,
                427
              ],
              "pivot": [
                135,
                423
              ],
              "durationTicks": 2
            },
            {
              "pageId": "feral-hunter-crouch",
              "rect": [
                447,
                131,
                272,
                348
              ],
              "pivot": [
                134.5,
                344
              ],
              "durationTicks": 2
            },
            {
              "pageId": "feral-hunter-crouch",
              "rect": [
                823,
                195,
                262,
                279
              ],
              "pivot": [
                106,
                275
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-crouch",
              "rect": [
                75,
                533,
                280,
                427
              ],
              "pivot": [
                137.5,
                423
              ],
              "durationTicks": 2
            },
            {
              "pageId": "feral-hunter-crouch",
              "rect": [
                450,
                594,
                271,
                360
              ],
              "pivot": [
                135.5,
                356
              ],
              "durationTicks": 2
            },
            {
              "pageId": "feral-hunter-crouch",
              "rect": [
                819,
                660,
                254,
                289
              ],
              "pivot": [
                145.5,
                285
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-guard",
              "rect": [
                71,
                57,
                275,
                415
              ],
              "pivot": [
                136,
                411
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-guard",
              "rect": [
                469,
                58,
                276,
                414
              ],
              "pivot": [
                129.5,
                410
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-guard",
              "rect": [
                830,
                72,
                272,
                401
              ],
              "pivot": [
                128,
                397
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-guard",
              "rect": [
                1192,
                71,
                293,
                402
              ],
              "pivot": [
                129.5,
                398
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-guard",
              "rect": [
                82,
                536,
                269,
                413
              ],
              "pivot": [
                134,
                409
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-guard",
              "rect": [
                469,
                537,
                275,
                415
              ],
              "pivot": [
                145,
                411
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-guard",
              "rect": [
                817,
                552,
                277,
                400
              ],
              "pivot": [
                144.5,
                396
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-guard",
              "rect": [
                1177,
                545,
                292,
                408
              ],
              "pivot": [
                159,
                404
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-hurt",
              "rect": [
                83,
                84,
                245,
                384
              ],
              "pivot": [
                127,
                380
              ],
              "durationTicks": 2
            },
            {
              "pageId": "feral-hunter-hurt",
              "rect": [
                460,
                92,
                243,
                374
              ],
              "pivot": [
                126,
                370
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-hurt",
              "rect": [
                807,
                85,
                247,
                383
              ],
              "pivot": [
                128.5,
                379
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-hurt",
              "rect": [
                1199,
                62,
                243,
                406
              ],
              "pivot": [
                117.5,
                402
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-hurt",
              "rect": [
                91,
                548,
                242,
                386
              ],
              "pivot": [
                118,
                382
              ],
              "durationTicks": 2
            },
            {
              "pageId": "feral-hunter-hurt",
              "rect": [
                467,
                555,
                243,
                379
              ],
              "pivot": [
                116.5,
                375
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-hurt",
              "rect": [
                836,
                552,
                244,
                383
              ],
              "pivot": [
                123,
                379
              ],
              "durationTicks": 3
            },
            {
              "pageId": "feral-hunter-hurt",
              "rect": [
                1201,
                531,
                248,
                404
              ],
              "pivot": [
                126.5,
                400
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-light",
              "rect": [
                59,
                69,
                277,
                397
              ],
              "pivot": [
                126,
                393
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-light",
              "rect": [
                411,
                71,
                373,
                395
              ],
              "pivot": [
                135.5,
                391
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-light",
              "rect": [
                796,
                71,
                274,
                396
              ],
              "pivot": [
                128,
                392
              ],
              "durationTicks": 1
            },
            {
              "pageId": "feral-hunter-light",
              "rect": [
                1191,
                71,
                277,
                396
              ],
              "pivot": [
                123.5,
                392
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-light",
              "rect": [
                66,
                546,
                280,
                400
              ],
              "pivot": [
                147,
                396
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-light",
              "rect": [
                373,
                546,
                366,
                401
              ],
              "pivot": [
                229.5,
                397
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-light",
              "rect": [
                823,
                546,
                282,
                400
              ],
              "pivot": [
                148.5,
                396
              ],
              "durationTicks": 1
            },
            {
              "pageId": "feral-hunter-light",
              "rect": [
                1198,
                546,
                279,
                400
              ],
              "pivot": [
                148,
                396
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-medium-spacing",
              "rect": [
                76,
                139,
                217,
                293
              ],
              "pivot": [
                100,
                289
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-medium-spacing",
              "rect": [
                423,
                144,
                311,
                288
              ],
              "pivot": [
                109,
                284
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-medium-spacing",
              "rect": [
                828,
                141,
                228,
                291
              ],
              "pivot": [
                103.5,
                287
              ],
              "durationTicks": 1
            },
            {
              "pageId": "feral-hunter-repair-medium-spacing",
              "rect": [
                1225,
                137,
                202,
                295
              ],
              "pivot": [
                94.5,
                291
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-medium-spacing",
              "rect": [
                462,
                600,
                234,
                296
              ],
              "pivot": [
                125.5,
                292
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-medium-spacing",
              "rect": [
                789,
                602,
                317,
                294
              ],
              "pivot": [
                203.5,
                290
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-repair-medium-spacing",
              "rect": [
                1239,
                600,
                222,
                296
              ],
              "pivot": [
                117,
                292
              ],
              "durationTicks": 1
            },
            {
              "pageId": "feral-hunter-repair-medium-spacing",
              "rect": [
                93,
                599,
                216,
                297
              ],
              "pivot": [
                115,
                293
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-heavy",
              "rect": [
                47,
                101,
                303,
                366
              ],
              "pivot": [
                134,
                362
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-heavy",
              "rect": [
                418,
                106,
                358,
                359
              ],
              "pivot": [
                134.5,
                355
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-heavy",
              "rect": [
                805,
                119,
                295,
                346
              ],
              "pivot": [
                138,
                342
              ],
              "durationTicks": 1
            },
            {
              "pageId": "feral-hunter-heavy",
              "rect": [
                1214,
                94,
                262,
                378
              ],
              "pivot": [
                117.5,
                374
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-heavy",
              "rect": [
                62,
                571,
                301,
                365
              ],
              "pivot": [
                165,
                361
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-heavy",
              "rect": [
                390,
                574,
                356,
                359
              ],
              "pivot": [
                222,
                355
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "feral-hunter-heavy",
              "rect": [
                809,
                584,
                301,
                350
              ],
              "pivot": [
                162,
                346
              ],
              "durationTicks": 1
            },
            {
              "pageId": "feral-hunter-heavy",
              "rect": [
                1220,
                567,
                256,
                369
              ],
              "pivot": [
                135,
                365
              ],
              "durationTicks": 1
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "scar",
    "bodyHeightPx": 410,
    "pageBodyHeightPx": {
      "scar-idle": 410,
      "scar-repair-walk-backward-support": 405,
      "scar-crouch": 365,
      "scar-guard": 400,
      "scar-hurt": 385,
      "scar-repair-light-mount": 365,
      "scar-medium": 332,
      "scar-heavy": 390
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "scar-pit-v34",
      "characterId": "scar",
      "variantId": "the-pit-v34-v5-identity",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "scar-idle",
          "src": "/game/sprites/v34/pit/scar/scar-idle-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "scar-repair-walk-backward-support",
          "src": "/game/sprites/v34/pit/scar/scar-repair-walk-backward-support-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "scar-crouch",
          "src": "/game/sprites/v34/pit/scar/scar-crouch-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "scar-guard",
          "src": "/game/sprites/v34/pit/scar/scar-guard-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "scar-hurt",
          "src": "/game/sprites/v34/pit/scar/scar-hurt-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "scar-repair-light-mount",
          "src": "/game/sprites/v34/pit/scar/scar-repair-light-mount-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "scar-medium",
          "src": "/game/sprites/v34/pit/scar/scar-medium-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "scar-heavy",
          "src": "/game/sprites/v34/pit/scar/scar-heavy-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-idle",
              "rect": [
                72,
                27,
                257,
                446
              ],
              "pivot": [
                127.5,
                442
              ],
              "durationTicks": 10
            },
            {
              "pageId": "scar-idle",
              "rect": [
                461,
                26,
                243,
                447
              ],
              "pivot": [
                124.5,
                443
              ],
              "durationTicks": 10
            },
            {
              "pageId": "scar-idle",
              "rect": [
                832,
                31,
                249,
                442
              ],
              "pivot": [
                119,
                438
              ],
              "durationTicks": 10
            },
            {
              "pageId": "scar-idle",
              "rect": [
                1205,
                26,
                250,
                447
              ],
              "pivot": [
                126,
                443
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-idle",
              "rect": [
                73,
                540,
                247,
                441
              ],
              "pivot": [
                120.5,
                437
              ],
              "durationTicks": 10
            },
            {
              "pageId": "scar-idle",
              "rect": [
                451,
                539,
                241,
                442
              ],
              "pivot": [
                119,
                438
              ],
              "durationTicks": 10
            },
            {
              "pageId": "scar-idle",
              "rect": [
                830,
                543,
                248,
                436
              ],
              "pivot": [
                128,
                432
              ],
              "durationTicks": 10
            },
            {
              "pageId": "scar-idle",
              "rect": [
                1211,
                540,
                238,
                441
              ],
              "pivot": [
                119,
                437
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                45,
                39,
                265,
                432
              ],
              "pivot": [
                140,
                428
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                430,
                29,
                261,
                442
              ],
              "pivot": [
                137,
                438
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                810,
                38,
                258,
                433
              ],
              "pivot": [
                136,
                429
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                1201,
                32,
                265,
                438
              ],
              "pivot": [
                119,
                434
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                61,
                537,
                256,
                436
              ],
              "pivot": [
                139,
                432
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                426,
                531,
                271,
                441
              ],
              "pivot": [
                159,
                437
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                825,
                537,
                256,
                434
              ],
              "pivot": [
                135,
                430
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                1206,
                531,
                255,
                438
              ],
              "pivot": [
                130,
                434
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-crouch",
              "rect": [
                54,
                43,
                256,
                425
              ],
              "pivot": [
                127.5,
                421
              ],
              "durationTicks": 2
            },
            {
              "pageId": "scar-crouch",
              "rect": [
                453,
                82,
                251,
                386
              ],
              "pivot": [
                120.5,
                382
              ],
              "durationTicks": 2
            },
            {
              "pageId": "scar-crouch",
              "rect": [
                852,
                109,
                226,
                359
              ],
              "pivot": [
                105.5,
                355
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-crouch",
              "rect": [
                57,
                541,
                249,
                410
              ],
              "pivot": [
                129,
                406
              ],
              "durationTicks": 2
            },
            {
              "pageId": "scar-crouch",
              "rect": [
                444,
                567,
                247,
                384
              ],
              "pivot": [
                131,
                380
              ],
              "durationTicks": 2
            },
            {
              "pageId": "scar-crouch",
              "rect": [
                825,
                593,
                243,
                356
              ],
              "pivot": [
                126,
                352
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-guard",
              "rect": [
                44,
                25,
                262,
                448
              ],
              "pivot": [
                137,
                444
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-guard",
              "rect": [
                456,
                25,
                251,
                446
              ],
              "pivot": [
                120,
                442
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-guard",
              "rect": [
                835,
                25,
                262,
                447
              ],
              "pivot": [
                123.5,
                443
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-guard",
              "rect": [
                1208,
                24,
                250,
                448
              ],
              "pivot": [
                124,
                444
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-guard",
              "rect": [
                69,
                537,
                255,
                438
              ],
              "pivot": [
                121.5,
                434
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-guard",
              "rect": [
                451,
                531,
                244,
                444
              ],
              "pivot": [
                121.5,
                440
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-guard",
              "rect": [
                834,
                532,
                249,
                444
              ],
              "pivot": [
                124.5,
                440
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-guard",
              "rect": [
                1220,
                534,
                251,
                441
              ],
              "pivot": [
                125.5,
                437
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-hurt",
              "rect": [
                87,
                55,
                239,
                412
              ],
              "pivot": [
                117,
                408
              ],
              "durationTicks": 2
            },
            {
              "pageId": "scar-hurt",
              "rect": [
                477,
                54,
                237,
                413
              ],
              "pivot": [
                121,
                409
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-hurt",
              "rect": [
                837,
                54,
                237,
                413
              ],
              "pivot": [
                119.5,
                409
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-hurt",
              "rect": [
                1213,
                48,
                241,
                418
              ],
              "pivot": [
                127,
                414
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-hurt",
              "rect": [
                102,
                553,
                238,
                412
              ],
              "pivot": [
                120,
                408
              ],
              "durationTicks": 2
            },
            {
              "pageId": "scar-hurt",
              "rect": [
                462,
                553,
                243,
                410
              ],
              "pivot": [
                119,
                406
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-hurt",
              "rect": [
                842,
                553,
                241,
                412
              ],
              "pivot": [
                117,
                408
              ],
              "durationTicks": 3
            },
            {
              "pageId": "scar-hurt",
              "rect": [
                1220,
                546,
                242,
                419
              ],
              "pivot": [
                118,
                415
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-light-mount",
              "rect": [
                48,
                53,
                251,
                393
              ],
              "pivot": [
                114,
                389
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-light-mount",
              "rect": [
                397,
                46,
                329,
                400
              ],
              "pivot": [
                122,
                396
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-light-mount",
              "rect": [
                810,
                53,
                243,
                393
              ],
              "pivot": [
                113,
                389
              ],
              "durationTicks": 1
            },
            {
              "pageId": "scar-repair-light-mount",
              "rect": [
                1211,
                50,
                218,
                396
              ],
              "pivot": [
                106,
                392
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-light-mount",
              "rect": [
                77,
                541,
                249,
                393
              ],
              "pivot": [
                130.5,
                389
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-light-mount",
              "rect": [
                402,
                538,
                337,
                396
              ],
              "pivot": [
                211,
                392
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-light-mount",
              "rect": [
                859,
                541,
                243,
                393
              ],
              "pivot": [
                124.5,
                389
              ],
              "durationTicks": 1
            },
            {
              "pageId": "scar-repair-light-mount",
              "rect": [
                1237,
                541,
                217,
                393
              ],
              "pivot": [
                108.5,
                389
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-medium",
              "rect": [
                64,
                55,
                268,
                397
              ],
              "pivot": [
                124,
                393
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-medium",
              "rect": [
                414,
                64,
                407,
                388
              ],
              "pivot": [
                153,
                384
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-medium",
              "rect": [
                842,
                55,
                249,
                398
              ],
              "pivot": [
                124,
                394
              ],
              "durationTicks": 1
            },
            {
              "pageId": "scar-medium",
              "rect": [
                1247,
                58,
                221,
                395
              ],
              "pivot": [
                110,
                391
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-medium",
              "rect": [
                69,
                549,
                256,
                389
              ],
              "pivot": [
                127.5,
                385
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-medium",
              "rect": [
                342,
                565,
                405,
                371
              ],
              "pivot": [
                257,
                367
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-medium",
              "rect": [
                837,
                555,
                266,
                383
              ],
              "pivot": [
                132.5,
                379
              ],
              "durationTicks": 1
            },
            {
              "pageId": "scar-medium",
              "rect": [
                1244,
                558,
                228,
                381
              ],
              "pivot": [
                113.5,
                377
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-heavy",
              "rect": [
                40,
                37,
                304,
                432
              ],
              "pivot": [
                147,
                428
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-heavy",
              "rect": [
                410,
                46,
                336,
                422
              ],
              "pivot": [
                142,
                418
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-heavy",
              "rect": [
                787,
                48,
                308,
                421
              ],
              "pivot": [
                140,
                417
              ],
              "durationTicks": 1
            },
            {
              "pageId": "scar-heavy",
              "rect": [
                1203,
                39,
                289,
                431
              ],
              "pivot": [
                133,
                427
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-heavy",
              "rect": [
                1188,
                541,
                310,
                429
              ],
              "pivot": [
                159.5,
                425
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-heavy",
              "rect": [
                782,
                550,
                339,
                420
              ],
              "pivot": [
                194.5,
                416
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-heavy",
              "rect": [
                437,
                549,
                306,
                420
              ],
              "pivot": [
                162,
                416
              ],
              "durationTicks": 1
            },
            {
              "pageId": "scar-heavy",
              "rect": [
                44,
                544,
                291,
                425
              ],
              "pivot": [
                156,
                421
              ],
              "durationTicks": 1
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "celtic",
    "bodyHeightPx": 410,
    "pageBodyHeightPx": {
      "celtic-repair-walk-backward-support": 375,
      "celtic-crouch": 368,
      "celtic-repair-guard-hand": 382,
      "celtic-repair-hurt-armor": 380,
      "celtic-repair-light-recovery": 355,
      "celtic-medium": 370,
      "celtic-heavy": 370
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "celtic-pit-v34",
      "characterId": "celtic",
      "variantId": "the-pit-v34-v5-identity",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "celtic-repair-walk-backward-support",
          "src": "/game/sprites/v34/pit/celtic/celtic-repair-walk-backward-support-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "celtic-crouch",
          "src": "/game/sprites/v34/pit/celtic/celtic-crouch-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "celtic-repair-guard-hand",
          "src": "/game/sprites/v34/pit/celtic/celtic-repair-guard-hand-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "celtic-repair-hurt-armor",
          "src": "/game/sprites/v34/pit/celtic/celtic-repair-hurt-armor-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "celtic-repair-light-recovery",
          "src": "/game/sprites/v34/pit/celtic/celtic-repair-light-recovery-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "celtic-medium",
          "src": "/game/sprites/v34/pit/celtic/celtic-medium-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "celtic-heavy",
          "src": "/game/sprites/v34/pit/celtic/celtic-heavy-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "walk-backward",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-walk-backward-support",
              "rect": [
                65,
                73,
                292,
                387
              ],
              "pivot": [
                106,
                383
              ],
              "durationTicks": 8
            },
            {
              "pageId": "celtic-repair-walk-backward-support",
              "rect": [
                476,
                57,
                236,
                403
              ],
              "pivot": [
                76,
                399
              ],
              "durationTicks": 8
            },
            {
              "pageId": "celtic-repair-walk-backward-support",
              "rect": [
                845,
                60,
                253,
                396
              ],
              "pivot": [
                98,
                392
              ],
              "durationTicks": 8
            },
            {
              "pageId": "celtic-repair-walk-backward-support",
              "rect": [
                1230,
                57,
                248,
                399
              ],
              "pivot": [
                100,
                395
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-walk-backward-support",
              "rect": [
                67,
                556,
                260,
                387
              ],
              "pivot": [
                151,
                383
              ],
              "durationTicks": 8
            },
            {
              "pageId": "celtic-repair-walk-backward-support",
              "rect": [
                454,
                536,
                237,
                405
              ],
              "pivot": [
                147,
                401
              ],
              "durationTicks": 8
            },
            {
              "pageId": "celtic-repair-walk-backward-support",
              "rect": [
                831,
                543,
                246,
                398
              ],
              "pivot": [
                152,
                394
              ],
              "durationTicks": 8
            },
            {
              "pageId": "celtic-repair-walk-backward-support",
              "rect": [
                1221,
                542,
                240,
                398
              ],
              "pivot": [
                138,
                394
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-crouch",
              "rect": [
                77,
                64,
                258,
                401
              ],
              "pivot": [
                117,
                397
              ],
              "durationTicks": 2
            },
            {
              "pageId": "celtic-crouch",
              "rect": [
                470,
                86,
                237,
                379
              ],
              "pivot": [
                111.5,
                375
              ],
              "durationTicks": 2
            },
            {
              "pageId": "celtic-crouch",
              "rect": [
                853,
                121,
                206,
                344
              ],
              "pivot": [
                102,
                340
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-crouch",
              "rect": [
                82,
                559,
                236,
                387
              ],
              "pivot": [
                123,
                383
              ],
              "durationTicks": 2
            },
            {
              "pageId": "celtic-crouch",
              "rect": [
                465,
                570,
                230,
                376
              ],
              "pivot": [
                121,
                372
              ],
              "durationTicks": 2
            },
            {
              "pageId": "celtic-crouch",
              "rect": [
                848,
                605,
                211,
                341
              ],
              "pivot": [
                109.5,
                337
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-guard-hand",
              "rect": [
                32,
                51,
                296,
                423
              ],
              "pivot": [
                146.5,
                419
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-guard-hand",
              "rect": [
                436,
                46,
                255,
                429
              ],
              "pivot": [
                123.5,
                425
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-guard-hand",
              "rect": [
                820,
                49,
                259,
                426
              ],
              "pivot": [
                121.5,
                422
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-guard-hand",
              "rect": [
                1205,
                47,
                250,
                428
              ],
              "pivot": [
                120.5,
                424
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-guard-hand",
              "rect": [
                52,
                554,
                277,
                418
              ],
              "pivot": [
                133,
                414
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-guard-hand",
              "rect": [
                450,
                552,
                258,
                419
              ],
              "pivot": [
                132,
                415
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-guard-hand",
              "rect": [
                831,
                552,
                258,
                420
              ],
              "pivot": [
                132.5,
                416
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-guard-hand",
              "rect": [
                1232,
                551,
                246,
                421
              ],
              "pivot": [
                123.5,
                417
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-hurt-armor",
              "rect": [
                60,
                61,
                312,
                405
              ],
              "pivot": [
                117,
                401
              ],
              "durationTicks": 2
            },
            {
              "pageId": "celtic-repair-hurt-armor",
              "rect": [
                434,
                78,
                315,
                388
              ],
              "pivot": [
                115.5,
                384
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-hurt-armor",
              "rect": [
                806,
                73,
                303,
                393
              ],
              "pivot": [
                116.5,
                389
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-hurt-armor",
              "rect": [
                1194,
                60,
                300,
                406
              ],
              "pivot": [
                123.5,
                402
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-hurt-armor",
              "rect": [
                42,
                568,
                294,
                394
              ],
              "pivot": [
                167,
                390
              ],
              "durationTicks": 2
            },
            {
              "pageId": "celtic-repair-hurt-armor",
              "rect": [
                405,
                578,
                308,
                384
              ],
              "pivot": [
                194,
                380
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-hurt-armor",
              "rect": [
                789,
                575,
                304,
                387
              ],
              "pivot": [
                191.5,
                383
              ],
              "durationTicks": 3
            },
            {
              "pageId": "celtic-repair-hurt-armor",
              "rect": [
                1177,
                566,
                291,
                396
              ],
              "pivot": [
                173.5,
                392
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-light-recovery",
              "rect": [
                70,
                46,
                220,
                409
              ],
              "pivot": [
                100.5,
                405
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-light-recovery",
              "rect": [
                421,
                47,
                330,
                408
              ],
              "pivot": [
                122,
                404
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-light-recovery",
              "rect": [
                1218,
                46,
                222,
                409
              ],
              "pivot": [
                107.5,
                405
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-light-recovery",
              "rect": [
                90,
                558,
                217,
                408
              ],
              "pivot": [
                114,
                404
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-light-recovery",
              "rect": [
                390,
                557,
                335,
                409
              ],
              "pivot": [
                213,
                405
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-repair-light-recovery",
              "rect": [
                1234,
                558,
                228,
                409
              ],
              "pivot": [
                113.5,
                405
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-medium",
              "rect": [
                49,
                37,
                252,
                428
              ],
              "pivot": [
                115,
                424
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-medium",
              "rect": [
                415,
                39,
                412,
                425
              ],
              "pivot": [
                139,
                421
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-medium",
              "rect": [
                1250,
                38,
                226,
                429
              ],
              "pivot": [
                105.5,
                425
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-medium",
              "rect": [
                68,
                542,
                253,
                426
              ],
              "pivot": [
                130,
                422
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-medium",
              "rect": [
                355,
                543,
                402,
                426
              ],
              "pivot": [
                259.5,
                422
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-medium",
              "rect": [
                1255,
                541,
                227,
                429
              ],
              "pivot": [
                118.5,
                425
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-heavy",
              "rect": [
                37,
                74,
                340,
                392
              ],
              "pivot": [
                132.5,
                388
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-heavy",
              "rect": [
                412,
                37,
                355,
                430
              ],
              "pivot": [
                139.5,
                426
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-heavy",
              "rect": [
                796,
                51,
                307,
                416
              ],
              "pivot": [
                129,
                412
              ],
              "durationTicks": 1
            },
            {
              "pageId": "celtic-heavy",
              "rect": [
                1213,
                43,
                291,
                424
              ],
              "pivot": [
                117.5,
                420
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-heavy",
              "rect": [
                31,
                560,
                317,
                401
              ],
              "pivot": [
                181,
                397
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-heavy",
              "rect": [
                385,
                538,
                353,
                427
              ],
              "pivot": [
                210,
                423
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-heavy",
              "rect": [
                812,
                560,
                313,
                406
              ],
              "pivot": [
                179.5,
                402
              ],
              "durationTicks": 1
            },
            {
              "pageId": "celtic-heavy",
              "rect": [
                1187,
                545,
                289,
                420
              ],
              "pivot": [
                171,
                416
              ],
              "durationTicks": 1
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "tracker",
    "bodyHeightPx": 410,
    "pageBodyHeightPx": {
      "tracker-idle": 410,
      "tracker-repair-walk-backward-contact": 400,
      "tracker-crouch": 400,
      "tracker-repair-guard-hand": 425,
      "tracker-hurt": 423,
      "tracker-light": 380,
      "tracker-repair-medium-spacing": 300,
      "tracker-heavy": 370
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "tracker-pit-v34",
      "characterId": "tracker",
      "variantId": "predators-2010-v5-presentation",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "tracker-idle",
          "src": "/game/sprites/v34/pit/tracker/tracker-idle-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "tracker-repair-walk-backward-contact",
          "src": "/game/sprites/v34/pit/tracker/tracker-repair-walk-backward-contact-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "tracker-crouch",
          "src": "/game/sprites/v34/pit/tracker/tracker-crouch-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "tracker-repair-guard-hand",
          "src": "/game/sprites/v34/pit/tracker/tracker-repair-guard-hand-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "tracker-hurt",
          "src": "/game/sprites/v34/pit/tracker/tracker-hurt-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "tracker-light",
          "src": "/game/sprites/v34/pit/tracker/tracker-light-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "tracker-repair-medium-spacing",
          "src": "/game/sprites/v34/pit/tracker/tracker-repair-medium-spacing-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "tracker-heavy",
          "src": "/game/sprites/v34/pit/tracker/tracker-heavy-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-idle",
              "rect": [
                74,
                46,
                247,
                415
              ],
              "pivot": [
                129,
                411
              ],
              "durationTicks": 10
            },
            {
              "pageId": "tracker-idle",
              "rect": [
                444,
                39,
                252,
                422
              ],
              "pivot": [
                138.5,
                418
              ],
              "durationTicks": 10
            },
            {
              "pageId": "tracker-idle",
              "rect": [
                830,
                61,
                240,
                400
              ],
              "pivot": [
                127.5,
                396
              ],
              "durationTicks": 10
            },
            {
              "pageId": "tracker-idle",
              "rect": [
                1199,
                44,
                252,
                418
              ],
              "pivot": [
                135,
                414
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-idle",
              "rect": [
                75,
                550,
                257,
                418
              ],
              "pivot": [
                118.5,
                414
              ],
              "durationTicks": 10
            },
            {
              "pageId": "tracker-idle",
              "rect": [
                453,
                543,
                260,
                425
              ],
              "pivot": [
                118.5,
                421
              ],
              "durationTicks": 10
            },
            {
              "pageId": "tracker-idle",
              "rect": [
                839,
                565,
                250,
                403
              ],
              "pivot": [
                118,
                399
              ],
              "durationTicks": 10
            },
            {
              "pageId": "tracker-idle",
              "rect": [
                1215,
                551,
                252,
                417
              ],
              "pivot": [
                119,
                413
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                71,
                63,
                288,
                405
              ],
              "pivot": [
                129,
                401
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                455,
                64,
                264,
                405
              ],
              "pivot": [
                127,
                401
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                829,
                64,
                267,
                407
              ],
              "pivot": [
                134,
                403
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                1224,
                65,
                257,
                404
              ],
              "pivot": [
                132,
                400
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                51,
                554,
                279,
                404
              ],
              "pivot": [
                149,
                400
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                437,
                555,
                266,
                403
              ],
              "pivot": [
                150,
                399
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                811,
                554,
                269,
                401
              ],
              "pivot": [
                154,
                397
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                1203,
                555,
                258,
                402
              ],
              "pivot": [
                132,
                398
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-crouch",
              "rect": [
                49,
                59,
                277,
                409
              ],
              "pivot": [
                133,
                405
              ],
              "durationTicks": 2
            },
            {
              "pageId": "tracker-crouch",
              "rect": [
                431,
                104,
                287,
                363
              ],
              "pivot": [
                133,
                359
              ],
              "durationTicks": 2
            },
            {
              "pageId": "tracker-crouch",
              "rect": [
                824,
                177,
                289,
                289
              ],
              "pivot": [
                136,
                285
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-crouch",
              "rect": [
                52,
                548,
                287,
                399
              ],
              "pivot": [
                150,
                395
              ],
              "durationTicks": 2
            },
            {
              "pageId": "tracker-crouch",
              "rect": [
                427,
                589,
                281,
                358
              ],
              "pivot": [
                151.5,
                354
              ],
              "durationTicks": 2
            },
            {
              "pageId": "tracker-crouch",
              "rect": [
                807,
                664,
                286,
                283
              ],
              "pivot": [
                151,
                279
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-guard-hand",
              "rect": [
                43,
                47,
                273,
                430
              ],
              "pivot": [
                136,
                426
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-repair-guard-hand",
              "rect": [
                433,
                47,
                270,
                430
              ],
              "pivot": [
                134.5,
                426
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-repair-guard-hand",
              "rect": [
                814,
                79,
                279,
                397
              ],
              "pivot": [
                139,
                393
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-repair-guard-hand",
              "rect": [
                1203,
                47,
                267,
                431
              ],
              "pivot": [
                133,
                427
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-guard-hand",
              "rect": [
                67,
                552,
                268,
                432
              ],
              "pivot": [
                133.5,
                428
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-repair-guard-hand",
              "rect": [
                446,
                552,
                271,
                432
              ],
              "pivot": [
                135,
                428
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-repair-guard-hand",
              "rect": [
                829,
                579,
                283,
                404
              ],
              "pivot": [
                141,
                400
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-repair-guard-hand",
              "rect": [
                1214,
                552,
                271,
                432
              ],
              "pivot": [
                135,
                428
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-hurt",
              "rect": [
                38,
                37,
                289,
                427
              ],
              "pivot": [
                146,
                423
              ],
              "durationTicks": 2
            },
            {
              "pageId": "tracker-hurt",
              "rect": [
                811,
                88,
                310,
                376
              ],
              "pivot": [
                182.5,
                372
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-hurt",
              "rect": [
                448,
                59,
                288,
                405
              ],
              "pivot": [
                160.5,
                401
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-hurt",
              "rect": [
                1213,
                37,
                285,
                428
              ],
              "pivot": [
                144,
                424
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-hurt",
              "rect": [
                37,
                523,
                286,
                426
              ],
              "pivot": [
                140.5,
                422
              ],
              "durationTicks": 2
            },
            {
              "pageId": "tracker-hurt",
              "rect": [
                769,
                569,
                309,
                380
              ],
              "pivot": [
                124.5,
                376
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-hurt",
              "rect": [
                387,
                549,
                281,
                400
              ],
              "pivot": [
                123.5,
                396
              ],
              "durationTicks": 3
            },
            {
              "pageId": "tracker-hurt",
              "rect": [
                1209,
                523,
                289,
                426
              ],
              "pivot": [
                143,
                422
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-light",
              "rect": [
                46,
                93,
                269,
                381
              ],
              "pivot": [
                119.5,
                377
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-light",
              "rect": [
                352,
                96,
                384,
                377
              ],
              "pivot": [
                140,
                373
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-light",
              "rect": [
                776,
                98,
                296,
                376
              ],
              "pivot": [
                132,
                372
              ],
              "durationTicks": 1
            },
            {
              "pageId": "tracker-light",
              "rect": [
                1213,
                88,
                257,
                387
              ],
              "pivot": [
                120,
                383
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-light",
              "rect": [
                1210,
                580,
                275,
                375
              ],
              "pivot": [
                148.5,
                371
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-light",
              "rect": [
                370,
                583,
                390,
                370
              ],
              "pivot": [
                246.5,
                366
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-light",
              "rect": [
                838,
                583,
                294,
                367
              ],
              "pivot": [
                164,
                363
              ],
              "durationTicks": 1
            },
            {
              "pageId": "tracker-light",
              "rect": [
                36,
                575,
                262,
                379
              ],
              "pivot": [
                138.5,
                375
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-medium-spacing",
              "rect": [
                86,
                115,
                205,
                307
              ],
              "pivot": [
                97,
                303
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-medium-spacing",
              "rect": [
                438,
                129,
                342,
                289
              ],
              "pivot": [
                121.5,
                285
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-medium-spacing",
              "rect": [
                1243,
                115,
                181,
                309
              ],
              "pivot": [
                89.5,
                305
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-medium-spacing",
              "rect": [
                91,
                593,
                202,
                308
              ],
              "pivot": [
                101,
                304
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-medium-spacing",
              "rect": [
                376,
                601,
                344,
                299
              ],
              "pivot": [
                223.5,
                295
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-medium-spacing",
              "rect": [
                1244,
                590,
                191,
                315
              ],
              "pivot": [
                99.5,
                311
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-heavy",
              "rect": [
                55,
                92,
                280,
                362
              ],
              "pivot": [
                131,
                358
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-heavy",
              "rect": [
                407,
                111,
                352,
                339
              ],
              "pivot": [
                153,
                335
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-heavy",
              "rect": [
                1218,
                79,
                232,
                376
              ],
              "pivot": [
                116.5,
                372
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-heavy",
              "rect": [
                1200,
                598,
                280,
                360
              ],
              "pivot": [
                149,
                356
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-heavy",
              "rect": [
                777,
                616,
                353,
                339
              ],
              "pivot": [
                198.5,
                335
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-heavy",
              "rect": [
                84,
                582,
                233,
                377
              ],
              "pivot": [
                115.5,
                373
              ],
              "durationTicks": 1
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "greyback",
    "bodyHeightPx": 424,
    "pageBodyHeightPx": {
      "greyback-idle": 424,
      "greyback-repair-walk-backward-armor": 405,
      "greyback-crouch": 390,
      "greyback-guard": 420,
      "greyback-hurt": 422,
      "greyback-repair-light-cross": 424,
      "greyback-repair-medium-pistol": 390,
      "greyback-heavy": 450
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "greyback-pit-v34",
      "characterId": "greyback",
      "variantId": "predator2-1990-elder-unmasked-flintlock",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "greyback-idle",
          "src": "/game/sprites/v34/pit/greyback/greyback-idle-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "greyback-repair-walk-backward-armor",
          "src": "/game/sprites/v34/pit/greyback/greyback-repair-walk-backward-armor-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "greyback-crouch",
          "src": "/game/sprites/v34/pit/greyback/greyback-crouch-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "greyback-guard",
          "src": "/game/sprites/v34/pit/greyback/greyback-guard-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "greyback-hurt",
          "src": "/game/sprites/v34/pit/greyback/greyback-hurt-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "greyback-repair-light-cross",
          "src": "/game/sprites/v34/pit/greyback/greyback-repair-light-cross-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "greyback-repair-medium-pistol",
          "src": "/game/sprites/v34/pit/greyback/greyback-repair-medium-pistol-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "greyback-heavy",
          "src": "/game/sprites/v34/pit/greyback/greyback-heavy-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-idle",
              "rect": [
                94,
                48,
                250,
                430
              ],
              "pivot": [
                104,
                426
              ],
              "durationTicks": 10
            },
            {
              "pageId": "greyback-idle",
              "rect": [
                480,
                48,
                250,
                430
              ],
              "pivot": [
                101.5,
                426
              ],
              "durationTicks": 10
            },
            {
              "pageId": "greyback-idle",
              "rect": [
                852,
                62,
                256,
                416
              ],
              "pivot": [
                109.5,
                412
              ],
              "durationTicks": 10
            },
            {
              "pageId": "greyback-idle",
              "rect": [
                1245,
                48,
                247,
                430
              ],
              "pivot": [
                102.5,
                426
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-idle",
              "rect": [
                40,
                555,
                249,
                430
              ],
              "pivot": [
                146.5,
                426
              ],
              "durationTicks": 10
            },
            {
              "pageId": "greyback-idle",
              "rect": [
                422,
                555,
                251,
                430
              ],
              "pivot": [
                148,
                426
              ],
              "durationTicks": 10
            },
            {
              "pageId": "greyback-idle",
              "rect": [
                808,
                573,
                253,
                413
              ],
              "pivot": [
                146.5,
                409
              ],
              "durationTicks": 10
            },
            {
              "pageId": "greyback-idle",
              "rect": [
                1188,
                555,
                249,
                430
              ],
              "pivot": [
                147,
                426
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-walk-backward-armor",
              "rect": [
                75,
                51,
                277,
                411
              ],
              "pivot": [
                136,
                407
              ],
              "durationTicks": 8
            },
            {
              "pageId": "greyback-repair-walk-backward-armor",
              "rect": [
                479,
                47,
                231,
                413
              ],
              "pivot": [
                108,
                409
              ],
              "durationTicks": 8
            },
            {
              "pageId": "greyback-repair-walk-backward-armor",
              "rect": [
                821,
                49,
                270,
                413
              ],
              "pivot": [
                148,
                409
              ],
              "durationTicks": 8
            },
            {
              "pageId": "greyback-repair-walk-backward-armor",
              "rect": [
                1222,
                48,
                254,
                413
              ],
              "pivot": [
                138,
                409
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk-backward",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-walk-backward-armor",
              "rect": [
                38,
                545,
                275,
                407
              ],
              "pivot": [
                148,
                403
              ],
              "durationTicks": 8
            },
            {
              "pageId": "greyback-repair-walk-backward-armor",
              "rect": [
                439,
                544,
                227,
                409
              ],
              "pivot": [
                129,
                405
              ],
              "durationTicks": 8
            },
            {
              "pageId": "greyback-repair-walk-backward-armor",
              "rect": [
                804,
                543,
                266,
                410
              ],
              "pivot": [
                147,
                406
              ],
              "durationTicks": 8
            },
            {
              "pageId": "greyback-repair-walk-backward-armor",
              "rect": [
                1196,
                545,
                254,
                408
              ],
              "pivot": [
                144,
                404
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-crouch",
              "rect": [
                89,
                64,
                266,
                401
              ],
              "pivot": [
                109.5,
                397
              ],
              "durationTicks": 2
            },
            {
              "pageId": "greyback-crouch",
              "rect": [
                474,
                112,
                267,
                353
              ],
              "pivot": [
                104.5,
                349
              ],
              "durationTicks": 2
            },
            {
              "pageId": "greyback-crouch",
              "rect": [
                849,
                191,
                276,
                274
              ],
              "pivot": [
                106,
                270
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-crouch",
              "rect": [
                36,
                567,
                271,
                378
              ],
              "pivot": [
                156.5,
                374
              ],
              "durationTicks": 2
            },
            {
              "pageId": "greyback-crouch",
              "rect": [
                416,
                600,
                266,
                345
              ],
              "pivot": [
                164,
                341
              ],
              "durationTicks": 2
            },
            {
              "pageId": "greyback-crouch",
              "rect": [
                792,
                673,
                274,
                272
              ],
              "pivot": [
                162.5,
                268
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-guard",
              "rect": [
                98,
                64,
                263,
                424
              ],
              "pivot": [
                113,
                420
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-guard",
              "rect": [
                453,
                64,
                255,
                423
              ],
              "pivot": [
                112.5,
                419
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-guard",
              "rect": [
                791,
                113,
                305,
                374
              ],
              "pivot": [
                142.5,
                370
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-guard",
              "rect": [
                1210,
                61,
                256,
                426
              ],
              "pivot": [
                112.5,
                422
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-guard",
              "rect": [
                412,
                552,
                253,
                421
              ],
              "pivot": [
                137,
                417
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-guard",
              "rect": [
                788,
                600,
                306,
                371
              ],
              "pivot": [
                159,
                367
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-guard",
              "rect": [
                1186,
                553,
                255,
                422
              ],
              "pivot": [
                139,
                418
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-hurt",
              "rect": [
                475,
                56,
                261,
                420
              ],
              "pivot": [
                115.5,
                416
              ],
              "durationTicks": 2
            },
            {
              "pageId": "greyback-hurt",
              "rect": [
                811,
                82,
                328,
                394
              ],
              "pivot": [
                160.5,
                390
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-hurt",
              "rect": [
                1251,
                49,
                243,
                428
              ],
              "pivot": [
                103.5,
                424
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-hurt",
              "rect": [
                80,
                49,
                261,
                428
              ],
              "pivot": [
                109,
                424
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-hurt",
              "rect": [
                417,
                564,
                244,
                423
              ],
              "pivot": [
                142,
                419
              ],
              "durationTicks": 2
            },
            {
              "pageId": "greyback-hurt",
              "rect": [
                753,
                593,
                326,
                394
              ],
              "pivot": [
                166.5,
                390
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-hurt",
              "rect": [
                1195,
                560,
                248,
                428
              ],
              "pivot": [
                139.5,
                424
              ],
              "durationTicks": 3
            },
            {
              "pageId": "greyback-hurt",
              "rect": [
                42,
                560,
                261,
                428
              ],
              "pivot": [
                150.5,
                424
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-light-cross",
              "rect": [
                61,
                47,
                270,
                429
              ],
              "pivot": [
                115,
                425
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-light-cross",
              "rect": [
                428,
                47,
                341,
                430
              ],
              "pivot": [
                132.5,
                426
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-light-cross",
              "rect": [
                836,
                47,
                290,
                430
              ],
              "pivot": [
                124,
                426
              ],
              "durationTicks": 1
            },
            {
              "pageId": "greyback-repair-light-cross",
              "rect": [
                1230,
                47,
                262,
                428
              ],
              "pivot": [
                114.5,
                424
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-light-cross",
              "rect": [
                42,
                557,
                268,
                430
              ],
              "pivot": [
                145,
                426
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-light-cross",
              "rect": [
                397,
                556,
                343,
                432
              ],
              "pivot": [
                209.5,
                428
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-light-cross",
              "rect": [
                821,
                557,
                278,
                431
              ],
              "pivot": [
                150.5,
                427
              ],
              "durationTicks": 1
            },
            {
              "pageId": "greyback-repair-light-cross",
              "rect": [
                1207,
                557,
                259,
                430
              ],
              "pivot": [
                141,
                426
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-medium-pistol",
              "rect": [
                460,
                54,
                275,
                392
              ],
              "pivot": [
                118.5,
                388
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-medium-pistol",
              "rect": [
                786,
                56,
                351,
                396
              ],
              "pivot": [
                122,
                392
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-medium-pistol",
              "rect": [
                1232,
                58,
                239,
                394
              ],
              "pivot": [
                103,
                390
              ],
              "durationTicks": 1
            },
            {
              "pageId": "greyback-repair-medium-pistol",
              "rect": [
                77,
                61,
                261,
                393
              ],
              "pivot": [
                114,
                389
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-medium-pistol",
              "rect": [
                414,
                558,
                261,
                393
              ],
              "pivot": [
                138,
                389
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-medium-pistol",
              "rect": [
                755,
                559,
                354,
                398
              ],
              "pivot": [
                230,
                394
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-repair-medium-pistol",
              "rect": [
                1204,
                560,
                245,
                397
              ],
              "pivot": [
                141.5,
                393
              ],
              "durationTicks": 1
            },
            {
              "pageId": "greyback-repair-medium-pistol",
              "rect": [
                48,
                561,
                250,
                396
              ],
              "pivot": [
                139.5,
                392
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-heavy",
              "rect": [
                53,
                52,
                301,
                422
              ],
              "pivot": [
                125.5,
                418
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-heavy",
              "rect": [
                436,
                74,
                345,
                399
              ],
              "pivot": [
                134,
                395
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-heavy",
              "rect": [
                831,
                47,
                297,
                427
              ],
              "pivot": [
                124.5,
                423
              ],
              "durationTicks": 1
            },
            {
              "pageId": "greyback-heavy",
              "rect": [
                1232,
                17,
                273,
                462
              ],
              "pivot": [
                118,
                458
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-heavy",
              "rect": [
                415,
                557,
                282,
                429
              ],
              "pivot": [
                162.5,
                425
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-heavy",
              "rect": [
                760,
                578,
                339,
                407
              ],
              "pivot": [
                204,
                403
              ],
              "durationTicks": 1
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "greyback-heavy",
              "rect": [
                1189,
                568,
                295,
                420
              ],
              "pivot": [
                172,
                416
              ],
              "durationTicks": 1
            },
            {
              "pageId": "greyback-heavy",
              "rect": [
                29,
                537,
                266,
                451
              ],
              "pivot": [
                148,
                447
              ],
              "durationTicks": 1
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "city-hunter",
    "bodyHeightPx": 504,
    "atlas": {
      "schemaVersion": 1,
      "id": "city-hunter-high-guard-right-v37",
      "characterId": "city-hunter",
      "variantId": "the-pit-v37",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "city-hunter-high-guard-right-v37-v32-continuity",
          "src": "/game/sprites/v37/pit/city-hunter/high-guard-right.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha"
          }
        }
      ],
      "clips": [
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-high-guard-right-v37-v32-continuity",
              "rect": [
                925,
                29,
                344,
                490
              ],
              "pivot": [
                170.5,
                483
              ],
              "durationTicks": 60
            },
            {
              "pageId": "city-hunter-high-guard-right-v37-v32-continuity",
              "rect": [
                925,
                537,
                344,
                479
              ],
              "pivot": [
                170.5,
                473
              ],
              "durationTicks": 60
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "berserker",
    "bodyHeightPx": 460,
    "atlas": {
      "schemaVersion": 1,
      "id": "berserker-hitstun-v38",
      "characterId": "berserker",
      "variantId": "the-pit-v33-v23-identity",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "berserker-hurt-v38",
          "src": "/game/sprites/v33/pit/berserker/berserker-hurt-v33.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 48,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-hurt-v38",
              "rect": [
                22,
                28,
                367,
                453
              ],
              "pivot": [
                210,
                450
              ],
              "durationTicks": 2
            },
            {
              "pageId": "berserker-hurt-v38",
              "rect": [
                398,
                30,
                351,
                452
              ],
              "pivot": [
                214,
                449
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-hurt-v38",
              "rect": [
                794,
                38,
                322,
                444
              ],
              "pivot": [
                165.5,
                441
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-hurt-v38",
              "rect": [
                1181,
                23,
                319,
                459
              ],
              "pivot": [
                162,
                456
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "berserker-hurt-v38",
              "rect": [
                20,
                506,
                337,
                452
              ],
              "pivot": [
                148,
                449
              ],
              "durationTicks": 2
            },
            {
              "pageId": "berserker-hurt-v38",
              "rect": [
                383,
                513,
                341,
                446
              ],
              "pivot": [
                170,
                443
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-hurt-v38",
              "rect": [
                792,
                522,
                326,
                438
              ],
              "pivot": [
                158,
                435
              ],
              "durationTicks": 3
            },
            {
              "pageId": "berserker-hurt-v38",
              "rect": [
                1175,
                511,
                322,
                450
              ],
              "pivot": [
                161.5,
                447
              ],
              "durationTicks": 3
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "city-hunter",
    "bodyHeightPx": 900,
    "atlas": {
      "schemaVersion": 1,
      "id": "city-hunter-high-guard-left-v38",
      "characterId": "city-hunter",
      "variantId": "the-pit-v38",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "city-hunter-high-guard-left-v38",
          "src": "/game/sprites/v38/pit/city-hunter/high-guard-left.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha"
          }
        }
      ],
      "clips": [
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-high-guard-left-v38",
              "rect": [
                140,
                45,
                551,
                911
              ],
              "pivot": [
                272,
                895
              ],
              "durationTicks": 60
            },
            {
              "pageId": "city-hunter-high-guard-left-v38",
              "rect": [
                880,
                60,
                541,
                897
              ],
              "pivot": [
                268,
                881
              ],
              "durationTicks": 60
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "theta",
    "bodyHeightPx": 382,
    "pageBodyHeightPx": {
      "theta-idle-v39": 382,
      "theta-crouch-v39": 387,
      "theta-guard-v39": 340,
      "theta-hurt-v39": 406,
      "theta-light-v39": 346,
      "theta-medium-v39": 367,
      "theta-heavy-v39": 346
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "theta-duel-v39",
      "characterId": "theta",
      "variantId": "marvel-2023-gold-armor-unmasked",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "theta-idle-v39",
          "src": "/game/sprites/v34/pit/theta/theta-idle-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "theta-crouch-v39",
          "src": "/game/sprites/v34/pit/theta/theta-crouch-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "theta-guard-v39",
          "src": "/game/sprites/v34/pit/theta/theta-guard-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "theta-hurt-v39",
          "src": "/game/sprites/v34/pit/theta/theta-hurt-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "theta-light-v39",
          "src": "/game/sprites/v34/pit/theta/theta-light-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "theta-medium-v39",
          "src": "/game/sprites/v34/pit/theta/theta-medium-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "theta-heavy-v39",
          "src": "/game/sprites/v34/pit/theta/theta-heavy-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-idle-v39",
              "rect": [
                140,
                77,
                191,
                390
              ],
              "pivot": [
                97.5,
                386
              ],
              "durationTicks": 24
            },
            {
              "pageId": "theta-idle-v39",
              "rect": [
                498,
                75,
                188,
                392
              ],
              "pivot": [
                95,
                388
              ],
              "durationTicks": 24
            },
            {
              "pageId": "theta-idle-v39",
              "rect": [
                848,
                91,
                192,
                376
              ],
              "pivot": [
                96.5,
                372
              ],
              "durationTicks": 24
            },
            {
              "pageId": "theta-idle-v39",
              "rect": [
                1209,
                78,
                191,
                389
              ],
              "pivot": [
                97,
                385
              ],
              "durationTicks": 24
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-idle-v39",
              "rect": [
                118,
                556,
                195,
                391
              ],
              "pivot": [
                94.5,
                387
              ],
              "durationTicks": 24
            },
            {
              "pageId": "theta-idle-v39",
              "rect": [
                474,
                551,
                196,
                397
              ],
              "pivot": [
                94.5,
                393
              ],
              "durationTicks": 24
            },
            {
              "pageId": "theta-idle-v39",
              "rect": [
                846,
                570,
                188,
                377
              ],
              "pivot": [
                91.5,
                373
              ],
              "durationTicks": 24
            },
            {
              "pageId": "theta-idle-v39",
              "rect": [
                1201,
                556,
                192,
                392
              ],
              "pivot": [
                93.5,
                388
              ],
              "durationTicks": 24
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-crouch-v39",
              "rect": [
                113,
                76,
                235,
                395
              ],
              "pivot": [
                118.5,
                391
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-crouch-v39",
              "rect": [
                477,
                129,
                237,
                342
              ],
              "pivot": [
                118,
                338
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-crouch-v39",
              "rect": [
                849,
                193,
                217,
                274
              ],
              "pivot": [
                108,
                270
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-crouch-v39",
              "rect": [
                91,
                547,
                244,
                395
              ],
              "pivot": [
                119,
                391
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-crouch-v39",
              "rect": [
                468,
                595,
                239,
                346
              ],
              "pivot": [
                119,
                342
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-crouch-v39",
              "rect": [
                839,
                666,
                218,
                272
              ],
              "pivot": [
                108.5,
                268
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-guard-v39",
              "rect": [
                134,
                117,
                198,
                348
              ],
              "pivot": [
                98.5,
                344
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-guard-v39",
              "rect": [
                485,
                122,
                223,
                343
              ],
              "pivot": [
                100,
                339
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-guard-v39",
              "rect": [
                837,
                117,
                206,
                348
              ],
              "pivot": [
                99.5,
                344
              ],
              "durationTicks": 4
            },
            {
              "pageId": "theta-guard-v39",
              "rect": [
                1196,
                108,
                210,
                357
              ],
              "pivot": [
                99.5,
                353
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-guard-v39",
              "rect": [
                135,
                567,
                202,
                348
              ],
              "pivot": [
                100.5,
                344
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-guard-v39",
              "rect": [
                479,
                569,
                221,
                346
              ],
              "pivot": [
                120,
                342
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-guard-v39",
              "rect": [
                850,
                570,
                201,
                344
              ],
              "pivot": [
                100.5,
                340
              ],
              "durationTicks": 4
            },
            {
              "pageId": "theta-guard-v39",
              "rect": [
                1211,
                556,
                201,
                358
              ],
              "pivot": [
                101,
                354
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-hurt-v39",
              "rect": [
                116,
                55,
                223,
                411
              ],
              "pivot": [
                112.5,
                407
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-hurt-v39",
              "rect": [
                820,
                84,
                258,
                381
              ],
              "pivot": [
                141.5,
                377
              ],
              "durationTicks": 3
            },
            {
              "pageId": "theta-hurt-v39",
              "rect": [
                482,
                73,
                236,
                393
              ],
              "pivot": [
                122,
                389
              ],
              "durationTicks": 3
            },
            {
              "pageId": "theta-hurt-v39",
              "rect": [
                1200,
                54,
                221,
                413
              ],
              "pivot": [
                111,
                409
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-hurt-v39",
              "rect": [
                103,
                530,
                237,
                417
              ],
              "pivot": [
                117,
                413
              ],
              "durationTicks": 2
            },
            {
              "pageId": "theta-hurt-v39",
              "rect": [
                805,
                555,
                249,
                392
              ],
              "pivot": [
                115,
                388
              ],
              "durationTicks": 3
            },
            {
              "pageId": "theta-hurt-v39",
              "rect": [
                460,
                541,
                245,
                406
              ],
              "pivot": [
                115.5,
                402
              ],
              "durationTicks": 3
            },
            {
              "pageId": "theta-hurt-v39",
              "rect": [
                1195,
                531,
                233,
                419
              ],
              "pivot": [
                112.5,
                415
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-light-v39",
              "rect": [
                87,
                92,
                240,
                356
              ],
              "pivot": [
                123,
                352
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-light-v39",
              "rect": [
                430,
                102,
                389,
                346
              ],
              "pivot": [
                128.5,
                342
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-light-v39",
              "rect": [
                854,
                100,
                242,
                348
              ],
              "pivot": [
                120.5,
                344
              ],
              "durationTicks": 6
            },
            {
              "pageId": "theta-light-v39",
              "rect": [
                1218,
                91,
                226,
                358
              ],
              "pivot": [
                112.5,
                354
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-light-v39",
              "rect": [
                99,
                557,
                241,
                360
              ],
              "pivot": [
                120,
                356
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-light-v39",
              "rect": [
                381,
                562,
                385,
                355
              ],
              "pivot": [
                253,
                351
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-light-v39",
              "rect": [
                858,
                562,
                251,
                355
              ],
              "pivot": [
                125,
                351
              ],
              "durationTicks": 6
            },
            {
              "pageId": "theta-light-v39",
              "rect": [
                1221,
                553,
                233,
                364
              ],
              "pivot": [
                116,
                360
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-medium-v39",
              "rect": [
                64,
                88,
                290,
                373
              ],
              "pivot": [
                157.5,
                369
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-medium-v39",
              "rect": [
                454,
                87,
                362,
                374
              ],
              "pivot": [
                132.5,
                370
              ],
              "durationTicks": 4
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-medium-v39",
              "rect": [
                840,
                84,
                257,
                377
              ],
              "pivot": [
                126,
                373
              ],
              "durationTicks": 9
            },
            {
              "pageId": "theta-medium-v39",
              "rect": [
                1234,
                85,
                231,
                377
              ],
              "pivot": [
                115,
                373
              ],
              "durationTicks": 9
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-medium-v39",
              "rect": [
                88,
                575,
                285,
                374
              ],
              "pivot": [
                132,
                370
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-medium-v39",
              "rect": [
                403,
                575,
                356,
                373
              ],
              "pivot": [
                222.5,
                369
              ],
              "durationTicks": 4
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-medium-v39",
              "rect": [
                845,
                573,
                257,
                376
              ],
              "pivot": [
                128,
                372
              ],
              "durationTicks": 9
            },
            {
              "pageId": "theta-medium-v39",
              "rect": [
                1216,
                572,
                238,
                378
              ],
              "pivot": [
                118.5,
                374
              ],
              "durationTicks": 9
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-heavy-v39",
              "rect": [
                57,
                126,
                294,
                347
              ],
              "pivot": [
                151,
                343
              ],
              "durationTicks": 16
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-heavy-v39",
              "rect": [
                462,
                26,
                315,
                446
              ],
              "pivot": [
                128,
                442
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-heavy-v39",
              "rect": [
                845,
                115,
                243,
                357
              ],
              "pivot": [
                117.5,
                353
              ],
              "durationTicks": 13
            },
            {
              "pageId": "theta-heavy-v39",
              "rect": [
                1229,
                118,
                228,
                354
              ],
              "pivot": [
                113.5,
                350
              ],
              "durationTicks": 13
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-heavy-v39",
              "rect": [
                94,
                596,
                290,
                344
              ],
              "pivot": [
                136,
                340
              ],
              "durationTicks": 16
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-heavy-v39",
              "rect": [
                432,
                499,
                308,
                440
              ],
              "pivot": [
                185,
                436
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "theta-heavy-v39",
              "rect": [
                867,
                588,
                230,
                355
              ],
              "pivot": [
                114.5,
                351
              ],
              "durationTicks": 13
            },
            {
              "pageId": "theta-heavy-v39",
              "rect": [
                1233,
                585,
                225,
                359
              ],
              "pivot": [
                112,
                355
              ],
              "durationTicks": 13
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "jungle-hunter",
    "bodyHeightPx": 440,
    "pageBodyHeightPx": {
      "jungle-hunter-v34-repair-walk-forward-alternation": 440
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "jungle-hunter-walk-backward-left-v39",
      "characterId": "jungle-hunter",
      "variantId": "the-pit-v32",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "jungle-hunter-v34-repair-walk-forward-alternation",
          "src": "/game/sprites/v34/pit/jungle-hunter/jungle-hunter-repair-walk-forward-alternation-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "walk-backward",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-v34-repair-walk-forward-alternation",
              "rect": [
                41,
                541,
                285,
                437
              ],
              "pivot": [
                146,
                433
              ],
              "durationTicks": 8
            },
            {
              "pageId": "jungle-hunter-v34-repair-walk-forward-alternation",
              "rect": [
                1179,
                540,
                288,
                438
              ],
              "pivot": [
                168,
                434
              ],
              "durationTicks": 8
            },
            {
              "pageId": "jungle-hunter-v34-repair-walk-forward-alternation",
              "rect": [
                775,
                539,
                297,
                436
              ],
              "pivot": [
                176,
                432
              ],
              "durationTicks": 8
            },
            {
              "pageId": "jungle-hunter-v34-repair-walk-forward-alternation",
              "rect": [
                432,
                541,
                260,
                434
              ],
              "pivot": [
                144,
                430
              ],
              "durationTicks": 8
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "machiko-noguchi",
    "bodyHeightPx": 410,
    "pageBodyHeightPx": {
      "machiko-noguchi-repair-idle-cannon": 410,
      "machiko-noguchi-crouch": 404,
      "machiko-noguchi-hurt": 404,
      "machiko-noguchi-light": 345,
      "machiko-noguchi-medium": 394,
      "machiko-noguchi-heavy": 368
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "machiko-noguchi-clan-combat-v39",
      "characterId": "machiko-noguchi",
      "variantId": "machiko-clan-armor",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "machiko-noguchi-repair-idle-cannon",
          "src": "/game/sprites/v34/pit/machiko-noguchi/machiko-noguchi-repair-idle-cannon-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "machiko-noguchi-crouch",
          "src": "/game/sprites/v34/pit/machiko-noguchi/machiko-noguchi-crouch-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "machiko-noguchi-hurt",
          "src": "/game/sprites/v34/pit/machiko-noguchi/machiko-noguchi-hurt-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "machiko-noguchi-light",
          "src": "/game/sprites/v34/pit/machiko-noguchi/machiko-noguchi-light-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "machiko-noguchi-medium",
          "src": "/game/sprites/v34/pit/machiko-noguchi/machiko-noguchi-medium-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "machiko-noguchi-heavy",
          "src": "/game/sprites/v34/pit/machiko-noguchi/machiko-noguchi-heavy-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-repair-idle-cannon",
              "rect": [
                132,
                69,
                219,
                416
              ],
              "pivot": [
                91.5,
                412
              ],
              "durationTicks": 20
            },
            {
              "pageId": "machiko-noguchi-repair-idle-cannon",
              "rect": [
                515,
                68,
                218,
                417
              ],
              "pivot": [
                91,
                413
              ],
              "durationTicks": 20
            },
            {
              "pageId": "machiko-noguchi-repair-idle-cannon",
              "rect": [
                878,
                86,
                207,
                399
              ],
              "pivot": [
                90,
                395
              ],
              "durationTicks": 20
            },
            {
              "pageId": "machiko-noguchi-repair-idle-cannon",
              "rect": [
                1233,
                69,
                217,
                416
              ],
              "pivot": [
                90,
                412
              ],
              "durationTicks": 20
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-repair-idle-cannon",
              "rect": [
                88,
                553,
                210,
                411
              ],
              "pivot": [
                115.5,
                407
              ],
              "durationTicks": 40
            },
            {
              "pageId": "machiko-noguchi-repair-idle-cannon",
              "rect": [
                834,
                570,
                204,
                394
              ],
              "pivot": [
                112.5,
                390
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-crouch",
              "rect": [
                98,
                74,
                265,
                412
              ],
              "pivot": [
                126,
                408
              ],
              "durationTicks": 2
            },
            {
              "pageId": "machiko-noguchi-crouch",
              "rect": [
                485,
                120,
                266,
                366
              ],
              "pivot": [
                99.5,
                362
              ],
              "durationTicks": 2
            },
            {
              "pageId": "machiko-noguchi-crouch",
              "rect": [
                870,
                190,
                238,
                296
              ],
              "pivot": [
                75,
                292
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-crouch",
              "rect": [
                75,
                550,
                263,
                417
              ],
              "pivot": [
                136,
                413
              ],
              "durationTicks": 2
            },
            {
              "pageId": "machiko-noguchi-crouch",
              "rect": [
                442,
                603,
                262,
                364
              ],
              "pivot": [
                164,
                360
              ],
              "durationTicks": 2
            },
            {
              "pageId": "machiko-noguchi-crouch",
              "rect": [
                810,
                672,
                239,
                295
              ],
              "pivot": [
                164,
                291
              ],
              "durationTicks": 30
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-hurt",
              "rect": [
                92,
                78,
                238,
                412
              ],
              "pivot": [
                113,
                408
              ],
              "durationTicks": 2
            },
            {
              "pageId": "machiko-noguchi-hurt",
              "rect": [
                860,
                123,
                247,
                366
              ],
              "pivot": [
                132.5,
                362
              ],
              "durationTicks": 3
            },
            {
              "pageId": "machiko-noguchi-hurt",
              "rect": [
                497,
                93,
                231,
                396
              ],
              "pivot": [
                111.5,
                392
              ],
              "durationTicks": 3
            },
            {
              "pageId": "machiko-noguchi-hurt",
              "rect": [
                1238,
                78,
                235,
                411
              ],
              "pivot": [
                111.5,
                407
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.hitstun",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-hurt",
              "rect": [
                67,
                556,
                235,
                412
              ],
              "pivot": [
                121,
                408
              ],
              "durationTicks": 2
            },
            {
              "pageId": "machiko-noguchi-hurt",
              "rect": [
                822,
                600,
                237,
                368
              ],
              "pivot": [
                111.5,
                364
              ],
              "durationTicks": 3
            },
            {
              "pageId": "machiko-noguchi-hurt",
              "rect": [
                443,
                570,
                227,
                398
              ],
              "pivot": [
                114,
                394
              ],
              "durationTicks": 3
            },
            {
              "pageId": "machiko-noguchi-hurt",
              "rect": [
                1214,
                556,
                237,
                413
              ],
              "pivot": [
                123,
                409
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-light",
              "rect": [
                67,
                108,
                226,
                353
              ],
              "pivot": [
                112.5,
                349
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-light",
              "rect": [
                422,
                118,
                349,
                343
              ],
              "pivot": [
                122,
                339
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-light",
              "rect": [
                829,
                118,
                243,
                343
              ],
              "pivot": [
                115.5,
                339
              ],
              "durationTicks": 5
            },
            {
              "pageId": "machiko-noguchi-light",
              "rect": [
                1214,
                119,
                228,
                342
              ],
              "pivot": [
                102.5,
                338
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-light",
              "rect": [
                77,
                567,
                234,
                353
              ],
              "pivot": [
                119.5,
                349
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-light",
              "rect": [
                385,
                569,
                350,
                352
              ],
              "pivot": [
                227.5,
                348
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-light",
              "rect": [
                836,
                571,
                245,
                349
              ],
              "pivot": [
                127.5,
                345
              ],
              "durationTicks": 5
            },
            {
              "pageId": "machiko-noguchi-light",
              "rect": [
                1218,
                574,
                234,
                346
              ],
              "pivot": [
                128.5,
                342
              ],
              "durationTicks": 6
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-medium",
              "rect": [
                478,
                73,
                217,
                403
              ],
              "pivot": [
                62,
                399
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-medium",
              "rect": [
                808,
                79,
                326,
                400
              ],
              "pivot": [
                76,
                396
              ],
              "durationTicks": 4
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-medium",
              "rect": [
                1210,
                78,
                214,
                400
              ],
              "pivot": [
                64,
                396
              ],
              "durationTicks": 8
            },
            {
              "pageId": "machiko-noguchi-medium",
              "rect": [
                94,
                79,
                247,
                398
              ],
              "pivot": [
                121.5,
                394
              ],
              "durationTicks": 9
            }
          ]
        },
        {
          "id": "pit.stand.medium.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-medium",
              "rect": [
                463,
                550,
                218,
                411
              ],
              "pivot": [
                152,
                407
              ],
              "durationTicks": 10
            }
          ]
        },
        {
          "id": "pit.stand.medium.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-medium",
              "rect": [
                781,
                550,
                326,
                409
              ],
              "pivot": [
                246.5,
                405
              ],
              "durationTicks": 4
            }
          ]
        },
        {
          "id": "pit.stand.medium.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-medium",
              "rect": [
                1235,
                551,
                218,
                412
              ],
              "pivot": [
                154,
                408
              ],
              "durationTicks": 8
            },
            {
              "pageId": "machiko-noguchi-medium",
              "rect": [
                84,
                553,
                254,
                407
              ],
              "pivot": [
                128.5,
                403
              ],
              "durationTicks": 9
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-heavy",
              "rect": [
                69,
                117,
                256,
                372
              ],
              "pivot": [
                122.5,
                368
              ],
              "durationTicks": 16
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-heavy",
              "rect": [
                418,
                125,
                412,
                364
              ],
              "pivot": [
                159.5,
                360
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-heavy",
              "rect": [
                833,
                138,
                253,
                351
              ],
              "pivot": [
                107.5,
                347
              ],
              "durationTicks": 12
            },
            {
              "pageId": "machiko-noguchi-heavy",
              "rect": [
                1236,
                113,
                231,
                376
              ],
              "pivot": [
                115,
                372
              ],
              "durationTicks": 13
            }
          ]
        },
        {
          "id": "pit.stand.heavy.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-heavy",
              "rect": [
                99,
                590,
                246,
                361
              ],
              "pivot": [
                128.5,
                357
              ],
              "durationTicks": 16
            }
          ]
        },
        {
          "id": "pit.stand.heavy.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-heavy",
              "rect": [
                399,
                593,
                393,
                358
              ],
              "pivot": [
                235.5,
                354
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.heavy.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-heavy",
              "rect": [
                862,
                597,
                249,
                354
              ],
              "pivot": [
                140.5,
                350
              ],
              "durationTicks": 12
            },
            {
              "pageId": "machiko-noguchi-heavy",
              "rect": [
                1228,
                580,
                241,
                371
              ],
              "pivot": [
                120,
                367
              ],
              "durationTicks": 13
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "scar",
    "bodyHeightPx": 405,
    "pageBodyHeightPx": {
      "scar-repair-walk-backward-support": 405
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "scar-walk-forward-v40",
      "characterId": "scar",
      "variantId": "the-pit-v34-v5-identity",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "scar-repair-walk-backward-support",
          "src": "/game/sprites/v34/pit/scar/scar-repair-walk-backward-support-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "walk",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                45,
                39,
                265,
                432
              ],
              "pivot": [
                140,
                428
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                1201,
                32,
                265,
                438
              ],
              "pivot": [
                119,
                434
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                810,
                38,
                258,
                433
              ],
              "pivot": [
                136,
                429
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                430,
                29,
                261,
                442
              ],
              "pivot": [
                137,
                438
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                61,
                537,
                256,
                436
              ],
              "pivot": [
                139,
                432
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                1206,
                531,
                255,
                438
              ],
              "pivot": [
                130,
                434
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                825,
                537,
                256,
                434
              ],
              "pivot": [
                135,
                430
              ],
              "durationTicks": 8
            },
            {
              "pageId": "scar-repair-walk-backward-support",
              "rect": [
                426,
                531,
                271,
                441
              ],
              "pivot": [
                159,
                437
              ],
              "durationTicks": 8
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "machiko-noguchi",
    "bodyHeightPx": 454,
    "pageBodyHeightPx": {
      "machiko-noguchi-high-guard-v40": 454
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "machiko-noguchi-high-guard-v40",
      "characterId": "machiko-noguchi",
      "variantId": "machiko-clan-armor",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "machiko-noguchi-high-guard-v40",
          "src": "/game/sprites/v40/pit/machiko-noguchi/high-guard.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha"
          }
        }
      ],
      "clips": [
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-high-guard-v40",
              "rect": [
                332,
                45,
                309,
                469
              ],
              "pivot": [
                133.5,
                458
              ],
              "durationTicks": 60
            },
            {
              "pageId": "machiko-noguchi-high-guard-v40",
              "rect": [
                924,
                43,
                308,
                472
              ],
              "pivot": [
                132.75,
                461
              ],
              "durationTicks": 60
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "machiko-noguchi-high-guard-v40",
              "rect": [
                304,
                526,
                307,
                453
              ],
              "pivot": [
                170.75,
                448
              ],
              "durationTicks": 60
            },
            {
              "pageId": "machiko-noguchi-high-guard-v40",
              "rect": [
                912,
                525,
                292,
                454
              ],
              "pivot": [
                158.25,
                449
              ],
              "durationTicks": 60
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "tracker",
    "bodyHeightPx": 400,
    "pageBodyHeightPx": {
      "tracker-repair-walk-backward-contact": 400
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "tracker-walk-forward-v41",
      "characterId": "tracker",
      "variantId": "predators-2010-v5-presentation",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "tracker-repair-walk-backward-contact",
          "src": "/game/sprites/v34/pit/tracker/tracker-repair-walk-backward-contact-v34.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "walk",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                71,
                63,
                288,
                405
              ],
              "pivot": [
                129,
                401
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                1224,
                65,
                257,
                404
              ],
              "pivot": [
                132,
                400
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                829,
                64,
                267,
                407
              ],
              "pivot": [
                134,
                403
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                455,
                64,
                264,
                405
              ],
              "pivot": [
                127,
                401
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "walk",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                51,
                554,
                279,
                404
              ],
              "pivot": [
                149,
                400
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                1203,
                555,
                258,
                402
              ],
              "pivot": [
                132,
                398
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                811,
                554,
                269,
                401
              ],
              "pivot": [
                154,
                397
              ],
              "durationTicks": 8
            },
            {
              "pageId": "tracker-repair-walk-backward-contact",
              "rect": [
                437,
                555,
                266,
                403
              ],
              "pivot": [
                150,
                399
              ],
              "durationTicks": 8
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "celtic",
    "bodyHeightPx": 459,
    "pageBodyHeightPx": {
      "celtic-idle-v41-right": 459,
      "celtic-idle-v41-left": 436
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "celtic-idle-v41",
      "characterId": "celtic",
      "variantId": "the-pit-v34-v5-identity",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "celtic-idle-v41-right",
          "src": "/game/sprites/v41/pit/celtic/idle.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        },
        {
          "id": "celtic-idle-v41-left",
          "src": "/game/sprites/v41/pit/celtic/idle.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "color-key",
            "rgb": [
              255,
              0,
              255
            ],
            "tolerance": 64,
            "fringe": {
              "mode": "connected-magenta",
              "radius": 2,
              "minExcess": 16,
              "strength": 1
            }
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-idle-v41-right",
              "rect": [
                243,
                9,
                359,
                499
              ],
              "pivot": [
                156.25,
                495
              ],
              "durationTicks": 60
            },
            {
              "pageId": "celtic-idle-v41-right",
              "rect": [
                923,
                8,
                347,
                502
              ],
              "pivot": [
                148,
                498
              ],
              "durationTicks": 60
            }
          ]
        },
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-idle-v41-left",
              "rect": [
                251,
                513,
                335,
                471
              ],
              "pivot": [
                187.75,
                467
              ],
              "durationTicks": 60
            },
            {
              "pageId": "celtic-idle-v41-left",
              "rect": [
                936,
                513,
                326,
                471
              ],
              "pivot": [
                184.5,
                467
              ],
              "durationTicks": 60
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "user-ahab",
    "variantId": "ahab-avec-casque-0c8ceb1c95",
    "bodyHeightPx": 492,
    "atlas": {
      "schemaVersion": 1,
      "id": "ahab-masked-pit-v45",
      "characterId": "user-ahab",
      "variantId": "ahab-avec-casque-0c8ceb1c95",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "ahab-masked-idle-guard-right-v45",
          "src": "/game/sprites/v45/pit/ahab/ahab-masked-idle-guard-right.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "right",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-idle-guard-right-v45",
              "rect": [
                0,
                0,
                768,
                502
              ],
              "pivot": [
                346.25,
                500
              ],
              "durationTicks": 45
            },
            {
              "pageId": "ahab-masked-idle-guard-right-v45",
              "rect": [
                768,
                0,
                768,
                502
              ],
              "pivot": [
                349.25,
                500
              ],
              "durationTicks": 45
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-idle-guard-right-v45",
              "rect": [
                0,
                502,
                768,
                522
              ],
              "pivot": [
                343.25,
                501
              ],
              "durationTicks": 30
            },
            {
              "pageId": "ahab-masked-idle-guard-right-v45",
              "rect": [
                768,
                502,
                768,
                522
              ],
              "pivot": [
                350.5,
                500
              ],
              "durationTicks": 30
            }
          ]
        }
      ]
    }
  },
  {
    "fighterId": "user-ahab",
    "variantId": "ahab-avec-casque-0c8ceb1c95",
    "bodyHeightPx": 495,
    "atlas": {
      "schemaVersion": 1,
      "id": "ahab-masked-idle-guard-left-v49",
      "characterId": "user-ahab",
      "variantId": "ahab-avec-casque-0c8ceb1c95",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "ahab-masked-idle-guard-left-v49",
          "src": "/game/sprites/v49/pit/ahab/ahab-masked-idle-guard-left.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "idle",
          "facing": "left",
          "status": "validated",
          "loop": true,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-idle-guard-left-v49",
              "rect": [
                0,
                0,
                768,
                512
              ],
              "pivot": [
                468,
                503
              ],
              "durationTicks": 45
            },
            {
              "pageId": "ahab-masked-idle-guard-left-v49",
              "rect": [
                768,
                0,
                768,
                512
              ],
              "pivot": [
                468,
                503
              ],
              "durationTicks": 45
            }
          ]
        },
        {
          "id": "high-guard",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-idle-guard-left-v49",
              "rect": [
                0,
                512,
                768,
                512
              ],
              "pivot": [
                486.5,
                483
              ],
              "durationTicks": 30
            },
            {
              "pageId": "ahab-masked-idle-guard-left-v49",
              "rect": [
                768,
                512,
                768,
                512
              ],
              "pivot": [
                486.5,
                483
              ],
              "durationTicks": 30
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "ahab-masked-idle-guard-left-v49",
        "rect": [
          0,
          0,
          768,
          512
        ],
        "visibleRect": [
          87,
          7,
          628,
          498
        ]
      },
      {
        "pageId": "ahab-masked-idle-guard-left-v49",
        "rect": [
          768,
          0,
          768,
          512
        ],
        "visibleRect": [
          855,
          3,
          655,
          502
        ]
      },
      {
        "pageId": "ahab-masked-idle-guard-left-v49",
        "rect": [
          0,
          512,
          768,
          512
        ],
        "visibleRect": [
          29,
          542,
          697,
          454
        ]
      },
      {
        "pageId": "ahab-masked-idle-guard-left-v49",
        "rect": [
          768,
          512,
          768,
          512
        ],
        "visibleRect": [
          797,
          545,
          711,
          453
        ]
      }
    ]
  },
  {
    "fighterId": "user-ahab",
    "variantId": "ahab-avec-casque-0c8ceb1c95",
    "bodyHeightPx": 477,
    "atlas": {
      "schemaVersion": 1,
      "id": "ahab-masked-light-right-v49",
      "characterId": "user-ahab",
      "variantId": "ahab-avec-casque-0c8ceb1c95",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "ahab-masked-light-right-v49",
          "src": "/game/sprites/v49/pit/ahab/ahab-masked-light-right.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.stand.light.startup",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-light-right-v49",
              "rect": [
                0,
                0,
                768,
                512
              ],
              "pivot": [
                252.5,
                489
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-light-right-v49",
              "rect": [
                768,
                0,
                768,
                512
              ],
              "pivot": [
                267.5,
                488
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-light-right-v49",
              "rect": [
                0,
                512,
                858,
                512
              ],
              "pivot": [
                281.5,
                482
              ],
              "durationTicks": 4
            },
            {
              "pageId": "ahab-masked-light-right-v49",
              "rect": [
                858,
                512,
                678,
                512
              ],
              "pivot": [
                197,
                483
              ],
              "durationTicks": 6
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "ahab-masked-light-right-v49",
        "rect": [
          0,
          0,
          768,
          512
        ],
        "visibleRect": [
          64,
          9,
          563,
          483
        ]
      },
      {
        "pageId": "ahab-masked-light-right-v49",
        "rect": [
          768,
          0,
          768,
          512
        ],
        "visibleRect": [
          816,
          15,
          707,
          476
        ]
      },
      {
        "pageId": "ahab-masked-light-right-v49",
        "rect": [
          0,
          512,
          858,
          512
        ],
        "visibleRect": [
          56,
          529,
          795,
          468
        ]
      },
      {
        "pageId": "ahab-masked-light-right-v49",
        "rect": [
          858,
          512,
          678,
          512
        ],
        "visibleRect": [
          867,
          522,
          625,
          475
        ]
      }
    ]
  },
  {
    "fighterId": "user-ahab",
    "variantId": "ahab-avec-casque-0c8ceb1c95",
    "bodyHeightPx": 391,
    "atlas": {
      "schemaVersion": 1,
      "id": "ahab-masked-light-left-v49",
      "characterId": "user-ahab",
      "variantId": "ahab-avec-casque-0c8ceb1c95",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "ahab-masked-light-left-v49",
          "src": "/game/sprites/v49/pit/ahab/ahab-masked-light-left.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.stand.light.startup",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-light-left-v49",
              "rect": [
                0,
                0,
                768,
                512
              ],
              "pivot": [
                478.5,
                480
              ],
              "durationTicks": 5
            }
          ]
        },
        {
          "id": "pit.stand.light.active",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-light-left-v49",
              "rect": [
                768,
                0,
                768,
                512
              ],
              "pivot": [
                484.5,
                475
              ],
              "durationTicks": 3
            }
          ]
        },
        {
          "id": "pit.stand.light.recovery",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-light-left-v49",
              "rect": [
                0,
                512,
                768,
                512
              ],
              "pivot": [
                524.5,
                445
              ],
              "durationTicks": 4
            },
            {
              "pageId": "ahab-masked-light-left-v49",
              "rect": [
                768,
                512,
                768,
                512
              ],
              "pivot": [
                491.5,
                453
              ],
              "durationTicks": 6
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "ahab-masked-light-left-v49",
        "rect": [
          0,
          0,
          768,
          512
        ],
        "visibleRect": [
          207,
          87,
          472,
          394
        ]
      },
      {
        "pageId": "ahab-masked-light-left-v49",
        "rect": [
          768,
          0,
          768,
          512
        ],
        "visibleRect": [
          837,
          94,
          617,
          384
        ]
      },
      {
        "pageId": "ahab-masked-light-left-v49",
        "rect": [
          0,
          512,
          768,
          512
        ],
        "visibleRect": [
          38,
          602,
          715,
          358
        ]
      },
      {
        "pageId": "ahab-masked-light-left-v49",
        "rect": [
          768,
          512,
          768,
          512
        ],
        "visibleRect": [
          969,
          581,
          503,
          386
        ]
      }
    ]
  },
  {
    "fighterId": "user-ahab",
    "variantId": "ahab-avec-casque-0c8ceb1c95",
    "bodyHeightPx": 420,
    "pageBodyHeightPx": {
      "ahab-masked-air-right-v50": 420,
      "ahab-masked-air-left-v50": 417
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "ahab-masked-air-movement-v50",
      "characterId": "user-ahab",
      "variantId": "ahab-avec-casque-0c8ceb1c95",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "ahab-masked-air-right-v50",
          "src": "/game/sprites/v50/pit/ahab/ahab-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "ahab-masked-air-left-v50",
          "src": "/game/sprites/v50/pit/ahab/ahab-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "crouch",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-air-right-v50",
              "rect": [
                0,
                0,
                530,
                325
              ],
              "pivot": [
                222.75,
                305
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.rise",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-air-right-v50",
              "rect": [
                0,
                325,
                530,
                464
              ],
              "pivot": [
                278,
                440
              ],
              "durationTicks": 7
            },
            {
              "pageId": "ahab-masked-air-right-v50",
              "rect": [
                0,
                789,
                530,
                325
              ],
              "pivot": [
                254,
                417
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-air-right-v50",
              "rect": [
                0,
                789,
                530,
                325
              ],
              "pivot": [
                254,
                417
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-air-right-v50",
              "rect": [
                0,
                789,
                530,
                325
              ],
              "pivot": [
                254,
                417
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "crouch",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-air-left-v50",
              "rect": [
                530,
                0,
                494,
                325
              ],
              "pivot": [
                277.75,
                305
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.rise",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-air-left-v50",
              "rect": [
                530,
                325,
                494,
                464
              ],
              "pivot": [
                226,
                443
              ],
              "durationTicks": 7
            },
            {
              "pageId": "ahab-masked-air-left-v50",
              "rect": [
                530,
                789,
                494,
                325
              ],
              "pivot": [
                242,
                419
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-air-left-v50",
              "rect": [
                530,
                789,
                494,
                325
              ],
              "pivot": [
                242,
                419
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "ahab-masked-air-left-v50",
              "rect": [
                530,
                789,
                494,
                325
              ],
              "pivot": [
                242,
                419
              ],
              "durationTicks": 12
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "ahab-masked-air-right-v50",
        "rect": [
          0,
          0,
          530,
          325
        ],
        "visibleRect": [
          54,
          56,
          460,
          250
        ]
      },
      {
        "pageId": "ahab-masked-air-right-v50",
        "rect": [
          0,
          325,
          530,
          464
        ],
        "visibleRect": [
          67,
          345,
          445,
          422
        ]
      },
      {
        "pageId": "ahab-masked-air-right-v50",
        "rect": [
          0,
          789,
          530,
          325
        ],
        "visibleRect": [
          66,
          808,
          447,
          297
        ]
      },
      {
        "pageId": "ahab-masked-air-left-v50",
        "rect": [
          530,
          0,
          494,
          325
        ],
        "visibleRect": [
          552,
          57,
          424,
          249
        ]
      },
      {
        "pageId": "ahab-masked-air-left-v50",
        "rect": [
          530,
          325,
          494,
          464
        ],
        "visibleRect": [
          545,
          352,
          413,
          417
        ]
      },
      {
        "pageId": "ahab-masked-air-left-v50",
        "rect": [
          530,
          789,
          494,
          325
        ],
        "visibleRect": [
          544,
          808,
          426,
          295
        ]
      }
    ],
    "heldPoseClips": [
      {
        "id": "crouch",
        "facing": "right"
      },
      {
        "id": "crouch",
        "facing": "left"
      }
    ]
  },
  {
    "fighterId": "wolf",
    "variantId": "wolf-avec-casque-4261aca172",
    "bodyHeightPx": 403,
    "pageBodyHeightPx": {
      "wolf-masked-air-right-v50": 403,
      "wolf-masked-air-left-v50": 402
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "wolf-masked-air-movement-v50",
      "characterId": "wolf",
      "variantId": "wolf-avec-casque-4261aca172",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "wolf-masked-air-right-v50",
          "src": "/game/sprites/v50/pit/wolf/wolf-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "wolf-masked-air-left-v50",
          "src": "/game/sprites/v50/pit/wolf/wolf-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.air.jump.rise",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-masked-air-right-v50",
              "rect": [
                0,
                0,
                512,
                429
              ],
              "pivot": [
                308,
                425
              ],
              "durationTicks": 7
            },
            {
              "pageId": "wolf-masked-air-right-v50",
              "rect": [
                0,
                429,
                512,
                325
              ],
              "pivot": [
                294,
                442
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-masked-air-right-v50",
              "rect": [
                0,
                754,
                512,
                324
              ],
              "pivot": [
                256,
                432
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-masked-air-right-v50",
              "rect": [
                0,
                754,
                512,
                324
              ],
              "pivot": [
                256,
                432
              ],
              "durationTicks": 6
            },
            {
              "pageId": "wolf-masked-air-right-v50",
              "rect": [
                0,
                1078,
                512,
                458
              ],
              "pivot": [
                277,
                433
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "pit.air.jump.rise",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-masked-air-left-v50",
              "rect": [
                512,
                0,
                512,
                429
              ],
              "pivot": [
                204,
                424
              ],
              "durationTicks": 7
            },
            {
              "pageId": "wolf-masked-air-left-v50",
              "rect": [
                512,
                429,
                512,
                325
              ],
              "pivot": [
                218,
                441
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-masked-air-left-v50",
              "rect": [
                512,
                754,
                512,
                324
              ],
              "pivot": [
                256,
                431
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "wolf-masked-air-left-v50",
              "rect": [
                512,
                754,
                512,
                324
              ],
              "pivot": [
                256,
                431
              ],
              "durationTicks": 6
            },
            {
              "pageId": "wolf-masked-air-left-v50",
              "rect": [
                512,
                1078,
                512,
                458
              ],
              "pivot": [
                235,
                432
              ],
              "durationTicks": 8
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "wolf-masked-air-right-v50",
        "rect": [
          0,
          0,
          512,
          429
        ],
        "visibleRect": [
          160,
          16,
          303,
          410
        ]
      },
      {
        "pageId": "wolf-masked-air-right-v50",
        "rect": [
          0,
          429,
          512,
          325
        ],
        "visibleRect": [
          106,
          432,
          362,
          310
        ]
      },
      {
        "pageId": "wolf-masked-air-right-v50",
        "rect": [
          0,
          754,
          512,
          324
        ],
        "visibleRect": [
          116,
          760,
          323,
          310
        ]
      },
      {
        "pageId": "wolf-masked-air-right-v50",
        "rect": [
          0,
          1078,
          512,
          458
        ],
        "visibleRect": [
          100,
          1088,
          354,
          419
        ]
      },
      {
        "pageId": "wolf-masked-air-left-v50",
        "rect": [
          512,
          0,
          512,
          429
        ],
        "visibleRect": [
          562,
          18,
          309,
          407
        ]
      },
      {
        "pageId": "wolf-masked-air-left-v50",
        "rect": [
          512,
          429,
          512,
          325
        ],
        "visibleRect": [
          557,
          433,
          359,
          315
        ]
      },
      {
        "pageId": "wolf-masked-air-left-v50",
        "rect": [
          512,
          754,
          512,
          324
        ],
        "visibleRect": [
          585,
          760,
          325,
          310
        ]
      },
      {
        "pageId": "wolf-masked-air-left-v50",
        "rect": [
          512,
          1078,
          512,
          458
        ],
        "visibleRect": [
          569,
          1086,
          358,
          431
        ]
      }
    ]
  },
  {
    "fighterId": "falconer",
    "variantId": "falconer-avec-casque-f5618ed362",
    "bodyHeightPx": 389,
    "pageBodyHeightPx": {
      "falconer-masked-air-right-v50": 389,
      "falconer-masked-air-left-v50": 390
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "falconer-masked-air-movement-v50",
      "characterId": "falconer",
      "variantId": "falconer-avec-casque-f5618ed362",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "falconer-masked-air-right-v50",
          "src": "/game/sprites/v50/pit/falconer/falconer-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "falconer-masked-air-left-v50",
          "src": "/game/sprites/v50/pit/falconer/falconer-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.air.jump.rise",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "falconer-masked-air-right-v50",
              "rect": [
                0,
                0,
                512,
                414
              ],
              "pivot": [
                294,
                401
              ],
              "durationTicks": 7
            },
            {
              "pageId": "falconer-masked-air-right-v50",
              "rect": [
                0,
                414,
                512,
                342
              ],
              "pivot": [
                263,
                399
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "falconer-masked-air-right-v50",
              "rect": [
                0,
                756,
                512,
                304
              ],
              "pivot": [
                231,
                382
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "falconer-masked-air-right-v50",
              "rect": [
                0,
                756,
                512,
                304
              ],
              "pivot": [
                231,
                382
              ],
              "durationTicks": 6
            },
            {
              "pageId": "falconer-masked-air-right-v50",
              "rect": [
                0,
                1060,
                512,
                476
              ],
              "pivot": [
                279,
                413
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "pit.air.jump.rise",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "falconer-masked-air-left-v50",
              "rect": [
                512,
                0,
                512,
                414
              ],
              "pivot": [
                218,
                402
              ],
              "durationTicks": 7
            },
            {
              "pageId": "falconer-masked-air-left-v50",
              "rect": [
                512,
                414,
                512,
                342
              ],
              "pivot": [
                249,
                400
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "falconer-masked-air-left-v50",
              "rect": [
                512,
                756,
                512,
                304
              ],
              "pivot": [
                281,
                383
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "falconer-masked-air-left-v50",
              "rect": [
                512,
                756,
                512,
                304
              ],
              "pivot": [
                281,
                383
              ],
              "durationTicks": 6
            },
            {
              "pageId": "falconer-masked-air-left-v50",
              "rect": [
                512,
                1060,
                512,
                476
              ],
              "pivot": [
                233,
                414
              ],
              "durationTicks": 8
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "falconer-masked-air-right-v50",
        "rect": [
          0,
          0,
          512,
          414
        ],
        "visibleRect": [
          120,
          12,
          255,
          390
        ]
      },
      {
        "pageId": "falconer-masked-air-right-v50",
        "rect": [
          0,
          414,
          512,
          342
        ],
        "visibleRect": [
          83,
          425,
          306,
          319
        ]
      },
      {
        "pageId": "falconer-masked-air-right-v50",
        "rect": [
          0,
          756,
          512,
          304
        ],
        "visibleRect": [
          193,
          768,
          232,
          278
        ]
      },
      {
        "pageId": "falconer-masked-air-right-v50",
        "rect": [
          0,
          1060,
          512,
          476
        ],
        "visibleRect": [
          82,
          1075,
          381,
          421
        ]
      },
      {
        "pageId": "falconer-masked-air-left-v50",
        "rect": [
          512,
          0,
          512,
          414
        ],
        "visibleRect": [
          650,
          12,
          255,
          391
        ]
      },
      {
        "pageId": "falconer-masked-air-left-v50",
        "rect": [
          512,
          414,
          512,
          342
        ],
        "visibleRect": [
          635,
          426,
          307,
          317
        ]
      },
      {
        "pageId": "falconer-masked-air-left-v50",
        "rect": [
          512,
          756,
          512,
          304
        ],
        "visibleRect": [
          600,
          769,
          231,
          275
        ]
      },
      {
        "pageId": "falconer-masked-air-left-v50",
        "rect": [
          512,
          1060,
          512,
          476
        ],
        "visibleRect": [
          561,
          1075,
          382,
          422
        ]
      }
    ]
  },
  {
    "fighterId": "scarface",
    "variantId": "scarface-avec-casque-bca00052d4",
    "bodyHeightPx": 338,
    "pageBodyHeightPx": {
      "scarface-masked-air-right-v50": 338,
      "scarface-masked-air-left-v50": 338
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "scarface-masked-air-movement-v50",
      "characterId": "scarface",
      "variantId": "scarface-avec-casque-bca00052d4",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "scarface-masked-air-right-v50",
          "src": "/game/sprites/v50/pit/scarface/scarface-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "scarface-masked-air-left-v50",
          "src": "/game/sprites/v50/pit/scarface/scarface-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.air.jump.rise",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scarface-masked-air-right-v50",
              "rect": [
                0,
                0,
                512,
                393
              ],
              "pivot": [
                279,
                386
              ],
              "durationTicks": 7
            },
            {
              "pageId": "scarface-masked-air-right-v50",
              "rect": [
                0,
                393,
                512,
                320
              ],
              "pivot": [
                281,
                397
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scarface-masked-air-right-v50",
              "rect": [
                0,
                713,
                512,
                340
              ],
              "pivot": [
                263,
                422
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scarface-masked-air-right-v50",
              "rect": [
                0,
                713,
                512,
                340
              ],
              "pivot": [
                263,
                422
              ],
              "durationTicks": 6
            },
            {
              "pageId": "scarface-masked-air-right-v50",
              "rect": [
                0,
                1053,
                512,
                483
              ],
              "pivot": [
                252,
                421
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "pit.air.jump.rise",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scarface-masked-air-left-v50",
              "rect": [
                512,
                0,
                512,
                393
              ],
              "pivot": [
                232,
                386
              ],
              "durationTicks": 7
            },
            {
              "pageId": "scarface-masked-air-left-v50",
              "rect": [
                512,
                393,
                512,
                320
              ],
              "pivot": [
                231,
                395
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scarface-masked-air-left-v50",
              "rect": [
                512,
                713,
                512,
                340
              ],
              "pivot": [
                256,
                422
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scarface-masked-air-left-v50",
              "rect": [
                512,
                713,
                512,
                340
              ],
              "pivot": [
                256,
                422
              ],
              "durationTicks": 6
            },
            {
              "pageId": "scarface-masked-air-left-v50",
              "rect": [
                512,
                1053,
                512,
                483
              ],
              "pivot": [
                261,
                421
              ],
              "durationTicks": 8
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "scarface-masked-air-right-v50",
        "rect": [
          0,
          0,
          512,
          393
        ],
        "visibleRect": [
          178,
          3,
          209,
          384
        ]
      },
      {
        "pageId": "scarface-masked-air-right-v50",
        "rect": [
          0,
          393,
          512,
          320
        ],
        "visibleRect": [
          127,
          400,
          303,
          291
        ]
      },
      {
        "pageId": "scarface-masked-air-right-v50",
        "rect": [
          0,
          713,
          512,
          340
        ],
        "visibleRect": [
          184,
          736,
          232,
          306
        ]
      },
      {
        "pageId": "scarface-masked-air-right-v50",
        "rect": [
          0,
          1053,
          512,
          483
        ],
        "visibleRect": [
          113,
          1065,
          297,
          420
        ]
      },
      {
        "pageId": "scarface-masked-air-left-v50",
        "rect": [
          512,
          0,
          512,
          393
        ],
        "visibleRect": [
          637,
          2,
          209,
          385
        ]
      },
      {
        "pageId": "scarface-masked-air-left-v50",
        "rect": [
          512,
          393,
          512,
          320
        ],
        "visibleRect": [
          596,
          400,
          302,
          291
        ]
      },
      {
        "pageId": "scarface-masked-air-left-v50",
        "rect": [
          512,
          713,
          512,
          340
        ],
        "visibleRect": [
          608,
          737,
          232,
          304
        ]
      },
      {
        "pageId": "scarface-masked-air-left-v50",
        "rect": [
          512,
          1053,
          512,
          483
        ],
        "visibleRect": [
          615,
          1065,
          300,
          422
        ]
      }
    ]
  },
  {
    "fighterId": "enforcer",
    "variantId": "enforcer-avec-casque-ca164d8925",
    "bodyHeightPx": 428,
    "pageBodyHeightPx": {
      "enforcer-masked-air-right-v50": 428,
      "enforcer-masked-air-left-v50": 428
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "enforcer-masked-air-movement-v50",
      "characterId": "enforcer",
      "variantId": "enforcer-avec-casque-ca164d8925",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "enforcer-masked-air-right-v50",
          "src": "/game/sprites/v50/pit/enforcer/enforcer-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "enforcer-masked-air-left-v50",
          "src": "/game/sprites/v50/pit/enforcer/enforcer-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.air.jump.rise",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "enforcer-masked-air-right-v50",
              "rect": [
                0,
                0,
                512,
                442
              ],
              "pivot": [
                282,
                431
              ],
              "durationTicks": 7
            },
            {
              "pageId": "enforcer-masked-air-right-v50",
              "rect": [
                0,
                442,
                512,
                326
              ],
              "pivot": [
                243,
                421
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "enforcer-masked-air-right-v50",
              "rect": [
                0,
                768,
                512,
                308
              ],
              "pivot": [
                244,
                409
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "enforcer-masked-air-right-v50",
              "rect": [
                0,
                768,
                512,
                308
              ],
              "pivot": [
                244,
                409
              ],
              "durationTicks": 6
            },
            {
              "pageId": "enforcer-masked-air-right-v50",
              "rect": [
                0,
                1076,
                512,
                460
              ],
              "pivot": [
                253,
                422
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "pit.air.jump.rise",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "enforcer-masked-air-left-v50",
              "rect": [
                512,
                0,
                512,
                442
              ],
              "pivot": [
                230,
                432
              ],
              "durationTicks": 7
            },
            {
              "pageId": "enforcer-masked-air-left-v50",
              "rect": [
                512,
                442,
                512,
                326
              ],
              "pivot": [
                269,
                422
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "enforcer-masked-air-left-v50",
              "rect": [
                512,
                768,
                512,
                308
              ],
              "pivot": [
                268,
                410
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "enforcer-masked-air-left-v50",
              "rect": [
                512,
                768,
                512,
                308
              ],
              "pivot": [
                268,
                410
              ],
              "durationTicks": 6
            },
            {
              "pageId": "enforcer-masked-air-left-v50",
              "rect": [
                512,
                1076,
                512,
                460
              ],
              "pivot": [
                259,
                423
              ],
              "durationTicks": 8
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "enforcer-masked-air-right-v50",
        "rect": [
          0,
          0,
          512,
          442
        ],
        "visibleRect": [
          75,
          3,
          398,
          429
        ]
      },
      {
        "pageId": "enforcer-masked-air-right-v50",
        "rect": [
          0,
          442,
          512,
          326
        ],
        "visibleRect": [
          72,
          451,
          413,
          295
        ]
      },
      {
        "pageId": "enforcer-masked-air-right-v50",
        "rect": [
          0,
          768,
          512,
          308
        ],
        "visibleRect": [
          97,
          785,
          385,
          281
        ]
      },
      {
        "pageId": "enforcer-masked-air-right-v50",
        "rect": [
          0,
          1076,
          512,
          460
        ],
        "visibleRect": [
          75,
          1089,
          414,
          422
        ]
      },
      {
        "pageId": "enforcer-masked-air-left-v50",
        "rect": [
          512,
          0,
          512,
          442
        ],
        "visibleRect": [
          553,
          4,
          397,
          429
        ]
      },
      {
        "pageId": "enforcer-masked-air-left-v50",
        "rect": [
          512,
          442,
          512,
          326
        ],
        "visibleRect": [
          544,
          454,
          404,
          295
        ]
      },
      {
        "pageId": "enforcer-masked-air-left-v50",
        "rect": [
          512,
          768,
          512,
          308
        ],
        "visibleRect": [
          555,
          786,
          373,
          280
        ]
      },
      {
        "pageId": "enforcer-masked-air-left-v50",
        "rect": [
          512,
          1076,
          512,
          460
        ],
        "visibleRect": [
          535,
          1090,
          412,
          430
        ]
      }
    ]
  },
  {
    "fighterId": "celtic",
    "variantId": "celtic-avec-casque-0764ed4b53",
    "bodyHeightPx": 410,
    "pageBodyHeightPx": {
      "celtic-masked-air-right-v50": 410,
      "celtic-masked-air-left-v50": 410
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "celtic-masked-air-movement-v50",
      "characterId": "celtic",
      "variantId": "celtic-avec-casque-0764ed4b53",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "celtic-masked-air-right-v50",
          "src": "/game/sprites/v50/pit/celtic/celtic-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "celtic-masked-air-left-v50",
          "src": "/game/sprites/v50/pit/celtic/celtic-masked-air-movement-v50.png",
          "width": 1024,
          "height": 1536,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.air.jump.rise",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-masked-air-right-v50",
              "rect": [
                0,
                0,
                512,
                430
              ],
              "pivot": [
                326,
                423
              ],
              "durationTicks": 7
            },
            {
              "pageId": "celtic-masked-air-right-v50",
              "rect": [
                0,
                430,
                512,
                344
              ],
              "pivot": [
                300,
                428
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-masked-air-right-v50",
              "rect": [
                0,
                774,
                512,
                314
              ],
              "pivot": [
                248,
                407
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-masked-air-right-v50",
              "rect": [
                0,
                774,
                512,
                314
              ],
              "pivot": [
                248,
                407
              ],
              "durationTicks": 6
            },
            {
              "pageId": "celtic-masked-air-right-v50",
              "rect": [
                0,
                1088,
                512,
                448
              ],
              "pivot": [
                279,
                419
              ],
              "durationTicks": 8
            }
          ]
        },
        {
          "id": "pit.air.jump.rise",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-masked-air-left-v50",
              "rect": [
                512,
                0,
                512,
                430
              ],
              "pivot": [
                186,
                423
              ],
              "durationTicks": 7
            },
            {
              "pageId": "celtic-masked-air-left-v50",
              "rect": [
                512,
                430,
                512,
                344
              ],
              "pivot": [
                216,
                428
              ],
              "durationTicks": 7
            }
          ]
        },
        {
          "id": "pit.air.jump.apex",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-masked-air-left-v50",
              "rect": [
                512,
                774,
                512,
                314
              ],
              "pivot": [
                268,
                407
              ],
              "durationTicks": 12
            }
          ]
        },
        {
          "id": "pit.air.jump.fall",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "celtic-masked-air-left-v50",
              "rect": [
                512,
                774,
                512,
                314
              ],
              "pivot": [
                268,
                407
              ],
              "durationTicks": 6
            },
            {
              "pageId": "celtic-masked-air-left-v50",
              "rect": [
                512,
                1088,
                512,
                448
              ],
              "pivot": [
                237,
                419
              ],
              "durationTicks": 8
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "celtic-masked-air-right-v50",
        "rect": [
          0,
          0,
          512,
          430
        ],
        "visibleRect": [
          173,
          10,
          198,
          414
        ]
      },
      {
        "pageId": "celtic-masked-air-right-v50",
        "rect": [
          0,
          430,
          512,
          344
        ],
        "visibleRect": [
          102,
          438,
          308,
          323
        ]
      },
      {
        "pageId": "celtic-masked-air-right-v50",
        "rect": [
          0,
          774,
          512,
          314
        ],
        "visibleRect": [
          174,
          789,
          252,
          283
        ]
      },
      {
        "pageId": "celtic-masked-air-right-v50",
        "rect": [
          0,
          1088,
          512,
          448
        ],
        "visibleRect": [
          105,
          1105,
          326,
          416
        ]
      },
      {
        "pageId": "celtic-masked-air-left-v50",
        "rect": [
          512,
          0,
          512,
          430
        ],
        "visibleRect": [
          657,
          9,
          197,
          414
        ]
      },
      {
        "pageId": "celtic-masked-air-left-v50",
        "rect": [
          512,
          430,
          512,
          344
        ],
        "visibleRect": [
          616,
          440,
          307,
          320
        ]
      },
      {
        "pageId": "celtic-masked-air-left-v50",
        "rect": [
          512,
          774,
          512,
          314
        ],
        "visibleRect": [
          599,
          789,
          254,
          282
        ]
      },
      {
        "pageId": "celtic-masked-air-left-v50",
        "rect": [
          512,
          1088,
          512,
          448
        ],
        "visibleRect": [
          594,
          1104,
          327,
          417
        ]
      }
    ]
  },
  {
    "fighterId": "jungle-hunter",
    "variantId": "jungle-hunter-avec-casque-53f4eb349a",
    "bodyHeightPx": 499,
    "pageBodyHeightPx": {
      "jungle-hunter-masked-intro-right-v51": 499,
      "jungle-hunter-masked-intro-left-v51": 491,
      "jungle-hunter-masked-victory-right-v51": 655,
      "jungle-hunter-masked-victory-left-v51": 664,
      "jungle-hunter-masked-defeat-right-v51": 499,
      "jungle-hunter-masked-defeat-left-v51": 491
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "jungle-hunter-masked-round-presentation-v51",
      "characterId": "jungle-hunter",
      "variantId": "jungle-hunter-avec-casque-53f4eb349a",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "jungle-hunter-masked-intro-right-v51",
          "src": "/game/sprites/v51/pit/jungle-hunter/jungle-hunter-masked-intro-v51.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "jungle-hunter-masked-intro-left-v51",
          "src": "/game/sprites/v51/pit/jungle-hunter/jungle-hunter-masked-intro-v51.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "jungle-hunter-masked-victory-right-v51",
          "src": "/game/sprites/v51/pit/jungle-hunter/jungle-hunter-masked-victory-right-retracted-v51.png",
          "width": 2172,
          "height": 724,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "jungle-hunter-masked-victory-left-v51",
          "src": "/game/sprites/v51/pit/jungle-hunter/jungle-hunter-masked-victory-left-retracted-v51.png",
          "width": 2172,
          "height": 724,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "jungle-hunter-masked-defeat-right-v51",
          "src": "/game/sprites/v51/pit/jungle-hunter/jungle-hunter-masked-defeat-v51.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "jungle-hunter-masked-defeat-left-v51",
          "src": "/game/sprites/v51/pit/jungle-hunter/jungle-hunter-masked-defeat-v51.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.presentation.intro",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-masked-intro-right-v51",
              "rect": [
                0,
                0,
                512,
                508
              ],
              "pivot": [
                271.5,
                506
              ],
              "durationTicks": 24
            },
            {
              "pageId": "jungle-hunter-masked-intro-right-v51",
              "rect": [
                512,
                0,
                512,
                525
              ],
              "pivot": [
                249.5,
                510
              ],
              "durationTicks": 24
            },
            {
              "pageId": "jungle-hunter-masked-intro-right-v51",
              "rect": [
                1024,
                0,
                512,
                511
              ],
              "pivot": [
                230.0,
                509
              ],
              "durationTicks": 24
            }
          ]
        },
        {
          "id": "pit.presentation.victory",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-masked-victory-right-v51",
              "rect": [
                0,
                0,
                724,
                724
              ],
              "pivot": [
                507.0,
                708
              ],
              "durationTicks": 40
            },
            {
              "pageId": "jungle-hunter-masked-victory-right-v51",
              "rect": [
                724,
                0,
                724,
                724
              ],
              "pivot": [
                380.0,
                707
              ],
              "durationTicks": 40
            },
            {
              "pageId": "jungle-hunter-masked-victory-right-v51",
              "rect": [
                1448,
                0,
                724,
                724
              ],
              "pivot": [
                301.5,
                707
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "pit.presentation.defeat",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-masked-intro-right-v51",
              "rect": [
                0,
                0,
                512,
                508
              ],
              "pivot": [
                271.5,
                506
              ],
              "durationTicks": 26
            },
            {
              "pageId": "jungle-hunter-masked-defeat-right-v51",
              "rect": [
                512,
                0,
                512,
                525
              ],
              "pivot": [
                250.5,
                507
              ],
              "durationTicks": 44
            },
            {
              "pageId": "jungle-hunter-masked-defeat-right-v51",
              "rect": [
                1024,
                0,
                512,
                525
              ],
              "pivot": [
                259.0,
                503
              ],
              "durationTicks": 44
            }
          ]
        },
        {
          "id": "pit.presentation.intro",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-masked-intro-left-v51",
              "rect": [
                0,
                508,
                512,
                516
              ],
              "pivot": [
                256.0,
                492
              ],
              "durationTicks": 24
            },
            {
              "pageId": "jungle-hunter-masked-intro-left-v51",
              "rect": [
                512,
                525,
                512,
                499
              ],
              "pivot": [
                237.0,
                477
              ],
              "durationTicks": 24
            },
            {
              "pageId": "jungle-hunter-masked-intro-left-v51",
              "rect": [
                1024,
                510,
                512,
                514
              ],
              "pivot": [
                222.5,
                489
              ],
              "durationTicks": 24
            }
          ]
        },
        {
          "id": "pit.presentation.victory",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-masked-victory-left-v51",
              "rect": [
                0,
                0,
                724,
                724
              ],
              "pivot": [
                465.5,
                706
              ],
              "durationTicks": 40
            },
            {
              "pageId": "jungle-hunter-masked-victory-left-v51",
              "rect": [
                724,
                0,
                724,
                724
              ],
              "pivot": [
                370.0,
                706
              ],
              "durationTicks": 40
            },
            {
              "pageId": "jungle-hunter-masked-victory-left-v51",
              "rect": [
                1448,
                0,
                724,
                724
              ],
              "pivot": [
                279.0,
                707
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "pit.presentation.defeat",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "jungle-hunter-masked-intro-left-v51",
              "rect": [
                0,
                508,
                512,
                516
              ],
              "pivot": [
                256.0,
                492
              ],
              "durationTicks": 26
            },
            {
              "pageId": "jungle-hunter-masked-defeat-left-v51",
              "rect": [
                512,
                525,
                512,
                499
              ],
              "pivot": [
                258.5,
                459
              ],
              "durationTicks": 44
            },
            {
              "pageId": "jungle-hunter-masked-defeat-left-v51",
              "rect": [
                1024,
                525,
                512,
                499
              ],
              "pivot": [
                264.5,
                455
              ],
              "durationTicks": 44
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "jungle-hunter-masked-intro-right-v51",
        "rect": [
          0,
          0,
          512,
          508
        ],
        "visibleRect": [
          109,
          7,
          325,
          500
        ]
      },
      {
        "pageId": "jungle-hunter-masked-intro-right-v51",
        "rect": [
          512,
          0,
          512,
          525
        ],
        "visibleRect": [
          650,
          49,
          213,
          462
        ]
      },
      {
        "pageId": "jungle-hunter-masked-intro-right-v51",
        "rect": [
          1024,
          0,
          512,
          511
        ],
        "visibleRect": [
          1078,
          10,
          352,
          500
        ]
      },
      {
        "pageId": "jungle-hunter-masked-intro-left-v51",
        "rect": [
          0,
          508,
          512,
          516
        ],
        "visibleRect": [
          88,
          510,
          336,
          491
        ]
      },
      {
        "pageId": "jungle-hunter-masked-intro-left-v51",
        "rect": [
          512,
          525,
          512,
          499
        ],
        "visibleRect": [
          656,
          540,
          199,
          463
        ]
      },
      {
        "pageId": "jungle-hunter-masked-intro-left-v51",
        "rect": [
          1024,
          510,
          512,
          514
        ],
        "visibleRect": [
          1059,
          511,
          375,
          489
        ]
      },
      {
        "pageId": "jungle-hunter-masked-defeat-right-v51",
        "rect": [
          512,
          0,
          512,
          525
        ],
        "visibleRect": [
          592,
          147,
          358,
          361
        ]
      },
      {
        "pageId": "jungle-hunter-masked-defeat-right-v51",
        "rect": [
          1024,
          0,
          512,
          525
        ],
        "visibleRect": [
          1081,
          209,
          404,
          308
        ]
      },
      {
        "pageId": "jungle-hunter-masked-defeat-left-v51",
        "rect": [
          512,
          525,
          512,
          499
        ],
        "visibleRect": [
          579,
          630,
          369,
          355
        ]
      },
      {
        "pageId": "jungle-hunter-masked-defeat-left-v51",
        "rect": [
          1024,
          525,
          512,
          499
        ],
        "visibleRect": [
          1091,
          689,
          395,
          304
        ]
      },
      {
        "pageId": "jungle-hunter-masked-victory-right-v51",
        "rect": [
          0,
          0,
          724,
          724
        ],
        "visibleRect": [
          302,
          54,
          410,
          655
        ]
      },
      {
        "pageId": "jungle-hunter-masked-victory-right-v51",
        "rect": [
          724,
          0,
          724,
          724
        ],
        "visibleRect": [
          905,
          55,
          398,
          653
        ]
      },
      {
        "pageId": "jungle-hunter-masked-victory-right-v51",
        "rect": [
          1448,
          0,
          724,
          724
        ],
        "visibleRect": [
          1548,
          14,
          403,
          694
        ]
      },
      {
        "pageId": "jungle-hunter-masked-victory-left-v51",
        "rect": [
          0,
          0,
          724,
          724
        ],
        "visibleRect": [
          254,
          43,
          423,
          664
        ]
      },
      {
        "pageId": "jungle-hunter-masked-victory-left-v51",
        "rect": [
          724,
          0,
          724,
          724
        ],
        "visibleRect": [
          880,
          47,
          428,
          660
        ]
      },
      {
        "pageId": "jungle-hunter-masked-victory-left-v51",
        "rect": [
          1448,
          0,
          724,
          724
        ],
        "visibleRect": [
          1509,
          13,
          436,
          695
        ]
      }
    ]
  },
  {
    "fighterId": "city-hunter",
    "variantId": "city-hunter-avec-casque-12136078fe",
    "bodyHeightPx": 491,
    "pageBodyHeightPx": {
      "city-hunter-masked-intro-right-v52": 491,
      "city-hunter-masked-intro-left-v52": 482,
      "city-hunter-masked-victory-right-v52": 506,
      "city-hunter-masked-victory-left-v52": 506,
      "city-hunter-masked-defeat-right-v52": 506,
      "city-hunter-masked-defeat-left-v52": 482
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "city-hunter-masked-round-presentation-v52",
      "characterId": "city-hunter",
      "variantId": "city-hunter-avec-casque-12136078fe",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "city-hunter-masked-intro-right-v52",
          "src": "/game/sprites/v52/pit/city-hunter/city-hunter-masked-intro-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "city-hunter-masked-intro-left-v52",
          "src": "/game/sprites/v52/pit/city-hunter/city-hunter-masked-intro-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "city-hunter-masked-victory-right-v52",
          "src": "/game/sprites/v52/pit/city-hunter/city-hunter-masked-victory-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "city-hunter-masked-victory-left-v52",
          "src": "/game/sprites/v52/pit/city-hunter/city-hunter-masked-victory-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "city-hunter-masked-defeat-right-v52",
          "src": "/game/sprites/v52/pit/city-hunter/city-hunter-masked-defeat-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "city-hunter-masked-defeat-left-v52",
          "src": "/game/sprites/v52/pit/city-hunter/city-hunter-masked-defeat-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.presentation.intro",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-masked-intro-right-v52",
              "rect": [
                0,
                0,
                512,
                512
              ],
              "pivot": [
                316.5,
                499
              ],
              "durationTicks": 24
            },
            {
              "pageId": "city-hunter-masked-intro-right-v52",
              "rect": [
                512,
                0,
                512,
                512
              ],
              "pivot": [
                245.5,
                498
              ],
              "durationTicks": 24
            },
            {
              "pageId": "city-hunter-masked-intro-right-v52",
              "rect": [
                1024,
                0,
                512,
                512
              ],
              "pivot": [
                223.5,
                500
              ],
              "durationTicks": 24
            }
          ]
        },
        {
          "id": "pit.presentation.victory",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-masked-intro-right-v52",
              "rect": [
                0,
                0,
                512,
                512
              ],
              "pivot": [
                316.5,
                499
              ],
              "durationTicks": 40
            },
            {
              "pageId": "city-hunter-masked-victory-right-v52",
              "rect": [
                512,
                0,
                512,
                515
              ],
              "pivot": [
                277.5,
                512
              ],
              "durationTicks": 40
            },
            {
              "pageId": "city-hunter-masked-victory-right-v52",
              "rect": [
                1024,
                0,
                512,
                515
              ],
              "pivot": [
                243.0,
                512
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "pit.presentation.defeat",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-masked-intro-right-v52",
              "rect": [
                0,
                0,
                512,
                512
              ],
              "pivot": [
                316.5,
                499
              ],
              "durationTicks": 40
            },
            {
              "pageId": "city-hunter-masked-defeat-right-v52",
              "rect": [
                512,
                0,
                512,
                512
              ],
              "pivot": [
                263.0,
                508
              ],
              "durationTicks": 40
            },
            {
              "pageId": "city-hunter-masked-defeat-right-v52",
              "rect": [
                1024,
                0,
                512,
                525
              ],
              "pivot": [
                254.5,
                519
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "pit.presentation.intro",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-masked-intro-left-v52",
              "rect": [
                0,
                512,
                512,
                512
              ],
              "pivot": [
                294.0,
                482
              ],
              "durationTicks": 24
            },
            {
              "pageId": "city-hunter-masked-intro-left-v52",
              "rect": [
                512,
                512,
                512,
                512
              ],
              "pivot": [
                297.5,
                482
              ],
              "durationTicks": 24
            },
            {
              "pageId": "city-hunter-masked-intro-left-v52",
              "rect": [
                1024,
                512,
                512,
                512
              ],
              "pivot": [
                230.0,
                485
              ],
              "durationTicks": 24
            }
          ]
        },
        {
          "id": "pit.presentation.victory",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-masked-intro-left-v52",
              "rect": [
                0,
                512,
                512,
                512
              ],
              "pivot": [
                294.0,
                482
              ],
              "durationTicks": 40
            },
            {
              "pageId": "city-hunter-masked-victory-left-v52",
              "rect": [
                512,
                515,
                512,
                509
              ],
              "pivot": [
                239.5,
                499
              ],
              "durationTicks": 40
            },
            {
              "pageId": "city-hunter-masked-victory-left-v52",
              "rect": [
                1024,
                515,
                512,
                509
              ],
              "pivot": [
                216.0,
                500
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "pit.presentation.defeat",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "city-hunter-masked-intro-left-v52",
              "rect": [
                0,
                512,
                512,
                512
              ],
              "pivot": [
                294.0,
                482
              ],
              "durationTicks": 40
            },
            {
              "pageId": "city-hunter-masked-defeat-left-v52",
              "rect": [
                512,
                512,
                512,
                512
              ],
              "pivot": [
                236.0,
                475
              ],
              "durationTicks": 40
            },
            {
              "pageId": "city-hunter-masked-defeat-left-v52",
              "rect": [
                1024,
                525,
                512,
                499
              ],
              "pivot": [
                291.0,
                469
              ],
              "durationTicks": 40
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "city-hunter-masked-intro-right-v52",
        "rect": [
          0,
          0,
          512,
          512
        ],
        "visibleRect": [
          169,
          9,
          295,
          491
        ]
      },
      {
        "pageId": "city-hunter-masked-intro-right-v52",
        "rect": [
          512,
          0,
          512,
          512
        ],
        "visibleRect": [
          638,
          27,
          268,
          472
        ]
      },
      {
        "pageId": "city-hunter-masked-intro-right-v52",
        "rect": [
          1024,
          0,
          512,
          512
        ],
        "visibleRect": [
          1065,
          43,
          366,
          458
        ]
      },
      {
        "pageId": "city-hunter-masked-intro-left-v52",
        "rect": [
          0,
          512,
          512,
          512
        ],
        "visibleRect": [
          132,
          513,
          325,
          482
        ]
      },
      {
        "pageId": "city-hunter-masked-intro-left-v52",
        "rect": [
          512,
          512,
          512,
          512
        ],
        "visibleRect": [
          658,
          518,
          284,
          477
        ]
      },
      {
        "pageId": "city-hunter-masked-intro-left-v52",
        "rect": [
          1024,
          512,
          512,
          512
        ],
        "visibleRect": [
          1073,
          539,
          365,
          459
        ]
      },
      {
        "pageId": "city-hunter-masked-victory-right-v52",
        "rect": [
          512,
          0,
          512,
          515
        ],
        "visibleRect": [
          636,
          7,
          307,
          506
        ]
      },
      {
        "pageId": "city-hunter-masked-victory-right-v52",
        "rect": [
          1024,
          0,
          512,
          515
        ],
        "visibleRect": [
          1094,
          10,
          329,
          503
        ]
      },
      {
        "pageId": "city-hunter-masked-victory-left-v52",
        "rect": [
          512,
          515,
          512,
          509
        ],
        "visibleRect": [
          596,
          518,
          313,
          497
        ]
      },
      {
        "pageId": "city-hunter-masked-victory-left-v52",
        "rect": [
          1024,
          515,
          512,
          509
        ],
        "visibleRect": [
          1084,
          518,
          323,
          498
        ]
      },
      {
        "pageId": "city-hunter-masked-defeat-right-v52",
        "rect": [
          512,
          0,
          512,
          512
        ],
        "visibleRect": [
          607,
          125,
          337,
          384
        ]
      },
      {
        "pageId": "city-hunter-masked-defeat-right-v52",
        "rect": [
          1024,
          0,
          512,
          525
        ],
        "visibleRect": [
          1123,
          179,
          310,
          341
        ]
      },
      {
        "pageId": "city-hunter-masked-defeat-left-v52",
        "rect": [
          512,
          512,
          512,
          512
        ],
        "visibleRect": [
          577,
          608,
          343,
          380
        ]
      },
      {
        "pageId": "city-hunter-masked-defeat-left-v52",
        "rect": [
          1024,
          525,
          512,
          499
        ],
        "visibleRect": [
          1160,
          664,
          311,
          331
        ]
      }
    ]
  },
  {
    "fighterId": "scar",
    "variantId": "scar-avec-casque-6a0a69930d",
    "bodyHeightPx": 503,
    "pageBodyHeightPx": {
      "scar-masked-intro-right-v52": 503,
      "scar-masked-intro-left-v52": 489,
      "scar-masked-victory-right-v52": 502,
      "scar-masked-victory-left-v52": 493,
      "scar-masked-defeat-right-v52": 498,
      "scar-masked-defeat-left-v52": 489
    },
    "atlas": {
      "schemaVersion": 1,
      "id": "scar-masked-round-presentation-v52",
      "characterId": "scar",
      "variantId": "scar-avec-casque-6a0a69930d",
      "sourceKind": "authored-frames",
      "status": "validated",
      "pages": [
        {
          "id": "scar-masked-intro-right-v52",
          "src": "/game/sprites/v52/pit/scar/scar-masked-intro-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "scar-masked-intro-left-v52",
          "src": "/game/sprites/v52/pit/scar/scar-masked-intro-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "scar-masked-victory-right-v52",
          "src": "/game/sprites/v52/pit/scar/scar-masked-victory-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "scar-masked-victory-left-v52",
          "src": "/game/sprites/v52/pit/scar/scar-masked-victory-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "scar-masked-defeat-right-v52",
          "src": "/game/sprites/v52/pit/scar/scar-masked-defeat-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        },
        {
          "id": "scar-masked-defeat-left-v52",
          "src": "/game/sprites/v52/pit/scar/scar-masked-defeat-v52.png",
          "width": 1536,
          "height": 1024,
          "status": "validated",
          "transparency": {
            "mode": "alpha",
            "noiseFloor": 2
          }
        }
      ],
      "clips": [
        {
          "id": "pit.presentation.intro",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-masked-victory-right-v52",
              "rect": [
                512,
                0,
                512,
                514
              ],
              "pivot": [
                282.0,
                511
              ],
              "durationTicks": 24
            },
            {
              "pageId": "scar-masked-intro-right-v52",
              "rect": [
                512,
                0,
                448,
                520
              ],
              "pivot": [
                253.5,
                513
              ],
              "durationTicks": 24
            },
            {
              "pageId": "scar-masked-intro-right-v52",
              "rect": [
                960,
                0,
                576,
                518
              ],
              "pivot": [
                253.0,
                511
              ],
              "durationTicks": 24
            }
          ]
        },
        {
          "id": "pit.presentation.victory",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-masked-intro-right-v52",
              "rect": [
                960,
                0,
                576,
                518
              ],
              "pivot": [
                253.0,
                511
              ],
              "durationTicks": 40
            },
            {
              "pageId": "scar-masked-victory-right-v52",
              "rect": [
                512,
                0,
                512,
                514
              ],
              "pivot": [
                282.0,
                511
              ],
              "durationTicks": 40
            },
            {
              "pageId": "scar-masked-victory-right-v52",
              "rect": [
                1024,
                0,
                512,
                514
              ],
              "pivot": [
                254.0,
                512
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "pit.presentation.defeat",
          "facing": "right",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-masked-intro-right-v52",
              "rect": [
                960,
                0,
                576,
                518
              ],
              "pivot": [
                253.0,
                511
              ],
              "durationTicks": 40
            },
            {
              "pageId": "scar-masked-defeat-right-v52",
              "rect": [
                512,
                0,
                512,
                512
              ],
              "pivot": [
                259.0,
                502
              ],
              "durationTicks": 40
            },
            {
              "pageId": "scar-masked-defeat-right-v52",
              "rect": [
                1024,
                0,
                512,
                512
              ],
              "pivot": [
                278.5,
                502
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "pit.presentation.intro",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-masked-victory-left-v52",
              "rect": [
                512,
                513,
                512,
                511
              ],
              "pivot": [
                239.5,
                493
              ],
              "durationTicks": 24
            },
            {
              "pageId": "scar-masked-intro-left-v52",
              "rect": [
                512,
                520,
                448,
                504
              ],
              "pivot": [
                239.5,
                485
              ],
              "durationTicks": 24
            },
            {
              "pageId": "scar-masked-intro-left-v52",
              "rect": [
                960,
                518,
                576,
                506
              ],
              "pivot": [
                270.0,
                485
              ],
              "durationTicks": 24
            }
          ]
        },
        {
          "id": "pit.presentation.victory",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-masked-intro-left-v52",
              "rect": [
                960,
                518,
                576,
                506
              ],
              "pivot": [
                270.0,
                485
              ],
              "durationTicks": 40
            },
            {
              "pageId": "scar-masked-victory-left-v52",
              "rect": [
                512,
                513,
                512,
                511
              ],
              "pivot": [
                239.5,
                493
              ],
              "durationTicks": 40
            },
            {
              "pageId": "scar-masked-victory-left-v52",
              "rect": [
                1024,
                513,
                512,
                511
              ],
              "pivot": [
                236.5,
                493
              ],
              "durationTicks": 40
            }
          ]
        },
        {
          "id": "pit.presentation.defeat",
          "facing": "left",
          "status": "validated",
          "loop": false,
          "ticksPerSecond": 60,
          "frames": [
            {
              "pageId": "scar-masked-intro-left-v52",
              "rect": [
                960,
                518,
                576,
                506
              ],
              "pivot": [
                270.0,
                485
              ],
              "durationTicks": 40
            },
            {
              "pageId": "scar-masked-defeat-left-v52",
              "rect": [
                512,
                512,
                512,
                512
              ],
              "pivot": [
                243.5,
                473
              ],
              "durationTicks": 40
            },
            {
              "pageId": "scar-masked-defeat-left-v52",
              "rect": [
                1024,
                512,
                512,
                512
              ],
              "pivot": [
                269.5,
                473
              ],
              "durationTicks": 40
            }
          ]
        }
      ]
    },
    "visibleFrameBounds": [
      {
        "pageId": "scar-masked-intro-right-v52",
        "rect": [
          512,
          0,
          448,
          520
        ],
        "visibleRect": [
          663,
          35,
          242,
          479
        ]
      },
      {
        "pageId": "scar-masked-intro-right-v52",
        "rect": [
          960,
          0,
          576,
          518
        ],
        "visibleRect": [
          1012,
          24,
          410,
          488
        ]
      },
      {
        "pageId": "scar-masked-intro-left-v52",
        "rect": [
          512,
          520,
          448,
          504
        ],
        "visibleRect": [
          617,
          543,
          243,
          463
        ]
      },
      {
        "pageId": "scar-masked-intro-left-v52",
        "rect": [
          960,
          518,
          576,
          506
        ],
        "visibleRect": [
          1019,
          528,
          421,
          476
        ]
      },
      {
        "pageId": "scar-masked-victory-right-v52",
        "rect": [
          512,
          0,
          512,
          514
        ],
        "visibleRect": [
          632,
          10,
          326,
          502
        ]
      },
      {
        "pageId": "scar-masked-victory-right-v52",
        "rect": [
          1024,
          0,
          512,
          514
        ],
        "visibleRect": [
          1097,
          15,
          357,
          498
        ]
      },
      {
        "pageId": "scar-masked-victory-left-v52",
        "rect": [
          512,
          513,
          512,
          511
        ],
        "visibleRect": [
          590,
          515,
          323,
          492
        ]
      },
      {
        "pageId": "scar-masked-victory-left-v52",
        "rect": [
          1024,
          513,
          512,
          511
        ],
        "visibleRect": [
          1091,
          514,
          339,
          493
        ]
      },
      {
        "pageId": "scar-masked-defeat-right-v52",
        "rect": [
          512,
          0,
          512,
          512
        ],
        "visibleRect": [
          584,
          88,
          373,
          415
        ]
      },
      {
        "pageId": "scar-masked-defeat-right-v52",
        "rect": [
          1024,
          0,
          512,
          512
        ],
        "visibleRect": [
          1126,
          144,
          354,
          359
        ]
      },
      {
        "pageId": "scar-masked-defeat-left-v52",
        "rect": [
          512,
          512,
          512,
          512
        ],
        "visibleRect": [
          565,
          570,
          387,
          416
        ]
      },
      {
        "pageId": "scar-masked-defeat-left-v52",
        "rect": [
          1024,
          512,
          512,
          512
        ],
        "visibleRect": [
          1101,
          622,
          387,
          364
        ]
      }
    ]
  }
];
