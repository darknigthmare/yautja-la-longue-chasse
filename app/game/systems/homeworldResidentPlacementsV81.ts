/** Authored routines for the rebuilt royal forecourt. IDs, personas, dialogue
 * and visit/save ownership stay unchanged. No citizen walks through the new
 * 1100×700 pyramid simply because their V69 route predated that foundation. */
export const HOMEWORLD_RESIDENT_PATH_REVISIONS_V81:Readonly<Record<string,readonly {x:number;y:number}[]>>={
 'resident-citadel-1':[{x:3910,y:1070},{x:3820,y:1210}],
 'resident-citadel-2':[{x:3890,y:490},{x:3905,y:870}],
 'resident-citadel-3':[{x:5150,y:560},{x:5110,y:1055}],
 'resident-citadel-4':[{x:5200,y:1150},{x:5200,y:1430}],
 'resident-v69-citadel-1':[{x:3895,y:1265},{x:3910,y:1350}],
 'resident-v69-citadel-2':[{x:4735,y:1100},{x:4930,y:1160}],
 'resident-v69-citadel-3':[{x:4710,y:1390},{x:4730,y:1170}],
 // The council's enlarged angled hall reserves its whole foundation. Patrols
 // use the northern gallery; emissaries and brazier carriers use side courts.
 'resident-temple-2':[{x:3300,y:385},{x:3450,y:350}],
 'resident-temple-3':[{x:2870,y:1170},{x:3010,y:1200}],
 'resident-v69-temple-1':[{x:3580,y:1040},{x:3685,y:980}],
 'resident-v69-temple-2':[{x:4260,y:880},{x:4260,y:1050}],
 // Household thresholds, loading fronts and the merchant queue are separate
 // pockets. The courier follows the exterior eastern path, not the new house.
 'resident-market-3':[{x:2040,y:3260},{x:2140,y:3300}],
 'resident-forges-3':[{x:2760,y:3215},{x:2900,y:3335}],
 'resident-v69-market-2':[{x:2785,y:3070},{x:2785,y:3150}],
 'resident-v69-market-3':[{x:2480,y:3290},{x:2680,y:3240}],
 'resident-v69-forges-1':[{x:2640,y:2555},{x:2720,y:2555}],
};
