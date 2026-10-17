"use client";
import { useMemo, useState } from "react";
import corpus from "../game/data/dialoguesV6-first100.json";

export default function DialogueArchivePage() {
  const [selected, setSelected] = useState(corpus.scenes[0]?.id ?? "");
  const [phase, setPhase] = useState("OUV");
  const scene = corpus.scenes.find(item => item.id === selected);
  const lines = useMemo(() => corpus.lines.filter(line => line.scene === selected && line.phase === phase).sort((a,b) => a.order-b.order), [selected, phase]);
  const choices = corpus.choices.filter(choice => choice.scene === selected);
  const phases = Array.from(new Set(corpus.lines.filter(line => line.scene === selected).map(line => line.phase)));
  return <main style={{maxWidth:960,margin:"0 auto",padding:24,fontFamily:"system-ui",color:"#e7e3d5",background:"#171916",minHeight:"100vh"}}>
    <h1>Archives de dialogue — Bible V6</h1>
    <p>Consultation du corpus de conception : les scènes ne déclenchent pas encore de mission et les choix ne donnent aucune récompense.</p>
    <label htmlFor="scene">Scène</label>{" "}
    <select id="scene" value={selected} onChange={event=>{setSelected(event.target.value);setPhase("OUV");}} style={{maxWidth:"100%",padding:8}}>
      {corpus.scenes.map(item=><option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}
    </select>
    {scene && <section><h2>{scene.title}</h2><p>{scene.situation}</p><p><strong>Participants :</strong> {scene.participants}</p><p><strong>Condition de conception :</strong> {scene.entry}</p></section>}
    <nav aria-label="Phases du dialogue" style={{display:"flex",flexWrap:"wrap",gap:8,margin:"20px 0"}}>
      {phases.map(item=><button type="button" key={item} aria-pressed={phase===item} onClick={()=>setPhase(item)} style={{padding:8,background:phase===item?"#6b7547":"#343a30",color:"white"}}>{item}</button>)}
    </nav>
    <section aria-live="polite">{lines.length===0?<p>Aucune réplique pour cette phase.</p>:lines.map(line=><article key={line.id} style={{padding:12,borderBottom:"1px solid #555"}}><strong>{line.speaker}</strong><p>{line.text}</p><small>{line.gesture}</small></article>)}</section>
    <h3>Choix de conception — actions à réaliser en jeu</h3>
    {choices.map(choice=><article key={choice.id} style={{padding:12,border:"1px solid #555",marginBottom:8}}><strong>{choice.choice}</strong><p>{choice.action}</p><small>{choice.consequence}</small></article>)}
    <p><small>Source : {corpus.source}. Import limité aux 100 premières scènes, sans attribution de progression.</small></p>
  </main>;
}
