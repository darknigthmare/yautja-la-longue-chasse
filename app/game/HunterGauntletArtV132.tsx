"use client";

import { useId } from "react";
import { GAUNTLET_PALETTES_V132, type GauntletDefinitionV132 } from "./systems/clanWarGauntletCatalogV132";

/** Authored vector *blockout*, not a claimed photographic 1:1 replica.
 * JH references: 1987 hinged left wrist computer / red glyph strip.
 * Deliberately separate shell families for Feral and Badlands, not a JH recolor. */
export default function HunterGauntletArtV132({ entry, coverOpen = true }: { entry: GauntletDefinitionV132; coverOpen?: boolean }) {
  const uid = "gauntlet-v133-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const p=GAUNTLET_PALETTES_V132[entry.theme];
  const profile = entry.id === "jungle-hunter" || entry.id === "captured-classic" ? "jungle" :
    entry.id === "city-hunter" ? "city" : entry.theme === "feral" ? "feral" :
    entry.theme === "badlands" ? "badlands" : "placeholder";
  return <svg data-testid="gauntlet-vector-v132" data-model={entry.id}
    data-art-validation="blockout-awaiting-source-review" data-cover-open={coverOpen} viewBox="0 0 540 290" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${uid}-armour`} x1="0" y1="0" x2="1" y2=".9">
        <stop stopColor={p.bevel}/><stop offset=".16" stopColor={p.metal}/>
        <stop offset=".58" stopColor="#11171c"/><stop offset="1" stopColor={p.bevel}/>
      </linearGradient>
      <linearGradient id={`${uid}-metal-shadow`} x1=".2" y1="0" x2=".8" y2="1">
        <stop stopColor={p.metal}/><stop offset=".55" stopColor="#151a20"/><stop offset="1" stopColor={p.bevel}/>
      </linearGradient>
      <linearGradient id={`${uid}-projection`} x1="0" y1="1" x2="1" y2="0">
        <stop stopColor={p.accent} stopOpacity=".12"/>
        <stop offset=".56" stopColor={p.accent} stopOpacity=".42"/>
        <stop offset="1" stopColor={p.secondary} stopOpacity=".01"/>
      </linearGradient>
      <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    {/* Exposed wrist and arm silhouette, separated from the command housing. */}
    <path d="M0 267 64 220 107 175 177 139 270 124 361 162 412 207 336 278 123 290Z"
      fill="#4b5146" stroke="#1f2925" strokeWidth="6"/>
    <path d="M12 278 111 191 198 154 303 160 362 221 300 288Z"
      fill="#393f36" stroke="#687366" strokeWidth="5"/>
    <g opacity=".39" fill="none" stroke="#222a29" strokeWidth="3">
      <path d="M35 280 132 191 213 167M69 286 157 205 246 179M95 290 174 223 278 199"/>
    </g>
    <path d="M7 267 104 204 160 176 196 193 125 265 93 289 14 289Z"
      fill={`url(#${uid}-armour)`}` stroke={p.bevel} strokeWidth="4"/>
    <path d="M19 261 90 225 141 203M31 275 115 238 153 220M61 286 127 261" fill="none"
      stroke="#89958a" strokeWidth="3" opacity=".8"/>
    <path d="M95 217 120 191 132 230 103 260Z" fill="#131d22" stroke={p.bevel} strokeWidth="4"/>
    <path d="M113 198 132 187 148 225 126 246Z" fill="#465458" stroke="#8b9386" strokeWidth="2"/>
    {/* Raised left-arm computer as a long hinged wedge, in contrast to the wrist blade on the OTHER arm. */}
    <g transform="translate(0 -3) rotate(-8 264 151)">
      <path d="M150 107 185 69 376 67 435 105 420 224 194 221 145 185Z"
        fill={`url(#${uid}-metal-shadow)`}` stroke={p.bevel} strokeWidth="6"/>
      <path d="M157 116 196 83 380 83 417 115 404 212 194 207 158 181Z"
        fill={`url(#${uid}-armour)`}` stroke="#18252b" strokeWidth="5"/>
      <path d="M177 101 194 91 195 202 173 183Z" fill="#111a1d" stroke={p.bevel} strokeWidth="2.5"/>
      <path d="M390 91 413 112 401 196 384 204Z" fill="#263038" stroke="#8b9290" strokeWidth="2"/>
      {[0,1,2,3,4].map(i=><g key={i}>
        <path d={`M${178+i*40} 77l7 -17 13 3 3 18Z`} fill="#222b31" stroke={p.bevel} strokeWidth="2"/>
        <path d={`M${188+i*40} 213l-3 14 20 -2 7 -13Z`} fill="#27343a" stroke={p.bevel} strokeWidth="2"/>
      </g>)}
      {/* Source-inspired JH red alien glyph cells. These are original abstract symbols, not copied canon typography. */}
      {profile==="feral" ? <>
        <path d="M199 123 227 101 262 111 291 100 333 119 371 115 393 142 360 183 318 191 272 169 234 193 203 173Z"
          fill="#4d4235" stroke="#a89578" strokeWidth="5"/>
        <path d="M202 129 229 118 245 160 269 119 287 161 306 126 328 164 349 131 366 164 382 136"
          fill="none" stroke="#d9c69e" strokeWidth="5"/>
        <path d="M239 136 337 141" stroke={p.display} strokeWidth="3" strokeDasharray="4 13"/>
      </> : profile==="badlands" ? <>
        <path d="M193 112 372 108 384 130 367 193 195 184Z" fill="#45352e" stroke="#d5ac77" strokeWidth="4"/>
        {[0,1,2,3].map(i=><path key={i} d={`M${214+i*41} 116q-17 27 3 58l17 -8q9 -24 -3 -46Z`}
          fill="none" stroke="#c7a277" strokeWidth="3"/>)}
        <path d="M203 146 365 146M211 168 358 168" stroke="#af7565" strokeWidth="2" strokeDasharray="4 5"/>
        <circle cx="288" cy="145" r="13" fill="#311e23" stroke={p.display} strokeWidth="3"/>
        <circle cx="288" cy="145" r="5" fill={p.display}/>
      </> : <>
        {/* Reference correction V133: five rows of red LED glyph cells, NEVER five long vertical columns. */}
        <rect data-jungle-glyph-panel="five-horizontal-rows" x="191" y="96" width="91" height="110" rx={profile==="city"?3:1}
          fill="#060c0f" stroke="#7f8a89" strokeWidth="3"/>
        {Array.from({length:5},(_,i)=><g key={i} transform={`translate(198 ${102+i*20})`}>
          <rect width="76" height="18" fill="#040808" stroke="#34383a" strokeWidth="1"/>
          <path d={i%3===0?"M6 5 18 9 31 3M40 13 52 4 67 8":
            i%3===1?"M8 13 21 5 30 10M37 4 51 13 66 6":
            "M8 6 19 14 33 7M42 11 54 4 65 12"} fill="none" stroke={p.display}
            strokeWidth="5" strokeLinecap="square" opacity=".64" filter={`url(#${uid}-glow)`}/>
          <path d={i%3===0?"M6 5 18 9 31 3M40 13 52 4 67 8":
            i%3===1?"M8 13 21 5 30 10M37 4 51 13 66 6":
            "M8 6 19 14 33 7M42 11 54 4 65 12"} fill="none" stroke={p.display}
            strokeWidth="3.3" strokeLinecap="square"/>
        </g>)}
        {/* Metal hinge line and ribbed cover: same physical panel stays visible when opened. */}
        <path d="M281 95L285 205" stroke="#9ca3a1" strokeWidth="5"/>
        <g data-cover-position={coverOpen?"open":"closed"}
          style={{transform:coverOpen?"translateX(0px)":"translateX(-100px)",transition:"transform 0.36s ease-out"}}>
          <path d="M290 96 372 91 387 114 376 201 290 207Z" fill="#263039" stroke={p.bevel} strokeWidth="4"/>
          <path d="M299 110 364 105 373 124 364 187 298 193Z" fill="#1b262b" stroke="#647276" strokeWidth="2"/>
          {[0,1,2,3].map(i=><path key={i} d={`M${304+i*17} 112l-7 74`} fill="none" stroke="#6d7777" strokeWidth="3"/>)}
          <path d="M302 100 365 97M296 197 368 192" fill="none" stroke="#a6aaa2" strokeWidth="2"/>
          <circle cx="361" cy="118" r="4.5" fill="#182429" stroke={p.bevel} strokeWidth="2"/>
          <circle cx="309" cy="180" r="4" fill="#182429" stroke={p.bevel} strokeWidth="2"/>
        </g>
        <path d="M204 94 352 94M205 195 363 195" stroke={p.bevel} strokeWidth="3"/>
      </>}
      <path d="M374 85 405 112 391 199 376 211" fill="none" stroke="#a4a8a0" strokeWidth="2.3"/>
      <circle cx="398" cy="121" r="6" fill="#212f31" stroke={p.bevel} strokeWidth="3"/>
      <circle cx="389" cy="190" r="5" fill="#212f31" stroke={p.bevel} strokeWidth="3"/>
    </g>
    <path d="M401 109 427 93 447 123 437 157 421 170 410 143Z" fill="#252e30" stroke={p.bevel} strokeWidth="4"/>
    <path d="M431 102 479 59 522 0 467 105 445 130Z" fill={`url(#${uid}-projection)`}` filter={`url(#${uid}-glow)`}` opacity=".74"/>
    <path d="M429 115 473 62 522 1" fill="none" stroke={p.accent} strokeWidth="2" strokeDasharray="5 6"/>
    <circle cx="429" cy="113" r="11" fill={p.accent} opacity=".45" filter={`url(#${uid}-glow)`}/>
    <circle cx="429" cy="113" r="4" fill={p.secondary}/>
  </svg>;
}
