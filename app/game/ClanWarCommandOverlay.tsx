"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./ClanWarCommandOverlay.module.css";

/** Presentation-only layer. Native modal focus keeps field controls behind it inert. */
export default function ClanWarCommandOverlay({ open, onClose, title, eyebrow = "TRANSMISSION DU CONSEIL", children, kind = "drawer" }: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  kind?: "drawer" | "dialog";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const sync = () => {
      // Native modal dialogs escape inherited inertness. Close their top layer
      // while the game's existing pause/section owner hides this subtree.
      const available = open && !element.parentElement?.closest("[inert],[hidden]");
      if (available && !element.open) element.showModal();
      else if (!available && element.open) element.close();
    };
    sync();
    if (!open) return;
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["inert", "hidden"] });
    return () => { observer.disconnect(); if (element.open) element.close(); };
  }, [open]);

  return <dialog ref={dialog} className={styles.overlay} data-command-overlay={kind}
    aria-labelledby={titleId} aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      // Neither Escape nor tactical shortcuts reach the field under a modal.
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
    }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <header className={styles.header}>
      <div><p>{eyebrow}</p><h3 id={titleId}>{title}</h3></div>
      <button type="button" className={styles.close} onClick={onClose} aria-label={`Fermer : ${title}`}>
        <span aria-hidden="true">×</span><small>ÉCHAP</small>
      </button>
    </header>
    <div className={styles.content}>{children}</div>
  </dialog>;
}
