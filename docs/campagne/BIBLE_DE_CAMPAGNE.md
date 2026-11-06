# Yautja – Bible de campagne

Nov 5, 2026 · @darknigthmare

## Mode d'emploi

Cette bible fusionne la « Campagne commune » du classeur V6 (60 fiches R2-M001 → R2-M060) et les 8 chasses de « La Longue Chasse », insérées à R2-M024. Chaque fiche sépare ce qui est écrit dans le projet de ce qui reste à produire.

**Sources lues dans le dépôt** (`main`, commit du 5 novembre 2026) :

- `docs/suivi-production/classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, onglet « Campagne commune » : déroulé, choix, résultat, échec, drapeau de sauvegarde de chaque fiche.
- `app/game/data/dialoguesV6-*.json` : les 60 fiches ont leurs répliques (ouverture, choix A/B, réponses, échec, reprise, succès), lisibles dans le lecteur de dialogues du vaisseau.
- `app/game/data.ts` (missions, objectifs, vagues, boss, trophées), `app/game/worldScreens.ts` (6 secteurs par chasse), `app/game/systems/worldBlueprints.ts` (routes, grimpes, dangers), `app/game/ecologyV8.ts` (roster par planète).
- Registres d'assets : `environmentPropAvailabilityData.ts` (décors V19), `public/audio/` (sons), `public/game/sprites/` (sprites).
- Comptes rendus : `docs/campaign-continuity-audit-2026-08-31.md`, `docs/v66` → `v70`, `v90`, `v92`.

**États utilisés**

| État | Sens |
| --- | --- |
| Jouable | Un chapitre jouable couvre la fiche dans le code. |
| Partiel | Du code existe ; ses propres notes disent ce qui manque. |
| Texte seul | Fiche et dialogues présents, aucun chapitre jouable. |

**Règle de lecture.** Les lignes « Production (proposé) » sont des propositions déduites de la scène écrite dans la fiche ; elles ne figurent pas dans le classeur et sont à valider. Il en va de même des blocs « Comblement » des chasses, du catalogue musical (MUS-01 → MUS-73) et de la section « Comblement des vides ». Les identifiants SFX en police technique (`rifle-burst`…) sont des noms de dossiers proposés pour `public/audio/sfx/`, sur le modèle des 21 existants. Pour les 8 chasses, « Existant » et « Manquant » sont vérifiés dans les fichiers du dépôt.

## Vue d'ensemble

La campagne compte 68 missions : 60 fiches communes, plus 8 chasses planétaires qui réalisent R2-M024. Les 8 chasses sont jouables, 6 fiches sont partielles, 53 n'existent qu'en texte et en dialogues.

Chaîne jouable actuelle, dans l'ordre du jeu : nurserie (V47) → accueil Unblooded, dojo, première lame, biomask, camp (V48) → reconnaissance du désert (V49) → patrouille (V52) → petite Fosse (V53) → Premières Pistes (V66) → passages du Homeworld (V67) → Cohorte des Aspirants, Young Blood (V68) → Seuils du Premier Sang (V69) → Temple des Trois Ombres, acte I (V70) → préparation de triade (V90, V92) → vaisseau (V87 → V89) → 8 chasses. Ces chapitres jeunesse couvrent des gestes proches des fiches M001 → M015 sans en suivre les scènes : ils sont notés « voisin ».

| # | Fiche | Titre | Rang | État | Lien dans le jeu |
| --- | --- | --- | --- | --- | --- |
| 1 | R2-M001 | Pourquoi nous combattons | Youngling | Texte seul | voisin : V47 nurserie |
| 2 | R2-M002 | Le filet et les visages | Youngling | Texte seul | — |
| 3 | R2-M003 | Le chemin vers la cité | Youngling | Texte seul | voisin : V48 trajet dans la cité |
| 4 | R2-M004 | L’épreuve des trois gestes | Youngling | Texte seul | voisin : V48 dojo |
| 5 | R2-M005 | La piste avant la prise | Youngling | Texte seul | voisin : V66 Premières Pistes |
| 6 | R2-M006 | Entrer parmi les Unblooded | Youngling | Texte seul | voisin : V48 accueil |
| 7 | R2-M007 | Le masque et ses lectures | Unblooded | Texte seul | voisin : V48 premier biomask |
| 8 | R2-M008 | La distance des lames | Unblooded | Texte seul | voisin : V48 première lame |
| 9 | R2-M009 | Ce que le camouflage laisse voir | Unblooded | Texte seul | — |
| 10 | R2-M010 | Le combistick revient à la main | Unblooded | Texte seul | — |
| 11 | R2-M011 | Le tir qui demande une ligne | Unblooded | Texte seul | — |
| 12 | R2-M012 | Le piège et le retour | Unblooded | Texte seul | — |
| 13 | R2-M013 | Le soin dans un abri | Unblooded | Texte seul | — |
| 14 | R2-M014 | La boucle des régions proches | Unblooded | Texte seul | voisin : V52 patrouille, V67 passages |
| 15 | R2-M015 | Recevoir la place de Young Blood | Unblooded | Partiel | V68 accorde Young Blood |
| 16 | R2-M016 | Former la triade | Young Blood | Partiel | V68 cohorte, V90 entraînement |
| 17 | R2-M017 | Le Temple des Trois Ombres | Young Blood | Partiel | V69 + V70 acte I (9 salles) |
| 18 | R2-M018 | Le Quatza-Rij à trois | Young Blood | Texte seul | V90 = entraînement, pas le rite |
| 19 | R2-M019 | Revenir avec la triade | Young Blood | Texte seul | — |
| 20 | R2-M020 | Porter la marque Blooded | Young Blood | Texte seul | — |
| 21 | R2-M021 | Une coque vraiment acquise | Blooded | Partiel | V87 → V89 vaisseau |
| 22 | R2-M022 | Huit salles pour préparer la route | Blooded | Partiel | V88 préparation |
| 23 | R2-M023 | Le premier trajet entre les mondes | Blooded | Partiel | V89, trajet non joué |
| 24 | R2-M024 | La première chasse d’un autre ciel | Blooded | Jouable | réalisée par les 8 chasses |
| 25 | R2-M024.1 | Sang dans la canopée — Oseris-IV | Blooded | Jouable | `jungle-vey` |
| 26 | R2-M024.2 | Chaleur sous la glace — Nivalis-K | Blooded | Jouable | `ice-cryostalker` |
| 27 | R2-M024.3 | Le dernier rite — Cinder-12 | Blooded | Jouable | `volcano-bad-blood` |
| 28 | R2-M024.4 | Les gueules du delta — Naraka-Delta | Blooded | Jouable | `swamp-hydra` |
| 29 | R2-M024.5 | Le chant sous les dunes — Serekh-9 | Blooded | Jouable | `desert-sandmaw` |
| 30 | R2-M024.6 | Sous l'œil de la tempête — Pelagos-M | Blooded | Jouable | `ocean-leviathan` |
| 31 | R2-M024.7 | La forêt qui se souvient — Mycora-V | Blooded | Jouable | `fungal-hivemind` |
| 32 | R2-M024.8 | Les chasseurs de pierre — Acheron-Sigma | Blooded | Jouable | `ruins-ancient-guardian` |
| 33 | R2-M025 | Préparer Xeno Prime | Blooded | Texte seul | — |
| 34 | R2-M026 | La première reine | Blooded | Texte seul | — |
| 35 | R2-M027 | Ce que la reine a changé | Blooded | Texte seul | — |
| 36 | R2-M028 | L’essai de coordination | Blooded | Texte seul | — |
| 37 | R2-M029 | La fonction Adjutant | Blooded | Texte seul | — |
| 38 | R2-M030 | Le seuil du Warp | Blooded | Texte seul | — |
| 39 | R2-M031 | Les pièces d’un retour | Blooded | Texte seul | — |
| 40 | R2-M032 | Installer le module du Warp | Blooded | Texte seul | — |
| 41 | R2-M033 | Traverser et revenir | Blooded | Texte seul | — |
| 42 | R2-M034 | Choisir la prochaine route | Blooded | Texte seul | — |
| 43 | R2-M035 | Un conflit de clan à hauteur de chasseur | Blooded | Texte seul | voisin : Guerres des clans |
| 44 | R2-M036 | Voir le champ depuis les hauteurs | Blooded | Texte seul | voisin : Guerres des clans |
| 45 | R2-M037 | La carte a des chemins | Blooded | Texte seul | voisin : Guerres des clans |
| 46 | R2-M038 | L’histoire dans le meuble | Blooded | Texte seul | voisin : atelier des trophées |
| 47 | R2-M039 | Revenir chez les siens | Blooded | Texte seul | — |
| 48 | R2-M040 | Mon domaine de maîtrise | Blooded | Texte seul | — |
| 49 | R2-M041 | Préparer la chasse solitaire | Blooded | Texte seul | — |
| 50 | R2-M042 | Le Quatza-Rij solitaire | Blooded | Texte seul | — |
| 51 | R2-M043 | La reconnaissance Elite | Blooded | Texte seul | — |
| 52 | R2-M044 | La coque d’un groupe | Elite | Texte seul | — |
| 53 | R2-M045 | Une porte, plusieurs haltes | Elite | Texte seul | — |
| 54 | R2-M046 | Une mission vraiment collective | Elite | Texte seul | — |
| 55 | R2-M047 | Ce que la guerre laisse au retour | Elite | Texte seul | — |
| 56 | R2-M048 | La branche qu’on ne possède pas | Elite | Texte seul | — |
| 57 | R2-M049 | Former sans remplacer | Elite | Texte seul | — |
| 58 | R2-M050 | Un désaccord à résoudre sur le terrain | Elite | Texte seul | — |
| 59 | R2-M051 | Être reconnu Elder | Elite | Texte seul | — |
| 60 | R2-M052 | L’atelier qui fonctionne sans moi | Elder | Texte seul | — |
| 61 | R2-M053 | Un ancien terrain a changé | Elder | Texte seul | — |
| 62 | R2-M054 | La décision du successeur | Elder | Texte seul | — |
| 63 | R2-M055 | L’épreuve de la longue mémoire | Elder | Texte seul | — |
| 64 | R2-M056 | La reconnaissance Ancient | Elder | Texte seul | — |
| 65 | R2-M057 | Le mausolée des chasses racontées | Ancient | Texte seul | voisin : mausolée |
| 66 | R2-M058 | Entrer dans une chronique cinéma | Ancient | Texte seul | — |
| 67 | R2-M059 | La nouvelle cohorte revient | Ancient | Texte seul | — |
| 68 | R2-M060 | La longue chasse demeure | Ancient, épilogue | Texte seul | — |

## Référentiel lore 1:1

Chaque grande étape est confrontée au canon publié, avec la décision retenue. Le Quatza-Rij, que je croyais inventé, vient bien du lore officiel du masque cérémoniel Sideshow. La section « Campagne révisée lore 1:1 », plus bas, applique ces décisions et remplace l'ordre des rites des actes II à VII.

| Étape | Ce que dit le canon | Décision retenue (5 novembre 2026) |
| --- | --- | --- |
| Pack d'Unblooded | Le Leader forme les jeunes et mène leur blooding ; l'Adjutant, second du Leader, supervise les élèves (*Hunter's Planet*) ; *Prey* : « chasser la viande molle est interdit aux unBlooded » | Packs de 12 à 40 Unblooded encadrés par des Adjutants et des Élites (effectif fixé par le projet, aucune source chiffrée trouvée) |
| Quatza-Rij | Créature du monde natal yautja (lore Sideshow Collectibles du masque cérémoniel de Steve Wang) ; les jeunes chassent par trois ; tuer un Quatza-Rij fait d'eux des membres adultes du clan ; après des années, un chasseur peut en tuer un seul pour quitter le pack et chasser plus gros hors du monde | Trio contre Quatza-Rij → rang Young Blood ; Quatza-Rij seul plus tard → droit de chasser seul hors du monde |
| Masque cérémoniel | Fait de peau et d'os de Quatza-Rij ; porté par les Anciens pendant le rite ; sans visée laser ; trois cercles au front pour les trois chasseurs, symbole d'unité dont s'inspire la visée yautja | Porté par les Anciens seulement |
| Blooding | AVP (2004) : trois jeunes (Scar, Celtic, Chopper) dans une pyramide sous la glace de l'île Bouvet, visitée une fois par siècle ; reine captive réveillée qui pond ; humains comme hôtes ; salles qui se déplacent ; marque à l'acide sur le masque et le front ; un Ancien observe du vaisseau ; autodestruction si débordés. Proie : *Kainde Amedha* (*Prey*, 1994) | Trio dans une pyramide contre les Kainde Amedha → rang Blooded |
| Marque Blooded | Symbole tracé avec un doigt de Xénomorphe brisé ; forme propre au clan (éclair dans les comics, deux traits dans AVP 2004) | Symbole du clan du joueur à dessiner |
| Elite | AVP (2010) : Dark passe les rites d'initiation et d'ascension sous le chef Spartan et le vétéran Wolf et obtient Elite | Rites du clan de type AVP 2010 + tuer une reine |
| Reine | Aucun rang attaché dans le canon trouvé ; « l'un des plus hauts honneurs » ; crête = trophée majeur ; des rois en font des trônes | Condition d'Elite (choix du projet appuyé sur cet honneur) |
| Fonder son clan | « Les Yautja ne suivent que le plus fort » ; défier le chef (Tichinde, *Prey*) ; succession d'un Élite après défis (*Hunter's Planet*) ; rupture et nouveau clan (Dek, *Badlands*) | Les trois voies, au choix du joueur |
| Navire de clan | Jusqu'à 1 km, en forme de créatures marines ou d'oiseaux de proie ; les mâles y vivent | Acquis par la voie de clan choisie |
| Guerre des clans | Querelles idéologiques ou territoriales ; clans qui se disputent un terrain (*War*) ; Temple Guards diplomates ; le Conseil des Anciens oppose parfois des clans à leur insu | Ouverte une fois le clan dirigé par le joueur |
| Code d'honneur | Pas d'enceintes ni d'enfants ; proies dignes ; rester caché ; armes égales ; récupérer matériel et frères ; petits groupes ; pas de meurtre de Yautja sauf Bad Blood ; pas d'hybridation | Règles d'honneur appliquées à toutes les chasses |
| Portail Warp | Aucun voyage dans le temps dans le canon ; chasses historiques en temps réel : 1715 (pistolet de *Predator 2*), 1719 (*Prey*), Vikings, Japon féodal et 1942 (*Predator: Killer of Killers*) | Gardé comme invention annoncée du projet, vers ces cadres d'époque, sans personnages des films |

Sources : [AVP 2004 (Wikipedia)](<https://en.wikipedia.org/wiki/Alien_vs._Predator_(film)>), [Blooding](https://avpcentral.com/predator-blooding-ritual-becoming-a-blooded-yautja), [rangs et titres](https://www.avpcentral.com/predator-ranks-titles-and-hierarchy), [Young Bloods](https://avpcentral.com/young-blood-predators), [clans](https://avp.fandom.com/wiki/Clan), [reines tuées ou capturées](https://www.avpcentral.com/predator-vs-alien-queen-fights), [Dark, AVP 2010](https://www.avpcentral.com/dark-predator-elite-clan-yautja), [Predator: Badlands (Wikipedia)](https://en.wikipedia.org/wiki/Predator:_Badlands), [code d'honneur](https://www.avpcentral.com/predator-honor-code-yautja-rules-of-the-hunt). Ce sont des sites de fans qui compilent films, romans, comics et jeux ; ils mélangent plusieurs continuités.

## Campagne révisée lore 1:1

Nouvelle chaîne : Youngling → Unblooded en pack → **Young Blood** par le Quatza-Rij à trois → **Blooded** par la pyramide → droit de chasser seul par le Quatza-Rij solitaire → vaisseau et 8 chasses → **Elite** par les rites du clan et une reine → clan, navire de clan, guerre → Elder, Ancient. Cette section prime sur les fiches R2 lorsqu'elles divergent.

| Rang ou accès | Condition de validation | Fiches R2 remplacées ou déplacées |
| --- | --- | --- |
| Youngling | Nurserie, cour, premiers ateliers | M001 → M006 inchangées |
| Unblooded | Intégration à un pack de 12 à 40 jeunes encadré par des Adjutants et des Élites ; formation aux outils dans le pack | M007 → M014 jouées dans le pack |
| Young Blood | Trio du pack qui tue un Quatza-Rij sur le monde natal ; cérémonie où les Anciens portent le masque cérémoniel | M015, M016 ; contenu de l'ancienne M018 |
| Blooded | Trio dans une pyramide contre les Kainde Amedha ; un Xénomorphe tué, marque à l'acide, retour | M017, M019, M020 réécrites |
| Quatza-Rij seul | Quatza-Rij tué seul, après les 8 chasses ; condition d'Elite | ancienne M042 |
| Vaisseau, 8 chasses | inchangé | M021 → M024.8 |
| Elite | Rites d'initiation et d'ascension du clan (modèle AVP 2010) + reine tuée et sa crête rapportée + Quatza-Rij seul | M025 → M027 et M040 → M043 fusionnées |
| Clan | Une des trois voies : défi, succession, fondation | M044 réécrite |
| Navire de clan, guerre | Navire acquis par la voie choisie ; guerre ouverte à la tête du clan | M035 → M037, M046, M047 déplacées après le clan |
| Warp | Storyline secondaire facultative, époques des chasses canon | M030 → M034, M048 |
| Elder, Ancient | inchangés | M049 → M060 |

### L-01 — Le pack

**Déroulé :** après la cérémonie Unblooded, le joueur rejoint un pack de 12 à 40 jeunes (24 proposés pour la scène) sous un Adjutant et deux Élites. Le pack vit au camp, s'entraîne aux outils (M007 → M013) et part en sorties encadrées (M014). Règle canon rappelée par l'Adjutant : un Unblooded ne chasse pas les humains (*Prey*). Le pack part aussi, par le transport du spatioport, sur une planète d'entraînement combattre des Xénomorphes de base sous encadrement (note du 27 juin 2022). Il débloque le hub autour de la cité : Désert, Slums, Jungle humide. Les rivalités du pack décident qui formera les trios.

**Validation :** formation aux outils validée, place obtenue dans un trio. **Échec :** un jeune non retenu reste au pack pour le cycle suivant.

*Production (proposé)* — **Props :** camp du pack (abris, râteliers, cercle d'entraînement), 24 jeunes (variantes de couleur et d'armure d'un sprite Unblooded), Adjutant et Élites (sprites existants de gardes de clan). **VFX :** feux de camp, poussière d'entraînement. **SFX :** `pack-camp-ambience`, cliquetis de groupe, `drum-ritual`. **Musique :** MUS-11, MUS-12.

### L-02 — Le Quatza-Rij à trois

**Déroulé :** le trio part sur le monde natal, sous l'œil d'un Élite qui n'intervient pas. Pistage du Quatza-Rij (empreintes, carcasses, marquages territoriaux), choix du terrain, puis combat où chaque rôle compte : approche (fixer la bête), ouverture (l'empêcher de fuir), frappe. Le trio rapporte la peau et le crâne.

**Validation :** Quatza-Rij tué par le trio, les trois vivants ou ramenés. **Échec :** un trio décimé n'est pas validé ; les survivants retournent au pack.

*Production (proposé)* — **Props :** territoire du Quatza-Rij sur le monde natal, carcasses, marquages, créature Quatza-Rij (la source ne décrit pas son apparence : design à créer en accord avec le masque Sideshow ; 10 animations). **VFX :** sang de la bête, poussière de charge. **SFX :** `quatza-roar`, `quatza-charge`, `quatza-bite`, `partner-call`. **Musique :** MUS-16 (à ajouter au catalogue).

### L-03 — La cérémonie du masque

**Déroulé :** au retour, les Anciens portent le masque cérémoniel du Quatza-Rij (peau et os, sans visée laser, trois cercles au front). Le trio présente le crâne ; les Anciens nomment les trois chasseurs membres adultes du clan. Le joueur reçoit les trois cercles (marque d'unité) sur son armure.

**Validation :** `rank.YoungBlood=true`. **Production (proposé) :** masque cérémoniel porté par 3 Anciens, crâne de Quatza-Rij sur un autel, braseros ; SFX `clan-chant-long`, `drum-ritual` ; MUS-06.

### L-04 — La pyramide des Kainde Amedha

**Déroulé :** un Ancien emmène le trio sur un monde-terrain de chasse. Sous la glace ou la roche dort une pyramide bâtie par le clan. Une reine captive y est réveillée ; elle pond ; une expédition humaine attirée par un signal sert d'hôtes, comme dans AVP 2004. Les armes à plasma du trio reposent dans la chambre du sarcophage : il faut y aller les reprendre. Les salles se déplacent par cycles. L'Ancien observe depuis le vaisseau.

**Validation :** chaque membre tue au moins un Xénomorphe ; le joueur se marque au front et au masque avec l'acide (doigt brisé), au symbole du clan. **Échec :** un chasseur débordé déclenche son autodestruction ; un trio qui triche ou tue un humain sans honneur devient Bad Blood.

*Production (proposé)* — **Props :** pyramide (12 salles, configurations), sarcophage, autel de la reine avec chaînes, œufs, facehuggers, Xénomorphes (sprites V7 existants), humains de l'expédition, chambre sacrificielle. **VFX :** salles qui glissent, poussière, sang acide, marque qui fume. **SFX :** `stone-grind`, `xeno-hiss`, `xeno-screech`, `queen-roar`, `facehugger-skitter`, `self-destruct-countdown`. **Musique :** MUS-13, MUS-14, puis MUS-07 au marquage.

### L-05 — Le Quatza-Rij seul

**Déroulé :** des années plus tard, le joueur Blooded part seul contre un Quatza-Rij adulte, sans partenaire. Victoire = droit de chasser seul ; avec le crâne de reine, elle valide Elite (note du 27 juin 2022). Le vaisseau est déjà acquis à Blooded.

**Validation :** Quatza-Rij tué seul, retour. **Production :** variante adulte du Quatza-Rij ; MUS-16.

### L-06 — Les rites du clan (Elite, modèle AVP 2010)

**Déroulé :** de retour des 8 chasses, le joueur passe les rites d'initiation et d'ascension sous le chef du clan et un vétéran : combat rapproché, maîtrise des lames et du plasma caster, chasses simulées. Le chef lui confie ensuite une mission dangereuse : la reine.

**Validation :** rites réussis. **Production :** arène du clan, simulateur de chasse (hologrammes de proies), chef et vétéran (sprites à produire) ; MUS-11, MUS-14.

### L-07 — La reine

**Déroulé :** Xeno Prime (12 zones du classeur, XP-Z01 → XP-Z12). Approche, ruche, reine active. Le joueur doit tuer la reine et rapporter sa crête.

**Validation :** reine tuée + crête extraite → avec L-05 et L-06, `rank.Elite=true`. **Échec :** sans crête, pas de rang. **Production :** voir R2-M026 ; MUS-41, MUS-42, MUS-07.

### L-08 — Les trois voies du clan

| Voie | Modèle canon | Déroulé | Conséquences |
| --- | --- | --- | --- |
| Défi | Tichinde (*Prey*) | duel rituel contre le chef du clan d'origine | clan et navire pris tels quels ; les fidèles de l'ancien chef partent ou complotent |
| Succession | Élite qui succède au chef (*Hunter's Planet*) | le chef nomme le joueur ; 1 à 3 Élites le défient avant la passation | clan intact ; transition lente, respect des Anciens |
| Fondation | Dek (*Badlands*) | rupture avec le clan d'origine, recrutement de ceux qui le suivent (anciens du pack, chasseurs rencontrés), déclaration du clan | petit clan, navire à acquérir (Chantier des Coques Ouvertes) ; clan d'origine hostile, première guerre possible |

**Validation :** `clan.playerLeads=true` + voie enregistrée. **Production :** arène de duel, salle du conseil, symbole et couleurs du clan à créer par le joueur ; MUS-07, MUS-47.

### L-09 — Navire de clan et guerre

**Déroulé :** le navire (jusqu'à 1 km, silhouette de créature marine ou d'oiseau de proie) devient la base du clan (4 ponts, 7 / 13 / 19 occupants). La guerre des clans s'ouvre : les Temple Guards proposent d'abord la diplomatie ; un échec mène aux missions M035 → M037 puis au mode Guerres des clans. Le Conseil des Anciens peut provoquer un conflit en secret (arc possible).

**Production :** silhouette du navire, Temple Guards (sprites), salle diplomatique ; MUS-45, MUS-46.

### L-10 — Le Warp, époques canon

Technologie du vaisseau prototype de la Rogue Space Tribe (voir « Warp gate d'après le lore NECA »). Les destinations suivent les époques où le canon place des chasses, sans y faire paraître les personnages des films :

| Branche | Cadre canon | Scène proposée |
| --- | --- | --- |
| W-01 | Scandinavie viking, 841 (*Killer of Killers*) | fjord en hiver, chasse d'un guerrier champion |
| W-02 | Japon féodal, 1629 (duel des frères en 1609) (*Killer of Killers*) | château de nuit, duel au sabre |
| W-03 | 1715 (pistolet de *Predator 2*) | navire et port, trophée d'un capitaine |
| W-04 | Grandes Plaines, 1719 (*Prey*) | plaine et forêt, chasse sans technologie lourde |
| W-05 | 1942 (*Killer of Killers*) | ciel et terrain de bataille aérienne |

Règles du classeur conservées (WARP-R01 → R24). Musique : MUS-43, MUS-44.

Sources ajoutées : [Quatza-Rij (Alien Species Wiki)](https://aliens.fandom.com/wiki/Quatza-Rij), [masque cérémoniel Sideshow](https://dailydead.com/sideshow-reveal-predator-ceremonial-mask/), [« soft meat » interdit aux unBlooded](https://avp.fandom.com/wiki/%27Aseigan). Dates vérifiées le 6 novembre 2026 : 841 (Scandinavie) et 1942 (Afrique du Nord) d'après AvP Central ; 1629 pour le Japon d'après la fiche de Kenji Kawakami ; 1715 est la date gravée sur le pistolet de Raphael Adolini (Predator 2), remis en 1719 dans Prey.

## Échelle des rangs (note du 27 juin 2022, complétée)

Règle de la note : le rang monte avec l'histoire et la professionnalisation ; chaque rang se valide par une mission spéciale. Les cases marquées *(proposé)* comblent ce que la note laissait vide.

| Level | Rang | Condition | Débloque |
| --- | --- | --- | --- |
| 0 | Youngling | dès l'intro | Level 0 (nurserie, cour) |
| 1 | Unblooded | intro terminée | cloak, masque, petite lame de poignet, combistick, speargun, mine, medicomp ; départ par le transport du spatioport avec un pack de 12 à 40 Unblooded pour combattre des Xénomorphes de base sur une planète d'entraînement ; hub de cartes autour de la cité : Désert, Slums, Jungle humide |
| 2 | Young Blood | vaincre le Quatza-Rij en trio | cimeterre, gantelet de poignet, netgun, dague cérémonielle, shuriken ; zones Lave, Lune glaciaire, Lune marécageuse |
| 3 | Blooded | rite de passage : la pyramide | armes à énergie (plasma caster) ; vaisseau personnel pour quitter Yautja Prime ; les 8 chasses |
| 4 | Adjutant | *(proposé)* mener un pack d'Unblooded en sortie d'entraînement et le ramener, comme second d'un Leader (rôle canon de *Hunter's Planet*) ; acceptation du Leader | *(proposé)* commandement d'un pack, missions de coordination, condition d'accès au Warp, mandats d'Enforcer |
| 5 | Elite | crâne de reine acquis + Quatza-Rij vaincu en solo ; les rites du clan (modèle AVP 2010) servent de cadre | mode Queen Hunt, création de clan, guerre des clans |
| 6 | Elder | *(proposé)* transmission observée (former un pack, juger un différend : R2-M049, M050) | *(proposé)* siège au conseil du clan, tribunal d'honneur, mentorat |
| 7 | Clan Leader | 3 nettoyages de ruche avec crâne de reine ; puis une des trois voies (défi, succession, fondation) | plus de cartes Queen Hunt ; navire de clan ; commandement en guerre |
| 8 | Adjudicator | 5 nettoyages de ruche + mission spéciale : la ruche de la Reine Mère | *(proposé)* autorité de jugement entre clans, droit de déclarer Bad Blood hors de son clan, commandement des Enforcers |
| 9 | Philosopher | *(proposé)* L'épreuve de la longue mémoire (R2-M055) et un successeur formé (M054) ; le titre d'âge Ancient est reconnu à ce stade | *(proposé)* guide spirituel du clan sur le modèle du Shaman de la Lost Tribe (NECA) : visions, bénédiction des chasses et des rites, conseil aux chefs ; ouverture du mausolée et des chroniques |
| 10 | Black God | *(proposé)* épreuve finale jouable : une chasse mythique digne du Black Warrior ; la victoire donne un statut quasi divin (hors canon, annoncé comme tel) ; ensuite, quand le joueur le décide, le sacrifice ultime : il est « réclamé » par le Black Warrior | *(proposé)* après la victoire : capacités de figure légendaire (hors canon) ; après le sacrifice : épilogue (R2-M060), masque au mausolée, héritage transmis à la partie suivante |

**Repères canon.** Adjutant : second d'un Leader qui supervise les élèves (*Hunter's Planet*). Reine Mère : la « San Drad Queen Mother » tuée dans *Alien vs. Predator* (arcade, 1994). Black Warrior (*Cetanu*, « Destructeur ») : dieu de la chasse, de la mort et de l'honneur, qui « réclame » les morts honorables (*Prey*, *War*, AVP 2010) ; le canon ne prévoit pas qu'un Yautja le devienne. Adjudicator et Philosopher : aucune source canon trouvée, ce sont des rangs du projet. Elder remplace Ancient au Level 6 (décision du 5 novembre 2026) ; Ancient devient un titre d'âge reconnu au Level 9. Shaman : guide spirituel de la Lost Tribe (bio NECA).

**Ce que la note change dans la campagne révisée :**

- le vaisseau est obtenu à Blooded, pas par le Quatza-Rij seul ;
- le Quatza-Rij seul devient une condition d'Elite, avec le crâne de reine (L-05 et L-07 vont ensemble) ;
- Adjutant devient un rang (Level 4), et non plus une simple fonction ;
- le pack Unblooded part déjà hors du monde, encadré, contre des Xénomorphes de base : c'est un transport du clan, pas un vaisseau personnel ;
- après Elite, la progression passe par les ruches (Queen Hunt) : 3 pour Clan Leader, 5 + Reine Mère pour Adjudicator.

### Titres canon hors de l'échelle

Ces titres existent dans le canon et s'obtiennent en parallèle des Levels, selon le parcours. Leurs conditions sont *(proposées)*.

| Titre | Canon | Condition proposée | Effet proposé |
| --- | --- | --- | --- |
| Battlemaster | Choisit la bataille ouverte plutôt que la voie de chef de clan ; Ny'ytap l'obtient en battant un clan rival qui vendait de la technologie yautja (*Rift War*) | Elite ou plus ; vaincre en guerre ouverte un clan coupable de trafic de technologie, sans prendre la tête d'un clan | commande des troupes de choc en guerre des clans ; exclusif avec Clan Leader tant qu'il le garde |
| Warlord | Commande un territoire par la guerre organisée, avec arènes et chasse de captifs (*Killer of Killers*) | Clan Leader ; tenir 3 territoires en guerre des clans | arènes sur les mondes conquis ; armées plus grandes ; risque d'honneur si captifs indignes |
| Prince | Fils du Roi, dans la lignée royale ; l'aîné ou le plus fort doit succéder (*Predator vs. Black Panther*, AVP 2) | Clan Leader ; être reconnu héritier par un Roi (alliance par la guerre ou mission d'honneur pour lui) ; O2 Héritier du masque peut y accéder par sa lignée | siège à la cour ; peut être défié par les autres Princes |
| King | Commande de nombreux clans sur une région de chasse (trilogie *Rage War*, *Predator vs. Black Panther*) | Warlord ou Prince ; rassembler 5 clans sous sa bannière | contrôle d'une région entière de la carte des Guerres des clans ; trône fait de crêtes de reines |

Source : [rangs et titres](https://www.avpcentral.com/predator-ranks-titles-and-hierarchy).

## Influence des six départs

Les rangs, les rites et leurs conditions restent communs (règle CORE-R01). Le départ change qui accompagne le joueur, comment on le regarde, quelle voie de clan lui est naturelle et ses risques d'honneur. *(Tout ce tableau est proposé.)*

| Étape | O1 Rejeté du clan | O2 Héritier du masque | O3 Porteur des derniers noms | O4 Nom entaché | O5 Dette envers l'Étranger | O6 La Longue Chasse |
| --- | --- | --- | --- | --- | --- | --- |
| Pack Unblooded | placé en fin de pack, Varek demande qu'on le laisse échouer ; Ruun dans le même pack | l'équipe d'encadrement connaît le nom de l'ancêtre et attend beaucoup | pack formé en partie de rescapés dispersés (Orem) | Evar, l'Enforcer, surveille le pack | standard (Mara arrive après Blooded) | Saar instructeur ; Harek rival, Yena et Tov |
| Trio Quatza-Rij | personne ne veut le choisir : il doit convaincre deux exclus | Khor, descendant du pisteur oublié, propose de faire trio | le trio peut inclure un rescapé très jeune | un partenaire refuse à cause du nom | standard | Yena et Tov ; Harek forme un trio rival |
| Pyramide (Blooded) | Varek observe à la place de l'Ancien, avec l'espoir d'un échec | le masque de l'ancêtre peut porter la marque à l'acide à côté de la sienne | secourir les hôtes humains encore vivants est possible sans faute | toute action douteuse est examinée deux fois | standard | Harek tente de s'approprier une prise (risque Bad Blood pour lui) |
| Elite (reine + Quatza-Rij seul) | prouver sa force seul fait écho à Dek (*Badlands*) | la crête de reine rejoint la galerie de l'ancêtre | rapporter la crête aux rescapés | Evar valide personnellement la régularité de la prise | Mara peut aider à la ruche sans prendre le trophée | Saar témoin |
| Voie de clan naturelle | Fondation (comme Dek) ou défi de Varek par duel sanctionné | Succession, portée par le nom | Fondation à partir des rescapés et des haltes | Succession refusée ; fondation sous un nom choisi | Fondation incluant Mara (précédent canon : Machiko Noguchi admise dans un clan, *Hunter's Planet*) | les trois, selon la rivalité avec Harek |
| Risque Bad Blood | tuer Varek hors d'un duel sanctionné | revendiquer seul un mérite partagé (JUST-17, JUST-18) | aucun risque propre | dissimuler la faute ancienne | défendre Mara contre des Yautja peut être jugé comme une trahison | Harek peut basculer à la place du joueur |
| Enforcer | Ruun peut être chargé de le traquer s'il tombe | — *(aucune entrée propre : voie standard)* | rare | voie naturelle : la réparation du nom (fin O4-E3) | Mara peut aider à pister un Bad Blood | traquer Harek devenu Bad Blood |
| Warp | standard | retrouver l'époque de la chasse de l'ancêtre | standard | retrouver l'époque de la faute ancienne et la témoigner | une branche humaine liée au passé de Mara | standard |

O1 suit de près *Predator: Badlands* : un fils jugé trop faible par son père chef de clan. Cette parenté peut être affichée ou adoucie ; à décider.

## Honneur, Bad Blood et Enforcer

Le joueur peut devenir Bad Blood par ses actes, ou chasser les Bad Bloods comme Enforcer. Conformément à JUST-19 du classeur, le statut dépend d'actes établis et d'un jugement, pas d'une jauge cachée.

### Les infractions (code canon)

| Infraction | Source canon | Gravité proposée |
| --- | --- | --- |
| Tuer une femme enceinte ou un enfant | code d'honneur | exil immédiat |
| Tuer un Yautja hors duel sanctionné ou hors traque d'un Bad Blood | code d'honneur | exil immédiat |
| Hybridation ou technologie interdite | code d'honneur ; Rogue Space Tribe (NECA) | exil immédiat |
| Unblooded qui chasse des humains | *Prey* : la viande molle est interdite aux unBlooded | jugement |
| Tuer une proie sans défense ou indigne | code d'honneur | jugement |
| Laisser sa technologie ou un frère tombé à l'ennemi | code d'honneur | blâme, puis jugement si répété |
| Autodestruction dans une zone habitée | exil de Scarface (100 ans) | jugement |
| Voler un mérite ou un trophée | Two-Stripes devient Bad Blood pour une prise qui n'était pas la sienne | jugement |

Chaque infraction est enregistrée avec ses témoins et ses traces. Au retour, un tribunal (JUST-06) décide : blâme, épreuve de réparation, ou exil.

### La voie Bad Blood

- **Exil :** le joueur perd l'accès à la cité et au navire de clan ; ses rangs restent écrits mais il ne peut plus en gagner dans le clan.
- **Traque :** des Enforcers apparaissent pendant ses chasses (rencontres aléatoires, puis un Enforcer nommé en boss).
- **Ralliement :** il peut rejoindre la Rogue Space Tribe (Spiked Tail, Armored Lost, Lasershot, d'après les bios NECA), qui chasse des machines et des IA contre paiement, avec de la technologie volée. C'est une seconde porte vers le Warp (voir section suivante).
- **Rédemption :** selon le code, l'honneur peut être restauré, plus souvent à partir d'Elite, avec une seule seconde chance après une punition sévère. Le joueur peut se rendre (JUST-09), subir l'épreuve imposée et revenir ; une seconde faute rend l'exil définitif.

### La voie Enforcer

- **Accès *(proposé)* :** mandat à partir d'Adjutant (Level 4), confié par le conseil ; commandement des Enforcers à Adjudicator (Level 8).
- **Missions :** JUST-07 à JUST-20 du classeur (mandat, interpellation, reddition, escorte, chasse d'un hors-la-loi).
- **Cibles nommées :** le Paria de Cinder-12 (chasse 3, déjà jouable) ; Harek (O6) ou Varek (O1) s'ils tombent ; les Bad Bloods du *Homeworld* ; la Rogue Space Tribe en arc final.
- **Alliés :** le Serpent Clan de Viper, qui aide les Enforcers contre immunité (bio NECA).
- **Canon :** les Enforcers traquent les Bad Bloods qui ont déshonoré le nom yautja ; leur statut exact (police, chasseurs de primes, devoir personnel) n'est pas fixé (*Predator: Bad Blood*).

*Production (proposé)* — **Props :** salle de tribunal, dépôt des armes saisies, avis de traque, marques de Bad Blood (masque rayé). **Sprites :** Enforcer (variante d'armure lourde), Spiked Tail, Armored Lost, Lasershot, Viper. **SFX :** `tribunal-gong`, `exile-brand`, `enforcer-call`. **Musique :** MUS-17 *Exil* et MUS-18 *Enforcer* à ajouter au catalogue.

Sources : [Enforcer (titre)](<https://avp.fandom.com/wiki/Enforcer_(title)>), [Enforcer Predator](https://avpcentral.com/enforcer-predator), [bios NECA](https://avp.fandom.com/wiki/User_blog:Fox357magnum/NECA_Figures_Biographies), [code d'honneur](https://www.avpcentral.com/predator-honor-code-yautja-rules-of-the-hunt), [Young Bloods (Two-Stripes)](https://avpcentral.com/young-blood-predators).

## Warp gate d'après le lore NECA

Le Warp n'est plus une invention isolée : il s'appuie sur les bios des figurines NECA. Celle de l'Armored Lost Predator dit qu'avec un vaisseau avancé, son groupe peut voyager « à travers l'espace et le temps » ; celle de Spiked Tail parle d'une technologie espace-temps volée qui permet à la Space Tribe d'aller plus loin que les autres Yautja.

### Le lore utilisé (bios NECA)

- **Armored Lost Predator :** maître d'armes, ancien de l'équipage de Greyback (la Lost Tribe). Entraîné par ruse dans le vol de technologie expérimentale sur Yautja Prime par Spiked Tail et Lasershot, il est condamné comme complice ; renié par le conseil des Anciens et poursuivi par ses Enforcers, il fuit avec ces deux complices, dont il se méfie désormais, à bord d'un vaisseau prototype volé.
- **Spiked Tail :** chef de la Rogue Space Tribe, exilé pour méthodes non orthodoxes et armes illégales ; allié d'Armored Lost et de Lasershot.
- **Lasershot :** Bad Blood obsédé par la technologie, en partie cybernétique.
- **Greyback :** Ancien venu sur Terre au XVIIIe siècle contre des pirates, revenu en 1997 avec la Lost Tribe (dont le City Hunter de *Predator 2*).

### La storyline *(proposée)*

1. **Le prototype (R2-M030 réécrite) :** l'Observatoire des Seuils est le laboratoire du haut conseil qui a conçu le vaisseau prototype. Le joueur Adjutant apprend le vol et découvre que la Space Tribe s'en sert pour ouvrir des portails.
2. **Deux voies d'accès :**
   - **Enforcer :** traquer la Space Tribe, récupérer le module de portail sur le prototype et le faire installer dans son vaisseau avec l'accord du conseil (R2-M031, M032). Le joueur peut découvrir qu'Armored Lost a été entraîné par ruse et choisir de plaider sa cause ; il devient alors l'allié méfiant du joueur.
   - **Bad Blood :** rejoindre la Space Tribe et utiliser le module volé, sans protection du conseil ; chaque portail ouvert attire les Enforcers. (Décision du 6 novembre : Spiked Tail et Lasershot restent les antagonistes de l'arc ; en voie Bad Blood, ils trahissent le joueur à la fin de l'arc \*(proposé)\*, et Armored Lost choisit son camp.)
3. **Les portails :** le module crée un portail sur place ; le joueur le traverse à pied (règles WARP-R01 → R24 conservées).
4. **Les époques :** celles où le canon place des chasses (W-01 → W-05), plus une branche XVIIIe siècle sur la piste de Greyback et des pirates.
5. **Fin de l'arc :** le prototype est détruit, rendu au conseil ou gardé par le clan du joueur ; ce choix décide si le Warp reste ouvert.

**Conditions d'accès mises à jour :** Blooded, vaisseau personnel, rang Adjutant (Level 4), module installé, et soit un mandat d'Enforcer, soit l'appartenance à la Space Tribe.

Source : [bios NECA](https://avp.fandom.com/wiki/User_blog:Fox357magnum/NECA_Figures_Biographies). Référence confirmée le 5 novembre 2026 : l'Armored Lost Predator.

## Décisions de conception (5 novembre 2026)

Réponses aux 16 questions sur les parties faibles du jeu. Chaque décision est suivie de sa mise en œuvre *(proposée)*.

### Monde natal et hub

**Décision :** les six zones de la note sont des régions de Yautja Prime, distinctes des 8 planètes de chasse, reliées à la cité par des chemins physiques. (Remplacé le 6 novembre par les 10 régions du classeur V6 : voir « Noms du classeur V6 ».)

| Région | Rang d'accès | Liaison depuis la cité | Rôle |
| --- | --- | --- | --- |
| Désert | Unblooded | porte sud, à pied | pistes, faune de base, reconnaissance V49 |
| Slums | Unblooded | rues basses, à pied | contrats, informateurs, premiers signes de Bad Bloods |
| Jungle humide | Unblooded | pont de lianes | territoire du Quatza-Rij (L-02) |
| Lave | Young Blood | pont de basalte | forges, épreuves de résistance |
| Glacier | Young Blood | skiff des hauts plateaux | chasse froide, ruines anciennes |
| Marais | Young Blood | skiff fluvial | faune amphibie, sanctuaire de la Reserve |

La note parlait de « Glacier Moon » et « Swamp Moon » : elles deviennent des régions de la planète. Les liaisons sont des scènes jouables (traversée de pont, pilotage de skiff), avec des rencontres possibles.

### Personnage

**Décision :** éditeur complet (sexe, morphologie, masque, armure, couleurs), sur la base de l'éditeur PHG existant. En suivant le canon, une femelle est plus grande et plus forte ; les scènes de vie diffèrent (femelles sur les mondes arides, mâles à bord des vaisseaux de clan), sans fermer aucun rang ni aucune voie.

### Mort et difficulté

| Mode | Mort en chasse | Mort pendant un rite |
| --- | --- | --- |
| Normal | reprise au point de contrôle ; pertes, blessures et déshonneur conservés | idem |
| Option Réalisme | idem | le chapitre du rite recommence en entier |
| Hardcore | mort définitive : la partie suivante hérite du masque et de la légende au mausolée | idem |

### Structure du jeu

**Décision :** hubs et contrats, plus exploration ouverte dans l'espace et sur les planètes. Les hubs (cité, vaisseau, navire de clan) proposent missions principales, contrats annexes, Queen Hunt, guerre et Warp. Dans l'espace, la carte galactique fait naître des événements et des découvertes ; sur une planète visitée, des lieux annexes se découvrent sur place.

**Événements spatiaux (les quatre types retenus) :**

- épaves et stations abandonnées (humaines ou yautja) : trophées, technologie, matériaux ;
- appels de détresse : frères tombés et technologie à récupérer (règle canon) ;
- rencontres de clans : défis, duels, échanges (Temple Guards, Serpent Clan, Super Predators) ;
- mondes à découvrir : planètes et lunes générées avec faune propre (réutilise le générateur de planètes V103 du dépôt).

### Chasses non linéaires

**Décision :** structures propres à chaque planète, 2 à 3 objectifs d'honneur facultatifs, et une forme de niveau différente d'une planète à l'autre (2,5D, passages vers d'autres lieux, jamais une seule ligne droite).

| Planète | Forme | Sous-zones et passages | Objectifs d'honneur facultatifs |
| --- | --- | --- | --- |
| Oseris-IV | metroidvania (cible 48 salles du pilote) | canopée, grottes, ravin, camp de Vey, temple englouti ; raccourcis par capacités | tuer Vey sans plasma ; laisser fuir les non-combattants du camp ; reprendre le transpondeur sans alerte |
| Nivalis-K | sous-zones connectées | banquise, mine (intérieur), galeries, nid ; ascenseur de mine et puits | briser les 3 plaques ; sauver les mineurs survivants ; aucune mort par le froid |
| Cinder-12 | profondeur (avant / arrière) + intérieur | plaine, sanctuaire intérieur sur 3 niveaux, aqueduc en arrière-plan | honorer les 3 morts avant tout combat ; duel sans arme à distance ; couper la purge en moins de 30 s |
| Naraka-Delta | sous-zones liées par la marée | mangrove basse, couronnes, nourricerie immergée, fosse ; chemins ouverts ou fermés selon la marée | ne pas tuer de juvénile ; couper les trois têtes avant le corps ; aucune capsule brisée |
| Serekh-9 | profondeur large + souterrain | dunes en 3 plans, mine vitrifiée, tunnels de la Sandmaw | traverser la mer de silice sans être entendu ; sauver la caravane ; mandibules intactes |
| Pelagos-M | vertical | arches, station (intérieur pressurisé), fosses, grotte bioluminescente | réactiver la station sans dégât ; aucune chute dans la fosse ; harpons du clan tous repris |
| Mycora-V | metroidvania en réseau | tours, relais, archives racinaires, cavité ; le réseau ferme des passages selon vos routes | ne jamais répéter une route ; détruire les 6 relais ; aucune arme à feu |
| Acheron-Sigma | sous-zones de cité | seuil, pont, galerie mimétique, chambre des prismes, noyau ; portes à stèles | aucune arme répétée 3 fois ; lire toutes les stèles ; vaincre le Gardien au corps à corps |

### Proies humaines

**Décision :** à partir de Blooded, avec le code. Seuls les humains armés et dignes sont des proies ; tuer des désarmés, des enfants ou des femmes enceintes est une infraction jugée au tribunal.

### Économie

**Décision :** un mélange, chaque système ayant son rôle.

| Système | Sert à |
| --- | --- |
| Rang | débloquer les familles d'armes et d'outils (note de 2022) |
| Honneur | payer les améliorations à l'atelier et les faveurs du clan |
| Trophées | prestige, exposition, échanges avec d'autres clans ; une crête de reine compte pour les rangs |
| Matériaux | forger les variantes d'armes et d'armures (récolte en chasse, épaves, ruines) |

### Multijoueur

**Décision :** campagne solo, avec coopération possible en rejoignant une partie, et modes multijoueur dédiés :

- **The Pit :** duels et tournois en ligne ;
- **Guerre des clans :** affrontements entre clans de joueurs ;
- **Chasse aux Bad Bloods :** si l'option est activée, un joueur Enforcer peut envahir la partie d'un joueur Bad Blood, à la manière de *Dark Souls*.

### Compagnons

**Décision :** mort définitive selon les actes. Un compagnon tué pendant un rite ou une chasse, à cause d'un choix ou d'un échec, ne revient pas (règle CORE-R17). Son absence change les scènes suivantes ; son masque peut être porté au mausolée.

### Ruches et Reine Mère

**Décision :** ruches écrites pour les étapes de rang (3 pour Clan Leader, 5 pour Adjudicator), ruches procédurales rejouables dans le mode Queen Hunt. La Reine Mère est sur un monde-ruche dédié, entièrement colonisé ; le joueur y mène une expédition de plusieurs clans (navires, équipes, front commun).

### Guerre des clans

**Décision :** un arc narratif contre le clan rival, puis le mode libre sur les 30 planètes.

### Antagonistes

**Décision :** plusieurs fils en parallèle, chacun propre à un pan du jeu.

| Antagoniste | Canon | Fil proposé dans la campagne |
| --- | --- | --- |
| Weyland-Yutani | synthétiques, Iron Bears d'AVP 2 | récupère la technologie yautja laissée sur les 8 planètes ; synthétiques dans les épaves et stations |
| Super Predators | clan rival, querelle de sang avec les Jungle Hunters (*Predators*) | clan ennemi de l'arc de guerre |
| Rogue Space Tribe | bios NECA | Warp, Bad Bloods, voie Enforcer |
| Harek | rival du départ O6 | Bad Blood possible ou chef du clan rival |
| OWLF, époque future | unité secrète de la CIA de *Predator 2* (Other Worldly Life Forms) | descendants de l'OWLF qui traquent les Yautja à l'époque du jeu |
| Chasseurs humains de Yautja | Project Stargazer (*The Predator*), Reapers (roman *Hunters and Hunted*), Predator Hunters de Jaya Soames (comics), Spearhead (*Xenogenesis*) | contrats et embuscades contre le joueur, captures et évasions |
| USS Tentalus (crossover) | ton jeu *Alien USS Tentalus* | *mission annexe « Le silence d'Asphodèle », détaillée ci-dessous* |

### Modes annexes

**Décision (révisée) :** The Pit et Game Preserve sont intégrés à la campagne avec le personnage du joueur, et leurs modes complets se débloquent à un rang donné. La Preserve revient en fin de jeu. *(Rangs et missions proposés.)*

|  | Dans la campagne (personnage du joueur) | Mode complet |
| --- | --- | --- |
| **The Pit** | Le joueur y combat avec son personnage : petite Fosse de jeunesse (V53, déjà jouable) ; duels sanctionnés pour régler un différend (JUST-13) ; duels de rang ; défi du chef et défis des Élites dans les voies de clan Défi et Succession (L-08) | ouvert à Blooded : roster complet, arènes, tournois, et The Pit en ligne |
| **Game Preserve** | Chasses d'entraînement du pack d'Unblooded ; contrats de trophées rares ; en fin de jeu, le joueur gère sa propre réserve sur le modèle de la planète-réserve des Super Predators (*Predators*, 2010), alimente ses arènes de Warlord et la défend contre les intrus | ouvert à Elite : grandes traques (V6), toutes les réserves, réglages libres |

### Quatza-Rij, symbole de clan, ordre de production

- **Design du Quatza-Rij :** silhouette déduite du masque cérémoniel de Steve Wang (forme du crâne, cornes, texture de peau), en grand quadrupède prédateur. Le masque des Anciens doit pouvoir être lu comme taillé dans sa tête.
- **Symbole et couleurs du clan :** dessinés par le joueur dans un éditeur de glyphes à la fondation ; le clan d'origine garde un symbole fixe. Le symbole tracé à l'acide à Blooded est celui du clan d'origine ; le joueur fondateur trace ensuite le sien sur ses trophées et son navire.
- **Ordre de production :** dans l'ordre (1) pack, régions et Quatza-Rij ; (2) pyramide ; (3) chasses non linéaires ; (4) honneur, Bad Blood et Enforcer.

### Époque, cités, Matriarches, races

**Époque (révisée) :** la campagne suit toute la vie du Yautja, sur des siècles. Le joueur naît à l'époque des films (1987-2025) ; des ellipses de plusieurs décennies séparent les rangs. La fin de jeu (Elder et au-delà) atteint naturellement l'époque coloniale et 2204 (crossover *Tantalus*, Weyland-Yutani et ses synthétiques, OWLF héritière). Le Warp sert aux époques passées. Canon : Greyback vient sur Terre au XVIIIe siècle puis en 1997 (bio NECA), ce qui situe l'échelle d'une vie. *(Proposé : dates indicatives Youngling → Blooded 1990-2025 ; Elite vers 2050-2100 ; Clan Leader à Adjudicator 2100-2200 ; Philosopher et Black God après 2204.)*

**Cités :** chaque clan a sa cité sur Yautja Prime. La cité déjà construite (12 quartiers) devient celle du clan d'origine du joueur ; les cités des clans alliés et rivaux se visitent par les régions et les skiffs. *(Proposé : 3 cités visitables au départ, plus la cité du clan fondé par le joueur.)*

**Matriarches :** pouvoir politique. Les Matriarches arbitrent les clans et choisissent les alliances ; la fondation d'un clan, le titre de King et l'entrée en guerre passent par leur reconnaissance. Canon : la Matriarche est la consort du Roi et gère les affaires internes (*Prey*, *The Hunt Begins*) ; la mère de Dek commande son propre vaisseau (*Badlands*).

**Langue :** les Yautja parlent leur langue (cliquetis et voix yautja), sous-titrée en français ; les humains parlent normalement.

**Chiens et montures :** compagnons de chasse dressés qui pistent et rabattent (modèle : chiens des Super Predators, *Predators*) ; montures pour traverser les régions. Le marché des montures et les chenils déjà dans le jeu servent de base.

**Races jouables :** toutes celles connues du lore. La race décide des relations de départ entre clans.

| Race | Source | Relations et particularités *(proposées)* |
| --- | --- | --- |
| Yautja classique (Jungle Hunter) | *Predator* (1987) | querelle de sang avec les Super Predators ; race par défaut |
| Lost Tribe | *Predator 2* | proche des classiques ; lien avec Greyback et le Warp |
| Super Predator | *Predators* (2010) | querelle de sang avec les classiques ; chiens de chasse et réserves |
| Feral | *Prey* (2022) | lignée d'un autre hémisphère, armes en os ; méprisée par les clans technologiques |
| Assassin (hybride) | *The Predator* (2018) | l'hybridation est interdite par le code : départ sous surveillance des Enforcers |
| Fugitive | *The Predator* (2018) | traqué par les Assassins dès le début |
| Hish-Qu-Ten | *Forever Midnight* (roman) | race ancestrale jugée sans honneur ; départ très difficile, voie Bad Blood naturelle |
| Cyborg | *Hunting Grounds* | technologie interdite tolérée ; proche de la Rogue Space Tribe |
| Exiled | *Predator: Hunters* (comics) | équipement en bois, en os et en pierre ; départ isolé |
| Emissary | *The Predator* (version alternative), NECA | armure de style militaire humain ; contacts avec les humains |
| Infected | *Fire and Stone* | muté par le Black Goo ; déblocage tardif, hors campagne principale |
| Four-Armed | *Preserve the Game* (comics) | hybride rare et indiscipliné ; déblocage tardif |
| Meta | *JLA vs. Predator* | super-pouvoirs : réservé à un mode bonus, non canon pour la campagne |

Styles historiques (Samurai, Viking, Pirate, Valkyrie, Anubis, Cleopatra, *Hunting Grounds*) : apparences et armures, pas des races. Une femelle de grande taille (« Big Mama », comics) est couverte par l'éditeur.

Source : [types de Predators](https://avpcentral.com/predator-types).

### Fin de jeu : Reine Mère, Adjudicator, Black God

**La Reine Mère (mission d'Adjudicator), opération en 3 phases :**

1. **Débarquement :** plusieurs clans posent leurs vaisseaux sur le monde-ruche ; le joueur répartit les équipes et tient la tête de pont.
2. **Percée en surface :** les clans alliés tiennent des fronts pendant que le joueur ouvre le chemin vers le cœur de la ruche.
3. **Descente :** chasse en 2,5D jusqu'à la Reine Mère. Sa mort valide Adjudicator.

**Adjudicator (Level 8) :** juge entre clans. Il tranche les différends, déclare un Bad Blood hors de son propre clan et commande les Enforcers.

**Black God (Level 10), la proie mythique :** une Ancienne déchue qui a modifié son propre ADN jusqu'à devenir une abomination aux yeux des Yautja (l'hybridation est interdite par le code). Elle tient deux reines en laisse.

- **Révélation finale :** l'Ancienne est devenue folle sous l'emprise télépathique de la ruche de la Reine Mère, et cette ruche est devenue une planète vivante.
- **Lien avec le Level 8 :** tuer la Reine Mère n'a pas tué la ruche ; la planète elle-même pensait à travers elle. *(Proposé :)* les rêves et visions du Philosopher (Level 9) annoncent cette présence.
- **Déroulé *(proposé)* :** retour sur le monde-ruche, devenu vivant ; combat contre l'Ancienne et ses deux reines en trois phases (reines libérées, Ancienne seule, la planète intervient) ; la victoire donne le statut quasi divin, puis le sacrifice ultime reste au choix du joueur.
- **Canon :** une ruche devenue planète vivante et télépathe est une invention du projet, à annoncer comme telle.

**Humains alliés :** rares et mérités. Un humain qui a tué un Xénomorphe et reçu la marque peut rejoindre le clan, comme Machiko Noguchi (*Hunter's Planet*) ; certains clans le voient d'un mauvais œil (coût en honneur auprès d'eux).

### Pack, Harek, O1, interface

- **Proies du pack Unblooded :** selon la planète d'entraînement, soit la faune locale, soit des drones Xénomorphes sans reine élevés par le clan (précédent canon : le clan de Top-Knot captive une reine, *Aliens vs. Predator: War*). Tuer ces drones ne donne pas le rang Blooded : seule la pyramide le donne.
- **Harek :** sa fin dépend des actes du joueur : allié qui rejoint le clan, Bad Blood traqué par le joueur Enforcer, ou chef du clan rival dans l'arc de guerre.
- **Départ O1 :** la parenté avec *Predator: Badlands* est assumée, avec des clins d'œil (Genna, le Kalisk), sans reprendre Dek ni l'intrigue du film.
- **Interface en chasse :** au choix du joueur dans les options : interface dans le biomask et le gantelet (glyphes, vision, minuteurs) ou interface classique (barres, minicarte, icônes).

### Clans, pyramide, guerre, contrats, vieillissement

- **Clans :** clans canon réutilisés (Lost Tribe, Serpent Clan, Elite Clan, Super Predators, Rogue Space Tribe) ; le clan d'origine du joueur et ses cités sont inventés *(noms à créer)*.
- **Pyramide :** un monde-temple dédié du clan, où dorment plusieurs pyramides, une par génération ; les humains sont attirés depuis une colonie proche par un signal, comme dans AVP 2004.
- **Arc de guerre :** 6 à 8 missions scénarisées avant le mode libre *(proposé : escarmouches de frontière, raid sur un dépôt, défense de la cité, siège de la cité rivale, duel des chefs dans The Pit, arbitrage des Matriarches)*, avec mêlées en 2,5D et phases RTS.
- **Chiens et bêtes de chasse :** capturés en chasse ou achetés au dresseur du chenil.
- **Contrats annexes (tous retenus) :** chasses de trophée, récupération de technologie ou de frères tombés, escorte et formation de jeunes du pack, nettoyage.
- **Cleaner :** fonction ouverte à Elite, sur le modèle de Wolf (*AVP: Requiem*) : effacer les preuves d'une chasse ratée, détruire les Xénomorphes échappés, récupérer la technologie.
- **Vieillissement :** à chaque ellipse, l'apparence vieillit (dreadlocks, cicatrices, peau) et les caractéristiques changent un peu *(proposé : plus de précision et d'endurance mentale, un peu moins de vitesse)*.

### Ellipses, compagnons, personnages des films

- **Entre deux rangs :** des chasses libres. Le joueur enchaîne contrats, événements spatiaux et chasses ; le temps avance avec elles, et la mission de rang suivante se déclenche quand il est prêt. *(Proposé : chaque chasse libre fait avancer le calendrier de quelques mois à quelques années ; un écran de date le montre au retour.)*
- **Compagnons :** ils vieillissent et changent. Saar vieillit puis meurt de vieillesse ou en chasse ; Yena, Tov et Harek deviennent Elites, chefs ou Bad Bloods selon les actes ; les anciens du pack mènent leurs propres vies.
- **Personnages des films, trois façons en parallèle :**
  - **Après-coups :** le joueur croise les traces et conséquences des films (pyramide détruite de l'île Bouvet, Los Angeles 1997) ;
  - **Chroniques et Warp :** les personnages apparaissent dans les chroniques cinéma et dans les branches Warp ;
  - **Rencontres et événements :** rencontres possibles en marge des films, sans changer leur fin ; exemple : Dutch âgé, qui traque les Predators vers 2025 dans *Predator: Hunting Grounds*.

### Nom du clan d'origine : cinq propositions

**Décision :** le nom du clan d'origine est tiré au hasard à chaque nouvelle partie, pour que chaque partie soit unique. (Précisé le 6 novembre : le tirage se fait parmi les 15 clans du classeur V6.) Les cinq noms ci-dessous forment la première liste du tirage *(proposé : un générateur de syllabes complète la liste, avec un filtre contre les noms déjà utilisés dans le jeu)*. Noms inventés pour le projet, aucun n'est un mot de la langue yautja canon, vérifiés absents du dépôt.

| Nom | Sens dans le jeu | Symbole proposé |
| --- | --- | --- |
| Kel'thuun | « Ceux qui reviennent » : le clan ramène toujours ses morts et sa technologie | un cercle ouvert qui se referme sur lui-même |
| Drakhar | « La Longue Chasse » : une chasse qui dure une vie, comme le titre du jeu | une ligne brisée en trois segments, de plus en plus longs |
| Ysh'tarv | « Les Ombres du Temple » : gardiens du monde-temple aux pyramides | trois cercles sous un triangle |
| Nakh'ar | « La Marque Triple » : issu du symbole des trois cercles du Quatza-Rij | trois cercles reliés par un trait |
| Rhazk'ai | « La Lame Patiente » : attendre l'ouverture plutôt que frapper le premier | une lame verticale coupée par deux traits |

**Autres décisions :**

- **Rythme entre les rangs :** chaque rang demande un seuil d'honneur ; le joueur choisit librement ses chasses pour l'atteindre, sans nombre fixe.
- **Fidélité aux films :** dans la campagne principale, le joueur ne peut pas changer ce que montrent les films (une tentative échoue de façon cohérente) ; dans les branches Warp, continuité séparée, tout est possible.
- **Représentation des personnages des films :** reconnaissables par leur rôle, leur équipement et leur nom, sans copier le visage ni la voix d'un acteur.

### Encore à développer

Sujets peu développés, à traiter dans les prochains lots de questions :

- [ ] Progression des armes et des armures, arbre d'améliorations de l'atelier — traité le 6 novembre (Équipement et IA)
- [ ] IA des proies humaines et réactions au camouflage — traité le 6 novembre
- [ ] Déroulé détaillé des 6 à 8 missions de l'arc de guerre — traité (G-1 → G-8)
- [ ] Noms et rôles des personnages de la Lost Tribe, du Serpent Clan et des Matriarches — traité le 6 novembre
- [ ] Musique et ambiance propres à chaque race — musique (MUS-60 → MUS-72) et ambiances sonores traitées le 6 novembre
- [ ] Noms des cités des clans et des trois cités visitables au départ — noms traités (classeur V6) ; carte et cités de départ traitées le 6 novembre
- [ ] Dates exactes des ellipses et seuils d'honneur par rang — traité le 6 novembre

### Équipement et IA des humains (6 novembre 2026)

- **Armes :** arbre d'améliorations par arme (puissance, discrétion, utilitaire) payé en honneur et en matériaux, plus des pièces modulaires récupérées *(proposé pour le plasma caster : canon, lentille, cellule d'énergie)* qui changent le comportement de l'arme.
- **Armures :** pièces séparées (casque, plastron, épaules, jambières) ; les trophées portés sur l'armure donnent des bonus et changent la réaction des proies *(proposé : un crâne de reine fait fuir les Xénomorphes isolés ; des plaques d'unité humaines rendent les soldats plus agressifs)*.
- **IA humaine face au camouflage :** dépend de l'équipement et se comporte en escouade réaliste.
  - Soldats ordinaires : voient une distorsion de près ; eau, boue et fusées révèlent le camouflage.
  - Équipes spécialisées (OWLF, Stargazer, Reapers) : imagerie thermique, capteurs, pièges.
  - Toutes : moral et panique, appels radio, retraites, pièges, sur le modèle des escouades de *Predator: Hunting Grounds*.

### Noms du classeur V6

**Décision :** on garde les noms du classeur V6, avec un nom en langue yautja (inventée pour le projet, affiché en glyphes) et la traduction française en sous-titre. Le clan d'origine est tiré au hasard parmi les 15 clans. Les 8 planètes jouables restent les chasses de la Longue Chasse ; les 24 planètes du V6 (PLAN02 → PLAN24) servent de contrats, de réserves et de découvertes spatiales.

**Les 10 régions du monde natal (PLAN01) remplacent les 6 zones de la note :**

| Région V6 | Zone de la note | Clan | Nom yautja *(proposé)* |
| --- | --- | --- | --- |
| Marches de Cendre | Lave | CL1 Maisons des Braises | Ash'kaar |
| Désert de Verre | Désert | CL2 Peuple des Citernes | Vhel-tor |
| Jungle des Piliers | Jungle humide | CL3 Gardiens des Hautes Branches | Dhu'saal |
| Marais Luminescents | Marais | CL4 Veilleurs des Eaux Calmes | Neth'yra |
| Chaîne des Orages | — | CL5 Veilleurs des Crêtes | Krav'ul |
| Côte des Léviathans | — | CL6 Maisons du Rivage | Thal-meq |
| Grottes Thermiques | Lave | CL7 Artisans de la Roche Chaude | Ghur'eth |
| Couronne Froide | Glacier | CL8 Maisons du Givre | Ysk'aru |
| Ruines de la Première Cité | — | CL9 Conservateurs des Anciennes Pierres | Oth'kesar |
| Réserve Interdite | — | CL10 Gardiens du Confinement | Zhar'vos |

Les Slums de la note deviennent le quartier bas de la cité. Les clans CL11 à CL15 (Flotte des Haltes Lointaines, Pacte des Mandats Liés, Cercle des Noms Rapportés, Foyer des Retours, Ligue des Forges Fermées) vivent sur des navires et dans des communautés alliées hors du monde natal. Chaque clan a ses deux communautés du V6 (CM01 → CM20), qui deviennent ses quartiers de cité.

Noms yautja des régions validés le 6 novembre 2026. Aucun n'est un mot de la langue canon.

**Noms yautja des 15 clans et des 20 communautés *(proposés, même style que les régions)* :**

| Clan V6 | Nom yautja | Communautés V6 → nom yautja |
| --- | --- | --- |
| CL1 Maisons des Braises | Kaar'dhun | CM01 La Cour des Fourneaux → Vhor'akh ; CM02 Le Replat des Veilleurs → Ish'tuun |
| CL2 Peuple des Citernes | Vhel'quaa | CM03 Les Citernes Hautes → Quaa'tor ; CM04 Le Seuil des Dunes → Dhun'esh |
| CL3 Gardiens des Hautes Branches | Saal'veth | CM05 Les Branches Entrelacées → Nekh'ra ; CM06 La Couronne des Vigies → Arr'vigh |
| CL4 Veilleurs des Eaux Calmes | Yra'thol | CM07 Les Pilotis Calmes → Oh'npiir ; CM08 La Confluence des Lanternes → Thuq'lan |
| CL5 Veilleurs des Crêtes | Krav'esh | CM09 Le Col des Échos → Ekh'ol ; CM10 Les Tours du Vent → Vhen'tar |
| CL6 Maisons du Rivage | Meq'tarr | CM11 La Jetée des Ossements → Oss'ghaa ; CM12 Les Arches de l'Écume → Ek'umar |
| CL7 Artisans de la Roche Chaude | Ghur'aval | CM13 Les Forges Souterraines → Unn'drak ; CM14 Le Palier des Sources → Sor'paal |
| CL8 Maisons du Givre | Ysk'dhaan | CM15 Le Cercle des Feux Bas → Kral'yth ; CM16 La Terrasse de Glace → Gl'ashar |
| CL9 Conservateurs des Anciennes Pierres | Oth'peyr | CM17 Les Pierres Levées → Peyr'loth ; CM18 La Cour des Cartographes → Ogh'kerat |
| CL10 Gardiens du Confinement | Zhar'kenn | CM19 Le Seuil du Confinement → Kenn'sul ; CM20 Les Veilles de la Lisière → Lhis'vhar |
| CL11 Flotte des Haltes Lointaines | Ruun'tal | navires et communautés alliées |
| CL12 Pacte des Mandats Liés | Ekar'mand | navires et communautés alliées |
| CL13 Cercle des Noms Rapportés | Raq'nhom | navires et communautés alliées |
| CL14 Foyer des Retours | Ouhn'rhet | navires et communautés alliées |
| CL15 Ligue des Forges Fermées | Gholl'ferr | navires et communautés alliées |

Les noms yautja de ce tableau sont des propositions, à valider ; aucun n'est un mot de la langue canon.

### Seuils d'honneur, ellipses, cités de départ (6 novembre 2026)

**Seuils d'honneur — décision :** atteindre le seuil d'honneur débloque l'épreuve du rang ; seule l'épreuve réussie fait monter. L'honneur perdu (infractions, voir *Honneur, Bad Blood et Enforcer*) peut faire repasser sous le seuil : l'épreuve redevient verrouillée, le rang acquis reste.

| Level | Rang | Seuil d'honneur cumulé *(proposé)* | Épreuve débloquée |
| --- | --- | --- | --- |
| 1 | Unblooded | 100 | fin de l'intro (R2-M006) |
| 2 | Young Blood | 500 | Quatza-Rij en trio |
| 3 | Blooded | 1 500 | la pyramide |
| 4 | Adjutant | 3 000 | mener et ramener un pack |
| 5 | Elite | 5 000 | crâne de reine + Quatza-Rij seul |
| 6 | Elder | 8 000 | transmission observée |
| 7 | Clan Leader | 12 000 | 3 ruches nettoyées puis une des trois voies |
| 8 | Adjudicator | 18 000 | 5 ruches + Reine Mère |
| 9 | Philosopher | 25 000 | l'épreuve de la longue mémoire |
| 10 | Black God | 40 000 | la chasse mythique |

*(proposé)* En mode réalisme et hardcore, les seuils sont identiques mais l'honneur gagné est réduit de 20 % et les pertes doublées.

**Ellipses — décision :** un mélange cohérent des trois logiques, selon la situation.

- **Âge affiché partout :** chaque ellipse affiche l'âge du Yautja et le temps écoulé (« 40 ans plus tard »).
- **Dates terrestres quand la mission touche la Terre ou une époque des films :** chasses sur Terre, arc Warp, crossover Tantalus. Elles se calent sur les dates des films (1718, 1987, 1997, 2004, 2010, 2022, 2025…).
- **Durée variable pour les contrats et les chasses libres :** chaque contrat consomme du temps (*proposé :* de quelques mois à 10 ans selon la distance et le type), plafonné par rang pour que le Yautja ne vieillisse pas avant d'avoir passé les épreuves principales.
- **Cohérence :** l'âge ne recule jamais, sauf par le Warp ; dans ce cas l'âge du Yautja continue d'avancer, seule la date de destination change.

**Tranches d'âge par rang** *(proposées ; le canon ne donne pas de chiffres fiables)* : Youngling 0–15 ans ; Unblooded 15–30 ; Young Blood 30–45 ; Blooded 45–80 ; Adjutant 80–120 ; Elite 120–200 ; Elder 200–300 ; Clan Leader 250–400 ; Adjudicator 350–500 ; Philosopher et Ancient au-delà de 500. Ces tranches pilotent les silhouettes de vieillissement décidées plus haut.

**Carte du monde natal et cités de départ — décision :** un mélange de l'anneau, de la géographie par climat et d'une capitale centrale qui relie tout.

- **La capitale au centre :** c'est la cité du classeur V6 (36 lieux sur 4 niveaux, CITY-01 → CITY-36). Ses portes mènent à chaque région : c'est le hub.
- **Les régions placées par climat** *(disposition proposée)* : froid au nord, eau à l'ouest, chaleur au sud, montagnes et Réserve à l'est.
- **Un anneau de sentiers de frontière** relie les régions voisines entre elles, sans repasser par la capitale *(proposé : ouverts par mission, comme les raccourcis du V6)*.

```text
                       NORD
      Couronne Froide ─────── Chaîne des Orages
            │   ╲                 ╱   │
  Côte des  │    ╲   CAPITALE    ╱    │  Réserve
Léviathans ─┼───── (CITY-01→36) ─────┼─ Interdite   EST
            │    ╱  Ruines de la ╲    │  + Spatioport
   Marais   │   ╱  Première Cité  ╲   │    Oriental
Luminescents── Jungle des Piliers    Désert de Verre
            │         │               │
     Grottes Thermiques ──── Marches de Cendre
                       SUD
```

| Région | Liaison depuis la capitale | Voisines sur l'anneau |
| --- | --- | --- |
| Ruines de la Première Cité | contiguë à la capitale, par le Passage des Racines (CITY-30) | Jungle des Piliers, Désert de Verre |
| Marches de Cendre | Porte des Marches (CITY-07), à pied | Désert de Verre, Grottes Thermiques |
| Désert de Verre | porte sud, à pied | Marches de Cendre, Réserve Interdite |
| Jungle des Piliers | pont de lianes | Ruines, Marais Luminescents |
| Marais Luminescents | skiff fluvial | Jungle des Piliers, Côte des Léviathans, Grottes Thermiques |
| Côte des Léviathans | Port Côtier (CITY-34), par la mer | Marais Luminescents, Couronne Froide |
| Couronne Froide | skiff des hauts plateaux | Côte des Léviathans, Chaîne des Orages |
| Chaîne des Orages | rampes taillées et lignes de traversée | Couronne Froide, Réserve Interdite |
| Réserve Interdite | Porte des Réserves (CITY-36), accès par mission | Chaîne des Orages, Désert de Verre |
| Grottes Thermiques | tunnel depuis les Forges Profondes (CITY-26) | Marches de Cendre, Marais Luminescents |

**Au départ :** la capitale, la région du clan tiré et ses deux voisines les plus proches sur l'anneau. Pour le Marais, ce sont la Jungle et la Côte. Le V6 ouvre de toute façon les Marches de Cendre, le Désert de Verre et la Jungle des Piliers en promenade encadrée dès Youngling : ce sont les trois régions communes à tous les départs. Le Spatioport Oriental (CITY-33) est à l'est de la capitale ; on y embarque une fois le vaisseau acquis.

*(proposé)* Si le tirage donne un clan hors du monde natal (CL11 → CL15), le départ se fait sur le navire du clan, amarré au Spatioport Oriental ; les deux régions de départ sont les Ruines de la Première Cité et le Désert de Verre, les plus proches du spatioport. Les Slums restent le quartier bas de la capitale et de chaque cité de clan.

### Personnages de la Lost Tribe, du Serpent Clan et des Matriarches

**Décision :** les membres canon d'abord, complétés par des personnages inventés là où le canon n'a personne ; les inventés sont marqués *(proposé)*.

**Lost Tribe** — l'équipage de Greyback (bios NECA, *Predator 2*). Tous canon :

| Personnage | Canon | Rôle dans le jeu *(proposé)* |
| --- | --- | --- |
| Greyback | chef et fondateur de la Lost Tribe | voir *Figures canon* : piste du XVIIIe siècle dans l'arc Warp |
| Warrior | maître d'armes, bras droit de Greyback, combat à la hache géante | maître d'armes de l'atelier quand la Lost Tribe est alliée ; duel d'entraînement en Pit |
| Shaman | chef spirituel, connaît les rituels et peut-être les prophéties | modèle et mentor du rang Philosopher ; visions au Level 9 |
| Scout | tireur d'élite au fusil à plasma | guide des chasses à longue distance ; contrat de tir |
| Guardian | expert en explosifs et armes lourdes, ancien Temple Guard devenu Elite | lien avec les Temple Guards dans l'arc de guerre (G-x) |
| Snake | assassin du Serpent Clan, contrats discrets pour les Elders | passerelle entre la Lost Tribe et le Serpent Clan |
| Boar et Stalker (frères Boar) | Boar : protection, extraction, trophées ; Stalker : le planificateur | contrats d'extraction et de récupération de trophées |
| Armored Lost | maître d'armes, fugitif après le vol de technologie sur Yautja Prime | arc Warp (vaisseau prototype et module de portail) |
| City Hunter | jeune, chassait à Los Angeles, tué par Harrigan (1997) | mort avant la campagne ; son trophée sert de rappel dans l'arc Warp |

**Serpent Clan** — canon : Viper (chef, mercenaires, aide les Enforcers contre immunité) et Snake. Complété *(proposé)* :

| Personnage | Statut | Rôle |
| --- | --- | --- |
| Viper | canon | chef ; recrute le joueur Enforcer ou le traque s'il devient Bad Blood |
| Snake | canon | assassin ; contrats d'élimination discrets pour les Elders |
| Ssik'thar | *(proposé)* | second de Viper, négocie l'immunité ; peut trahir le joueur selon son honneur |
| Vhar'nesh | *(proposé)* | maître des poisons et des pièges du clan ; vend les améliorations discrétion |

**Matriarches** — le canon donne la fonction (consort du Roi, affaires internes ; la mère de Dek commande son propre vaisseau dans *Badlands*) mais aucun nom utilisable. Conseil de trois *(proposé)* :

| Personnage | Rôle |
| --- | --- |
| Nhal'vesh | arbitre des clans ; préside G-8 *L'arbitrage des Matriarches* |
| Kyr'adhen | gardienne des lignées ; reconnaît la fondation d'un clan et le titre de Prince |
| Thes'ka | commandante de vaisseau (modèle de la mère de Dek) ; donne les contrats de flotte et la reconnaissance du titre de King |

La Matriarche du clan d'origine est générée avec le nom du clan tiré *(proposé)* : c'est elle qui accueille à la cérémonie Unblooded et qui reconnaît (ou non) le joueur à chaque grand rang.

Sources : [Lost Tribe](https://avpcentral.com/lost-tribe-predators), [Shaman](https://avpcentral.com/shaman-predator-yautja-spiritual-leader).

### Mini-arcs de la Lost Tribe et du Serpent Clan *(missions proposées)*

**Décision :** chaque faction a un mini-arc de trois missions (rencontre, contrat, choix final allié ou ennemi), débloqué après Blooded. Les personnages sont ceux de la section précédente.

| # | Mission | Déroulé | Issue |
| --- | --- | --- | --- |
| LT-1 | La piste de Greyback | à un relais de chasse, Scout met le joueur à l'épreuve : trois cibles à longue distance sans être repéré | la Lost Tribe accepte de parler au joueur |
| LT-2 | Le contrat des frères Boar | extraction de trophées sur une planète réserve avec Boar et Stalker ; Guardian fournit les explosifs ; Stalker planifie, Boar fonce : le joueur arbitre | trophées partagés ou gardés (honneur) |
| LT-3 | La vision du Shaman | le Shaman montre au joueur la mort du City Hunter (1997) et demande un serment ; choix : alliance ou refus | **alliée :** Warrior ouvre l'atelier, Greyback donne la piste du XVIIIe siècle (arc Warp) ; **rivale :** la Lost Tribe conteste un territoire dans l'arc de guerre |
| SC-1 | L'offre de Viper | Ssik'thar propose un contrat : éliminer un Bad Blood sans laisser de trace | le Serpent Clan juge le joueur |
| SC-2 | Le contrat de Snake | Snake et le joueur exécutent un contrat pour un Elder, avec les pièges de Vhar'nesh ; la cible se révèle innocente | dilemme d'honneur : finir le contrat (perte d'honneur, gain d'argent) ou l'abandonner |
| SC-3 | Le prix de l'immunité | Viper réclame un service en échange de l'immunité ; si l'honneur est bas, Ssik'thar trahit le joueur | **allié :** mercenaires dans l'arc de guerre, améliorations discrétion, aide pour la voie Enforcer ; **ennemi :** le Serpent Clan traque le joueur (événements d'embuscade) |

*Production (proposé)* — **Props :** relais de chasse de la Lost Tribe, cibles de tir, caisses de trophées, cercle de vision du Shaman (fumée, crânes), repaire du Serpent Clan (fosses, pièges, fioles de poison). **VFX :** fumée de vision, image fantôme du City Hunter, poison vert qui s'évapore. **SFX :** `vision-whisper`, `trap-spring`, `poison-hiss`. **Musique :** MUS-61 (Lost Tribe) pour LT-1 → LT-3 ; MUS-73 (Serpent Clan, ci-dessous) pour SC-1 → SC-3.

**MUS-73 — Serpent Clan**

```text
Instrumental 90-second leitmotif for a mercenary alien hunter clan of assassins and poisoners. 92 BPM, F-sharp minor. Hissing shaker textures, slithering fretless bass, muted hand drums, a sinuous double-reed melody, sudden silences. Coiled, patient, treacherous.
```

### Ambiances sonores par race

**Décision :** chaque race a son jeu de voix (clics, grognements), ses sons d'équipement (armure, cloak, lames) et une boucle d'ambiance de camp. Les dossiers SFX sont proposés sur le modèle `public/audio/sfx/<race>/`.

| Race | Voix *(proposé)* | Équipement *(proposé)* | Camp *(proposé)* |
| --- | --- | --- | --- |
| Yautja classique | clic grave classique, rugissement des films | armure métal léger, cloak électrique | jungle, feu, trophées qui s'entrechoquent |
| Lost Tribe | clics plus rauques, voix usées | métal abîmé, tintement de trophées | vaisseau ancien qui grince, hum urbain lointain |
| Super Predator | grognement plus grave, aboiements | armure lourde, pas massifs | chenil des chiens, réserve, cris de proies |
| Feral | clics secs, souffle animal | os et cuir, pas de métal | vent, os qui claquent, feu de bois |
| Assassin (hybride) | voix traitée, clics distordus | servo, métal froid | laboratoire, ventilation |
| Fugitive | voix essoufflée, clics rapides | équipement léger qui cliquette | abri provisoire, pluie |
| Hish-Qu-Ten | clics cassés, chuchotements | métal ancien rouillé | ruines, échos |
| Cyborg | clics doublés d'un bip | servomoteurs, refroidissement | atelier, étincelles |
| Exiled | clics doux, sifflements | bois, pierre, cordes | ressac, oiseaux d'île |
| Emissary | clics mélés de radio | armure militaire humaine, sangles | base militaire, radio |
| Infected | gargouillis, clics mouillés | chair qui craque | bulles, battement irrégulier |
| Four-Armed | deux voix superposées | lames multiples | arène, foule |
| Meta | voix amplifiée, écho | énergie, décharges | grande salle, bourdonnement électrique |

### Fins de voie et fin de jeu

**Décision :** la fin du départ (classeur V6, 3 fins par départ, choisie en Mx-M29 et jouée en Mx-M30 après Elite) clôt l'histoire personnelle. La fin de jeu (Reine Mère, Adjudicator, Black God, sacrifice) vient ensuite, et l'épilogue (R2-M060) reprend la fin de voie choisie. Le V6 interdit déjà que M31 → M36 ou R2-M060 modifient la fin de voie : l'épilogue la montre, il ne la change pas.

| Départ | Fin 1 | Fin 2 | Fin 3 |
| --- | --- | --- | --- |
| O1 Rejeté du clan | E1 Mon seuil, mon nom | E2 La force sous mes limites | E3 Une porte entrouverte, sous conditions |
| O2 Héritier du masque | E1 Le masque avec son histoire entière | E2 La galerie des voix liées | E3 Mon propre masque, leur garde |
| O3 Porteur des derniers noms | E1 Un foyer reconstruit par choix | E2 Les haltes des derniers noms | E3 Les archives confiées, ma route ouverte |
| O4 Nom entaché | E1 Le nom assumé avec les faits | E2 Un nom choisi pour ma route | E3 Réparer dans une fonction limitée |
| O5 Dette envers l'Étranger | E1 L'alliance des deux routes | E2 La dette reconnue et soldée | E3 Un relais entre partenaires libres |
| O6 La Longue Chasse | E1 La maison des futurs chasseurs | E2 Le cercle de chasse choisi | E3 Transmettre puis explorer |

*(proposé)* Dans l'épilogue, le lieu de la fin de voie (seuil, galerie, foyer, plaque, relais, maison d'enseignement) reçoit le masque du joueur après le sacrifice, à la place du mausolée si le joueur le choisit.

### Fin de la voie Bad Blood

**Décision :** un joueur resté Bad Blood n'accède pas au Black God ; il a sa propre fin. Trois issues *(proposées)*, selon ses actes dans l'arc Warp et face aux Enforcers :

| Fin | Condition | Séquence |
| --- | --- | --- |
| BB-E1 Le chef des exilés | vaincre Spiked Tail après sa trahison (fin de l'arc Warp) | le joueur prend la tête de la Rogue Space Tribe ; le prototype devient son navire ; l'épilogue le montre chassant hors de toute loi |
| BB-E2 La dernière traque | perdre le duel final contre le chef des Enforcers (ou Viper si le Serpent Clan est ennemi) | mort sans réclamation par le Black Warrior ; masque détruit, pas de mausolée |
| BB-E3 La rédemption tardive | rendre le prototype au conseil et se livrer | jugement par l'Adjudicator ; exil accepté ou fonction de réparation (écho de O4-E3) ; masque gardé aux archives, rayé |

**Musique :** MUS-17 *Exil* pour les trois, avec le motif de la race joué en mineur.

### Navire de clan : gestion

**Décision :** les 12 actions du classeur V6 (CNS-G01 → G12), jouées en scènes courtes dans le navire, plus une couche chiffrée.

- **Actions V6 :** composer une équipe, préparer une expédition, entretenir la coque, accueillir un nouveau membre, définir une priorité, partager une prise, suivre les vétérans, tenir une halte, régler une rivalité, soutenir une guerre, organiser une relève, transmettre le navire. Équipage de 6, 12 ou 18 autres occupants selon la taille du navire.
- **Couche chiffrée *(proposée)* :** quatre jauges affichées sur la table du salon de charte, pas dans un menu à part : **réserves** (vivres, matériaux), **état de la coque**, **moral de l'équipage**, **fatigue** par membre. Chaque action jouée les modifie ; une jauge basse ferme des missions (coque abîmée : pas de saut lointain ; moral bas : un membre peut partir ; fatigue : un vétéran refuse la sortie).
- **Règle :** les chiffres ne remplacent jamais l'action jouée ; ils disent seulement ce qui est possible.

### Enfance (Youngling)

**Décision :** les six fiches R2-M001 → M006 sont jouées en missions courtes, environ 30 à 45 minutes en tout *(durée proposée)*. En nouvelle partie, le joueur peut passer l'enfance ; le tirage du clan, le départ et la région de départ restent faits.

### Coop de campagne

**Décision :** de 1 à 3 joueurs (le nombre du trio), hôte maître : l'histoire, les choix et les missions validées avancent chez l'hôte ; les invités gardent l'honneur, les trophées et les matériaux gagnés.

**Épreuves de rang en coop — décision :** autorisées, y compris le Quatza-Rij seul, la pyramide, la reine et le Black God. Précisions *(proposées)* :

- l'honneur gagné pendant une épreuve est réduit de moitié pour tous quand elle est faite à plusieurs ;
- le rang n'est validé que pour l'hôte ; un invité qui n'a pas encore ce rang garde la récompense mais doit repasser l'épreuve dans sa partie ;
- le trophée de l'épreuve (crâne de reine, marque Blooded) va à celui qui porte le coup final ;
- écart avec le lore : un rite canon comme le Quatza-Rij seul se passe sans aide ; le jeu le signale par une ligne du maître de rite à l'entrée (« un nom gagné à plusieurs se porte moins haut »).

### Économie chiffrée *(valeurs proposées)*

**Honneur — décision :** gagné par la manière. Gain = base de la proie × multiplicateur de manière, moins les pénalités du code.

| Proie | Base |
| --- | --- |
| faune ordinaire digne (prédateur armé par nature) | 5 |
| Xénomorphe drone | 10 |
| humain armé | 15 |
| Xénomorphe guerrier, praetorien | 25 / 60 |
| équipe spécialisée (OWLF, Stargazer, Reapers), par membre | 30 |
| Bad Blood yautja | 60 |
| boss d'une des 8 chasses | 150 |
| reine Xénomorphe | 400 |
| Reine Mère | 1 500 |

| Manière | Effet |
| --- | --- |
| mise à mort sans être repéré | × 1,25 |
| arme de mêlée | × 1,5 |
| sans camouflage, à découvert | × 1,5 |
| trophée prélevé et rapporté | + 20 % |
| plasma caster sur une proie désarmée ou faible | gain annulé + infraction |
| technologie yautja laissée sur place | − 50 par objet |
| proie non digne (malade, enceinte, désarmée, enfant) | gain annulé + infraction (code canon) |

Les multiplicateurs se cumulent (mêlée sans être repéré : × 1,875). Repère : le pack et les sorties d'entraînement rapportent assez pour atteindre 500 (Young Blood) en une dizaine de missions.

**Mort et matériaux (mode normal) — décision :** on perd les matériaux non déposés au vaisseau, à la cité ou au navire ; l'honneur et les trophées déjà gagnés sont gardés. Les modes réalisme et hardcore suivent les règles déjà fixées dans *Mort et difficulté*.

**Matériaux** *(proposé)* : quatre familles pour l'atelier — métal (épaves, ruines), chitine et acide figé (Xénomorphes), os et cuir (faune), composants (technologie humaine et Yautja récupérée). Une amélioration d'arme coûte de l'honneur et une ou deux familles.

### Modes multijoueur dédiés

**The Pit — décision :** un mode à part, construit comme un jeu de combat (écran de sélection, roster, arènes, tournois). Le roster a une case de plus : le Yautja de sa campagne, avec son apparence et son équipement. *(proposé : en classé en ligne, ses statistiques sont ramenées à l'équilibre du roster ; en local et en partie libre, il garde celles de sa campagne.)*

**Guerre des clans en multijoueur — décision :** toute la guerre des clans, avec tous ses sous-gameplays, se joue dans une partie dédiée en multijoueur : escarmouches en 2,5D, phases RTS, raids sur dépôt, sièges, duel des chefs dans The Pit, diplomatie et arbitrage des Matriarches. *(proposé : 2 à 4 clans de joueurs, de 1 à 3 joueurs par clan, sur la carte de Korthas du classeur V6 — 36 territoires et 70 passages ; une partie se joue en plusieurs sessions et se sauvegarde.)* Chaque joueur y entre avec son Yautja et son clan de campagne ; le résultat ne modifie pas sa campagne.

**Invasion Enforcer ↔ Bad Blood — décision :** honneur et trophée, sans perte de progression. L'Enforcer vainqueur gagne de l'honneur et le masque rayé du Bad Blood en trophée ; le Bad Blood vainqueur gagne une pièce d'équipement d'Enforcer.

### Éditeur de personnage : ajouts

**Décision :** les quatre ajouts au PHG existant.

- **Dreadlocks et ornements :** longueur, anneaux, perles, couleur ; les anneaux s'ajoutent avec les rangs *(proposé)*.
- **Cicatrices et marque Blooded :** cicatrices gagnées en jeu selon les blessures reçues ; la marque d'acide est dessinée par le joueur à la fin de la pyramide (L-04).
- **Voix et clics :** choix parmi les voix de la race (voir *Ambiances sonores par race*).
- **Masque gravé :** gravures dessinées avec l'outil du symbole de clan.

### Mode Queen Hunt

**Décision :** les deux formules.

- **Contrats de ruche :** une ruche choisie sur la carte galactique, en trois tailles *(valeurs proposées)* :

| Taille | Contenu | Temps | Récompense |
| --- | --- | --- | --- |
| Petite | drones, facehuggers, une reine jeune | 10 min | 400 d'honneur, crâne de reine, chitine |
| Moyenne | + guerriers, un praetorien | 18 min | 700, crâne, chitine et acide figé |
| Grande | + variantes de la planète hôte, deux praetoriens, reine adulte | 25 min | 1 100, crâne, matériaux rares |

- **Descente :** une ruche sans fin par paliers ; le joueur remonte quand il veut et garde ce qu'il rapporte ; une reine tous les 5 paliers ; classement en ligne au palier atteint *(proposé)*.
- Les ruches écrites des étapes de rang (3 pour Clan Leader, 5 pour Adjudicator) restent à part ; seules elles comptent pour les rangs.

### Missions du Warp

**Décision :** les trois formes à la suite, pour chaque époque (W-01 → W-05 et la branche XVIIIe siècle de Greyback) :

1. **Mini-arc d'arrivée** (2 à 3 missions) : ouverture du portail, repérage, traque.
2. **Chasse complète** sur le modèle des 8 chasses de la Longue Chasse : 6 secteurs, un champion humain en boss, un trophée unique.
3. **Contrats rejouables** : une fois l'époque terminée, elle donne des chasses procédurales.

**Règle canon :** les héros des films restent en vie, car le canon les fait survivre à leur Yautja — Ursa (841), Kenji (1629), Torres (1942), Naru (1719). Le joueur peut les croiser, pas les tuer ; les champions des chasses sont d'autres guerriers *(proposés)*.

**Discrétion temporelle — décision :** laisser de la technologie ou des témoins est une infraction du code (perte d'honneur) et produit des **échos** dans les époques suivantes *(exemples proposés : une saga viking parle d'un démon invisible ; un armurier japonais copie une lame de poignet abandonnée ; en 1942, une unité connaît déjà la vision thermique de la légende)*. Un écho rend la chasse de l'époque suivante plus difficile (proies prévenues, pièges adaptés).

### Héritage vers la partie suivante

**Décision :** les quatre, après le sacrifice ou une mort en hardcore.

- **Masque au mausolée :** visible et visitable dans la cité de la partie suivante (Mausolée des Chasseurs, CITY-23 ; système existant `systems/mausoleum.ts`).
- **Une arme léguée :** le joueur la choisit avant la fin ; son descendant la trouve aux Archives des Lignées (CITY-13) et peut la porter quand son rang le permet *(proposé)*.
- **Nom dans les légendes :** les PNJ citent l'ancien Yautja ; une quête de lignée suit ses trophées et ses lieux *(proposé : 3 missions)*.
- **Bonus de départ *(valeurs proposées)* :** 100 d'honneur et une réputation « descendant de » qui change quelques dialogues ; aucun rang n'est donné. Une fin Bad Blood BB-E2 ne transmet que la légende, sans masque.

### Espace : carte galactique et exploration

**Décision :** on garde ce qui existe et on l'améliore selon l'échelle : routes et événements de route entre systèmes, vol libre dans un système avec événements et rencontres sur la carte.

**Ce qui existe dans le dépôt :** une carte à cinq niveaux (galaxie → secteur → système → planète → mission) avec 5 secteurs, 12 systèmes et environ 60 corps célestes (`galaxyRegistry.ts`) ; vol manuel et pilote automatique (`galaxyFlight.ts`) ; une rencontre spatiale du navire de clan au tour par tour (interception, escorte, récupération ; 9 ordres ; `clanShipSpaceEncounter.ts`). Le classeur V6 ajoute 10 bases spatiales, 36 incidents de route (SPACE-E01 → E36) et 24 manœuvres de vol (FLIGHT5-01 → 24).

| Échelle | Déplacement | Ce qui peut arriver |
| --- | --- | --- |
| Galaxie et secteur | par **routes** tracées entre systèmes ; chaque trajet consomme du temps (lié aux ellipses) | un **incident de route** tiré parmi les 36 du V6, selon le type de route ; escales aux 10 bases spatiales |
| Système | **vol libre** (vol manuel existant) | événements posés sur la carte et rencontres (ci-dessous) |
| Planète | descente, puis scan | lieux annexes découverts sur place (décision déjà prise) |

**Types de route** *(proposés)* :

| Route | Risque | Incidents et rencontres typiques |
| --- | --- | --- |
| route de clan | faible | contrôles, escortes, messages de clan, convois de guerre |
| route humaine (commerce, colonies) | moyen | cargos Weyland-Yutani, patrouilles, épaves récentes, équipes de chasseurs humains |
| route sauvage | élevé | ceintures de débris, faune spatiale, vaisseaux contaminés par des Xénomorphes |
| route interdite | très élevé | anomalies, Rogue Space Tribe, Bad Bloods, échos du Warp |

**Événements dans un système** *(proposés)* : signaux de détresse, épaves à fouiller, vaisseau humain à suivre sans être vu, ruche orbitale, tempête stellaire, champ de débris, navire de clan rival, Bad Blood en fuite, sonde à récupérer. Une rencontre se règle de trois façons : éviter (camouflage du vaisseau, manœuvres V5), combattre (le combat spatial au tour par tour existant, étendu au vaisseau personnel en version à 3 membres d'équipage), ou aborder (mission courte en 2,5D à l'intérieur du vaisseau abordé).

*(proposé)* Fréquence : un incident pour deux trajets sur route de clan, un par trajet sur route sauvage ou interdite ; 2 à 4 événements visibles par système, renouvelés à chaque ellipse.

### Chiens de chasse : commandes

**Décision :** quatre ordres et un lien qui monte avec les chasses, sur le modèle du « Lien des montures » du V6 (lien de 0 à 100, seuils 25 / 50 / 75 / 100, gain maximal de 5 par séance).

| Lien | Ordre débloqué *(répartition proposée)* |
| --- | --- |
| 0 | **Revenir** (rappel) |
| 25 | **Pister** : suit la trace la plus fraîche et la marque |
| 50 | **Rabattre** : pousse la proie vers le joueur ou un piège |
| 75 | **Attaquer** : immobilise ou abat la proie désignée |
| 100 | ordre signature propre à la race du chien *(à définir)* |

Un chien blessé se soigne au Chenil des Pisteurs (CITY-28). Il suit la règle de mort définitive des compagnons. Une mise à mort faite par le chien compte comme faite par le joueur pour le code d'honneur *(proposé)*.

### Montures

**Décision :** les 16 montures du classeur V6 (MOUNT-01 → 16, liées aux régions) servent à traverser le monde natal et les sentiers de frontière ; certaines planètes de chasse ont leur monture locale à apprivoiser ; les montures servent aussi au combat.

- **Traversée :** lien de 0 à 100 avec les seuils du V6 (25 déplacement en main, 50 monté, 75 charge, 100 manœuvre propre au terrain).
- **Planètes *(proposé)* :** une monture locale par planète de chasse qui s'y prête, apprivoisée sur place ; elle ne quitte pas sa planète sans habitat adapté au navire (règle V6 : « les visites à d'autres biomes demandent un habitat adapté »).
- **Combat *(proposé)* :** au seuil 75 (charge), charge montée en chasse ; dans l'arc de guerre, unités montées en escarmouche et en phase RTS.

### Trophées : usages

**Décision :** un trophée a les quatre usages, dans le cadre des règles du V6 (un original unique à un seul emplacement, provenance complète, 12 familles TR-F01 → F12, 16 postes d'atelier).

- **Prestige :** exposé à la maison, à la base ou au navire, il monte le respect de la communauté (0 à 100, règle HOME-R02).
- **Porté :** sur l'armure, bonus et réaction des proies (décidé dans *Équipement et IA*).
- **Échange :** cédé à un autre clan contre une faveur ou des matériaux ; l'original quitte alors la collection du joueur.
- **Révélation :** étudié à l'atelier (onglet V6 « Révélations des objets »), il ouvre une piste : quête, époque du Warp ou lieu caché.

*(proposé)* Un même trophée ne fait qu'un usage à la fois : exposé ou porté ; une fois échangé, il ne peut plus être étudié.

### Ancrage du joueur et planète réserve

**Décision :** l'Ancrage du joueur (V6 SPACE-BASE-10, base à aménager) s'obtient à Elite : salle des trophées, atelier, chenil, quai. Il devient ensuite le port d'attache du navire de clan. Plus tard, le joueur acquiert sa propre planète réserve, reliée à l'Ancrage : c'est la réserve de fin de jeu déjà décidée (modèle de la planète-réserve des Super Predators, *Predators*, 2010).

*(proposé)* Acquisition de la planète : à Clan Leader, par une mission de prise de possession (nettoyer une planète découverte, puis y poser les balises de réserve). Le joueur y lâche les proies capturées en chasse ; elle alimente les arènes de Warlord et peut être attaquée par des intrus (humains, Bad Bloods, clans rivaux).

### Résidence

**Décision :** le joueur a sa première maison à Blooded, dans la communauté de son clan d'origine ; il peut déménager ensuite selon les règles du V6 (une seule résidence active parmi les 20, objets transportés par le joueur, droit d'aménager au deuxième seuil de respect). Avant Blooded, il vit au camp du pack (L-01).

### Arc de guerre des clans *(missions proposées)*

**Décision :** le conflit commence par un terrain de chasse disputé (canon : plusieurs clans se disputent les meilleurs sites, *Aliens vs. Predator: War*), et son déclencheur dépend de la voie de clan.

| # | Mission | Déroulé | Forme |
| --- | --- | --- | --- |
| G-1 | Le terrain disputé | le clan rival (Super Predators pour un joueur classique, selon la race sinon) pose ses balises sur un monde-terrain du clan ; première rencontre sur place | chasse 2,5D |
| G-2 | L'étincelle | selon la voie : Défi → les fidèles de l'ancien chef rejoignent le rival ; Succession → un Élite évincé passe à l'ennemi ; Fondation → le clan d'origine attaque le nouveau clan | scène + chasse |
| G-3 | La parole des Temple Guards | les Temple Guards proposent une médiation ; le joueur peut obtenir une trêve partielle ou la refuser | dialogue + duel limité |
| G-4 | Le dépôt | raid sur le ravitaillement adverse : phase RTS sur la carte, puis infiltration en 2,5D | RTS + chasse |
| G-5 | Les murs de la cité | le rival assiège la cité du joueur ; défense des quartiers et des chenils | mêlée 2,5D |
| G-6 | Le siège | le joueur mène l'assaut sur la cité rivale | RTS + mêlée |
| G-7 | Le duel des chefs | duel sanctionné dans The Pit entre le joueur et le chef rival | The Pit |
| G-8 | L'arbitrage des Matriarches | les Matriarches fixent les termes : partage du terrain, exil du vaincu ou alliance ; puis le mode libre s'ouvre | scène + choix |

Musique : MUS-45, MUS-46, MUS-26 (duel), MUS-08 (arbitrage).

### Figures canon en personnages secondaires

**Décision :** les figures canon apparaissent comme alliés, rivaux ou donneurs de missions ; jamais jouées, jamais tuées hors de ce que leur canon montre. *(Rôles proposés.)*

| Figure | Canon | Rôle dans la campagne |
| --- | --- | --- |
| Greyback | Ancien de la Lost Tribe ; sur Terre au XVIIIe siècle puis en 1997 (bio NECA) | donne la piste du XVIIIe siècle dans l'arc Warp ; témoin du procès d'Armored Lost |
| Armored Lost, Spiked Tail, Lasershot | Rogue Space Tribe (bios NECA) | arc Warp, voie Bad Blood, cibles de la voie Enforcer |
| Viper | chef du Serpent Clan, mercenaires des chasses aux Xénomorphes et des guerres de clans, aide les Enforcers contre immunité (bio NECA) | allié d'Enforcer ; mercenaire possible dans l'arc de guerre |
| Spartan | chef du clan de Dark, *AVP* (2010) | invité qui observe les rites Elite du joueur |
| Wolf | Elite Cleaner, *AVP: Requiem* | mentor de la fonction Cleaner |
| L'Ancien d'AVP 2004 | remet sa lance à Lex | apparaît dans la chronique cinéma et dans les « après-coups » de l'île Bouvet |
| Machiko Noguchi | humaine acceptée dans un clan (*Hunter's Planet*) | rencontre possible dans une branche Warp |
| Njohrr, Dek | *Predator: Badlands* | clins d'œil seulement (décision O1) |

Sources : [équipes humaines qui chassent les Predators](https://avpcentral.com/predator-hunter-teams).

### Crossover : USS Tantalus

Source : la bible de campagne d'*Aliens: Tantalus Frontier* (dépôt `darknigthmare/aliens-tantalus-frontier`, `docs/narrative/CAMPAGNE_PRINCIPALE.md`). Le vaisseau s'y écrit **USS Tantalus**.

**Ce que dit cette bible :** en 2204, dans le Tantalus Reach, l'USS *Tantalus* (Marines coloniaux) enquête sur un trafic d'organismes vivants de Weyland-Yutani transitant par le réseau de relais QZ de Lethe. La station Asphodèle, en orbite, est silencieuse depuis des mois : un conteneur QZ17 s'est ouvert dans son laboratoire, l'intelligence CASSIUS maintient la quarantaine, l'Echo-8 a barricadé les survivants dans les ponts inférieurs puis a disparu. Sa plaque est retrouvée, jamais son corps.

**Mission annexe *(proposée)* : « Le silence d'Asphodèle »**

- **Accès :** Blooded ou plus, vaisseau personnel ; événement spatial (signal de ruche capté dans le Tantalus Reach). Pour respecter 2204, l'événement s'ouvre dans la chronologie du jeu, ou par une branche Warp si l'époque du jeu est différente.
- **Déroulé :** le chasseur aborde Asphodèle par l'anneau extérieur, avant l'arrivée du *Tantalus*. Il chasse les Xénomorphes nés du conteneur dans les ponts inférieurs, en restant caché des récupérateurs Crucible et de CASSIUS. Il trouve l'Echo-8 mourant ou mort au combat contre les Xénomorphes.
- **Choix d'honneur :** l'Echo-8 a combattu en guerrier ; le chasseur peut emporter son corps pour lui rendre honneur (ce qui explique, côté *Tantalus*, qu'on ne retrouve que la plaque), ou le laisser avec une marque d'honneur gravée, comme l'Ancien d'AVP 2004 honore Lex. Le prendre comme trophée est une infraction : il n'a pas été tué par le joueur.
- **Voie Bad Blood :** la Rogue Space Tribe chasse les IA ; elle peut proposer de « chasser » CASSIUS (cœur de la station comme trophée).
- **Sortie :** le chasseur part au moment où le *Tantalus* approche ; les Marines trouvent les traces sans comprendre.
- **Lien retour dans *Tantalus Frontier* :** l'annexe `station-a-echo8` peut montrer la marque yautja ou l'absence du corps, en clin d'œil.

*Production (proposé)* — **Props :** anneau extérieur, pont de contrôle, laboratoire, berceaux QZ17, barricades de l'Echo-8 (réutiliser les assets de *Tantalus Frontier* si les licences des deux dépôts le permettent). **SFX :** alarme de quarantaine, voix de CASSIUS, détecteur de mouvement des Marines. **Musique :** MUS-41.

**À décider :** rien. Décisions du 6 novembre : 2204 s'atteint par le Warp (époque future) ; le sort de l'Echo-8 est le choix du joueur (emporté pour l'honorer, ce qui colle à « plaque retrouvée, jamais le corps », ou laissé avec une marque gravée). À reporter dans le point ouvert n°5 de la bible *Tantalus* (« le fil Echo-8 est-il conservé ? »).

## Acte I — Youngling (R2-M001 → M006)

L'enfance dans la cour, la cité et les premiers ateliers ; l'acte se termine au rang Unblooded. Aucune fiche n'est jouable telle quelle ; V47 (nurserie) et V48 (dojo, accueil) jouent une enfance différente.

### R2-M001 — Pourquoi nous combattons

**Entrée :** nouvelle partie, voie choisie, aucune victoire préalable. **Déroulé :** la cohorte doit déplacer une proie d’exercice hors d’un passage de service. Un loquet cède et la bête atteint la cour. Le joueur prend un outil factice, protège la sortie d’un camarade et repousse l’animal vers le filet avec Saar.

- **Choix :** privilégier l’appât ou le déplacement du filet change le premier geste appris.
- **Échec et reprise :** une défaite déclenche le secours visible de l’instructeur puis un exercice de reprise.
- **Sauvegarde :** `prologue.openingResolved ; prologue.openingSuccess distinct`

*Production (proposé)* — **Props :** cour d'exercice clôturée, porte de passage de service, loquet cassable (états fermé / cassé), filet tendu sur portique (états ouvert / plein), outil factice en bois, appât de viande, proie d'exercice (sprite bête juvénile, 4 animations : marche, charge, recul, prise au filet), Saar en instructeur. **VFX :** poussière au sol à chaque charge, éclats du loquet, filet qui se tend et vibre, flash blanc bref au coup réussi. **SFX :** `latch-break`, `beast-growl`, `beast-charge`, `net-snap`, `crowd-cohort`, hit (existe), footstep (existe). **Musique :** MUS-10 pendant l'incident, MUS-09 au retour au calme.

### R2-M002 — Le filet et les visages

**Entrée :** R2-M001 résolue. **Déroulé :** le joueur récupère son outil, ferme une petite barrière et rejoint les camarades au bord du filet. Saar vérifie chacun ; la caméra présente Harek, Yena et Tov par leurs actions. Un court échange relie le stress du combat aux attentes de formation.

- **Choix :** revoir le mouvement raté ou aider un camarade à ranger le matériel modifie les liens initiaux.
- **Échec et reprise :** une interaction sautée reste accessible dans la cour après le dialogue principal.
- **Sauvegarde :** `prologue.cohortIntroduced`

*Production (proposé)* — **Props :** petite barrière (ouverte / fermée), râtelier d'outils d'enfance, caisses de matériel, bord du filet ; personnages Saar, Harek, Yena, Tov (sprites + portraits de dialogue). **VFX :** marqueur d'interaction au-dessus des camarades, légère poussière retombante. **SFX :** `gate-wood`, `tool-rack`, voix de cohorte (cliquetis courts par personnage), ui (existe). **Musique :** MUS-09.

### R2-M003 — Le chemin vers la cité

**Entrée :** R2-M002 résolue, porte de la cour ouverte. **Déroulé :** Saar guide les jeunes par une passerelle, une rue d’ateliers et une place animée. Le joueur porte une pièce au forgeron, contourne une livraison et repère la direction du chenil, de l’archive et du foyer.

- **Choix :** suivre l’instructeur ou regarder un atelier produit des premières rencontres différentes.
- **Échec et reprise :** se perdre mène à des signes et à un camarade au croisement, sans téléportation.
- **Sauvegarde :** `prologue.cityArrival ; visitedLocalPlaces`

*Production (proposé)* — **Props :** passerelle, rue d'ateliers, place animée (décor Homeworld existant), forge avec enclume, pièce à porter, chariot de livraison qui bloque la rue, panneaux-glyphes vers chenil / archive / foyer, carte locale (UI). **VFX :** fumée de forge, étincelles à chaque coup de marteau, surbrillance des lieux découverts sur la carte. **SFX :** `forge-hammer`, `forge-bellows`, `crowd-street`, `cart-wheels`, footstep (existe), select (existe). **Musique :** MUS-04.

### R2-M004 — L’épreuve des trois gestes

**Entrée :** cour et atelier visités. **Déroulé :** trois ateliers font travailler prise, appui et lecture de mouvement. Le joueur attrape un anneau, franchit une poutre puis attend l’ouverture d’une cible à ressort.

- **Choix :** l’ordre des ateliers change quel camarade accompagne chaque exercice.
- **Échec et reprise :** chaque atelier a son point de reprise ; échouer au dernier n’efface pas les deux premiers.
- **Sauvegarde :** `training.childhoodThreeGestures`

*Production (proposé)* — **Props :** anneau suspendu à une chaîne, poutre d'équilibre, cible à ressort (fermée / ouverte), trois postes d'atelier avec bannières distinctes, points de reprise visibles. **VFX :** cercle de réussite au sol, oscillation de l'anneau, éclat de la cible touchée. **SFX :** `ring-chain`, `beam-creak`, `spring-target`, objective (existe), jump (existe). **Musique :** MUS-11.

### R2-M005 — La piste avant la prise

**Entrée :** R2-M004 résolue, réserve d’exercice autorisée. **Déroulé :** suivre une petite proie sans attaquer. Le joueur compare empreintes, branches et sons, atteint un perchoir puis revient par une autre route. La scène présente observation, carte locale et limite d’un territoire.

- **Choix :** rapporter une carte ou montrer le dernier passage valide deux formes d’observation.
- **Échec et reprise :** une piste perdue reste marquée au dernier point confirmé.
- **Sauvegarde :** `training.firstTrackObserved`

*Production (proposé)* — **Props :** réserve d'exercice (sous-bois du Homeworld), petite proie inoffensive (sprite, animations fuite et broutage), empreintes dans la boue, branches cassées, perchoir en hauteur, borne de limite de territoire, carte locale. **VFX :** empreintes qui s'estompent avec le temps, marqueur du dernier point confirmé, feuilles qui tombent quand la proie passe. **SFX :** `branch-crack`, `prey-chirp`, `leaves-rustle`, scan (existe), footstep (existe). **Musique :** MUS-09 (version calme), aucune musique pendant l'approche finale.

### R2-M006 — Entrer parmi les Unblooded

**Entrée :** R2-M004 et R2-M005 réussies. **Déroulé :** la cohorte revient à l’aire de formation. Chaque jeune montre un geste acquis, range l’outil d’enfance et reçoit l’accès aux ateliers Unblooded. Le joueur franchit physiquement la porte du nouveau râtelier avec Saar.

- **Choix :** le premier atelier choisi fixe l’ordre de découverte, sans changer le rang.
- **Échec et reprise :** un apprentissage incomplet ouvre l’exercice manquant et reporte la cérémonie.
- **Sauvegarde :** `rank.Unblooded=true`

*Production (proposé)* — **Props :** aire de formation, coffre où ranger l'outil d'enfance, porte du râtelier Unblooded (animée), râtelier d'armes d'exercice, braseros cérémoniels. **VFX :** flammes des braseros, halo chaud sur la porte qui s'ouvre. **SFX :** `door-heavy`, `brazier-fire`, `clan-chant-short`, objective (existe). **Musique :** MUS-06.

## Acte II — Unblooded (R2-M007 → M015)

Un outil par fiche (masque, lames, camouflage, combistick, speargun, mines, medicomp), puis une boucle régionale et le rang Young Blood. V68 accorde déjà Young Blood par un autre chemin (cohorte des Aspirants).

### R2-M007 — Le masque et ses lectures

**Entrée :** rang Unblooded, atelier de masque accessible. **Déroulé :** le joueur assemble les attaches du masque d’apprentissage, règle la lecture de cibles et traverse une salle où les surfaces donnent des informations contrastées. L’instructeur demande ce que le masque montre et ce qu’il ne permet pas de conclure.

- **Choix :** contraste confortable ou lecture plus large crée un profil réversible.
- **Échec et reprise :** une calibration ratée revient sur une cible fixe avant le parcours mobile.
- **Sauvegarde :** `gear.maskOwned ; training.mask`

*Production (proposé)* — **Props :** établi de masque, attaches et pièces du masque d'apprentissage (objet d'inventaire), cibles fixes et mobiles, salle à quatre surfaces (pierre, eau, métal chaud, végétal) donnant chacune une lecture différente. **VFX :** filtres de vision du masque (thermique, ciblage), lignes de ciblage, grain d'interférence quand la lecture est ambiguë. **SFX :** mask-on / mask-off (existe), `mask-calibrate` (bips montants), `mask-lock`, scan (existe). **Musique :** MUS-11.

### R2-M008 — La distance des lames

**Entrée :** R2-M007 résolue. **Déroulé :** dans une aire à trois distances, sortir et rentrer les lames de poignet, frapper une cible et reculer avant une contre-attaque mécanique. Un dernier passage oblige à ranger les lames pour franchir une ouverture étroite.

- **Choix :** enchaînement court ou parade suivie de recul ouvre deux exercices avancés.
- **Échec et reprise :** une attaque trop longue rend l’ouverture adverse visible et relance la manche.
- **Sauvegarde :** `gear.wristBladesOwned ; training.wristBlades`

*Production (proposé)* — **Props :** aire à trois distances marquées au sol, cible de lames rembourrée, bras de contre-attaque mécanique télégraphié, ouverture étroite à franchir lames rentrées. **VFX :** traînée de lame, étincelle sur le bras mécanique, zone rouge pendant le télégraphe. **SFX :** `wristblade-out`, `wristblade-in`, slash (existe), `mech-arm-swing`, hit (existe). **Musique :** MUS-11.

### R2-M009 — Ce que le camouflage laisse voir

**Entrée :** masque reçu, aire de camouflage ouverte. **Déroulé :** activer le camouflage, traverser une flaque puis observer sa propre trace sur un écran d’exercice. Reprendre par des pierres, des feuilles et une corniche : bruit et décor déplacé restent perceptibles.

- **Choix :** attente immobile ou détour vertical.
- **Échec et reprise :** une détection ramène au dernier couvert et indique sa cause.
- **Sauvegarde :** `gear.cloakOwned ; training.cloak`

*Production (proposé)* — **Props :** flaque, écran d'exercice montrant la trace du joueur, pierres instables, tas de feuilles, corniche, couverts numérotés. **VFX :** distorsion du camouflage, ondulation dans l'eau, empreinte lumineuse sur l'écran, feuilles déplacées qui restent visibles. **SFX :** cloak-on / cloak-off (existe), `water-splash-small`, `leaves-rustle`, `stone-shift`, enemy-alert (existe) à la détection. **Musique :** MUS-11, coupée pendant l'attente immobile.

### R2-M010 — Le combistick revient à la main

**Entrée :** atelier d’armes et R2-M008 résolus. **Déroulé :** tester le combistick replié, déployé puis lancé. La cible se déplace après le lancer : il faut franchir un passage et récupérer réellement l’arme.

- **Choix :** approche de portée ou risque du lancer change le parcours final.
- **Échec et reprise :** un lancer hors cible reste récupérable par une route d’exercice.
- **Sauvegarde :** `gear.combistickOwned ; training.combistick`

*Production (proposé)* — **Props :** combistick d'exercice (replié, déployé, planté au sol), cible mobile sur rail, passage à franchir pour récupérer l'arme, râtelier vide. **VFX :** traînée du lancer, éclat d'impact, icône de l'arme au sol vue à travers le décor. **SFX :** `combistick-extend`, `combistick-throw`, `combistick-impact`, `combistick-pickup`. **Musique :** MUS-11.

### R2-M011 — Le tir qui demande une ligne

**Entrée :** masque et réserve d’exercice disponibles. **Déroulé :** speargun sur des cibles de tailles différentes derrière des obstacles. Le joueur règle sa position, voit la ligne coupée par une couverture et choisit un point d’attente. Le dernier tir vise une cible qui change de niveau.

- **Choix :** attendre une ouverture ou déplacer son poste.
- **Échec et reprise :** une munition manquée se récupère dans la zone prévue.
- **Sauvegarde :** `gear.speargunOwned ; training.speargun`

*Production (proposé)* — **Props :** speargun (objet d'inventaire), harpons d'exercice récupérables, cibles de trois tailles, couvertures qui coupent la ligne, cible sur ascenseur changeant de niveau, zone de récupération des harpons. **VFX :** ligne de visée (coupée en rouge par un obstacle), impact de harpon, harpon planté visible. **SFX :** `speargun-fire`, `speargun-reload`, `spear-impact-wood`, `spear-impact-metal`, `lift-target`. **Musique :** MUS-11.

### R2-M012 — Le piège et le retour

**Entrée :** formation de portée résolue, aire de mines autorisée. **Déroulé :** placer une mine d’exercice, délimiter son rayon et faire passer une cible mécanique, puis rejoindre l’autre côté sans oublier son dispositif. Un mannequin allié oblige à prévoir un corridor lisible.

- **Choix :** bloquer un couloir ou orienter un détour.
- **Échec et reprise :** un placement dangereux arrête l’essai et montre la trajectoire ; la mine peut être déplacée.
- **Sauvegarde :** `gear.minesAccess ; training.mines`

*Production (proposé)* — **Props :** mine d'exercice (posée, armée, déclenchée), marquage du rayon, cible mécanique roulante, mannequin allié sur trajet fixe, corridor balisé. **VFX :** cercle de rayon au sol, clignotement d'armement, petite détonation de peinture, trajectoire fantôme de l'allié en cas d'erreur. **SFX :** `mine-place`, `mine-arm`, `mine-trigger`, snare (existe). **Musique :** MUS-11.

### R2-M013 — Le soin dans un abri

**Entrée :** medicomp d’apprentissage reçu. **Déroulé :** rejoindre une alcôve, fermer un écran de protection et utiliser le medicomp. Une alerte extérieure oblige à distinguer repos, interruption et reprise.

- **Choix :** préparer d’abord la sortie ou terminer le soin modifie temps et exposition.
- **Échec et reprise :** une interruption conserve les étapes validées et les charges dépensées.
- **Sauvegarde :** `gear.medicompOwned ; training.medicomp`

*Production (proposé)* — **Props :** alcôve, écran de protection coulissant, medicomp (objet d'inventaire, 3 charges), signal d'alerte extérieure (lampe), indicateur de phase de soin. **VFX :** flash du medicomp, vapeur antiseptique, lampe d'alerte qui pulse, contour du personnage qui passe du rouge au normal. **SFX :** medicomp (existe), `screen-slide`, `alert-outside`, `heal-hiss`. **Musique :** aucune pendant le soin ; MUS-11 après.

### R2-M014 — La boucle des régions proches

**Entrée :** R2-M007 → M013 résolues. **Déroulé :** un circuit sur le Homeworld traverse désert, forêt et quartier de bordure. Le joueur choisit des passages adaptés à ses outils, observe une proie et revient rendre un objet prêté. Chaque région a une halte et une issue de repli.

- **Choix :** route haute ou route abritée change ressources et rencontres.
- **Échec et reprise :** un secteur trop difficile se quitte par sa halte.
- **Sauvegarde :** `training.regionalLoop ; localAccess`

*Production (proposé)* — **Props :** circuit en trois régions (désert, forêt, quartier de bordure) reprenant les décors Homeworld, trois haltes (abri, eau, repère), objet prêté (bourse d'outils), route haute et route abritée par région, proie observée (brouteur original déjà utilisé en V52). **VFX :** chaleur ondulante au désert, pluie fine en forêt, fumées de quartier. **SFX :** ambiances `amb-hw-desert`, `amb-hw-forest`, `amb-hw-outskirts`, footstep (existe). **Musique :** MUS-04.

### R2-M015 — Recevoir la place de Young Blood

**Entrée :** formation d’outils et circuit validés. **Déroulé :** présenter une lecture de piste, une maîtrise d’outil et une décision de repli. Les instructeurs nomment la responsabilité nouvelle et ouvrent les préparatifs de triade.

- **Choix :** le premier partenaire de répétition change une relation.
- **Échec et reprise :** une compétence non validée renvoie à son atelier précis.
- **Sauvegarde :** `rank.YoungBlood=true`

*Production (proposé)* — **Props :** cercle des instructeurs, trois socles de démonstration (piste, outil, repli), bannière Young Blood, porte vers les préparatifs de triade. **VFX :** halo de cérémonie, braises qui montent. **SFX :** `clan-chant-short`, `drum-ritual`, objective (existe). **Musique :** MUS-06.

## Acte III — Young Blood (R2-M016 → M020)

La triade, le Temple des Trois Ombres et le Quatza-Rij mènent au rang Blooded. Existent : l'acte I du temple (9 salles, V70) et un entraînement de triade (V90, V92). Le rite, le retour et la marque restent à faire.

### R2-M016 — Former la triade

**Entrée :** Young Blood, au moins deux partenaires disponibles. **Déroulé :** rencontrer les partenaires dans leurs activités, observer leur style, composer une triade réellement présente. Une répétition de signaux sur trois plateformes montre les rôles d’approche, d’ouverture et de frappe.

- **Choix :** rôles par préférence ou par complémentarité.
- **Échec et reprise :** un refus laisse d’autres partenaires ou une mission de préparation.
- **Sauvegarde :** `rite.triadRoster ; rite.triadPrepared`
- **Existant :** V68 (cohorte, Saar et Vek), V90 (préparation de triade, 3 440 unités de galerie).

*Production (proposé)* — **Props :** trois plateformes de signaux (approche, ouverture, frappe) avec glyphes de rôle, lieux d'activité des partenaires (forge, piste, arène), tableau de composition de la triade (UI). **VFX :** signal lumineux par rôle (ambre, cyan, rouge), trait reliant les trois plateformes quand la répétition réussit. **SFX :** `signal-approach`, `signal-open`, `signal-strike`, select (existe). **Musique :** MUS-12.

### R2-M017 — Le Temple des Trois Ombres

**Entrée :** triade préparée, équipement du rite vérifié. **Déroulé :** ranger les armes énergétiques exclues. Le temple déploie passerelles, volets et chambres variables ; des signes annoncent leurs mouvements. La triade doit atteindre ensemble le seuil de chasse.

- **Choix :** route de hauteur ou route de mécanismes.
- **Échec et reprise :** une séparation ouvre des mécanismes de regroupement, sans réinitialiser le temple.
- **Sauvegarde :** `rite.templeConfiguration ; rite.templeThresholdReached`
- **Existant :** V69 (Seuils du Premier Sang), V70 acte I : Marches des Trois, Vestibule des Serments, Tribune des Signes, Arsenal des Épreuves, Belvédère Fracturé, Puits des Contrepoids, Camp des Intrus, Nef des Anneaux, Vanne de Quarantaine. **Manquant (notes V70) :** six salles profondes, reine, œufs, purge, chasses qualifiantes.

*Production (proposé)* — **Props :** râtelier où déposer les armes énergétiques, passerelles mobiles, volets pivotants, chambres à configuration variable, glyphes annonçant le prochain mouvement, mécanismes de regroupement (leviers à deux mains). **VFX :** poussière qui tombe avant chaque déplacement, glyphe qui s'allume 2 s avant, secousse de caméra. **SFX :** `stone-grind`, `gear-tick`, `door-stone-close`, `glyph-hum`. **Musique :** MUS-13.

### R2-M018 — Le Quatza-Rij à trois

**Entrée :** R2-M017 réussie, triade présente. **Déroulé :** la triade affronte l’épreuve Quatza-Rij dans le temple. Lire la cible, ouvrir une fenêtre avec les partenaires, choisir quand poursuivre ou se replier. Les contributions de chacun sont enregistrées.

- **Choix :** ouverture risquée ou fenêtre plus sûre modifie blessures, ressources et récit.
- **Échec et reprise :** extraction ou repli cohérent, pertes persistantes, nouvelle préparation.
- **Sauvegarde :** `rite.quatzaTriadSuccess` uniquement en cas de réussite

*Production (proposé)* — **Props :** salle d'épreuve avec piliers et issue de repli, cible Quatza-Rij (sprite à produire : 8 animations minimum — attente, rampe, bond, griffe, queue, acide, blessure, mort), corps et trophée prélevable. **VFX :** sang acide vert qui ronge le sol, étincelles de lames, vapeur d'acide, marqueur de fenêtre d'ouverture créée par un partenaire. **SFX :** `xeno-hiss`, `xeno-screech`, `acid-sizzle`, hit / slash (existe), `partner-call`. **Musique :** MUS-14.

### R2-M019 — Revenir avec la triade

**Entrée :** rite tenté, état des participants connu. **Déroulé :** sortie du temple, trajet de retour et arrivée devant les témoins sont joués. Le joueur porte ce qui a été obtenu, aide les blessés et rapporte une absence éventuelle.

- **Choix :** présenter d’abord les partenaires ou la preuve de chasse.
- **Échec et reprise :** une évacuation incomplète ouvre une mission de secours.
- **Sauvegarde :** `rite.recognitionReturn ; rite.returnRoster`

*Production (proposé)* — **Props :** sortie du temple, chemin de retour, témoins du clan, civière pour un partenaire blessé, trophée porté ou absent. **VFX :** aube sur la cité, poussière soulevée par le groupe. **SFX :** `crowd-witness`, `stretcher-carry`, footstep (existe). **Musique :** MUS-15.

### R2-M020 — Porter la marque Blooded

**Entrée :** Quatza-Rij réussi, retour validé. **Déroulé :** cérémonie locale, geste de marquage, outils de rite rendus, accès aux démarches de vaisseau. Le jeu montre ce qui change dans la cité.

- **Choix :** célébration de cohorte ou visite calme.
- **Échec et reprise :** un retour manquant reporte le marquage.
- **Sauvegarde :** `rank.Blooded=true`

*Production (proposé)* — **Props :** lieu de cérémonie, outil de marquage, râtelier où rendre les outils de rite, marque Blooded sur le masque du joueur (nouvelle variante d'apparence). **VFX :** marque qui grésille et fume, braises montantes. **SFX :** `mark-sizzle`, `clan-chant-long`, `drum-ritual`. **Musique :** MUS-07.

## Acte IV — Blooded : le vaisseau (R2-M021 → M023)

Acquisition de la coque, préparation des 8 salles, premier trajet. V87 → V89 couvrent la remise et la préparation ; selon leurs notes, la remise de droits R2-M021 reste ouverte et le trajet R2-M023 n'est pas joué.

### R2-M021 — Une coque vraiment acquise

**Entrée :** Blooded, moyens et accord réunis. **Déroulé :** inspecter une coque, traverser le hangar, tester le sas et participer à une remise en état. L’acquisition passe par la remise des droits et l’entrée dans le navire.

- **Choix :** coque de mobilité ou d’autonomie.
- **Échec et reprise :** un défaut impose une réparation ciblée, travaux conservés.
- **Sauvegarde :** `ship.personalOwned ; ship.personalId`
- **Existant :** `shipCampaignOperationsV87.ts`, `shipAcquisitionV89.ts`, `ShipAcquisitionV89.tsx`.

*Production (proposé)* — **Props :** hangar, deux coques au choix (mobilité / autonomie), sas fonctionnel, outils de remise en état, plaque de droits remise au joueur. **VFX :** étincelles de soudure, vapeur du sas, lumières du hangar qui s'allument. **SFX :** `airlock-cycle`, `weld-loop`, `hangar-ambience`. **Musique :** MUS-02 (version pleine).

### R2-M022 — Huit salles pour préparer la route

**Entrée :** vaisseau acquis. **Déroulé :** carte galactique, armurerie, archives, forge d’apparence, galerie, infirmerie, arène et sas ; chaque pièce demande un geste utile (ranger, régler, inspecter, préparer).

- **Choix :** chasse courte ou trajet avec escale change le chargement.
- **Échec et reprise :** une préparation oubliée apparaît au contrôle du sas.
- **Sauvegarde :** `ship.firstInteriorTour ; ship.preflightReady`
- **Existant :** `shipPreparationV88.ts`, `ShipPreparationPanelV88.tsx` ; vaisseau modulaire V21/V22 (8 salles sur deux ponts).

*Production (proposé)* — **Props :** équipements des 8 salles (table de carte, râteliers, consoles d'archives, miroir de forge, vitrines de galerie, couchette médicale, arène d'entraînement, sas), caisses de chargement à ranger. **VFX :** hologrammes de carte, écrans d'archives. **SFX :** ambiance vaisseau (existe), ui / select (existe), `crate-stow`, `console-beep`. **Musique :** MUS-02.

### R2-M023 — Le premier trajet entre les mondes

**Entrée :** vaisseau possédé, prévol validé. **Déroulé :** choisir une route, traverser le sas, lancer le départ et suivre une navigation avec repères. Une base demande orientation, vitesse relative et amarrage, puis le joueur sort sur un quai chargé.

- **Choix :** escale prévue ou route directe.
- **Échec et reprise :** un amarrage raté revient à une zone d’attente sûre.
- **Sauvegarde :** `travel.firstInterstellarComplete ; visitedDestination`

*Production (proposé)* — **Props :** poste de pilotage, repères de navigation (balises), base d'approche avec quai, zone d'attente sûre, quai chargé (caisses, dockers). **VFX :** propulsion, saut avec étoiles en traînée, guides d'amarrage. **SFX :** `ship-launch`, `engine-loop`, `jump-whoosh`, `docking-clamp`. **Musique :** MUS-03.

## Acte V — La Longue Chasse (R2-M024.1 → .8)

Huit chasses jouables enchaînées : chacune exige la précédente, et la huitième ouvre le rite Elder. Fil rouge : le transpondeur de Vey mène à la glace, sa balise au Paria, puis ses archives (fragments, glyphes, graines-mémoires) jusqu'à la cité d'Acheron-Sigma.

**Socle commun (vérifié dans le code).** Monde de 8 400 px en 6 secteurs ; 4 routes (sol, route haute, route à risque, « Passages hauts » V112) ; 4 emplacements de pièges ; 6 couverts ; roster écologique de 30 espèces par planète tirées dans les vagues ; boss en 3 phases ; trophée Apex puis extraction. Les chasses 4 à 8 suivent la même structure : 3 scans → 6 éliminations et 2 récupérations → boss → extraction, vagues 5 / 4 / 3.

**À lire avant les fiches.** Les noms de son par secteur (`pluie-fine-eau-insectes`…) sont des repères dans `worldScreens.ts` : aucun fichier audio d'ambiance planétaire ni aucune musique n'existe dans `public/audio/`. Les dangers sont dessinés comme un rectangle coloré pulsant (`HuntCanvas.tsx`, `hazardColor`) : aucun VFX de particules dédié. D'après l'audit de continuité du 31 août, une partie des comportements décrits dans les phases de boss n'est pas simulée ; c'est indiqué par chasse.

### R2-M024.1 — Sang dans la canopée · Oseris-IV (jungle)

**Cible :** Commandante Vey, humaine, 600 PV. **Menace :** 3. **Temps de référence :** 10 min. **Prérequis :** aucun. **Conseillé :** armure Hunter, combistick + plasma caster.

**Briefing :** une unité armée a récupéré un transpondeur Yautja et l'utilise pour tendre des embuscades. Étudier ses éclaireurs, reprendre la technologie, affronter la commandante.

| # | Secteur | Objectif | Ambiance |
| --- | --- | --- | --- |
| 1 | Lisière des eaux noires | Étudier l'avant-garde | pluie chaude, reflets sur le lac |
| 2 | Canopée des guetteurs | Étudier l'avant-garde | patrouille entre les feuilles |
| 3 | Ruines du transpondeur | Reprendre le transpondeur | pierres cyclopéennes, balises rouges |
| 4 | Lac des traques croisées | — | l'eau coupe les pistes |
| 5 | Camp avancé de Vey | — | projecteurs, bâches, défenses anti-camouflage |
| 6 | Clairière de l'orage | Affronter Vey, extraire | arène de pluie et de fusées |

- **Routes :** sous-bois et camp de Vey ; canopée silencieuse (grimpe) ; tranchée inondée (masque, danger cyclique). **Dangers :** boue profonde, flore prédatrice, crue éclair.
- **Vagues :** 4 fusiliers au départ ; 3 éclaireurs après le scan ; 2 lourds après le transpondeur.
- **Boss :** Contre-chasse (couverture, rafales, camouflage de boue) → 65 % Dernier carré (2 gardes) → 30 % Guerrière acculée (duel, tir lourd = perte d'honneur). Attaques : rafale, fusée révélatrice, couteau.
- **Honneur :** connaître sa proie ; ne laisser aucune technologie ; puissance mesurée. **Trophée :** Insigne de Vey.
- **Suite :** un appel de détresse sous la glace mène à Nivalis-K.
- **Existant :** sprite `v4/commandante-vey.png`, décors V19 jungle 100 / 100, fond `jungle-multiscreen-v6.png`.
- **Manquant :** halo persistant des fusées (aujourd'hui révélation instantanée) ; VFX pluie, éclairs, projecteurs du camp, éclaboussures de boue ; ambiance jungle et orage ; SFX rafale de fusil, fusée, radio, générateur ; musique exploration et boss.

**Comblement Oseris-IV (proposé)**

- **Gameplay :** chaque fusée de Vey pose un halo persistant de 8 s, rayon 260 px, dans le monde ; le camouflage y est révélé et le scan de l'avant-garde indique « porte 4 fusées » (contre-mesure lisible). En phase 2, les rafales de suppression balaient les plateformes basses avec une ligne télégraphiée 0,6 s.
- **VFX :** pluie en deux couches (parallaxe 0,3 et 1,1), éclairs de fond toutes les 9 à 14 s, faisceaux des projecteurs du camp en cône additif, éclaboussures de boue à chaque pas en `deep-mud`, halo de fusée rouge-orangé avec particules qui retombent, crue éclair : vague bleue `#48b2d0` qui progresse de gauche à droite pendant le télégraphe de 1,25 s.
- **SFX :** `amb-jungle-rain` (boucle), `amb-jungle-storm`, `rifle-burst`, `rifle-single`, `flare-launch`, `flare-burn` (boucle), `radio-chatter`, `generator-loop`, `vey-knife`, `vey-shout`, `flora-snap`, `flood-rush`, `mud-step`.
- **Musique :** MUS-21 (secteurs 1 à 5), MUS-37 à la détection, MUS-22 au boss, MUS-38 à l'extraction.

### R2-M024.2 — Chaleur sous la glace · Nivalis-K (glace)

**Cible :** Cryostalker Alpha, bête, 720 PV. **Menace :** 4. **Temps :** 12 min. **Conseillé :** armure Scout, arc + combistick.

**Briefing :** une colonie d'extraction a réveillé un Apex sous la banquise ; sa température imite la glace. Analyser ses traces bioélectriques, éliminer la meute, attirer l'Alpha hors des tunnels.

| # | Secteur | Ambiance |
| --- | --- | --- |
| 1 | Plateau du blizzard | vent horizontal, neige vierge |
| 2 | Faille aux échos | craquements difficiles à localiser |
| 3 | Mine abandonnée | foreuses, lampes mortes |
| 4 | Couloir blanc | visibilité nulle, seules les traces guident |
| 5 | Nid sous-glaciaire | parois qui vibrent avec la meute |
| 6 | Caverne en rupture | plafond qui tombe, balise d'extraction |

- **Routes :** banquise exposée ; galeries glaciaires (grimpe, masque) ; anciennes passerelles minières. **Dangers :** glace fine, blizzard blanc, chute de glace (×2).
- **Vagues :** 4 Cryorunners ; 3 fusiliers récupérateurs après le scan ; 2 brutes après la meute.
- **Boss :** Carapace intacte (charges contre les piliers qui fissurent l'armure) → 55 % Appel de la meute (+2 runners) → 22 % Prédateur blessé (dos exposé, stalactites). Trois plaques réellement cassables.
- **Trophée :** Crâne de Cryostalker. **Suite :** une balise de clan copiée mène au sanctuaire de Cinder-12.
- **Existant :** sprites `v4/cryostalker-runner`, `v4/cryostalker-brute`, `v7/cryostalker-alpha-sheet` ; décors V19 glace 100 / 100.
- **Manquant :** réseau de tunnels (l'état enfoui ne change que mouvement et visibilité) ; calibrage bioélectrique propre au scan ; VFX neige soufflée, whiteout, éclats de carapace, chute de stalactites ; ambiance blizzard et caverne ; SFX craquement de glace, charge, plaque brisée.

**Comblement Nivalis-K (proposé)**

- **Gameplay :** l'état enfoui suit un réseau de 4 tunnels nommés sous l'arène, avec sorties fixes signalées par une fissure 0,8 s avant l'éruption ; le scan des traces exige le mode thermique inversé du biomask (calibrage bioélectrique) pour valider l'objectif. Chaque plaque brisée laisse un fragment ramassable qui améliore la qualité du trophée.
- **VFX :** neige soufflée horizontale dont la direction suit `wind`, whiteout en voile blanc `#b9efff` qui monte à 70 % d'opacité sur 1,8 s, givre sur les bords de l'écran, fissures au sol avant éruption, éclats de carapace bleu pâle, stalactites qui tombent avec ombre au sol pendant le télégraphe, souffle visible du chasseur.
- **SFX :** `amb-ice-blizzard`, `amb-ice-cave`, `ice-crack`, `ice-crack-big`, `cryo-charge`, `cryo-roar`, `cryo-burrow`, `armor-plate-break`, `stalactite-fall`, `snow-step`, `drill-dead-hum`.
- **Musique :** MUS-23, MUS-37, MUS-24, MUS-38.

### R2-M024.3 — Le dernier rite · Cinder-12 (volcan)

**Cible :** le Bad Blood, Yautja paria, 850 PV. **Menace :** 4. **Temps :** 14 min. **Conseillé :** armure Berserker, smart disc + combistick.

**Briefing :** trois chasseurs ont disparu autour d'un ancien sanctuaire. Un paria utilise leurs trophées et leur technologie comme appât. Honorer les morts, détruire ses balises, imposer le jugement du clan.

| # | Secteur | Ambiance |
| --- | --- | --- |
| 1 | Plaine des cendres | marques de clan ensevelies |
| 2 | Entaille de lave | route basse brûlante, ruines plus lentes |
| 3 | Sanctuaire profané | trophées volés, glyphes rayés |
| 4 | Galerie des évents | vapeur cyclique qui révèle le camouflage |
| 5 | Porte du jugement | noms des chasseurs tombés gravés |
| 6 | Arène du jugement | duel final au-dessus de la lave |

- **Routes :** sol du sanctuaire ; flanc des évents ; aqueduc des anciens. **Dangers :** lave, évents de vapeur, rafales de cendre.
- **Vagues :** 5 razor-hounds ; 3 initiés Bad Blood après le scan ; 4 hounds en embuscade après les balises.
- **Boss :** Chasseur de chasseurs (camouflage, disc, plasma) → 58 % Duel du sanctuaire (armes énergétiques coupées, tir à distance = rite rompu) → 18 % Effacement : purge de 45 s, 3 consoles à couper, explosion fatale.
- **Trophée :** Masque du Paria. **Suite :** les archives volées désignent Naraka-Delta.
- **Existant :** sprite `v4/bad-blood-initiate`, 8 variantes Bad Blood V8 (Cinder-12) ; décors V19 volcan 54 / 100.
- **Manquant :** décors V19 volcan : statue renversée et balise de clan volée (0 / 5), 9 autres familles à 1 / 5 dont marque de chasseur tombé et présentoir profané ; sprite dédié du Paria (le boss réutilise `bad-blood.webp`) ; VFX lave, braises, cendre, impulsion qui coupe les armes, compte à rebours de purge, explosion ; SFX consoles, alarme de purge, porte de pierre ; musique de duel.

**Comblement Cinder-12 (proposé)**

- **Décors V19 à produire (46 variantes) :** statue renversée (5, couverture), balise de clan volée (5, objet de l'objectif « Détruire le piège »), et 4 variantes chacune pour veine de lave, évent de vapeur, fissure thermique, cendre à traces, croûte de lave refroidie, lit d'éclats d'obsidienne, marque de chasseur tombé (objet du scan), présentoir profané, brasero de braises.
- **Sprite :** Paria dédié (masque fendu, trophées volés sur l'armure) ; 10 animations : marche, course, camouflage, lancer de disc, tir plasma, combistick, lames, impulsion, purge, mort.
- **Gameplay :** arène avec 3 piliers destructibles en phase 3 ; la purge ferme une porte par console coupée trop tard (pas d'échec immédiat, seulement moins de route).
- **VFX :** surface de lave animée (lueur `#ff6338`, bulles), braises montantes en continu, rafale de cendre qui réduit la vision à 60 %, jets de vapeur verticaux, onde de l'impulsion qui éteint les icônes d'armes énergétiques, compte à rebours en glyphes sur les consoles, explosion finale plein écran.
- **SFX :** `amb-volcano-wind`, `lava-bubble`, `steam-burst`, `ash-gust`, `disc-throw`, `disc-return`, `plasma-charge`, `pariah-roar`, `energy-cut-pulse`, `purge-alarm`, `console-cut`, `stone-door-grind`, `sanctum-explosion`.
- **Musique :** MUS-25, MUS-37, MUS-26, MUS-38.

### R2-M024.4 — Les gueules du delta · Naraka-Delta (marais)

**Cible :** Hydre de vase, matriarche amphibie, 940 PV. **Menace :** 4. **Temps :** 15 min. **Conseillé :** armure Hunter, combistick + arc.

**Briefing :** un delta à marée noire nourrit une chaîne alimentaire bâtie autour d'une hydre. Relever les pistes des berges, identifier les nourriceries, forcer la matriarche hors des chenaux.

**Secteurs :** Vasière des œufs → Mangrove suspendue → Chenaux des chasseurs → Nourricerie noyée → Fosse aux trois remous → Balise de la marée noire.

- **Objectifs :** lire les remous (3 scans) → briser la meute amphibie → prélever les œufs sentinelles (2) → boss → extraction.
- **Routes :** mangrove basse ; couronnes de racines ; chenaux de marée (masque, danger cyclique). **Dangers :** boue profonde, flore prédatrice, déferlante de marée.
- **Boss :** Sous la surface → 60 % Trois gueules → 25 % Furie des marées. Attaques : jaillissement, balayage caudal, jet de vase acide. Aux phases 2 et 3, une marée pousse, vide l'endurance et révèle le camouflage.
- **Trophée :** Crâne trifide. **Suite :** le fragment de route pointe vers Serekh-9.
- **Existant :** sprite de boss `delta-hydra-juvenile-sheet` ; 30 espèces V8 ; décors V19 marais 51 / 100.
- **Manquant :** décors V19 marais à 0 / 5 : capsule d'Hydre, traînée de mucus, vasière aspirante, évent de vase acide, vase noire, eau peu profonde, roseaux lumineux, ossements, balise noyée (les objectifs reposent sur les capsules et le mucus) ; sprite adulte à trois têtes ; trois gueules indépendantes, niveau d'eau variable, embuscade aquatique (non simulés) ; VFX pluie lourde, remous, vague, bile ; ambiance marais.

**Comblement Naraka-Delta (proposé)**

- **Décors V19 à produire (49 variantes) :** 5 chacune pour capsule d'Hydre (objet de l'objectif), traînée de mucus (objet du scan), vasière aspirante, évent de vase acide, vase noire, eau peu profonde, roseaux lumineux, ossements charriés, balise de relevé noyée ; 4 pour front de marée.
- **Sprite :** Hydre adulte à trois têtes séparées (corps + 3 cous animables indépendamment), 9 animations.
- **Gameplay :** les trois têtes deviennent trois entités avec leur propre barre de vie (morsure, feinte, bile) ; couper une tête ferme son attaque. Niveau d'eau en trois paliers (bas, moyen, haut) qui couvre les plateformes basses en phase 2. Embuscade : la matriarche surgit sous le joueur s'il reste 3 s immobile dans l'eau.
- **VFX :** pluie lourde, remous circulaires qui annoncent la trajectoire 0,5 s avant, vague `#38b9d2` qui traverse l'arène, bile acide verte en projectile avec flaque persistante 4 s, niveau d'eau qui monte avec reflet.
- **SFX :** `amb-swamp-rain`, `amb-swamp-insects`, `water-swirl`, `hydra-roar-triple`, `hydra-bite`, `hydra-tail`, `bile-spit`, `tide-rise`, `wave-crash`, `mud-suck`, `egg-capsule-take`.
- **Musique :** MUS-27, MUS-37, MUS-28, MUS-38.

### R2-M024.5 — Le chant sous les dunes · Serekh-9 (désert)

**Cible :** Matriarche Sandmaw, fouisseuse, 1 000 PV. **Menace :** 4. **Temps :** 15 min 30. **Conseillé :** armure Scout, arc + smart disc.

**Briefing :** les caravanes minières disparaissent au bord d'un canyon vitrifié. Une prédatrice chasse par vibrations et commande plusieurs castes sous la mer de silice.

**Secteurs :** Balises sous le sable → Arches du vent rouge → Mer de silice chantante → Mine vitrifiée → Canyon des mandibules → Plateau de l'extraction.

- **Objectifs :** calibrer le masque sismique (3 scans) → écarter les rôdeurs de silice → récupérer les balises englouties (2) → boss → extraction.
- **Routes :** mer de silice ; couloirs du vent ; crêtes du canyon. **Dangers :** effondrement de sable, bouffée de chaleur, tempête de verre.
- **Boss :** Écoute profonde → 60 % Canyon vitrifié → 25 % Tempête de silice. Attaques : percée, cisaille mandibulaire, onde de dune. Aux phases 2 et 3, elle se replace sur un flanc du joueur avec avertissement.
- **Trophée :** Mandibules de Sandmaw. **Suite :** le signal suit une route de chasse vers Pelagos-M.
- **Existant :** sprite `sandmaw-juvenile-sheet` ; décors V19 désert 42 / 100.
- **Manquant :** décors V19 désert à 0 / 5 : balise minière ensevelie, cratère de percée, croûte prête à céder, champ de verre, rides de silice chantante, fissure vitrifiée, débris de foreuse, fragment mandibulaire, borne de relevé, piste dans le sable, pilier érodé ; détection par vibration (le boss ne lit ni le matériau ni le bruit du joueur), trajet souterrain (aujourd'hui relocalisation), verre destructible ; VFX sable soulevé, mirage, tempête ; SFX chant de silice, percée.

**Comblement Serekh-9 (proposé)**

- **Décors V19 à produire (58 variantes) :** 5 chacune pour balise minière ensevelie (objet de l'objectif), cratère de percée, croûte prête à céder, champ de verre tranchant, rides de silice chantante (objet du scan), fissure vitrifiée, débris de foreuse, fragment mandibulaire, borne de relevé, piste dans le sable, pilier érodé ; 3 pour chargement enseveli.
- **Sprite :** Sandmaw adulte (tête mandibulaire + anneaux de corps qui sortent du sable), 8 animations.
- **Gameplay :** le boss reçoit le bruit du joueur et le matériau sous ses pieds ; courir sur `sand` crée une onde de vibration qu'il suit, marcher sur `stone` ne laisse rien. Le déplacement souterrain devient un trajet visible (bosse de sable qui avance à 172 px/s). Les plaques de verre se brisent après 2 impacts lourds et ouvrent un passage bas.
- **VFX :** sable soulevé en colonne à la percée, mirage ondulant au-dessus des dunes, tempête de verre en particules scintillantes `#d9a85f` qui réduisent la vision du biomask, rides de silice qui vibrent quand le joueur court, éclats de verre.
- **SFX :** `amb-desert-wind`, `silica-sing` (boucle), `sand-run-step`, `sandmaw-breach`, `sandmaw-roar`, `mandible-shear`, `dune-quake`, `glass-shatter`, `heat-burst`, `sand-collapse`.
- **Musique :** MUS-29, MUS-37, MUS-30, MUS-38.

### R2-M024.6 — Sous l'œil de la tempête · Pelagos-M (océan)

**Cible :** Léviathan abyssal, 1 080 PV. **Menace :** 4. **Temps :** 16 min. **Conseillé :** armure Scout, combistick + plasma caster.

**Briefing :** seules des arches récifales émergent d'un océan global. Le clan a marqué un Léviathan qui bondit d'une fosse à l'autre et commande la faune bioluminescente.

**Secteurs :** Récif des harpons → Arches au-dessus du vide → Station battue par les vagues → Cheminées abyssales → Fosse bioluminescente → Aire d'amerrissage.

- **Objectifs :** échantillonner les chants abyssaux (3 scans) → disperser les gardiens du récif → reprendre les harpons de clan (2) → boss → extraction.
- **Routes :** récif battu ; arches submergées (grimpe, masque) ; passerelles de la station. **Dangers :** vague scélérate, surtension électrique, cheminée abyssale.
- **Boss :** Prédateur submergé → 60 % Récif brisé → 25 % Appel de l'abîme. Attaques : bond, faux dorsale, détonation sonar. Vague aux phases 2 et 3 (dégâts, projection, camouflage révélé).
- **Trophée :** Crête du Léviathan. **Suite :** une empreinte sporale mène à Mycora-V.
- **Existant :** sprite `leviathan-spawn-sheet` ; décors V19 océan 39 / 100.
- **Manquant :** décors V19 océan à 0 / 5 : harpon de clan abandonné (objet d'objectif), bouée sonar, corail bioluminescent, pylône électrique, cheminée abyssale, ligne de vague, module pressurisé, bassin de marée, zone de ressac, algues suspendues, piste d'algues, crête de coquilles ; bond en arc entre fosses (aujourd'hui charge horizontale), plateformes destructibles, foudre liée au sonar ; VFX embruns, éclairs, bioluminescence ; SFX vagues, sonar, foudre.

**Comblement Pelagos-M (proposé)**

- **Décors V19 à produire (61 variantes) :** 5 chacune pour harpon de clan abandonné (objet de l'objectif), bouée sonar (objet du scan), corail bioluminescent, pylône électrique actif, cheminée abyssale, ligne de vague scélérate, module pressurisé renversé, bassin de marée, zone de ressac, algues suspendues, piste d'algues humides, crête de coquilles ; 1 pour pilier corallien.
- **Sprite :** Léviathan adulte (tête + dos + nageoire dorsale qui émerge), 8 animations dont bond en arc.
- **Gameplay :** le bond suit un arc entre deux fosses marquées (ombre au sol 1 s avant l'impact) ; 4 plateformes basses destructibles en phase 2 ; en phase 3, chaque sonar est suivi 1,2 s plus tard d'un éclair sur les structures métalliques les plus proches du joueur ; l'arène se rétrécit de 15 % par sonar.
- **VFX :** embruns sur les bords, éclairs bleu-vert `#75f4ff` sur le métal, anneaux sonar concentriques, bioluminescence qui pulse avec le sonar, vague `#38b9d2` qui recouvre le récif, gerbe d'eau au bond.
- **SFX :** `amb-ocean-storm`, `wave-crash`, `sonar-ping`, `sonar-detonation`, `leviathan-breach`, `leviathan-roar`, `fin-slash`, `lightning-strike`, `electric-surge`, `coral-break`, `harpoon-retrieve`.
- **Musique :** MUS-31, MUS-37, MUS-32, MUS-38.

### R2-M024.7 — La forêt qui se souvient · Mycora-V (fongique)

**Cible :** Cœur-Mère mycélien, 1 120 PV. **Menace :** 4. **Temps :** 16 min 30. **Conseillé :** armure Hunter, smart disc + plasma caster.

**Briefing :** Mycora-V est un organisme planétaire. Ses prédateurs partagent leurs perceptions par un réseau mycélien, et le Cœur-Mère réécrit leurs réponses à mesure que la chasse avance.

**Secteurs :** Lisière des spores-mémoires → Tours mycéliennes → Territoire des relais → Archives sous les racines → Cavité du Cœur-Mère → Clairière de stérilisation.

- **Objectifs :** cartographier le réseau (3 nœuds) → rompre la mémoire de meute → isoler les graines-mémoires (2) → boss → extraction.
- **Routes :** tapis mycélien ; tours de fructification ; racines-mémoires (masque, danger cyclique). **Dangers :** nuage de spores, collet mycélien, floraison acide.
- **Boss :** Éveil du réseau → 60 % Mémoire adaptative → 25 % Floraison terminale. Attaques : fouet, nuage neurospore, épine. Aux phases 2 et 3 : perte d'énergie, scan ralenti, camouflage coupé.
- **Trophée :** Noyau du Cœur-Mère. **Suite :** les graines livrent la coordonnée d'Acheron-Sigma.
- **Existant :** sprites `hive-avatar-sheet`, `hive-node-sheet` ; décors V19 fongique 38 / 100.
- **Manquant :** décors V19 fongique à 0 / 5 : graine-mémoire et nœud d'impulsion (objets d'objectif), capsule de spores, collet, floraison acide, mémoire mycélienne, réservoir de stérilisant, barricade, tapis de filaments, fructification, hyphes, piste sporale ; graphe de relais destructibles et floraison déclenchée par la répétition d'une route (non simulés) ; VFX spores, impulsions lumineuses, vision opaque ; ambiance forêt vivante.

**Comblement Mycora-V (proposé)**

- **Décors V19 à produire (62 variantes) :** 5 chacune pour graine-mémoire (objet de l'objectif), nœud d'impulsion (objet du scan), capsule de spores, collet mycélien, floraison acide, mémoire mycélienne, réservoir de stérilisant, barricade de vesse-de-loup, tapis de filaments nerveux, fructification, hyphes desséchées, piste de poussière sporale ; 2 pour tronc de tour fongique.
- **Gameplay :** 6 relais sensoriels destructibles dans les secteurs 2 à 5 ; chaque relais détruit retire une capacité partagée aux ennemis (alerte de groupe, poursuite, etc.). Le Cœur enregistre les 3 dernières routes (sol, haute, à risque) ; reprendre la même route deux fois de suite fait éclore une floraison défensive sur cette route.
- **VFX :** spores en suspension `#bf70e8`, impulsions lumineuses qui parcourent les filaments vers le Cœur à chaque alerte, voile opaque de la floraison terminale, relais qui s'éteignent en cendre violette, empreintes lumineuses laissées par le joueur (mémoire visible).
- **SFX :** `amb-fungal-breath`, `spore-puff`, `mycelium-pulse`, `relay-destroy`, `hivemind-whisper`, `tendril-whip`, `neurospore-cloud`, `thorn-dart`, `bloom-burst`, `acid-sizzle`.
- **Musique :** MUS-33, MUS-37, MUS-34, MUS-38.

### R2-M024.8 — Les chasseurs de pierre · Acheron-Sigma (ruines)

**Cible :** Gardien d'obsidienne, 1 250 PV. **Menace :** 4. **Temps :** 17 min. **Conseillé :** armure Berserker, combistick + lames de poignet.

**Briefing :** une planète sans atmosphère abrite une cité prédatrice antérieure aux archives du clan. Ses sentinelles se réveillent au passage d'un biomask et adaptent leurs armes à chaque technologie observée.

**Secteurs :** Seuil de la cité noire → Pont des sentinelles → Galerie mimétique → Chambre des prismes → Noyau gravitationnel → Terrasse du vaisseau.

- **Objectifs :** déchiffrer les marques (3 stèles) → désassembler les sentinelles → extraire les prismes mémoriels (2) → boss → extraction.
- **Routes :** galeries de la cité ; failles gravitationnelles ; ponts d'obsidienne. **Dangers :** champ de nanites, grille laser, impulsion gravitationnelle. Vent nul.
- **Boss :** Protocole d'étude → 60 % Contre-chasse mimétique → 25 % Effacement de la cité. Attaques : lance photonique, lame mimétique, prison gravitationnelle. Trois tirs énergétiques observés déclenchent un avertissement de 1,6 s puis un champ de 4,5 s.
- **Trophée :** Masque du Gardien. **Fin :** la cité reconnaît l'achèvement de la Longue Chasse ; le rite Elder s'ouvre.
- **Existant :** sprite `ancient-guardian-sheet`, 30 espèces V8 ; décors V19 ruines 40 / 100 ; `drawGuardianAdaptiveField`.
- **Manquant :** décors V19 ruines à 0 / 5 : prisme mémoriel et socle de console (objets d'objectif), carapace de sentinelle, bouclier brisé, émetteur gravitationnel, obélisque de nanites, projecteur laser, dalle à déphasage, mécanisme ancien, fragment gravé, débris électrostatiques, piste sur l'obsidienne ; effacement progressif des plateformes, imitation des feintes et altitudes ; propagation sans atmosphère du bruit et de l'odeur ; VFX grille laser, nanites, distorsion gravitationnelle ; SFX étouffés du vide.

**Comblement Acheron-Sigma (proposé)**

- **Décors V19 à produire (60 variantes) :** 5 chacune pour prisme mémoriel (objet de l'objectif), fragment gravé illisible (objet du scan des stèles), socle de console prismatique, carapace de sentinelle inerte, bouclier de sentinelle brisé, émetteur gravitationnel, obélisque de champ nanite, projecteur de grille photonique, dalle à déphasage, mécanisme ancien, débris électrostatiques, piste sur l'obsidienne.
- **Gameplay :** l'adaptation couvre toutes les armes : une arme utilisée trois fois perd 40 % d'efficacité pendant 10 s ; en phase 2, le Gardien rejoue l'altitude et la dernière feinte du joueur ; en phase 3, les plateformes s'effacent du fond vers le centre (une rangée toutes les 6 s, annoncée par un clignotement). Vide : aucun son ni odeur ne se propage hors contact direct ; le Gardien détecte par vibration au sol et par signature énergétique.
- **VFX :** grille laser `#ff4fd8` avec balayage télégraphié, essaim de nanites en nuage de points, distorsion gravitationnelle (lentille sur l'image), prismes qui réfractent la lumière, plateformes qui se dissolvent en pixels, ciel noir et géante gazeuse fixe.
- **SFX (étouffés, filtre passe-bas comme dans un casque) :** `amb-vacuum-hum`, `suit-breath`, `laser-grid-sweep`, `nanite-swarm`, `gravity-pulse`, `guardian-lance`, `guardian-blade`, `guardian-field`, `prism-extract`, `platform-erase`, `stele-read`.
- **Musique :** MUS-35, MUS-37, MUS-36, MUS-38 (fin de la Longue Chasse).

## Acte VI — Blooded : Xeno Prime, Warp et guerre (R2-M025 → M043)

Après les 8 chasses : première reine, fonction Adjutant, quête du Warp (facultative pour Elite), introduction aux trois modes de guerre, retour au Homeworld puis Quatza-Rij solitaire jusqu'au rang Elite. Toutes en texte seul ; les modes Guerres des clans existent à part.

### R2-M025 — Préparer Xeno Prime

**Entrée :** voyage maîtrisé, accès à PLAN08 Xeno Prime. **Déroulé :** sur une base d’approche, inspecter les risques, préparer des contenants, tester un itinéraire d’extraction ; une sortie courte montre les traces du territoire.

- **Choix :** reconnaissance supplémentaire ou engagement immédiat. **Échec :** préparation insuffisante = reste en zone d’approche. **Sauvegarde :** `queen.firstExpeditionPrepared`

*Production (proposé)* — **Props :** base d'approche orbitale, contenants de spécimens (vides / scellés), écran de risques connus, itinéraire d'extraction balisé, traces xénomorphes (résine, griffures, carcasses), entrée de ruche. **VFX :** brume chaude humide, gouttes de résine, lampes de balisage. **SFX :** `base-hum`, `xeno-hiss-distant`, `resin-drip`, `container-seal`. **Musique :** MUS-41.

### R2-M026 — La première reine

**Entrée :** R2-M025 réussie. **Déroulé :** traverser les zones d’approche, lire les défenseurs, affronter la première reine ; fenêtres liées au terrain et sortie d’urgence.

- **Choix :** fenêtre agressive ou cycle de repli. **Échec :** ni victoire ni trophée ; observations conservées. **Sauvegarde :** `queen.firstDefeated` si combat gagné

*Production (proposé)* — **Props :** zones d'approche de la ruche, œufs (fermés / ouverts), défenseurs (sprites `xeno-drone` et `xeno-praetorian` V7 existants), arène de la reine avec piliers de résine destructibles, sortie d'urgence ; reine à produire (sprite grand format : marche, cri, queue, morsure, charge, blessure, mort). **VFX :** sang acide qui ronge les plateformes, résine qui coule, éclats de chitine, compte à rebours de la fenêtre de sortie. **SFX :** `queen-roar`, `queen-tail`, `xeno-screech`, `acid-sizzle`, `egg-open`. **Musique :** MUS-42.

### R2-M027 — Ce que la reine a changé

**Déroulé :** retour à bord, dommages traités, objets ou relevés installés ; un mentor observe. **Choix :** présenter au clan ou analyser seul à l’atelier. **Échec :** un objet trop endommagé reste absent. **Sauvegarde :** `queen.debriefResolved`

*Production (proposé)* — **Props :** atelier du vaisseau, objets rapportés ou relevés d'échec, poste de soin, mentor en visite. **VFX :** fumée de nettoyage acide sur l'armure. **SFX :** ambiance vaisseau (existe), medicomp (existe), `armor-repair`. **Musique :** MUS-15 puis MUS-02.

### R2-M028 — L’essai de coordination

**Déroulé :** coordonner une récupération à deux équipes (ouvrir un passage, signal, retour) et descendre résoudre un blocage. **Choix :** prendre le terrain ou le confier. **Échec :** ordre mal synchronisé = retard et reprise locale. **Sauvegarde :** `function.adjutantTrialResolved`

*Production (proposé)* — **Props :** base avec console de coordination, deux équipes visibles sur écran, passage à ouvrir à distance, balise de signal, blocage à résoudre au sol (porte coincée). **VFX :** marqueurs d'équipe sur la carte, signal lumineux de balise. **SFX :** `radio-chatter`, `beacon-signal`, `door-jam`, ui (existe). **Musique :** MUS-46.

### R2-M029 — La fonction Adjutant

**Déroulé :** recevoir un poste de coordination et le tester sur une mission de quai (dossiers, relais, aide bornée). **Choix :** accepter ou différer. **Sauvegarde :** `function.playerAdjutant=true` si accepté

*Production (proposé)* — **Props :** poste de coordination personnel, dossiers consultables, relais à placer, quai de mission brève. **VFX :** hologrammes de dossiers. **SFX :** ui / select (existe), `radio-chatter`. **Musique :** MUS-46.

### R2-M030 — Le seuil du Warp

**Entrée :** Adjutant actif, vaisseau possédé. **Déroulé :** suivre des anomalies de balises jusqu’à l’Observatoire des Seuils, explorer une galerie, retrouver un dispositif de passage. **Choix :** stabilité ou énergie d’abord. **Sauvegarde :** `warp.commonQuestStarted`

*Production (proposé)* — **Props :** Observatoire des Seuils (salle circulaire, instruments), balises anormales sur la route, galerie d'accès, dispositif de passage dormant, instruments fictifs de test. **VFX :** anomalie spatiale (ondulation de l'image), particules qui remontent le temps, distorsion autour du dispositif. **SFX :** `warp-hum`, `warp-interference`, `instrument-tick`. **Musique :** MUS-43.

### R2-M031 — Les pièces d’un retour

**Déroulé :** récupérer stabilisateur, repère de retour et interface de navigation dans trois chantiers ; chaque pièce est testée avant transport. **Choix :** réparer ou acquérir une variante. **Échec :** la pièce ratée retourne à l’établi. **Sauvegarde :** `warp.componentsVerified`

*Production (proposé)* — **Props :** stabilisateur, repère de retour, interface de navigation (3 objets d'inventaire), trois chantiers avec établi de test, chariot de transport. **VFX :** voyant vert ou rouge au test de chaque pièce. **SFX :** `workshop-loop`, `part-test-ok`, `part-test-fail`, `cart-wheels`. **Musique :** MUS-43.

### R2-M032 — Installer le module du Warp

**Déroulé :** monter le module dans le navire, aligner, relier les commandes ; test de retour à vide. **Choix :** marge de stabilité ou fenêtre courte. **Échec :** module non opérationnel, travaux conservés. **Sauvegarde :** `warp.moduleInstalled`, `warp.commonQuestComplete`, `warp.calibrated`

*Production (proposé)* — **Props :** baie du module dans le vaisseau, supports à aligner, câbles de commande, panneau de contrôle. **VFX :** test d'ouverture à vide (anneau lumineux qui s'ouvre puis se referme), arcs d'énergie. **SFX :** `module-align`, `power-up`, `warp-hum`, `warp-collapse`. **Musique :** MUS-43.

### R2-M033 — Traverser et revenir

**Déroulé :** petit trajet dans une branche du passé, repère posé, retour par la fenêtre engagée. Aucun rang. **Choix :** explorer une alcôve ou rentrer. **Sauvegarde :** `warp.firstRoundTrip` (facultatif)

*Production (proposé)* — **Props :** seuil actif, décor d'une branche du passé (terrain de chasse historique original), repère de terrain à planter, alcôve facultative, fenêtre de retour. **VFX :** ouverture et fermeture du passage, filtre de couleur d'époque, minuteur de la fenêtre. **SFX :** `warp-enter`, `warp-exit`, ambiance de l'époque. **Musique :** MUS-44.

### R2-M034 — Choisir la prochaine route

**Déroulé :** comparer les routes, visiter un quai, préparer une expédition ; progression possible sans Warp. **Choix :** chasse, exploration ou service. **Sauvegarde :** `campaign.routeTowardEliteReady`

*Production (proposé)* — **Props :** carte des routes (UI), quai d'information avec pilotes PNJ, tableau des contrats. **VFX :** routes surlignées sur la carte. **SFX :** ui / select (existe), `dock-ambience`. **Musique :** MUS-03.

### R2-M035 — Un conflit de clan à hauteur de chasseur

**Déroulé :** repérer un passage, couvrir un éclaireur, poursuivre ou protéger l’extraction ; revenir sur le lieu transformé. **Choix :** une faction ou une tâche de secours. **Sauvegarde :** `war.narrativeIntroductionResolved`

*Production (proposé)* — **Props :** terrain de conflit (réutilise une planète des Guerres des clans), passage à repérer, éclaireur allié, point d'extraction, version transformée du lieu après l'action. **VFX :** tirs plasma croisés, fumée, impacts. **SFX :** `plasma` (existe), `clan-battle-distant`, `scout-call`. **Musique :** MUS-45.

### R2-M036 — Voir le champ depuis les hauteurs

**Déroulé :** poste de commandement, ordres à trois équipes (couverture, déplacement, repli), phase au sol. **Choix :** ravitaillement ou contournement. **Échec :** retraite avec les survivants. **Sauvegarde :** `war.rtsIntroductionResolved`

*Production (proposé)* — **Props :** poste de commandement, trois équipes nommées, dépôt de ravitaillement, point fort ennemi. **VFX :** ordres tracés sur la carte, fumée de bataille au loin. **SFX :** `radio-order`, `clan-battle-distant`, ui (existe). **Musique :** MUS-46. **Lien :** mode RTS des Guerres des clans.

### R2-M037 — La carte a des chemins

**Déroulé :** déplacer une force par une liaison réelle, tenir une zone, assurer le ravitaillement ; passage visitable en 2D. **Choix :** consolider ou pousser. **Sauvegarde :** `war.conquestIntroductionResolved`

*Production (proposé)* — **Props :** carte territoriale (existe, 30 planètes), liaison réelle, zone à tenir, convoi de ravitaillement, passage visitable en 2D. **VFX :** couleur de contrôle qui change après résolution. **SFX :** ui (existe), `territory-captured`. **Musique :** MUS-46.

### R2-M038 — L’histoire dans le meuble

**Déroulé :** suivre un trophée de son berceau à son exposition (inspection, support, provenance, installation). **Choix :** exposer dans le vaisseau ou la résidence. **Sauvegarde :** `trophy.introductionResolved`

*Production (proposé)* — **Props :** berceau de préparation du trophée, outils de l'atelier, support d'exposition (vaisseau ou résidence), étiquette de provenance. **VFX :** lumière d'exposition qui s'allume. **SFX :** trophy (existe), `trophy-mount`, `tool-scrape`. **Musique :** MUS-02.

### R2-M039 — Revenir chez les siens

**Déroulé :** traverser les rues connues ; les habitants commentent les chasses réellement faites ; une tâche locale (réparer, escorter, suivre une proie). **Choix :** cohorte, famille de voie ou communauté. **Sauvegarde :** `campaign.homeworldReturn`

*Production (proposé)* — **Props :** cité du Homeworld (existe), habitants qui commentent les chasses réelles, accès endommagé à réparer, charge à escorter, proie proche à suivre. **VFX :** fumées de forge, lanternes du soir. **SFX :** `crowd-street`, `forge-hammer`, footstep (existe). **Musique :** MUS-05.

### R2-M040 — Mon domaine de maîtrise

**Déroulé :** démonstration libre (piste, mobilité, piège, confrontation) sur un terrain à plusieurs solutions. **Choix :** spécialité ou combinaison. **Sauvegarde :** `elite.masteryProfileReady`

*Production (proposé)* — **Props :** terrain de démonstration à quatre solutions (piste, mobilité, piège, confrontation), cibles et mannequins, mentor observateur. **VFX :** tracé de l'itinéraire choisi en fin d'épreuve. **SFX :** selon les outils employés, objective (existe). **Musique :** MUS-11.

### R2-M041 — Préparer la chasse solitaire

**Déroulé :** vérifier l’équipement, parcourir l’itinéraire, confirmer les règles du Quatza-Rij solitaire. **Choix :** marge de soin ou outil de mobilité. **Sauvegarde :** `elite.soloPrepared`

*Production (proposé)* — **Props :** râtelier personnel, liste d'équipement (UI), itinéraire de départ, partenaires qui conseillent sans partir. **VFX :** voyant vert sur chaque pièce vérifiée. **SFX :** weapon-switch (existe), `gear-check`. **Musique :** MUS-49.

### R2-M042 — Le Quatza-Rij solitaire

**Déroulé :** combat en plusieurs phases, seul, avec repli possible ; dégâts et pertes persistent. **Choix :** occasion brève ou ouverture plus sûre. **Sauvegarde :** `elite.soloSuccess` si réussi

*Production (proposé)* — **Props :** arène solitaire à trois niveaux, issue de repli, cible Quatza-Rij (même sprite que R2-M018, variante adulte plus grande), corps et trophée. **VFX :** sang acide, vapeur, marqueur de fenêtre ouverte par le joueur seul. **SFX :** `xeno-hiss`, `xeno-screech`, `acid-sizzle`, hit / slash (existe). **Musique :** MUS-14.

### R2-M043 — La reconnaissance Elite

**Déroulé :** retour devant les témoins, présentation de ce qui est rapporté, geste de reconnaissance. **Choix :** retour public ou restreint. **Sauvegarde :** `rank.Elite=true`

*Production (proposé)* — **Props :** lieu de reconnaissance, témoins, socle où présenter le trophée, insigne Elite (variante d'apparence). **VFX :** halo de cérémonie, braises. **SFX :** `clan-chant-long`, `drum-ritual`. **Musique :** MUS-07.

## Acte VII — Elite (R2-M044 → M051)

Navire de clan, résidence, opérations collectives, conséquences de guerre, mentorat et jugement jusqu'au rang Elder. Toutes en texte seul.

### R2-M044 — La coque d’un groupe

**Déroulé :** visiter la coque collective, inspecter les ponts fermés, rencontrer les détenteurs des droits ; renvoie aux 24 missions du navire. **Choix :** viser la Veille Partagée ou garder le vaisseau personnel. **Sauvegarde :** `clanship.projectDiscovered`

*Production (proposé)* — **Props :** Chantier des Coques Ouvertes, coque collective en cale sèche, ponts fermés par des scellés, détenteurs des droits (PNJ). **VFX :** projecteurs de chantier, étincelles. **SFX :** `shipyard-ambience`, `weld-loop`, `seal-locked`. **Musique :** MUS-47. **Lien :** `production/clan-ship-20261104/`.

### R2-M045 — Une porte, plusieurs haltes

**Déroulé :** comparer ses droits de résidence, préparer des contenants, confirmer un déménagement au seuil ; un objet exposé doit être décroché et transporté. **Choix :** rester ou déménager. **Échec :** un transfert incomplet laisse les objets dans leurs contenants. **Sauvegarde :** `residence.activeChoiceConfirmed`

*Production (proposé)* — **Props :** résidences éligibles, contenants de déménagement (vides / pleins), objet exposé à décrocher, seuil de la nouvelle maison, cabine de vaisseau en halte. **VFX :** surbrillance des objets à transporter. **SFX :** `crate-stow`, `trophy-mount`, `door-heavy`. **Musique :** MUS-04.

### R2-M046 — Une mission vraiment collective

**Déroulé :** préparer une mission avec les personnes disponibles, vérifier les postes, traverser les ponts ; capacités de 7, 13 ou 19 personnes. **Choix :** terrain ou coordination. **Sauvegarde :** `clanship.firstCollectiveOperationResolved`

*Production (proposé)* — **Props :** ponts du navire de clan, postes d'équipage (7, 13 ou 19), salle de briefing, rampe de départ, équipage incarné (sprites existants des gardes de clans). **VFX :** voyants de poste occupé / vide, lumières de départ. **SFX :** `briefing-room`, `ramp-lower`, `crew-chatter`. **Musique :** MUS-47.

### R2-M047 — Ce que la guerre laisse au retour

**Déroulé :** visiter une zone après la bataille, retrouver une unité vétérane, observer un passage détruit, participer à une tâche de retour. **Choix :** reconstruction ou accompagnement des blessés. **Sauvegarde :** `war.returnConsequenceSeen`

*Production (proposé)* — **Props :** zone d'après-bataille, unité vétérane, passage détruit (pont effondré), blessés à accompagner, matériaux de reconstruction. **VFX :** fumée persistante, braises, cendre qui tombe. **SFX :** `ruins-wind`, `fire-crackle`, `wounded-breath`. **Musique :** MUS-48.

### R2-M048 — La branche qu’on ne possède pas

**Déroulé :** expédition historique : aider un groupe local en trois étapes sans importer d’armée ni modifier la continuité cinéma. **Choix :** intervention bornée ou observation. **Sauvegarde :** `warp.advancedBranchResolved` (facultatif)

*Production (proposé)* — **Props :** décor d'une branche historique originale (trois étapes de terrain), groupe local à aider, traces limitées à rapporter, sortie de retour. **VFX :** passage Warp, filtre d'époque. **SFX :** `warp-enter`, `warp-exit`, ambiance d'époque. **Musique :** MUS-44 puis MUS-43.

### R2-M049 — Former sans remplacer

**Déroulé :** accompagner un novice dans une chasse d’exercice, préparer ses appuis, lui laisser une décision réelle ; un mentor observe. **Choix :** donner un indice ou laisser la tentative complète. **Sauvegarde :** `elder.mentoringObserved`

*Production (proposé)* — **Props :** terrain d'exercice avec points d'appui à préparer, novice (sprite Unblooded existant recoloré), mentor observateur, proie d'exercice. **VFX :** marqueurs d'appui posés par le joueur. **SFX :** `partner-call`, footstep (existe). **Musique :** MUS-49.

### R2-M050 — Un désaccord à résoudre sur le terrain

**Déroulé :** deux chasseurs contestent un passage ; inspecter les traces, rejouer leurs trajets, proposer une solution testée dans le décor. **Choix :** séparer les horaires ou ouvrir un second chemin. **Échec :** un refus laisse le conflit ouvert. **Sauvegarde :** `elder.judgmentObserved`

*Production (proposé)* — **Props :** passage disputé, traces des deux chasseurs (deux couleurs), deux PNJ chasseurs, second chemin constructible (échelle, pont de corde), panneau d'horaires. **VFX :** relecture fantôme des trajets. **SFX :** `rope-bridge`, scan (existe). **Musique :** MUS-49.

### R2-M051 — Être reconnu Elder

**Déroulé :** une assemblée revient sur les actes observés ; le joueur choisit comment assumer les responsabilités proposées. **Choix :** fonction régulière ou engagement itinérant. **Sauvegarde :** `rank.Elder=true`

*Production (proposé)* — **Props :** salle d'assemblée, sièges des anciens, insigne Elder (variante d'apparence). **VFX :** halo de cérémonie, braseros. **SFX :** `assembly-murmur`, `clan-chant-long`. **Musique :** MUS-08.

## Acte VIII — Elder et Ancient (R2-M052 → M060)

Transmission, retour sur un ancien terrain, successeur, rang Ancient, mausolée, chroniques cinéma et épilogue. Toutes en texte seul ; le mausolée existe comme système séparé (`systems/mausoleum.ts`).

### R2-M052 — L’atelier qui fonctionne sans moi

**Déroulé :** revenir dans un lieu déjà mené par une autre personne, aider à un point précis puis rendre la conduite. **Choix :** corriger un défaut ou soutenir une méthode nouvelle. **Sauvegarde :** `legacy.autonomousPlaceObserved`

*Production (proposé)* — **Props :** atelier, cour ou navire déjà tenu par un PNJ responsable, matériel défectueux à corriger. **VFX :** étincelles d'atelier. **SFX :** `workshop-loop`, `tool-scrape`. **Musique :** MUS-49.

### R2-M053 — Un ancien terrain a changé

**Déroulé :** retourner sur un terrain déjà chassé dont météo, habitants ou passages ont changé ; comparer les anciens relevés, adapter le trajet. **Choix :** entretenir un passage ou accepter le nouveau trajet. **Sauvegarde :** `legacy.returnedWorldCompared`

*Production (proposé)* — **Props :** variante modifiée d'une des 8 planètes (géométrie et décors alternatifs : pont effondré, nouveau campement, végétation repoussée), anciens relevés (carte d'époque superposable). **VFX :** météo changée, superposition de l'ancienne carte. **SFX :** ambiance de la planète. **Musique :** piste d'exploration de la planète (MUS-21 à MUS-35) puis MUS-05.

### R2-M054 — La décision du successeur

**Déroulé :** opération conçue par le successeur (postes, approche, extraction) ; intervenir seulement si nécessaire. **Choix :** laisser mener, conseiller ou reprendre face au danger. **Sauvegarde :** `ancient.transmissionTrialObserved`

*Production (proposé)* — **Props :** postes placés par le successeur, itinéraire d'approche, point d'extraction, successeur (PNJ formé en R2-M049). **VFX :** marqueur « intervenir » visible seulement en cas de danger immédiat. **SFX :** `partner-call`, enemy-alert (existe). **Musique :** MUS-49.

### R2-M055 — L’épreuve de la longue mémoire

**Déroulé :** traverser trois lieux de son parcours, confronter un souvenir à une conséquence actuelle, transmettre un outil ou une méthode. **Choix :** trace de chasse, lieu collectif ou enseignement. **Sauvegarde :** `ancient.longMemorySuccess`

*Production (proposé)* — **Props :** trois lieux déjà visités (choisis dans la sauvegarde), conséquence visible (réfugiés, passage abîmé, trophée contesté), outil ou méthode à transmettre, volontaire. **VFX :** fondu souvenir / présent. **SFX :** écho des ambiances d'origine. **Musique :** MUS-49 avec reprises de MUS-09.

### R2-M056 — La reconnaissance Ancient

**Déroulé :** lieu choisi par le parcours ; témoignages d’actes distincts ; les absents sont représentés par des traces autorisées. **Choix :** présence locale ou cérémonie intime. **Sauvegarde :** `rank.Ancient=true`

*Production (proposé)* — **Props :** lieu choisi par le parcours, témoins, traces des absents (masques, objets), insigne Ancient. **VFX :** halo de cérémonie. **SFX :** `clan-chant-long`, `drum-ritual`. **Musique :** MUS-08.

### R2-M057 — Le mausolée des chasses racontées

**Déroulé :** parcourir les piédestaux de masques et les casiers ; chaque campagne DLC a son support et son statut d’accès. **Choix :** examiner un masque ou écouter sa chronique. **Sauvegarde :** `mausoleum.visited`

*Production (proposé)* — **Props :** piédestaux de masques, casiers, supports DLC (ouverts / fermés expliqués), chroniques écrites. **VFX :** lumière de musée en faisceaux, poussière en suspension. **SFX :** `mausoleum-ambience`, `mask-pedestal`. **Musique :** MUS-50. **Lien :** `systems/mausoleum.ts`.

### R2-M058 — Entrer dans une chronique cinéma

**Déroulé :** choisir un masque, le poser sur un support de transition, confirmer la lecture : chronique fidèle (avatars propres) ou branche alternative nommée. **Sauvegarde :** `cinema.modeChosen` ; sauvegarde séparée

*Production (proposé)* — **Props :** masque de chronique, support de transition, écran de choix du mode (fidèle / variante). **VFX :** transition de chronique (le décor se dissout en grain de film). **SFX :** `chronicle-transition`. **Musique :** MUS-50 jusqu'à la confirmation.

### R2-M059 — La nouvelle cohorte revient

**Déroulé :** une nouvelle cohorte rentre et demande une place pour montrer son récit ; préparer un support, écouter, laisser de la place aux inconnues. **Sauvegarde :** `legacy.nextCohortReturn`

*Production (proposé)* — **Props :** nouvelle cohorte (quatre jeunes, sprites à produire), support de récit à installer, anciens camarades selon leur état. **VFX :** lanternes du soir. **SFX :** voix de cohorte, `crowd-cohort`. **Musique :** MUS-09 puis MUS-05.

### R2-M060 — La longue chasse demeure

**Déroulé :** traverser son lieu actuel (maison, vaisseau, navire, halte) ; la caméra montre objets et relations acquis puis rend la main pour un dernier geste. **Choix :** partir, accueillir ou transmettre. **Sauvegarde :** `campaign.epilogueSeen`

*Production (proposé)* — **Props :** lieu actuel du joueur (maison, vaisseau, navire ou halte) avec ses objets et trophées réels, PNJ liés. **VFX :** lumière de fin de journée, lent panoramique. **SFX :** ambiance du lieu. **Musique :** MUS-51.

## Besoins transverses

Le plus gros manque est l'audio : seuls 21 bruitages et l'ambiance du vaisseau existent (lot V54, sources Kenney). Aucune musique et aucune ambiance de planète.

**Audio présent dans `public/audio/`**

| Catégorie | Présent | Manquant (dossier avec `missing.txt`) |
| --- | --- | --- |
| SFX | ui, select, jump, footstep, slash, plasma, scan, cloak-on, cloak-off, mask-on, mask-off, weapon-switch, medicomp, netgun, snare, enemy-alert, objective, hit, trophy, victory, defeat | — |
| Ambiances | ship | jungle, ice, volcano, swamp, desert, ocean, fungal, ruins |
| Musiques | aucune | menu, ship, galaxy, exploration, combat, boss, homeworld |

**SFX à créer en priorité pour les 8 chasses (proposé) :** tirs humains (fusil, rafale, fusée), cris et attaques des 8 boss, smart disc, combistick déployé et lancé, arc, plasma chargé, déclenchement de chaque famille de danger (lave, vapeur, vague, glace, sable, spores, laser, gravité), récupération d'objet d'objectif, faisceau d'extraction.

**VFX.** Les 22 types de danger sont rendus par un rectangle coloré pulsant (`hazardColor`). À produire par biome : jungle (pluie, éclairs, boue) ; glace (neige soufflée, whiteout, chutes) ; volcan (lave, braises, cendre, vapeur) ; marais (pluie lourde, remous, vague) ; désert (sable, mirage, tempête de verre) ; océan (embruns, éclairs, bioluminescence, arc électrique) ; fongique (spores, impulsions, voile opaque) ; ruines (grille laser, nanites, distorsion). Plus : sang vert et sang humain, éclats de carapace, halo de fusée persistant, purge et explosion de Cinder-12.

**Décors V19 des planètes (variantes présentes / 100)**

| Planète | Présent | Objets d'objectif encore absents |
| --- | --- | --- |
| Oseris-IV | 100 | — |
| Nivalis-K | 100 | — |
| Cinder-12 | 54 | balise de clan volée (0), marque de chasseur tombé (1), présentoir profané (1) |
| Naraka-Delta | 51 | capsule d'Hydre (0), traînée de mucus (0) |
| Serekh-9 | 42 | balise minière ensevelie (0) |
| Pelagos-M | 39 | harpon de clan abandonné (0), bouée sonar (0) |
| Mycora-V | 38 | graine-mémoire (0), nœud d'impulsion (0) |
| Acheron-Sigma | 40 | prisme mémoriel (0), socle de console (0) |

Le registre ne charge que les paires présentes ; les 336 variantes manquantes (464 / 800 présentes) ne cassent pas le jeu mais laissent les objets d'objectif sans visuel propre.

**Sprites de boss.** Vey, Cryostalker Alpha, Hydre, Sandmaw, Léviathan, Cœur-Mère et Gardien ont une planche. Le Paria de Cinder-12 réutilise `bad-blood.webp`. Hydre, Sandmaw et Léviathan utilisent des planches nommées « juvenile » ou « spawn ». À produire pour les actes suivants : cible Quatza-Rij, reine de Xeno Prime, Saar, Harek, Yena, Tov, novice, nouvelle cohorte.

## Catalogue musical et prompts Flow Music

La campagne demande 62 pistes, dont 13 thèmes de race (MUS-60 → MUS-72), le thème du Serpent Clan (MUS-73) et 18 thèmes communs, 19 pistes pour les chasses, 11 pour les actes VI à VIII. Toutes sont à créer : les 7 dossiers `public/audio/music/` sont vides.

**Utilisation dans Flow Music.** Coller le prompt dans la zone de saisie de la session. Flow Music génère avec Lyria 3.5, jusqu'à environ 3 minutes par piste. Pour une boucle de jeu, sélectionner la fin dans Remix → Extend et demander « end on the same chord and groove as bar 1 for a seamless loop ». Pour corriger une partie, utiliser Replace sur la section plutôt que tout régénérer. Générer deux versions et comparer. Les prompts sont en anglais et ne citent aucun artiste ni aucune musique de film. Sources : [aide Flow](https://support.google.com/flow/answer/17084348?hl=en), [guide Flow Music 2026](https://jackrighteous.com/blogs/music-creation-process-guide/google-flow-music-complete-guide-2026).

**Signature commune (proposée)** : motif du clan de quatre notes descendantes en mineur, cuivres graves, taikos, cordes frottées col legno, cliquetis gutturaux comme texture percussive. Chaque piste en reprend un fragment pour lier la campagne.

### Thèmes communs

**MUS-01 — Thème principal « La Longue Chasse »** · menu principal · 3:00 · 72 BPM · Ré mineur · boucle.

```text
Instrumental, no vocals. Epic dark sci-fi hunting theme for a video game main menu, 72 BPM, D minor. Opens with a low droning synth and distant thunder, then a four-note descending minor motif on solo low brass. Bar 17: taiko drums, deep frame drums and col legno strings enter with a stalking 6/8 pulse. Guttural clicking sounds used as rhythmic percussion. Bar 33: full orchestra states the motif, French horns and low choir pads without words. Bar 49: drops back to the drone for a seamless loop. Cinematic, tribal, menacing but noble, wide stereo, heavy low end.
```

**MUS-02 — Vaisseau, veille** · intérieur du vaisseau personnel (R2-M021, M022, M027) · 3:00 · 60 BPM · boucle.

```text
Instrumental ambient for the interior of an alien hunter's spaceship. 60 BPM, sparse. Low engine hum pad, slow metallic pulses like a heartbeat, soft glassy synth arpeggio in A minor, occasional distant alien clicks. Quiet and introspective, room for dialogue. The clan motif appears once on a muted horn around 1:30. No drums except a very soft low tom every 8 bars. Seamless loop, no fade-out.
```

**MUS-03 — Galaxie, voyage** · carte galactique, trajet R2-M023 · 2:30 · 84 BPM.

```text
Instrumental space travel cue for a sci-fi game star map. 84 BPM, E minor. Shimmering synth pads, slow rising string ostinato, deep sub bass swells, pulsing analog sequencer. Mid-point: the four-note clan motif on low brass over a wide choir pad without words. Sense of vast distance and purpose, cold and majestic. Ends on a sustained chord that can loop.
```

**MUS-04 — Homeworld, cité de jour** · cité (R2-M003, M014, M039, M045) · 3:00 · 90 BPM · boucle.

```text
Instrumental ambient for a living alien warrior city in daylight. 90 BPM. Hand drums and wooden percussion in a loose tribal groove, low bowed strings, metallic forge-like hits in the distance, a reedy flute-like synth playing a calm variation of a four-note minor motif. Warm, busy, dignified, not threatening. Leave space for city sound effects. Seamless loop.
```

**MUS-05 — Homeworld, retour** · retour au pays, nuit (R2-M039, M053) · 2:30 · 66 BPM.

```text
Instrumental nocturnal theme for a hunter returning home to an alien city. 66 BPM, F minor. Soft low strings, warm synth pad, slow frame drum heartbeat, distant wordless choir. The four-note clan motif played gently on a cello, then answered by a horn. Nostalgic, quiet pride, a little melancholy. Ends softly on an open fifth.
```

**MUS-06 — Clan, cérémonie** · Unblooded, Young Blood (R2-M006, M015) · 1:45 · 76 BPM.

```text
Instrumental ceremonial music for a young warrior's rank ceremony in an alien clan. 76 BPM, D minor. Starts with a single deep drum and low throat-like drone. Layers of taiko and frame drums build in a steady procession rhythm. Low brass states the four-note clan motif, strings answer. Build to a strong but restrained climax at 1:20, then a short resonant ending. Ritual, proud, solemn.
```

**MUS-07 — Clan, triomphe** · marque Blooded, reconnaissance Elite (R2-M020, M043) · 2:00 · 80 BPM.

```text
Instrumental triumphant ritual theme for a warrior earning his blood mark. 80 BPM, D minor turning to D major at the climax. Thunderous taikos and low toms, sizzling cymbal swells like burning metal, full brass playing the four-note clan motif in augmentation, wordless male choir. Climax at 1:15 with the whole orchestra, then the motif alone on one horn. Fierce, victorious, primal.
```

**MUS-08 — Clan, solennel** · Elder, Ancient (R2-M051, M056) · 2:30 · 58 BPM.

```text
Instrumental slow solemn theme for an elder warrior's recognition. 58 BPM, B-flat minor. Low strings chorale, deep sustained choir without words, a single large drum every two bars, distant bells with a metallic alien timbre. The four-note clan motif played very slowly by low brass, then by high strings. Wise, grave, peaceful, timeless. Long reverberant ending.
```

**MUS-09 — Enfance, calme** · cour, cohorte (R2-M002, M004, M059) · 2:00 · 88 BPM · boucle.

```text
Instrumental light theme for young alien warriors training in a courtyard. 88 BPM, G minor with bright moments. Plucked strings, marimba-like wooden mallets, soft hand percussion, a playful variation of a four-note minor motif on a woodwind synth. Curious, gentle, slightly mischievous. Seamless loop.
```

**MUS-10 — Enfance, tension** · prologue, bête dans la cour (R2-M001) · 1:30 · 120 BPM.

```text
Instrumental action cue for children facing an escaped beast in a training yard. 120 BPM, G minor. Fast staccato strings, hand drums, short brass stabs, scraping metal percussion. The four-note motif on high strings, urgent. Exciting but not horror, adventurous. Ends with a quick resolution chord as the beast is netted.
```

**MUS-11 — Entraînement** · ateliers d'outils (R2-M004, M007 → M013, M040) · 2:30 · 100 BPM · boucle.

```text
Instrumental training loop for a warrior learning weapons. 100 BPM, A minor. Steady tribal drum groove, low pulsing synth bass, muted metallic hits, short string ostinato. Focused and rhythmic, low intensity, leaves room for weapon sound effects. Fragment of a four-note minor motif every 16 bars. Seamless loop.
```

**MUS-12 — Triade** · former la triade (R2-M016, M019) · 2:00 · 92 BPM.

```text
Instrumental theme for three young hunters forming a team. 92 BPM, E minor. Three distinct instrument voices introduced one by one: low cello, horn, flute-like synth. They interlock in a three-part counterpoint over hand drums. Bonding, determination, trust. Ends with all three voices on the four-note clan motif in unison.
```

**MUS-13 — Temple des Trois Ombres** · exploration du temple (R2-M017) · 3:00 · 70 BPM · boucle.

```text
Instrumental mysterious exploration music for an ancient shifting stone temple. 70 BPM, C minor. Deep stone-grinding drones, slow ticking percussion like gears, reverberant low choir without words, eerie bowed metal. Sudden quiet moments then low rumbles. The four-note motif hidden in the bass. Ancient, oppressive, sacred. Seamless loop.
```

**MUS-14 — Rite Quatza-Rij** · combat de rite à trois et seul (R2-M018, M042) · 3:00 · 140 BPM.

```text
Instrumental intense combat music for a ritual hunt against a deadly alien creature. 140 BPM, C minor. Aggressive taikos and industrial percussion, hissing textures, frantic string ostinato, brass blasts, wordless male choir shouts. Section A at bar 1, breakdown with only drums and hissing at 1:20, final section with the four-note clan motif on full brass at 2:10. Brutal, primal, relentless.
```

**MUS-15 — Retour** · sortie du temple, après-combat (R2-M019, M027) · 1:30 · 64 BPM.

```text
Instrumental relief cue after a dangerous ritual. 64 BPM, A minor resolving to C major. Soft sustained strings, gentle low drum heartbeat slowing down, warm horn playing the four-note motif softly. Exhaustion, relief, quiet pride. Fades on a held chord.
```

**MUS-16 — Chasse du Quatza-Rij** · trio puis solo (L-02, L-05) · 3:00 · 118 BPM.

```text
Instrumental hunt music for three young alien warriors tracking a huge native beast on their savage homeworld. 118 BPM, E minor. Opens with tense low drones and distant beast calls, sparse tribal percussion as they track. At 1:00 the beast charges: heavy taikos, roaring low brass, three distinct melodic voices (cello, horn, reedy synth) interlocking like hunters closing in. Final section at 2:10: the three voices unite on a four-note descending minor motif over full drums. Primal, raw, coming-of-age.
```

**MUS-17 — Exil** · voie Bad Blood, jugement et errance · 3:00 · 64 BPM · boucle.

```text
Instrumental dark theme for an alien warrior exiled from his clan and hunted by his own kind. 64 BPM, B minor. Distorted low drones, broken rhythmic clicks, a detuned cello playing the four-note descending minor motif out of tune, cold industrial textures and distant metallic screams. Loneliness, shame, defiance. Seamless loop.
```

**MUS-18 — Enforcer** · traque d'un Bad Blood · 3:00 · 112 BPM · boucle.

```text
Instrumental relentless pursuit music for an alien enforcer hunting a criminal of his own species. 112 BPM, G minor. Steady marching war drums, tense pizzicato strings, a judge-like low brass statement of the four-note clan motif, metallic tension hits and a ticking pulse. Cold, disciplined, inevitable. Seamless loop.
```

### Pistes des 8 chasses

Chaque planète a une piste d'exploration en boucle (secteurs 1 à 5) et une piste de boss (secteur 6). Le moteur connaît déjà les contextes `exploration`, `combat` et `boss` (`GameMusicContext` dans `sound.ts`).

**MUS-21 — Oseris-IV, exploration** · 3:00 · 78 BPM · boucle.

```text
Instrumental stealth exploration music for a humid alien rainforest at night during warm rain. 78 BPM, D minor. Wet hand drums and log drums in a slow stalking groove, low bowed strings, distant thunder, insect-like high synth textures, a breathy wooden flute playing fragments of a four-note minor motif. Long silences between phrases. Tense, patient, predatory, organic. Seamless loop.
```

**MUS-22 — Commandante Vey, boss** · 3:00 · 132 BPM · 3 sections pour les 3 phases.

```text
Instrumental boss fight music: an alien hunter against an elite human soldier commander in a storm-lashed jungle clearing. 132 BPM, D minor. Section 1 (counter-hunt): military snare rolls and staccato strings against tribal drums. Section 2 at 1:00 (last stand): heavier, brass stabs like suppressive fire, alarm-like synth pulses. Section 3 at 2:00 (cornered warrior): stripped down to taikos and low choir, then the four-note clan motif on full brass as the duel turns personal. Rain and thunder textures throughout.
```

**MUS-23 — Nivalis-K, exploration** · 3:00 · 64 BPM · boucle.

```text
Instrumental exploration music for a frozen alien ice planet with blizzards and ice caves. 64 BPM, B minor. Glassy bowed metal, cold crystalline synth bells, howling wind texture, deep low drone, very sparse low frame drum. A cracking ice-like percussion appears every few bars. Four-note minor motif on a distant muted horn. Isolated, cold, dread under the surface. Seamless loop.
```

**MUS-24 — Cryostalker Alpha, boss** · 3:00 · 138 BPM.

```text
Instrumental monster boss fight in an ice cavern against a huge armored predator beast. 138 BPM, B minor. Section 1 (armored): heavy pounding low drums like charges hitting pillars, grinding low strings. Section 2 at 1:00 (pack call): fast skittering percussion, shrieking high strings. Section 3 at 2:00 (wounded predator): faster tempo feel, falling-ice crash percussion, full brass on the four-note clan motif. Cold, violent, animalistic.
```

**MUS-25 — Cinder-12, exploration** · 3:00 · 70 BPM · boucle.

```text
Instrumental exploration music for a volcanic world with a desecrated alien temple, ash storms and lava rivers. 70 BPM, C-sharp minor. Low rumbling drones, slow heavy drums like distant eruptions, crackling ember textures, mournful low brass, wordless low choir. The four-note clan motif played as a funeral lament. Sacred, angry, mourning. Seamless loop.
```

**MUS-26 — Le Bad Blood, duel** · 3:00 · 144 BPM.

```text
Instrumental boss duel between two alien warrior hunters, one a traitor, in a ritual arena above lava. 144 BPM, C-sharp minor. Section 1 (hunter of hunters): distorted percussion, plasma-like synth zaps, aggressive strings. Section 2 at 1:00 (sanctuary duel): energy sounds cut out, only taikos, metal clashes and male choir chants, a primal ritual feel. Section 3 at 2:00 (self-destruct): a ticking clock pulse accelerates for 45 seconds, alarm synth, full orchestra on the inverted four-note clan motif. Furious, tragic, honor-bound.
```

**MUS-27 — Naraka-Delta, exploration** · 3:00 · 72 BPM · boucle.

```text
Instrumental exploration music for an alien mangrove swamp delta with black water tides and heavy rain. 72 BPM, F minor. Muddy low bass pulses, dripping water percussion, slow detuned strings, croaking low woodwinds, bubbling synth textures. The four-note minor motif on a bass clarinet. Murky, humid, something moving under the water. Seamless loop.
```

**MUS-28 — Hydre de vase, boss** · 3:00 · 128 BPM.

```text
Instrumental boss fight against a giant three-headed amphibious hydra in a flooding swamp pit. 128 BPM, F minor. Section 1 (under the surface): deep surging bass, splashing percussion, sudden silent pauses before attacks. Section 2 at 1:00 (three maws): three interlocking brass motifs representing three heads, rising tide swells. Section 3 at 2:00 (tidal fury): full orchestra and drums, wave crash impacts, the four-note clan motif on horns. Monstrous, slimy, overwhelming.
```

**MUS-29 — Serekh-9, exploration** · 3:00 · 76 BPM · boucle.

```text
Instrumental exploration music for an alien silica desert of singing dunes and vitrified glass canyons under two suns. 76 BPM, E Phrygian. Shimmering glass harmonics, low resonant drones that seem to come from under the sand, dry hand drums, a duduk-like reed synth playing the four-note minor motif. Vast, hot, deceptively calm, listening. Seamless loop.
```

**MUS-30 — Matriarche Sandmaw, boss** · 3:00 · 134 BPM.

```text
Instrumental boss fight against a colossal burrowing sandworm-like predator in a glass canyon. 134 BPM, E Phrygian. Section 1 (deep listening): very low sub-bass rumbles and silence, then explosive drum hits as it breaches. Section 2 at 1:00 (vitrified canyon): shattering glass percussion, ricocheting string runs. Section 3 at 2:00 (silica storm): constant driving drums, whirling high strings, distorted wind, full brass on the four-note clan motif.
```

**MUS-31 — Pelagos-M, exploration** · 3:00 · 70 BPM · boucle.

```text
Instrumental exploration music for coral reef arches above an endless alien ocean during a storm. 70 BPM, G minor. Deep oceanic swells, whale-like low brass calls, shimmering bioluminescent synth arpeggios, crashing wave textures, slow tom pulses. Four-note minor motif on a low horn, echoed by a distant sonar-like ping. Immense, wet, electric. Seamless loop.
```

**MUS-32 — Léviathan abyssal, boss** · 3:00 · 130 BPM.

```text
Instrumental boss fight against an abyssal leviathan leaping between ocean trenches in a lightning storm. 130 BPM, G minor. Section 1 (submerged): huge low swells, sonar pings, sudden crashing impacts. Section 2 at 1:00 (broken reef): splintering percussion, fast string ostinato, thunder. Section 3 at 2:00 (call of the abyss): accelerating sonar pulses, electric synth bursts, full orchestra and choir on the four-note clan motif. Colossal, stormy, awe and terror.
```

**MUS-33 — Mycora-V, exploration** · 3:00 · 68 BPM · boucle.

```text
Instrumental exploration music for a bioluminescent fungal planet whose forest is a single living mind. 68 BPM, A-flat minor. Breathing organic pads, wet clicking percussion, slow pulsing synth that sounds like a heartbeat in the ground, spore-like granular textures, whispering choir without words. The four-note minor motif reversed and echoed. Alien, hypnotic, watched. Seamless loop.
```

**MUS-34 — Cœur-Mère mycélien, boss** · 3:00 · 124 BPM.

```text
Instrumental boss fight against a giant mycelial hive-mind heart in a glowing cavern. 124 BPM, A-flat minor. Section 1 (awakening network): pulsing organic bass, whip-like percussion, rising swarm of granular textures. Section 2 at 1:00 (adaptive memory): the music repeats the player's earlier phrases back in distorted form, unsettling call and response. Section 3 at 2:00 (terminal bloom): dense choir clusters, thick pounding drums, the four-note clan motif cutting through on brass. Psychedelic, suffocating, alien.
```

**MUS-35 — Acheron-Sigma, exploration** · 3:00 · 62 BPM · boucle.

```text
Instrumental exploration music for an airless obsidian city of ancient alien machines under a gas giant. 62 BPM, C minor. Muffled, close sounds as if heard through a helmet in vacuum: low sine drones, mechanical clicks, slow electronic pulses, glassy prism tones, a distant machine choir. The four-note minor motif played by a pure synthetic tone. Ancient, silent, inhuman, the city is watching. Seamless loop.
```

**MUS-36 — Gardien d'obsidienne, boss final** · 3:00 puis Extend jusqu'à 3:30 · 136 BPM.

```text
Instrumental final boss music against an ancient obsidian guardian machine that studies and imitates the hunter. 136 BPM, C minor. Section 1 (study protocol): precise mechanical percussion, analytic synth arpeggios, muffled brass. Section 2 at 1:10 (mimetic counter-hunt): the four-note clan motif is copied and distorted by synths, call and answer between orchestra and machine. Section 3 at 2:20 (city erasure): massive orchestra, choir and drums, collapsing gravity-like bass drops, the clan motif triumphs in full. Epic, final, cosmic.
```

**MUS-37 — Combat de chasse** · détection par les ennemis ordinaires, toutes planètes · 2:00 · 126 BPM · boucle.

```text
Instrumental combat loop for a stealth hunter game when enemies detect the player. 126 BPM, D minor. Driving tribal drums, aggressive low string ostinato, short brass stabs, metallic hits, guttural clicking percussion. Fragment of the four-note minor motif every 8 bars. Intense but not epic, leaves room for weapon sounds. Seamless loop.
```

**MUS-38 — Extraction et victoire** · trophée pris, faisceau d'extraction · 0:35 · 90 BPM.

```text
Instrumental short victory sting for a successful alien hunt, 35 seconds. 90 BPM, D minor to D major. Big drum hit, the four-note clan motif on full brass, rising choir without words, ends on a bright sustained chord with a beam-like synth shimmer.
```

**MUS-39 — Défaite** · mort du chasseur · 0:20 · libre.

```text
Instrumental short defeat sting, 20 seconds. A low brass playing the four-note minor motif slowly and broken, cut off by a dull drum hit, then a fading cold drone.
```

### Actes VI à VIII

**MUS-41 — Xeno Prime, approche** · R2-M025 · 3:00 · 60 BPM · boucle.

```text
Instrumental horror-tension music for approaching an alien hive world. 60 BPM, atonal around C. Wet organic drones, slow metallic scraping, faint hissing, irregular heartbeat percussion, dissonant high string clusters swelling and vanishing. The four-note minor motif appears once, distorted, on a low horn. Dread, claustrophobia, nothing visible yet. Seamless loop.
```

**MUS-42 — La première reine, boss** · R2-M026 · 3:00 · 142 BPM.

```text
Instrumental boss battle against a gigantic alien hive queen in a resin-covered chamber. 142 BPM, C minor. Section 1: screeching high strings, pounding industrial drums, hissing acid textures. Section 2 at 1:00: brutal low brass and choir clusters, the queen's roar as a massive orchestral hit. Section 3 at 2:00 (escape window): urgent ticking percussion and the four-note clan motif on full brass, triumphant but desperate.
```

**MUS-43 — Warp, mystère** · Observatoire des Seuils, pièces, installation (R2-M030 → M032) · 3:00 · 66 BPM · boucle.

```text
Instrumental mysterious sci-fi music about a device that opens passages through time. 66 BPM, F-sharp minor. Ticking clock-like percussion slightly out of sync, shimmering reversed synth pads, low humming drone that slowly rises in pitch, glass harmonica tones. The four-note minor motif stretched in time. Curious, uncanny, wonder mixed with danger. Seamless loop.
```

**MUS-44 — Warp, traversée** · passage du seuil, branches historiques (R2-M033, M048) · 1:30 · libre puis 110 BPM.

```text
Instrumental transition cue for crossing a time portal. Starts with no tempo: a rising whooshing drone, reversed cymbals and stretched choir. At 0:30 a hard cut into 110 BPM driving drums and strings, the four-note clan motif on brass, then a sudden drop to silence with a single resonant bell at 1:25.
```

**MUS-45 — Guerre, terrain** · conflit de clan à hauteur de chasseur (R2-M035) · 3:00 · 120 BPM · boucle.

```text
Instrumental war music for a battle between rival alien warrior clans. 120 BPM, D minor. Massed war drums, marching rhythm, low brass fanfares, clashing metal percussion, wordless battle choir. Two opposing motifs fight: the four-note clan motif and a harsher rival motif. Gritty, chaotic, heroic. Seamless loop.
```

**MUS-46 — Guerre, commandement** · poste de commandement et carte (R2-M036, M037) · 3:00 · 96 BPM · boucle.

```text
Instrumental strategy music for commanding troops from a war room. 96 BPM, A minor. Steady low drums, pulsing synth bass, deliberate string ostinato, occasional distant battle rumble, brass statements of the four-note clan motif at phrase ends. Focused, tactical, tense calm. Leaves room for radio voices. Seamless loop.
```

**MUS-47 — Navire de clan, opération collective** · R2-M044, M046 · 2:30 · 104 BPM.

```text
Instrumental departure theme for a crew of alien hunters boarding a great clan warship. 104 BPM, E minor. Rhythmic ensemble drums, rising strings, broad horns, a full wordless male choir. The four-note clan motif becomes a proud marching melody. Unity, scale, readiness. Ends on a powerful held chord.
```

**MUS-48 — Après la bataille** · R2-M047 · 2:30 · 56 BPM.

```text
Instrumental mourning music after a battle, walking through ruins and wounded warriors. 56 BPM, B-flat minor. Solo cello, sparse low drum, smoke-like synth pad, distant choir without words. The four-note clan motif played as a lament, slow and broken. Grief, cost of war, quiet respect.
```

**MUS-49 — Transmission** · mentorat, jugement, successeur, longue mémoire (R2-M049, M050, M052, M054, M055) · 3:00 · 70 BPM · boucle.

```text
Instrumental reflective theme about an old warrior teaching the next generation. 70 BPM, G minor. Warm low strings, gentle hand drums, a woodwind voice and a horn exchanging the four-note clan motif like teacher and student. Wisdom, patience, passing of knowledge. Seamless loop.
```

**MUS-50 — Mausolée** · R2-M057, M058 · 3:00 · 50 BPM · boucle.

```text
Instrumental ambient for a vast mausoleum of hunting masks and legends. 50 BPM, D minor. Cavernous reverb, slow sustained choir without words, soft metallic chimes, deep pedal notes, faint echoes of earlier themes. The four-note clan motif on a distant horn every 40 seconds. Reverent, ancient, haunted by memory. Seamless loop.
```

**MUS-51 — Épilogue « La longue chasse demeure »** · R2-M060 · 3:00 · 68 BPM.

```text
Instrumental final epilogue theme for a long hunting saga. 68 BPM, D minor resolving to D major. Begins with a solo low flute playing the childhood variation of the four-note motif, joined by strings, then horns, then a full orchestra and wordless choir restating the main theme. Final minute: quiet again, a single drum heartbeat and the motif on one horn. Bittersweet, proud, complete.
```

### Thèmes de race

Un motif propre à chaque race, mêlé au motif du clan dans les cérémonies et les combats de boss. Chaque prompt produit le thème seul (1:30) ; il se combine ensuite dans Flow Music avec Remix → Cover sur MUS-06, MUS-07 ou une piste de boss.

**MUS-60 — Yautja classique**

```text
Instrumental 90-second leitmotif for a classic jungle alien hunter race. 84 BPM, D minor. Deep log drums, breathy wooden flute, low horns, guttural clicking rhythm. A proud stalking melody built on a four-note descending minor motif. Patient, noble, primal.
```

**MUS-61 — Lost Tribe**

```text
Instrumental 90-second leitmotif for a nomadic tribe of alien hunters who roam far from home. 88 BPM, A minor. Dusty frame drums, metallic percussion, a weathered cello, distant city-like synth hum. Wandering, veteran, a little urban and gritty.
```

**MUS-62 — Super Predator**

```text
Instrumental 90-second leitmotif for a larger, crueler alien hunter race that keeps game preserves and hunting hounds. 96 BPM, C minor. Heavy distorted low brass, snarling growl textures, war drums, barking-like percussive stabs. Arrogant, brutal, dominant.
```

**MUS-63 — Feral**

```text
Instrumental 90-second leitmotif for a primitive, bone-masked alien hunter lineage. 100 BPM, E minor. Bone rattles, skin drums, bowed bone-like strings, throat drones, no synths. Raw, wild, ancient.
```

**MUS-64 — Assassin (hybride)**

```text
Instrumental 90-second leitmotif for a genetically enhanced hybrid alien killer. 110 BPM, B-flat minor. Cold industrial percussion, glitching synth bass, clinical pulses, sudden heavy impacts. Engineered, unnatural, relentless.
```

**MUS-65 — Fugitive**

```text
Instrumental 90-second leitmotif for a hunted alien fugitive on the run from its own kind. 120 BPM, G minor. Running hand drums, tense string ostinato, ticking pulse, breathless woodwind. Desperate, clever, defiant.
```

**MUS-66 — Hish-Qu-Ten**

```text
Instrumental 90-second leitmotif for an ancestral, dishonored alien warrior race. 72 BPM, C-sharp Phrygian. Dissonant low choir clusters, scraping metal, uneven drum pattern, a broken version of a noble four-note motif. Ancient, unstable, menacing.
```

**MUS-67 — Cyborg**

```text
Instrumental 90-second leitmotif for an alien hunter augmented with cybernetics. 104 BPM, F minor. Mechanical servo rhythms, analog synth arpeggios, tribal drums processed through distortion, a pure synthetic lead. Half flesh, half machine.
```

**MUS-68 — Exiled**

```text
Instrumental 90-second leitmotif for alien hunters stranded on a jungle island, crafting weapons from wood, bone and stone. 80 BPM, D Dorian. Wooden percussion, hollow log drums, bamboo-like flutes, ocean surf texture. Resourceful, isolated, enduring.
```

**MUS-69 — Emissary**

```text
Instrumental 90-second leitmotif for alien hunters wearing human military-style armor. 92 BPM, E minor. Military snare, low brass in march formation, alien clicking textures over it, radio static. Disciplined, diplomatic, ambiguous.
```

**MUS-70 — Infected**

```text
Instrumental 90-second leitmotif for an alien hunter mutated by a black biological substance. 66 BPM, atonal. Wet organic drones, bubbling textures, warped choir, irregular heartbeat, the four-note motif slowly melting out of tune. Body horror, tragic.
```

**MUS-71 — Four-Armed**

```text
Instrumental 90-second leitmotif for a rare four-armed hybrid alien warrior lacking discipline. 128 BPM, A minor. Doubled polyrhythmic drums (two patterns at once), frantic strings, roaring brass. Chaotic, overwhelming, unpredictable.
```

**MUS-72 — Meta (mode bonus)**

```text
Instrumental 90-second leitmotif for a super-powered alien hunter in a comic-book bonus mode. 140 BPM, E major turning to E minor. Heroic orchestral brass, big cinematic drums, electric energy synths, triumphant choir. Larger than life.
```

## Écarts connus et chantiers ouverts

1. **Deux enfances parallèles.** Les fiches M001 → M015 (cour, filet, Harek, Yena, Tov) ne correspondent pas aux chapitres joués V47 → V53 (nurserie en duel, dojo, désert, patrouille, petite Fosse). Décision à prendre : réécrire les fiches sur le joué, ou produire les fiches comme chapitres nouveaux.
2. **Rite Blooded incomplet.** Six salles profondes du temple, reine, œufs, purge et Quatza-Rij à trois (M018 → M020) manquent ; le joueur atteint pourtant le vaisseau et les chasses.
3. **Trajet R2-M023 non joué** selon les notes V89.
4. **Chasses 4 à 8 répétitives** : même structure d'objectifs et même logique de boss (`stepExpansionBoss`, seuils 60 % / 25 %). Les textes de phases décrivent des comportements non exécutés (trois gueules, vibrations, bond entre fosses, mémoire des routes, effacement des plateformes).
5. **Leurre audio sans effet sur les boss** : leur IA reçoit la position exacte du joueur.
6. **Acheron-Sigma sans atmosphère** : seul le vent est nul ; bruit et odeur se propagent encore.
7. **Fiches M025 → M060 sans aucun chapitre**, dialogues compris dans `dialoguesV6-*.json`.

## Comblement des vides de la campagne (proposé)

Chaque écart ci-dessus reçoit ici une solution de conception. Rien n'est encore implémenté ; c'est la cible à valider avant production.

### 1. Fusionner les deux enfances

Garder les chapitres joués et y raccrocher les fiches, plutôt que de tout refaire :

| Fiche | Chapitre joué qui la porte | Ajout nécessaire |
| --- | --- | --- |
| M001, M002 | V47 nurserie | scène courte après le duel : bête d'exercice échappée, filet, présentation de Harek, Yena, Tov |
| M003 | V48 trajet chef → maître | forge, livraison, carte locale |
| M004, M006 | V48 dojo et accueil | anneau, poutre, cible à ressort ; porte du râtelier Unblooded |
| M005 | V66 Premières Pistes | aucun : la scène correspond déjà (indices, observation sans attaque) |
| M007, M008 | V48 premier biomask, première lame | salle à surfaces contrastées ; aire à trois distances |
| M009 → M013 | nouveau chapitre « Les cinq ateliers » après V53 | camouflage, combistick, speargun, mines, medicomp |
| M014 | V52 patrouille + V67 passages | haltes et objet prêté |
| M015 | V68 reconnaissance Young Blood | aucun |

Harek, Yena et Tov rejoignent la cohorte aux côtés de Saar et Vek, déjà établis.

### 2. Terminer le rite Blooded (M017 → M020)

- **Six salles profondes** après la Vanne de Quarantaine : Descente des Contrepoids, Galerie des Coques (œufs), Puits de Résine, Chambre de Confinement, Nef de la Reine, Sas de Purge.
- **Quatza-Rij à trois** dans la Nef de la Reine : la cible est la reine du temple ; chaque partenaire tient un rôle de la répétition M016 (approche, ouverture, frappe).
- **Purge** : 60 s pour rejoindre le Sas de Purge, avec les blessés portés.
- **Retour et marque** joués comme décrit en M019 et M020. Musiques MUS-13, MUS-14, MUS-15, MUS-07.

### 3. Jouer le trajet R2-M023

Séquence de 3 à 4 minutes : décollage depuis le hangar, 3 balises de navigation à traverser sur la carte galactique, approche de la base, amarrage avec trois guides (orientation, vitesse, alignement), sortie à pied sur le quai. Un échec d'amarrage renvoie à la zone d'attente. Musique MUS-03.

### 4. Différencier les chasses 4 à 8

Remplacer la structure commune (3 scans, 6 éliminations, 2 récupérations) par une structure propre à chaque planète :

| Chasse | Structure proposée |
| --- | --- |
| Naraka-Delta | suivre 3 traînées de mucus → attendre la marée basse pour atteindre la nourricerie → prélever 2 capsules sans réveiller les gardiens → boss à trois têtes |
| Serekh-9 | poser 3 sondes sismiques en marchant (pas en courant) → escorter puis abandonner une caravane-appât → déterrer 2 balises → boss |
| Pelagos-M | écouter 3 chants depuis les bouées sonar → réactiver la station pour ouvrir les passerelles → reprendre 2 harpons dans les fosses → boss |
| Mycora-V | cartographier 3 nœuds → détruire 6 relais (au lieu de 6 éliminations) → isoler 2 graines en coupant le réseau → boss |
| Acheron-Sigma | lire 3 stèles → traverser la galerie mimétique sans répéter une arme → extraire 2 prismes → boss final |

Côté boss, sortir chaque Apex de `stepExpansionBoss` vers une fonction propre, sur le modèle de `stepVey`, `stepCryostalker` et `stepBadBlood`.

### 5. Le leurre sur les boss

Les boss consomment les événements du leurre comme l'IA régulière, avec une règle par Apex : Vey et le Paria y sont insensibles (chasseurs entraînés) ; Cryostalker, Hydre, Sandmaw et Léviathan le poursuivent 4 s ; le Cœur-Mère l'ignore après le premier usage (mémoire) ; le Gardien l'ignore dans le vide. Le scan du boss affiche cette règle.

### 6. Le vide d'Acheron-Sigma

Solution décrite dans le comblement de la chasse 8 : ni son ni odeur hors contact, détection par vibration et énergie, SFX étouffés.

### 7. Produire les actes VI à VIII

Ordre de production proposé, par lots jouables :

1. **Lot Xeno Prime** (M025 → M027) : réutilise les sprites xénomorphes V7 ; à produire : reine, ruche, MUS-41, MUS-42.
2. **Lot Adjutant** (M028, M029) : interface de coordination sur la base des Guerres des clans.
3. **Lot Warp** (M030 → M034) : facultatif pour Elite ; un seul décor d'époque suffit au premier aller-retour.
4. **Lot Guerre** (M035 → M037, M047) : branche les trois modes existants comme missions d'introduction.
5. **Lot Elite** (M038 → M043) : réutilise l'atelier des trophées, le Homeworld et la cible Quatza-Rij de R2-M018.
6. **Lot Navire de clan** (M044 → M046) : s'appuie sur `production/clan-ship-20261104/`.
7. **Lot Transmission** (M048 → M056) : réutilise des lieux déjà construits ; nouveaux PNJ novice et successeur.
8. **Lot Mémoire et épilogue** (M057 → M060) : mausolée existant, nouvelle cohorte, épilogue.

**Sources :** classeur `Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx` (onglet Campagne commune, SHA256 87ad5d1a…), `app/game/data.ts`, `app/game/worldScreens.ts`, `app/game/systems/worldBlueprints.ts`, `app/game/ecologyV8.ts`, `app/game/environmentPropAvailabilityData.ts`, `app/game/HuntCanvas.tsx`, `public/audio/`, `docs/campaign-continuity-audit-2026-08-31.md`, `docs/v68`, `v69`, `v70`, `v90`, `v92` du dépôt [darknigthmare/yautja-la-longue-chasse](https://github.com/darknigthmare/yautja-la-longue-chasse).
