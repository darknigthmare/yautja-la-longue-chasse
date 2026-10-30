"use client";

import type { ReactNode } from "react";
import type { ClanWarPresentationV131 } from "./systems/clanWarViewV131";
import styles from "./ClanWarGauntletV131.module.css";

interface ClanWarGauntletV131Props {
  view: ClanWarPresentationV131;
  planetName: string;
  turn: number;
  departure: string;
  destination: string;
  controlled: number;
  territories: number;
  queuedOrders: number;
  persisted: boolean;
  pending: boolean;
  children: ReactNode;
}

/** One real atlas for two presentations. Keeping children mounted preserves its
 * zoom, rotation, filters and keyboard focus while the player changes views. */
export default function ClanWarGauntletV131({
  view, planetName, turn, departure, destination, controlled,
  territories, queuedOrders, persisted, pending, children,
}: ClanWarGauntletV131Props) {
  return <section className={styles.stage} data-testid="clan-war-gauntlet-v131" data-war-presentation={view}
    aria-label="Projection stratégique et atlas des guerres de clans">
    <div className={styles.projector} aria-hidden={view === "classic"}>
      <div className={styles.gauntletArt}>
        <svg viewBox="0 0 540 290" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="gauntlet-v131-metal" x1="0" y1="0" x2=".75" y2="1">
              <stop stopColor="#5b696d"/>
              <stop offset=".29" stopColor="#263138"/>
              <stop offset=".72" stopColor="#131d24"/>
              <stop offset="1" stopColor="#647479"/>
            </linearGradient>
            <linearGradient id="gauntlet-v131-energy" x1="0" y1="1" x2="1" y2="0">
              <stop stopColor="#206c80" stopOpacity=".03"/>
              <stop offset=".6" stopColor="#43f0e5" stopOpacity=".38"/>
              <stop offset="1" stopColor="#c7fff3" stopOpacity=".68"/>
            </linearGradient>
            <filter id="gauntlet-v131-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4"/>
            </filter>
          </defs>
          <path d="M4 274 64 190 149 154 236 143 303 156 334 223 265 281Z" fill="#1a252a" stroke="#6b786f" strokeWidth="5"/>
          <path d="M36 265 109 190 176 164 271 176 298 233 244 278Z" fill="url(#gauntlet-v131-metal)" stroke="#92a18f" strokeWidth="3"/>
          <path d="M50 265 120 210 233 186 268 228 210 272Z" fill="#28353a" stroke="#445f62" strokeWidth="4"/>
          <path d="M88 225 137 187 224 167 261 192 227 231 141 249Z" fill="#111f27" stroke="#83918b" strokeWidth="4"/>
          <path d="M97 220 154 200 221 186 237 197 211 222 145 237Z" fill="#2e4449" stroke="#8aa8a0" strokeWidth="2"/>
          <path d="M61 254 120 234 152 242 112 270M177 262 220 242 258 247" fill="none" stroke="#88938d" strokeWidth="5"/>
          <path d="M260 156 307 134 360 141 389 178 365 214 312 213 280 197Z" fill="url(#gauntlet-v131-metal)" stroke="#a3b6ac" strokeWidth="4"/>
          <path d="M287 158 317 148 354 154 371 180 349 201 315 197 296 181Z" fill="#101b21" stroke="#6fafa8" strokeWidth="3"/>
          <path d="M311 166 330 158 349 173 326 184Z" fill="#8ff8dc" opacity=".7"/>
          <path d="M324 183 342 178 353 189 333 193Z" fill="#4cd5cf"/>
          <path d="M285 162 302 154 310 169 295 178Z" fill="#b8f7d8"/>
          <path d="M359 140 389 122 407 148 393 170 376 163Z" fill="#52656a" stroke="#9cae9f" strokeWidth="3"/>
          <path d="M394 147 481 49 533 1 442 94Z" fill="url(#gauntlet-v131-energy)" filter="url(#gauntlet-v131-glow)"/>
          <path d="M393 149 480 49 532 1" fill="none" stroke="#85fff0" strokeWidth="2.5" strokeDasharray="5 7" opacity=".75"/>
          <path d="M398 137 420 98 442 94" fill="none" stroke="#8dfff1" strokeWidth="2"/>
          <circle cx="394" cy="145" r="10" fill="#65ffef" opacity=".45" filter="url(#gauntlet-v131-glow)"/>
          <circle cx="394" cy="145" r="4" fill="#d7fff5"/>
        </svg>
      </div>
      <div className={styles.projectionInfo}>
        <p className={styles.eyebrow}>COMMANDANT YAUTJA · PROJECTION DU GAUNTLET</p>
        <h3>{planetName}</h3>
        <p className={styles.routeInfo}>Départ : {departure} <span aria-hidden="true">◇</span> Destination : {destination}</p>
        <div className={styles.telemetry}>
          <span>Cycle <strong>{String(turn).padStart(2, "0")}</strong></span>
          <span>Contrôle <strong>{controlled}/{territories}</strong></span>
          <span>Ordres <strong>{queuedOrders}</strong></span>
        </div>
        <p className={styles.archiveState}>{pending ? "Transmission des archives…" : persisted ? "Archives locales confirmées" : "Front actif en mémoire"}</p>
      </div>
    </div>
    <div className={styles.mapWindow} data-testid="clan-war-shared-atlas-v131">
      <div className={styles.projectionLegend} aria-hidden={view === "classic"}>
        <span>CARTE DE CAMPAGNE HOLOGRAPHIQUE</span>
        <span>TRANSMISSION · {planetName} · TOUR {turn}</span>
      </div>
      {children}
    </div>
  </section>;
}
