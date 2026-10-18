import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const bundle=await build({stdin:{contents:"export * from './app/game/systems/campaignSlots'; export {defaultSave,exportSave} from './app/game/save';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
const label=node=>Array.isArray(node)?node.map(label).join(''):node&&typeof node==='object'?label(node.props?.children):node==null||typeof node==='boolean'?'':String(node);
function store(){const values=new Map(),writes=[];return{values,writes,getItem:key=>values.get(key)??null,setItem(key,value){writes.push(key);values.set(key,value);},removeItem(key){writes.push(key);values.delete(key);}};}
const raw=(name='Texte conservé',owner='2026-10-09T12:00:00.000Z')=>{const save=api.defaultSave(owner);save.profile.hunterName=name;return api.exportSave(save);};

// Actual handlers and real import preparer; transparent hook/effect scheduling.
// No browser DOM, localStorage writes, fabricated opaque plans or activation.
function menu(s=store()){
 const values=[],refs=[],effects=[],calls=[],prepared=[];let cursor=0,refCursor=0,effectCursor=0,dirty=false,pending=[];
 const exports={},jsx=(type,props)=>({type,props});
 class Input{} class Select{} class Textarea{}
 const compiled=ts.transpileModule(fs.readFileSync('app/game/CampaignMainMenu.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(compiled,{exports,TextEncoder,HTMLInputElement:Input,HTMLSelectElement:Select,HTMLTextAreaElement:Textarea,
  require(name){if(name==='react')return{
   useState(initial){const index=cursor++;if(!(index in values))values[index]=initial;return[values[index],next=>{const value=typeof next==='function'?next(values[index]):next;if(!Object.is(value,values[index]))dirty=true;values[index]=value;}];},
   useRef(initial){const index=refCursor++;return refs[index]??={current:initial};},useCallback:callback=>callback,
   useLayoutEffect(callback,deps){const index=effectCursor++,previous=effects[index];if(!previous||!deps||deps.some((value,n)=>!Object.is(value,previous.deps?.[n])))pending.push(()=>{previous?.cleanup?.();effects[index]={deps,cleanup:callback()};});},
  };if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name.includes('useMenuGamepad'))return{useMenuGamepad(){}};if(name.includes('campaignSlots'))return api;return{default:{}};}});
 const props={catalog:api.loadCampaignSlots(s),busy:false,message:null,onRefresh(){},onCreate(){},onContinue:id=>calls.push(['continue',id]),onLoad(){},onRecover(){},
  onPrepareImport:(id,text)=>{prepared.push([id,text]);return api.prepareCampaignSlotImport(id,text,s);},onImport:preview=>calls.push(['import',preview])};
 const render=()=>{let tree,n=0;do{assert(n++<8,'Hook scheduling converges');dirty=false;cursor=0;refCursor=0;effectCursor=0;pending=[];tree=exports.default(props);for(const callback of pending)callback();}while(dirty);return tree;};
 const find=key=>walk(render()).find(node=>node.props?.[key]);
 const byId=id=>walk(render()).find(node=>node.props?.id===id);
 const click=key=>{const button=find(key);assert(button);assert(!button.props.disabled);button.props.onClick({currentTarget:{isConnected:false}});render();};
 const button=starts=>walk(render()).find(node=>node.type==='button'&&label(node).startsWith(starts));
 const paste=text=>{const textarea=byId('campaign-import-text');assert(textarea&&!textarea.props.disabled);textarea.props.onChange({target:{value:text}});render();};
 const read=async(file)=>{const input=byId('campaign-import-file');assert(input&&!input.props.disabled);input.props.onChange({currentTarget:{files:[file],value:'path'}});render();await tick();render();};
 return{props,calls,prepared,store:s,render,find,byId,click,button,paste,read,Textarea,keyboardScope:root=>{refs[2].current=root;},unmount:()=>effects.forEach(effect=>effect?.cleanup?.())};
}

test('pasted JSON uses the existing real preparation and separate protected confirmation without direct import or activation',()=>{
 const ui=menu();ui.click('data-campaign-import-open');ui.paste(raw());assert.equal(ui.prepared.length,0);assert.equal(ui.calls.length,0);
 ui.click('data-campaign-import-text-prepare');assert.equal(ui.prepared.length,1);assert.equal(ui.prepared[0][0],1);
 const preview=ui.find('data-campaign-import-preview');assert(preview);assert.equal(ui.store.writes.length,0);assert.equal(ui.calls.length,0);
 ui.click('data-campaign-import-prepare');assert(ui.find('data-campaign-import-confirmation'));assert.equal(ui.calls.length,0);
 ui.click('data-campaign-import-confirm');assert.equal(ui.calls.length,1);assert.equal(ui.calls[0][0],'import');assert.equal(ui.calls[0][1].hunterName,'Texte conservé');
 assert.equal(ui.calls[0][1].slotId,1);assert.equal(ui.calls.some(call=>call[0]==='continue'),false);assert.equal(ui.store.writes.length,0);
});

test('invalid JSON and UTF-8 byte overflow leave all slots untouched; overflow is rejected before preparation',()=>{
 const ui=menu();ui.click('data-campaign-import-open');ui.paste('{broken');ui.click('data-campaign-import-text-prepare');assert(!ui.find('data-campaign-import-preview'));
 assert.equal(ui.prepared.length,1);ui.paste('𐍈'.repeat(Math.floor(api.CAMPAIGN_SLOT_IMPORT_MAX_BYTES/4)+1));
 ui.click('data-campaign-import-text-prepare');assert.equal(ui.prepared.length,1);assert(!ui.find('data-campaign-import-preview'));
 assert.match(label(ui.render()),/maximum 1 Mio UTF-8/);assert.equal(ui.calls.length,0);assert.equal(ui.store.writes.length,0);
 ui.paste(' \n ');const button=ui.find('data-campaign-import-text-prepare');assert(button.props.disabled);button.props.onClick();assert.equal(ui.prepared.length,1);
});

test('busy, occupied or protected destination refuses even its current preparation handler without storing anything',()=>{
 for(const kind of ['busy','occupied','protected']){
  const ui=menu();ui.click('data-campaign-import-open');ui.paste(raw());
  if(kind==='busy')ui.props.busy=true;
  else if(kind==='protected')ui.props.catalog={...ui.props.catalog,status:'blocked',failure:'future-version'};
  else ui.props.catalog={...ui.props.catalog,slots:ui.props.catalog.slots.map(slot=>slot.id===1?{...slot,status:'ready',revision:1,ownerCreatedAt:'2026-10-01'}:slot)};
  const button=ui.find('data-campaign-import-text-prepare');assert(button.props.disabled);button.props.onClick();ui.render();
  assert.equal(ui.prepared.length,0);assert.equal(ui.calls.length,0);assert.equal(ui.store.writes.length,0);
 }
});

test('editing text invalidates both preview and confirmation; switching slots or returning requires a fresh preparation',()=>{
 const ui=menu();ui.click('data-campaign-import-open');ui.paste(raw());ui.click('data-campaign-import-text-prepare');ui.click('data-campaign-import-prepare');
 ui.paste(raw('Autre texte'));assert(!ui.find('data-campaign-import-confirmation'));assert(!ui.find('data-campaign-import-preview'));
 ui.click('data-campaign-import-text-prepare');walk(ui.render()).find(node=>node.props?.['data-campaign-slot']===2).props.onClick();
 assert(!ui.find('data-campaign-import-preview'));assert(!ui.find('data-campaign-import-confirmation'));
 ui.click('data-campaign-import-text-prepare');assert.equal(ui.prepared.at(-1)[0],2);
 ui.button('Retour au menu').props.onClick();assert(!ui.find('data-campaign-import-preview'));ui.click('data-campaign-import-open');
 assert.equal(ui.byId('campaign-import-text').props.value,'');assert.equal(ui.calls.length,0);assert.equal(ui.store.writes.length,0);
});

test('editing pasted text cancels a late file read and preserves the new text preview',async()=>{
 const ui=menu();ui.click('data-campaign-import-open');let resolve;
 await ui.read({name:'pending.json',size:100,text:()=>new Promise(done=>{resolve=done;})});
 const recentText=raw('Texte récent');ui.paste(recentText);ui.click('data-campaign-import-text-prepare');const preparedCount=ui.prepared.length;
 resolve(raw('Ancien fichier','2026-10-08T12:00:00.000Z'));await tick();ui.render();
 assert.equal(ui.prepared.length,preparedCount);assert.match(label(ui.find('data-campaign-import-preview')),/Texte récent/);
 assert.equal(ui.byId('campaign-import-text').props.value,recentText);assert.equal(ui.store.writes.length,0);
});

test('a late file read is discarded after busy state, slot change, return or unmount',async()=>{
 for(const mode of ['busy','slot','return','unmount']){
  const ui=menu();ui.click('data-campaign-import-open');let resolve;
  await ui.read({name:'pending.json',size:100,text:()=>new Promise(done=>{resolve=done;})});
  if(mode==='busy'){ui.props.busy=true;ui.render();}
  else if(mode==='slot'){walk(ui.render()).find(node=>node.props?.['data-campaign-slot']===2).props.onClick();ui.render();}
  else if(mode==='return')ui.button('Retour au menu').props.onClick();else ui.unmount();
  resolve(raw());await tick();assert(!ui.find('data-campaign-import-preview'));assert.equal(ui.prepared.length,0);assert.equal(ui.calls.length,0);assert.equal(ui.store.writes.length,0);
 }
});

test('busy cancellation unlocks the picker without reviving its old read or submitting an import',async()=>{
 const ui=menu();ui.click('data-campaign-import-open');let resolve;
 await ui.read({name:'pending.json',size:100,text:()=>new Promise(done=>{resolve=done;})});
 assert(ui.byId('campaign-import-file').props.disabled);ui.props.busy=true;ui.render();ui.props.busy=false;ui.render();
 assert.equal(ui.byId('campaign-import-file').props.disabled,false);
 ui.paste(raw('Après annulation'));ui.click('data-campaign-import-text-prepare');const preparedCount=ui.prepared.length;
 resolve(raw('Lecture annulée'));await tick();
 assert.equal(ui.prepared.length,preparedCount);assert.match(label(ui.find('data-campaign-import-preview')),/Après annulation/);
 assert.equal(ui.calls.length,0);assert.equal(ui.store.writes.length,0);
});

test('existing file import still prepares its exact original source through the same protected preview',async()=>{
 const ui=menu();ui.click('data-campaign-import-open');const text=raw('Fichier original');
 await ui.read({name:'original.json',size:Buffer.byteLength(text),text:async()=>text});assert.equal(ui.prepared.length,1);
 assert.equal(ui.prepared[0][1],text);assert.match(label(ui.find('data-campaign-import-preview')),/Fichier original/);
 ui.click('data-campaign-import-prepare');ui.click('data-campaign-import-confirm');assert.equal(ui.calls.length,1);assert.equal(ui.store.writes.length,0);
});

test('textarea arrow keys retain text editing instead of being redirected by menu navigation',()=>{
 const ui=menu();ui.click('data-campaign-import-open');const tree=ui.render(),textarea=new ui.Textarea();let prevented=false,queries=0;
 ui.keyboardScope({querySelectorAll(){queries++;return[];}});
 for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])tree.props.onKeyDown({key,target:textarea,defaultPrevented:false,repeat:false,preventDefault(){prevented=true;}});
 assert.equal(prevented,false);assert.equal(queries,0);assert.equal(ui.calls.length,0);assert.equal(ui.store.writes.length,0);
});
