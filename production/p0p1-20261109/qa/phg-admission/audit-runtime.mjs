import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const root=process.cwd();
const require=createRequire(path.join(root,'package.json'));
const esbuild=require('esbuild');
const sharp=require('sharp');
const out=path.join(root,'production/p0p1-20261109/qa/phg-admission');
const entry=`
export * from './app/game/hunterChromaticsV113.ts';
export * from './app/game/hunterMaterialsV113.ts';
export * from './app/game/phgBiomaskStudiesV132.ts';
export * from './app/game/phgBiomaskTintsV131.ts';
export * from './app/game/conceptBiomasksV133.ts';
export * from './app/game/biomaskCatalogueV62.ts';
export * from './app/game/yautjaDecalsV133.ts';
export * from './app/game/hunterVisuals.ts';
export * from './app/game/phgReferenceCatalogV130.ts';
export * from './app/game/phgPlatformStudiesV128.ts';
export * from './app/game/phgPatchStudiesV129.ts';
export * from './app/game/phgHistoricalMaterialsV127.ts';
`;
const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:root,sourcefile:'phg-audit-entry.ts'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const runtime=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const drive=json('app/game/data/phgDriveV120Catalog.json');
const official=json('app/game/data/phgOfficialCosmeticsV141.json');
const masks=[...runtime.REFERENCE_BIOMASKS_V62,...runtime.PRESERVED_BIOMASKS_V62,{id:'elder'},...runtime.Y_A_U_T_J_A_CONCEPT_MASKS_V133];
const materials=runtime.PHG_CHROMATIC_MATERIALS_V113.map(x=>({...x,admittedByRealGetter:runtime.getChromaticMaterialV113(x.channel,x.id)?.id===x.id}));
const candidates=runtime.PHG_DRIVE_CANDIDATES_V120.map(x=>({...x,admittedByRealGetter:runtime.getChromaticMaterialV113(x.channel,x.id)?.id===x.id}));
const maskRecords=masks.map(x=>({...x,assetPath:runtime.hunterMaskRigPath(x.id),thumbnailPath:runtime.hunterMaskThumbnailPath(x.id),placement:runtime.hunterMaskRigPlacement(x.id)}));
const decals=runtime.Y_A_U_T_J_A_DECALS_V133.map(x=>({...x,admittedByRealGetter:runtime.yautjaDecalV133(x.zone,x.id)?.id===x.id}));
const imagePaths=[...new Set([...materials.map(x=>x.src),...runtime.PHG_MATERIALS_V113.map(x=>x.src),...maskRecords.flatMap(x=>[x.assetPath,x.thumbnailPath]),...decals.map(x=>x.src),...drive.assets.flatMap(x=>[x.runtimePath,x.previewPath])].filter(Boolean))];
const images=[];
for(const publicPath of imagePaths){
 const file=path.join(root,'public',publicPath);
 if(!fs.existsSync(file)){images.push({path:publicPath,exists:false});continue;}
 const bytes=fs.readFileSync(file),meta=await sharp(bytes).metadata();
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let visible=0,opaque=0,transparent=0,semi=0,minX=info.width,minY=info.height,maxX=-1,maxY=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*info.channels+3];
  if(a){visible++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  if(a===255)opaque++;else if(a===0)transparent++;else semi++;
 }
 images.push({path:publicPath,exists:true,bytes:bytes.length,sha256:sha(bytes),format:meta.format,width:info.width,height:info.height,sourceHasAlpha:meta.hasAlpha,visiblePixels:visible,opaquePixels:opaque,transparentPixels:transparent,semiTransparentPixels:semi,visibleBounds:visible?{minX,minY,maxX,maxY}:null});
}
const hashChecks=[];
for(const n of runtime.PHG_MATERIALS_V113){
 const bytes=fs.readFileSync(path.join(root,'public',n.src));
 const actual=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 hashChecks.push({path:n.src,algorithm:'git-blob-sha1',expected:n.gitBlobSha,actual,pass:actual===n.gitBlobSha});
}
for(const s of json('app/game/data/driveLatestSpritesV85.json').assets.filter(x=>x.groupId==='drive-phg-20261007')){
 const i=images.find(x=>x.path===s.src);
 if(i)hashChecks.push({path:s.src,algorithm:'sha256-drive-source',expected:s.sha256,actual:i.sha256,pass:i.sha256===s.sha256});
}
const pinnedAtlases=[runtime.PHG_V128_ATLAS,runtime.PHG_V129_ATLAS,{path:runtime.PHG_V127_ATLAS_PATH,sha256:runtime.PHG_V127_ATLAS_SHA256},...['app/game/data/phgRecentV126Catalog.json','app/game/data/phgBiomaskV132Catalog.json','app/game/data/decalCatalogV133.json'].map(p=>{const c=json(p);return {path:c.atlasPath,sha256:c.atlasSha256};}),...runtime.Y_A_U_T_J_A_CONCEPT_MASKS_V133.map(c=>({path:c.assetPath,sha256:c.fileSha256}))];
for(const p of pinnedAtlases){const i=images.find(x=>x.path===p.path);hashChecks.push({path:p.path,algorithm:'sha256-pinned-manifest',expected:p.sha256,actual:i?.sha256,pass:i?.sha256===p.sha256});}
const cropChecks=[];
for(const item of [...materials,...decals]){
 const atlas=item.atlas??(item.column!==undefined?{columns:8,rows:6,column:item.column,row:item.row}:null);
 if(!atlas||!item.src||!fs.existsSync(path.join(root,'public',item.src)))continue;
 const meta=await sharp(path.join(root,'public',item.src)).metadata();
 const width=Math.floor(meta.width/atlas.columns),height=Math.floor(meta.height/atlas.rows);
 const left=atlas.column*width,top=atlas.row*height;
 const {data,info}=await sharp(path.join(root,'public',item.src)).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let visible=0,transparent=0;
 for(let i=3;i<data.length;i+=info.channels){if(data[i])visible++;else transparent++;}
 cropChecks.push({id:item.id,path:item.src,atlas,left,top,width,height,visiblePixels:visible,transparentPixels:transparent,rgbaSha256:sha(data)});
}
const scopeMatrix=[];
for(const mask of [...runtime.Y_A_U_T_J_A_CONCEPT_MASKS_V133,{id:'feral'},{id:'celtic'}])for(const owner of ['alpha','samurai'])for(const tint of official.maskTints){
 const appearance={presetId:owner,biomaskId:mask.id,chromaticsV113:{maskMaterialId:tint.materialId}};
 const allowed=tint.materialId===runtime.PHG_OGRE_BIOMASK_ID_V131?runtime.alphaMaskEligibleV131(appearance):runtime.maskMaterialAllowedV132(appearance,tint.materialId);
 scopeMatrix.push({maskId:mask.id,owner,materialId:tint.materialId,classRecognized:runtime.maskClassForAppearanceV132(appearance),allowed,selectedAfterRealFilter:runtime.maskChromaticsForAppearanceV131(appearance).maskMaterialId});
}
const assertions={allRegisteredMaterialsAdmitted:materials.every(x=>x.admittedByRealGetter),allRegisteredDecalsAdmitted:decals.every(x=>x.admittedByRealGetter),allRegisteredAssetFilesPresent:materials.every(x=>images.find(i=>i.path===x.src)?.exists),allSelectedMaskFilesPresent:maskRecords.every(x=>images.find(i=>i.path===x.assetPath)?.exists),allAtlasTilesContainVisiblePixels:cropChecks.every(x=>x.visiblePixels>0),allPinnedSourceHashesMatch:hashChecks.every(x=>x.pass),driveUninstalledRejected:candidates.every(x=>!x.admittedByRealGetter&&x.src===null),unknownMaskRejected:runtime.maskClassForAppearanceV132({presetId:'alpha',biomaskId:'concept-v133-nonexistent'})===null,scopeFilterMatchesEligibility:scopeMatrix.every(x=>(x.selectedAfterRealFilter===x.materialId)===x.allowed)};
const report={schemaVersion:1,asOf:new Date().toISOString(),baseCommit:'39b601ce1873a1f400d2f545f0fab97691b779e3',method:'esbuild bundles actual production TS; real exported registries/getters/normalizers/filter called; sharp decodes real files. No DOM mock, no browser or visual certification.',assertions,materials,candidates,driveAccessories:runtime.PHG_DRIVE_ACCESSORIES_V120,nativeSources:runtime.PHG_MATERIALS_V113,masks:maskRecords,decals,official,referenceCatalog:runtime.PHG_REFERENCE_CATALOG_V130,images,cropChecks,hashChecks,scopeMatrix};
fs.writeFileSync(path.join(out,'runtime-assets.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({assertions,materials:materials.length,candidates:candidates.length,driveAccessories:report.driveAccessories.length,masks:masks.length,decals:decals.length,images:images.length,present:images.filter(x=>x.exists).length,scopeAllowed:scopeMatrix.filter(x=>x.allowed).length,scopeBlocked:scopeMatrix.filter(x=>!x.allowed).length,cropChecks:cropChecks.length},null,2));
if(Object.values(assertions).some(x=>!x))process.exitCode=1;
