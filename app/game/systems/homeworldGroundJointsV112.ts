/** Two enclosed cracks in the retained level0 paving union, measured during
 * the unmodified mausoleum browser review. Vertices meet the exact adjacent
 * polygon edges; no cliff, threshold, solid or bitmap is moved. The prefix
 * deliberately shares V112 foundation exclusion from historical recovery. */
export const HOMEWORLD_GROUND_JOINTS_V112=[
  {
    id:'foundation-v112:joint-mausoleum-western-promenade',
    label:'Joint du parvis · promenade occidentale',levelId:'0' as const,
    kind:'passage' as const,accent:'#a29276',
    sourceIds:['coast-west:1','forecourt-v76:trophy-mausoleum','forecourt-link-v76:trophy-mausoleum','western-promenade:1'],
    witness:{x:414.36966032182846,y:2122.68635159387},
    polygon:[{x:410,y:2100.650957121848},{x:440,y:2113.0457741844666},
      {x:440,y:2135.4804326965245},{x:410,y:2137.8241826965245}],
  },
  {
    id:'foundation-v112:joint-mausoleum-coast-west',
    label:'Joint du parvis · allée du rivage',levelId:'0' as const,
    kind:'passage' as const,accent:'#a29276',
    sourceIds:['coast-west:0','coast-west:1','forecourt-v76:trophy-mausoleum'],
    witness:{x:418,y:1950},
    polygon:[{x:410,y:1930},{x:432.5123533000317,y:1930},{x:410,y:1984.488145778108}],
  },
];

/** The bounded sweep also catches the second crack, rather than repairing a
 * single screenshot pixel. Edge-connected gaps are intentional outer relief
 * and are reported separately, never automatically filled. */
export const HOMEWORLD_GROUND_JOINT_SCAN_V112={left:100,right:1200,top:1800,bottom:2500,step:1} as const;
