import test from 'node:test';
import assert from 'node:assert/strict';
import {pageActivitySnapshotV94,serverPageActivityV94,subscribePageActivityV94} from '../app/game/systems/pageActivityV94.ts';
test('server rendering does not need DOM globals',()=>{assert.equal(serverPageActivityV94(),false);assert.equal(pageActivitySnapshotV94(),false);subscribePageActivityV94(()=>{})();});
test('focus and visibility must both be active; subscriptions clean up',()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 const win=new EventTarget(),doc=new EventTarget();let focused=true;
 doc.visibilityState='visible';doc.hasFocus=()=>focused;globalThis.window=win;globalThis.document=doc;
 try{
  let notifications=0;const off=subscribePageActivityV94(()=>notifications++);
  assert.equal(pageActivitySnapshotV94(),true);focused=false;win.dispatchEvent(new Event('blur'));assert.equal(pageActivitySnapshotV94(),false);
  focused=true;doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(pageActivitySnapshotV94(),false);
  doc.visibilityState='visible';win.dispatchEvent(new Event('focus'));assert.equal(pageActivitySnapshotV94(),true);assert.equal(notifications,3);
  off();off();win.dispatchEvent(new Event('focus'));doc.dispatchEvent(new Event('visibilitychange'));assert.equal(notifications,3);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
