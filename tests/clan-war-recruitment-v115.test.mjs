import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle=await build({stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const war=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=war.DEFAULT_WAR_RULES_V6;
const starting=()=>war.createWarOperationsV115(rules);

test("the complete 30-unit V6 source is selectable and a paid medic is not created instantly",()=>{
  assert.equal(rules.units.length,30);
  const source=rules.units.find(unit=>unit.id==="W3-U18");
  assert.ok(source);
  const state=starting(),before=JSON.stringify(state);
  const queued=war.queueWarRecruitmentV115(state,source.id,1000,rules);
  assert.equal(queued.accepted,true,queued.message);
  assert.equal(queued.state.teams.length,state.teams.length);
  assert.equal(queued.state.rav,state.rav-source.recruitmentRav);
  assert.equal(queued.state.pendingRecruits[0].dueAt,1000+source.delayTurns*15000);
  assert.equal(queued.state.pendingRecruits[0].paidRav,source.recruitmentRav);
  assert.equal(JSON.stringify(state),before);
  assert.equal(war.settleWarRecruitmentsV115(queued.state,queued.state.pendingRecruits[0].dueAt-1,rules).accepted,false);
  const arrival=war.settleWarRecruitmentsV115(queued.state,queued.state.pendingRecruits[0].dueAt,rules);
  assert.equal(arrival.accepted,true);
  assert.equal(arrival.state.pendingRecruits.length,0);
  assert.equal(arrival.state.teams.length,state.teams.length+1);
  const added=arrival.state.teams.at(-1);
  assert.equal(added.unitId,"W3-U18");
  assert.equal(added.members.length,source.fullMembers);
  assert.ok(added.members.every(member=>member.xp===0&&member.status==="fit"));
  assert.ok(arrival.state.recruitedTeamIds.includes(added.id));
  assert.equal(war.settleWarRecruitmentsV115(arrival.state,Date.now(),rules).accepted,false);
  assert.deepEqual(war.readWarOperationsV115(JSON.stringify(arrival.state),rules),arrival.state);
});

test("queue obeys both limited simultaneous arrivals and finite RAV, without duplicated identifiers",()=>{
  let state=starting();
  for(const unit of rules.units.slice(0,4)){
    const result=war.queueWarRecruitmentV115(state,unit.id,1000,rules);
    assert.equal(result.accepted,true);
    state=result.state;
  }
  assert.equal(state.pendingRecruits.length,4);
  assert.equal(war.queueWarRecruitmentV115(state,"W3-U05",1000,rules).accepted,false);
  const ids=state.pendingRecruits.map(a=>a.teamId);
  assert.equal(new Set(ids).size,ids.length);
  const before=state.rav;
  const next=war.settleWarRecruitmentsV115(state,1000000,rules);
  assert.equal(next.accepted,true);
  assert.equal(next.state.rav,before);
  assert.equal(next.state.teams.length,starting().teams.length+4);
  assert.equal(next.state.pendingRecruits.length,0);
});

test("a pending recruit cannot deploy, and a future or corrupted arrival preserves existing archive",()=>{
  const s=starting(),unit=rules.units.find(u=>u.id==="W3-U18");
  const queued=war.queueWarRecruitmentV115(s,unit.id,1000,rules).state;
  const target=rules.territories.find(t=>t.id!==s.baseId)?.id;
  assert.ok(war.warMissionEligibleV115(queued,rules,target,[queued.pendingRecruits[0].teamId]));
  assert.deepEqual(war.readWarOperationsV115(JSON.stringify(queued),rules),queued);
  const corrupt=structuredClone(queued);
  corrupt.pendingRecruits[0].dueAt=corrupt.pendingRecruits[0].startedAt-1;
  assert.equal(war.readWarOperationsV115(JSON.stringify(corrupt),rules),null);
  const duplicate=structuredClone(queued);
  duplicate.pendingRecruits.push({...duplicate.pendingRecruits[0]});
  assert.equal(war.readWarOperationsV115(JSON.stringify(duplicate),rules),null);
  const impossible=war.queueWarRecruitmentV115({...s,rav:0},unit.id,1000,rules);
  assert.equal(impossible.accepted,false);
});
