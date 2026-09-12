import type { PitSpriteSheetAnimationDefinition } from "./pitSpriteSheetAnimation";

/** V32: reviewed, independently drawn facings; all other states retain their bitmap fallback. */
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
  }
];
