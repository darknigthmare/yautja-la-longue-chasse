import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldPlacementGrammarV81.ts','homeworldAuthoredLotsV81.ts','homeworldUsageEnvelopesV81.ts','homeworldCivicDecorV80.ts','homeworldWorldV77.ts','homeworldGeometryV64.ts','homeworldStreetModulesV78.ts','homeworldUrbanPopulationV78.ts']);

test('V81 evaluates actual buildings, doors, working faces, civilian segments and connectors rather than invented rule IDs',()=>{
 const audit=api.auditHomeworldPlacementV81();
 assert(audit.assertionCount>1000);assert.equal(audit.assertionCount,audit.assertions.length);
 assert.equal(new Set(audit.assertions.map(a=>a.id)).size,audit.assertionCount);
 assert.deepEqual(audit.errors,[]);
 for(const b of api.HOMEWORLD_BUILDINGS_V77)assert(audit.assertions.some(a=>a.objectId===b.id&&a.ruleId==='BUILDING_ENTRANCE_CONNECTED'));
 assert(audit.assertions.some(a=>a.ruleId==='NPC_SOCIAL_ZONE_CLEAR'&&a.objectId.startsWith('resident-')));
 assert(audit.assertions.some(a=>a.ruleId==='BARRIER_GATE_CLEAR'&&a.objectId.startsWith('council-stair:')));
 assert(audit.assertions.every(a=>Number.isFinite(a.position.x)&&Number.isFinite(a.position.y)));
 assert.equal(audit.counts.buildings,43);assert.equal(audit.counts.buildingsMoved,15);
 assert.equal(api.HOMEWORLD_LEGACY_USAGE_OBJECTS_V81.length,audit.counts.legacySolids);
 assert.equal(audit.counts.props,audit.counts.recomposedProps+audit.counts.legacySolids);
 // Legacy/envelope/art gaps remain explicit; no worldwide aesthetic PASS is
 // inferred from the hard checks of the actually recompiled native set.
 assert(audit.violations.some(a=>a.severity==='warning'));
});

test('bench use and social areas remain distinct from its physical hull; a neighboring solid in the use area is refused',()=>{
 const b=api.HOMEWORLD_USAGE_OBJECTS_V81.find(p=>p.role.family==='bench');assert(b?.usage);
 assert.equal(api.homeworldEnvelopesOverlapV81(b.physical,b.usage),false);
 const obstruction={left:b.usage.left+8,right:b.usage.right-8,top:b.usage.top+8,bottom:b.usage.bottom-8};
 assert.equal(api.homeworldEnvelopesOverlapV81(b.physical,obstruction),false,'collision-only test would allow this unusable bench');
 assert.equal(api.homeworldEnvelopesOverlapV81(b.usage,obstruction),true);
 for(const p of api.HOMEWORLD_CIVIC_PROPS_V80)assert.equal(api.homeworldCivicRefusalV80(p,api.HOMEWORLD_CIVIC_PROPS_V80.filter(q=>q!==p)),null,p.id);
});

test('authored port shoulders have seven distinct geometry/recipes and never impose four identical objects on every court',()=>{
 const courts=api.HOMEWORLD_AUTHORED_COURTS_V81.filter(c=>c.levelId==='0');assert.equal(courts.length,7);
 assert.equal(new Set(courts.map(c=>JSON.stringify(c.polygon))).size,7);
 assert.equal(new Set(courts.map(c=>c.composition)).size,7);
 assert(new Set(courts.map(c=>c.props.length)).size>=3);
 assert(courts.some(c=>c.y>5500));assert(courts.some(c=>c.y<5200));
 for(const c of courts){assert(c.focus&&c.props.every(p=>p.purpose.length>15));}
 assert.equal(api.HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78.length,14);
 assert.equal(api.HOMEWORLD_URBAN_EXTRAS_V78.length,14);assert.deepEqual(api.HOMEWORLD_URBAN_EXTRA_REJECTIONS_V78,[]);
});

test('royal inhabitants keep their original IDs and walk outside the new 1100u pyramid foundation',()=>{
 const palace=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='throne-audience');assert(palace.width>=1100);
 for(const r of api.HOMEWORLD_RESIDENTS_V77.filter(r=>r.levelId==='+2'))for(let s=1;s<r.path.length;s++){
  const p=r.path[s-1],q=r.path[s],n=Math.ceil(Math.hypot(q.x-p.x,q.y-p.y));
  for(let i=0;i<=n;i++)assert(api.homeworldWalkableV77(r.levelId,{x:p.x+(q.x-p.x)*i/n,y:p.y+(q.y-p.y)*i/n}),r.id+' clips royal foundation');
 }
});
