"use client";
import {HUNT_GAMEPAD_ACTIONS_V112,HUNT_GAMEPAD_LABELS_V112,normalizeHuntAccessibilityV112,rebindHuntGamepadV112,DEFAULT_HUNT_ACCESSIBILITY_V112,type HuntAccessibilityV112,type HuntGamepadActionV112} from "./systems/huntAccessibilityV112";
import styles from "./HuntAccessibilityV112.module.css";
const LABELS:Record<HuntGamepadActionV112,string>={jump:"Saut / lâcher",melee:"Lames",weapon:"Arme",scan:"Scan",cloak:"Camouflage",heal:"Medicomp",interact:"Interagir",weaponNext:"Arme suivante",gearOne:"Équipement 1",gearTwo:"Équipement 2",pause:"Pause",aim:"Viser"};
export default function HuntAccessibilityPanelV112({value,onChange}:{value?:HuntAccessibilityV112;onChange(value:HuntAccessibilityV112):void}){
  const settings=normalizeHuntAccessibilityV112(value);
  const patch=(change:Partial<HuntAccessibilityV112>)=>onChange({...settings,...change});
  return <section className={styles.panel} aria-labelledby="hunt-accessibility-v112">
    <h3 id="hunt-accessibility-v112">Rites et canopée · accessibilité</h3>
    <p>Aucun coefficient de score n’est ajouté. Le temps de chasse et les dangers continuent pendant les gestes : une exécution plus longue peut modifier le score chronométré et la qualité du trophée Apex. Ces options n’accordent aucune prise automatiquement.</p>
    <label>Fenêtre des glyphes<select aria-label="Fenêtre des glyphes" value={settings.ritualTiming} onChange={event=>patch({ritualTiming:event.target.value as HuntAccessibilityV112["ritualTiming"]})}><option value="normal">Standard · 0,18 à 0,84 s</option><option value="generous">Large · 0,36 à 1,68 s</option><option value="unlimited">Sans limite de temps par glyphe</option></select></label>
    <label>Confirmation du rite<select aria-label="Confirmation du rite" value={settings.ritualConfirm} onChange={event=>patch({ritualConfirm:event.target.value as HuntAccessibilityV112["ritualConfirm"]})}><option value="press">Appui par glyphe</option><option value="hold">Maintenir le bouton de confirmation</option><option value="toggle">Armer le glyphe, puis relâcher</option></select></label>
    <p>Le bouton « Confirmer ce glyphe » accepte une seule commande par étape. En maintien, garde-le pressé au moins 0,35 s ; en bascule, un appui arme le geste, un second le désarme. Il faut confirmer chaque nouveau glyphe. Les touches ordinaires du rite restent actives.</p>
    <label className={styles.check}><input type="checkbox" checked={settings.gripInput==="toggle"} onChange={event=>patch({gripInput:event.target.checked?"toggle":"hold"})}/>Prise en bascule : Haut accroche, Haut à nouveau relâche</label>
    <label className={styles.check}><input type="checkbox" checked={settings.aimInput==="toggle"} onChange={event=>patch({aimInput:event.target.checked?"toggle":"hold"})}/>Visée en bascule</label>
    <p>Pause, perte de focus ou déconnexion désarment les bascules. Saut conserve toujours son action de lâcher ; Haut/Bas ajustent la longueur d’une liane.</p>
    <label className={styles.check}><input type="checkbox" checked={settings.largeGlyphs} onChange={event=>patch({largeGlyphs:event.target.checked})}/>Grands glyphes et confirmations</label>
    <label className={styles.check}><input type="checkbox" checked={settings.fieldGuide} onChange={event=>patch({fieldGuide:event.target.checked})}/>Guide de terrain dans toutes les chasses</label>
    <details><summary>Remapper la manette de chasse</summary><p>Profil standard Xbox / PlayStation. Choisir un bouton échange les deux actions : aucune commande ne disparaît. Les directions, les menus et les boutons tactiles gardent leurs libellés propres.</p>
      <div className={styles.mapping}>{HUNT_GAMEPAD_ACTIONS_V112.map(action=><label key={action}>{LABELS[action]}<select aria-label={"Manette : "+LABELS[action]} value={settings.gamepadButtons[action]} onChange={event=>onChange(rebindHuntGamepadV112(settings,action,Number(event.target.value)))}>{HUNT_GAMEPAD_LABELS_V112.map((label,index)=><option key={index} value={index}>{label}</option>)}</select></label>)}</div>
    </details>
    <button type="button" onClick={()=>onChange(normalizeHuntAccessibilityV112(DEFAULT_HUNT_ACCESSIBILITY_V112))}>Restaurer ces options de chasse</button>
  </section>;
}
