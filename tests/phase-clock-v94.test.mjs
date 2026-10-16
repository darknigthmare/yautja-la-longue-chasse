import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhaseClockV94} from '../app/game/systems/phaseClockV94.ts';
function timing(value, remainingMs, playSound) {
  assert.equal(value.remainingMs, remainingMs); assert.equal(value.playSound, playSound);
  assert.equal(typeof value.token, 'symbol');
}
test('new phase starts with its whole duration and one sound',()=>{timing(createPhaseClockV94().resume('boot',1200,0),1200,true);});
test('time spent inactive does not consume ritual time',()=>{const c=createPhaseClockV94();c.resume('boot',1200,0);c.pause(300);timing(c.resume('boot',1200,50_000),900,false);});
test('multiple pauses preserve the exact remaining duration',()=>{const c=createPhaseClockV94();c.resume('boot',1200,0);c.pause(200);c.resume('boot',1200,5000);c.pause(5400);assert.equal(c.resume('boot',1200,9000).remainingMs,600);});
test('effect restarts do not replay audio or reset the duration',()=>{const c=createPhaseClockV94();c.resume('boot',1200,0);c.pause(400);timing(c.resume('boot',1200,400),800,false);});
test('late callbacks cannot finish a paused phase',()=>{const c=createPhaseClockV94();const t=c.resume('boot',1200,0);c.pause(300);assert.equal(c.finish('boot',t.token),false);});
test('late callbacks cannot complete a different phase',()=>{const c=createPhaseClockV94();const old=c.resume('boot',1200,0),next=c.resume('remove',650,100);assert.equal(c.finish('boot',old.token),false);assert.equal(c.finish('remove',next.token),true);});
test('the same timer callback can only finish once',()=>{const c=createPhaseClockV94();const t=c.resume('replace',650,0);assert.equal(c.finish('replace',t.token),true);assert.equal(c.finish('replace',t.token),false);});
test('a new consultation gets a new clock and sound',()=>{const c=createPhaseClockV94();c.resume('boot',1200,0);c.reset();timing(c.resume('boot',1200,5000),1200,true);});
test('reset invalidates a callback left from the previous consultation',()=>{const c=createPhaseClockV94();const t=c.resume('replace',650,0);c.reset();assert.equal(c.finish('replace',t.token),false);});
test('late timers cannot produce negative delay',()=>{const c=createPhaseClockV94();c.resume('boot',1200,0);c.pause(3000);assert.equal(c.resume('boot',1200,4000).remainingMs,0);});
test('old timer cannot finish the SAME phase after resume',()=>{
  const c=createPhaseClockV94(), old=c.resume('boot',1200,0);c.pause(200);
  const current=c.resume('boot',1200,8000);
  assert.notEqual(current.token,old.token);assert.equal(c.finish('boot',old.token),false);
  assert.equal(c.finish('boot',current.token),true);
});
test('old consultation cannot finish the same named phase in a new consultation',()=>{
  const c=createPhaseClockV94(), old=c.resume('replace',650,0);c.reset();
  const current=c.resume('replace',650,6000);
  assert.equal(c.finish('replace',old.token),false);assert.equal(c.finish('replace',current.token),true);
});
test('effect restart without pause still invalidates its prior callback',()=>{
  const c=createPhaseClockV94(), old=c.resume('wear',650,0), current=c.resume('wear',650,200);
  timing(current,450,false);assert.equal(c.finish('wear',old.token),false);assert.equal(c.finish('wear',current.token),true);
});
test('a token from another mounted ritual cannot finish this one',()=>{
  const a=createPhaseClockV94().resume('boot',1200,0), c=createPhaseClockV94(), b=c.resume('boot',1200,0);
  assert.equal(c.finish('boot',a.token),false);assert.equal(c.finish('boot',b.token),true);
});
test('invalid durations and timestamps cannot poison the timer',()=>{
  for(const duration of [NaN, Infinity, -1]) timing(createPhaseClockV94().resume('boot',duration,NaN),0,true);
  const c=createPhaseClockV94();c.resume('boot',1200,0);c.pause(NaN);timing(c.resume('boot',1200,100),1200,false);
});
