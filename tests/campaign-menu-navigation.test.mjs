import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source=fs.readFileSync('app/game/CampaignMainMenu.tsx','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
const fresh=()=>({activeSlotId:null,slots:[1,2,3,4,5].map(id=>({id,status:'empty',revision:0,ownerCreatedAt:null,hunterName:null,checkpoints:[],lastCheckpointId:null}))});
function menu(initialEntry){
 const values=[],refs=[],calls=[];let stateIndex=0,refIndex=0,padBack;
 const exports={},jsx=(type,props)=>({type,props});
 vm.runInNewContext(compiled,{exports,require(name){
  if(name==='react')return{useState(initial){const index=stateIndex++;if(!(index in values))values[index]=initial;return[values[index],next=>{values[index]=typeof next==='function'?next(values[index]):next;}];},useRef(initial){return refs[refIndex++]??={current:initial};},useSyncExternalStore:(_subscribe,_snapshot,serverSnapshot)=>serverSnapshot(),useCallback:fn=>fn,useLayoutEffect(){}};
  if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};
  if(name.includes('useMenuGamepad'))return{useMenuGamepad(_root,_enabled,_key,back){padBack=back;}};
  if(name.includes('CloudAccount'))return{openCloudAccountV71:()=>calls.push(['account'])};
  if(name.includes('mainMenuModes'))return{MAIN_MENU_MODE_LABELS_V81:{'the-pit':'The Pit','game-reserve':'Game Reserve Planet'}};
  return{default:{}};
 }});
 const record=name=>(...args)=>calls.push([name,...args]);
 const props={catalog:fresh(),busy:false,message:null,initialEntry,onRefresh:record('refresh'),onCreate:record('create'),onContinue:record('continue'),onLoad:record('load'),onRecover:record('recover'),onOpenSprites:record('sprites'),onMausoleum:record('mausoleum'),onOpenClanWar:record('clan-war'),onOpenGameMode:record('mode'),onPrepareImport:record('prepare-import'),onImport:record('import')};
 const render=()=>{stateIndex=0;refIndex=0;const tree=exports.default(props);tree.props.ref.current={};return tree;};
 const find=(attribute,value=true)=>walk(render()).find(node=>node.props?.[attribute]===value);
 const click=(attribute,value=true)=>{const button=find(attribute,value);assert(button,`${attribute}=${value} exists`);assert.equal(button.props.disabled,false);button.props.onClick({currentTarget:{isConnected:false}});};
 const escape=()=>render().props.onKeyDown({key:'Escape',repeat:false,defaultPrevented:false,preventDefault(){}});
 return{props,calls,render,find,click,escape,padBack(){render();padBack();}};
}

test('the landing contains four sections and navigation never invokes a campaign or mode action',()=>{
 const ui=menu(),before=structuredClone(ui.props.catalog),tree=ui.render();
 const sections=walk(tree).filter(node=>node.props?.['data-menu-section']);
 assert.deepEqual(sections.map(node=>node.props['data-menu-section']),['campaign','modes','archives','system']);
 assert.equal(walk(tree).filter(node=>node.props?.['data-menu-action']).length,0);
 for(const section of ['campaign','modes','archives','system']){
  ui.click('data-menu-section',section);assert.equal(ui.render().props['data-campaign-menu'],section);
  ui.click('data-menu-back');assert.equal(ui.render().props['data-campaign-menu'],'main');
 }
 assert.deepEqual(ui.calls,[]);assert.deepEqual(ui.props.catalog,before);
});

test('new, load and import return one level through Escape or the gamepad without creating a save',()=>{
 const ui=menu();
 ui.props.catalog.slots[0]={...ui.props.catalog.slots[0],status:'ready',revision:7,ownerCreatedAt:'2026-10-01T12:00:00.000Z',hunterName:'Kaail',lastCheckpointId:'auto-1',checkpoints:[{id:'auto-1',kind:'auto',index:1,label:'Autosauvegarde',savedAt:'2026-10-02T12:00:00.000Z',playTimeSeconds:90,hasActiveHunt:false}]};
 const before=JSON.stringify(ui.props.catalog);
 for(const action of ['new','load','import']){
  ui.click('data-menu-section','campaign');ui.click('data-menu-action',action);
  assert.equal(ui.render().props['data-campaign-menu'],action);
  ui.escape();assert.equal(ui.render().props['data-campaign-menu'],'campaign');
  ui.padBack();assert.equal(ui.render().props['data-campaign-menu'],'main');
 }
 ui.escape();assert.equal(ui.render().props['data-campaign-menu'],'main');
 assert.deepEqual(ui.calls,[]);assert.equal(JSON.stringify(ui.props.catalog),before);
});

test('spoiler cancellation owns Back before the section; only explicit confirmation opens a mode',()=>{
 const ui=menu();ui.click('data-menu-section','modes');
 ui.click('data-menu-action','clan-war');assert(ui.find('data-main-menu-spoiler','clan-war'));
 ui.padBack();assert.equal(ui.find('data-main-menu-spoiler','clan-war'),undefined);
 assert.equal(ui.render().props['data-campaign-menu'],'modes');assert.deepEqual(ui.calls,[]);
 ui.click('data-menu-action','clan-war');ui.click('data-spoiler-confirm');
 assert.deepEqual(ui.calls,[['clan-war']]);assert.equal(ui.find('data-spoiler-confirm'),undefined);
 ui.padBack();assert.equal(ui.render().props['data-campaign-menu'],'main');
});

test('busy state blocks section changes, Back and a disabled spoiler confirmation handler',()=>{
 const ui=menu();ui.props.busy=true;
 for(const section of ['campaign','modes','archives','system']){
  const button=ui.find('data-menu-section',section);assert(button.props.disabled);button.props.onClick();
  assert.equal(ui.render().props['data-campaign-menu'],'main');
 }
 ui.props.busy=false;ui.click('data-menu-section','modes');ui.click('data-menu-action','the-pit');
 ui.props.busy=true;ui.padBack();ui.escape();
 assert(ui.find('data-main-menu-spoiler','the-pit'));
 const confirm=ui.find('data-spoiler-confirm');assert(confirm.props.disabled);confirm.props.onClick();
 assert.deepEqual(ui.calls,[]);assert(ui.find('data-main-menu-spoiler','the-pit'));
 ui.props.busy=false;ui.click('data-spoiler-cancel');ui.padBack();
 assert.equal(ui.render().props['data-campaign-menu'],'main');
});

test('archives and system preserve each original action and unsupported fullscreen stays absent',()=>{
 const ui=menu();ui.click('data-menu-section','archives');
 ui.click('data-menu-action','sprites');ui.click('data-menu-action','mausoleum');ui.padBack();
 ui.click('data-menu-section','system');ui.click('data-menu-action','account');ui.click('data-menu-action','refresh');
 assert.equal(ui.find('data-menu-action','fullscreen'),undefined);
 assert.deepEqual(ui.calls,[['sprites'],['mausoleum'],['account'],['refresh']]);
 ui.props.busy=true;
 for(const action of ['account','refresh']){const button=ui.find('data-menu-action',action);assert(button.props.disabled);button.props.onClick();}
 assert.equal(ui.calls.length,4);
});

test('a remounted menu restores the section that launched an independent screen',()=>{
 for(const initialEntry of [{section:'modes',action:'game-reserve'},{section:'archives',action:'mausoleum'}]){
  const ui=menu(initialEntry);assert.equal(ui.render().props['data-campaign-menu'],initialEntry.section);
  assert(ui.find('data-menu-action',initialEntry.action));assert.deepEqual(ui.calls,[]);
  ui.padBack();assert.equal(ui.render().props['data-campaign-menu'],'main');
 }
});

test('a campaign launch replaces an earlier mode return target before the session opens',()=>{
 const front=fs.readFileSync('app/game/CampaignFrontEnd.tsx','utf8');
 const tree=ts.createSourceFile('CampaignFrontEnd.tsx',front,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),handlers={};
 function visit(node){
  if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(tree)==='CampaignMainMenu'){
   for(const attribute of node.attributes.properties)if(ts.isJsxAttribute(attribute)&&attribute.initializer&&ts.isJsxExpression(attribute.initializer))handlers[attribute.name.getText(tree)]=attribute.initializer.expression.getText(tree);
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);
 for(const [handler,args,action] of [
  ['onCreate',[1,'Kaail'],'new'],['onContinue',[1],'continue'],['onLoad',[1,'auto-1',7],'load'],
  ['onReplace',[1,'Kaail',7,'owner'],'new'],['onWorkspaceRecover',[1,'auto-1',7],'load'],['onRecoverNew',[1,'Kaail'],'new'],
 ]){
  let returnTo;const entered=[];
  const environment={setMenuEntry:value=>{returnTo=value;},openGameMode(){},validId:id=>id===1,
   catalog:{activeSlotId:1,slots:[{id:1,lastCheckpointId:'auto-1',revision:7,checkpoints:[{id:'auto-1',resumeLocation:'homeworld'}]}]},
   run(_action,enter){entered.push({enter,returnTo});},
  };
  const callback=name=>vm.runInNewContext(ts.transpileModule('('+handlers[name]+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,environment);
  callback('onOpenGameMode')('the-pit',true);assert.equal(returnTo.section,'modes');
  callback(handler)(...args);assert.equal(entered.length,1);assert.equal(entered[0].enter,true);
  assert.deepEqual(JSON.parse(JSON.stringify(entered[0].returnTo)),{section:'campaign',action});
  const resumed=menu(returnTo);assert.equal(resumed.render().props['data-campaign-menu'],'campaign');
  assert(resumed.find('data-menu-action',action));assert.deepEqual(resumed.calls,[]);
 }
});
