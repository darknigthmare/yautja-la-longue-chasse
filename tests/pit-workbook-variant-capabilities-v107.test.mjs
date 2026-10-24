import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'pit-variant-v107-'));after(()=>fs.rm(temporary,{recursive:true,force:true}));
const bundle=await build({entryPoints:['app/game/pitWorkbookVariantCapabilitiesV107.ts'],outfile:path.join(temporary,'module.mjs'),bundle:true,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
const p=await import(pathToFileURL(path.join(temporary,'module.mjs')));
const capability=p.getPitWorkbookVariantCapabilitiesV107,guard=p.guardPitWorkbookVariantCapabilityV107;

test('the pure capability contract imports no combat/render runtime and preserves all14 open source constraints',()=>{
 assert.equal(Object.keys(bundle.metafile.inputs).some(file=>/\/pitCombat\.ts$|\/pitSpriteSheetAnimation\.ts$|\/pitWorkbookAnimationV100\.ts$/.test(file)),false);
 assert.equal(p.PIT_WORKBOOK_VARIANT_CONSTRAINTS_V107.length,14);
 for(const fighterId of ['feral-hunter','scar']){const c=capability(fighterId);assert.equal(c.constraints.length,7);assert.ok(c.constraints.every(row=>row.status==='OPEN_SOURCE_CONSTRAINT'));assert.equal(c.sourceRecipeOwnershipAllowed,true);assert.equal(c.fullKitComplete,false);assert.equal(c.canonicalFidelityCertified,false);}
});

test('all52 default action drawing admissions have real, SHA-matching native PNG pages in both orientations',async()=>{
 const pages=new Map();
 for(const fighterId of ['feral-hunter','scar']){const c=capability(fighterId);assert.equal(c.nativeActions.length,26);for(const action of c.nativeActions){assert.deepEqual(action.nativeFacings,['right','left']);for(const facing of action.nativeFacings)assert.equal(guard({fighterId,purpose:'native-action-drawing',id:action.id,facing}).available,true);for(const page of action.pages)pages.set(page.src,page);}}
 for(const page of pages.values()){const bytes=await fs.readFile('public'+page.src);assert.equal(createHash('sha256').update(bytes).digest('hex'),page.sha256,page.src);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),page.width,page.src);assert.equal(bytes.readUInt32BE(20),page.height,page.src);}
});

test('Scar masked keeps seven genuinely native partial sequences without borrowing default workbook actions',async()=>{
 const c=capability('scar','scar-avec-casque-6a0a69930d');assert.equal(c.appearanceKnown,true);assert.equal(c.staticReference.frameCount,1);assert.equal(c.staticReference.animated,false);assert.equal(c.sourceRecipeOwnershipAllowed,false);assert.equal(c.nativeActions.length,0);assert.equal(c.nativeClips.length,7);
 const pages=new Map();for(const clip of c.nativeClips){assert.deepEqual(clip.nativeFacings,['right','left']);for(const facing of ['right','left'])assert.equal(guard({fighterId:'scar',variantId:c.variantId,purpose:'native-clip',id:clip.id,facing}).available,true);for(const page of clip.pages)pages.set(page.src,page);}
 assert.equal(pages.size,7);for(const page of pages.values()){const bytes=await fs.readFile('public'+page.src);assert.equal(createHash('sha256').update(bytes).digest('hex'),page.sha256,page.src);assert.equal(bytes.readUInt32BE(16),page.width);assert.equal(bytes.readUInt32BE(20),page.height);}
 assert.equal(guard({fighterId:'scar',variantId:c.variantId,purpose:'native-action-drawing',id:'M_F003_S1',facing:'right'}).available,false);
});

test('one-frame skins, unknown/foreign appearances and a missing direction never create an animation admission',()=>{
 for(const [fighterId,variantId]of [['feral-hunter','feral-avec-casque-b99fbf82fe'],['feral-hunter','feral-sans-casque-75100c4c5e'],['scar','scar-sans-casque-14ea113f76']]){const c=capability(fighterId,variantId);assert.equal(c.appearanceKnown,true);assert.equal(c.staticReference.frameCount,1);assert.equal(c.sourceRecipeOwnershipAllowed,false);assert.equal(c.nativeActions.length,0);assert.equal(c.nativeClips.length,0);}
 for(const [fighterId,variantId]of [['scar','missing'],['feral-hunter','scar-avec-casque-6a0a69930d'],['wolf',null],['scar','']])assert.equal(capability(fighterId,variantId).appearanceKnown,false);
 assert.equal(guard({fighterId:'scar',purpose:'native-action-drawing',id:'M_F003_S1'}).available,false);
});

test('lost/stowed/broken weapons, damaged armor and mask changes fail closed; cloak respects incarnation and live equipment',()=>{
 const source={fighterId:'scar',purpose:'native-action-drawing',id:'M_F003_S1',facing:'right'};
 for(const equipment of ['lost','stowed','broken'])assert.equal(guard({...source,equipment}).reason,'EQUIPMENT_STATE_NOT_ADMITTED');
 assert.equal(guard({...source,armor:'damaged'}).reason,'DAMAGED_ARMOR_NOT_ADMITTED');
 for(const mask of ['masked','unmasked'])assert.equal(guard({...source,mask}).reason,'MASK_TRANSITION_NOT_ADMITTED');
 assert.equal(guard({...source,equipment:'source-equipped',armor:'source-intact',mask:'source-default'}).available,true);
 assert.equal(guard({fighterId:'feral-hunter',purpose:'cloak-effect',equipmentAllowsCloak:true}).available,false);
 assert.equal(guard({fighterId:'scar',purpose:'cloak-effect',equipmentAllowsCloak:false}).available,false);
 const cloak=guard({fighterId:'scar',purpose:'cloak-effect',equipmentAllowsCloak:true});assert.equal(cloak.available,true);assert.equal(cloak.mechanicsCertified,false);assert.equal(cloak.fullKitComplete,false);
});


test('the12 existing Feral/Scar reference portraits retain their actual SHA/dimensions and a single right-facing static pose',async()=>{
 assert.equal(p.PIT_WORKBOOK_STATIC_VARIANT_REFERENCES_V107.length,12);
 for(const reference of p.PIT_WORKBOOK_STATIC_VARIANT_REFERENCES_V107){const bytes=await fs.readFile('public'+reference.src);assert.equal(createHash('sha256').update(bytes).digest('hex'),reference.sha256);assert.equal(bytes.readUInt32BE(16),reference.width);assert.equal(bytes.readUInt32BE(20),reference.height);assert.equal(reference.nativeFacing,'right');assert.equal(reference.frameCount,1);assert.equal(reference.animated,false);assert.equal(reference.canonicalFidelityCertified,false);const c=capability(reference.fighterId,reference.variantId);assert.equal(c.sourceRecipeOwnershipAllowed,false);assert.equal(c.nativeActions.length,0);}
});
