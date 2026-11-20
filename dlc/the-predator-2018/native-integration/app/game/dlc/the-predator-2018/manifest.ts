/* THE_PREDATOR_2018_NATIVE_BRIDGE */
export const THE_PREDATOR_2018_DLC = {
  "id": "the-predator-2018",
  "version": "0.5.0-candidate.1",
  "protocol": 2,
  "publicRoute": "/dlc/the-predator-2018",
  "standaloneAsset": "/dlc/the-predator-2018/index.html",
  "saveKey": "yautja.dlc.the-predator-2018.v5",
  "hostMirrorKey": "yautja.dlc.the-predator-2018.host-mirror.v5",
  "campaigns": {
    "human": 26,
    "predator": 26
  },
  "microZones": 183,
  "usesHostCampaignSlots": false,
  "usesHostHuntCanvas": false,
  "nativeEventBridge": true,
  "hostCommandBridge": true,
  "hostAssetReferences": 7,
  "systems": {
    "objectiveChains": true,
    "reinforcementWaves": true,
    "enemyRoles": true,
    "squadOrders": true,
    "humanCohesion": true,
    "predatorMomentum": true,
    "mirrorEventMastery": true,
    "bossTelegraphs": true
  },
  "scenes": [
    {
      "id": "H01",
      "campaign": "human",
      "event": "E01",
      "act": "ACTE I · LE FUGITIF",
      "title": "Mission au Mexique",
      "actor": "Quinn McKenna",
      "location": "mexico",
      "goal": "reach",
      "route": 3,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "mud",
        "roots",
        "smoke"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H02",
      "campaign": "human",
      "event": "E02",
      "act": "ACTE I · LE FUGITIF",
      "title": "L’objet tombé du ciel",
      "actor": "Quinn McKenna",
      "location": "crash",
      "goal": "scan",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "debris",
        "fire",
        "sparks"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H03",
      "campaign": "human",
      "event": "E03",
      "act": "ACTE I · LE FUGITIF",
      "title": "Premier contact",
      "actor": "Quinn McKenna",
      "location": "crash",
      "goal": "survive",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "debris",
        "fire",
        "sparks"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H04",
      "campaign": "human",
      "event": "E04",
      "act": "ACTE I · LE FUGITIF",
      "title": "Faire sortir la preuve",
      "actor": "Quinn McKenna",
      "location": "bar",
      "goal": "interact",
      "route": 3,
      "encounters": [
        "interaction",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "debris",
        "smoke",
        "traffic"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H05",
      "campaign": "human",
      "event": "E05",
      "act": "ACTE I · LE FUGITIF",
      "title": "Le colis de Rory",
      "actor": "Rory McKenna",
      "location": "basement",
      "goal": "scan",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "darkness",
        "glass",
        "tight-space"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H06",
      "campaign": "human",
      "event": "E06",
      "act": "ACTE I · LE FUGITIF",
      "title": "Projet Stargazer",
      "actor": "Casey Bracket",
      "location": "lab",
      "goal": "scan",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "glass",
        "sparks",
        "steam"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H07",
      "campaign": "human",
      "event": "E07",
      "act": "ACTE I · LE FUGITIF",
      "title": "Réveil impossible",
      "actor": "Casey Bracket",
      "location": "lab",
      "goal": "stealth",
      "route": 3,
      "encounters": [
        "lockdown",
        "stealth"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "glass",
        "sparks",
        "steam"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H08",
      "campaign": "human",
      "event": "E08",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Le bus des Loonies",
      "actor": "Quinn McKenna",
      "location": "bus",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "debris",
        "smoke",
        "traffic"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H09",
      "campaign": "human",
      "event": "E09",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Retour chez les McKenna",
      "actor": "Quinn McKenna",
      "location": "home",
      "goal": "reach",
      "route": 3,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "darkness",
        "smoke",
        "vehicles"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H10",
      "campaign": "human",
      "event": "E10",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Halloween",
      "actor": "Rory McKenna",
      "location": "halloween",
      "goal": "reach",
      "route": 3,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "crowd",
        "darkness",
        "fire"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H11",
      "campaign": "human",
      "event": "E11",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Les Predator Hounds",
      "actor": "Quinn McKenna",
      "location": "halloween",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "crowd",
        "darkness",
        "fire"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H12",
      "campaign": "human",
      "event": "E12",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Le toit de l’école",
      "actor": "Quinn McKenna",
      "location": "school",
      "goal": "defend",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "debris",
        "sprinklers"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H13",
      "campaign": "human",
      "event": "E13",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Rendre le gant",
      "actor": "Quinn McKenna",
      "location": "school",
      "goal": "interact",
      "route": 3,
      "encounters": [
        "interaction",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "darkness",
        "debris",
        "sprinklers"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H14",
      "campaign": "human",
      "event": "E14",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Deux chasseurs",
      "actor": "Quinn McKenna",
      "location": "school",
      "goal": "survive",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "debris",
        "sprinklers"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H15",
      "campaign": "human",
      "event": "E15",
      "act": "ACTE III · L’UPGRADE",
      "title": "La grange",
      "actor": "Casey Bracket",
      "location": "barn",
      "goal": "scan",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "fire",
        "hay",
        "tight-space"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H16",
      "campaign": "human",
      "event": "E16",
      "act": "ACTE III · L’UPGRADE",
      "title": "Captifs de Traeger",
      "actor": "Quinn McKenna",
      "location": "barn",
      "goal": "defend",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "fire",
        "hay",
        "tight-space"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H17",
      "campaign": "human",
      "event": "E17",
      "act": "ACTE III · L’UPGRADE",
      "title": "Évasion et poursuite",
      "actor": "Quinn McKenna",
      "location": "stargazer",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "glass",
        "sparks",
        "steam"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H18",
      "campaign": "human",
      "event": "E18",
      "act": "ACTE III · L’UPGRADE",
      "title": "La clairière du vaisseau",
      "actor": "Lynch",
      "location": "ark",
      "goal": "defend",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "mud",
        "roots",
        "smoke"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H19",
      "campaign": "human",
      "event": "E19",
      "act": "ACTE III · L’UPGRADE",
      "title": "Sept minutes trente",
      "actor": "Quinn McKenna",
      "location": "ark",
      "goal": "reach",
      "route": 3,
      "encounters": [
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "mud",
        "roots",
        "smoke"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H20",
      "campaign": "human",
      "event": "E20",
      "act": "ACTE III · L’UPGRADE",
      "title": "Piège nocturne",
      "actor": "Casey Bracket",
      "location": "hunt",
      "goal": "defend",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "fog",
        "roots"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H21",
      "campaign": "human",
      "event": "E21",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Les derniers des Loonies",
      "actor": "Quinn McKenna",
      "location": "hunt",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "darkness",
        "fog",
        "roots"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H22",
      "campaign": "human",
      "event": "E22",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "La cible : Rory",
      "actor": "Quinn McKenna",
      "location": "hunt",
      "goal": "survive",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "fog",
        "roots"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H23",
      "campaign": "human",
      "event": "E23",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Sur la coque",
      "actor": "Quinn McKenna",
      "location": "upgrade_ship",
      "goal": "survive",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "debris",
        "low-gravity",
        "sparks"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H24",
      "campaign": "human",
      "event": "E24",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Crash dans le marécage",
      "actor": "Quinn McKenna",
      "location": "swamp",
      "goal": "boss",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "fog",
        "mud",
        "water"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H25",
      "campaign": "human",
      "event": "E25",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Ceux qui restent",
      "actor": "Quinn McKenna",
      "location": "swamp",
      "goal": "interact",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "fog",
        "mud",
        "water"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "H26",
      "campaign": "human",
      "event": "E26",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Le Predator Killer",
      "actor": "Quinn McKenna",
      "location": "epilogue",
      "goal": "scan",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "glass",
        "sparks",
        "steam"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P01",
      "campaign": "predator",
      "event": "E00",
      "act": "ACTE I · LE FUGITIF",
      "title": "Traqué en orbite",
      "actor": "Fugitive Predator",
      "location": "orbit",
      "goal": "survive",
      "route": 3,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "debris",
        "low-gravity",
        "vacuum-alert"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P02",
      "campaign": "predator",
      "event": "E01",
      "act": "ACTE I · LE FUGITIF",
      "title": "Entrée atmosphérique",
      "actor": "Fugitive Predator",
      "location": "orbit",
      "goal": "reach",
      "route": 3,
      "encounters": [
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "debris",
        "low-gravity",
        "vacuum-alert"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P03",
      "campaign": "predator",
      "event": "E02",
      "act": "ACTE I · LE FUGITIF",
      "title": "Sortir de l’épave",
      "actor": "Fugitive Predator",
      "location": "crash",
      "goal": "reach",
      "route": 3,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "debris",
        "fire",
        "sparks"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P04",
      "campaign": "predator",
      "event": "E03",
      "act": "ACTE I · LE FUGITIF",
      "title": "Le soldat au gant",
      "actor": "Fugitive Predator",
      "location": "crash",
      "goal": "scripted-loss",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "debris",
        "fire",
        "sparks"
      ],
      "canonicalOutcomeLocked": true
    },
    {
      "id": "P05",
      "campaign": "predator",
      "event": "E06",
      "act": "ACTE I · LE FUGITIF",
      "title": "Réveil en laboratoire",
      "actor": "Fugitive Predator",
      "location": "lab",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "glass",
        "sparks",
        "steam"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P06",
      "campaign": "predator",
      "event": "E07",
      "act": "ACTE I · LE FUGITIF",
      "title": "La biologiste désarmée",
      "actor": "Fugitive Predator",
      "location": "lab",
      "goal": "stealth",
      "route": 3,
      "encounters": [
        "lockdown",
        "stealth"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "glass",
        "sparks",
        "steam"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P07",
      "campaign": "predator",
      "event": "E07",
      "act": "ACTE I · LE FUGITIF",
      "title": "Armes de fortune",
      "actor": "Fugitive Predator",
      "location": "lab",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "glass",
        "sparks",
        "steam"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P08",
      "campaign": "predator",
      "event": "E08",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Le masque à distance",
      "actor": "Fugitive Predator",
      "location": "lab",
      "goal": "scan",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "glass",
        "sparks",
        "steam"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P09",
      "campaign": "predator",
      "event": "E09",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Poursuite terrestre",
      "actor": "Fugitive Predator",
      "location": "transport",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "debris",
        "smoke",
        "traffic"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P10",
      "campaign": "predator",
      "event": "E12",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Sur le toit du véhicule",
      "actor": "Fugitive Predator",
      "location": "school",
      "goal": "defend",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "debris",
        "sprinklers"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P11",
      "campaign": "predator",
      "event": "E13",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Récupération du gant",
      "actor": "Fugitive Predator",
      "location": "school",
      "goal": "interact",
      "route": 3,
      "encounters": [
        "interaction",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "darkness",
        "debris",
        "sprinklers"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P12",
      "campaign": "predator",
      "event": "E14",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Le traître et l’Upgrade",
      "actor": "Fugitive Predator",
      "location": "school",
      "goal": "scripted-loss",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "debris",
        "sprinklers"
      ],
      "canonicalOutcomeLocked": true
    },
    {
      "id": "P13",
      "campaign": "predator",
      "event": "E05",
      "act": "ACTE I · LE FUGITIF",
      "title": "Arrivée du chasseur amélioré",
      "actor": "Upgrade Predator",
      "location": "orbit",
      "goal": "defend",
      "route": 3,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "debris",
        "low-gravity",
        "vacuum-alert"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P14",
      "campaign": "predator",
      "event": "E10",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Lâcher les hounds",
      "actor": "Upgrade Predator",
      "location": "halloween",
      "goal": "interact",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "crowd",
        "darkness",
        "fire"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P15",
      "campaign": "predator",
      "event": "E14",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Exécution du Fugitive",
      "actor": "Upgrade Predator",
      "location": "school",
      "goal": "boss",
      "route": 5,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "debris",
        "sprinklers"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P16",
      "campaign": "predator",
      "event": "E14",
      "act": "ACTE II · CHASSE CROISÉE",
      "title": "Message au clan",
      "actor": "Upgrade Predator",
      "location": "school",
      "goal": "scan",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "darkness",
        "debris",
        "sprinklers"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P17",
      "campaign": "predator",
      "event": "E15",
      "act": "ACTE III · L’UPGRADE",
      "title": "Maison McKenna",
      "actor": "Upgrade Predator",
      "location": "basement",
      "goal": "scan",
      "route": 3,
      "encounters": [
        "interaction",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "darkness",
        "glass",
        "tight-space"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P18",
      "campaign": "predator",
      "event": "E17",
      "act": "ACTE III · L’UPGRADE",
      "title": "Vers la cargaison",
      "actor": "Upgrade Predator",
      "location": "hunt",
      "goal": "stealth",
      "route": 3,
      "encounters": [
        "lockdown",
        "stealth"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "fog",
        "roots"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P19",
      "campaign": "predator",
      "event": "E18",
      "act": "ACTE III · L’UPGRADE",
      "title": "Attaque de la clairière",
      "actor": "Upgrade Predator",
      "location": "ark",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "mud",
        "roots",
        "smoke"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P20",
      "campaign": "predator",
      "event": "E19",
      "act": "ACTE III · L’UPGRADE",
      "title": "Détruire le vaisseau",
      "actor": "Upgrade Predator",
      "location": "ark",
      "goal": "interact",
      "route": 3,
      "encounters": [
        "interaction",
        "traverse"
      ],
      "reinforcementWaves": 0,
      "hazards": [
        "mud",
        "roots",
        "smoke"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P21",
      "campaign": "predator",
      "event": "E20",
      "act": "ACTE III · L’UPGRADE",
      "title": "La vraie proie",
      "actor": "Upgrade Predator",
      "location": "hunt",
      "goal": "defend",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "darkness",
        "fog",
        "roots"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P22",
      "campaign": "predator",
      "event": "E21",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Nettoyer le terrain",
      "actor": "Upgrade Predator",
      "location": "hunt",
      "goal": "kill",
      "route": 4,
      "encounters": [
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 2,
      "hazards": [
        "darkness",
        "fog",
        "roots"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P23",
      "campaign": "predator",
      "event": "E22",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Prendre Rory",
      "actor": "Upgrade Predator",
      "location": "hunt",
      "goal": "interact",
      "route": 3,
      "encounters": [
        "interaction",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 1,
      "hazards": [
        "darkness",
        "fog",
        "roots"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P24",
      "campaign": "predator",
      "event": "E23",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Décollage",
      "actor": "Upgrade Predator",
      "location": "upgrade_ship",
      "goal": "defend",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "debris",
        "low-gravity",
        "sparks"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P25",
      "campaign": "predator",
      "event": "E24",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Impact",
      "actor": "Upgrade Predator",
      "location": "swamp",
      "goal": "survive",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "fog",
        "mud",
        "water"
      ],
      "canonicalOutcomeLocked": false
    },
    {
      "id": "P26",
      "campaign": "predator",
      "event": "E24",
      "act": "ACTE IV · DERNIÈRE TRAQUE",
      "title": "Dernière résistance",
      "actor": "Upgrade Predator",
      "location": "swamp",
      "goal": "scripted-loss",
      "route": 4,
      "encounters": [
        "defense",
        "lockdown",
        "traverse"
      ],
      "reinforcementWaves": 3,
      "hazards": [
        "fog",
        "mud",
        "water"
      ],
      "canonicalOutcomeLocked": true
    }
  ]
} as const;

export type ThePredator2018DlcManifest = typeof THE_PREDATOR_2018_DLC;
