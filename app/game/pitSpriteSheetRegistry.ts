import type { PitSpriteSheetAnimationDefinition } from "./pitSpriteSheetAnimation";

/** V32/V33: reviewed, independently drawn facings; uncovered states retain an honest drawn-pose fallback. */
export const PIT_SPRITE_SHEET_REGISTRY: readonly PitSpriteSheetAnimationDefinition[] = [
  {
    "fighterId": "jungle-hunter",
    "bodyHeightPx": 350,
    "pageBodyHeightPx": {
      "jungle-hunter-idle": 350,
      "jungle-hunter-light": 333
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
                130.0,
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
                131.0,
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
                135.0,
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
                134.0,
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
                139.0,
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
                122.0,
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
                123.0,
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
                122.0,
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
                123.0,
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
                138.0,
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
                138.0,
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
                119.0,
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
                247.0,
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
  }
];
