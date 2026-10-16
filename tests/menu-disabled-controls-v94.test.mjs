import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../app/game/useMenuGamepad.ts',import.meta.url),'utf8');
const tree=ts.createSourceFile('useMenuGamepad.ts',source,ts.ScriptTarget.Latest,true);
const declaration=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='adjustControl');
class Input {
  constructor(){this.type='range';this.min='0';this.max='10';this.step='1';this._value='5';this.events=[];this.disabled=false;this.inaccessible=false;}
  get value(){return this._value;}set value(value){this._value=value;}
  matches(){return this.disabled;}closest(){return this.inaccessible?this:null;}
  dispatchEvent(event){this.events.push(event.type);}
}
const option=(value,disabled=false,hidden=false)=>({value,disabled,matches:()=>disabled,closest:()=>hidden?{}:null});
class Select extends Input{
  constructor(){super();this.type='select';this._value='one';this.options=[option('one'),option('two',true),option('three')];}
  get value(){return this._value;}set value(value){this._value=value;}
}
const code=ts.transpileModule(declaration.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const adjust=runInNewContext(code+';adjustControl',{HTMLInputElement:Input,HTMLSelectElement:Select,Event});
test('an unavailable focused range is not changed or announced',()=>{const input=new Input();input.inaccessible=true;assert.equal(adjust(input,'right'),false);assert.equal(input.value,'5');assert.deepEqual(input.events,[]);});
test('native disabled semantics are respected independently from focus',()=>{const input=new Input();input.disabled=true;assert.equal(adjust(input,'left'),false);assert.equal(input.value,'5');assert.deepEqual(input.events,[]);});
test('a normal range emits one input and one change for its changed value',()=>{const input=new Input();assert.equal(adjust(input,'right'),true);assert.equal(input.value,'6');assert.deepEqual(input.events,['input','change']);});
test('range upper bound consumes navigation without redundant change events',()=>{const input=new Input();input.value='10';assert.equal(adjust(input,'right'),true);assert.equal(input.value,'10');assert.deepEqual(input.events,[]);});
test('range lower bound consumes navigation without redundant change events',()=>{const input=new Input();input.value='0';assert.equal(adjust(input,'left'),true);assert.equal(input.value,'0');assert.deepEqual(input.events,[]);});
test('hidden options are skipped as well as disabled options',()=>{const select=new Select();select.options=[option('one'),option('hidden',false,true),option('two',true),option('three')];adjust(select,'right');assert.equal(select.value,'three');assert.deepEqual(select.events,['change']);});
test('disabled optgroup semantics do not depend on the option own disabled field',()=>{const select=new Select();select.options[1].disabled=false;adjust(select,'right');assert.equal(select.value,'three');});
test('last select option does not emit another save event',()=>{const select=new Select();select.value='three';assert.equal(adjust(select,'right'),true);assert.deepEqual(select.events,[]);});
test('non-adjustment directions and empty selection remain inert',()=>{const select=new Select();select.options=[];assert.equal(adjust(select,'right'),true);assert.equal(adjust(select,'down'),false);assert.equal(adjust(null,'left'),false);assert.deepEqual(select.events,[]);});
