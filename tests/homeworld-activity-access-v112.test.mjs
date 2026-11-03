import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const mount=load('homeworldPublicPlacesMountV112'),places=load('homeworldPublicPlacesV112');
const access=load('homeworldActivityAccessV112'),local=load('homeworldCartographyDefinitionV104').HOMEWORLD_CARTOGRAPHY_V104;
const cargo=load('homeworldCargoDefinitionV108').HOMEWORLD_CARGO_V108;
const archive=load('homeworldArchiveDefinitionV106').HOMEWORLD_ARCHIVE_V106;
const overlap=load('homeworldStreetDecorV83').homeworldStreetDecorOverlapV83;
const profiles=[{halfWidth:24,halfDepth:14},{halfWidth:36,halfDepth:26}];
const bodyPolygon=(p,body)=>[{x:p.x-body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y+body.halfDepth},{x:p.x-body.halfWidth,y:p.y+body.halfDepth}];
const marker=places.HOMEWORLD_PUBLIC_PLACE_CANDIDATES_V112.find(item=>item.id==='public-place-v112:register-marker');
const revision=places.HOMEWORLD_PUBLIC_PLACE_REVISIONS_V112.find(item=>item.id===marker.id);

test('late admission protects all64 actual activity coordinates and30 functional links, including derived pickup/Atlas stands',()=>{
  const records=access.HOMEWORLD_ACTIVITY_FIXED_ACCESS_V112;
  assert.equal(new Set(records.map(row=>[row.levelId,row.point.x,row.point.y].join(':'))).size,64);
  assert.equal(access.HOMEWORLD_ACTIVITY_FIXED_SEGMENTS_V112.length,30);
  for(const point of [local.host,local.post,...local.waypoints])assert(records.some(row=>row.activity==='V104'&&row.point.x===point.x&&row.point.y===point.y));
  for(const item of archive.cases)assert(records.some(row=>row.role==='fixed-objective-approach'&&row.point.x===item.origin.x&&row.point.y===item.origin.y+55));
  const passage=access.HOMEWORLD_ACTIVITY_FIXED_SEGMENTS_V112.find(row=>row.activity==='V108'&&row.id.endsWith('passage-wide-body'));
  assert.deepEqual(passage.from,cargo.passage.start);assert.deepEqual(passage.to,cargo.passage.end);assert.equal(passage.body.halfDepth,cargo.passage.halfDepth);
  assert.equal(passage.body.halfDepth,34);
  for(const row of records)assert(mount.HOMEWORLD_PUBLIC_PLACE_INPUT_V112.reserves.some(reserve=>reserve.levelId===row.levelId&&overlap(reserve.polygon,bodyPolygon(row.point,profiles[1]))));
});

test('the original V112 proposal reproduces the blocked fixed waypoint and both unsafe proposals now fail actual admission',()=>{
  const historical={...marker,...revision.before},unprotected={...mount.HOMEWORLD_PUBLIC_PLACE_INPUT_V112,
    reserves:mount.HOMEWORLD_PUBLIC_PLACE_INPUT_V112.reserves.filter(row=>!row.id.startsWith('activity-access-v112:')&&!row.id.startsWith('activity-path-v112:')&&!row.id.startsWith('native-cartography-approach:'))};
  const old=places.compileHomeworldPublicPlacesV112(unprotected,[historical]);assert.equal(old.accepted.length,1);
  for(const body of profiles)assert(overlap(places.homeworldPublicPlacePolygonV112(historical),bodyPolygon(local.waypoints[0],body)),'the old full native solid really occupied the saved activity approach');
  for(const candidate of [historical,...revision.rejectedAlternatives.map(row=>({...marker,x:row.x,y:row.y}))]){
    const result=places.compileHomeworldPublicPlacesV112(mount.HOMEWORLD_PUBLIC_PLACE_INPUT_V112,[candidate]);
    assert.equal(result.accepted.length,0);assert.match(result.refusals[0].reason,/^reserved:(?:activity-|native-cartography-approach:)/);
  }
  const current=places.compileHomeworldPublicPlacesV112(mount.HOMEWORLD_PUBLIC_PLACE_INPUT_V112);
  assert.equal(current.accepted.length,6);assert.equal(current.refusals.length,4);
  assert(current.accepted.some(item=>item.id===marker.id&&item.x===revision.after.x&&item.y===revision.after.y));
});

test('every fixed activity contact and every sampled functional link stays clear of all six new native solids',()=>{
  for(const row of access.HOMEWORLD_ACTIVITY_FIXED_ACCESS_V112)for(const body of profiles)assert.equal(places.homeworldPublicPlaceCollisionV112(row.levelId,row.point,body),null,row.id);
  for(const row of access.HOMEWORLD_ACTIVITY_FIXED_SEGMENTS_V112){
    const count=Math.max(1,Math.ceil(Math.hypot(row.to.x-row.from.x,row.to.y-row.from.y))),body={halfWidth:Math.max(36,row.body.halfWidth),halfDepth:Math.max(26,row.body.halfDepth)};
    for(let n=0;n<=count;n++){
      const point={x:row.from.x+(row.to.x-row.from.x)*n/count,y:row.from.y+(row.to.y-row.from.y)*n/count};
      assert.equal(places.homeworldPublicPlaceCollisionV112(row.levelId,point,row.body),null,row.id+' native');
      assert.equal(places.homeworldPublicPlaceCollisionV112(row.levelId,point,body),null,row.id+' clearance');
    }
  }
});

test('the unchanged V104 source objects, fixed centers and three motor-clear legs remain usable',()=>{
  const civic=load('homeworldCivicWorldV80'),navigation=load('homeworldNavigationV77'),cartography=load('homeworldCartographyV104');
  assert(cartography.cartographyServicePresentV104(),'the retained lectern, planter and lamp remain at their exact source coordinates');
  const path=[local.post,...local.waypoints,local.post];
  for(const point of path)for(const body of profiles)assert(civic.homeworldCivicWalkableV80('0',point,body));
  for(let n=1;n<path.length;n++)assert(navigation.homeworldRouteSegmentV77('0',path[n-1],path[n]));
  assert.deepEqual({x:local.waypoints[0].x,y:local.waypoints[0].y},{x:6120,y:5020},'the original activity center remains fixed');
  assert.equal(places.HOMEWORLD_PUBLIC_PLACES_V112.find(item=>item.id==='public-place-v112:traveler-marker').x,4800,'canonical checkpoint recovery source is not relocated');
});
