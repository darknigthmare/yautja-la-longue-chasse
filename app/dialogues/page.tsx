"use client";
import { useEffect, useMemo, useState } from "react";
import index from "../game/data/dialoguesV6-index.json";
type Scene = {id:string;title:string;domain:string;source:string;situation:string;participants:string;entry:string};
type Line = {id:string;scene:string;phase:string;choice:string;order:number;speaker:string;text:string;gesture:string};
type Choice = {id:string;scene:string;choice:string;playerLine:string;responseLine:string;action:string;consequence:string};
type Chunk = {scenes:Scene[];lines:Line[];choices:Choice[]};
const loaders = [
 () => import("../game/data/dialoguesV6-first100.json"),
 () => import("../game/data/dialoguesV6-101-200.json"),
 () => import("../game/data/dialoguesV6-201-300.json"),
 () => import("../game/data/dialoguesV6-301-400.json"),
 () => import("../game/data/dialoguesV6-401-500.json"),
 () => import("../game/data/dialoguesV6-501-600.json"),
 () => import("../game/data/dialoguesV6-601-700.json"),
 () => import("../game/data/dialoguesV6-701-733.json"),
];
export default function DialogueArchivePage() {
 const [selected,setSelected]=useState(index.scenes[0]?.id??"");
 const [phase,setPhase]=useState("OUV");
 const [data,setData]=useState<Chunk|null>(null);
 const [error,setError]=useState("");
 const entry=index.scenes.find(x=>x.id===selected);
 useEffect(()=>{
   let live=true;
   if(!entry){return;}
   loaders[entry.chunk]().then(module=>{if(live){setData(module.default as Chunk);setError("");}})
     .catch(()=>{if(live){setData(null);setError("Cette archive ne peut pas être chargée.");}});
   return ()=>{live=false};
 },[entry?.chunk]);
 const scene=data?.scenes.find(x=>x.id===selected);
 const lines=useMemo(()=>data?.lines.filter(x=>x.scene===selected&&x.phase===phase).sort((a,b)=>a.order-b.order)??[],[data,selected,phase]);
 const choices=data?.choices.filter(x=>x.scene===selected)??[];
 const phases=Array.from(new Set(data?.lines.filter(x=>x.scene===selected).map(x=>x.phase)??[]));
 return <main style={{maxWidth:960,margin:"0 auto",padding:24,fontFamily:"system-ui",color:"#e7e3d5",background:"#171916",minHeight:"100vh"}}>
 <h1>Archives de dialogue — Bible V6</h1>
 <p>733 scènes de conception issues de l’Excel. Consultation seulement : aucune mission, sauvegarde ou récompense n’est déclenchée ici.</p>
 <label htmlFor="scene">Scène</label>{" "}
 <select id="scene" value={selected} onChange={e=>{setSelected(e.target.value);setPhase("OUV");}} style={{maxWidth:"100%",padding:8}}>
 {index.scenes.map(x=><option key={x.id} value={x.id}>{x.id} — {x.title}</option>)}
 </select>
 {error&&<p role="alert">{error}</p>}
 {!data&& !error&&<p role="status">Chargement des répliques…</p>}
 {scene&&<section><h2>{scene.title}</h2><p>{scene.situation}</p><p><strong>Participants :</strong> {scene.participants}</p><p><strong>Condition de conception :</strong> {scene.entry}</p></section>}
 <nav aria-label="Phases du dialogue" style={{display:"flex",flexWrap:"wrap",gap:8,margin:"20px 0"}}>
 {phases.map(x=><button type="button" key={x} aria-pressed={phase===x} onClick={()=>setPhase(x)} style={{padding:8,background:phase===x?"#6b7547":"#343a30",color:"white"}}>{x}</button>)}
 </nav>
 <section aria-live="polite">{lines.length===0?<p>Aucune réplique pour cette phase.</p>:lines.map(x=><article key={x.id} style={{padding:12,borderBottom:"1px solid #555"}}><strong>{x.speaker}</strong><p>{x.text}</p><small>{x.gesture}</small></article>)}</section>
 <h3>Choix de conception — actions physiques à réaliser en jeu</h3>
 {choices.map(x=><article key={x.id} style={{padding:12,border:"1px solid #555",marginBottom:8}}><strong>{x.choice}</strong><p>{x.action}</p><small>{x.consequence}</small></article>)}
 <p><small>Source : {index.source}. Les scènes restent à raccorder à la progression, aux conditions de mission et aux animations.</small></p>
 </main>;
}
