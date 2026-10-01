import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
const result=await build({stdin:{contents:"export * from './app/game/systems/homeworldInteriorShellV64.ts';export * from './app/game/systems/homeworldInteriorsV64.ts';export * from './app/game/systems/homeworldElementCodexV64.ts';export * from './app/game/systems/homeworldGeometryV64.ts';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const model=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('43 floors and286 native panels have stable unique records, including every clipped terminal module',()=>{
  const shells=model.HOMEWORLD_INTERIORS_V64.map(model.homeworldInteriorShellV64);
  const panels=shells.flatMap(s=>s.groups.flatMap(g=>g.panels));
  assert.equal(shells.length,43);assert.equal(panels.length,286);assert.equal(new Set(panels.map(p=>p.id)).size,286);
  for(const room of model.HOMEWORLD_INTERIORS_V64){
    const shell=model.homeworldInteriorShellV64(room),record=model.homeworldElementByIdV64(`floor:${shell.floor.id}`);
    assert.equal(record.asset,shell.floor.art.src);assert.deepEqual(record.dimensions,{width:room.width,depth:room.depth,height:0});
    for(const group of shell.groups){
      assert.equal(group.panels.reduce((sum,p)=>sum+p.visibleLength,0),group.side==='north'?room.width:room.depth);
      for(const panel of group.panels){const r=model.homeworldElementByIdV64(`panel:${panel.id}`);
        assert.deepEqual(r.footprint,panel.footprint);assert.deepEqual(r.dimensions,panel.dimensions);assert.equal(r.asset,panel.art.src);
        assert(panel.visibleLength>0&&panel.visibleLength<=180);
      }
    }
  }
});
test('shared shell preserves reviewed north/side pixel pivots and clipped sizes without vertical distortion',()=>{
  const room=model.HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId==='residence-port-1');
  const shell=model.homeworldInteriorShellV64(room),[north,west,east]=shell.groups,sin=model.HOMEWORLD_GEOMETRY_V64.depthScale;
  assert.deepEqual(north.clip,{left:0,top:-170,width:328,height:175});
  assert.deepEqual(north.panels.map(p=>p.localPaintPivot),[{x:90,y:170},{x:270,y:170}]);
  assert.deepEqual(north.panels.map(p=>p.visibleLength),[180,148]);
  assert.deepEqual(west.clip,{left:-20,top:-50,width:40,height:208*sin+53});
  assert.equal(east.clip.left,308);
  for(const side of [west,east])for(const panel of side.panels){
    assert(Math.abs(side.clip.top+panel.localPaintPivot.y-panel.groundPivot.y*sin)<1e-8);
    assert.equal(side.clip.left+panel.localPaintPivot.x,panel.groundPivot.x);
  }
  const large=model.homeworldInteriorShellV64(model.HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId==='throne-audience'));
  assert.deepEqual(large.groups[0].panels.map(p=>p.visibleLength),[180,180,180,28]);
});
test('Surface and codex consume the one shell helper; rendering does not own independent module counts',()=>{
  const surface=readFileSync('app/game/HomeworldInteriorSurface.tsx','utf8'),codex=readFileSync('app/game/systems/homeworldElementCodexV64.ts','utf8');
  for(const source of [surface,codex])assert.match(source,/homeworldInteriorShellV64\(room\)/);
  assert.match(surface,/shell\.groups\.map/);assert.match(surface,/style=\{group\.clip\}/);
  assert.doesNotMatch(surface,/Math\.ceil|moduleLengthWorld/);
});
