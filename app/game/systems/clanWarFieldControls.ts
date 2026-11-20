/** Keyboard input only. No timers, writes, rewards or visibility decisions. */
export const FIELD_ACTIONS = ['up','down','left','right','wait','interact'] as const;
export type FieldAction = typeof FIELD_ACTIONS[number];
export type FieldShortcuts = Partial<Record<FieldAction,string>>;
export interface FieldKey {
 key:string; repeat?:boolean; ctrlKey?:boolean; metaKey?:boolean;
 altKey?:boolean; isComposing?:boolean; blocked?:boolean;
 editing?:boolean; mode:'stealth'|'rts'|'other';
}

const defaultKeys:Readonly<Record<FieldAction,readonly string[]>>={
 up:['arrowup','z','w'],
 down:['arrowdown','s'],
 left:['arrowleft','q','a'],
 right:['arrowright','d'],
 wait:[' ','.'],
 interact:['e'],
};

const namedKeys:Readonly<Record<string,{aria:string;label:string}>>={
 arrowup:{aria:'ArrowUp',label:'Flèche Haut'},
 arrowdown:{aria:'ArrowDown',label:'Flèche Bas'},
 arrowleft:{aria:'ArrowLeft',label:'Flèche Gauche'},
 arrowright:{aria:'ArrowRight',label:'Flèche Droite'},
 ' ':{aria:'Space',label:'Espace'},
 '.':{aria:'.',label:'Point'},
};
export const FIELD_SHORTCUT_KEYS=[
 ...Object.keys(namedKeys),
 ...'abcdefghijklmnopqrstuvwxyz0123456789',
];

export function fieldShortcutLabel(key:string):string{
 return namedKeys[key]?.label??key.toUpperCase();
}

export function fieldShortcutKeys(action:FieldAction,shortcuts:FieldShortcuts):readonly string[]{
 const assigned=shortcuts[action];
 return assigned===undefined?defaultKeys[action]:[assigned];
}

export function fieldShortcutAttributes(shortcuts:FieldShortcuts,mode:'stealth'|'rts'){
 const actions=FIELD_ACTIONS.filter(action=>mode==='stealth'||action!=='interact');
 return actions.flatMap(action=>fieldShortcutKeys(action,shortcuts))
  .map(key=>namedKeys[key]?.aria??key.toUpperCase()).join(' ');
}

function shortcutsAreUnique(shortcuts:FieldShortcuts):boolean{
 const effective=FIELD_ACTIONS.flatMap(action=>fieldShortcutKeys(action,shortcuts));
 return new Set(effective).size===effective.length;
}

export function rebindFieldShortcut(shortcuts:FieldShortcuts,action:FieldAction,key:string|null):FieldShortcuts|null{
 if(key!==null&&!FIELD_SHORTCUT_KEYS.includes(key))return null;
 const next={...shortcuts};
 if(key===null)delete next[action];
 else next[action]=key;
 return shortcutsAreUnique(next)?next:null;
}

export function readFieldShortcuts(raw:string|null):FieldShortcuts{
 if(!raw)return {};
 try{
  const parsed:unknown=JSON.parse(raw);
  if(typeof parsed!=='object'||parsed===null||Array.isArray(parsed))return {};
  const next:FieldShortcuts={};
  for(const action of FIELD_ACTIONS){
   const key=(parsed as Record<string,unknown>)[action];
   if(key===undefined)continue;
   if(typeof key!=='string'||!FIELD_SHORTCUT_KEYS.includes(key))return {};
   next[action]=key;
  }
  return shortcutsAreUnique(next)?next:{};
 }catch{return {};}
}

export function fieldKeyboardAction(e:FieldKey,shortcuts:FieldShortcuts={}):FieldAction|null{
 if(e.blocked||e.editing||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.mode==='other')return null;
 const key=e.key.toLowerCase();
 return FIELD_ACTIONS.find(action=>fieldShortcutKeys(action,shortcuts).includes(key))??null;
}

export function fieldKeyboardTargetBlocked(target:EventTarget|null):boolean{
 if(typeof Element==='undefined'||!(target instanceof Element))return false;
 return Boolean(target.closest('input,textarea,select,button,a,summary,[contenteditable]:not([contenteditable="false"])'));
}
