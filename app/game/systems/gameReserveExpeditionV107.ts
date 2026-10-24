/** Original Vharuun route, explicitly selected as V3. Native art is reused;
 * these adult combatants are not the unrecovered H001–H100 character sheets. */
export const GAME_RESERVE_EXPEDITION_V107_WORLD = { width: 12800, height: 540, ground: 438, returnX: 115 } as const;
export const GAME_RESERVE_EXPEDITION_V107_SECTORS = [
  { id: "root-basin", name: "Bassin des Racines", left: 6400, right: 8000, atmosphere: "#235643", terrain: "Racines basses, couverts rapprochés et dépôts dispersés." },
  { id: "fallen-greenhouses", name: "Serres Renversées", left: 8000, right: 9600, atmosphere: "#41654c", terrain: "Étais industriels et plateforme haute au-dessus du circuit de fuite." },
  { id: "echo-quarry", name: "Carrière des Échos", left: 9600, right: 11200, atmosphere: "#635955", terrain: "Paliers de roche, longue vue dégagée et passages sous les corniches." },
  { id: "mist-quay", name: "Quai des Brumes", left: 11200, right: 12800, atmosphere: "#365464", terrain: "Rampe d’extraction, pontons étagés et poste oriental." },
] as const;
export const GAME_RESERVE_EXPEDITION_V107_PLATFORMS = [
  { x: 6510, y: 370, w: 210 }, { x: 6790, y: 302, w: 250 }, { x: 7150, y: 350, w: 310 }, { x: 7540, y: 365, w: 230 },
  { x: 8090, y: 365, w: 300 }, { x: 8490, y: 294, w: 260 }, { x: 8830, y: 226, w: 270 }, { x: 9190, y: 305, w: 290 },
  { x: 9760, y: 350, w: 220 }, { x: 10070, y: 270, w: 280 }, { x: 10430, y: 325, w: 320 }, { x: 10830, y: 365, w: 270 },
  { x: 11240, y: 375, w: 330 }, { x: 11670, y: 315, w: 210 }, { x: 11990, y: 365, w: 260 }, { x: 12330, y: 290, w: 260 },
] as const;
export const GAME_RESERVE_EXPEDITION_V107_COVER = [
  { x: 6570, w: 80, top: 360 }, { x: 7080, w: 115, top: 340 }, { x: 7740, w: 95, top: 350 },
  { x: 8230, w: 70, top: 355 }, { x: 8680, w: 85, top: 345 }, { x: 9400, w: 95, top: 350 },
  { x: 9660, w: 75, top: 360 }, { x: 10620, w: 80, top: 350 }, { x: 11110, w: 65, top: 365 },
  { x: 11470, w: 110, top: 345 }, { x: 12010, w: 90, top: 355 }, { x: 12640, w: 75, top: 350 },
] as const;
export interface GameReserveV107Tactics {
  sight: number; witnessRange: number; speed: number; carryingSpeed: number; repair: number; shotCooldown: number; windup: number;
}
export const GAME_RESERVE_EXPEDITION_V107_PEOPLE = [
  { id: "reserve-ilye", name: "Ilye", role: "leader", art: "marine", description: "Cheffe adulte d’une escorte fluviale armée d’un fusil. Se déplace vite et transmet ses observations aux alliés proches.", tactics: { sight: 355, witnessRange: 180, speed: 1.05, carryingSpeed: .72, repair: .6, shotCooldown: 125, windup: 24 } },
  { id: "reserve-darek", name: "Darek", role: "technician", art: "raider", description: "Électricien de campagne et combattant adulte au fusil. Répare très vite, mais progresse lentement en transportant une pièce.", tactics: { sight: 300, witnessRange: 125, speed: .86, carryingSpeed: .57, repair: 2.35, shotCooldown: 140, windup: 24 } },
  { id: "reserve-sava", name: "Sava", role: "marksman", art: "sniper", description: "Tireuse adulte d’une garde de digue. Observe loin et prépare un tir plus lent depuis les couloirs ouverts.", tactics: { sight: 490, witnessRange: 110, speed: .8, carryingSpeed: .6, repair: .35, shotCooldown: 165, windup: 24 } },
  { id: "reserve-lem", name: "Lem", role: "veteran", art: "marine", description: "Vétéran adulte d’extractions sous menace, fusil. Porte les composants rapidement et annonce son tir plus tôt.", tactics: { sight: 320, witnessRange: 145, speed: .92, carryingSpeed: .82, repair: .55, shotCooldown: 130, windup: 20 } },
  { id: "reserve-neme", name: "Neme", role: "leader", art: "raider", description: "Commandante adulte d’une escorte de carrière, fusil. Rassemble un large cercle de témoins avant de couvrir la rampe.", tactics: { sight: 340, witnessRange: 200, speed: .98, carryingSpeed: .7, repair: .65, shotCooldown: 115, windup: 24 } },
  { id: "reserve-rahel", name: "Rahel", role: "technician", art: "marine", description: "Mécanicienne adulte d’appareils de récupération et combattante au fusil. Rapporte les pièces sans abandonner sa capacité de réparation.", tactics: { sight: 310, witnessRange: 135, speed: 1, carryingSpeed: .75, repair: 1.8, shotCooldown: 145, windup: 22 } },
  { id: "reserve-varo", name: "Varo", role: "marksman", art: "sniper", description: "Sentinelle adulte de jetée, fusil de précision. Se replace plus vite, avec une portée d’observation moindre que Sava.", tactics: { sight: 400, witnessRange: 130, speed: 1.08, carryingSpeed: .68, repair: .4, shotCooldown: 135, windup: 22 } },
  { id: "reserve-eira", name: "Eira", role: "veteran", art: "raider", description: "Combattante adulte des convois frontaliers, fusil. Avance prudemment, porte lourd et contribue régulièrement aux réparations.", tactics: { sight: 335, witnessRange: 155, speed: .82, carryingSpeed: .77, repair: .85, shotCooldown: 120, windup: 24 } },
] as const;
export const GAME_RESERVE_EXPEDITION_V107_SUPPLIES = [6750, 7190, 7620, 8170, 8720, 9580, 10450, 11990] as const;
export const GAME_RESERVE_EXPEDITION_V107_SHIPS = [
  { id: "greenhouse-cargo", name: "Cargo des serres", x: 8940 },
  { id: "mist-quay-transport", name: "Transport du quai", x: 12280 },
] as const;
export const GAME_RESERVE_EXPEDITION_V107_SITES = [
  { id: "beacon-ridge", name: "Repères des Balises", x: 5840, y: 280, range: 30, ticks: 120, sector: 3, description: "Comparer les repères depuis le poste haut déjà présent." },
  { id: "root-transect", name: "Passage des racines", x: 7410, y: 438, range: 30, ticks: 120, sector: 4, description: "Consigner au sol le passage entre les deux couverts, sans arrêter les groupes humains." },
  { id: "greenhouse-signal", name: "Signal des serres", x: 8990, y: 226, range: 30, ticks: 120, sector: 5, description: "Atteindre le dernier étai et relever le signal au-dessus de la route de fuite." },
  { id: "eastern-quay", name: "Repère du quai oriental", x: 12420, y: 290, range: 30, ticks: 120, sector: 7, description: "Atteindre le poste oriental puis rapporter les quatre relevés à l’extraction de départ." },
] as const;
export interface GameReserveV107SiteRecord { recordedAt: number | null; hunterX: number | null; hunterY: number | null }
export interface GameReserveV107RouteRecord { siteRecords: GameReserveV107SiteRecord[] }
