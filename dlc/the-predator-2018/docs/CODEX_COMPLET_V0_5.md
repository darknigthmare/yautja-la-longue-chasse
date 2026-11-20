# CODEX COMPLET — THE PREDATOR : CHASSE CROISÉE v0.5

## Synthèse
- 52 scènes (26 + 26)
- 183 micro-zones
- 18 lieux
- 27 événements miroir
- Rencontres : traverse=93, lockdown=52, interaction=15, defense=17, stealth=6
- Défis secondaires : no-alert=39, collect-cache=31, no-damage=30, observe=15, fast-clear=35, clear-threats=33

## Doctrine de fidélité
La chronologie, les rôles, l’équipement structurant et les issues imposées du montage cinéma restent verrouillés. Les dialogues de jeu et raccords nécessaires au gameplay sont originaux. Les scènes supprimées restent dans le backlog séparé. Les visuels sont des créations procédurales/provisoires, pas des photogrammes redistribués.

## CAMPAGNE HUMAINS

### H01 · E01 · Mission au Mexique
**Acteur :** Quinn McKenna  
**Lieu :** Mexique · zone de sauvetage  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `reach`  
**Arme/kit principal :** `sniper`  
**Briefing :** Progresser avec l’unité vers les otages. La mission bascule lorsqu’un appareil extraterrestre traverse le ciel.  
**Issue :** Le vaisseau du Fugitive chute dans la jungle.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H01-R1 — Ravin d’approche | traverse | advance | 1 | 0 | roots | no-alert | non | 1 |
| H01-R2 — Camp de la mission | lockdown | neutralize → secure | 1 | 1 | smoke | collect-cache | oui | 2 |
| H01-R3 — Lisière de la zone d’impact | traverse | advance | 1 | 0 | mud | no-alert | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H02 · E02 · L’objet tombé du ciel
**Acteur :** Quinn McKenna  
**Lieu :** Mexique · site du crash  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `scan`  
**Arme/kit principal :** `rifle`  
**Briefing :** Inspecter la trajectoire de l’appareil et atteindre l’épave avant les renforts.  
**Issue :** Quinn découvre un biomask et un gant Yautja.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H02-R1 — Tranchée d’impact | traverse | advance | 0 | 0 | fire | no-alert | non | 1 |
| H02-R2 — Débris extérieurs | traverse | advance | 0 | 0 | sparks | no-damage | oui | 1 |
| H02-R3 — Épave ouverte | interaction | approach → operate | 0 | 0 | debris | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H03 · E03 · Premier contact
**Acteur :** Quinn McKenna  
**Lieu :** Mexique · site du crash  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `survive`  
**Arme/kit principal :** `gauntlet`  
**Briefing :** Tenir face au Fugitive et protéger la preuve. Le gant récupéré devient involontairement une arme.  
**Issue :** Le Fugitive est momentanément neutralisé ; Quinn peut s’échapper.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H03-R1 — Tranchée d’impact | traverse | advance | 1 | 0 | sparks | no-alert | non | 1 |
| H03-R2 — Débris extérieurs | lockdown | neutralize → secure | 1 | 1 | debris | fast-clear | oui | 2 |
| H03-R3 — Épave ouverte | traverse | advance | 1 | 0 | fire | collect-cache | oui | 1 |
| H03-R4 — Lisière de jungle | defense | hold → stabilize | 1 | 2 | sparks | no-damage | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H04 · E04 · Faire sortir la preuve
**Acteur :** Quinn McKenna  
**Lieu :** Relais routier · arrière-salle  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `interact`  
**Arme/kit principal :** `pistol`  
**Briefing :** Confier le colis à l’expédition et éviter que Stargazer récupère toute la technologie.  
**Issue :** Le matériel part vers la maison McKenna ; Quinn est ensuite capturé.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H04-R1 — Parking du relais | traverse | advance | 1 | 0 | traffic | no-alert | non | 1 |
| H04-R2 — Salle principale | lockdown | neutralize → secure | 1 | 1 | smoke | no-alert | oui | 2 |
| H04-R3 — Arrière-salle d’expédition | interaction | approach → operate | 1 | 0 | debris | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H05 · E05 · Le colis de Rory
**Acteur :** Rory McKenna  
**Lieu :** Maison McKenna · sous-sol  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `scan`  
**Arme/kit principal :** `mask`  
**Briefing :** Examiner le biomask et le gant. Rory comprend une partie de l’interface et active plusieurs systèmes.  
**Issue :** Un signal est envoyé et la technologie révèle des fonctions que les humains ne maîtrisent pas.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H05-R1 — Rez-de-chaussée | traverse | advance | 0 | 0 | darkness | collect-cache | non | 1 |
| H05-R2 — Escalier de service | traverse | advance | 0 | 0 | tight-space | fast-clear | oui | 1 |
| H05-R3 — Sous-sol de Rory | interaction | approach → operate | 0 | 0 | glass | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H06 · E06 · Projet Stargazer
**Acteur :** Casey Bracket  
**Lieu :** Projet Stargazer · laboratoire  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `scan`  
**Arme/kit principal :** `none`  
**Briefing :** Suivre le briefing de Traeger, observer le prisonnier et identifier l’hybridation génétique.  
**Issue :** Casey confirme la présence d’ADN humain dans le Fugitive.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H06-R1 — Bloc médical | traverse | advance | 0 | 0 | sparks | clear-threats | non | 1 |
| H06-R2 — Décontamination | traverse | advance | 0 | 0 | steam | collect-cache | oui | 1 |
| H06-R3 — Couloir technique | interaction | approach → operate | 0 | 0 | glass | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H07 · E07 · Réveil impossible
**Acteur :** Casey Bracket  
**Lieu :** Projet Stargazer · laboratoire  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `stealth`  
**Arme/kit principal :** `none`  
**Briefing :** Sortir du secteur médical pendant que le Fugitive brise ses entraves. Rester désarmée pour ne pas devenir une cible prioritaire.  
**Issue :** Le Fugitive épargne Casey et poursuit sa sortie du complexe.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H07-R1 — Décontamination | stealth | observe → cross-undetected | 1 | 1 | steam | no-alert | non | 1 |
| H07-R2 — Couloir technique | lockdown | neutralize → secure | 1 | 1 | glass | no-damage | oui | 2 |
| H07-R3 — Galerie d’exposition | stealth | observe → cross-undetected | 1 | 1 | sparks | no-alert | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H08 · E08 · Le bus des Loonies
**Acteur :** Quinn McKenna  
**Lieu :** Bus de transfert Stargazer  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `kill`  
**Arme/kit principal :** `shotgun`  
**Briefing :** Profiter du chaos, neutraliser les gardes et prendre le contrôle du bus avec Nebraska, Coyle, Baxley, Lynch et Nettles.  
**Issue :** Le groupe détourne le bus et récupère Casey.  
**Compagnons :** Nebraska, Coyle, Baxley, Lynch, Nettles  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H08-R1 — Compartiment détenus | traverse | advance | 1 | 0 | smoke | fast-clear | non | 1 |
| H08-R2 — Couloir central | lockdown | neutralize → secure | 1 | 1 | debris | fast-clear | oui | 2 |
| H08-R3 — Porte latérale | traverse | advance | 1 | 0 | traffic | collect-cache | oui | 1 |
| H08-R4 — Chaussée | lockdown | neutralize → secure | 2 | 1 | smoke | no-damage | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H09 · E09 · Retour chez les McKenna
**Acteur :** Quinn McKenna  
**Lieu :** Maison McKenna · quartier résidentiel  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `reach`  
**Arme/kit principal :** `shotgun`  
**Briefing :** Rejoindre la maison avant Stargazer et récupérer le matériel envoyé depuis le Mexique.  
**Issue :** Le matériel n’est plus au sous-sol : Rory est sorti avec le biomask.  
**Compagnons :** Casey, Nebraska, Coyle, Baxley, Lynch, Nettles  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H09-R1 — Entrée McKenna | traverse | advance | 1 | 0 | vehicles | collect-cache | non | 1 |
| H09-R2 — Pièces communes | lockdown | neutralize → secure | 1 | 1 | darkness | clear-threats | oui | 2 |
| H09-R3 — Sous-sol | traverse | advance | 1 | 0 | smoke | clear-threats | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H10 · E10 · Halloween
**Acteur :** Rory McKenna  
**Lieu :** Quartier résidentiel · Halloween  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `reach`  
**Arme/kit principal :** `mask`  
**Briefing :** Traverser le quartier avec le biomask activé et rentrer avant que les signaux extraterrestres ne convergent.  
**Issue :** Les Predator Hounds localisent le secteur.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H10-R1 — Rue décorée | traverse | advance | 1 | 0 | crowd | clear-threats | non | 1 |
| H10-R2 — Allée latérale | lockdown | neutralize → secure | 1 | 1 | fire | clear-threats | oui | 2 |
| H10-R3 — Cour résidentielle | traverse | advance | 1 | 0 | darkness | collect-cache | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H11 · E11 · Les Predator Hounds
**Acteur :** Quinn McKenna  
**Lieu :** Quartier résidentiel · Halloween  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `kill`  
**Arme/kit principal :** `grenade-launcher`  
**Briefing :** Protéger Rory et repousser les deux créatures. Une grenade et un tir à la tête changent le cours de l’affrontement.  
**Issue :** Un hound est détruit, l’autre devient docile après sa blessure.  
**Compagnons :** Nebraska, Casey  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H11-R1 — Rue décorée | traverse | advance | 1 | 0 | fire | clear-threats | non | 1 |
| H11-R2 — Allée latérale | lockdown | neutralize → secure | 1 | 1 | darkness | clear-threats | oui | 2 |
| H11-R3 — Cour résidentielle | traverse | advance | 1 | 0 | crowd | clear-threats | oui | 1 |
| H11-R4 — Approche de l’école | lockdown | neutralize → secure | 2 | 1 | fire | collect-cache | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H12 · E12 · Le toit de l’école
**Acteur :** Quinn McKenna  
**Lieu :** École · terrain, toit et couloirs  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `defend`  
**Arme/kit principal :** `rifle`  
**Briefing :** Conduire le groupe à l’école et tenir lorsque le Fugitive rejoint le véhicule puis le bâtiment.  
**Issue :** Quinn, Casey et Rory gagnent l’intérieur pendant que le Fugitive réclame son équipement.  
**Compagnons :** Rory, Casey, Loonies  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H12-R1 — Terrain | traverse | advance | 1 | 0 | darkness | clear-threats | non | 1 |
| H12-R2 — Façade et toiture | lockdown | neutralize → secure | 1 | 1 | sprinklers | no-alert | oui | 2 |
| H12-R3 — Couloirs | traverse | advance | 1 | 0 | debris | no-alert | oui | 1 |
| H12-R4 — Salle de classe | defense | hold → stabilize | 1 | 2 | darkness | no-alert | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H13 · E13 · Rendre le gant
**Acteur :** Quinn McKenna  
**Lieu :** École · terrain, toit et couloirs  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `interact`  
**Arme/kit principal :** `rifle`  
**Briefing :** Éviter l’escalade et rendre le gant au Fugitive.  
**Issue :** Le Fugitive récupère son matériel au moment où l’Upgrade apparaît.  
**Compagnons :** Rory, Casey  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H13-R1 — Façade et toiture | traverse | advance | 1 | 0 | sprinklers | clear-threats | non | 1 |
| H13-R2 — Couloirs | lockdown | neutralize → secure | 1 | 1 | debris | fast-clear | oui | 2 |
| H13-R3 — Salle de classe | interaction | approach → operate | 1 | 0 | darkness | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H14 · E14 · Deux chasseurs
**Acteur :** Quinn McKenna  
**Lieu :** École · terrain, toit et couloirs  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `survive`  
**Arme/kit principal :** `rifle`  
**Briefing :** Rester en vie pendant l’affrontement entre le Fugitive et l’Upgrade.  
**Issue :** L’Upgrade brise les wristblades du Fugitive et le tue.  
**Compagnons :** Rory, Casey  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H14-R1 — Terrain | traverse | advance | 1 | 0 | debris | clear-threats | non | 1 |
| H14-R2 — Façade et toiture | lockdown | neutralize → secure | 1 | 1 | darkness | no-damage | oui | 2 |
| H14-R3 — Couloirs | traverse | advance | 1 | 0 | sprinklers | collect-cache | oui | 1 |
| H14-R4 — Salle de classe | defense | hold → stabilize | 1 | 2 | debris | clear-threats | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H15 · E15 · La grange
**Acteur :** Casey Bracket  
**Lieu :** Grange abandonnée  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `scan`  
**Arme/kit principal :** `pistol`  
**Briefing :** Mettre en commun les données : hybridation, but des chasseurs et intérêt pour Rory.  
**Issue :** Traeger retrouve le groupe avant qu’il puisse quitter le secteur.  
**Compagnons :** Quinn, Rory, Loonies  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H15-R1 — Cour de la ferme | traverse | advance | 0 | 0 | fire | collect-cache | non | 1 |
| H15-R2 — Grange principale | traverse | advance | 0 | 0 | hay | no-damage | oui | 1 |
| H15-R3 — Mezzanine | interaction | approach → operate | 0 | 0 | tight-space | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H16 · E16 · Captifs de Traeger
**Acteur :** Quinn McKenna  
**Lieu :** Grange abandonnée  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `defend`  
**Arme/kit principal :** `none`  
**Briefing :** Résister à l’équipe de Stargazer pendant que Traeger prend Rory et exploite la carte qu’il a dessinée.  
**Issue :** Rory est emmené vers le vaisseau du Fugitive.  
**Compagnons :** Casey, Loonies  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H16-R1 — Cour de la ferme | traverse | advance | 2 | 0 | hay | clear-threats | non | 2 |
| H16-R2 — Grange principale | lockdown | neutralize → secure | 2 | 1 | tight-space | no-damage | oui | 3 |
| H16-R3 — Mezzanine | traverse | advance | 2 | 0 | fire | fast-clear | oui | 2 |
| H16-R4 — Zone d’interrogatoire | defense | hold → stabilize | 2 | 2 | hay | fast-clear | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H17 · E17 · Évasion et poursuite
**Acteur :** Quinn McKenna  
**Lieu :** Périmètre Stargazer  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `kill`  
**Arme/kit principal :** `rifle`  
**Briefing :** Récupérer les armes, suivre le Predator Hound docile et rejoindre le convoi qui transporte Rory.  
**Issue :** Le groupe localise le vaisseau du Fugitive.  
**Compagnons :** Casey, Nebraska, Coyle, Baxley, Lynch, Nettles, Predator Dog  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H17-R1 — Périmètre extérieur | traverse | advance | 2 | 0 | glass | no-alert | non | 2 |
| H17-R2 — Point de contrôle | lockdown | neutralize → secure | 2 | 1 | sparks | fast-clear | oui | 3 |
| H17-R3 — Hangar | traverse | advance | 2 | 0 | steam | no-alert | oui | 2 |
| H17-R4 — Accès aux bois | lockdown | neutralize → secure | 3 | 1 | glass | no-alert | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H18 · E18 · La clairière du vaisseau
**Acteur :** Lynch  
**Lieu :** Vaisseau du Fugitive · clairière boisée  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `defend`  
**Arme/kit principal :** `sniper`  
**Briefing :** Couvrir l’approche du vaisseau et protéger le groupe contre Stargazer.  
**Issue :** L’Upgrade arrive et frappe Lynch avant de prendre le contrôle de la scène.  
**Compagnons :** Quinn, Casey, Loonies  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H18-R1 — Lisière boisée | traverse | advance | 2 | 0 | roots | fast-clear | non | 2 |
| H18-R2 — Clairière | lockdown | neutralize → secure | 2 | 1 | mud | clear-threats | oui | 3 |
| H18-R3 — Rampe du vaisseau | traverse | advance | 2 | 0 | smoke | fast-clear | oui | 2 |
| H18-R4 — Intérieur de l’Ark | defense | hold → stabilize | 2 | 2 | roots | fast-clear | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H19 · E19 · Sept minutes trente
**Acteur :** Quinn McKenna  
**Lieu :** Vaisseau du Fugitive · clairière boisée  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `reach`  
**Arme/kit principal :** `rifle`  
**Briefing :** Après le message de l’Upgrade, gagner le bois pendant l’avance imposée par le chasseur.  
**Issue :** Le vaisseau du Fugitive est détruit et la chasse commence.  
**Compagnons :** Casey, Nebraska, Coyle, Baxley, Nettles  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H19-R1 — Clairière | traverse | advance | 0 | 0 | mud | no-alert | non | 1 |
| H19-R2 — Rampe du vaisseau | traverse | advance | 0 | 0 | smoke | no-damage | oui | 1 |
| H19-R3 — Intérieur de l’Ark | traverse | advance | 0 | 0 | roots | no-alert | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H20 · E20 · Piège nocturne
**Acteur :** Casey Bracket  
**Lieu :** Forêt · chasse nocturne  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `defend`  
**Arme/kit principal :** `mask`  
**Briefing :** Attirer l’Upgrade dans le piège préparé avec le groupe, puis exploiter le biomask lorsqu’il tombe au sol.  
**Issue :** L’Upgrade est blessé mais reprend la chasse.  
**Compagnons :** Quinn, Loonies, Predator Dog  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H20-R1 — Lisière | traverse | advance | 1 | 0 | fog | no-damage | non | 1 |
| H20-R2 — Sous-bois | lockdown | neutralize → secure | 1 | 1 | darkness | fast-clear | oui | 2 |
| H20-R3 — Ravin | traverse | advance | 1 | 0 | roots | clear-threats | oui | 1 |
| H20-R4 — Zone du piège | defense | hold → stabilize | 1 | 2 | fog | fast-clear | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H21 · E21 · Les derniers des Loonies
**Acteur :** Quinn McKenna  
**Lieu :** Forêt · chasse nocturne  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `kill`  
**Arme/kit principal :** `rifle`  
**Briefing :** Combattre l’Upgrade et les hommes de Traeger sans perdre Rory.  
**Issue :** Coyle et Baxley sont mortellement blessés et se donnent mutuellement le coup de grâce ; Traeger se tue avec une arme Predator.  
**Compagnons :** Nebraska, Coyle, Baxley, Nettles, Casey  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H21-R1 — Lisière | traverse | advance | 2 | 0 | darkness | clear-threats | non | 2 |
| H21-R2 — Sous-bois | lockdown | neutralize → secure | 2 | 1 | roots | clear-threats | oui | 3 |
| H21-R3 — Ravin | traverse | advance | 2 | 0 | fog | clear-threats | oui | 2 |
| H21-R4 — Zone du piège | lockdown | neutralize → secure | 3 | 1 | darkness | clear-threats | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H22 · E22 · La cible : Rory
**Acteur :** Quinn McKenna  
**Lieu :** Forêt · chasse nocturne  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `survive`  
**Arme/kit principal :** `rifle`  
**Briefing :** Empêcher l’Upgrade de repartir avec Rory.  
**Issue :** L’Upgrade enlève Rory et gagne son vaisseau.  
**Compagnons :** Nebraska, Nettles, Casey  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H22-R1 — Lisière | traverse | advance | 1 | 0 | roots | collect-cache | non | 1 |
| H22-R2 — Sous-bois | lockdown | neutralize → secure | 1 | 1 | fog | clear-threats | oui | 2 |
| H22-R3 — Ravin | traverse | advance | 1 | 0 | darkness | fast-clear | oui | 1 |
| H22-R4 — Zone du piège | defense | hold → stabilize | 1 | 2 | roots | fast-clear | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H23 · E23 · Sur la coque
**Acteur :** Quinn McKenna  
**Lieu :** Vaisseau de l’Upgrade  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `survive`  
**Arme/kit principal :** `rifle`  
**Briefing :** Rester accroché au vaisseau avec Nebraska et Nettles malgré le champ de force.  
**Issue :** Nettles est tué par le champ ; Nebraska se sacrifie dans la turbine et provoque le crash.  
**Compagnons :** Nebraska, Nettles  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H23-R1 — Coque extérieure | traverse | advance | 1 | 0 | debris | fast-clear | non | 1 |
| H23-R2 — Champ de force | lockdown | neutralize → secure | 1 | 1 | sparks | clear-threats | oui | 2 |
| H23-R3 — Compartiment cargo | traverse | advance | 1 | 0 | low-gravity | collect-cache | oui | 1 |
| H23-R4 — Section moteur | defense | hold → stabilize | 1 | 2 | debris | collect-cache | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H24 · E24 · Crash dans le marécage
**Acteur :** Quinn McKenna  
**Lieu :** Marécage · épave finale  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `boss`  
**Arme/kit principal :** `gauntlet`  
**Briefing :** Utiliser l’épave, Casey, le Predator Dog et les armes de l’Upgrade pour le neutraliser.  
**Issue :** L’Upgrade est mutilé puis tué avec sa propre technologie.  
**Compagnons :** Casey, Rory, Predator Dog  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H24-R1 — Épave fumante | traverse | advance | 1 | 0 | mud | no-damage | non | 2 |
| H24-R2 — Boue profonde | lockdown | neutralize → secure | 1 | 1 | water | clear-threats | non | 3 |
| H24-R3 — Passage encombré | traverse | advance | 1 | 0 | fog | no-alert | non | 2 |
| H24-R4 — Clairière finale | lockdown | neutralize → secure | 2 | 1 | mud | clear-threats | non | 4 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H25 · E25 · Ceux qui restent
**Acteur :** Quinn McKenna  
**Lieu :** Marécage · épave finale  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `interact`  
**Arme/kit principal :** `none`  
**Briefing :** Rendre hommage à Nebraska, Coyle, Baxley, Lynch et Nettles avant de quitter le site.  
**Issue :** Les survivants referment la chasse en mémoire du groupe.  
**Compagnons :** Casey, Rory  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H25-R1 — Boue profonde | traverse | advance | 0 | 0 | water | no-alert | non | 1 |
| H25-R2 — Passage encombré | traverse | advance | 0 | 0 | fog | collect-cache | oui | 1 |
| H25-R3 — Clairière finale | interaction | approach → operate | 0 | 0 | mud | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

### H26 · E26 · Le Predator Killer
**Acteur :** Quinn McKenna  
**Lieu :** Laboratoire · récupération de la cargaison  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `scan`  
**Arme/kit principal :** `none`  
**Briefing :** Observer l’ouverture du module récupéré dans la cargaison du Fugitive.  
**Issue :** L’armure adaptative Predator Killer se déploie : le véritable objectif du Fugitive devient clair.  
**Compagnons :** Rory  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| H26-R1 — Couloir sécurisé | traverse | advance | 0 | 0 | glass | clear-threats | non | 1 |
| H26-R2 — Chambre de récupération | traverse | advance | 0 | 0 | sparks | no-alert | oui | 1 |
| H26-R3 — Plate-forme du module | interaction | approach → operate | 0 | 0 | steam | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `human-cohesion-squad-orders`, `human-guard`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `reinforcement-waves`, `room-encounters`

## CAMPAGNE PREDATOR

### P01 · E00 · Traqué en orbite
**Acteur :** Fugitive Predator  
**Lieu :** Orbite terrestre  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `survive`  
**Arme/kit principal :** `ship-cannon`  
**Briefing :** Échapper au bâtiment de l’Upgrade et maintenir la trajectoire vers la Terre avec la cargaison volée.  
**Issue :** Le vaisseau endommagé plonge vers le Mexique.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P01-R1 — Poursuite orbitale | traverse | advance | 1 | 0 | low-gravity | collect-cache | non | 1 |
| P01-R2 — Approche atmosphérique | lockdown | neutralize → secure | 1 | 1 | debris | no-alert | oui | 2 |
| P01-R3 — Couloir de rentrée | defense | hold → stabilize | 1 | 2 | vacuum-alert | collect-cache | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P02 · E01 · Entrée atmosphérique
**Acteur :** Fugitive Predator  
**Lieu :** Orbite terrestre  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `reach`  
**Arme/kit principal :** `ship-cannon`  
**Briefing :** Conserver le contrôle malgré les dégâts et viser une zone isolée.  
**Issue :** L’appareil s’écrase près de l’opération de Quinn.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P02-R1 — Poursuite orbitale | traverse | advance | 0 | 0 | debris | collect-cache | non | 1 |
| P02-R2 — Approche atmosphérique | traverse | advance | 0 | 0 | vacuum-alert | fast-clear | oui | 1 |
| P02-R3 — Couloir de rentrée | traverse | advance | 0 | 0 | low-gravity | no-alert | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P03 · E02 · Sortir de l’épave
**Acteur :** Fugitive Predator  
**Lieu :** Mexique · site du crash  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `reach`  
**Arme/kit principal :** `wristblades`  
**Briefing :** Quitter le vaisseau et localiser le biomask et le gant dispersés par l’impact.  
**Issue :** Des humains armés atteignent le site en premier.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P03-R1 — Débris extérieurs | traverse | advance | 1 | 0 | fire | no-alert | non | 1 |
| P03-R2 — Épave ouverte | lockdown | neutralize → secure | 1 | 1 | sparks | no-damage | oui | 2 |
| P03-R3 — Lisière de jungle | traverse | advance | 1 | 0 | debris | collect-cache | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P04 · E03 · Le soldat au gant
**Acteur :** Fugitive Predator  
**Lieu :** Mexique · site du crash  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `scripted-loss`  
**Arme/kit principal :** `wristblades`  
**Briefing :** Neutraliser les soldats et récupérer l’équipement. Le gant volé retourne sa puissance contre son propriétaire.  
**Issue :** Le Fugitive est assommé puis capturé par Stargazer.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P04-R1 — Tranchée d’impact | traverse | advance | 1 | 0 | sparks | collect-cache | non | 1 |
| P04-R2 — Débris extérieurs | lockdown | neutralize → secure | 1 | 1 | debris | collect-cache | non | 2 |
| P04-R3 — Épave ouverte | traverse | advance | 1 | 0 | fire | collect-cache | non | 1 |
| P04-R4 — Lisière de jungle | defense | hold → stabilize | 1 | 2 | sparks | no-damage | non | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P05 · E06 · Réveil en laboratoire
**Acteur :** Fugitive Predator  
**Lieu :** Projet Stargazer · laboratoire  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `kill`  
**Arme/kit principal :** `wristblades`  
**Briefing :** Rompre les entraves et éliminer les menaces immédiates du bloc médical.  
**Issue :** Le Fugitive atteint les couloirs techniques.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P05-R1 — Décontamination | traverse | advance | 2 | 0 | steam | collect-cache | non | 2 |
| P05-R2 — Couloir technique | lockdown | neutralize → secure | 2 | 1 | glass | no-damage | oui | 3 |
| P05-R3 — Galerie d’exposition | traverse | advance | 2 | 0 | sparks | clear-threats | oui | 2 |
| P05-R4 — Zone de sécurité | lockdown | neutralize → secure | 3 | 1 | steam | clear-threats | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P06 · E07 · La biologiste désarmée
**Acteur :** Fugitive Predator  
**Lieu :** Projet Stargazer · laboratoire  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `stealth`  
**Arme/kit principal :** `wristblades`  
**Briefing :** Traverser la décontamination. Une humaine désarmée ne constitue pas la cible prioritaire.  
**Issue :** Casey est épargnée ; la récupération du matériel continue.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P06-R1 — Couloir technique | stealth | observe → cross-undetected | 1 | 1 | glass | no-alert | non | 1 |
| P06-R2 — Galerie d’exposition | lockdown | neutralize → secure | 1 | 1 | sparks | fast-clear | oui | 2 |
| P06-R3 — Zone de sécurité | stealth | observe → cross-undetected | 1 | 1 | steam | no-alert | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P07 · E07 · Armes de fortune
**Acteur :** Fugitive Predator  
**Lieu :** Projet Stargazer · laboratoire  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `kill`  
**Arme/kit principal :** `human-rifle`  
**Briefing :** Prendre un fusil humain, puis retrouver un biomask de réserve et un plasma caster dans l’exposition Stargazer.  
**Issue :** Le Fugitive retrouve une capacité de combat complète.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P07-R1 — Bloc médical | traverse | advance | 2 | 0 | sparks | no-damage | non | 2 |
| P07-R2 — Décontamination | lockdown | neutralize → secure | 2 | 1 | steam | no-damage | oui | 3 |
| P07-R3 — Couloir technique | traverse | advance | 2 | 0 | glass | fast-clear | oui | 2 |
| P07-R4 — Galerie d’exposition | lockdown | neutralize → secure | 3 | 1 | sparks | fast-clear | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P08 · E08 · Le masque à distance
**Acteur :** Fugitive Predator  
**Lieu :** Projet Stargazer · laboratoire  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `scan`  
**Arme/kit principal :** `plasma-caster`  
**Briefing :** Accéder à distance au biomask volé et lire ce qu’il voit chez Rory.  
**Issue :** Un indice conduit vers l’école de Rory.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P08-R1 — Couloir technique | traverse | advance | 0 | 0 | steam | collect-cache | non | 1 |
| P08-R2 — Galerie d’exposition | traverse | advance | 0 | 0 | glass | no-damage | oui | 1 |
| P08-R3 — Zone de sécurité | interaction | approach → operate | 0 | 0 | sparks | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P09 · E09 · Poursuite terrestre
**Acteur :** Fugitive Predator  
**Lieu :** Transport Stargazer  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `kill`  
**Arme/kit principal :** `human-rifle`  
**Briefing :** Quitter Stargazer, repousser les poursuivants et utiliser un transport militaire pour gagner du terrain.  
**Issue :** Le Fugitive se rapproche du quartier puis de l’école.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P09-R1 — Compartiment détenus | traverse | advance | 2 | 0 | smoke | fast-clear | non | 2 |
| P09-R2 — Porte latérale | lockdown | neutralize → secure | 2 | 1 | debris | no-damage | oui | 3 |
| P09-R3 — Plate-forme arrière | traverse | advance | 2 | 0 | traffic | no-damage | oui | 2 |
| P09-R4 — Route de fuite | lockdown | neutralize → secure | 3 | 1 | smoke | no-damage | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P10 · E12 · Sur le toit du véhicule
**Acteur :** Fugitive Predator  
**Lieu :** École · terrain, toit et couloirs  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `defend`  
**Arme/kit principal :** `plasma-caster`  
**Briefing :** Intercepter le groupe à l’école, arracher Nettles du poste de conduite et imposer la reddition par un tir d’avertissement.  
**Issue :** Quinn, Casey et Rory fuient dans le bâtiment.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P10-R1 — Terrain | traverse | advance | 1 | 0 | darkness | clear-threats | non | 1 |
| P10-R2 — Façade et toiture | lockdown | neutralize → secure | 1 | 1 | sprinklers | clear-threats | oui | 2 |
| P10-R3 — Couloirs | traverse | advance | 1 | 0 | debris | clear-threats | oui | 1 |
| P10-R4 — Salle de classe | defense | hold → stabilize | 1 | 2 | darkness | no-damage | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P11 · E13 · Récupération du gant
**Acteur :** Fugitive Predator  
**Lieu :** École · terrain, toit et couloirs  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `interact`  
**Arme/kit principal :** `wristblades`  
**Briefing :** Rattraper Quinn et récupérer le dispositif manquant.  
**Issue :** Quinn remet le gant. Une présence plus massive surgit derrière la fenêtre.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P11-R1 — Façade et toiture | traverse | advance | 1 | 0 | sprinklers | fast-clear | non | 1 |
| P11-R2 — Couloirs | lockdown | neutralize → secure | 1 | 1 | debris | collect-cache | oui | 2 |
| P11-R3 — Salle de classe | interaction | approach → operate | 1 | 0 | darkness | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P12 · E14 · Le traître et l’Upgrade
**Acteur :** Fugitive Predator  
**Lieu :** École · terrain, toit et couloirs  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `scripted-loss`  
**Arme/kit principal :** `plasma-caster`  
**Briefing :** Affronter l’Upgrade : caster, wristblades et mobilité sont insuffisants face à son armure organique.  
**Issue :** Les wristblades se brisent ; l’Upgrade arrache la tête et la colonne du Fugitive.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P12-R1 — Terrain | traverse | advance | 1 | 0 | debris | no-alert | non | 1 |
| P12-R2 — Façade et toiture | lockdown | neutralize → secure | 1 | 1 | darkness | collect-cache | non | 2 |
| P12-R3 — Couloirs | traverse | advance | 1 | 0 | sprinklers | no-alert | non | 1 |
| P12-R4 — Salle de classe | defense | hold → stabilize | 1 | 2 | debris | no-alert | non | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P13 · E05 · Arrivée du chasseur amélioré
**Acteur :** Upgrade Predator  
**Lieu :** Orbite terrestre  
**Acte :** ACTE I · LE FUGITIF  
**Objectif macro :** `defend`  
**Arme/kit principal :** `ship-cannon`  
**Briefing :** Poursuivre la balise vers la Terre et repousser les F-22 qui accrochent le vaisseau.  
**Issue :** L’Upgrade atteint la zone de recherche.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P13-R1 — Poursuite orbitale | traverse | advance | 1 | 0 | low-gravity | clear-threats | non | 1 |
| P13-R2 — Approche atmosphérique | lockdown | neutralize → secure | 1 | 1 | debris | fast-clear | oui | 2 |
| P13-R3 — Couloir de rentrée | defense | hold → stabilize | 1 | 2 | vacuum-alert | clear-threats | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P14 · E10 · Lâcher les hounds
**Acteur :** Upgrade Predator  
**Lieu :** Quartier résidentiel · Halloween  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `interact`  
**Arme/kit principal :** `command`  
**Briefing :** Déployer les deux Predator Hounds et leur donner une piste reliée au matériel volé.  
**Issue :** Les créatures partent vers Rory et le groupe.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P14-R1 — Allée latérale | traverse | advance | 0 | 0 | crowd | no-alert | non | 1 |
| P14-R2 — Cour résidentielle | traverse | advance | 0 | 0 | fire | fast-clear | oui | 1 |
| P14-R3 — Approche de l’école | interaction | approach → operate | 0 | 0 | darkness | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P15 · E14 · Exécution du Fugitive
**Acteur :** Upgrade Predator  
**Lieu :** École · terrain, toit et couloirs  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `boss`  
**Arme/kit principal :** `organic-armor`  
**Briefing :** Briser la résistance du Fugitive et récupérer les informations sur le matériel volé.  
**Issue :** Le Fugitive est tué ; sa mission est terminée.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P15-R1 — Parking | traverse | advance | 1 | 0 | debris | fast-clear | non | 2 |
| P15-R2 — Terrain | lockdown | neutralize → secure | 1 | 1 | darkness | fast-clear | non | 3 |
| P15-R3 — Façade et toiture | traverse | advance | 1 | 0 | sprinklers | fast-clear | non | 2 |
| P15-R4 — Couloirs | lockdown | neutralize → secure | 1 | 1 | debris | fast-clear | non | 3 |
| P15-R5 — Salle de classe | lockdown | neutralize → secure | 2 | 1 | darkness | fast-clear | non | 4 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P16 · E14 · Message au clan
**Acteur :** Upgrade Predator  
**Lieu :** École · terrain, toit et couloirs  
**Acte :** ACTE II · CHASSE CROISÉE  
**Objectif macro :** `scan`  
**Arme/kit principal :** `comms`  
**Briefing :** Confirmer à distance la mort du traître et enregistrer les pistes humaines.  
**Issue :** Plusieurs humains sont retenus comme pistes exploitables.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P16-R1 — Façade et toiture | traverse | advance | 0 | 0 | darkness | no-alert | non | 1 |
| P16-R2 — Couloirs | traverse | advance | 0 | 0 | sprinklers | no-alert | oui | 1 |
| P16-R3 — Salle de classe | interaction | approach → operate | 0 | 0 | debris | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P17 · E15 · Maison McKenna
**Acteur :** Upgrade Predator  
**Lieu :** Maison McKenna · sous-sol  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `scan`  
**Arme/kit principal :** `wrist-projectile`  
**Briefing :** Éliminer les agents sur place et analyser le sous-sol de Rory.  
**Issue :** La carte dessinée par Rory révèle la position du vaisseau du Fugitive.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P17-R1 — Rez-de-chaussée | traverse | advance | 2 | 0 | glass | no-alert | non | 2 |
| P17-R2 — Escalier de service | lockdown | neutralize → secure | 2 | 1 | darkness | collect-cache | oui | 3 |
| P17-R3 — Sous-sol de Rory | interaction | approach → operate | 2 | 0 | tight-space | observe | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P18 · E17 · Vers la cargaison
**Acteur :** Upgrade Predator  
**Lieu :** Forêt · chasse nocturne  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `stealth`  
**Arme/kit principal :** `cloak`  
**Briefing :** Traverser le bois sous camouflage et approcher le site avant que Stargazer n’extraie la cargaison.  
**Issue :** Le chasseur domine les hauteurs autour de la clairière.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P18-R1 — Ravin | stealth | observe → cross-undetected | 2 | 1 | fog | no-alert | non | 2 |
| P18-R2 — Zone du piège | lockdown | neutralize → secure | 2 | 1 | darkness | fast-clear | oui | 3 |
| P18-R3 — Poursuite finale | stealth | observe → cross-undetected | 2 | 1 | roots | no-alert | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P19 · E18 · Attaque de la clairière
**Acteur :** Upgrade Predator  
**Lieu :** Vaisseau du Fugitive · clairière boisée  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `kill`  
**Arme/kit principal :** `plasma-caster`  
**Briefing :** Neutraliser les hommes de Stargazer, frapper Lynch et pénétrer dans le vaisseau du Fugitive.  
**Issue :** Le contrôle de la cargaison revient à l’Upgrade.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P19-R1 — Lisière boisée | traverse | advance | 2 | 0 | roots | collect-cache | non | 2 |
| P19-R2 — Clairière | lockdown | neutralize → secure | 2 | 1 | mud | fast-clear | oui | 3 |
| P19-R3 — Rampe du vaisseau | traverse | advance | 2 | 0 | smoke | no-damage | oui | 2 |
| P19-R4 — Intérieur de l’Ark | lockdown | neutralize → secure | 3 | 1 | roots | no-damage | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P20 · E19 · Détruire le vaisseau
**Acteur :** Upgrade Predator  
**Lieu :** Vaisseau du Fugitive · clairière boisée  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `interact`  
**Arme/kit principal :** `self-destruct`  
**Briefing :** Utiliser le dispositif de traduction, annoncer la chasse, donner une avance puis armer l’autodestruction.  
**Issue :** Le vaisseau du Fugitive explose après le départ des humains.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P20-R1 — Clairière | traverse | advance | 0 | 0 | mud | fast-clear | non | 1 |
| P20-R2 — Rampe du vaisseau | traverse | advance | 0 | 0 | smoke | no-damage | oui | 1 |
| P20-R3 — Intérieur de l’Ark | interaction | approach → operate | 0 | 0 | roots | observe | oui | 1 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P21 · E20 · La vraie proie
**Acteur :** Upgrade Predator  
**Lieu :** Forêt · chasse nocturne  
**Acte :** ACTE III · L’UPGRADE  
**Objectif macro :** `defend`  
**Arme/kit principal :** `wrist-projectile`  
**Briefing :** Rattraper le groupe dans les bois et tester leur résistance au piège.  
**Issue :** Le piège et le biomask blessent l’Upgrade sans l’arrêter.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P21-R1 — Sous-bois | traverse | advance | 2 | 0 | fog | no-damage | non | 2 |
| P21-R2 — Ravin | lockdown | neutralize → secure | 2 | 1 | darkness | no-damage | oui | 3 |
| P21-R3 — Zone du piège | traverse | advance | 2 | 0 | roots | fast-clear | oui | 2 |
| P21-R4 — Poursuite finale | defense | hold → stabilize | 2 | 2 | fog | no-alert | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P22 · E21 · Nettoyer le terrain
**Acteur :** Upgrade Predator  
**Lieu :** Forêt · chasse nocturne  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `kill`  
**Arme/kit principal :** `harpoon`  
**Briefing :** Éliminer les soldats de Stargazer et briser la défense des Loonies.  
**Issue :** Coyle et Baxley tombent ; Traeger meurt avec l’arme qu’il tente d’utiliser.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P22-R1 — Sous-bois | traverse | advance | 2 | 0 | darkness | no-alert | non | 2 |
| P22-R2 — Ravin | lockdown | neutralize → secure | 2 | 1 | roots | no-damage | oui | 3 |
| P22-R3 — Zone du piège | traverse | advance | 2 | 0 | fog | clear-threats | oui | 2 |
| P22-R4 — Poursuite finale | lockdown | neutralize → secure | 3 | 1 | darkness | no-damage | oui | 3 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P23 · E22 · Prendre Rory
**Acteur :** Upgrade Predator  
**Lieu :** Forêt · chasse nocturne  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `interact`  
**Arme/kit principal :** `organic-armor`  
**Briefing :** Identifier Rory comme cible génétique prioritaire et l’extraire du combat.  
**Issue :** Rory est emmené au vaisseau.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P23-R1 — Sous-bois | traverse | advance | 2 | 0 | roots | no-damage | non | 2 |
| P23-R2 — Ravin | lockdown | neutralize → secure | 2 | 1 | fog | fast-clear | oui | 3 |
| P23-R3 — Zone du piège | interaction | approach → operate | 2 | 0 | darkness | observe | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P24 · E23 · Décollage
**Acteur :** Upgrade Predator  
**Lieu :** Vaisseau de l’Upgrade  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `defend`  
**Arme/kit principal :** `force-field`  
**Briefing :** Décoller avec Rory et repousser Quinn, Nebraska et Nettles accrochés à la coque.  
**Issue :** Le champ de force tue Nettles ; Nebraska se jette dans une turbine.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P24-R1 — Coque extérieure | traverse | advance | 1 | 0 | debris | no-alert | non | 1 |
| P24-R2 — Champ de force | lockdown | neutralize → secure | 1 | 1 | sparks | collect-cache | oui | 2 |
| P24-R3 — Compartiment cargo | traverse | advance | 1 | 0 | low-gravity | fast-clear | oui | 1 |
| P24-R4 — Section moteur | defense | hold → stabilize | 1 | 2 | debris | no-alert | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P25 · E24 · Impact
**Acteur :** Upgrade Predator  
**Lieu :** Marécage · épave finale  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `survive`  
**Arme/kit principal :** `organic-armor`  
**Briefing :** Survivre au crash provoqué par la destruction du moteur et reprendre le combat au sol.  
**Issue :** Quinn et Casey rejoignent l’épave.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P25-R1 — Épave fumante | traverse | advance | 1 | 0 | mud | collect-cache | non | 1 |
| P25-R2 — Boue profonde | lockdown | neutralize → secure | 1 | 1 | water | no-alert | oui | 2 |
| P25-R3 — Passage encombré | traverse | advance | 1 | 0 | fog | clear-threats | oui | 1 |
| P25-R4 — Clairière finale | defense | hold → stabilize | 1 | 2 | mud | collect-cache | oui | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

### P26 · E24 · Dernière résistance
**Acteur :** Upgrade Predator  
**Lieu :** Marécage · épave finale  
**Acte :** ACTE IV · DERNIÈRE TRAQUE  
**Objectif macro :** `scripted-loss`  
**Arme/kit principal :** `wrist-projectile`  
**Briefing :** Affronter Quinn, Casey et le Predator Dog jusqu’à l’issue canonique.  
**Issue :** L’Upgrade est vaincu avec sa propre technologie ; la campagne se clôt sur sa mort.  

| Zone | Rencontre | Phases | Ennemis | Vagues | Danger | Défi | Backtrack | Intensité |
|---|---|---|---:|---:|---|---|---|---:|
| P26-R1 — Épave fumante | traverse | advance | 1 | 0 | water | collect-cache | non | 1 |
| P26-R2 — Boue profonde | lockdown | neutralize → secure | 1 | 1 | fog | no-damage | non | 2 |
| P26-R3 — Passage encombré | traverse | advance | 1 | 0 | mud | no-alert | non | 1 |
| P26-R4 — Clairière finale | defense | hold → stabilize | 1 | 2 | water | no-damage | non | 2 |

**Systèmes v0.5 :** `host-command-bridge`, `mirror-event-mastery`, `native-event-bridge`, `objective-chain`, `organic-armor-gauge`, `performance-grade`, `predator-focus`, `predator-momentum`, `reinforcement-waves`, `room-encounters`

