import type { YouthArtManifest } from "./youthTrainingRendering";


// Eight independently drawn native orientations. Rectangles/pivots are measured
// from the unchanged OpenAI source; recovery intentionally holds the watch pose.
const grazerFrame = (rect: readonly [number, number, number, number], pivot: readonly [number, number]) => ({ src: "/game/youth/v52/grazer-native.png", rect, pivot });
const grazerRight = [
  grazerFrame([29, 161, 400, 250], [200, 246]),
  grazerFrame([469, 191, 379, 221], [189.5, 217]),
  grazerFrame([892, 161, 425, 250], [212.5, 246]),
  grazerFrame([1376, 172, 374, 241], [187, 237]),
];
const grazerLeft = [
  grazerFrame([39, 522, 396, 258], [198, 254]),
  grazerFrame([496, 546, 381, 234], [190.5, 230]),
  grazerFrame([917, 524, 435, 253], [217.5, 249]),
  grazerFrame([1376, 534, 380, 248], [190, 244]),
];

/** Native OpenAI raster drawings. Sources unchanged; measured independent rectangles. */
export const YOUTH_ART_MANIFEST: YouthArtManifest = {
  "version": 1,
  "actorKind": "unblooded",
  patrolGrazer: {
    bodyHeight: 250, displayHeight: 100,
    left: { watch: grazerLeft[0], telegraph: grazerLeft[1], charge: [grazerLeft[2], grazerLeft[3]], recover: grazerLeft[0] },
    right: { watch: grazerRight[0], telegraph: grazerRight[1], charge: [grazerRight[2], grazerRight[3]], recover: grazerRight[0] },
  },
  "scenes": {
    "desert": { "src": "/game/youth/v49/desert.png", "groundY": 727 },
    "dojo": {
      "src": "/game/youth/v48/dojo.png",
      "groundY": 733
    },
    "camp": {
      "src": "/game/youth/v48/camp.png"
    },
    "quarters": {
      "src": "/game/youth/v48/quarters.png"
    }
  },
  "desertProps": {
    "footprints": { "src": "/game/youth/v49/desert-clues.png", "rect": [19, 306, 700, 261], "pivot": [350, 261] },
    "branch": { "src": "/game/youth/v49/desert-clues.png", "rect": [796, 240, 627, 314], "pivot": [313, 314] },
    "stone": { "src": "/game/youth/v49/desert-clues.png", "rect": [1580, 257, 518, 306], "pivot": [259, 306] }
  },
  "blade": {
    "src": "/game/prologue/v47/detached-blade.png"
  },
  "props": {
    "trainingTarget": {
      "src": "/game/youth/v48/props.png",
      "rect": [
        11,
        12,
        284,
        466
      ],
      "pivot": [
        142.0,
        464
      ]
    },
    "platform": {
      "src": "/game/youth/v48/props.png",
      "rect": [
        327,
        329,
        564,
        146
      ],
      "pivot": [
        282.0,
        144
      ]
    },
    "marker": {
      "src": "/game/youth/v48/props.png",
      "rect": [
        958,
        261,
        161,
        215
      ],
      "pivot": [
        80.5,
        213
      ]
    },
    "bladeRack": {
      "src": "/game/youth/v48/props.png",
      "rect": [
        1217,
        153,
        285,
        323
      ],
      "pivot": [
        142.5,
        321
      ]
    },
    "maskPedestal": {
      "src": "/game/youth/v48/props.png",
      "rect": [
        60,
        570,
        165,
        392
      ],
      "pivot": [
        82.5,
        390
      ]
    },
    "cot": {
      "src": "/game/youth/v48/props.png",
      "rect": [
        283,
        798,
        518,
        153
      ],
      "pivot": [
        259.0,
        151
      ]
    },
    "door": {
      "src": "/game/youth/v48/props.png",
      "rect": [
        827,
        514,
        365,
        443
      ],
      "pivot": [
        182.5,
        441
      ]
    },
    "brazier": {
      "src": "/game/youth/v48/props.png",
      "rect": [
        1230,
        696,
        244,
        269
      ],
      "pivot": [
        122.0,
        267
      ]
    }
  },
  "actors": {
    "player": {
      "left": {
        "src": "/game/youth/v48/unblooded-left.png",
        "bodyHeight": 309.5,
        "clips": {
          "idle": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  73,
                  15,
                  130,
                  317
                ],
                "pivot": [
                  61.5,
                  316
                ],
                "handAnchor": [
                  65,
                  152
                ],
                "durationTicks": 45
              },
              {
                "rect": [
                  338,
                  15,
                  138,
                  318
                ],
                "pivot": [
                  64.5,
                  316
                ],
                "handAnchor": [
                  69,
                  152
                ],
                "durationTicks": 45
              }
            ]
          },
          "walk": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  588,
                  16,
                  201,
                  310
                ],
                "pivot": [
                  102.5,
                  308
                ],
                "handAnchor": [
                  100,
                  148
                ],
                "durationTicks": 10
              },
              {
                "rect": [
                  880,
                  15,
                  213,
                  310
                ],
                "pivot": [
                  105.5,
                  309
                ],
                "handAnchor": [
                  106,
                  148
                ],
                "durationTicks": 10
              }
            ]
          },
          "jump": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  71,
                  390,
                  186,
                  219
                ],
                "pivot": [
                  94.5,
                  217
                ],
                "handAnchor": [
                  93,
                  105
                ],
                "durationTicks": 12
              },
              {
                "rect": [
                  311,
                  348,
                  165,
                  211
                ],
                "pivot": [
                  103.0,
                  210
                ],
                "handAnchor": [
                  82,
                  101
                ],
                "durationTicks": 12
              }
            ]
          },
          "jab": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  594,
                  355,
                  220,
                  259
                ],
                "pivot": [
                  109.5,
                  257
                ],
                "handAnchor": [
                  110,
                  124
                ],
                "durationTicks": 8
              },
              {
                "rect": [
                  864,
                  357,
                  251,
                  256
                ],
                "pivot": [
                  135.5,
                  254
                ],
                "handAnchor": [
                  125,
                  122
                ],
                "durationTicks": 18
              }
            ]
          },
          "blade": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  12,
                  630,
                  245,
                  244
                ],
                "pivot": [
                  123.0,
                  242
                ],
                "handAnchor": [
                  170,
                  52
                ],
                "durationTicks": 12
              },
              {
                "rect": [
                  296,
                  630,
                  283,
                  243
                ],
                "pivot": [
                  160.5,
                  241
                ],
                "handAnchor": [
                  19,
                  66
                ],
                "durationTicks": 21
              }
            ]
          },
          "throw": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  577,
                  627,
                  231,
                  249
                ],
                "pivot": [
                  126.0,
                  247
                ],
                "handAnchor": [
                  116,
                  120
                ],
                "durationTicks": 14
              },
              {
                "rect": [
                  858,
                  627,
                  229,
                  246
                ],
                "pivot": [
                  114.0,
                  245
                ],
                "handAnchor": [
                  114,
                  118
                ],
                "durationTicks": 28
              }
            ]
          },
          "dodge": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  38,
                  950,
                  214,
                  191
                ],
                "pivot": [
                  107.0,
                  190
                ],
                "handAnchor": [
                  107,
                  91
                ],
                "durationTicks": 10
              },
              {
                "rect": [
                  295,
                  980,
                  270,
                  156
                ],
                "pivot": [
                  135.0,
                  154
                ],
                "handAnchor": [
                  135,
                  74
                ],
                "durationTicks": 13
              }
            ]
          },
          "hurt": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  574,
                  891,
                  214,
                  253
                ],
                "pivot": [
                  100.5,
                  251
                ],
                "handAnchor": [
                  107,
                  121
                ],
                "durationTicks": 8
              },
              {
                "rect": [
                  880,
                  897,
                  199,
                  241
                ],
                "pivot": [
                  85.0,
                  239
                ],
                "handAnchor": [
                  99,
                  115
                ],
                "durationTicks": 10
              }
            ]
          },
          "thrown": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  16,
                  1154,
                  245,
                  225
                ],
                "pivot": [
                  28.0,
                  224
                ],
                "handAnchor": [
                  122,
                  108
                ],
                "durationTicks": 14
              },
              {
                "rect": [
                  281,
                  1221,
                  251,
                  155
                ],
                "pivot": [
                  130.5,
                  153
                ],
                "handAnchor": [
                  125,
                  74
                ],
                "durationTicks": 18
              }
            ]
          },
          "ko": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  573,
                  1285,
                  250,
                  77
                ],
                "pivot": [
                  124.5,
                  76
                ],
                "handAnchor": [
                  125,
                  37
                ],
                "durationTicks": 24
              },
              {
                "rect": [
                  851,
                  1286,
                  253,
                  79
                ],
                "pivot": [
                  126.0,
                  77
                ],
                "handAnchor": [
                  126,
                  38
                ],
                "durationTicks": 66
              }
            ]
          }
        }
      },
      "right": {
        "src": "/game/youth/v48/unblooded-right.png",
        "bodyHeight": 308.5,
        "clips": {
          "idle": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  73,
                  10,
                  126,
                  320
                ],
                "pivot": [
                  70.0,
                  318
                ],
                "handAnchor": [
                  63,
                  153
                ],
                "durationTicks": 45
              },
              {
                "rect": [
                  346,
                  12,
                  130,
                  317
                ],
                "pivot": [
                  65.5,
                  315
                ],
                "handAnchor": [
                  65,
                  152
                ],
                "durationTicks": 45
              }
            ]
          },
          "walk": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  595,
                  16,
                  190,
                  308
                ],
                "pivot": [
                  92.5,
                  306
                ],
                "handAnchor": [
                  95,
                  147
                ],
                "durationTicks": 10
              },
              {
                "rect": [
                  882,
                  21,
                  211,
                  302
                ],
                "pivot": [
                  108.0,
                  300
                ],
                "handAnchor": [
                  105,
                  145
                ],
                "durationTicks": 10
              }
            ]
          },
          "jump": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  30,
                  387,
                  179,
                  216
                ],
                "pivot": [
                  84.5,
                  214
                ],
                "handAnchor": [
                  89,
                  103
                ],
                "durationTicks": 12
              },
              {
                "rect": [
                  343,
                  341,
                  171,
                  213
                ],
                "pivot": [
                  67.5,
                  212
                ],
                "handAnchor": [
                  85,
                  102
                ],
                "durationTicks": 12
              }
            ]
          },
          "jab": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  577,
                  353,
                  212,
                  256
                ],
                "pivot": [
                  106.5,
                  255
                ],
                "handAnchor": [
                  106,
                  122
                ],
                "durationTicks": 8
              },
              {
                "rect": [
                  856,
                  360,
                  246,
                  249
                ],
                "pivot": [
                  114.0,
                  248
                ],
                "handAnchor": [
                  123,
                  119
                ],
                "durationTicks": 18
              }
            ]
          },
          "blade": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  23,
                  630,
                  238,
                  241
                ],
                "pivot": [
                  118.5,
                  239
                ],
                "handAnchor": [
                  57,
                  61
                ],
                "durationTicks": 12
              },
              {
                "rect": [
                  284,
                  627,
                  269,
                  245
                ],
                "pivot": [
                  118.0,
                  243
                ],
                "handAnchor": [
                  252,
                  60
                ],
                "durationTicks": 21
              }
            ]
          },
          "throw": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  583,
                  630,
                  223,
                  242
                ],
                "pivot": [
                  101.0,
                  241
                ],
                "handAnchor": [
                  107,
                  120
                ],
                "durationTicks": 14
              },
              {
                "rect": [
                  879,
                  631,
                  223,
                  241
                ],
                "pivot": [
                  111.0,
                  240
                ],
                "handAnchor": [
                  111,
                  115
                ],
                "durationTicks": 28
              }
            ]
          },
          "dodge": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  34,
                  947,
                  202,
                  193
                ],
                "pivot": [
                  101.5,
                  191
                ],
                "handAnchor": [
                  101,
                  92
                ],
                "durationTicks": 10
              },
              {
                "rect": [
                  284,
                  983,
                  270,
                  148
                ],
                "pivot": [
                  135.0,
                  147
                ],
                "handAnchor": [
                  135,
                  71
                ],
                "durationTicks": 13
              }
            ]
          },
          "hurt": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  586,
                  893,
                  230,
                  250
                ],
                "pivot": [
                  132.0,
                  249
                ],
                "handAnchor": [
                  115,
                  120
                ],
                "durationTicks": 8
              },
              {
                "rect": [
                  891,
                  894,
                  191,
                  240
                ],
                "pivot": [
                  107.5,
                  239
                ],
                "handAnchor": [
                  95,
                  115
                ],
                "durationTicks": 10
              }
            ]
          },
          "thrown": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  20,
                  1149,
                  242,
                  226
                ],
                "pivot": [
                  216.0,
                  224
                ],
                "handAnchor": [
                  121,
                  108
                ],
                "durationTicks": 14
              },
              {
                "rect": [
                  291,
                  1216,
                  257,
                  158
                ],
                "pivot": [
                  122.5,
                  156
                ],
                "handAnchor": [
                  129,
                  76
                ],
                "durationTicks": 18
              }
            ]
          },
          "ko": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  567,
                  1287,
                  257,
                  72
                ],
                "pivot": [
                  128.5,
                  70
                ],
                "handAnchor": [
                  128,
                  34
                ],
                "durationTicks": 24
              },
              {
                "rect": [
                  846,
                  1290,
                  261,
                  73
                ],
                "pivot": [
                  131.0,
                  72
                ],
                "handAnchor": [
                  130,
                  35
                ],
                "durationTicks": 66
              }
            ]
          }
        }
      }
    },
    "rival": {
      "left": {
        "src": "/game/youth/v48/mentor-left.png",
        "bodyHeight": 306.0,
        "clips": {
          "idle": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  72,
                  23,
                  135,
                  316
                ],
                "pivot": [
                  67.5,
                  315
                ],
                "handAnchor": [
                  67,
                  151
                ],
                "durationTicks": 45
              },
              {
                "rect": [
                  342,
                  23,
                  138,
                  316
                ],
                "pivot": [
                  66.0,
                  315
                ],
                "handAnchor": [
                  69,
                  151
                ],
                "durationTicks": 45
              }
            ]
          },
          "walk": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  595,
                  31,
                  206,
                  304
                ],
                "pivot": [
                  99.0,
                  302
                ],
                "handAnchor": [
                  103,
                  146
                ],
                "durationTicks": 10
              },
              {
                "rect": [
                  881,
                  32,
                  211,
                  304
                ],
                "pivot": [
                  103.5,
                  302
                ],
                "handAnchor": [
                  105,
                  146
                ],
                "durationTicks": 10
              }
            ]
          },
          "jump": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  67,
                  394,
                  195,
                  220
                ],
                "pivot": [
                  106.0,
                  219
                ],
                "handAnchor": [
                  97,
                  105
                ],
                "durationTicks": 12
              },
              {
                "rect": [
                  325,
                  351,
                  157,
                  217
                ],
                "pivot": [
                  106.5,
                  215
                ],
                "handAnchor": [
                  78,
                  104
                ],
                "durationTicks": 12
              }
            ]
          },
          "jab": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  578,
                  361,
                  227,
                  266
                ],
                "pivot": [
                  113.5,
                  265
                ],
                "handAnchor": [
                  113,
                  127
                ],
                "durationTicks": 32
              },
              {
                "rect": [
                  844,
                  366,
                  256,
                  261
                ],
                "pivot": [
                  139.0,
                  260
                ],
                "handAnchor": [
                  128,
                  125
                ],
                "durationTicks": 18
              }
            ]
          },
          "blade": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  26,
                  637,
                  229,
                  259
                ],
                "pivot": [
                  115.0,
                  258
                ],
                "handAnchor": [
                  158,
                  53
                ],
                "durationTicks": 12
              },
              {
                "rect": [
                  282,
                  644,
                  269,
                  252
                ],
                "pivot": [
                  146.0,
                  251
                ],
                "handAnchor": [
                  21,
                  69
                ],
                "durationTicks": 21
              }
            ]
          },
          "throw": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  587,
                  643,
                  224,
                  256
                ],
                "pivot": [
                  112.0,
                  254
                ],
                "handAnchor": [
                  112,
                  122
                ],
                "durationTicks": 14
              },
              {
                "rect": [
                  849,
                  643,
                  253,
                  257
                ],
                "pivot": [
                  137.5,
                  256
                ],
                "handAnchor": [
                  126,
                  123
                ],
                "durationTicks": 28
              }
            ]
          },
          "dodge": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  36,
                  980,
                  239,
                  180
                ],
                "pivot": [
                  120.0,
                  179
                ],
                "handAnchor": [
                  119,
                  86
                ],
                "durationTicks": 10
              },
              {
                "rect": [
                  305,
                  986,
                  243,
                  179
                ],
                "pivot": [
                  217.5,
                  178
                ],
                "handAnchor": [
                  121,
                  86
                ],
                "durationTicks": 13
              }
            ]
          },
          "hurt": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  595,
                  903,
                  226,
                  259
                ],
                "pivot": [
                  117.0,
                  258
                ],
                "handAnchor": [
                  113,
                  124
                ],
                "durationTicks": 8
              },
              {
                "rect": [
                  887,
                  915,
                  210,
                  250
                ],
                "pivot": [
                  110.0,
                  249
                ],
                "handAnchor": [
                  105,
                  120
                ],
                "durationTicks": 10
              }
            ]
          },
          "thrown": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  22,
                  1172,
                  264,
                  190
                ],
                "pivot": [
                  140.0,
                  188
                ],
                "handAnchor": [
                  132,
                  91
                ],
                "durationTicks": 14
              },
              {
                "rect": [
                  298,
                  1208,
                  250,
                  177
                ],
                "pivot": [
                  83.0,
                  175
                ],
                "handAnchor": [
                  125,
                  85
                ],
                "durationTicks": 18
              }
            ]
          },
          "ko": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  551,
                  1289,
                  256,
                  91
                ],
                "pivot": [
                  125.5,
                  89
                ],
                "handAnchor": [
                  128,
                  43
                ],
                "durationTicks": 24
              },
              {
                "rect": [
                  810,
                  1288,
                  287,
                  92
                ],
                "pivot": [
                  141.0,
                  90
                ],
                "handAnchor": [
                  143,
                  44
                ],
                "durationTicks": 66
              }
            ]
          }
        }
      },
      "right": {
        "src": "/game/youth/v48/mentor-right.png",
        "bodyHeight": 322.5,
        "clips": {
          "idle": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  67,
                  6,
                  140,
                  330
                ],
                "pivot": [
                  75.5,
                  329
                ],
                "handAnchor": [
                  70,
                  158
                ],
                "durationTicks": 45
              },
              {
                "rect": [
                  344,
                  5,
                  143,
                  329
                ],
                "pivot": [
                  74.0,
                  329
                ],
                "handAnchor": [
                  71,
                  158
                ],
                "durationTicks": 45
              }
            ]
          },
          "walk": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  583,
                  9,
                  208,
                  323
                ],
                "pivot": [
                  106.5,
                  322
                ],
                "handAnchor": [
                  104,
                  155
                ],
                "durationTicks": 10
              },
              {
                "rect": [
                  876,
                  8,
                  229,
                  324
                ],
                "pivot": [
                  120.5,
                  322
                ],
                "handAnchor": [
                  114,
                  155
                ],
                "durationTicks": 10
              }
            ]
          },
          "jump": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  17,
                  377,
                  197,
                  229
                ],
                "pivot": [
                  91.5,
                  228
                ],
                "handAnchor": [
                  98,
                  110
                ],
                "durationTicks": 12
              },
              {
                "rect": [
                  336,
                  332,
                  185,
                  228
                ],
                "pivot": [
                  72.5,
                  226
                ],
                "handAnchor": [
                  92,
                  109
                ],
                "durationTicks": 12
              }
            ]
          },
          "jab": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  564,
                  350,
                  233,
                  266
                ],
                "pivot": [
                  117.0,
                  265
                ],
                "handAnchor": [
                  116,
                  127
                ],
                "durationTicks": 32
              },
              {
                "rect": [
                  844,
                  353,
                  267,
                  265
                ],
                "pivot": [
                  126.5,
                  264
                ],
                "handAnchor": [
                  133,
                  127
                ],
                "durationTicks": 18
              }
            ]
          },
          "blade": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  12,
                  621,
                  248,
                  258
                ],
                "pivot": [
                  124.0,
                  256
                ],
                "handAnchor": [
                  66,
                  57
                ],
                "durationTicks": 12
              },
              {
                "rect": [
                  271,
                  621,
                  292,
                  258
                ],
                "pivot": [
                  130.0,
                  257
                ],
                "handAnchor": [
                  272,
                  68
                ],
                "durationTicks": 21
              }
            ]
          },
          "throw": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  572,
                  621,
                  233,
                  261
                ],
                "pivot": [
                  114.0,
                  259
                ],
                "handAnchor": [
                  116,
                  125
                ],
                "durationTicks": 14
              },
              {
                "rect": [
                  869,
                  620,
                  249,
                  261
                ],
                "pivot": [
                  125.0,
                  259
                ],
                "handAnchor": [
                  124,
                  125
                ],
                "durationTicks": 28
              }
            ]
          },
          "dodge": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  29,
                  950,
                  221,
                  199
                ],
                "pivot": [
                  111.0,
                  197
                ],
                "handAnchor": [
                  110,
                  95
                ],
                "durationTicks": 10
              },
              {
                "rect": [
                  277,
                  975,
                  282,
                  173
                ],
                "pivot": [
                  144.0,
                  172
                ],
                "handAnchor": [
                  141,
                  83
                ],
                "durationTicks": 13
              }
            ]
          },
          "hurt": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  580,
                  883,
                  244,
                  266
                ],
                "pivot": [
                  132.0,
                  264
                ],
                "handAnchor": [
                  122,
                  127
                ],
                "durationTicks": 8
              },
              {
                "rect": [
                  883,
                  888,
                  213,
                  264
                ],
                "pivot": [
                  116.5,
                  263
                ],
                "handAnchor": [
                  106,
                  126
                ],
                "durationTicks": 10
              }
            ]
          },
          "thrown": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  9,
                  1158,
                  271,
                  220
                ],
                "pivot": [
                  240.5,
                  218
                ],
                "handAnchor": [
                  135,
                  105
                ],
                "durationTicks": 14
              },
              {
                "rect": [
                  280,
                  1198,
                  268,
                  180
                ],
                "pivot": [
                  130.0,
                  179
                ],
                "handAnchor": [
                  134,
                  86
                ],
                "durationTicks": 18
              }
            ]
          },
          "ko": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  554,
                  1278,
                  276,
                  91
                ],
                "pivot": [
                  140.0,
                  90
                ],
                "handAnchor": [
                  138,
                  43
                ],
                "durationTicks": 24
              },
              {
                "rect": [
                  835,
                  1287,
                  281,
                  88
                ],
                "pivot": [
                  140.0,
                  87
                ],
                "handAnchor": [
                  140,
                  42
                ],
                "durationTicks": 66
              }
            ]
          }
        }
      }
    }
  }
};
