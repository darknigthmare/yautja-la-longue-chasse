# Codex gameplay — AVP:R WOLF v0.5

## Contrôles

- `A / D` : déplacement latéral.
- `W / S` : changer de plan.
- `Espace` : bond.
- `Shift` : esquive rapide, 8 énergie.
- `Q` : parade avec arme de mêlée, 4 énergie.
- `E` : interaction ; pendant la lutte finale, seconde entrée du grapple.
- `F` : attaque ; pendant la lutte finale, première entrée du grapple.
- `1–8` : sélection d'arme.
- `V` : vision normale / thermique / xénomorphe tant que le biomask est porté.
- `C` : cloak ; drain d'énergie continu.
- `T` : pulse de pistage / analyse.
- `H` maintenu : Medicomp dans la scène dédiée.
- `R` : Cleaner Fluid.
- `G` : mine laser.
- `M` : route complète.
- `K` : activer/couper les SFX procéduraux WebAudio.

Les effets sonores v0.5 sont générés localement par le runtime (plasma, impacts, parade, esquive, scan, Cleaner Fluid, mine, Medicomp et lutte finale) ; aucun extrait sonore du film n'est inclus.

## IA et chasse

### Détection

Le cloak n'est pas une invisibilité absolue. Un xénomorphe peut repérer Wolf s'il approche suffisamment ; le Predalien conserve une portée de détection plus importante. Cela évite de transformer les scènes de chasse en simple marche sans opposition.

### Pounces

Un xénomorphe peut bondir depuis une distance intermédiaire lorsqu'il partage le même plan que Wolf. L'esquive est la réponse la plus sûre ; une parade bien calée peut neutraliser l'attaque au contact.

### Sang acide

La mort physique d'un xénomorphe crée une mare acide temporaire. Sauter, changer de plan ou contourner la zone permet d'éviter les dégâts. Une dissolution directe au Cleaner Fluid ne produit pas cette mare dans le runtime.

## Équipement de Wolf

1. Wrist Blades.
2. Dual Plasmacasters.
3. Combistick.
4. Razor Whip.
5. Collapsible Shuriken.
6. Plasma Pistol, seulement après la conversion au magasin.
7. Laser Mines.
8. Power Punch Glove / wrist gauntlet, indisponible une fois endommagé lors du duel final.

Le Plasma Pistol reste verrouillé par la chronologie : il est construit au magasin puis perdu lors de la chute dans l'ascenseur.

## Duel final

Le duel est divisé en cinq états techniques : `hunt`, `gauntlet_damage`, `gear_shed`, `final_grapple`, `mutual_kill`. À l'entrée de `final_grapple`, Wolf et le Predalien sont rapprochés et les déplacements normaux sont neutralisés. Alterner `F` et `E` remplit la jauge. Répéter constamment la même touche progresse beaucoup moins vite. Si la fenêtre expire, Wolf encaisse des dégâts mais la lutte recommence : la chronologie ne crée pas de fin alternative.

## Cinéma / Unrated

Le mode cinéma saute les deux nœuds exclusifs au montage Unrated : le biomask du Predator mort dans l'épave et le cimetière avec Karl. Les raccords que le film ne montre pas intégralement restent marqués `reconstruction` dans la route.

## Sauvegarde

Clé locale v0.5 : `tantalus.avpr.wolf.v05`. Migration automatique des clés `v04` et `v03`. La sauvegarde principale d'ALIENS: TANTALUS FRONTIER n'est pas modifiée par le standalone.
