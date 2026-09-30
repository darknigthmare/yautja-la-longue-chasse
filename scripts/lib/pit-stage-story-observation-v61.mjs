import assert from 'node:assert/strict';

/** React commits DOM telemetry before its canvas effect. A single previous-round
 * final pose can be sampled during that gap; this is not a current-round cue.
 * No broad delay/tolerance: both adjacent observations must prove that exact handoff. */
export function verifyPitStoryIntroSamplesV61(samples, definitions) {
  const mixed=[],seen=new Set();
  for(const [index,sample] of samples.entries()) {
    if(!['intro-left','intro-right','countdown'].includes(sample.presentation))continue;
    const active=sample.events.filter(event=>event.active);if(!active.length)continue;
    const previous=samples[index-1],next=samples[index+1],key=sample.stage+':'+sample.round;
    assert(sample.presentation==='countdown'&&sample.round>1,'An initial intro/countdown cannot contain any active story gesture');
    assert(!seen.has(key),'Multiple mixed samples would exceed the bounded DOM/canvas handoff');
    assert(previous?.stage===sample.stage&&previous.round===sample.round-1&&previous.phase==='round-over'&&previous.presentation==='round-result',
      'A mixed observation must directly follow the previous real round result');
    assert(next?.stage===sample.stage&&next.round===sample.round&&next.phase==='round'&&next.presentation==='countdown'
      &&next.frame===sample.frame&&next.events.every(event=>!event.active),
      'The immediately following sample must settle inactive at the current round and unchanged simulation tick');
    for(const event of active) {
      const definition=definitions.find(candidate=>candidate.id===event.eventId),prior=previous.events.find(candidate=>candidate.eventId===event.eventId);
      assert(definition&&['round-victory','round-end'].includes(definition.trigger),'Only a previous round-result pose can cross this observer handoff');
      assert.equal(event.occurrence,`round:${sample.round-1}:result`,'A current-round event during countdown is forbidden');
      assert(prior?.active&&prior.occurrence===event.occurrence,'The previous sample must attest that same result occurrence');
      assert.equal(event.nativeFrame,definition.frames.length-1,'Only the last native pose can be an old result sample');
      const first=(definition.frames.length-1)*60/definition.fps,end=definition.frames.length*60/definition.fps;
      assert(event.elapsedFrames>=first&&event.elapsedFrames<end,'Old result clock must still be within the last native pose');
    }
    seen.add(key);mixed.push({sampleIndex:index,stageId:sample.stage,previousRound:sample.round-1,currentRound:sample.round,simulationFrame:sample.frame,
      previousPresentation:previous.presentation,currentPresentation:sample.presentation,nextPresentation:next.presentation,
      events:active.map(({eventId,occurrence,nativeFrame,elapsedFrames})=>({eventId,occurrence,nativeFrame,elapsedFrames})),nextSampleInactive:true});
  }
  return mixed;
}
