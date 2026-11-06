import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_DATA } from '../src/game-data.mjs';
import { createProgress, completeChapter, getCampaign, getChapter, getLocation, stepSatisfied, validateData } from '../src/core.mjs';

test('dataset has two campaigns', () => {
  assert.equal(GAME_DATA.campaigns.length, 2);
  assert.equal(getCampaign(GAME_DATA, 'human').chapters.length, 16);
  assert.equal(getCampaign(GAME_DATA, 'predator').chapters.length, 12);
});

test('locations resolve and count is 36', () => {
  assert.equal(GAME_DATA.locations.length, 36);
  assert.equal(getLocation(GAME_DATA, 'L28').theme, 'mud');
});

test('data references are valid', () => {
  assert.deepEqual(validateData(GAME_DATA), []);
});

test('progress advances without duplicate completions', () => {
  const p = createProgress();
  completeChapter(p, 'human', 'H01', 1);
  completeChapter(p, 'human', 'H01', 1);
  assert.deepEqual(p.human.completed, ['H01']);
  assert.equal(p.human.unlocked, 1);
});

test('generic objective checks', () => {
  assert.equal(stepSatisfied({type:'reach',x:100},{x:101}), true);
  assert.equal(stepSatisfied({type:'survive',seconds:3},{stepElapsed:2.9}), false);
  assert.equal(stepSatisfied({type:'eliminate',count:4},{kills:4}), true);
  assert.equal(stepSatisfied({type:'bossDamage',amount:3},{bossHits:3}), true);
  assert.equal(stepSatisfied({type:'interact'},{interacted:true}), true);
  assert.equal(stepSatisfied({type:'scan'},{scanned:true}), true);
  assert.equal(stepSatisfied({type:'cloak'},{cloak:true}), true);
  assert.equal(stepSatisfied({type:'placeTrap'},{trapPlaced:true}), true);
  assert.equal(stepSatisfied({type:'mimic'},{mimicked:true}), true);
  assert.equal(stepSatisfied({type:'meleeTarget',target:'billy'},{targetsHit:['billy']}), true);
});

test('canonical closing chapters exist', () => {
  assert.equal(getChapter(GAME_DATA,'human',15).id, 'H16');
  assert.equal(getChapter(GAME_DATA,'predator',11).id, 'P12');
});

test('v0.3 progress includes asymmetric hunt systems', () => {
  const p=createProgress();
  assert.deepEqual(p.trophies, []);
  assert.deepEqual(p.trapCraft, {});
  assert.deepEqual(p.mastery, {});
});

test('v0.3 keeps canonical campaign dimensions', () => {
  assert.equal(GAME_DATA.version, '0.3.0');
  assert.equal(GAME_DATA.locations.length, 36);
  assert.equal(getCampaign(GAME_DATA,'human').chapters.length,16);
  assert.equal(getCampaign(GAME_DATA,'predator').chapters.length,12);
});
