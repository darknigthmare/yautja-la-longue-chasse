import type { NurseryArtManifest } from "./nurseryRendering";

/** OpenAI V47 Youngling art. Native directions, measured alpha bounds and hand anchors.
 * Ready reuses an actual raised-arm drawing; originals remain unchanged. */
export const NURSERY_ART_MANIFEST: NurseryArtManifest = {
  "version": 1,
  "actorKind": "youngling",
  "scenes": {
    "arena": {
      "src": "/game/prologue/v47/arena.png"
    },
    "village": {
      "src": "/game/prologue/v47/village.png"
    },
    "redMoon": {
      "src": "/game/prologue/v47/red-moon.png"
    }
  },
  "blade": {
    "src": "/game/prologue/v47/detached-blade.png"
  },
  "actors": {
    "player": {
      "right": {
        "src": "/game/prologue/v47/youngling-player-right.png",
        "bodyHeight": 195.0,
        "clips": {
          "idle": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  0,
                  0,
                  329,
                  272
                ],
                "pivot": [
                  175.0,
                  247
                ],
                "durationTicks": 45,
                "handAnchor": [
                  223,
                  149
                ]
              },
              {
                "rect": [
                  329,
                  0,
                  303,
                  272
                ],
                "pivot": [
                  151.5,
                  247
                ],
                "durationTicks": 45,
                "handAnchor": [
                  190,
                  151
                ]
              }
            ]
          },
          "walk": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  632,
                  0,
                  304,
                  272
                ],
                "pivot": [
                  150.5,
                  247
                ],
                "durationTicks": 10,
                "handAnchor": [
                  200,
                  168
                ]
              },
              {
                "rect": [
                  936,
                  0,
                  318,
                  272
                ],
                "pivot": [
                  161.5,
                  248
                ],
                "durationTicks": 10,
                "handAnchor": [
                  210,
                  168
                ]
              }
            ]
          },
          "ready": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  272,
                  326,
                  249
                ],
                "pivot": [
                  170.5,
                  227
                ],
                "durationTicks": 20,
                "handAnchor": [
                  195,
                  111
                ]
              },
              {
                "rect": [
                  0,
                  521,
                  317,
                  256
                ],
                "pivot": [
                  162.5,
                  232
                ],
                "durationTicks": 100,
                "handAnchor": [
                  135,
                  33
                ]
              }
            ]
          },
          "jab": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  638,
                  272,
                  296,
                  249
                ],
                "pivot": [
                  142.0,
                  227
                ],
                "durationTicks": 8,
                "handAnchor": [
                  201,
                  113
                ]
              },
              {
                "rect": [
                  934,
                  272,
                  320,
                  249
                ],
                "pivot": [
                  154.5,
                  227
                ],
                "durationTicks": 19,
                "handAnchor": [
                  254,
                  107
                ]
              }
            ]
          },
          "blade": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  521,
                  317,
                  256
                ],
                "pivot": [
                  162.5,
                  232
                ],
                "durationTicks": 12,
                "handAnchor": [
                  135,
                  33
                ]
              },
              {
                "rect": [
                  317,
                  521,
                  332,
                  256
                ],
                "pivot": [
                  124.0,
                  231
                ],
                "durationTicks": 22,
                "handAnchor": [
                  255,
                  113
                ]
              }
            ]
          },
          "throw": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  649,
                  521,
                  306,
                  256
                ],
                "pivot": [
                  135.0,
                  231
                ],
                "durationTicks": 14,
                "handAnchor": [
                  207,
                  103
                ]
              },
              {
                "rect": [
                  955,
                  521,
                  299,
                  256
                ],
                "pivot": [
                  160.5,
                  231
                ],
                "durationTicks": 26,
                "handAnchor": [
                  225,
                  103
                ]
              }
            ]
          },
          "dodge": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  777,
                  320,
                  246
                ],
                "pivot": [
                  173.5,
                  207
                ],
                "durationTicks": 10,
                "handAnchor": [
                  113,
                  193
                ]
              },
              {
                "rect": [
                  320,
                  777,
                  323,
                  246
                ],
                "pivot": [
                  140.5,
                  204
                ],
                "durationTicks": 10,
                "handAnchor": [
                  213,
                  193
                ]
              }
            ]
          },
          "hurt": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  643,
                  777,
                  302,
                  246
                ],
                "pivot": [
                  163.5,
                  211
                ],
                "durationTicks": 8,
                "handAnchor": [
                  191,
                  85
                ]
              },
              {
                "rect": [
                  945,
                  777,
                  309,
                  246
                ],
                "pivot": [
                  186.0,
                  210
                ],
                "durationTicks": 8,
                "handAnchor": [
                  188,
                  51
                ]
              }
            ]
          },
          "thrown": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  1023,
                  335,
                  231
                ],
                "pivot": [
                  198.5,
                  179
                ],
                "durationTicks": 14,
                "handAnchor": [
                  160,
                  81
                ]
              },
              {
                "rect": [
                  335,
                  1023,
                  295,
                  231
                ],
                "pivot": [
                  161.5,
                  167
                ],
                "durationTicks": 14,
                "handAnchor": [
                  146,
                  52
                ]
              }
            ]
          },
          "ko": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  630,
                  1023,
                  283,
                  231
                ],
                "pivot": [
                  141.5,
                  194
                ],
                "durationTicks": 24,
                "handAnchor": [
                  131,
                  179
                ]
              },
              {
                "rect": [
                  913,
                  1023,
                  341,
                  231
                ],
                "pivot": [
                  179.0,
                  184
                ],
                "durationTicks": 66,
                "handAnchor": [
                  257,
                  171
                ]
              }
            ]
          }
        }
      },
      "left": {
        "src": "/game/prologue/v47/youngling-player-left.png",
        "bodyHeight": 211.0,
        "clips": {
          "idle": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  0,
                  0,
                  314,
                  277
                ],
                "pivot": [
                  160.5,
                  256
                ],
                "durationTicks": 45,
                "handAnchor": [
                  108,
                  153
                ]
              },
              {
                "rect": [
                  314,
                  0,
                  314,
                  277
                ],
                "pivot": [
                  156.5,
                  257
                ],
                "durationTicks": 45,
                "handAnchor": [
                  116,
                  158
                ]
              }
            ]
          },
          "walk": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  628,
                  0,
                  312,
                  277
                ],
                "pivot": [
                  155.5,
                  255
                ],
                "durationTicks": 10,
                "handAnchor": [
                  99,
                  168
                ]
              },
              {
                "rect": [
                  940,
                  0,
                  314,
                  277
                ],
                "pivot": [
                  163.5,
                  255
                ],
                "durationTicks": 10,
                "handAnchor": [
                  105,
                  168
                ]
              }
            ]
          },
          "ready": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  277,
                  308,
                  245
                ],
                "pivot": [
                  166.0,
                  227
                ],
                "durationTicks": 20,
                "handAnchor": [
                  133,
                  111
                ]
              },
              {
                "rect": [
                  0,
                  522,
                  322,
                  253
                ],
                "pivot": [
                  184.5,
                  236
                ],
                "durationTicks": 100,
                "handAnchor": [
                  193,
                  29
                ]
              }
            ]
          },
          "jab": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  635,
                  277,
                  301,
                  245
                ],
                "pivot": [
                  157.5,
                  229
                ],
                "durationTicks": 8,
                "handAnchor": [
                  86,
                  106
                ]
              },
              {
                "rect": [
                  936,
                  277,
                  318,
                  245
                ],
                "pivot": [
                  185.5,
                  228
                ],
                "durationTicks": 19,
                "handAnchor": [
                  76,
                  104
                ]
              }
            ]
          },
          "blade": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  522,
                  322,
                  253
                ],
                "pivot": [
                  184.5,
                  236
                ],
                "durationTicks": 12,
                "handAnchor": [
                  193,
                  29
                ]
              },
              {
                "rect": [
                  322,
                  522,
                  326,
                  253
                ],
                "pivot": [
                  213.0,
                  234
                ],
                "durationTicks": 22,
                "handAnchor": [
                  63,
                  106
                ]
              }
            ]
          },
          "throw": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  648,
                  522,
                  291,
                  253
                ],
                "pivot": [
                  149.0,
                  235
                ],
                "durationTicks": 14,
                "handAnchor": [
                  50,
                  107
                ]
              },
              {
                "rect": [
                  939,
                  522,
                  315,
                  253
                ],
                "pivot": [
                  172.0,
                  235
                ],
                "durationTicks": 26,
                "handAnchor": [
                  79,
                  103
                ]
              }
            ]
          },
          "dodge": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  775,
                  337,
                  247
                ],
                "pivot": [
                  144.5,
                  212
                ],
                "durationTicks": 10,
                "handAnchor": [
                  201,
                  203
                ]
              },
              {
                "rect": [
                  337,
                  775,
                  329,
                  247
                ],
                "pivot": [
                  194.0,
                  210
                ],
                "durationTicks": 10,
                "handAnchor": [
                  102,
                  200
                ]
              }
            ]
          },
          "hurt": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  666,
                  775,
                  264,
                  247
                ],
                "pivot": [
                  100.5,
                  216
                ],
                "durationTicks": 8,
                "handAnchor": [
                  65,
                  82
                ]
              },
              {
                "rect": [
                  930,
                  775,
                  324,
                  247
                ],
                "pivot": [
                  143.0,
                  216
                ],
                "durationTicks": 8,
                "handAnchor": [
                  134,
                  49
                ]
              }
            ]
          },
          "thrown": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  1022,
                  336,
                  232
                ],
                "pivot": [
                  135.0,
                  184
                ],
                "durationTicks": 14,
                "handAnchor": [
                  169,
                  69
                ]
              },
              {
                "rect": [
                  336,
                  1022,
                  319,
                  232
                ],
                "pivot": [
                  141.0,
                  175
                ],
                "durationTicks": 14,
                "handAnchor": [
                  91,
                  75
                ]
              }
            ]
          },
          "ko": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  655,
                  1022,
                  272,
                  232
                ],
                "pivot": [
                  147.0,
                  199
                ],
                "durationTicks": 24,
                "handAnchor": [
                  122,
                  180
                ]
              },
              {
                "rect": [
                  927,
                  1022,
                  327,
                  232
                ],
                "pivot": [
                  175.0,
                  192
                ],
                "durationTicks": 66,
                "handAnchor": [
                  102,
                  175
                ]
              }
            ]
          }
        }
      }
    },
    "rival": {
      "left": {
        "src": "/game/prologue/v47/youngling-rival-left.png",
        "bodyHeight": 215.5,
        "clips": {
          "idle": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  0,
                  0,
                  315,
                  276
                ],
                "pivot": [
                  160.0,
                  258
                ],
                "durationTicks": 45,
                "handAnchor": [
                  108,
                  155
                ]
              },
              {
                "rect": [
                  315,
                  0,
                  314,
                  276
                ],
                "pivot": [
                  157.5,
                  259
                ],
                "durationTicks": 45,
                "handAnchor": [
                  116,
                  156
                ]
              }
            ]
          },
          "walk": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  629,
                  0,
                  311,
                  276
                ],
                "pivot": [
                  154.5,
                  257
                ],
                "durationTicks": 10,
                "handAnchor": [
                  98,
                  169
                ]
              },
              {
                "rect": [
                  940,
                  0,
                  314,
                  276
                ],
                "pivot": [
                  163.5,
                  258
                ],
                "durationTicks": 10,
                "handAnchor": [
                  105,
                  171
                ]
              }
            ]
          },
          "ready": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  276,
                  310,
                  247
                ],
                "pivot": [
                  167.5,
                  230
                ],
                "durationTicks": 20,
                "handAnchor": [
                  132,
                  112
                ]
              },
              {
                "rect": [
                  0,
                  523,
                  323,
                  252
                ],
                "pivot": [
                  184.5,
                  236
                ],
                "durationTicks": 100,
                "handAnchor": [
                  193,
                  28
                ]
              }
            ]
          },
          "jab": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  637,
                  276,
                  302,
                  247
                ],
                "pivot": [
                  157.0,
                  232
                ],
                "durationTicks": 8,
                "handAnchor": [
                  88,
                  108
                ]
              },
              {
                "rect": [
                  939,
                  276,
                  315,
                  247
                ],
                "pivot": [
                  182.0,
                  231
                ],
                "durationTicks": 19,
                "handAnchor": [
                  73,
                  106
                ]
              }
            ]
          },
          "blade": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  523,
                  323,
                  252
                ],
                "pivot": [
                  184.5,
                  236
                ],
                "durationTicks": 12,
                "handAnchor": [
                  193,
                  28
                ]
              },
              {
                "rect": [
                  323,
                  523,
                  327,
                  252
                ],
                "pivot": [
                  214.5,
                  235
                ],
                "durationTicks": 22,
                "handAnchor": [
                  62,
                  106
                ]
              }
            ]
          },
          "throw": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  650,
                  523,
                  290,
                  252
                ],
                "pivot": [
                  147.5,
                  234
                ],
                "durationTicks": 14,
                "handAnchor": [
                  48,
                  106
                ]
              },
              {
                "rect": [
                  940,
                  523,
                  314,
                  252
                ],
                "pivot": [
                  171.5,
                  236
                ],
                "durationTicks": 26,
                "handAnchor": [
                  78,
                  102
                ]
              }
            ]
          },
          "dodge": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  775,
                  337,
                  249
                ],
                "pivot": [
                  148.0,
                  216
                ],
                "durationTicks": 10,
                "handAnchor": [
                  201,
                  205
                ]
              },
              {
                "rect": [
                  337,
                  775,
                  330,
                  249
                ],
                "pivot": [
                  194.5,
                  212
                ],
                "durationTicks": 10,
                "handAnchor": [
                  112,
                  202
                ]
              }
            ]
          },
          "hurt": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  667,
                  775,
                  264,
                  249
                ],
                "pivot": [
                  100.5,
                  218
                ],
                "durationTicks": 8,
                "handAnchor": [
                  65,
                  81
                ]
              },
              {
                "rect": [
                  931,
                  775,
                  323,
                  249
                ],
                "pivot": [
                  144.0,
                  219
                ],
                "durationTicks": 8,
                "handAnchor": [
                  133,
                  49
                ]
              }
            ]
          },
          "thrown": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  1024,
                  338,
                  230
                ],
                "pivot": [
                  137.5,
                  186
                ],
                "durationTicks": 14,
                "handAnchor": [
                  169,
                  67
                ]
              },
              {
                "rect": [
                  338,
                  1024,
                  319,
                  230
                ],
                "pivot": [
                  144.0,
                  177
                ],
                "durationTicks": 14,
                "handAnchor": [
                  90,
                  73
                ]
              }
            ]
          },
          "ko": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  657,
                  1024,
                  272,
                  230
                ],
                "pivot": [
                  145.5,
                  197
                ],
                "durationTicks": 24,
                "handAnchor": [
                  120,
                  180
                ]
              },
              {
                "rect": [
                  929,
                  1024,
                  325,
                  230
                ],
                "pivot": [
                  175.0,
                  192
                ],
                "durationTicks": 66,
                "handAnchor": [
                  100,
                  173
                ]
              }
            ]
          }
        }
      },
      "right": {
        "src": "/game/prologue/v47/youngling-rival-right.png",
        "bodyHeight": 229.5,
        "clips": {
          "idle": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  0,
                  0,
                  319,
                  277
                ],
                "pivot": [
                  162.0,
                  261
                ],
                "durationTicks": 45,
                "handAnchor": [
                  216,
                  156
                ]
              },
              {
                "rect": [
                  319,
                  0,
                  317,
                  277
                ],
                "pivot": [
                  158.5,
                  261
                ],
                "durationTicks": 45,
                "handAnchor": [
                  216,
                  155
                ]
              }
            ]
          },
          "walk": {
            "loop": true,
            "frames": [
              {
                "rect": [
                  636,
                  0,
                  322,
                  277
                ],
                "pivot": [
                  161.0,
                  262
                ],
                "durationTicks": 10,
                "handAnchor": [
                  228,
                  165
                ]
              },
              {
                "rect": [
                  958,
                  0,
                  296,
                  277
                ],
                "pivot": [
                  162.0,
                  262
                ],
                "durationTicks": 10,
                "handAnchor": [
                  232,
                  165
                ]
              }
            ]
          },
          "ready": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  277,
                  320,
                  249
                ],
                "pivot": [
                  160.0,
                  238
                ],
                "durationTicks": 20,
                "handAnchor": [
                  198,
                  114
                ]
              },
              {
                "rect": [
                  0,
                  526,
                  311,
                  255
                ],
                "pivot": [
                  151.0,
                  243
                ],
                "durationTicks": 100,
                "handAnchor": [
                  133,
                  22
                ]
              }
            ]
          },
          "jab": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  643,
                  277,
                  298,
                  249
                ],
                "pivot": [
                  142.0,
                  241
                ],
                "durationTicks": 8,
                "handAnchor": [
                  214,
                  113
                ]
              },
              {
                "rect": [
                  941,
                  277,
                  313,
                  249
                ],
                "pivot": [
                  155.5,
                  240
                ],
                "durationTicks": 19,
                "handAnchor": [
                  272,
                  111
                ]
              }
            ]
          },
          "blade": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  526,
                  311,
                  255
                ],
                "pivot": [
                  151.0,
                  243
                ],
                "durationTicks": 12,
                "handAnchor": [
                  133,
                  22
                ]
              },
              {
                "rect": [
                  311,
                  526,
                  346,
                  255
                ],
                "pivot": [
                  124.0,
                  238
                ],
                "durationTicks": 22,
                "handAnchor": [
                  294,
                  104
                ]
              }
            ]
          },
          "throw": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  657,
                  526,
                  300,
                  255
                ],
                "pivot": [
                  127.0,
                  245
                ],
                "durationTicks": 14,
                "handAnchor": [
                  241,
                  101
                ]
              },
              {
                "rect": [
                  957,
                  526,
                  297,
                  255
                ],
                "pivot": [
                  142.5,
                  239
                ],
                "durationTicks": 26,
                "handAnchor": [
                  243,
                  99
                ]
              }
            ]
          },
          "dodge": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  781,
                  337,
                  248
                ],
                "pivot": [
                  202.0,
                  220
                ],
                "durationTicks": 10,
                "handAnchor": [
                  148,
                  205
                ]
              },
              {
                "rect": [
                  337,
                  781,
                  310,
                  248
                ],
                "pivot": [
                  125.5,
                  214
                ],
                "durationTicks": 10,
                "handAnchor": [
                  211,
                  199
                ]
              }
            ]
          },
          "hurt": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  647,
                  781,
                  304,
                  248
                ],
                "pivot": [
                  174.0,
                  221
                ],
                "durationTicks": 8,
                "handAnchor": [
                  196,
                  72
                ]
              },
              {
                "rect": [
                  951,
                  781,
                  303,
                  248
                ],
                "pivot": [
                  167.5,
                  218
                ],
                "durationTicks": 8,
                "handAnchor": [
                  197,
                  42
                ]
              }
            ]
          },
          "thrown": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  0,
                  1029,
                  354,
                  225
                ],
                "pivot": [
                  198.5,
                  193
                ],
                "durationTicks": 14,
                "handAnchor": [
                  173,
                  65
                ]
              },
              {
                "rect": [
                  354,
                  1029,
                  296,
                  225
                ],
                "pivot": [
                  169.0,
                  180
                ],
                "durationTicks": 14,
                "handAnchor": [
                  141,
                  43
                ]
              }
            ]
          },
          "ko": {
            "loop": false,
            "frames": [
              {
                "rect": [
                  650,
                  1029,
                  263,
                  225
                ],
                "pivot": [
                  133.0,
                  201
                ],
                "durationTicks": 24,
                "handAnchor": [
                  131,
                  176
                ]
              },
              {
                "rect": [
                  913,
                  1029,
                  341,
                  225
                ],
                "pivot": [
                  165.5,
                  191
                ],
                "durationTicks": 66,
                "handAnchor": [
                  229,
                  175
                ]
              }
            ]
          }
        }
      }
    }
  }
};
