import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";

const root=fileURLToPath(new URL("../",import.meta.url));
const read=path=>readFileSync(root+path,"utf8");
const built=await build({stdin:{
  contents:"export * from './app/game/systems/clanWarSessionV85'; export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarTurnGateV143';",
  resolveDir:root,
},bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent"});
const system=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const noopLock=async operation=>({acquired:true,value:await operation()});
function fixture(){
 const storageData=new Map(),writes=[];
 const storage={
   getItem:key=>storageData.get(key)??null,
   setItem(key,value){storageData.set(key,value);writes.push({key,value});},
 };
 const create=async()=>{
   const s=system.createWarSessionV85(()=>storage,noopLock,null);
   s.subscribe(()=>{});
   await s.whenSettled();
   return s;
 };
 return {storageData,storage,writes,create};
}
test("a foreign-tab archive edit invalidates only the affected Korthas front and cannot overwrite",async()=>{
 const f=fixture(),one=await f.create(),two=await f.create();
 const key=system.WAR_STORAGE_KEY_V85;
 assert.equal(one.getSnapshot().simulation.turn,1);
 assert.equal(two.getSnapshot().staleWar,false);
 one.setSimulation(current=>({...current,turn:2,revision:current.revision+1}));
 await one.whenSettled();
 assert.equal(JSON.parse(f.storage.getItem(key)).turn,2);
 two.observeExternalStorageChange("yautja.clan-war.presentation.v1");
 assert.equal(two.getSnapshot().staleWar,false);
 two.observeExternalStorageChange(key);
 assert.equal(two.getSnapshot().staleWar,true);
 assert.equal(two.getSnapshot().writableWar,false);
 assert.match(two.getSnapshot().storageMessage,/autre session/);
 assert.equal(system.inspectWarTurnGateV143(two.getSnapshot(),0,true,false).reason,"conflict");
 const baseline=f.writes.length;
 two.setSimulation(current=>({...current,turn:99,revision:99}));
 two.unlockWarAfterExplicitReset();
 await two.whenSettled();
 assert.equal(two.getSnapshot().simulation.turn,1,"stale renderer cannot even mutate its in-memory war");
 assert.equal(f.writes.length,baseline,"stale renderer must not overwrite source bytes");
 assert.equal(JSON.parse(f.storage.getItem(key)).turn,2);
 const reopen=await f.create();
 assert.equal(reopen.getSnapshot().simulation.turn,2);
 assert.equal(reopen.getSnapshot().staleWar,false);
});
test("offline memory-only exercises stay usable, never confused with a concurrent edit",async()=>{
 const session=system.createWarSessionV85(()=>null,noopLock,null);
 session.subscribe(()=>{});
 await session.whenSettled();
 const before=session.getSnapshot();
 assert.equal(before.loaded,true);
 assert.equal(before.writableWar,false);
 assert.equal(before.staleWar,false);
 assert.equal(system.inspectWarTurnGateV143(before,before.simulation.revision,true,false).reason,"ready");
 session.setSimulation(current=>({...current,turn:2,revision:current.revision+1}));
 await session.whenSettled();
 assert.equal(session.getSnapshot().simulation.turn,2);
 assert.equal(session.getSnapshot().staleWar,false);
 assert.equal(session.getSnapshot().persistedWar,false);
});
test("source integration includes read-only conflict banner, focus recheck, non-destructive gates and one atlas",()=>{
 const session=read("app/game/systems/clanWarSessionV85.ts");
 const panel=read("app/game/ClanWarPanelV85.tsx");
 const gate=read("app/game/systems/clanWarTurnGateV143.ts");
 assert.match(session,/function observeExternalStorageChange\(key: string \| null\)/);
 assert.match(session,/kind==="simulation" && snapshot.staleWar/);
 assert.match(panel,/session\.observeExternalStorageChange\(key\)/);
 assert.match(panel,/window\.addEventListener\("storage",onStorage\)/);
 assert.match(panel,/document\.addEventListener\("visibilitychange",onFocus\)/);
 assert.match(panel,/data-testid="clan-war-foreign-tab-conflict-v144"/);
 assert.match(panel,/if \(strategic\.staleWar\)/);
 assert.match(gate,/if\(snapshot\.staleWar\)return \{allowed:false,reason:"conflict"\}/);
 assert.equal((panel.match(/<ClanWarAtlasV95\b/g)||[]).length,1);
 assert.match(panel,/data-war-campaign-write="none"/);
 assert.ok(!session.includes("gauntletCampaignClaimV134("));
});
