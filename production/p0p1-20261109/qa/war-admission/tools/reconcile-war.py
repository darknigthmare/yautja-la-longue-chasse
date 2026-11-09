#!/usr/bin/env python3
"""Explicitly reviewed source-group reconciliation. No runtime or workbook mutation."""
from pathlib import Path
from collections import Counter,defaultdict
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[5]
OUT=ROOT/'production/p0p1-20261109/qa/war-admission'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=json.loads((OUT/'source-rows.json').read_text())
current=json.loads((ROOT/'production/p0p1-20261109/suivi/registre-priorites.json').read_text())
current_rows={x['key']:x for x in current['rows']}
groups={}
for row in source['items']:
 c=row['observations'][0]['cells'];i=row['id']
 cols=['C','D','E','F','L'] if re.match(r'CW1(?:3[6-9]|4[0-7])-',i)else ['B','C','D','E','F']
 text=' | '.join(c.get(k,'') for k in cols)
 groups.setdefault(text,[]).append(row)
assert len(groups)==376
G=list(groups.items())
# Each group number below refers to the exact, exported source-requirement-groups.txt,
# generated from source-rows.json whose underlying workbook row hashes were checked.
# This is an explicit review map, not a keyword-based automatic completion rule.
F={}
def feature(id,present,missing,files,tests=(),kind='PARTIEL',admission='Domaine uniquement'):
 F[id]={'id':id,'present':present,'missing':missing,'files':list(files),'tests':list(tests),'status':kind,'admission':admission}
S='app/game/systems/'
feature('ap','AP, réservation des équipes existantes, coût PC source et cadence V117 exécutés par les réducteurs V115.','Recette native assaut complète, entrée physique dans des scènes à plusieurs voies et homologation des contrôles/animations non démontrées.',[S+'clanWarOperationsV115.ts'],['recruitment-v115','assault-special-v117','four-modes-v135'])
feature('special','Spécial V117 unique, payé, borné par équipe engagée et portée ; AP/cadence bornés.','Armes et animations exactes par personnage/époque, contrôle matériel et recette native complète restent à admettre.',[S+'clanWarOperationsV115.ts',S+'clanWarFocusV142.ts'],['assault-special-v117','four-modes-v142'])
feature('flat-assault','Assaut V115 jouable dans une ligne x ; contact V141 synchrone, fronts et collisions entre groupes existants.','Le modèle WarMissionActorV115 ne possède pas de y : étages, plateformes, plusieurs voies, relief et couverts physiques ne sont pas réalisés par ce front.',[S+'clanWarOperationsV115.ts',S+'clanWarAssaultContactV141.ts'],['four-modes-v141','four-modes-v144'])
feature('assault-contact','Dégâts simultanés, limites HP, collision de front, défense/brace et registre local ; ordre des acteurs neutralisé.','La ligne x ne prouve pas des obstacles/hauteurs/trajectoires source ; recettes natives et effets/animations complets manquent.',[S+'clanWarAssaultContactV141.ts',S+'clanWarBraceV143.ts',S+'clanWarBaseScreenV144.ts'],['four-modes-v141','four-modes-v143','four-modes-v144'])
feature('waves','Profil source W3-U et budget PC, 6–9 vagues finies ; pas de clonage illimité du front.','Pas d’IA de flanc sur plusieurs voies, de table complète de tous les théâtres ni de mesures humaines d’équilibrage par biome.',[S+'clanWarOpenBacklogV140.ts',S+'clanWarOperationsV115.ts'],['four-modes-v140','four-modes-v144'])
feature('focus','Focus/repli/brace exécutés sur des acteurs existants, portée et coût contrôlés ; pas de tir gratuit avant le tick.','La couverture derrière objets, les contre-attaques tactiques sur plusieurs voies et l’admission native complète ne sont pas prouvées.',[S+'clanWarFocusV142.ts',S+'clanWarRegroupV144.ts',S+'clanWarAssaultRegroupV144.ts'],['four-modes-v142','four-modes-v144','four-modes-pr55-v144','four-modes-pr57-v144'])
feature('interpose','V145 protège un allié à proximité ≤6, transfère un dégât réel, durée/coût/identité contrôlés ; lecteur accepte le champ ancien absent.','Recette utilisateur et art source manquants ; aucune transposition de blessures dans les soldats V85 autorisée.',[S+'clanWarInterposeV145.ts',S+'clanWarAssaultContactV141.ts',S+'clanWarOperationsV115.ts'],['four-modes-v145'])
feature('assault-cloak','Le camouflage à énergie existe dans la boucle infiltration, distincte de l’assaut.','Le modèle d’assaut V115 ne met pas en œuvre le camouflage optique/contre-mesures décrit ici ; ne pas lui attribuer le réducteur infiltration.',[S+'clanWarOperationsV115.ts'],['operation-cross-mode-v115'],'OUVERT_IMPLEMENTATION_A_REALISER')
feature('boss','Un bastion HP et des vagues finies existent dans l’assaut.','Boss source à plusieurs phases/points destructibles et scénarios de siège correspondants non réalisés.',[S+'clanWarOperationsV115.ts'],['four-modes-v140'])
feature('mounts','Des définitions W3-U et des profils de formations sont conservés.','Pas d’identité physique de monture, gardien, déplacement/embarquement et collision de bête dans l’assaut ou les ouvrages demandés.',[S+'clanWarBibleV6.ts',S+'clanWarWorksV6.ts'],['works-v6'],'OUVERT_IMPLEMENTATION_A_REALISER')
feature('route','Graphe dirigé V6, capacité PC et 1–3 itinéraires source légaux ; pas d’itinéraire inventé entre W3-K.','La portée est le graphe local V6. Routes multi-planètes, distances géodésiques réelles, spatioports et accès physiques complets non réalisés.',[S+'clanWarBibleV6.ts',S+'clanWarOuterChoicesV142.ts',S+'clanWarOuterRerouteV144.ts'],['four-modes-v142','four-modes-v145','outer-recall-continuity'])
feature('dueat','Départ/dueAt stables, réservation d’équipe et règlement tardif unique dans l’archive locale V115.','Temps client local, pas d’horloge serveur signée ; recette native de chaque mode/ordre et scénarios réseau restent ouverts.',[S+'clanWarOperationsV115.ts',S+'clanWarOperationsArchive.ts'],['four-modes-v135','four-modes-v145','operations-archive'])
feature('recall','Retour pondéré par tronçons effectivement atteints ; correction 2026-11-09 couvre passage partiel, jonction, halte/détour/cadence et vrai reroutage V6.','Il s’agit de progression calculée sur graphe local, sans convoi animé/GPS ; réseau et recette native du rappel non admis.',[S+'clanWarOuterWeightedProgressV141.ts',S+'clanWarOuterRouteProgressV140.ts',S+'clanWarOperationsV115.ts'],['outer-recall-continuity','four-modes-v145'])
feature('incident','Incident de passage réel V143, sécurisation 2 RAV ou détour 10 s, halte reconnaissance 15 s, cadence et reroutage ; décisions conservées.','Les incidents sont des ordres/délais/rapports locaux. Ennemis et véhicules physiques sur tous les tronçons, scénarios météo complets et 36 scripts W5 non réalisés.',[S+'clanWarOuterIncidentV143.ts',S+'clanWarOuterPaceV144.ts',S+'clanWarOuterInspectionV144.ts',S+'clanWarOuterRerouteV144.ts'],['four-modes-v143','four-modes-pr55-v144','four-modes-pr57-v144','four-modes-v145'])
feature('travel','Progression par poids source, suspensions de temps et estimation par passage ; ni GPS fictif ni ennemi caché révélé.','Admission visuelle/native de tous les trajets et transporteurs physiques à réaliser ; les coordonnées sont des estimations temporelles locales.',[S+'clanWarTravelLedgerV145.ts',S+'clanWarOuterWeightedProgressV141.ts'],['four-modes-v145','outer-recall-continuity'])
feature('outer-report','Trois échanges locaux, doctrine/recon/escorte/interception, reçu unique et rapports après vraie échéance ; rappel sans blessure inventée.','Pas d’état de guerre global authentifié, de diplomatie persistante complète ou de bilan attribuable aux personnages V85 ; recette GameClient debrief intégrale non attestée.',[S+'clanWarOperationsV115.ts',S+'clanWarDebriefV144.ts'],['operation-cross-mode-v115','four-modes-v135','provenance-gate-v152'])
feature('reserve','Même roster V115 partagé entre modes, équipes occupées indisponibles, recrutement et dépenses source bornés ; coûts locaux conservés.','Cette économie d’exercice ne représente pas les stocks/équipements acquis et garnisons persistantes V85 ; transport physique et économie de guerre longue manquent.',[S+'clanWarOperationsV115.ts'],['recruitment-v115','operation-cross-mode-v115','four-modes-v135'])
feature('medical','Blessures locales identifiées, médic W3-U18 recruté/disponible, RAV et délai réel ; pas de blessure fictive au rappel.','L’extraction médicale multi-cases du mandat Outer et le transfert signé aux personnes V85 ne sont pas implémentés par ce panneau ; un atelier médical séparé ne suffit pas.',[S+'clanWarOperationsV115.ts',S+'clanWarMedicalV92.ts'],['medical-v116','outer-recall-continuity'])
feature('vehicles','Routes V6 et atelier de cargaison/ouvrages identifiés existent, avec cargaison comptée dans leur propre contexte.','Convoi avec véhicules animés présents sur chaque tronçon, carburant, embarquement et navire acquis en campagne non raccordés à ces missions.',[S+'clanWarConvoyRouteV105.ts',S+'clanWarWorksV6.ts',S+'clanWarOperationsV115.ts'],['works-v6','structures-v89'])
feature('stealth','Infiltration V115 sur terrain V116 9×6 : collisions, couvert, relais physique, extraction et réactions de garde.','Sauts/escalade/gabarits, plusieurs étages et intérieurs source complets non représentés par ce modèle 2D borné.',[S+'clanWarOperationsV115.ts',S+'clanWarMissionTerrainV116.ts',S+'clanWarStealthPathV142.ts'],['terrain-v116','stealth-reconciliation'])
feature('cloak','Camouflage infiltration consomme l’énergie au tour, cesse à réserve insuffisante ; extraction/relais exigent position physique.','Masque/bracelet et effets exacts par œuvre, perturbations physiques et admission native/manette restent ouverts.',[S+'clanWarOperationsV115.ts'],['four-modes-v135','terrain-v116'])
feature('perception','LOS avec murs/couverts, patrouille V140, contact ancien borné, garde secondaire séparé et absence de superposition vérifiés.','Vision thermique, propagation sonore/lumière continue, étages complexes et coordination complète de nombreux gardes ne sont pas implémentés.',[S+'clanWarStealthPatrolV140.ts',S+'clanWarStealthGuardPlacement.ts',S+'clanWarOperationsV115.ts'],['stealth-perception','stealth-last-contact','stealth-reconciliation','four-modes-v145','integrated-last-contact-v150'])
feature('reinforcement','Renfort V144 déclenchable par vraie alerte, entrée traversable, deux gardes avec perception distincte et migration des anciens états.','Deux gardes de grille ne prouvent pas plusieurs castes animées, plusieurs étages ou coopération réseau ; recette native manquante.',[S+'clanWarStealthReinforcementV144.ts',S+'clanWarStealthGuardPlacement.ts',S+'clanWarOperationsV115.ts'],['four-modes-v144','four-modes-v145','stealth-reconciliation'])
feature('decoy','Leurre posé depuis la case du chasseur, coût énergie et durée bornés ; investigation se déplace physiquement.','Audio enregistré/spatialisé et animations source de diversion non livrés par ce mécanisme de grille.',[S+'clanWarStealthDecoyV141.ts',S+'clanWarOperationsV115.ts'],['four-modes-v141'])
feature('coverstep','Pas couvert/sprint sont bornés à deux pas sûrs et une réaction par pas ; énergie et collision contrôlées.','FX/costumes/animations source, tactile et matériel manette non admis.',[S+'clanWarStealthPathV142.ts',S+'clanWarStealthDashV143.ts'],['four-modes-v142','four-modes-v143'])
feature('listen','Écoute retourne un indice directionnel borné vers une patrouille proche, sans coordonnées ennemies cachées.','Ce calcul n’est pas un son enregistré et occulté ; audio spatial, thermique et modèle continu de luminosité restent à développer.',[S+'clanWarOperationsV115.ts',S+'clanWarStealthPatrolV140.ts'],['four-modes-v143','four-modes-v145'])
feature('power','Relais/portes et alimentation bornée présents sur cartes source compatibles ; interaction à portée, passage alternatif et pression orbitale contrôlés.','Pas de réseau électrique complet par section, ascenseurs/multiples étages et appareils exacts de chaque œuvre ; V129 distinct de la petite infiltration V115.',[S+'clanWarMissionTerrainV116.ts',S+'clanWarSourceMapsV128.ts',S+'clanWarOperationsV115.ts'],['source-maps-v128','terrain-v116','four-modes-v144'])
feature('neutral','Le RTS W133 contient porteur/témoin et extraction physique distincte des rivaux ; exercices sans gain d’honneur/trophée automatique.','Cette escorte n’est pas intégrée comme mission infiltration V115 ; civils, corps, conséquences de mandat et dialogues persistants restent à réaliser.',[S+'clanWarRtsSquadsV133.ts',S+'clanWarOperationsV115.ts'],['rts-squads-v133','council-v147-victories'])
feature('fauna','Les paramètres de monde/biome et catalogues source sont disponibles.','Pas de simulation de faune indépendante répondant odeur/bruit/saison dans l’infiltration V115 ; ne pas attribuer automatiquement une faction.',[S+'clanWarMissionTerrainV116.ts',S+'clanWarOperationsV115.ts'],['terrain-v116'],'OUVERT_IMPLEMENTATION_A_REALISER')
feature('rts','RTS W133 réel à 2–4 escouades, ordres distincts, carte source, attaque/portée, objectifs et extraction.','Armées de grande échelle, économie territoriale, véhicules/montures et intégration campagne ne sont pas réalisés par cette étude autonome.',[S+'clanWarRtsSquadsV133.ts','app/game/ClanWarRtsSquadsV133.tsx'],['rts-squads-v133','four-modes-v144'])
feature('rts24','24 scripts W3 et 72 tâches sur 12 cartes ; interaction, accompagnement/portage et extraction implémentés.','Les 24 parcours de tests retirent ennemis ET dangers pour isoler les objectifs, puis restaurent la carte uniquement pour vérifier le Conseil. Ils ne prouvent pas 24 victoires avec combat réel, ni 30 planètes jouables ni navigateur/pad.',[S+'clanWarRtsSourceMissionsV129.ts',S+'clanWarRtsSquadsV133.ts','tests/clan-war-council-v147-victories.test.mjs'],['rts24-source-v129','rts-squads-v133','council-v147-victories'])
feature('maps','12 grilles aux dimensions source, planète/strate correctes, trois chemins distincts et sorties reliées ; MAP12 reste orbitale et MAP10 souterraine.','Ces grilles ne sont pas des scènes GIS/film 1:1 ; le transport entre surface/sous-sol/orbite et la géographie fine demeurent non raccordés.',[S+'clanWarSourceMapsV128.ts',S+'clanWarRtsSourceMissionsV129.ts'],['source-maps-v128','rts24-source-v129'])
feature('rts-budget','Coûts PC/RAV et unités disponibles issus W3, formations et plafond du scénario contrôlés avant déploiement.','Rosters de campagne, logistique de plusieurs armées et transactions entre appareils ne sont pas raccordés.',[S+'clanWarRtsSquadsV133.ts',S+'clanWarRtsSourceMissionsV129.ts'],['rts-squads-v133','rts24-source-v129'])
feature('rts-move','Rally/waypoint : au plus un pas collectif ; traffic recalcule autour obstacles ; marche ≤3 pas, collisions et arrêt au danger/contact.','Gabarits physiques de montures, pentes/étages/ponts volumétriques et admission manuelle de groupes sur tous les théâtres restent ouverts.',[S+'clanWarRtsSquadsV133.ts',S+'clanWarRtsWaypointV142.ts',S+'clanWarRtsMarchV143.ts'],['rts-rally-v134','four-modes-v140','four-modes-v142','four-modes-v143','four-modes-v144'])
feature('rts-fog','Ennemis filtrés par observation/LOS ; ordres défensifs, veille/suppression et tir croisé refusent les cibles invisibles.','Autorité réseau sur les données secrètes et propagation exacte des munitions/altitude/tous les couverts non livrées.',[S+'clanWarRtsSquadsV133.ts',S+'clanWarSourceMapsV128.ts'],['rts-squads-v133','four-modes-v144'])
feature('rts-hazard','Fenêtres météo source et dangers affectent les deux camps, objectifs refusés hors fenêtre ; pression/énergie orbitales contrôlées.','Admettre les scènes complètes avec tous dangers/ennemis actifs ; aucun biome textuel n’atteste un rendu source 1:1.',[S+'clanWarRtsSquadsV133.ts',S+'clanWarSourceMapsV128.ts'],['source-maps-v128','four-modes-v140','four-modes-v144'])
feature('rts-medic','Soins/secours V138, porteur et extraction V139/V144 gardent les mêmes identités locales et des déplacements de grille.','Captifs/disparus complets, montures/transport source et blessures permanentes V85 non raccordés.',[S+'clanWarRtsSquadsV133.ts'],['rts-squads-v133','four-modes-v144'])
feature('handover','Relève physique V145 conserve holdTurns et titulaire vivant ; seuls les ticks normaux progressent ; l’ancien titulaire peut rejoindre la sortie.','État sérialisable en mémoire, mais composant W133 utilise useState sans lecteur ni persistance : rechargement navigateur ne reprend pas ce poste.',[S+'clanWarRtsSquadsV133.ts','app/game/ClanWarRtsSquadsV133.tsx'],['four-modes-v145'])
feature('construction','Atelier indépendant V6/V89 réalise 12 ouvrages avec kits, opérateurs, entretien, relais/treuil/pont et cargaison identifiés.','Construction/destruction de batteries et économie RTS de bataille W133/territoires V85 ne sont pas raccordées à cet atelier.',[S+'clanWarWorksV6.ts',S+'clanWarRtsSquadsV133.ts'],['works-v6','structures-v89'])
feature('large-war','W133 fournit quatre escouades maximum et douze cartes source ; V85 possède son simulateur stratégique séparé.','2–4 armées, bataille 200 unités, économie inter-régions, renforts physiques et garnisons persistantes autorisées ne sont pas implémentés dans cette boucle.',[S+'clanWarRtsSquadsV133.ts','app/game/ClanWarRtsSquadsV133.tsx',S+'clanWarV85.ts'],['rts-squads-v133'])
feature('identity','V152 compare les ID exacts, conserve les rosters séparés et refuse le rapprochement par suffixe.','Aucune correspondance vérifiée W3-K/CON-T ni personne V115/V85 ; roster.matchedPersons=0 et verifiedCoordinates=false. Il manque preuve géographique/personne et autorité, pas une simple conversion de noms.',[S+'clanWarProvenanceGateV152.ts',S+'clanWarSourceAuditV146.ts'],['provenance-gate-v152','source-reconciliation-v147'])
feature('bridge','Conseil V146/V147 et garde V152 examinent la preuve source sans gain ni écriture campagne ; exercices demeurent séparés.','Le contrat positif autorisé V6→V85, consentement/autorité serveur, identités et transactions idempotentes de territoires/XP/blessures ne sont pas implémentés. Le refus sûr ne termine pas la conquête demandée.',[S+'clanWarProvenanceGateV152.ts',S+'clanWarCouncilAuditV146.ts',S+'clanWarCouncilReviewV147.ts'],['provenance-gate-v152','council-v146','council-v147','source-reconciliation-v147'])
feature('guard','Exercice local conserve son recrutement et XP internes, sans conquête ni gain/transfert de recrue, honneur/trophée, XP ou blessure dans la campagne SaveGame/V85 ; V152 interdit ces mutations.','Qualification bornée au refus de mutation et à l’exercice. Aucun droit positif de campagne, de canon visuel ou d’authentification serveur déduit.',[S+'clanWarProvenanceGateV152.ts',S+'clanWarOperationsV115.ts'],['provenance-gate-v152','operation-cross-mode-v115'],'QUALIFIE_BORNE_DOMAINE')
feature('archive','Archive V115 versionnée : intent IndexedDB confirmé, miroir localStorage, CAS/fence et Web Locks coopératifs, blocage conservateur et récupération.','Preuve native bornée à la fixture qui héberge les vrais composants/réducteurs et deux onglets de même origine ; anciens clients non coopérants, cloud, vraie archive utilisateur et tous les modes E2E ne sont pas admis. W133 reste en mémoire.',[S+'clanWarOperationsArchive.ts',S+'clanWarFenceV94.ts','app/game/ClanWarOperationsV115.tsx'],['operations-archive','fence-v94'],'PARTIEL','Domaine et navigateur fixture bornée : 12 contrôles archive/attempt-2')
feature('old-client','Le protocole coopératif courant détecte les changements locaux, conserve l’archive avant réparation et bloque une écriture concurrente connue.','Un ancien client qui ignore le protocole peut encore écrire après validation du nouveau. Il faut mécanisme de migration/exclusion d’ancienne version et arbitre partagé ; Web Locks ne contraint pas cet ancien client.',[S+'clanWarOperationsArchive.ts',S+'clanWarFenceV94.ts'],['operations-archive','fence-v94'])
feature('migration-real','Lecteur V115 valide source/version/roster, accepte plusieurs champs anciens absents et refuse corruption ; tests de snapshots synthétiques.','Fixtures de sauvegardes réelles utilisateurs et preuve de migration sans perte/reprise exacte sur les trois contextes restent manquantes. Ne pas appeler un état de test une archive utilisateur.',[S+'clanWarOperationsV115.ts',S+'clanWarOperationsArchive.ts'],['four-modes-v145','operations-archive'])
feature('council','Dossier V146/V147 dépliable dans V115 et W133, reçu source unique et explicites lacunes/absence de bouton d’annexion.','QA native complète de chaque débrief, mobile/pad et longue session restent non attestées ; les parcours Atlas ou fixture archive ne sont pas cette recette Conseil.',[S+'clanWarCouncilAuditV146.ts',S+'clanWarCouncilReviewV147.ts','app/game/ClanWarOperationsV115.tsx','app/game/ClanWarRtsSquadsV133.tsx'],['council-v146','council-v147','council-v147-victories'])
feature('geography','V126 distingue Terre/alien/inconnu et climat ; 1 200 identifiants conservés. CSV/JSON et détail natif corrigés pour biome/lieu courant, Normandie tempérée et Louvre intérieur.', 'Une géographie déclarée n’est pas une scène GIS/film exacte ni un bâtiment raccordé. Références terrain/LOD fines et validation artistique humaine restent manquantes.',[S+'clanWarWorldClimateV126.ts',S+'clanWarVariantExportV126.ts','app/game/ClanWarVariantAtlasV120.tsx'],['geo-ai-multiplayer-v126'],'PARTIEL','Domaine et Next natif Atlas : 12 contrôles, trois lieux, sept téléchargements dont 320px')
feature('planet-geometry','30 planètes V96 distinctes, matériau/continents/territoires, routes V156 avec accessibilité et ancien graphe sauvegardé conservés.','Cela ne fournit pas 30 théâtres RTS, ni formes/volumes/rivières et textures 1:1 homologués ; scènes physiques à admettre par monde.',[S+'clanWarPlanetsV96.ts',S+'clanWarPlanetGeneratorV115.ts',S+'clanWarPlanetGeographyV103.ts'],['planet-level-design-v156'])
feature('design1200','Catalogue V120/V126 contient exactement 1 200 cartes et identifiants, dont 400 hommages Terre ; originaux conservés en export.', 'Toutes les variantes sont marquées design-only. Composer et tester 1 200 niveaux physiques/objectifs/acteurs reste à réaliser ; un export ne transforme pas ces cartes en scènes.',[S+'clanWarVariantAtlasV120.ts',S+'clanWarWorldClimateV126.ts',S+'clanWarVariantExportV126.ts'],['geo-ai-multiplayer-v126'])
feature('views','Carte planétaire/tactique disposent de données ID/planète source et d’outils de présentation séparés.','Continuité native complète monde/cité/intérieur/vaisseau, objets persistants, orientation/volumes et changement de vue sans perte non attestés par les essais d’export Atlas.',[S+'clanWarViewV131.ts',S+'clanWarPlanetsV96.ts','app/game/ClanWarRtsSquadsV133.tsx'],['source-maps-v128'])
feature('server','Contrat pur V126 : lobby, slots/readiness, ownership, révision/tick/séquence, anti-rejeu et masquage. Il annonce authority=server-required et campaignWrite=forbidden.','Aucune route/transport WebSocket Guerre ni stockage serveur runtime dans cette source ; db/schema.ts est vide. Service Guerre, authentification réelle, horloge signée, SQL/arbitre, reconnexion et QA deux appareils restent à implémenter/configurer. La situation d’un éventuel serveur externe n’est pas prouvée.',[S+'clanWarMultiplayerV126.ts',S+'clanWarMultiplayerPracticeV127.ts','db/schema.ts'],['geo-ai-multiplayer-v126','multiplayer-practice-v127'],'OUVERT_SERVICE_GUERRE_NON_IMPLEMENTE','Contrat pur testé ; aucun service réseau admis')
feature('practice','Pratique locale V127 9×6 : propriété des unités, déplacements, LOS de tir, ordre unique par unité/tick et occupation trois ticks ; memory-only explicite.','Aucune synchronisation distante/autorité serveur. Ce test local ne qualifie pas coop assaut/infiltration/RTS ni reconnexion cloud.',[S+'clanWarMultiplayerPracticeV127.ts',S+'clanWarMultiplayerV126.ts'],['multiplayer-practice-v127','geo-ai-multiplayer-v126'])
feature('art','Douze props de terrain indépendants SVG existent et le registre gauntlet conserve références et distinctions de preuve.','Pas de certificat humain source par personnage/époque/arme/peau/masque/monture/bâtiment, ni toutes animations/cinématiques/PNG séparés. Les props originaux du3novembre se déclarent explicitement non certifiés film.', ['app/game/ClanWarFieldSprite.tsx',S+'clanWarGauntletCatalogV132.ts',S+'clanWarOperationsV115.ts'],['source-consolidation-v147'],'OUVERT_ADMISSION_ART_REFERENCES')
feature('gauntlet','54 styles documentaires, préférence cosmétique liée au propriétaire et conditions de déblocage distinctes des pouvoirs.','Aucun des 54 gauntlets homologué 1:1 par gros plans et revue de prop ; origine d’un personnage ne prouve pas son poignet individuel.',[S+'clanWarGauntletCatalogV132.ts','app/game/data/clanWarGauntletCatalogV132.json'],[],'OUVERT_ADMISSION_ART_REFERENCES')
feature('controls','Entrées clavier filtrées et boutons de grille accessibles ; Atlas export contrôlé à 320px dans Chrome desktop.','Essais matériels manette, tactile réel, lecteur d’écran, focus complet et HUD/feedback audio sur toutes les boucles restent non attestés. Une viewport 320px n’est pas un téléphone ni un pad.',[S+'clanWarFieldControls.ts','app/game/ClanWarRtsSquadsV133.tsx','app/game/ClanWarOperationsV115.tsx'],['stealth-reconciliation'],'OUVERT_ADMISSION_APPAREILS')
feature('audio','Indice acoustique directionnel de grille et textes/registre de sources disponibles.','Sons enregistrés situés avec portée/occultation physique de ce mode non intégrés ; une direction textuelle ou une palette sonore ne fournit pas cet audio.',[S+'clanWarOperationsV115.ts',S+'clanWarWorksV6.ts'],['four-modes-v143'],'OUVERT_IMPLEMENTATION_A_REALISER')
feature('lore','Catalogue de sources et Conseil séparent les mécanismes inventés des descriptions des œuvres ; V152 interdit l’étiquette homologuée sans preuves.','Matrice complète source primaire/continuité/timestamp pour chaque lieu, acteur et équipement puis revue humaine ne sont pas attestées. Pas de confusion lieu de tournage/lieu du récit autorisée.',[S+'clanWarMissionDossiersV117.ts',S+'clanWarSourceAuditV146.ts',S+'clanWarProvenanceGateV152.ts'],['source-dossiers-v117','source-consolidation-v147','provenance-gate-v152'])
feature('diplomacy','15 doctrines et 18 accords source conservés en dossiers V117 ; spécialités et quelques coefficients de simulation locale W3 existent.','Dossiers étiquetés dossier-only. Arbres diplomatiques, permissions/alliances persistantes, choix d’honneur contextualisés et toutes conséquences jouables ne sont pas raccordés.',[S+'clanWarMissionDossiersV117.ts',S+'clanWarOperationsV115.ts'],['source-dossiers-v117','four-modes-v135'])
feature('story','Textes et provenance des dossiers W3/W5 conservés séparés du résultat des quatre exercices.','36 scripts W5 uniques, branches narratives par clan, documents/choix conditionnels et chaque scène source ne sont pas des missions jouables dans cette livraison.',[S+'clanWarMissionDossiersV117.ts',S+'clanWarVariantAtlasV120.ts'],['source-dossiers-v117'])
feature('balance','Budgets/ticks et vagues sont bornés et testés ; pas de renforts illimités.','Évaluation statistique difficulté/région, jeux complets réels avec adversaires actifs et sessions humaines d’équilibrage non fournis.',[S+'clanWarOpenBacklogV140.ts',S+'clanWarOperationsV115.ts',S+'clanWarRtsSquadsV133.ts'],['four-modes-v140','four-modes-v144'],'OUVERT_ADMISSION_EQUILIBRAGE')
feature('performance','Boucles locales ont des budgets finis ; aucune nouvelle charge runtime introduite par cet audit.','Test de charge RTS 200 unités, modeste appareil, faibles FPS/latence, mémoire/offline et plusieurs vagues avec mesures stables non fourni pour cette boucle.',[S+'clanWarOperationsV115.ts',S+'clanWarRtsSquadsV133.ts'],['four-modes-v140'],'OUVERT_ADMISSION_PERFORMANCE')
feature('finished-level','Quatre exercices jouables bornés et 24 scripts/12 grilles source existent.','Admission de scènes complètes avec tous objectifs, PNJ, contrôles, adversaires/dangers actifs, performance et vraie fin GameClient n’est pas attestée ; cela ne certifie pas 1 200 niveaux.',[S+'clanWarOperationsV115.ts',S+'clanWarRtsSquadsV133.ts'],['rts-squads-v133','council-v147-victories'])
# Unsupported structures: source data remains visible, effects must not be invented.
works_gaps={371:'Quai : rive praticable, quai implanté et transport acquis identifié ; pas de téléportation de cargaison.',372:'Enclos : montures existantes identifiées, gardiens/capacité et déplacement physique ; pas de monture créée depuis un compteur.',373:'Confinement : alimentation raccordée et coût effectif contrôlé.',374:'Arène : consentement des deux participants et résultat réel du duel, aucune victoire automatique.',375:'Acoustique : enregistrement sonore situé, portée et occultation ; le texte de direction de voix ne suffit pas.',376:'Orbite : navire acquis et route orbitale effective ; inspection documentaire ne donne ni coque ni voyage.'}
for n,gap in works_gaps.items():feature('work-'+str(n),'La définition source est conservée dans la Bible, mais ce W3-S est absent du tableau supportedWorks (12 autres ouvrages exécutables).',gap+' Acquisitions/autorité de campagne non reçues.',[S+'clanWarWorksV6.ts'],['works-v6','structures-v89'],'OUVERT_IMPLEMENTATION_A_REALISER')
# Reviewed composites keep mode-specific evidence instead of inheriting Atlas proofs.
feature('stealth-regions','Six profils régionaux V116 fournissent terrains, couverts et obstacles de la petite grille infiltration ; la variante est choisie depuis le territoire source.','Six régions de grille ne sont pas trente planètes/scènes complètes ; météo, costumes et diversité finale des gardes restent à admettre.',[S+'clanWarMissionTerrainV116.ts',S+'clanWarOperationsV115.ts'],['terrain-v116','stealth-perception'])
feature('stealth-climate','Le territoire source choisit un des six profils V116 et la perception tient compte de murs/couverts dans les opérations infiltration.','Variation complète de vitesse et visibilité selon biomes, horaires, lumière et saisons non implémentée/homologuée ; le catalogue climatique Atlas ne teste pas cette boucle.',[S+'clanWarMissionTerrainV116.ts',S+'clanWarOperationsV115.ts',S+'clanWarStealthPatrolV140.ts'],['terrain-v116','stealth-perception'])
feature('waves-climate','Vagues V140 finies, profils de budget W3 et garde climatique V126 présents ; ni clones infinis ni climat polaire attribué au désert chaud dans le catalogue.','Équilibrage difficulté/territoire/climat en scènes natives complètes non attesté ; les tests d’exports seuls ne prouvent pas les budgets.',[S+'clanWarOpenBacklogV140.ts',S+'clanWarOperationsV115.ts',S+'clanWarWorldClimateV126.ts'],['four-modes-v140','four-modes-v144','geo-ai-multiplayer-v126'])
MAP={}
def assign(feature_id,nums):
 for n in nums:
  assert n not in MAP,(n,MAP.get(n),feature_id)
  MAP[n]=feature_id
assign('flat-assault',[1,6,20,45,49,118,150,207,209,295,341])
assign('geography',[2,4,28,103,104,105,188,238,250,344])
assign('perception',[3,11,91,94,123,128,176,212,232,274,298,326,328,350,353])
assign('art',[5,12,21,171,211,229,235,240,242,243,248,251,270,276,282,289,309,314,322,337,340,342,348,352,366,368])
assign('bridge',[7,13,14,19,23,24,34,36,38,52,58,88,100,121,138,148,158,173,174,190,191,198,199,204,217,221,223,224,230,346,354,360,361,364])
assign('vehicles',[8,25,87,186,214,288,294,356,370])
assign('incident',[9,26,135,136,185,215,231,260,301,307,357])
assign('identity',[10,17,18,22,187,201,202,203,225,359])
assign('server',[15,27,29,37,42,54,55,56,60,61,62,120,129,137,147,153,156,159,162,180,181,189,197,210,213,216,220,226,234,254,255,256,257,258,268,310,338,355,363])
assign('maps',[16,77,81,144,264,281])
assign('stealth',[30,90,96,126,349])
assign('migration-real',[31,227,324,327,330])
assign('audio',[32,290])
assign('controls',[33,172,228,236,244,245,247,279,286])
assign('rts24',[35,40,76,89,141,192])
assign('old-client',[39])
assign('finished-level',[41,205])
assign('gauntlet',[43])
assign('ap',[44,48,114,166,287])
assign('assault-contact',[46,53,117,167,170])
assign('waves',[47,116,151,163,168,252,345])
assign('focus',[50,51,119,152,169,308])
assign('practice',[57,59])
assign('route',[63,157,182,259,358])
assign('dueat',[64,74,130,183])
assign('outer-report',[65,70,131,241,262,263,292,303])
assign('recall',[66,132,329])
assign('guard',[67,73,95,102,108])
assign('reserve',[68,69,106,109,111,133,134])
assign('medical',[71,107,302])
assign('views',[72,200,222,283])
assign('rts',[75,82,362,365])
assign('rts-budget',[78,143,266])
assign('rts-move',[79,113,139,161,165,193,319,320])
assign('rts-fog',[80,140,145,194,195])
assign('power',[83,92,97,154,155,160,164,178,179,273])
assign('rts-hazard',[84,321])
assign('rts-medic',[85,86,142])
assign('neutral',[93,98,99,127,272,277,300,315,318,367])
assign('archive',[101,208,347,351])
assign('lore',[112])
assign('special',[115,246])
assign('cloak',[122,124,125,271])
assign('reinforcement',[177])
assign('travel',[184,317])
assign('large-war',[146,196,219,233,306])
assign('balance',[149,206,339])
assign('construction',[218,305])
assign('design1200',[110,237,239])
assign('assault-cloak',[249])
assign('performance',[253,269,285])
assign('diplomacy',[261,265,267,291,293,369])
assign('fauna',[275])
assign('mounts',[296])
assign('boss',[297])
assign('story',[304,343,278])
assign('decoy',[311])
assign('coverstep',[312])
assign('listen',[313])
assign('planet-geometry',[280])
assign('lore',[284])
assign('stealth-regions',[316])
assign('stealth-climate',[299])
assign('waves-climate',[175])
assign('interpose',[323,325])
assign('incident',[331])
assign('handover',[332,333,334])
assign('council',[335,336])
for n in range(371,377):assign('work-'+str(n),[n])
assert set(MAP)==set(range(1,377)),{'missing':sorted(set(range(1,377))-set(MAP))}
# Guard-only groups qualify logic, never the positive V85 write which uses the bridge feature.
# Narrow acceptance notes preserve distinctions hidden by repeated historical feature labels.
OVERRIDE={
 17:'Géographie W3-K ↔ CON-T non démontrée : le garde refuse la correspondance ; ne pas considérer ce refus comme la liaison positive demandée.',
 18:'ID combattant V115 distinct du soldat V85 ; consentement, historique et preuve d’identité absents.',
 53:'Les hazards des grilles RTS ne sont pas une simulation de marée/éboulement/lave et pannes à plusieurs sections dans l’assaut latéral.',
 59:'Masquage de la vue pure V126 et distance locale V127 seulement ; aucune donnée client serveur filtrée en transport réel ni réseau admis.',
 70:'Le réducteur ne tue pas le roster simplement par minuterie. États prolongés de capture/disparition/rupture radio non simulés complètement.',
 72:'Passage mandat Outer → incarnation recon/intervention avec même contrat et rapport non implémenté ; ne pas confondre avec le commutateur de vues.',
 74:'CAS/anti-rejeu et lecteurs sont testés, mais la recette cumulée 100 appels + heure reculée + coupure + source changée + tous onglets n’est pas attestée comme campagne complète.',
 81:'Identité planète/carte source préservée ; chaque cellule de grille ne possède pas encore une implantation géographique fine démontrée.',
 101:'V115 dispose du protocole courant et de cas de migration anciens. V120 design/W133 en mémoire et toutes archives V85 ne sont pas une migration native globale validée.',
 104:'Climats corrigés et contrôlés sur les 1 200 données. Le raccord physique de chaque bâtiment n’est pas établi par ces gardes de catalogue.',
 105:'Natural Earth 1:110m/WGS84 et labels d’incertitude sont présents ; aucun relevé GIS/LOD/rue/scène 1:1 n’est homologué.',
 110:'1 200 identifiants et originaux exportés, 24 missions source existantes. Admission CSV/JSON native couvre trois lieux Atlas, pas export/intégration complète de 24 batailles.',
 111:'Validations économiques/archives exercées ; pas de journal global d’idempotence des commandes de tous modes avec autorité serveur.',
 124:'Relais situé à portée et sabotage unique dans V115 testés ; tous appareils multi-étapes source ne sont pas ce relais.',
 125:'V115 exige sabotage puis sortie effective, reçu local unique sans annexion ; recette native complète encore à admettre.',
 128:'Deux gardes et renfort d’alerte courants effectifs ; pas de hiérarchie multi-source de castes/patrouilles complètes.',
 136:'Monde/environnement enregistrés et retards explicites existent. Toutes fenêtres météo ne déclenchent pas encore une simulation physique de trajet.',
 154:'Relais/portes et réseau de grille borné ; la lumière et tout équipement individuel ne sont pas un modèle électrique complet.',
 166:'Déploiement AP/source et nombre de membres testés dans la ligne x, sans scène source multi-hauteur ni recette de spawn native complète.',
 184:'Haltes V143/V144 10/15 s et retour pondéré testés, mais horloge locale ; test serveur demandé dans la source reste impossible sans service.',
 187:'Le rapport local nomme les membres locaux. Cela ne vérifie pas les fiches persistantes V85 ni un évènement de monde authentifié.',
 201:'Garde d’identité qualifié : aucun transfert personne/blessure/XP vers V85 sans identité vérifiée. Le raccord positif reste un autre sujet ouvert.',
 202:'Aucune patrouille inconnue importée comme observation V85 ; géographie fine et scènes source non admises.',
 203:'Import documentaire Conseil/V152 en lecture seule : route et timing V115 non mutés. Le trajet physique complet reste distinct.',
 212:'Mémoire de dernier contact bornée aux indices observés testée (5 suites dédiées) ; recette native complète d’infiltration non attestée.',
 227:'Archive V115 locale permet position/temps de garde relus ; synchronisation serveur et fixture utilisateur historique réelle manquantes.',
 249:'Camouflage infiltration disponible, mais aucun état/cycle énergétique d’assaut : exigence assaut non réalisée.',
 253:'Tests de déterminisme partiels des réducteurs disponibles ; trace complète seed/ordres/AP/PC/RAV/positions/pertes et lecteur de replay assaut non fournis.',
 280:'Planètes, continents et routes ont des invariants testés ; pas de preuve terrain global exhaustive pour rivières et rapport de surfaces de chaque variante.',
 281:'MAP12 porte bien worldStratum=orbital-vessel et ne contient ni eau/lave/glace de surface ; embarquement/navire/sas entre couches n’est pas implanté physiquement.',
 291:'Pas de bonus d’honneur arbitraire ; évaluation narrative de choix/relations par mandat non raccordée à la campagne.',
 292:'Recon/escorte/interception et coefficients locaux existent ; aucun 36 scripts W5 ni conséquences diplomatiques globales déduits.',
 299:'Six régions de grille ont obstacles/couvert source ; la variation complète de vitesse/vision selon saison/horaires n’est pas homologuée.',
 302:'Soin avec médic et délai V115 implémenté ; l’atelier médical V92 n’effectue pas une extraction médicale multi-cases dans les mandats Outer.',
 316:'Six terrains régionaux V116 effectifs ; ces six petites grilles ne sont pas les 30 planètes ni six scènes source complètes.',
 324:'Ancienne archive synthétique sans interposeOrders acceptée sans réinitialisation ; une vraie archive utilisateur reste à fournir.',
 327:'Champs supportGuard/secondGuard absents ou historiques acceptés selon lecteur ; ne pas présenter ces snapshots synthétiques comme migration utilisateur homologuée.',
 329:'Bug de rappel partiel corrigé : retour uniquement dans portions atteintes, y compris reroutage légal et jonction ; huit régressions passent. Recette native du trajet physique non attestée.',
 330:'Ancien mandat synthétique sans routeDiversion accepté ; pas de preuve de migration d’une archive réelle utilisateur.',
 331:'Reroutage source conserve coût 1 RAV + reçu et n’applique pas de second débit ; V85/cloud non concernés.',
 332:'Compteur holdTurns 2–3 et transfert de poste progressent seulement au tick normal dans les réducteurs ; aucune reprise après reload W133.',
 333:'Titulaire/progression conservés dans l’objet de domaine mais W133 useState seulement : la reprise après rechargement n’est pas implémentée.',
 334:'Départ physique de l’ancienne escouade après relève testé en domaine ; navigateur/persistance W133 et art non admis.',
 336:'Reçus locaux/dossiers stables à la relecture, zéro mutation campagne ; ni serveur signé ni longues tournées utilisateur ne sont prouvés.',
 347:'V115 a une recette réelle IDB/localStorage/WebLocks dans fixture courante. Pas de recette native intégrale de chacun des quatre modes ni sauvegarde persistée W133.',
 351:'Migration/verrouillage V115 courants testés en domaine et dans deux onglets de fixture avec composants réels. Le verrou coopératif ne règle ni ancien client non coopérant ni cloud.',
}
# Explicit implementation-only guard acceptance can be bounded without asserting human art or browser.
GUARD_GROUPS={67,73,95,102,108,201,202,203}
# Precise source references with file hash and symbol lines; no assumed code is accepted silently.
code={}
for f in F.values():
 for name in f['files']:
  p=ROOT/name;assert p.is_file(),name
  txt=p.read_text();symbols=[]
  for n,line in enumerate(txt.splitlines(),1):
   m=re.match(r'export\s+(?:default\s+)?(?:async\s+)?(?:function|const|interface|type)\s+(\w+)',line)
   if m:symbols.append({'symbol':m.group(1),'line':n})
  code[name]={'path':name,'sha256':sha(p),'symbols':symbols}
tests=json.loads((OUT/'tests.json').read_text());run_tests={Path(t['test']).name:t for t in tests['rows']}
assert tests['allExitZero'] and tests['fail']==0
proofs={
 'pure':OUT/'tests.json','probe':OUT/'domain-probe.json',
 'nativeAtlas':ROOT/'production/p0p1-20261109/qa/homeworld/native-exports/attempt-3/final-receipt.json',
 'archiveBrowser':ROOT/'production/p0p1-20261109/qa/archive/attempt-2/report.json',
}
for k,p in proofs.items():assert p.is_file(),(k,p)
proofrefs=[{'kind':k,'path':str(p.relative_to(ROOT)),'sha256':sha(p)}for k,p in proofs.items()]
rows=[];reviewed=[]
for gn,(description,subjects) in enumerate(G,1):
 feature_id=MAP[gn];f=F[feature_id]
 existing_tests=[]
 for n in f['tests']:
  name='clan-war-'+n+'.test.mjs';assert name in run_tests,(feature_id,name)
  existing_tests.append(run_tests[name])
 note=OVERRIDE.get(gn,f['missing'])
 for row in subjects:
  old=current_rows[row['key']]
  status='QUALIFIE_BORNE_DOMAINE' if gn in GUARD_GROUPS else f['status']
  atlas_groups={103,105,110,188}
  archive_groups={101,347,351}
  browser=('Partiel — fixture RTS courante, sans migration utilisateur'if gn in archive_groups else 'Partiel — trois lieux Atlas, critère complet non admis'if gn in atlas_groups else 'Non attesté pour ce critère')
  admission=('Domaine et fixture RTS courante :12 contrôles, sans ancienne archive utilisateur ni tous modes'if gn in archive_groups else 'Domaine et échantillon Next Atlas :3 lieux,7 téléchargements ; pas scène physique complète'if gn in atlas_groups else 'Contrat pur testé ; aucun service réseau admis'if feature_id=='server'else 'Domaine uniquement ; aucune recette navigateur de ce critère déduite')
  refs=[dict(x)for x in proofrefs if x['kind'] in ['pure','probe']]
  if gn in archive_groups:refs.append(next(x for x in proofrefs if x['kind']=='archiveBrowser')|{'scope':'RTS courante/IDB/localStorage/WebLocks seulement. Aucune migration réelle/champs anciens, assaut ou infiltration déduite.'})
  if gn in atlas_groups:refs.append(next(x for x in proofrefs if x['kind']=='nativeAtlas')|{'scope':'Atlas :Erg Chebbi/Louvre/Normandie, titres/secondaire/CSV/JSON et viewport320. Pas de garde IA, vague, vitesse, bâtiment, lore humain ou géométrie planète.'})
  c=row['observations'][0]['cells']
  item={'key':row['key'],'id':row['id'],'priority':row['priority'],'domain':'Guerre des clans','sourceGroup':gn,'sourceRequirement':description,'registeredCriterion':row['registeredCriterion'],'sourceCells':c,'sourceReferences':[{k:v for k,v in o.items()if k!='cells'and k!='headers'}for o in row['observations']],
   'previousStatus':old['status'],'status':status,'feature':feature_id,
   'implementation':'Non réalisée pour l’effet demandé'if status=='OUVERT_IMPLEMENTATION_A_REALISER'else('Contrat pur seulement ; service absent de cette source'if status=='OUVERT_SERVICE_GUERRE_NON_IMPLEMENTE'else 'Oui, portée bornée'if status=='QUALIFIE_BORNE_DOMAINE'else 'Partielle'),
   'implementationScope':f['present'],'domainTested':'Oui — portée bornée'if existing_tests else 'Inventaire/probe de données ; comportement 1:1 non testé',
   'browserTested':browser,'physicalController':'Non attesté','humanArt':'Non attestée',
   'admission':admission,'codeReferences':[code[name]for name in f['files']],
   'tests':[{'path':t['test'],'sha256':t['testSha256'],'log':str((OUT/t['log']).relative_to(ROOT)),'logSha256':t['logSha256'],'pass':t['pass'],'fail':t['fail'],'skipped':t['skipped']}for t in existing_tests],
   'evidence':refs,'remaining':note,'globalClosure':False,
   'qualificationScope':('Critère négatif qualifié en domaine uniquement : '+f['present'])if status=='QUALIFIE_BORNE_DOMAINE'else f['present']+' Admission complète ouverte : '+note}
  rows.append(item)
 reviewed.append({'group':gn,'ids':[r['id']for r in subjects],'sourceRequirement':description,'feature':feature_id,'sourceGroupSha256':hashlib.sha256(description.encode()).hexdigest(),'scope':f['present'],'remaining':note})
assert len(rows)==588 and len({r['key']for r in rows})==588
assert sum(not r['id'].startswith('W3-S')for r in rows)==582
assert all('rapprocher'not in r['status'].lower()for r in rows)
counts={'subjects':len(rows),'baseWar':582,'supplementWorks':6,'priority':dict(Counter(r['priority']for r in rows)),'status':dict(Counter(r['status']for r in rows)),'features':dict(Counter(r['feature']for r in rows)),'globalClosed':0}
report={'schema':1,'asOf':'2026-11-09','baseCommit':'39b601ce1873a1f400d2f545f0fab97691b779e3','buildInProgressUnchanged':'RYl37_8hN58IOB8jDpRj1','scope':'Systematic source/code/test reconciliation; 588 individually classified current War subjects, not a global closure or full gameplay certification. Existing workbooks and source reports are unchanged.','counts':counts,'integrity':{k:v for k,v in source.items()if k!='items'},'evidence':proofrefs,'limitations':['329 passing tests/38 suites recoup existing root runs and must not be added to 677. Tests mix behavioral domain checks and source structure checks.','24 isolated W3 traversal victories explicitly remove enemies and hazards; never count as 24 live-combat victories.','Atlas Next12 checks cover three locations and seven exports; archive12 checks cover native storage APIs in a fixture, not every GameClient mission.','No service/network, two devices, physical controller, human 1:1 art, real user migration or RTS200-unit performance certification.','The six W3-S supplemental effects are not supportedWorks and cannot be generated from prose or counters.'],'rows':rows}
(OUT/'reconciliation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(OUT/'reviewed-group-decisions.json').write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
(OUT/'code-index.json').write_text(json.dumps(list(code.values()),ensure_ascii=False,indent=2)+'\n')
updates=[]
for r in rows:
 updates.append({k:r[k]for k in ['key','status','implementation','domainTested','browserTested','physicalController','humanArt','evidence','remaining','qualificationScope']}|{'sourceRequirementRestored':r['sourceRequirement'],'admissionReport':'production/p0p1-20261109/qa/war-admission/reconciliation.json','admissionReportSha256':sha(OUT/'reconciliation.json')})
(OUT/'inventory-updates.json').write_text(json.dumps(updates,ensure_ascii=False,indent=2)+'\n')
(OUT/'counts.json').write_text(json.dumps(counts,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(counts,ensure_ascii=False))
