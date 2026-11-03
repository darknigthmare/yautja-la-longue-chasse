import {readFile,writeFile} from 'node:fs/promises';
const marker='// FIELD_PROPS_20261103';
async function patch(file,edits){
 let s=await readFile(file,'utf8');
 if(s.includes(marker)){console.log('Already integrated:',file);return;}
 for(const [before,after] of edits){
  if(s.split(before).length!==2)throw new Error(`Ambiguous/missing anchor in ${file}: ${before.slice(0,90)}`);
  s=s.replace(before,after);
 }
 if(file.endsWith('ClanWarRtsSquadsV133.tsx')){
  s=s.replaceAll('+9}', '+cell/2}').replaceAll('+13}', '+cell*13/18}').replaceAll('+12}', '+cell*2/3}');
  s=s.replaceAll('r="6.5"','r={cell*6.5/18}').replaceAll('r="7.3"','r={cell*7.3/18}').replaceAll('fontSize="9"','fontSize={cell/2}').replaceAll('fontSize="11"','fontSize={cell*11/18}');
  s=s.replace('M ${e.x*cell+cell/2} ${e.y*cell+2} l 7 13 h -14 Z','M ${e.x*cell+cell/2} ${e.y*cell+cell/9} l ${cell*7/18} ${cell*13/18} h ${-cell*14/18} Z');
 }
 s=s.replace('"use client";','"use client";\n'+marker);
 await writeFile(file,s);
}
await patch('app/game/ClanWarOperationsV115.tsx',[
 ['import styles from "./ClanWarOperationsV115.module.css";',`import ClanWarFieldSprite from "./ClanWarFieldSprite";
import {fieldKeyboardAction,fieldKeyboardTargetBlocked} from "./systems/clanWarFieldControls";
import styles from "./ClanWarOperationsV115.module.css";`],
 ['data-testid="clan-operations-v115" data-war-campaign-write="none"',`data-testid="clan-operations-v115" data-war-campaign-write="none" tabIndex={0}
    onKeyDown={event=>{
      const actor=worldRef.current.active?.stealth;
      const command=fieldKeyboardAction({key:event.key,repeat:event.repeat,
        ctrlKey:event.ctrlKey,metaKey:event.metaKey,altKey:event.altKey,
        isComposing:event.nativeEvent.isComposing,
        editing:fieldKeyboardTargetBlocked(event.target),
        mode:worldRef.current.active?.mode==="stealth"?"stealth":"other",
        blocked:blocked||!active||!actor||
          (actor.reinforcementMode===undefined&&!actor.supportGuard)});
      if(!command)return;
      event.preventDefault();event.stopPropagation();
      commit(commandStealthV115(worldRef.current,command,rules));
    }`],
 ['{assault && <div>',`{assault && <div>
        <ClanWarFieldSprite id={assault.ownBase<40?"barrier-damaged":"barrier-intact"}
          label="Illustration originale du bastion : aucun nouvel obstacle de collision" size={72}/>`],
 ['{stealth && <div>',`{stealth && <div>
        <p>Clavier lorsque le panneau a le focus : flèches, ZQSD ou WASD ; E : interagir ; Espace : attendre. Une pression = un ordre ; aucun maintien automatique.</p>`],
 ['>{mark}</span>;',`>{mark==="R"?<ClanWarFieldSprite id={stealth.sabotaged?"relay-disabled":"relay-active"} label={stealth.sabotaged?"Relais neutralisé":"Relais actif"} size={40}/>:mark==="E"?<ClanWarFieldSprite id="beacon-active" label="Extraction" size={40}/>:mark}</span>;`],
 ['return <div className={styles.delegatedOrder} key={order.id}>',`return <div className={styles.delegatedOrder} key={order.id}>
        <ClanWarFieldSprite id="supply-sealed" label="Illustration logistique originale ; pas de cargaison supplémentaire" size={56}/>`],
 ['<h4>Triage du clan · récupération des blessures légères</h4>',`<h4>Triage du clan · récupération des blessures légères</h4>
      <ClanWarFieldSprite id={(world.pendingTreatments??[]).length?"medical-stocked":"medical-empty"} label="Illustration du poste médical ; aucun soin automatique" size={56}/>`],
]);
await patch('app/game/ClanWarRtsSquadsV133.tsx',[
 ['import styles from "./ClanWarRtsSquadsV133.module.css";',`import ClanWarFieldSprite,{fieldSpriteUrl} from "./ClanWarFieldSprite";
import {fieldKeyboardAction,fieldKeyboardTargetBlocked} from "./systems/clanWarFieldControls";
import styles from "./ClanWarRtsSquadsV133.module.css";`],
 [' const cell=18;',` const [mapZoom,setMapZoom]=useState(1);
 const cell=18*mapZoom;`],
 ['data-testid="war-rts-squads-v133"',`data-testid="war-rts-squads-v133" tabIndex={0}
  onKeyDown={event=>{
    const command=fieldKeyboardAction({key:event.key,repeat:event.repeat,
      ctrlKey:event.ctrlKey,metaKey:event.metaKey,altKey:event.altKey,
      isComposing:event.nativeEvent.isComposing,
      editing:fieldKeyboardTargetBlocked(event.target),mode:"rts",
      blocked:state.phase!=="active"||!selected||selected.status!=="active"});
    if(!command||!selected)return;
    event.preventDefault();event.stopPropagation();
    if(command==="wait"||command==="interact")action(command);
    else send({kind:"move",squadId:selected.id,direction:command});
  }`],
 ['    <div className={styles.mapScroll}>',`    <div className={styles.toolbar} aria-label="Zoom de la carte">
      <button type="button" disabled={mapZoom<=.75} onClick={()=>setMapZoom(z=>Math.max(.75,z-.25))} aria-label="Réduire la carte">−</button>
      <output aria-live="polite">{Math.round(mapZoom*100)} %</output>
      <button type="button" disabled={mapZoom>=3} onClick={()=>setMapZoom(z=>Math.min(3,z+.25))} aria-label="Agrandir la carte">+</button>
      <button type="button" onClick={()=>setMapZoom(1)}>100 %</button>
    </div>
    <p>Clavier sur ce panneau : flèches/ZQSD/WASD, E pour interagir, Espace pour attendre. Les zones de saisie et boutons gardent leurs commandes habituelles.</p>
    <div className={styles.mapScroll}>`],
 ['<svg viewBox={`0 0 ${map.width*cell} ${map.height*cell}`} role="img"',`<svg width={map.width*cell} height={map.height*cell} style={{maxWidth:"none",display:"block"}} viewBox={\`0 0 \${map.width*cell} \${map.height*cell}\`} role="img"`],
 ['<text x={map.observation.x*cell+9} y={map.observation.y*cell+13} textAnchor="middle" fill="#f0df94" fontSize="12">◈</text>',`<image href={fieldSpriteUrl("relay-active")} x={map.observation.x*cell} y={map.observation.y*cell} width={cell} height={cell}/>`],
 ['<text x={map.extraction.x*cell+9} y={map.extraction.y*cell+13} textAnchor="middle" fill="#e9e1a8" fontSize="13">↥</text>',`<image href={fieldSpriteUrl("beacon-active")} x={map.extraction.x*cell} y={map.extraction.y*cell} width={cell} height={cell}/>`],
 ['<span>Électricité : <strong>{state.power?"alimentée":"coupée"}</strong></span>',`<span><ClanWarFieldSprite id={state.power?"core-active":"core-disabled"} label={state.power?"Générateur alimenté":"Générateur coupé"} size={44}/> Électricité : <strong>{state.power?"alimentée":"coupée"}</strong></span>`],
]);
console.log('Field sprites + keyboard + zoom integrated; engines and persistence writers unchanged.');
