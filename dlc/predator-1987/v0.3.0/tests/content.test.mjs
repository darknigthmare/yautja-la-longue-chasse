import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_DATA } from '../src/game-data.mjs';

test('all chapters preserve explicit canon beat text', () => {
  for (const campaign of GAME_DATA.campaigns) {
    for (const chapter of campaign.chapters) {
      assert.ok(chapter.canonBeat?.length > 20, `${chapter.id} canonBeat`);
    }
  }
});

test('off-screen reconstructions are flagged', () => {
  const inferred = GAME_DATA.locations.filter((l) => l.canon === 'inferred');
  assert.equal(inferred.length, 1);
  assert.equal(inferred[0].id, 'L29');
});

test('Predator campaign never marks Anna as a target', () => {
  for (const chapter of GAME_DATA.campaigns.find((c)=>c.id==='predator').chapters) {
    assert.equal((chapter.targets ?? []).includes('anna'), false);
  }
});

test('source registry includes plot, weapons and Jungle Hunter references', () => {
  assert.ok(GAME_DATA.sources.length >= 5);
  assert.ok(GAME_DATA.sources.some((s)=>s.url.includes('imfdb')));
  assert.ok(GAME_DATA.sources.some((s)=>s.url.includes('avpcentral')));
});

test('v0.2 adds three-plane topology without changing 36 canonical sectors', () => {
  assert.equal(GAME_DATA.locations.length,36);
  assert.ok(GAME_DATA.locations.some(l=>l.planes.includes('canopée')));
  assert.ok(GAME_DATA.locations.some(l=>l.planes.includes('plan-arriere')));
  assert.ok(GAME_DATA.locations.every(l=>l.fieldIntel?.x>0));
});

test('every chapter has replay mastery and optional field intel objective',()=>{
 for(const c of GAME_DATA.campaigns) for(const ch of c.chapters){
   assert.ok(ch.mastery.length>=3,ch.id);
   assert.match(ch.optionalObjective,/Dossier terrain/);
 }
});
