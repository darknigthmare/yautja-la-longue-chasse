import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../app/game/ClanWarPanelV85.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('ClanWarPanelV85.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let effect,selection;
function visit(n){
 if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes('stepCanyonV85'))effect=n.arguments[0].getText(ast);
 if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='formation')selection=n.initializer.getText(ast);
 ts.forEachChild(n,visit);
}
visit(ast);assert.ok(effect);assert.ok(selection);
function expression(text,env){return runInNewContext(ts.transpileModule(`(${text})`,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText,env);}
function fixture(options={}){
 let delivered=0,cb,cleared=0;
 const env={running:true,canyon:{phase:'battle'},tab:'canyon',suspended:false,pageActive:true,liveFocus:true,blocked:false,
  root:{current:{closest:()=>env.blocked?{}:null}},pageActivitySnapshotV94:()=>env.liveFocus,
  setCanyon(fn){fn({});delivered++;},stepCanyonV85:s=>s,
  window:{setInterval(fn){cb=fn;return 9;},clearInterval(id){assert.equal(id,9);cleared++;}},...options};
 const cleanup=expression(effect,env)();return{env,cleanup,callback:()=>cb,count:()=>delivered,cleared:()=>cleared};
}
test('the running canyon receives one simulated step per delivered interval',()=>{const f=fixture();f.callback()();assert.equal(f.count(),1);f.callback()();assert.equal(f.count(),2);});
for(const [name,options] of [['manual pause',{running:false}],['different tab',{tab:'korthas'}],['completed battle',{canyon:{phase:'debrief'}}],['parent suspension',{suspended:true}],['inactive page',{pageActive:false}]]){
 test(`${name} never starts the tactical interval`,()=>assert.equal(fixture(options).callback(),undefined));
}
test('focus changes before effect cleanup cannot advance the canyon',()=>{const f=fixture();f.env.liveFocus=false;f.callback()();assert.equal(f.count(),0);f.env.liveFocus=true;f.callback()();assert.equal(f.count(),1);});
test('an inert/hidden settings ancestor blocks the world without pausing the overlay',()=>{const f=fixture();f.env.blocked=true;f.callback()();assert.equal(f.count(),0);f.env.blocked=false;f.callback()();assert.equal(f.count(),1);});
test('a removed scene cannot receive a tactical update from a late callback',()=>{const f=fixture();f.env.root.current=null;f.callback()();assert.equal(f.count(),0);});
test('effect cleanup both cancels the interval and invalidates already-queued callbacks',()=>{const f=fixture();f.cleanup();assert.equal(f.cleared(),1);f.callback()();assert.equal(f.count(),0);});
test('an extracted selected formation falls back to the first formation still in the field',()=>{
 const field={id:'field',extraction:false},out={id:'out',extraction:true};
 assert.equal(expression(selection,{canyon:{formations:[out,field]},selectedFormation:'out'}),field);
});
test('no field formation means no order recipient; extracted actors are never substituted',()=>{
 assert.equal(expression(selection,{canyon:{formations:[{id:'out',extraction:true}]},selectedFormation:'out'}),undefined);
});
test('the durable result label and retry action are wired to confirmed storage state',()=>{
 assert.match(source,/persistedCanyon \? "Résultat déjà archivé"/);assert.match(source,/Résultat en mémoire · sauvegarde non confirmée/);
 assert.match(source,/onClick=\{sessionStore.retryPersistence\}/);assert.match(source,/disabled=\{pendingWrites > 0\}/);
});
