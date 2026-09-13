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
  }
];
