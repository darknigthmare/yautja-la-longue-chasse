import assert from 'node:assert/strict';
import fs from 'node:fs';

// The immutable V71/V75 scenery predates V76 forecourts and the V92 storm
// approach. Preserve its original clearance regression without feeding this
// archived geometry into the playable world, movement or route planner.
const storm=JSON.parse(fs.readFileSync(new URL('../fixtures/homeworld-storm-chain-v72-before-v92.json',import.meta.url),'utf8'));
export function homeworldHistoricalGroundV75(api){
 assert.equal(storm.originalRoute.regionId,'storm-chain');
 assert.equal(storm.originalRoute.clearWidth,200);
 assert.deepEqual(storm.originalRoute.nodes[0],{x:3960,y:500});
 assert.equal(storm.streets.length,storm.originalRoute.nodes.length);
 return [...api.HOMEWORLD_DISTRICTS,
  ...api.HOMEWORLD_STREETS.filter(s=>!s.id.startsWith('forecourt')&&!s.id.startsWith('connection-v72:storm-chain:')),
  ...storm.streets];
}
export function homeworldHistoricalReservedVolumesV75(api){
 const current=[...api.homeworldConnectionFurnitureFootprintsV72(),
  ...api.HOMEWORLD_REGION_CONNECTIONS_V72.flatMap(api.homeworldGatewayFootprintsV72),
  ...api.HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72.map(s=>({id:s.id,left:s.x-s.footprintWorld.width/2,right:s.x+s.footprintWorld.width/2,top:s.y-s.footprintWorld.depth,bottom:s.y}))];
 assert.equal(storm.reservedVolumes.length,7);
 return [...current.filter(p=>!p.id.includes('storm-chain')),...storm.reservedVolumes];
}
