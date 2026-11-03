"use client";
import type { FirstHuntHint } from "./systems/firstHuntGuide";
import { controlActionShortcut } from "./controlBindingLabels";
import type { ControlBindings } from "./systems/controlBindings";
import styles from "./FirstHuntGuide.module.css";

export default function FirstHuntGuide({ hint, bindings, collapsed, onToggle, onReturnToPlay }: { hint: FirstHuntHint; bindings: ControlBindings; collapsed: boolean; onToggle(): void; onReturnToPlay(): void }) {
  return <aside className={styles.guide} data-first-hunt-guide={hint.id} data-guide-direction={hint.direction ?? "none"} aria-label="Guide de première chasse">
    <div className={styles.heading}><div aria-live="polite" aria-atomic="true"><small>{hint.progress}</small><strong>{hint.direction === "left" ? "← " : hint.direction === "right" ? "→ " : hint.direction === "near" ? "◆ " : ""}{hint.title}</strong></div>
      <button type="button" aria-expanded={!collapsed} aria-label={collapsed ? "Développer le guide" : "Réduire le guide"} onClick={() => { onToggle(); onReturnToPlay(); }}>{collapsed ? "+" : "−"}</button></div>
    {!collapsed && <><p>{hint.detail}</p><div className={styles.controls}>{hint.actions.map(action => <kbd key={action}>{controlActionShortcut(action, bindings)}</kbd>)}<span>{hint.gamepad}</span></div></>}
  </aside>;
}
