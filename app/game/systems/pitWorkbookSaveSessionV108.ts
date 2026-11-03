export interface PitWorkbookStorageV108 {getItem(key:string):string|null;setItem(key:string,value:string):void}
export type PitWorkbookSaveLockV108=(name:string,commit:()=>void)=>Promise<void>;
export type PitWorkbookSaveErrorCodeV108='CONFLICT'|'NO_LOCK'|'UNCONFIRMED'|'INCOMPATIBLE'|'INVALID'|'CANCELLED';
export class PitWorkbookSaveErrorV108 extends Error {
  constructor(readonly code:PitWorkbookSaveErrorCodeV108){super('Pit workbook save: '+code);}
}
/** Every tab compares the exact bytes it observed while owning the same Web
 * Lock. A stale tab never replaces a newer valid checkpoint. Own writes form
 * a FIFO, and observation advances only after confirmed readback. */
export function createPitWorkbookSaveSessionV108(storage:PitWorkbookStorageV108,key:string,valid:(text:string)=>boolean,lock?:PitWorkbookSaveLockV108){
  let observed=storage.getItem(key),active=true,queue:Promise<void>=Promise.resolve();
  const exclusive=(operation:()=>void)=>{
    const next=queue.catch(()=>{}).then(async()=>{
      if(!lock)throw new PitWorkbookSaveErrorV108('NO_LOCK');
      await lock('yautja:pit-workbook-save-v108:'+key,()=>{
        if(!active)throw new PitWorkbookSaveErrorV108('CANCELLED');
        if(storage.getItem(key)!==observed)throw new PitWorkbookSaveErrorV108('CONFLICT');
        operation();
      });
    });queue=next;return next;
  };
  return {
    initialText:observed,
    close(){active=false;},
    write(text:string,authorizedReplacement:string|null=null){return exclusive(()=>{
      if(!valid(text))throw new PitWorkbookSaveErrorV108('INVALID');
      if(observed!==null&&!valid(observed)&&observed!==authorizedReplacement)throw new PitWorkbookSaveErrorV108('INCOMPATIBLE');
      if(text!==observed)storage.setItem(key,text);
      if(storage.getItem(key)!==text)throw new PitWorkbookSaveErrorV108('UNCONFIRMED');
      observed=text;
    });},
    async archiveIncompatible(archiveKey:string){
      let authorized:string|null=null;
      await exclusive(()=>{
        if(observed===null||valid(observed)||archiveKey===key)throw new PitWorkbookSaveErrorV108('INVALID');
        storage.setItem(archiveKey,observed);
        if(storage.getItem(archiveKey)!==observed)throw new PitWorkbookSaveErrorV108('UNCONFIRMED');
        authorized=observed;
      });return authorized;
    },
  };
}
export type PitWorkbookSaveSessionV108=ReturnType<typeof createPitWorkbookSaveSessionV108>;

/** Synchronous accounting closes the pointer/Escape race before the browser
 * grants a lock. Navigation is released only when the latest save confirms;
 * a refused/indefinite write requires the explicit unconfirmed-exit action. */
export function createPitWorkbookSaveNavigationV108(){
  let pending=0,serial=0,confirmed=true,exit:(()=>void)|null=null;
  return {
    state:()=>({pending,unconfirmed:!confirmed,waiting:exit!==null}),
    begin(){pending++;confirmed=false;return ++serial;},
    isLatest:(token:number)=>token===serial,
    markUnconfirmed(){confirmed=false;serial++;},
    settle(token:number,success:boolean){pending=Math.max(0,pending-1);if(token===serial)confirmed=success;const next=pending===0&&confirmed?exit:null;if(next)exit=null;return next;},
    requestExit(action:()=>void){if(pending===0&&confirmed)return action;exit=action;return null;},
    cancelExit(){exit=null;},
    forceExit(){const next=exit;exit=null;return next;},
  };
}
