import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {inspectPitArenaImage} from '../pit-arena-image-metadata.mjs';
import {arenaCompositionDigest,libraryEntryFromOriginal} from './pit-arena-composition-v42.mjs';
import {measureV55FloorCoverage,writeV55Artifacts} from './pit-stage-plan-v55.mjs';

export {writeV55Artifacts as writeV60Artifacts};
export const V60_PLAN='docs/v60-stage-plan.json';
export const V60_LAYOUT='docs/v60-stage-layout.json';
export const V60_VISUAL='docs/v60-stage-composition-visual-review.json';
export const V60_LIFE='app/game/data/pitStageLifeV60.json';
export const V60_CATALOGUE='app/game/systems/pitLoreStagesV60.generated.json';
export const V60_COMPOSITION='v60-workbook-stage-life-compositions';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const digestV60=value=>sha(JSON.stringify(value));
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const inside=(root,file)=>{const rel=path.relative(root,file);return rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};

/** Explicit material decisions. These are references to real earlier modules, never generated-art claims. */
export const V60_COMPOSITION_PROFILES={
  162:{P2:143,P3:143,P4:143,P5:143,kind:'comic',material:'sand',notes:'Géologie nue, sans architecture humaine ou accessoires attribués à l’Ingénieur.'},
  163:{P2:160,P3:160,P4:160,P5:160,kind:'game',material:'metal',notes:'Supports de laboratoire industriels sobres et sol métallique ; aucun corps de cyborg en double.'},
  164:{P2:143,P3:143,P4:'native-basalt',P5:143,kind:'original',material:'basalt',notes:'Carrière minérale originale ; les rochers ne définissent pas une planète canonique.'},
  165:{P2:1,P3:1,P4:'native-basalt',P5:153,kind:'original',material:'basalt',notes:'Colonnes rituelles et basalte sombre ; hommage au trône, aucune fusion de clans ou de rois. Le geste du garde reste une ambiance anonyme : le salut conditionné à la victoire demandé en E77 n’est pas implémenté.'},
  166:{P2:10,P3:10,P4:160,P5:10,kind:'original',material:'metal',notes:'Atelier fictif du projet : structures de forge et métal, sans technologie canonique nouvelle.'},
  167:{P2:143,P3:143,P4:'native-basalt',P5:143,kind:'original',material:'basalt',notes:'Rochers et dalle sombre de duel originale ; aucune immunité au feu ni origine planétaire déduite.'},
  168:{P2:157,P3:157,P4:157,P5:157,kind:'original',material:'organic',notes:'Nervures et conduits organiques natifs réemployés, sans lieu ou individu canonique affirmé.'},
  169:{P2:160,P3:160,P4:160,P5:160,kind:'game',material:'metal',notes:'Supports industriels pour une installation de guerre recomposée, sans effet RTS dans le duel.'},
  170:{P2:160,P3:160,P4:160,P5:160,kind:'comic',material:'metal',notes:'Entrepôt portuaire humain proposé et platelage métallique sombre ; sans Batman, Robin ou duo père/fils en fond.'},
  171:{P2:160,P3:160,P4:160,P5:160,kind:'comic',material:'metal',notes:'Centre d’essai recomposé, surfaces humaines sobres ; aucun double de Meta-Predator.'},
  172:{P2:151,P3:151,P4:141,P5:143,kind:'original',material:'ice',notes:'Exposition nordique originale, pas une carte attestée de Hunting Grounds.'},
  173:{P2:117,P3:143,P4:139,P5:117,kind:'original',material:'pavement',notes:'Cour pavée avec bois et avant-toit ; aucune tuile de toit sous les combattants.'},
  174:{P2:143,P3:143,P4:143,P5:143,kind:'original',material:'sand',notes:'Halte minérale originale, sans carte ou origine historique présentée comme attestée.'},
  175:{P2:143,P3:143,P4:143,P5:143,kind:'original',material:'sand',notes:'Récif minéral et sable, sans arbre mort ou structure d’un autre monde.'},
  176:{P2:'native-maritime',P3:'native-maritime',P4:'native-deck',P5:143,kind:'original',material:'wood',notes:'Montant maritime à cordages, caisse de bord et planches de pont natifs dédiés ; aucun portail japonais ni racines forestières.'},
  177:{P2:152,P3:152,P4:140,P5:152,kind:'original',material:'earth',notes:'Rive tropicale originale avec racines ; ne remplace pas une carte officielle Hunting Grounds.'},
  178:{P2:160,P3:160,P4:160,P5:160,kind:'comic',material:'metal',notes:'Enceinte industrielle de tournoi adaptée, combattants nommés exclus du public.'},
  179:{P2:152,P3:152,P4:140,P5:152,kind:'comic',material:'earth',notes:'Réserve adaptée avec sol forestier ; distincte du camp de Predators2010.'},
  180:{P2:160,P3:160,P4:160,P5:160,kind:'comic',material:'metal',notes:'Soute recomposée, cargaison et structures de maintenance ; pas de biographie supplémentaire.'},
  181:{P2:160,P3:160,P4:160,P5:160,kind:'game',material:'metal',notes:'Complexe colonial adapté, sans mélange avec le sanctuaire Primal Hunt.'},
  182:{P2:9,P3:9,P4:160,P5:9,kind:'original',material:'metal',notes:'Plateforme originale au sol pour le pilote ; aucun bombardement ni collision de véhicule.'},
  183:{P2:152,P3:152,P4:140,P5:152,kind:'original',material:'earth',notes:'Lisière propre au projet, sans déduire un habitat officiel depuis un masque.'},
  184:{P2:9,P3:9,P4:'native-basalt',P5:9,kind:'original',material:'basalt',notes:'Salle du seuil propre à Warp Universe ; ne confère pas de téléportation aux combattants.'},
  185:{P2:16,P3:16,P4:'native-basalt',P5:153,kind:'original',material:'basalt',notes:'Aire d’épreuves du projet ; appuis en basalte sombre et silhouettes anonymes uniquement.'},
  186:{P2:151,P3:151,P4:141,P5:143,kind:'original',material:'ice',notes:'Piste polaire originale choisie pour le jeu, sans origine déduite de la couleur du costume.'},
};

export function validateV60Plan(plan){
  assert.equal(plan?.schemaVersion,1);assert.equal(plan.release,'V60');assert.equal(plan.stages?.length,25);
  const ids=new Set();
  for(const [index,s] of plan.stages.entries()){
    assert.equal(s.number,162+index);assert(new RegExp(`^arena-${s.number}-[a-z0-9]+(?:-[a-z0-9]+)*$`).test(s.id));
    assert(!ids.has(s.id));ids.add(s.id);assert(V60_COMPOSITION_PROFILES[s.number]);
    for(const field of ['name','work','setting','sourceLimits','sourceRange'])assert(nonempty(s[field]),field);
    assert.equal(s.events?.length,3);assert(Array.isArray(s.sourceUrls));
  }
  return plan;
}

export function normalizeV60Receipt(receipt){
  const assets=Array.isArray(receipt?.assets)?receipt.assets:Object.entries(receipt?.assets??receipt?.images??{}).map(([id,asset])=>({id,...asset}));
  return {...receipt,stageId:receipt.stageId??receipt.id??receipt.arenaId,
    sourceUrls:receipt.sourceUrls??receipt.sources?.map(source=>source.url)??[],assets:assets.map(asset=>({...asset,
    id:asset.id??(asset.file?path.basename(asset.file,'.png'):undefined)??asset.key,
    name:asset.name??receipt.events?.find(event=>event.asset===asset.file)?.description,
    workspacePath:asset.workspacePath??asset.path,frames:asset.frames??asset.cells,
  }))};
}
export function isV60AssetAccepted(asset){
  return Boolean(asset&&(asset.visualReviewed===true||['accepted','visually-accepted','reviewed'].includes(asset.status))
    &&nonempty(asset.visualNotes??asset.reviewNotes??asset.visualReview?.notes));
}
export function v60PendingReasons(spec,receipt,layout={}){
  const result=[];
  for(const id of ['p0-depth','life-01','life-02','life-03']){
    const candidates=receipt?.assets?.filter(a=>a.id===id)??[];
    if(candidates.length!==1){result.push(`${id}: ${candidates.length?'duplicate receipt':'missing native PNG receipt'}`);continue;}
    const asset=candidates[0];if(!isV60AssetAccepted(asset))result.push(`${id}: actual visual acceptance pending`);
    if(id.startsWith('life-')&&!layout.events?.[id]?.placement&&!asset.placement)result.push(`${id}: explicit authored support placement pending`);
  }
  return result;
}

/** V60 has its own checked workspace junction. Never use the old D: public-root guard for new output. */
export async function resolveV60Destination(publicPath,projectRoot=process.cwd()){
  assert(/^\/game\/sprites\/v60\/(?:pit-arenas|pit-life)\/arena-\d{3}-[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(publicPath));
  const logical=path.resolve(projectRoot,'public','.'+publicPath),dedicated=await fs.realpath(path.join(projectRoot,'public/game/sprites/v60'));
  const approved=await fs.realpath(path.join(projectRoot,'work-local/v60/public-sprites'));
  assert.equal(dedicated.toLowerCase(),approved.toLowerCase(),'V60 output must use the explicitly approved workspace storage');
  let parent=path.dirname(logical);
  while(true){try{const actual=await fs.realpath(parent);assert(actual.toLowerCase()===dedicated.toLowerCase()||inside(dedicated,actual),'V60 destination escapes its checked physical root');break;}
    catch(error){if(error.code!=='ENOENT')throw error;const next=path.dirname(parent);assert.notEqual(next,parent);parent=next;}}
  return logical;
}

export async function importV60NativeAsset(spec,asset,publicPath,{projectRoot=process.cwd(),receiptPath}={}){
  assert(isV60AssetAccepted(asset),'A measured or generated image is not a visual approval');
  const source=asset.nativePath??asset.toolSource??asset.sourcePath;
  assert(typeof source==='string'&&/[\\/]\.codex[\\/]generated_images[\\/][a-f0-9-]{36}[\\/]exec-[a-f0-9-]+\.png$/i.test(source),'Exact built-in OpenAI native output required');
  assert(!source.split(/[\\/]/).includes('..'));
  const bytes=await fs.readFile(source),hash=sha(bytes),meta=await sharp(bytes).metadata();assert.equal(meta.format,'png');
  assert.equal(asset.sha256,hash,'Receipt hash must identify the exact tool output');
  if(asset.width!==undefined)assert.equal(asset.width,meta.width);if(asset.height!==undefined)assert.equal(asset.height,meta.height);
  const copied=asset.workspacePath??`work-local/v60/generated/${spec.id}/${asset.id}.png`;
  const expected=path.resolve(projectRoot,`work-local/v60/generated/${spec.id}/${asset.id}.png`);
  assert.equal(path.resolve(projectRoot,copied).toLowerCase(),expected.toLowerCase(),'Producer file must belong to its exact stage and role');
  assert.equal(sha(await fs.readFile(expected)),hash,'Workspace file and native source must be byte-identical');
  const destination=await resolveV60Destination(publicPath,projectRoot);await fs.mkdir(path.dirname(destination),{recursive:true});
  const previous=await fs.readFile(destination).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(previous)assert.equal(sha(previous),hash,'Refuse silent replacement of an existing accepted PNG');else await fs.writeFile(destination,bytes);
  const measured=await inspectPitArenaImage(destination,{alphaThreshold:3});
  return {path:publicPath,status:'reviewed',generation:{generator:'openai-imagegen',source:receiptPath,sha256:hash,width:meta.width,height:meta.height,hasAlpha:Boolean(meta.hasAlpha),contentBounds:measured.contentBounds},
    review:{evidence:receiptPath,coherence:true,layout:true,alpha:true},integration:null};
}

/** Read-only native cell measurements; source pixels are never repaired, trimmed or regenerated here. */
export async function measureV60Life(asset,file,edgeHaloReview){
  const image=sharp(await fs.readFile(file)),meta=await image.metadata();
  assert(meta.hasAlpha&&meta.width===1536&&meta.height===1024,'A six-cell1536x1024 native alpha sheet is required');
  const frames=[];
  for(let i=0;i<6;i++){
    const rect=asset.frames?.[i]?.rect??[i%3*512,Math.floor(i/3)*512,512,512];
    const [left,top,width,height]=rect;
    assert([left,top,width,height].every(Number.isInteger)&&left>=0&&top>=0&&width>0&&height>0&&left+width<=meta.width&&top+height<=meta.height);
    const {data}=await image.clone().extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let x1=width,y1=height,x2=-1,y2=-1,visible=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>2){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);visible++;}
    assert(visible>0&&visible<width*height*.95,'Native life must remain an isolated alpha subject');
    if(!(x1>0&&y1>0&&x2<width-1&&y2<height-1)){
      let edgeMax=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(!x||!y||x===width-1||y===height-1)edgeMax=Math.max(edgeMax,data[(y*width+x)*4+3]);
      assert(edgeHaloReview&&Number.isInteger(edgeHaloReview.maxAlpha)&&edgeHaloReview.maxAlpha<=16&&edgeMax<=edgeHaloReview.maxAlpha&&edgeHaloReview.silhouetteAlpha32Reviewed===true&&nonempty(edgeHaloReview.notes),
        'Subject touches a cell edge; reject or explicitly review measured faint halo <=16 without changing alpha bounds or native pixels');
    }
    const alphaBounds=[x1,y1,x2-x1+1,y2-y1+1];
    const pivot=asset.frames?.[i]?.pivot??[(x1+x2)/2,y2+1];
    assert(pivot.every(Number.isFinite)&&pivot[0]>=0&&pivot[0]<=width&&pivot[1]>=0&&pivot[1]<=height);
    frames.push({rect,pivot,alphaBounds,contentSha256:sha(data)});
  }
  assert.equal(new Set(frames.map(f=>f.contentSha256)).size,6,'Six genuinely distinct drawings are required');
  return frames;
}

function originalAsset(manifest,ownerNumber,assetId){const owner=manifest.stages.find(s=>s.number===ownerNumber),asset=owner?.planes.flatMap(p=>p.assets).find(a=>a.id===assetId);assert(owner&&asset);return {owner,asset};}
function shareAsset(manifest,ownerNumber,assetId){
  let {owner,asset}=originalAsset(manifest,ownerNumber,assetId);
  if(asset.libraryRef){const entry=manifest.sharedLibrary.find(e=>e.id===asset.libraryRef);assert(entry);({owner,asset}=originalAsset(manifest,manifest.stages.find(s=>s.catalogueId===entry.sourceCatalogueId).number,entry.sourceAssetId));}
  assert(!asset.libraryRef);const entry=libraryEntryFromOriginal(owner,asset);manifest.sharedLibrary??=[];
  const existing=manifest.sharedLibrary.find(e=>e.id===entry.id);if(existing)assert.deepEqual(existing,entry);else manifest.sharedLibrary.push(entry);
  return {...structuredClone(asset),libraryRef:entry.id};
}
function sharedPlane(manifest,ownerNumber,pass){
  const owner=manifest.stages.find(s=>s.number===ownerNumber),plane=owner?.planes.find(p=>p.id===pass);assert(plane);
  let selected=plane.assets;
  if(pass==='P2'||pass==='P3')selected=selected.filter(a=>!a.id.includes('central')&&!a.id.includes('light')&&!a.id.includes('lamp')&&!a.id.includes('door')&&!a.id.includes('trophy')&&!a.animation).slice(0,2);
  assert(selected.length,`No coherent modules in ${ownerNumber}/${pass}`);
  const assets=selected.map(a=>({...structuredClone(a),libraryRef:shareAsset(manifest,ownerNumber,a.id).libraryRef}));
  if(['P2','P3'].includes(pass))for(const a of assets)if(a.mode==='module'&&a.verticalAlign!=='top'){
    a.anchorToGround=true;for(const p of a.placements)p.y=430-p.height;
  }
  if(pass==='P5')for(const a of assets)if(a.verticalAlign==='top')for(const p of a.placements)p.y=Math.min(p.y,-85);
  return {...structuredClone(plane),id:pass,assets};
}
async function contactMeasurement(asset,projectRoot){
  const crop=asset.sourceCrop??asset.frames[0].generation.contentBounds;
  const {data,info}=await sharp(path.resolve(projectRoot,'public','.'+asset.frames[0].path)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let bottom=-1;for(let y=crop.y;y<crop.y+crop.height;y++)for(let x=crop.x;x<crop.x+crop.width;x++)if(data[(y*info.width+x)*4+3]>2)bottom=Math.max(bottom,y);
  assert(bottom>=crop.y);return {path:asset.frames[0].path,crop,visibleBottomExclusive:bottom+1,alphaThreshold:3};
}
export function v60SourceMetadata(spec,receipt,profile){
  const sourceUrls=[...new Set([...(receipt?.sourceUrls??[]),...spec.sourceUrls])].filter(url=>/^https:\/\//.test(url)&&!url.includes('github.com/')&&!url.includes('wikipedia.org/'));
  const kind=profile.kind;
  const textEntries=value=>Array.isArray(value)?value.flatMap(textEntries):typeof value==='string'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(textEntries):[];
  const sourceClaims=textEntries(receipt?.sourceClaims),sourceEvidence=textEntries(receipt?.sourceEvidence),loreLimits=textEntries(receipt?.loreLimits);
  return {id:spec.id,catalogueNumber:spec.number,name:spec.name,kind,workId:'v60-'+spec.proposalId,workTitle:spec.work,
    setting:spec.setting,palette:{sky:'#142025',ground:profile.material==='sand'?'#655749':profile.material==='ice'?'#51606a':'#303338',accent:'#a6c3be'},
    referenceStatus:kind==='original'?'original-exhibition':'work-setting',sourceUrl:sourceUrls[0]??null,sourceUrls,
    sourceClaims,sourceEvidence,loreLimits,
    sourceClaim:[...sourceClaims,...sourceEvidence,...loreLimits,spec.sourceLimits,profile.notes,'Composition et événements de fond adaptés pour The Pit ; géométrie1:1 non certifiée.'].filter(Boolean).join(' '),dedicatedFighters:[]};
}

export async function composeV60Stage(spec,receipt,manifest,layout={},{projectRoot=process.cwd()}={}){
  const profile=V60_COMPOSITION_PROFILES[spec.number];assert(profile);
  const receiptPath=`docs/v60-generation/${spec.id}.json`;
  assert.equal(receipt.stageId,spec.id);assert.deepEqual(v60PendingReasons(spec,receipt,layout),[]);
  const native=Object.fromEntries(receipt.assets.filter(a=>['p0-depth','life-01','life-02','life-03'].includes(a.id)).map(a=>[a.id,a]));
  const p0=await importV60NativeAsset(spec,native['p0-depth'],`/game/sprites/v60/pit-arenas/${spec.id}/p0-depth.png`,{projectRoot,receiptPath});
  assert(p0.generation.width>=960&&p0.generation.height>=540&&p0.generation.width>p0.generation.height);
  const life={stageId:spec.id,events:[]};
  for(const [index,id] of ['life-01','life-02','life-03'].entries()){
    const asset=native[id],frame=await importV60NativeAsset(spec,asset,`/game/sprites/v60/pit-life/${spec.id}/${id}.png`,{projectRoot,receiptPath});
    const override=layout.events?.[id]??{};
    const frames=await measureV60Life(asset,path.resolve(projectRoot,'public','.'+frame.path),override.edgeHaloReview);
    if(override.pivots){
      assert.equal(override.pivots.length,frames.length,'Every native pose needs its authored attachment');
      frames.forEach((f,i)=>{const p=override.pivots[i];assert(Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=f.rect[2]&&p[1]>=0&&p[1]<=f.rect[3]);f.pivot=[...p];});
    }
    life.events.push({id,name:override.name??asset.name??asset.eventName??spec.events[index].description,src:frame.path,width:frame.generation.width,height:frame.generation.height,sha256:frame.generation.sha256,
      frames:frames.map(({rect,pivot,alphaBounds})=>({rect,pivot,alphaBounds})),fps:override.fps??asset.fps??3,restFrame:override.restFrame??asset.restFrame??0,
      reducedMotionFrame:override.reducedMotionFrame??asset.reducedMotionFrame??0,placement:structuredClone(override.placement??asset.placement)});
  }
  const haze=shareAsset(manifest,1,'p0-b-vault-haze');delete haze.ambientMotion;
  Object.assign(haze,{id:'p1-atmosphere',parallax:.12,opacity:.09,placements:[{x:-100,y:180,width:1160,height:150}]});
  const planes=[{id:'P0',role:'Profondeur native indépendante du lieu',nominalParallax:.05,status:'reviewed',subplanSpecification:'proposed-original',assets:[{
    id:'p0-depth',role:'Fond OpenAI natif dédié au lieu, sans figurant peint',alphaRequired:false,requiredForRuntime:true,mode:'cover',parallax:.05,opacity:1,placements:[{x:0,y:0,width:960,height:540}],animation:null,frames:[p0]}]},
    {id:'P1',role:'Atmosphère distante indépendante',nominalParallax:.12,status:haze.status??'integrated',subplanSpecification:'proposed-original',assets:[haze]}];
  planes[1].status=haze.frames.every(f=>f.status==='integrated')?'integrated':'reviewed';
  for(const pass of ['P2','P3','P4','P5']){
    if(profile[pass]==='native-maritime'){
      const sourceReceipt='docs/v60-generation/arena-176-maritime-props.json',receipt=normalizeV60Receipt(JSON.parse(await fs.readFile(path.join(projectRoot,sourceReceipt))));
      const id=pass==='P2'?'p2-maritime-post':'p3-maritime-crate',source=receipt.assets.find(a=>a.id===id);assert(source);
      const frame=await importV60NativeAsset(spec,source,`/game/sprites/v60/pit-arenas/${spec.id}/${id}.png`,{projectRoot,receiptPath:sourceReceipt});
      const crop=frame.generation.contentBounds,height=pass==='P2'?350:80,width=height*crop.width/crop.height;
      const placements=pass==='P2'?[{x:-25,y:430-height,width,height},{x:900,y:430-height,width,height}]:[{x:55,y:430-height,width,height}];
      planes.push({id:pass,role:'Accessoire maritime natif dédié',nominalParallax:pass==='P2'?.24:.55,status:'reviewed',subplanSpecification:'proposed-original',assets:[{
        id,role:pass==='P2'?'Montant de navire à cordages':'Caisse de bord avec cordage lové',alphaRequired:true,requiredForRuntime:true,mode:'module',parallax:pass==='P2'?.24:.55,opacity:.92,
        sourceCrop:crop,anchorToGround:true,placements,animation:null,frames:[frame]}]});
    }else if(pass==='P4'&&profile.P4==='native-basalt'){
      if(spec.number!==165){planes.push(sharedPlane(manifest,165,'P4'));continue;}
      const sourceReceipt='docs/v60-generation/shared-basalt.json',receipt=normalizeV60Receipt(JSON.parse(await fs.readFile(path.join(projectRoot,sourceReceipt))));
      const source=receipt.assets.find(a=>a.id==='p4-dark-basalt');assert(source,'Native dark basalt floor is not available');
      const frame=await importV60NativeAsset({id:'shared'},source,`/game/sprites/v60/pit-arenas/${spec.id}/p4-dark-basalt.png`,{projectRoot,receiptPath:sourceReceipt});
      planes.push({id:pass,role:'Sol de basalte sombre natif indépendant',nominalParallax:1,status:'reviewed',subplanSpecification:'proposed-original',assets:[{
        id:'p4-dark-basalt',role:'Rebord horizontal de basalte, pixels natifs conservés',alphaRequired:false,requiredForRuntime:true,mode:'repeat-x',parallax:1,opacity:1,
        sourceCrop:{x:0,y:32,width:frame.generation.width,height:frame.generation.height-32},placements:[{x:0,y:430,width:960,height:110}],animation:null,frames:[frame]}]});
    }else if(pass==='P4'&&profile.P4==='native-deck'){
      const deckReceipt=normalizeV60Receipt(JSON.parse(await fs.readFile(path.join(projectRoot,'docs/v60-generation/shared-deck.json'))));
      const source=deckReceipt.assets.find(a=>a.id==='p4-weathered-deck');assert(source,'Dedicated deck floor is not available');
      // Its source receipt belongs to the shared generation directory, but the public ownership belongs to this first and only native stage.
      const sharedSpec={id:'shared'},frame=await importV60NativeAsset(sharedSpec,source,`/game/sprites/v60/pit-arenas/${spec.id}/p4-weathered-deck.png`,{projectRoot,receiptPath:'docs/v60-generation/shared-deck.json'});
      planes.push({id:pass,role:'Sol natif en planches de pont',nominalParallax:1,status:'reviewed',subplanSpecification:'proposed-original',assets:[{
        id:'p4-weathered-deck',role:'Pont maritime indépendant',alphaRequired:false,requiredForRuntime:true,mode:'repeat-x',parallax:1,opacity:1,placements:[{x:0,y:430,width:960,height:110}],animation:null,frames:[frame]}]});
    }else planes.push(sharedPlane(manifest,profile[pass],pass));
  }
  const contactMeasurements=[];
  for(const plane of planes)for(const asset of plane.assets)if(asset.anchorToGround&&asset.mode==='module'){
    const measured=await contactMeasurement(asset,projectRoot),authoredBottoms=asset.placements.map(p=>p.y+p.height),crop=asset.sourceCrop??asset.frames[0].generation.contentBounds;
    for(const p of asset.placements)p.y+=Math.max(0,crop.y+crop.height-measured.visibleBottomExclusive)*Math.min(p.width/crop.width,p.height/crop.height);
    contactMeasurements.push({plane:plane.id,assetId:asset.id,...measured,authoredBottoms});
  }
  const floor=planes[4].assets.filter(a=>a.mode==='repeat-x');assert.equal(floor.length,1);
  for(const a of floor){const coverage=await measureV55FloorCoverage(a,projectRoot);assert(coverage.minimumRowOpaqueRatio>=.98,'Complete physical floor must be opaque');
    const crop=a.sourceCrop??a.frames[0].generation.contentBounds;assert(crop.height/crop.width*a.placements[0].width>=180,'Floor must cover the lower viewport at wide camera');}
  const metadata=v60SourceMetadata(spec,receipt,profile);
  const stage={number:spec.number,catalogueId:spec.id,assetDirectory:`/game/sprites/v60/pit-arenas/${spec.id}`,name:metadata.name,setting:metadata.setting,wave:'v60-workbook-stage-life',
    legacyRuntimeArenaId:null,legacyRuntimeStatus:'concept',sourceConfirmation:'confirmed',runtimeEnabled:false,compositionContract:V60_COMPOSITION,
    authoringPlanDigest:digestV60({spec,profile,layout}),sourceReceipt:receiptPath,lifeDigest:digestV60(life),screenReference:{kind:metadata.kind,workId:metadata.workId,classification:metadata.referenceStatus,sourceUrls:metadata.sourceUrls,fidelityClaim:'original-lateral-layout-not-shot-exact'},
    moduleProfile:profile,contactMeasurements,planes};
  return {stage,life,metadata};
}

export function v60CompositionDigest(stage,life){return digestV60({arena:arenaCompositionDigest(stage),life});}
export async function verifyV60StageBytes(stage,life,projectRoot=process.cwd()){
  const sources=[...stage.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>({path:f.path,...f.generation})))),...life.events.map(e=>({path:e.src,sha256:e.sha256,width:e.width,height:e.height,hasAlpha:true}))];
  const seen=new Map();
  for(const expected of sources){
    let actual=seen.get(expected.path);if(!actual){const bytes=await fs.readFile(path.resolve(projectRoot,'public','.'+expected.path)),meta=await sharp(bytes).metadata();actual={path:expected.path,sha256:sha(bytes),width:meta.width,height:meta.height,hasAlpha:Boolean(meta.hasAlpha),format:meta.format};seen.set(actual.path,actual);}
    assert.equal(actual.format,'png');for(const k of ['sha256','width','height','hasAlpha'])assert.equal(actual[k],expected[k],`Changed native source ${expected.path}/${k}`);
  }
  return [...seen.values()];
}

export function validateV60Promotion(stage,life,report,review){
  const digest=v60CompositionDigest(stage,life);assert.equal(report.result,'PASS');assert.equal(report.arenaId,stage.catalogueId);assert.equal(report.compositionDigest,digest);
  assert(report.loaded.independentKit&&report.loaded.images===report.loaded.expectedImages);assert.deepEqual(report.loaded.failed,[]);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);assert(report.mobileNoOverflow);
  assert(report.scenarios.length>=8&&new Set(report.scenarios.map(s=>s.name)).size===report.scenarios.length);
  for(const s of report.scenarios)assert(s.planes.length===6&&!s.missing.length&&s.unchangedState&&s.unchangedCamera&&s.fighters.every(Boolean)&&s.groundedPropsVerified&&s.floorCoversScreen&&s.hangingPropsAnchored&&s.lifeActors===3&&s.lifeAttachmentsStable);
  assert(report.nativeEventFrames?.length===18&&new Set(report.nativeEventFrames.map(f=>f.eventId+':'+f.nativeFrame)).size===18,'All eighteen native drawings must be exercised');
  assert(report.floorEvidence?.length&&report.floorEvidence.every(f=>f.minimumRowOpaqueRatio>=.98));
  assert(review?.accepted===true&&review.compositionDigest===digest&&review.captures?.length>=3&&nonempty(review.notes)&&review.notes.length>=20,'Actual visual review of this exact composed scene is required');
  return digest;
}
