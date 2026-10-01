import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
import { firstTracksCompleted, p } from './helpers/solo-v67-campaign-route.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldAccessV69.ts','homeworldRegionsV68.ts','campaignWelcomeV69.ts']);
const passed=firstTracksCompleted();
test('normal villages open after the actually completed youth and First Tracks chapters',()=>{
  assert.equal(api.canVisitHomeworldVillagesV69(passed),true);
  for(const id of api.HOMEWORLD_REGION_IDS_V68.filter(id=>id!=='forbidden-reserve')) {
    assert.equal(api.canEnterHomeworldRegionV68(passed,id).allowed,true,id);
    const save={...passed,homeworldRegionV68:api.createHomeworldRegionV68(id,'young-access-'+id)};
    assert.equal(p.parseSaveImport(JSON.stringify(save)).failure,null,id+' younger regional archive survives real parser');
  }
  assert.equal(api.canEnterHomeworldRegionV68(passed,'forbidden-reserve').allowed,false,'Reserve retains physical investigation prerequisite');
  assert.equal(passed.prologue.chronicle.rites.length,1,'No free recognition');
  assert.equal(api.campaignWelcomeV69(passed).title,'Unblooded — Les Premières Pistes accomplies');
});
test('profile rank or loose chronicle evidence cannot open a youth village without the completed playable chain',()=>{
  for(const edit of [s=>s.soloV66=null,s=>s.soloV66.status='active',s=>s.youthTraining=null,s=>s.youthTraining.checkpoint.phase='dojo',s=>s.soloV66.receipts.pop()]) {
    const save=structuredClone(passed);edit(save);save.profile.rankId='elder';save.profile.honor=999999;
    assert.equal(api.canVisitHomeworldVillagesV69(save),false);
    assert.equal(api.canEnterHomeworldRegionV68(save,'ash-marches').allowed,false);
  }
  assert.equal(api.canVisitHomeworldVillagesV69(p.defaultSave()),true,'independent old campaign remains available');
});
test('new save schema protects future content and preserves original bytes',()=>{
  assert.equal(p.SAVE_VERSION,10);
  for(const edit of [s=>s.version=11,s=>s.soloV69={version:2},s=>s.homeworld.contractsV68={version:3}]) {
    const save=structuredClone(passed);edit(save);const raw=JSON.stringify(save),values=new Map([[p.SAVE_STORAGE_KEY,raw]]);
    const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
    assert.equal(p.parseSaveImport(raw).failure,'future-version');
    p.loadSaveWithStatus(storage);assert.equal(storage.getItem(p.SAVE_STORAGE_KEY),raw);
  }
  const old={...passed,version:9};delete old.soloV69;
  const migrated=p.parseSaveImport(JSON.stringify(old));assert.equal(migrated.failure,null);assert.equal(migrated.save.version,10);
  assert.equal(migrated.save.soloV69,null);assert.deepEqual(migrated.save.soloV66.receipts,passed.soloV66.receipts);
});
