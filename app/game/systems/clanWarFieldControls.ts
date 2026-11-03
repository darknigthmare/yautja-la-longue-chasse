/** Keyboard input only. No timers, writes, rewards or visibility decisions. */
export type FieldAction = 'up'|'down'|'left'|'right'|'wait'|'interact';
export interface FieldKey {
 key:string; repeat?:boolean; ctrlKey?:boolean; metaKey?:boolean;
 altKey?:boolean; isComposing?:boolean; blocked?:boolean;
 editing?:boolean; mode:'stealth'|'rts'|'other';
}
const keys:Readonly<Record<string,FieldAction>>={
 arrowup:'up',z:'up',w:'up',arrowdown:'down',s:'down',
 arrowleft:'left',q:'left',a:'left',arrowright:'right',d:'right',
 ' ':'wait','.':'wait',e:'interact',
};
export function fieldKeyboardAction(e:FieldKey):FieldAction|null{
 if(e.blocked||e.editing||e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.mode==='other')return null;
 return keys[e.key.toLowerCase()]??null;
}
export function fieldKeyboardTargetBlocked(target:EventTarget|null):boolean{
 return typeof Element!=='undefined'&&target instanceof Element&&Boolean(
  target.closest('input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"])')
 );
}
