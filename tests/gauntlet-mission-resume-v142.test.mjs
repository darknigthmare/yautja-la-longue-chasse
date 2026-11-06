import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import {homeworldSceneSsrV78} from "./helpers/homeworld-scene-ssr-v78.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
// Load the real production modules with the same TypeScript resolver as the
// arrival suites, including their extensionless imports under plain Node.
const qa=homeworldSceneSsrV78(root);
const {
  captureHuntGauntletV142,resumeHuntGauntletV142,HUNT_GAUNTLET_CONFIG_KEY_V142,
}=qa.load("app/game/systems/huntGauntletIdentityV142.ts");
const {GAUNTLET_CATALOG_V132,serializeGauntletPreferenceV132}=qa.load("app/game/systems/clanWarGauntletCatalogV132.ts");
const {readHunterGauntletV133}=qa.load("app/game/systems/useHunterGauntletV133.ts");
const {normalizeHuntAccessibilityV112}=qa.load("app/game/systems/huntAccessibilityV112.ts");
const {createPlanetArrival,requestPlanetArrivalHandoff,completePlanetArrivalHandoff}=qa.load("app/game/systems/planetArrival.ts");
const {normalizePlanetInsertionPlan,shipSupportsSurfaceInsertion,expeditionTrioReady}=qa.load("app/game/systems/planetInsertion.ts");
const {evaluateClanShipAccess}=qa.load("app/game/systems/clanShipOperations.ts");
const {hasShipInsertionDebit}=qa.load("app/game/systems/shipInsertionEnergy.ts");
const {isShipId}=qa.load("app/game/shipCatalogue.ts");
const {
  defaultSave,exportSave,parseSaveImport,normalizeSave,RANK_THRESHOLDS,
}=qa.load("app/game/save.ts");
const {
  normalizeActiveHuntSave,ACTIVE_HUNT_SAVE_VERSION,ACTIVE_HUNT_RUNTIME_REVISION,
}=qa.load("app/game/systems/activeHuntSave.ts");

const read=path=>readFileSync(root+path,"utf8");
const owner="2026-10-31T14:46:00.000Z";
const rank="elite";
const studies=GAUNTLET_CATALOG_V132.filter(x=>x.unlock.startsWith("challenge:")).map(x=>x.id);

test("Every legitimate V142 unlocked identity survives saved/reloaded sidecar configuration",()=>{
  let supported=0;
  for(const item of GAUNTLET_CATALOG_V132){
    const captured=captureHuntGauntletV142(item.id,"elder",studies);
    assert.equal(captured,item.id);
    const configuration={inventory:{},gauntletVariantId:captured,visualOptions:{screenShake:true}};
    const serial=JSON.parse(JSON.stringify(configuration));
    assert.equal(resumeHuntGauntletV142(serial,"jungle-hunter","elder",studies),item.id);
    supported++;
  }
  assert.equal(supported,54);
});
test("Saved Wolf stays Wolf after a different cosmetic preference is equipped elsewhere",()=>{
  const saved={gauntletVariantId:captureHuntGauntletV142("wolf",rank,[])};
  assert.equal(resumeHuntGauntletV142(saved,"feral",rank,[]),"wolf");
  assert.equal(resumeHuntGauntletV142(saved,"jungle-hunter",rank,[]),"wolf");
  assert.equal(captureHuntGauntletV142("feral",rank,[]),"feral");
});
test("Legacy V141 sidecar without optional model preserves previous behavior",()=>{
  assert.equal(resumeHuntGauntletV142({},"wolf",rank,[]),"wolf");
  assert.equal(resumeHuntGauntletV142({},"lost-shaman","elder",["lost-shaman"]),"lost-shaman");
  assert.equal(resumeHuntGauntletV142({},"../../fake",rank,[]),"jungle-hunter");
  assert.equal(resumeHuntGauntletV142({},null,rank,[]),"jungle-hunter");
});
test("An old/future/hostile cosmetic receipt cannot unlock an unearned gauntlet",()=>{
  const malformed=[
    "../../injected","constructor","evil",null,undefined,42,[],{}, "wolf/../../other",
  ];
  for(const v of malformed){
    assert.equal(resumeHuntGauntletV142({gauntletVariantId:v},"wolf",rank,[]),
      "jungle-hunter",String(v));
  }
  assert.equal(resumeHuntGauntletV142({gauntletVariantId:"wolf"},"jungle-hunter","blooded",[]),"jungle-hunter");
  assert.equal(resumeHuntGauntletV142({gauntletVariantId:"lost-shaman"},"wolf","elder",[]),"jungle-hunter");
  assert.equal(resumeHuntGauntletV142({gauntletVariantId:"lost-shaman"},"wolf","elder",["lost-shaman"]),"lost-shaman");
  assert.equal(resumeHuntGauntletV142(Object.create({gauntletVariantId:"wolf"}),"feral",rank,[]),"feral");
});
test("V1 active hunt sidecar roundtrip persists optional selected identity, no schema break",()=>{
  const save=defaultSave(owner);
  const equipment={gauntletVariantId:captureHuntGauntletV142("wolf",rank,[])};
  const sidecar={
    version:ACTIVE_HUNT_SAVE_VERSION,
    runtimeRevision:ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt:save.createdAt,missionId:"jungle-vey",difficultyId:"hunter",
    encounterRun:0,runId:"v142-hunt-001",sequence:3,startedAt:owner,
    savedAt:"2026-10-31T15:02:00.000Z",
    configuration:{...equipment,inventory:save.inventory,loadout:save.loadout,
      appearance:save.appearance,visualOptions:{screenShake:true,reducedGore:false,highContrastVision:false}},
    snapshot:{player:{x:122,y:50}},retryCheckpoint:null,
  };
  const restored=normalizeActiveHuntSave(JSON.parse(JSON.stringify(sidecar)),ACTIVE_HUNT_RUNTIME_REVISION);
  assert.ok(restored,"Old V1 sidecar must accept an optional cosmetic identifier");
  assert.equal(restored?.version,1);
  assert.equal(restored?.configuration.gauntletVariantId,"wolf");
  assert.equal(restored?.sequence,3);
  assert.equal(restored?.ownerSaveCreatedAt,owner);
  assert.equal(resumeHuntGauntletV142(restored.configuration,"feral",rank,[]),"wolf");
  const campaignImport=parseSaveImport(exportSave(save));
  assert.equal(campaignImport.failure,null);
  assert.deepEqual(campaignImport.save?.gauntletV134?.claimedStudies,[]);
});
test("GameClient writes launch-time visual identity, preserves it across writes, and passes it to HuntCanvas on resume",()=>{
  const client=read("app/game/GameClient.tsx");
  const runtime=read("app/game/HuntCanvas.tsx");
  assert.match(client,/gauntletVariantId: captureHuntGauntletV142\(gauntletVariantId,save\.profile\.rankId/);
  const ast=ts.createSourceFile("GameClient.tsx",client,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const matching=(root,predicate)=>{
    const matches=[];
    const visit=node=>{if(predicate(node))matches.push(node);ts.forEachChild(node,visit);};
    visit(root);return matches;
  };
  const launches=matching(ast,node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==="launchMission");
  assert.equal(launches.length,1,"The actual departure handler must be unique.");
  const runs=matching(launches[0],node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==="run");
  assert.equal(runs.length,1,"The departure must capture one durable arrival run.");
  assert.ok(runs[0].initializer&&ts.isObjectLiteralExpression(runs[0].initializer));
  const configuration=runs[0].initializer.properties.find(node=>ts.isPropertyAssignment(node)&&
    (ts.isIdentifier(node.name)||ts.isStringLiteral(node.name))&&node.name.text==="configuration");
  assert.ok(configuration&&ts.isObjectLiteralExpression(configuration.initializer));
  const captures=configuration.initializer.properties.filter(node=>ts.isSpreadAssignment(node)&&
    ts.isCallExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==="huntConfiguration");
  assert.equal(captures.length,1,"The real run configuration must retain the launch-time cosmetic capture.");
  assert.deepEqual(captures[0].expression.arguments.map(argument=>argument.getText(ast)),["runtimeSave","hunterGauntlet.equippedId"]);
  assert.ok(configuration.initializer.properties.every(node=>!ts.isPropertyAssignment(node)||
    !(ts.isIdentifier(node.name)||ts.isStringLiteral(node.name))||node.name.text!=="gauntletVariantId"),
  "Insertion fields must not overwrite the captured gauntlet identity.");
  assert.match(client,/\.\.\.session\.configuration/);
  assert.match(client,/gauntletVariantId: resumeHuntGauntletV142\(/);
  assert.match(client,/resumed\.configuration,/);
  assert.match(client,/gauntletVariantId=\{huntResumePayload\?\.gauntletVariantId \?\? hunterGauntlet\.equippedId\}/);
  assert.match(runtime,/const \[gauntletVisualId\]=useState\(\(\)=>gauntletVariantId \?\? "jungle-hunter"\)/);
  assert.match(runtime,/loadGauntletRigPartV141\(gauntletVisualId,moduleId,loadImage,legacyPath\)/);
  assert.ok(!read("app/game/systems/huntGauntletIdentityV142.ts").includes("damage"));
  assert.ok(!read("app/game/systems/huntGauntletIdentityV142.ts").includes("rewards"));
  assert.ok(!client.includes("setHuntResumePayload({snapshot: resumed.snapshot, retryCheckpoint: resumed.retryCheckpoint})"));
  assert.equal(HUNT_GAUNTLET_CONFIG_KEY_V142,"gauntletVariantId");
});

test("Arrival handoff and first-mount recovery retain the captured gauntlet after another tab changes a legacy preference",()=>{
  const source=read("app/game/GameClient.tsx");
  const ast=ts.createSourceFile("GameClient.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const find=predicate=>{
    let found;
    const visit=node=>{if(predicate(node)) found=node;else ts.forEachChild(node,visit);};
    visit(ast);
    assert.ok(found,"the production handler or HuntCanvas prop must exist");
    return found;
  };
  const save=defaultSave(owner);
  save.profile.honor=RANK_THRESHOLDS[rank];save.profile.rankId=rank;
  save.settings.difficultyId="hunter";
  delete save.gauntletV134;
  let preference=serializeGauntletPreferenceV132(owner,"wolf",rank,[]);
  const equipped=()=>readHunterGauntletV133({getItem:()=>preference},owner,rank,new Map());
  const environment={
    save,saveRef:{current:save},sessionAliveRef:{current:true},arrivalMountedRunRef:{current:null},
    activeHuntSessionRef:{current:null},missionSettlementRef:{current:false},
    MISSIONS:[{id:"jungle-vey"}],hunterGauntlet:{equippedId:equipped()},huntResumePayload:null,
    normalizeSave,normalizeHuntAccessibilityV112,captureHuntGauntletV142,resumeHuntGauntletV142,
    normalizePlanetInsertionPlan,isShipId,evaluateClanShipAccess,shipSupportsSurfaceInsertion,
    expeditionTrioReady,hasShipInsertionDebit,
    setHuntResumePayload(value){environment.huntResumePayload=value;},
    setHuntRuntimeSave(value){environment.huntRuntimeSave=value;},
    setPendingHuntResult(){},setLastResult(){},setLastRewardSummary(){},setSelectedMission(){},
    setResumableHunt(){},setNewGamePhase(){},setScreen(){},
  };
  const evaluate=expression=>runInNewContext(ts.transpileModule(`(${expression})`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
  }).outputText,environment);
  const implementation=name=>{
    const node=find(node=>(ts.isFunctionDeclaration(node)&&node.name?.text===name)||
      (ts.isVariableDeclaration(node)&&node.name.getText(ast)===name));
    return evaluate((ts.isFunctionDeclaration(node)?node:node.initializer.arguments[0]).getText(ast));
  };
  for(const name of ["isJsonObject","huntConfiguration","normalizeHuntConfiguration"]) environment[name]=implementation(name);
  const arrival=completePlanetArrivalHandoff(requestPlanetArrivalHandoff(createPlanetArrival({
    ownerCreatedAt:owner,runId:"v142-arrival-001",missionId:"jungle-vey",encounterRun:save.missionProgress["jungle-vey"].attempts,
    personalShipId:"classic-predator-spaceship",hunterPresetId:save.appearance.presetId,
  }),"skipped"));
  // JSON storage puts the captured configuration back into the validator's realm,
  // just as a campaign reload does; no hand-written replacement capture is used.
  const run={version:1,ownerCreatedAt:owner,runId:arrival.runId,startedAt:owner,difficultyId:"hunter",
    configuration:JSON.parse(JSON.stringify(environment.huntConfiguration(save,environment.hunterGauntlet.equippedId)))};
  save.planetArrival=arrival;save.planetArrivalRun=run;
  assert.equal(run.configuration.gauntletVariantId,"wolf");
  preference=serializeGauntletPreferenceV132(owner,"feral",rank,[]);
  environment.hunterGauntlet.equippedId=equipped();
  assert.equal(environment.hunterGauntlet.equippedId,"feral","the supported V133 fallback sees the other tab's choice");
  const mount=implementation("mountArrivalHunt");
  assert.equal(mount(arrival,{...run,runId:"older-arrival"}),false,"an older run cannot supply the new hunt's identity");
  assert.equal(mount(arrival,{...run,ownerCreatedAt:"2026-01-01T00:00:00.000Z"}),false,"another campaign cannot supply the new hunt's identity");
  assert.equal(environment.activeHuntSessionRef.current,null);
  assert.equal(environment.arrivalMountedRunRef.current,null);
  assert.equal(mount(arrival,run),true);
  assert.equal(environment.activeHuntSessionRef.current.configuration.gauntletVariantId,"wolf");
  const canvas=find(node=>(ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&node.tagName.getText(ast)==="HuntCanvas");
  const canvasProp=name=>{
    const prop=canvas.attributes.properties.find(attribute=>attribute.name?.getText(ast)===name);
    assert.ok(prop?.initializer&&ts.isJsxExpression(prop.initializer));
    return evaluate(prop.initializer.expression.getText(ast));
  };
  const visual=()=>canvasProp("gauntletVariantId");
  assert.equal(visual(),"wolf","the visible first-mount identity must match its durable run, not the later preference");
  assert.equal(canvasProp("resumeSnapshot"),null,"first departure still creates a fresh world, briefing and clocks");
  assert.equal(canvasProp("resumeRetryCheckpoint"),null,"first departure must not resume a retry checkpoint");
  environment.arrivalMountedRunRef.current=null;environment.activeHuntSessionRef.current=null;environment.huntResumePayload=null;
  assert.equal(mount(arrival,JSON.parse(JSON.stringify(run))),true);
  assert.equal(visual(),"wolf","reloading a completed arrival before its first world snapshot keeps the same identity");
  assert.equal(canvasProp("resumeSnapshot"),null);
  environment.huntResumePayload={gauntletVariantId:"city-hunter"};
  assert.equal(visual(),"city-hunter","a claimed active-hunt resume keeps its own captured identity");
  environment.huntResumePayload=null;delete save.planetArrivalRun;
  assert.equal(visual(),"feral","legacy launches without an arrival run retain their legitimate preference fallback");
});
