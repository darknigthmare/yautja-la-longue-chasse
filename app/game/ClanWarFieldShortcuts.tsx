"use client";

import {useMemo,useState,useSyncExternalStore} from "react";
import {
 FIELD_ACTIONS,FIELD_SHORTCUT_KEYS,fieldShortcutKeys,fieldShortcutLabel,
 readFieldShortcuts,rebindFieldShortcut,type FieldAction,type FieldShortcuts,
} from "./systems/clanWarFieldControls";
import styles from "./ClanWarOperationsV115.module.css";

const STORAGE_KEY="yautja.clan-war.v115.keyboard.v1";
const CHANGE_EVENT="yautja-clan-war-keyboard-change";
const actionLabels:Record<FieldAction,string>={
 up:"Monter",down:"Descendre",left:"Aller à gauche",
 right:"Aller à droite",wait:"Attendre ou tenir la position",interact:"Interagir en infiltration",
};

function subscribe(notify:()=>void){
 function onStorage(event:StorageEvent){
  if(event.key===null||event.key===STORAGE_KEY)notify();
 }
 window.addEventListener("storage",onStorage);
 window.addEventListener(CHANGE_EVENT,notify);
 return ()=>{
  window.removeEventListener("storage",onStorage);
  window.removeEventListener(CHANGE_EVENT,notify);
 };
}

function getSnapshot(){
 try{return window.localStorage.getItem(STORAGE_KEY);}
 catch{return null;}
}
const getServerSnapshot=()=>null;

export function useClanWarFieldShortcuts(){
 const raw=useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
 return useMemo(()=>readFieldShortcuts(raw),[raw]);
}

export default function ClanWarFieldShortcuts({shortcuts,active}:{shortcuts:FieldShortcuts;active:boolean}){
 const [message,setMessage]=useState("");
 function save(next:FieldShortcuts|null){
  if(!next){setMessage("Cette touche est déjà utilisée par une autre action.");return;}
  try{
   window.localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
   window.dispatchEvent(new Event(CHANGE_EVENT));
   setMessage("Commandes clavier enregistrées.");
  }catch{setMessage("Stockage indisponible. Les commandes précédentes sont conservées.");}
 }
 return <details className={styles.shortcutEditor}>
  <summary>Personnaliser les commandes clavier</summary>
  <p>Ces commandes s’appliquent aux cartes d’infiltration et de bataille de ce poste. Chaque touche personnalisée remplace les raccourcis de l’action correspondante.</p>
  <fieldset disabled={!active}>
   <legend>Touches des cartes tactiques</legend>
   {FIELD_ACTIONS.map(action=><label key={action}>
    {actionLabels[action]}
    <select aria-label={actionLabels[action]} value={shortcuts[action]??""} onChange={event=>save(rebindFieldShortcut(
     readFieldShortcuts(getSnapshot()),action,event.target.value||null))}>
     <option value="">Par défaut ({fieldShortcutKeys(action,{}).map(fieldShortcutLabel).join(", ")})</option>
     {FIELD_SHORTCUT_KEYS.map(key=><option key={key} value={key}>{fieldShortcutLabel(key)}</option>)}
    </select>
   </label>)}
   <button type="button" onClick={()=>save({})}>Restaurer les touches par défaut</button>
  </fieldset>
  <p role="status">{message}</p>
 </details>;
}
