import type { GameReserveV107Tactics, GameReserveV107RouteRecord } from "./gameReserveExpeditionV107";

/** Second original reserve. Existing native jungle art is shared, not new H001–H100 art. */
export const GAME_RESERVE_EXPEDITION_V108_WORLD = { width: 12800, height: 540, ground: 438, returnX: 115 } as const;
export const GAME_RESERVE_EXPEDITION_V108_SECTORS = [
  { id: "kesh-landfall", name: "Grève des Exilés", left: 0, right: 1600, atmosphere: "#47695c", terrain: "Branches basses et repli proche de l’extraction." },
  { id: "kesh-canopy", name: "Canopée des Guetteurs", left: 1600, right: 3200, atmosphere: "#314f39", terrain: "Route étagée au-dessus du premier transport." },
  { id: "kesh-sluices", name: "Écluses Envahies", left: 3200, right: 4800, atmosphere: "#426970", terrain: "Paliers industriels et couvertures alternées." },
  { id: "kesh-foundry", name: "Fonderie des Lianes", left: 4800, right: 6400, atmosphere: "#6c5446", terrain: "Étais hauts et accès à la seconde rampe." },
  { id: "kesh-fern-ravine", name: "Ravin des Fougères", left: 6400, right: 8000, atmosphere: "#3b674d", terrain: "Branches décalées et passages au sol sous le couvert." },
  { id: "kesh-broken-array", name: "Antennes Brisées", left: 8000, right: 9600, atmosphere: "#5d5d72", terrain: "Poste élevé dominant le troisième appareil." },
  { id: "kesh-root-vault", name: "Voûte des Racines", left: 9600, right: 11200, atmosphere: "#536447", terrain: "Longues traverses et descente abritée." },
  { id: "kesh-last-landing", name: "Débarcadère des Cendres", left: 11200, right: 12800, atmosphere: "#665d68", terrain: "Pontons étagés et dernière rampe de fuite." },
] as const;
export const GAME_RESERVE_EXPEDITION_V108_PLATFORMS = [
  { x: 300, y: 368, w: 230 }, { x: 630, y: 300, w: 270 }, { x: 1030, y: 350, w: 300 },
  { x: 1630, y: 360, w: 290 }, { x: 2030, y: 286, w: 260 }, { x: 2410, y: 220, w: 300 }, { x: 2830, y: 310, w: 280 },
  { x: 3270, y: 372, w: 260 }, { x: 3640, y: 310, w: 300 }, { x: 4070, y: 350, w: 290 }, { x: 4490, y: 280, w: 260 },
  { x: 4860, y: 365, w: 280 }, { x: 5250, y: 295, w: 270 }, { x: 5650, y: 230, w: 300 }, { x: 6060, y: 320, w: 270 },
  { x: 6510, y: 375, w: 240 }, { x: 6860, y: 310, w: 320 }, { x: 7300, y: 350, w: 280 }, { x: 7680, y: 285, w: 250 },
  { x: 8090, y: 365, w: 260 }, { x: 8470, y: 290, w: 280 }, { x: 8880, y: 225, w: 280 }, { x: 9270, y: 315, w: 280 },
  { x: 9700, y: 370, w: 340 }, { x: 10150, y: 305, w: 310 }, { x: 10570, y: 350, w: 320 },
  { x: 11210, y: 370, w: 300 }, { x: 11620, y: 300, w: 260 }, { x: 12000, y: 355, w: 260 }, { x: 12370, y: 280, w: 270 },
] as const;
export const GAME_RESERVE_EXPEDITION_V108_COVER = [
  { x: 450, w: 85, top: 350 }, { x: 1180, w: 90, top: 345 },
  { x: 1740, w: 80, top: 355 }, { x: 2690, w: 105, top: 340 },
  { x: 3390, w: 90, top: 355 }, { x: 4230, w: 85, top: 350 },
  { x: 4980, w: 75, top: 350 }, { x: 5880, w: 95, top: 345 },
  { x: 6650, w: 110, top: 350 }, { x: 7490, w: 90, top: 345 },
  { x: 8250, w: 80, top: 355 }, { x: 9060, w: 90, top: 345 },
  { x: 9870, w: 100, top: 350 }, { x: 10740, w: 95, top: 345 },
  { x: 11390, w: 90, top: 350 }, { x: 12570, w: 85, top: 350 },
] as const;
export const GAME_RESERVE_EXPEDITION_V108_SUPPLIES = [650, 1020, 1530, 1960, 3670, 4060, 4510, 4930, 6870, 7290, 7740, 8160, 10080, 10510, 11030, 11450] as const;
export const GAME_RESERVE_EXPEDITION_V108_SHIPS = [
  { id: "kesh-canopy-cargo", name: "Cargo de la canopée", x: 2700 },
  { id: "kesh-foundry-shuttle", name: "Navette de la fonderie", x: 5850 },
  { id: "kesh-array-transport", name: "Transport des antennes", x: 9080 },
  { id: "kesh-ash-skiff", name: "Skiff des cendres", x: 12320 },
] as const;
export const GAME_RESERVE_EXPEDITION_V108_SITES = [
  { id: "kesh-canopy-record", name: "Vue de la canopée", x: 2550, y: 220, range: 30, ticks: 120, sector: 1, description: "Atteindre la troisième branche au-dessus du premier appareil." },
  { id: "kesh-foundry-record", name: "Relevé de la fonderie", x: 5790, y: 230, range: 30, ticks: 120, sector: 3, description: "Remonter les étais sans couper par les décors de fond." },
  { id: "kesh-array-record", name: "Repères des antennes", x: 9010, y: 225, range: 30, ticks: 120, sector: 5, description: "Rejoindre le poste haut pendant que les équipes réparent au sol." },
  { id: "kesh-ash-record", name: "Notes du débarcadère", x: 12480, y: 280, range: 30, ticks: 120, sector: 7, description: "Relever le ponton oriental puis revenir par les huit secteurs." },
] as const;
export type GameReserveV108RouteRecord = GameReserveV107RouteRecord;
export type GameReserveV108Behavior = "carrier-escort" | "ramp-defender" | "cover-observer";
const tactics = (sight: number, speed: number, repair: number, shotCooldown: number, witnessRange: number): GameReserveV107Tactics => ({ sight, speed, carryingSpeed: speed * .72, repair, shotCooldown, witnessRange, windup: 24 });
/** Adult armed originals with four role slots per group and actual different work decisions. */
export const GAME_RESERVE_EXPEDITION_V108_PEOPLE = [
  { id: "kesh-aysen", name: "Aysen", role: "leader", art: "marine", behavior: "carrier-escort", description: "Adulte armée d’un fusil. Escorte un porteur proche au lieu de chercher un second lot.", tactics: tactics(350, 1.04, .55, 125, 190) },
  { id: "kesh-branek", name: "Branek", role: "technician", art: "raider", description: "Mécanicien adulte armé. Apporte les lots puis répare le cargo sous la protection de son équipe.", tactics: tactics(290, .93, 2.4, 145, 125) },
  { id: "kesh-celka", name: "Celka", role: "marksman", art: "sniper", behavior: "cover-observer", observationX: 2660, description: "Tireuse adulte armée. Se poste au bord des fougères pour observer les approches sans voir à travers elles.", tactics: tactics(480, .86, .35, 165, 165) },
  { id: "kesh-dorun", name: "Dorun", role: "veteran", art: "marine", behavior: "ramp-defender", description: "Vétéran adulte armé. Garde l’accès du cargo dès le premier lot et embarque après le démarrage.", tactics: tactics(330, .87, .7, 120, 140) },
  { id: "kesh-elva", name: "Elva", role: "leader", art: "raider", behavior: "carrier-escort", description: "Cheffe d’escorte adulte armée. Suit les porteurs locaux et reprend la collecte si aucun n’est proche.", tactics: tactics(335, 1.08, .65, 130, 200) },
  { id: "kesh-farek", name: "Farek", role: "technician", art: "marine", description: "Sapeur adulte armé. Transporte ses composants à pied et peut terminer seul le circuit.", tactics: tactics(310, .98, 2.1, 140, 130) },
  { id: "kesh-gavra", name: "Gavra", role: "marksman", art: "sniper", behavior: "cover-observer", observationX: 5845, description: "Observatrice adulte armée. Défend la lisière de la fonderie depuis un poste fixe proche du couvert.", tactics: tactics(455, .9, .4, 150, 155) },
  { id: "kesh-helen", name: "Helen", role: "veteran", art: "raider", behavior: "ramp-defender", description: "Combattante adulte armée. Protège la rampe et reprend les réparations si elle reste seule.", tactics: tactics(345, .82, .8, 115, 145) },
  { id: "kesh-iskar", name: "Iskar", role: "leader", art: "marine", behavior: "carrier-escort", description: "Chef adulte armé. Accompagne un allié portant réellement un composant vers le transport.", tactics: tactics(360, 1.02, .6, 120, 180) },
  { id: "kesh-jareh", name: "Jareh", role: "technician", art: "raider", description: "Technicien adulte armé. Assure le ravitaillement et la remise en route du transport des antennes.", tactics: tactics(305, .9, 2.3, 150, 135) },
  { id: "kesh-kovra", name: "Kovra", role: "marksman", art: "sniper", behavior: "cover-observer", observationX: 9025, description: "Sentinelle adulte armée. Attend au bord du couvert ; ses tirs visent seulement une dernière observation locale.", tactics: tactics(495, .81, .3, 170, 170) },
  { id: "kesh-liren", name: "Liren", role: "veteran", art: "marine", behavior: "ramp-defender", description: "Vétéran adulte armé. Défend la rampe des antennes avant de marcher jusqu’à l’embarquement.", tactics: tactics(325, .89, .75, 125, 150) },
  { id: "kesh-mavik", name: "Mavik", role: "leader", art: "raider", behavior: "carrier-escort", description: "Chef de groupe adulte armé. Escorte les porteurs du débarcadère et cesse cette tâche sous une menace observée.", tactics: tactics(340, 1.1, .5, 135, 210) },
  { id: "kesh-nyrel", name: "Nyrel", role: "technician", art: "marine", description: "Mécanicienne adulte armée. Rapporte les composants et répare le skiff sans inventaire distant.", tactics: tactics(315, .95, 2.2, 155, 140) },
  { id: "kesh-ovek", name: "Ovek", role: "marksman", art: "sniper", behavior: "cover-observer", observationX: 12540, description: "Tireur adulte armé. Couvre le dernier appareil depuis les fougères et doit rejoindre physiquement sa rampe.", tactics: tactics(470, .84, .45, 160, 160) },
  { id: "kesh-pelya", name: "Pelya", role: "veteran", art: "raider", behavior: "ramp-defender", description: "Vétérane adulte armée. Tient l’accès oriental puis embarque au sol ; la perte de ses alliés la rend à la réparation.", tactics: tactics(355, .85, .85, 110, 155) },
] as const;
