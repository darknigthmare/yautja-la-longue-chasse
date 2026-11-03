import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
import { firstTracksCompleted, p } from './helpers/solo-v67-campaign-route.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldAccessV69.ts','clanChronicle.ts','homeworldCharacterPlacementV64.ts']);

test('youth visual policy follows recognized chronicle independently of XP and saved presets',()=>{
  const save=firstTracksCompleted(),before=structuredClone(save);
  assert.equal(api.getChronicleRank(save.prologue.chronicle),'unblooded');
  assert.equal(api.usesHomeworldYouthAppearanceV69(save),true);
  for(const presetId of ['classic','city-hunter','custom']) {
    const candidate=structuredClone(save);candidate.appearance.presetId=presetId;candidate.profile.rankId='elder';candidate.profile.honor=999999;
    const bytes=JSON.stringify(candidate);assert.equal(api.usesHomeworldYouthAppearanceV69(candidate),true);assert.equal(JSON.stringify(candidate),bytes);
  }
  assert.deepEqual(save,before);assert.equal(api.usesHomeworldYouthAppearanceV69(p.defaultSave()),false,'Old independent adult campaigns retain their own preset');
});

test('visual policy retains the city behavior through every correctly recognized rank',()=>{
  let chronicle=api.createClanChronicle();
  const save={prologue:{chronicle}};
  assert.equal(api.usesHomeworldYouthAppearanceV69(save),true,'Youngling fallback keeps established city policy');
  for(const evidence of api.CHRONICLE_EVIDENCE)chronicle=api.recordChronicleEvidence(chronicle,evidence).state;
  for(const rite of api.CHRONICLE_RITES.filter(r=>r.grantsRankId)) {
    const result=api.performChronicleRite(chronicle,rite);assert.equal(result.accepted,true);chronicle=result.state;
    const rank=api.getChronicleRank(chronicle);assert.equal(rank,rite.grantsRankId);
    assert.equal(api.usesHomeworldYouthAppearanceV69({prologue:{chronicle}}),!['blooded','elite','elder','ancient'].includes(rank),rank);
  }
});

test('shared youth bitmap has measured native support and stature82 without stretching',()=>{
  const plate=api.HOMEWORLD_YOUTH_PLATE_V69,measure=JSON.parse(fs.readFileSync('app/game/data/homeworldCharacterGroundV64.json','utf8')).portraits[plate.plateId];
  assert.equal(plate.src,'/game/prologue/v47/unblooded-player.png');assert(fs.existsSync('public'+plate.src));assert.equal(plate.physicalHeight,82);assert.equal(plate.exactPreset,false);
  const placement=api.homeworldPortraitPlacementV64(plate.plateId,plate.src,plate.physicalHeight);assert(placement);
  const scale=placement.width/measure.width;
  assert(Math.abs(placement.height/measure.height-scale)<1e-12,'Native aspect ratio is preserved');
  assert(Math.abs(measure.alpha.height*scale-82)<1e-9,'Painted body remains the same youth stature in every scene');
  assert(Math.abs(placement.left+measure.support.x*scale)<1e-9);assert(Math.abs(placement.top+measure.support.y*scale)<1e-9,'Both supported feet stay on the ground anchor');
});
