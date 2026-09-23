import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const client=fs.readFileSync('app/game/GameClient.tsx','utf8');
const front=fs.readFileSync('app/game/CampaignFrontEnd.tsx','utf8');
function callback(source,name,environment){const ast=ts.createSourceFile('component.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let declaration;const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)declaration=node;else ts.forEachChild(node,visit);};visit(ast);assert(declaration);const text=declaration.initializer.arguments[0].getText(ast);return vm.runInNewContext(ts.transpileModule(`(${text})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,environment);}
test('manual overwrite confirmation pins the revision originally displayed',()=>{
 let state=null;const requested=[];
 const compiled=ts.transpileModule(fs.readFileSync('app/game/CampaignMainMenu.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};const jsx=(type,props)=>({type,props});
 vm.runInNewContext(compiled,{exports,require(name){if(name==='react')return{useState:()=>[state,next=>state=next],useRef:()=>({current:null}),useLayoutEffect:()=>{}};if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};return{default:{}};}});
 const walk=node=>!node||typeof node!=='object'?[]:[node,...(Array.isArray(node.props?.children)?node.props.children.flatMap(walk):walk(node.props?.children))];
 const props={slot:{id:1,revision:7,checkpoints:[{id:'manual-1',kind:'manual',index:1,savedAt:'2026-09-20T00:00:00Z'}]},busy:false,message:null,onSave:(...args)=>requested.push(args),onMainMenu(){}};
 let tree=exports.CampaignSavePanel(props);walk(tree).find(node=>node.props?.['data-manual-save']===1).props.onClick({currentTarget:{isConnected:false}});
 props.slot={...props.slot,revision:9};tree=exports.CampaignSavePanel(props);
 walk(tree).find(node=>node.type==='button'&&Array.isArray(node.props?.children)&&node.props.children[0]==='Confirmer le remplacement manuel ').props.onClick();
 assert.deepEqual(requested,[[1,7]]);
});
test('session tree is unmounted synchronously before an owner-changing transaction starts',async()=>{
 const order=[];const environment={operation:{current:false},generation:{current:0},alive:{current:true},setBusy(){},setMessage(){},setCatalog(){},setEntry(value){order.push(value===null?'unmount':'mount');},flushSync(operation){operation();order.push('cleanup-complete');}};
 const run=callback(front,'run',environment);await run(async()=>{order.push('transaction');return{ok:true,catalog:{},slotId:2,save:{createdAt:'B'},checkpoint:{resumeLocation:'deck'}};},true);
 assert.deepEqual(order,['unmount','cleanup-complete','transaction','mount']);
});
test('manual checkpoint calls storage with confirmed revision, and stale sessions never call it',async()=>{
 const calls=[];const environment={sessionAliveRef:{current:true},hydrated:true,campaignOperationRef:{current:false},archiveTransferBusy:false,pendingHuntResult:null,saveFailure:null,campaignCatalog:{slots:[{id:1,status:'ready',ownerCreatedAt:'A',revision:9}]},entry:{slotId:1},saveRef:{current:{createdAt:'A'}},campaignLocation:'homeworld',setCampaignSaveMessage(){},setCampaignSaveBusy(){},setCampaignCatalog(){},async saveCampaignCheckpoint(id,options){calls.push({id,options});return{ok:false,catalog:{},message:'save-conflict'};}};
 const save=callback(client,'saveManagedCheckpoint',environment);assert.equal(await save('manual',1,7),false);assert.equal(calls[0].options.expectedRevision,7);assert.equal(calls[0].options.location,'homeworld');environment.sessionAliveRef.current=false;assert.equal(await save('manual',2,9),false);assert.equal(calls.length,1);
});
test('returning to main menu refuses a failed checkpoint and invalidates callbacks before exit',async()=>{
 const order=[];let confirmed=false;
 const environment={sessionAliveRef:{current:true},activeHuntSessionRef:{current:{runId:'A'}},archiveSelectionRef:{current:0},checkpointBlockedReason:null,setSettingsOpen(){},async saveManagedCheckpoint(){return confirmed;},onMainMenu(){assert.equal(environment.sessionAliveRef.current,false);assert.equal(environment.activeHuntSessionRef.current,null);order.push('menu');}};
 const back=callback(client,'returnToMainMenu',environment);await back();assert.equal(environment.sessionAliveRef.current,true);assert.deepEqual(order,[]);confirmed=true;await back();assert.deepEqual(order,['menu']);assert.equal(environment.archiveSelectionRef.current,1);
});
