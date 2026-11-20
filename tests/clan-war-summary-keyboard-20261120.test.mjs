import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {build} from 'esbuild';

const compiled=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarFieldControls';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';",
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const source=readFileSync('app/game/ClanWarRtsSquadsV133.tsx','utf8');
const tree=ts.createSourceFile('ClanWarRtsSquadsV133.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const functions=new Map();let keyboard;
function visit(node){
 if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node);
 if(ts.isJsxOpeningElement(node)&&node.tagName.getText(tree)==='section'&&
   node.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(tree)==='data-testid'&&
    p.initializer&&ts.isStringLiteral(p.initializer)&&p.initializer.text==='war-rts-squads-v133')){
  const attribute=node.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(tree)==='onKeyDown');
  keyboard=attribute?.initializer?.expression;
 }
 ts.forEachChild(node,visit);
}
visit(tree);assert.ok(keyboard,'actual RTS root keyboard handler');
const callbacks=['apply','send','action'].map(name=>{
 const declaration=functions.get(name);assert.ok(declaration,name+' callback');return declaration.getText(tree);
});
const code=ts.transpileModule(callbacks.join('\n')+'\nconst onKeyDown=('+keyboard.getText(tree)+');onKeyDown;',
 {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;

/** Minimal target ancestry for the Node callback test; native summary activation
 * and browser focus are checked separately by qa-clan-war-summary-keyboard-20261120.mjs. */
class Target{
 constructor(tag,parent=null){this.tag=tag;this.parent=parent;}
 closest(selector){
  const tags=selector.split(',').filter(part=>/^[a-z]+$/.test(part));
  if(tags.includes(this.tag))return this;
  for(let ancestor=this.parent;ancestor;ancestor=ancestor.parent)if(tags.includes(ancestor.tag))return ancestor;
  return null;
 }
}
function fixture(){
 const previousElement=Object.getOwnPropertyDescriptor(globalThis,'Element');
 Object.defineProperty(globalThis,'Element',{configurable:true,writable:true,value:Target});
 const draft=api.createWarRtsSquadsV133('W3-RTS01',api.DEFAULT_WAR_RULES_V6);
 const launched=api.launchWarRtsSquadsV133(draft);assert.equal(launched.accepted,true,launched.message);
 const env={...api,state:launched.state,selected:launched.state.squads[0],
  setFeedback(){},setState(next){env.state=next;}};
 const handle=runInNewContext(code,env);
 return{env,handle,restore(){if(previousElement)Object.defineProperty(globalThis,'Element',previousElement);else delete globalThis.Element;}};
}
function key(target,key=' '){
 return{key,target,repeat:false,ctrlKey:false,metaKey:false,altKey:false,
  nativeEvent:{isComposing:false},prevented:false,stopped:false,
  preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
}
test('Space on a focused summary or its child preserves the live RTS state and native default',()=>{
 const f=fixture();
 try{
  const before=f.env.state;assert.ok(before.squads.length>=2);
  const summary=new Target('summary'),child=new Target('span',summary);
  for(const target of [summary,child]){
   const event=key(target);f.handle(event);
   assert.equal(f.env.state,before,'no wait, AI turn, damage, RAV debit or log mutation');
   assert.equal(event.prevented,false,'native summary activation stays available');
   assert.equal(event.stopped,false);
  }
 }finally{f.restore();}
});
test('Space on the actual field still sends one real wait through the production callbacks and reducer',()=>{
 const f=fixture();
 try{
  const before=f.env.state,event=key(new Target('section'));f.handle(event);
  assert.equal(event.prevented,true);assert.equal(event.stopped,true);
  assert.equal(f.env.state.turn,before.turn+1);
  assert.equal(f.env.state.log.length,before.log.length+1);
  assert.notEqual(f.env.state,before);assert.equal(before.turn,0,'input state is immutable');
 }finally{f.restore();}
});
