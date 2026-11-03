import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

// Execute the real JSX callbacks and replay/import engine. Effects are not run;
// browser movement/media lifecycle remains covered by the compiled-app recipe.
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'clan-specialized-import-v107-'));
after(()=>fs.rm(directory,{recursive:true,force:true}));
const hooks=`let slots=[],cursor=0;
export function beginRender(){cursor=0;}
export function resetHooks(){slots=[];cursor=0;}
export function useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return [slots[index],next=>{slots[index]=typeof next==='function'?next(slots[index]):next;}];}
export function useRef(initial){const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];}
export function useEffect(){cursor++;}`;
const compiled=await build({stdin:{contents:`export {default as Component} from './app/game/ClanWarSpecializedV107';export * from './app/game/systems/clanWarSpecializedV107';export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';export {beginRender,resetHooks} from 'react';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',jsx:'automatic',logLevel:'silent',plugins:[{name:'controlled-component-hooks',setup(build){build.onResolve({filter:/^react(?:\/jsx-runtime)?$/},args=>({path:args.path,namespace:'controlled-react'}));build.onLoad({filter:/.*/,namespace:'controlled-react'},args=>({contents:args.path==='react'?hooks:`export const Fragment='fragment';export function jsx(type,props){return {type,props};}export const jsxs=jsx;`,loader:'js'}));build.onLoad({filter:/\.module\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
const file=path.join(directory,'component.mjs');await fs.writeFile(file,compiled.outputFiles[0].text);const api=await import(pathToFileURL(file));
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return [];return [tree,...nodes(tree.props?.children)];}
function text(tree){if(Array.isArray(tree))return tree.map(text).join('');if(!tree||typeof tree!=='object')return tree??'';return text(tree.props?.children);}
function component(){
 api.resetHooks();let tree;
 return {
  render(){api.beginRender();tree=api.Component({rules:api.DEFAULT_WAR_RULES_V6});return tree;},
  get tree(){return tree;},
  button(label){const matches=nodes(tree).filter(node=>node.type==='button'&&(node.props['aria-label']===label||text(node)===label));assert.equal(matches.length,1,`one actual button: ${label}`);return matches[0];},
  click(label){this.button(label).props.onClick();return this.render();},
  chooseDuel(){const scenario=nodes(tree).find(node=>node.type==='button'&&text(node).startsWith('W3-S14'));assert.ok(scenario);scenario.props.onClick();this.render();this.click('Commencer Emplacement de duel');const rival=nodes(tree).find(node=>node.type==='button'&&text(node).startsWith('Rival signataire'));assert.ok(rival);rival.props.onClick();this.render();assert.equal(tree.props['data-specialized-selected'],'rival');},
  importInput(){const input=nodes(tree).find(node=>node.type==='textarea'&&!node.props.readOnly);assert.ok(input);return input;},
  fileInput(){const input=nodes(tree).find(node=>node.type==='input'&&node.props.type==='file');assert.ok(input);return input;},
  editImport(json){this.importInput().props.onChange({target:{value:json}});return this.render();},
  selectFile(file){const pending=this.fileInput().props.onChange({target:{files:file?[file]:[]}});this.render();return pending;},
  import(json){this.editImport(json);return this.click('Vérifier puis reprendre ce carnet');},
  checkpoint(){this.click('Préparer l’export vérifié');const output=nodes(tree).find(node=>node.type==='textarea'&&node.props.readOnly);assert.ok(output);return JSON.parse(output.props.value);}
 };
}
function archive(scenario){let state=api.createSpecializedV107(scenario);assert.ok(state);while(state.turn<Math.max(...state.actors.map(actor=>actor.readyAt))){const result=api.applySpecializedV107(state,api.specializedCommandV107(state,{type:'wait'}));assert.equal(result.accepted,true,result.message);state=result.state;}const json=api.exportSpecializedV107(state);assert.ok(json);return {state,json};}

for(const scenario of api.SPECIALIZED_IDS_V107.filter(id=>id!=='W3-S14'))test(`import ${scenario} after selecting the duel rival restores a real movable carrier`,()=>{
 const ui=component();ui.render();ui.chooseDuel();const imported=archive(scenario);assert.doesNotThrow(()=>ui.import(imported.json));
 assert.equal(ui.tree.props['data-specialized-scenario'],scenario);assert.equal(ui.tree.props['data-specialized-selected'],'carrier');const before=ui.checkpoint();assert.deepEqual(before,JSON.parse(imported.json));
 const carrierChoice=nodes(ui.tree).find(node=>node.type==='button'&&text(node).startsWith('Porteurs'));assert.equal(carrierChoice.props['aria-pressed'],true);assert.equal(nodes(ui.tree).filter(node=>node.type==='button'&&node.props['aria-pressed']&&['Opérateurs','Porteurs','Rival signataire'].some(label=>text(node).startsWith(label))).length,1);ui.click('Prendre 20 RAV · U19');const loaded=ui.checkpoint();assert.equal(loaded.actors.find(actor=>actor.id==='carrier').rav,20);assert.equal(loaded.depot,before.depot-20);assert.deepEqual(loaded.actors.find(actor=>actor.id==='operator'),before.actors.find(actor=>actor.id==='operator'));
 ui.click('Marcher vers le sud');const after=ui.checkpoint();assert.equal(after.actors.find(actor=>actor.id==='carrier').y,before.actors.find(actor=>actor.id==='carrier').y+18);assert.deepEqual(after.actors.find(actor=>actor.id==='operator'),before.actors.find(actor=>actor.id==='operator'));assert.deepEqual(after.actors.map(actor=>actor.team.members.map(member=>member.id)),before.actors.map(actor=>actor.team.members.map(member=>member.id)));assert.equal(after.revision,before.revision+2);
 const parsed=api.importSpecializedV107(JSON.stringify(after));assert.ok(parsed.state,parsed.error);
});
test('a refused import preserves the duel checkpoint and its valid rival selection',()=>{
 const ui=component();ui.render();ui.chooseDuel();const before=ui.checkpoint(),future=JSON.stringify({...before,version:2});ui.import(future);assert.equal(ui.tree.props['data-specialized-selected'],'rival');assert.match(text(ui.tree),/incompatible/);assert.deepEqual(ui.checkpoint(),before);
});

function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const importLabel='Vérifier puis reprendre ce carnet';
const pendingFile=read=>({size:128,text:()=>read.promise});

test('choosing a pending file clears the old draft and blocks even the previous import callback',async()=>{
 const ui=component();ui.render();const before=ui.checkpoint(),old=archive('W3-S10'),next=archive('W3-S13'),read=deferred();ui.editImport(old.json);const previousImport=ui.button(importLabel).props.onClick,pending=ui.fileInput().props.onChange({target:{files:[pendingFile(read)]}});
 try{
  previousImport();ui.render();assert.equal(ui.tree.props['data-specialized-scenario'],before.scenario,'imperative loading guard must work before the UI callback is replaced');
  assert.equal(ui.importInput().props.value,'');assert.equal(ui.importInput().props.disabled,true);assert.equal(ui.button(importLabel).props.disabled,true);ui.click(importLabel);assert.deepEqual(ui.checkpoint(),before);
 }finally{read.resolve(next.json);await pending;ui.render();}
 assert.equal(ui.importInput().props.value,next.json);assert.equal(ui.importInput().props.disabled,false);assert.equal(ui.button(importLabel).props.disabled,false);ui.click(importLabel);assert.deepEqual(ui.checkpoint(),JSON.parse(next.json));
});

test('file B remains selected when older file A completes last',async()=>{
 const ui=component();ui.render();const a=deferred(),b=deferred(),first=archive('W3-S10'),latest=archive('W3-S18');const pendingA=ui.selectFile(pendingFile(a)),pendingB=ui.selectFile(pendingFile(b));b.resolve(latest.json);await pendingB;ui.render();ui.click(importLabel);const before=ui.checkpoint(),message=text(nodes(ui.tree).find(node=>node.props.role==='status'));a.resolve(first.json);await pendingA;ui.render();assert.equal(ui.importInput().props.value,latest.json);assert.equal(ui.importInput().props.disabled,false);assert.equal(text(nodes(ui.tree).find(node=>node.props.role==='status')),message);assert.deepEqual(ui.checkpoint(),before);
});

test('an older completion cannot unlock import while the newer file is still pending',async()=>{
 const ui=component();ui.render();const before=ui.checkpoint(),a=deferred(),b=deferred(),pendingA=ui.selectFile(pendingFile(a)),pendingB=ui.selectFile(pendingFile(b));a.resolve(archive('W3-S10').json);await pendingA;ui.render();assert.equal(ui.importInput().props.value,'');assert.equal(ui.importInput().props.disabled,true);assert.equal(ui.button(importLabel).props.disabled,true);ui.click(importLabel);assert.deepEqual(ui.checkpoint(),before);b.resolve(archive('W3-S15').json);await pendingB;ui.render();ui.click(importLabel);assert.equal(ui.tree.props['data-specialized-scenario'],'W3-S15');
});

test('a late read error from A neither rejects nor changes the accepted file B',async()=>{
 const ui=component();ui.render();const a=deferred(),b=deferred(),pendingA=ui.selectFile(pendingFile(a)),pendingB=ui.selectFile(pendingFile(b)),latest=archive('W3-S13');b.resolve(latest.json);await pendingB;ui.render();const message=text(nodes(ui.tree).find(node=>node.props.role==='status'));a.reject(new Error('old read failure'));await assert.doesNotReject(pendingA);ui.render();assert.equal(ui.importInput().props.value,latest.json);assert.equal(ui.importInput().props.disabled,false);assert.equal(text(nodes(ui.tree).find(node=>node.props.role==='status')),message);ui.click(importLabel);assert.deepEqual(ui.checkpoint(),JSON.parse(latest.json));
});

test('the current read rejection is caught and cannot reimport the old valid draft',async()=>{
 const ui=component();ui.render();const before=ui.checkpoint();ui.editImport(archive('W3-S10').json);const previousImport=ui.button(importLabel).props.onClick,read=deferred(),pending=ui.selectFile(pendingFile(read));read.reject(new Error('file not readable'));await assert.doesNotReject(pending);ui.render();assert.equal(ui.importInput().props.value,'');assert.equal(ui.importInput().props.disabled,false);assert.match(text(nodes(ui.tree).find(node=>node.props.role==='status')),/lecture.*impossible/i);previousImport();ui.render();assert.deepEqual(ui.checkpoint(),before);
});

for(const [name,size] of [['empty',0],['oversized',4*1024*1024+1]])test(`${name} selection never reads or reimports the old draft and invalidates a pending file`,async()=>{
 const ui=component();ui.render();const before=ui.checkpoint();ui.editImport(archive('W3-S10').json);const previousImport=ui.button(importLabel).props.onClick,read=deferred(),pending=ui.selectFile(pendingFile(read));let reads=0;await ui.selectFile({size,text:()=>{reads++;return Promise.resolve(archive('W3-S18').json);}});ui.render();assert.equal(reads,0);assert.equal(ui.importInput().props.value,'');assert.equal(ui.importInput().props.disabled,false);assert.match(text(nodes(ui.tree).find(node=>node.props.role==='status')),/vide ou supérieur à 4 Mo/);previousImport();ui.render();read.resolve(archive('W3-S13').json);await pending;ui.render();assert.equal(ui.importInput().props.value,'');assert.deepEqual(ui.checkpoint(),before);
});

test('an empty selection abandons the pending read without restoring the old draft',async()=>{
 const ui=component();ui.render();const before=ui.checkpoint();ui.editImport(archive('W3-S10').json);const read=deferred(),pending=ui.selectFile(pendingFile(read));await ui.selectFile(undefined);read.resolve(archive('W3-S18').json);await pending;ui.render();assert.equal(ui.importInput().props.value,'');assert.equal(ui.importInput().props.disabled,false);ui.click(importLabel);assert.deepEqual(ui.checkpoint(),before);
});

test('native file cancellation invalidates a pending read, including a later rejection',async()=>{
 const ui=component();ui.render();const before=ui.checkpoint(),read=deferred(),pending=ui.selectFile(pendingFile(read)),input=new EventTarget();assert.equal(typeof ui.fileInput().props.ref,'function');const cleanup=ui.fileInput().props.ref(input);assert.equal(typeof cleanup,'function');input.dispatchEvent(new Event('cancel'));ui.render();read.reject(new Error('abandoned file'));await assert.doesNotReject(pending);ui.render();assert.equal(ui.importInput().props.value,'');assert.equal(ui.importInput().props.disabled,false);ui.click(importLabel);assert.deepEqual(ui.checkpoint(),before);
 cleanup();const manual=archive('W3-S10').json;ui.editImport(manual);input.dispatchEvent(new Event('cancel'));ui.render();assert.equal(ui.importInput().props.value,manual,'ref cleanup removes the native listener');
});

test('a queued manual edit cancels an outstanding read and preserves the latest typed draft',async()=>{
 const ui=component();ui.render();const manual=archive('W3-S15'),read=deferred();const edit=ui.importInput().props.onChange,pending=ui.selectFile(pendingFile(read));edit({target:{value:manual.json}});ui.render();assert.equal(ui.importInput().props.disabled,false);read.resolve(archive('W3-S18').json);await pending;ui.render();assert.equal(ui.importInput().props.value,manual.json);ui.click(importLabel);assert.deepEqual(ui.checkpoint(),JSON.parse(manual.json));
});

test('a whitespace-only file releases loading but remains empty and cannot replace the current checkpoint',async()=>{
 const ui=component();ui.render();const before=ui.checkpoint();ui.editImport(archive('W3-S10').json);await ui.selectFile({size:4,text:async()=> ' \n\t '});ui.render();assert.equal(ui.importInput().props.value,'');assert.equal(ui.importInput().props.disabled,false);assert.match(text(nodes(ui.tree).find(node=>node.props.role==='status')),/vide/);ui.click(importLabel);assert.deepEqual(ui.checkpoint(),before);
});
