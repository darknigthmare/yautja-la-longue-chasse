import json, textwrap, pathlib, hashlib
root=pathlib.Path('/mnt/data/YAUTJA_DLC_PREDATOR_1987_V0_1')

locations=[
  ('L01','Base d’opérations','briefing','onscreen',1800,'Camp militaire, bureau de Phillips et rencontre avec Dillon.'),
  ('L02','Insertion héliportée','helicopter','onscreen',2200,'Vol tactique vers la zone et débarquement en jungle.'),
  ('L03','Lisière d’insertion','jungle','onscreen',2400,'Progression initiale sous canopée.'),
  ('L04','Lit de rivière','river','onscreen',2500,'Couloir humide servant de transition vers la zone du crash.'),
  ('L05','Épave d’hélicoptère','wreck','onscreen',2200,'Site de l’appareil détruit recherché par l’équipe.'),
  ('L06','Clairière des Green Berets','trophy','onscreen',2300,'Découverte des corps de l’équipe de Jim Hopper.'),
  ('L07','Crête d’observation','ridge','onscreen',2500,'Point de reconnaissance au-dessus du camp.'),
  ('L08','Périmètre du camp','camp','onscreen',2600,'Postes extérieurs, sentinelles et Claymore neutralisée.'),
  ('L09','Camp guérillero — Est','camp','onscreen',3000,'Première phase de l’assaut.'),
  ('L10','Camp guérillero — Centre','camp','onscreen',3200,'Combats autour des huttes et véhicules.'),
  ('L11','Camp guérillero — Commandement','camp','onscreen',2800,'Zone des officiers, des otages et récupération d’Anna.'),
  ('L12','Sortie du camp','jungle','onscreen',2500,'Regroupement et révélation de la véritable mission.'),
  ('L13','Sentier d’exfiltration','jungle','onscreen',2800,'Marche vers le point d’extraction avec Anna prisonnière.'),
  ('L14','Virage des fougères','jungle','onscreen',2300,'Tentative d’évasion d’Anna et disparition de Hawkins.'),
  ('L15','Clairière de Blain','jungle','onscreen',2400,'Blain est frappé par le chasseur invisible.'),
  ('L16','Couloir de tir','jungle','onscreen',3200,'L’équipe rase la végétation sous un feu massif.'),
  ('L17','Bivouac nocturne','night','onscreen',2400,'Périmètre défensif et écoute de la jungle.'),
  ('L18','Piège de canopée','trap','onscreen',2900,'Piège collectif destiné à capturer le chasseur.'),
  ('L19','Piste de sang vert','jungle','onscreen',2600,'Poursuite après la blessure du Predator.'),
  ('L20','Crête Mac/Dillon','ridge','onscreen',2800,'Mac et Dillon quittent le groupe pour chasser la créature.'),
  ('L21','Fossé de Mac','ravine','onscreen',2200,'Mac rampe sous le feuillage en suivant sa cible.'),
  ('L22','Arbre de Dillon','jungle','onscreen',2400,'Dillon rejoint Mac et affronte le Predator.'),
  ('L23','Pont de Billy','bridge','onscreen',2100,'Billy reste seul pour le duel hors champ.'),
  ('L24','Piste du brancard','jungle','onscreen',2600,'Dutch, Anna et Billy transportent Poncho blessé.'),
  ('L25','Approche de la LZ','jungle','onscreen',2600,'Mort de Poncho et séparation d’Anna.'),
  ('L26','Pente de poursuite','cliff','onscreen',2800,'Dutch fuit le Predator et perd son armement.'),
  ('L27','Cascade','waterfall','onscreen',2600,'Chute de Dutch et rupture temporaire du contact.'),
  ('L28','Rive boueuse','mud','onscreen',2200,'Dutch découvre accidentellement le camouflage thermique par la boue.'),
  ('L29','Cache de trophées','trophy','inferred',2200,'Espace de transition minimal représentant la récupération hors champ des trophées.'),
  ('L30','Bassin de préparation','mud','onscreen',2600,'Dutch fabrique arc, flèches, lance et pièges improvisés.'),
  ('L31','Gauntlet de pièges','night','onscreen',3200,'Zone nocturne du duel et du feu d’appât.'),
  ('L32','Rivière du duel','river','onscreen',2600,'La boue est lavée et le Predator reprend l’avantage.'),
  ('L33','Clairière finale','night','onscreen',2600,'Le Jungle Hunter retire son masque et ses armes.'),
  ('L34','Tunnel / contrepoids','trap','onscreen',2200,'Dernier piège de Dutch et écrasement du Predator.'),
  ('L35','Zone d’explosion','blast','onscreen',3000,'Fuite devant le dispositif d’autodestruction.'),
  ('L36','LZ d’extraction','dawn','onscreen',2200,'Récupération de Dutch au lever du jour.'),
]
locations=[{'id':i,'name':n,'theme':t,'canon':c,'width':w,'note':note} for i,n,t,c,w,note in locations]

characters=[
 {'id':'dutch','name':'Maj. Alan “Dutch” Schaefer','side':'human','role':'Chef d’équipe','visual':'gilet noir, treillis woodland, bras nus','weapons':['AR-15/SP1 + faux M203','M67','Desert Eagle holstered','arc/lance improvisés (finale)']},
 {'id':'dillon','name':'George Dillon','side':'human','role':'CIA / ancien frère d’armes','visual':'tenue jungle et casquette','weapons':['HK94 raccourci','M1911A1 holstered']},
 {'id':'mac','name':'Sgt. Mac Eliot','side':'human','role':'mitrailleur','visual':'chemise jungle, casquette','weapons':['M60E3 raccourcie','M134 de Blain après sa mort','Desert Eagle holstered','M18A1 Claymore']},
 {'id':'blain','name':'Sgt. Blain Cooper','side':'human','role':'arme lourde','visual':'chapeau de brousse, gilet','weapons':['M134 “Ol’ Painless”','HK94 raccourci']},
 {'id':'billy','name':'Billy Sole','side':'human','role':'éclaireur','visual':'chapeau, peinture/ornements discrets','weapons':['AR-15/SP1 + Mossberg 500','Desert Eagle holstered','grand couteau']},
 {'id':'poncho','name':'Jorge “Poncho” Ramirez','side':'human','role':'grenadier','visual':'casquette, tenue jungle','weapons':['HK94 raccourci','AN/M5 modifié 37 mm','Desert Eagle holstered']},
 {'id':'hawkins','name':'Rick Hawkins','side':'human','role':'radio / soutien','visual':'lunettes, casquette','weapons':['HK94 raccourci','Desert Eagle holstered']},
 {'id':'anna','name':'Anna','side':'human','role':'prisonnière / survivante','visual':'tenue civile de jungle','weapons':['Walther PP récupéré (brièvement)','HK94 de Poncho (brièvement)']},
 {'id':'phillips','name':'Gen. Phillips','side':'human','role':'commandement','visual':'uniforme de base','weapons':[]},
 {'id':'hopper','name':'Jim Hopper et son équipe','side':'human','role':'équipe disparue','visual':'corps dépouillés / indices','weapons':[]},
 {'id':'guerrilla','name':'Guérilleros du camp','side':'hostile-human','role':'ennemis initiaux','visual':'tenues disparates jungle','weapons':['AKM/AK-47','Valmet M78/83','M72 LAW','armes de poing']},
 {'id':'jungle-hunter','name':'Jungle Hunter 1987','side':'predator','role':'chasseur extraterrestre','visual':'biomask, filet, armure asymétrique, dreadlocks, caster épaule','weapons':['wristblades','plasmacaster','cloak','thermal vision','wrist computer / self-destruct']},
]

human=[
 {'id':'H01','title':'Ordres et insertion','location':'L01','playable':'dutch','companions':['dillon'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'interact','x':1180,'label':'Recevoir les ordres de Phillips et Dillon'},{'type':'reach','x':1660,'label':'Rejoindre l’hélicoptère'}], 'canonBeat':'Le groupe accepte une mission de sauvetage et part pour la jungle.'},
 {'id':'H02','title':'L’épave','location':'L05','playable':'dutch','companions':['dillon','mac','blain','billy','poncho','hawkins'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'reach','x':1500,'label':'Atteindre l’épave'},{'type':'interact','x':1830,'label':'Examiner les traces autour du crash'}], 'canonBeat':'L’équipe constate que l’appareil recherché a été abattu.'},
 {'id':'H03','title':'Les hommes de Hopper','location':'L06','playable':'dutch','companions':['dillon','mac','blain','billy','poncho','hawkins'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'reach','x':1380,'label':'Suivre Billy'},{'type':'interact','x':1710,'label':'Identifier les corps de Hopper et de ses hommes'}], 'canonBeat':'Dutch reconnaît l’équipe de Jim Hopper et soupçonne que Dillon cache des informations.'},
 {'id':'H04','title':'Reconnaissance du camp','location':'L07','playable':'dutch','companions':['dillon','mac','blain','billy','poncho','hawkins'], 'loadout':['jumelles','AR-15/SP1 + faux M203'], 'steps':[{'type':'scan','x':1600,'label':'Observer le camp aux jumelles'},{'type':'reach','x':2210,'label':'Descendre vers le périmètre'}], 'canonBeat':'Le groupe identifie le camp, ses gardes et la zone des otages.'},
 {'id':'H05','title':'Assaut sur le camp','location':'L10','playable':'dutch','companions':['dillon','mac','blain','billy','poncho','hawkins'], 'loadout':['AR-15/SP1 + faux M203','M67'], 'enemies':12,'steps':[{'type':'eliminate','count':12,'label':'Neutraliser la garnison'},{'type':'interact','x':2780,'label':'Sécuriser la zone des otages'}], 'canonBeat':'L’équipe détruit le camp, découvre les otages morts et capture Anna.'},
 {'id':'H06','title':'La mission réelle','location':'L12','playable':'dutch','companions':['dillon','mac','blain','billy','poncho','hawkins','anna'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'reach','x':1180,'label':'Regrouper l’équipe'},{'type':'interact','x':1600,'label':'Confronter Dillon'},{'type':'reach','x':2280,'label':'Reprendre la route vers la LZ'}], 'canonBeat':'Dutch apprend que la mission de sauvetage servait de couverture.'},
 {'id':'H07','title':'Hawkins disparaît','location':'L14','playable':'dutch','companions':['dillon','mac','blain','billy','poncho','hawkins','anna'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'reach','x':1080,'label':'Rattraper Anna'},{'type':'survive','seconds':5,'label':'Réagir à l’attaque invisible'},{'type':'interact','x':1840,'label':'Inspecter la zone de disparition'}], 'casualty':'hawkins','canonBeat':'Hawkins est tué et emporté par une présence que l’équipe ne voit pas.'},
 {'id':'H08','title':'Blain et le mur de feu','location':'L16','playable':'dutch','companions':['dillon','mac','blain','billy','poncho','anna'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'reach','x':760,'label':'Rejoindre Blain'},{'type':'survive','seconds':8,'label':'Arroser la lisière de tirs'},{'type':'reach','x':2700,'label':'Cesser le feu et faire le bilan'}], 'casualty':'blain','canonBeat':'Blain est tué par le plasmacaster; Mac déclenche la riposte qui rase une portion de jungle.'},
 {'id':'H09','title':'La nuit du piège','location':'L18','playable':'dutch','companions':['dillon','mac','billy','poncho','anna'], 'loadout':['AR-15/SP1 + faux M203','M18A1 Claymore (équipe)'], 'steps':[{'type':'placeTrap','x':1050,'label':'Installer la première ligne de pièges'},{'type':'placeTrap','x':1710,'label':'Fermer le couloir de canopée'},{'type':'survive','seconds':10,'label':'Attendre le chasseur'},{'type':'reach','x':2540,'label':'Poursuivre la créature blessée'}], 'canonBeat':'Le Predator tombe dans le dispositif, se libère et laisse du sang fluorescent.'},
 {'id':'H10','title':'Mac et Dillon','location':'L20','playable':'dutch','companions':['billy','poncho','anna'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'interact','x':1000,'label':'Laisser Mac et Dillon partir en chasse'},{'type':'survive','seconds':6,'label':'Attendre leur retour'},{'type':'reach','x':2350,'label':'Reprendre la progression'}], 'casualty':'mac,dillon','canonBeat':'Mac et Dillon poursuivent le Predator séparément et sont éliminés.'},
 {'id':'H11','title':'Le dernier passage de Billy','location':'L23','playable':'dutch','companions':['billy','poncho','anna'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'interact','x':1060,'label':'Écouter Billy'},{'type':'reach','x':1760,'label':'Continuer avec Poncho et Anna'},{'type':'survive','seconds':5,'label':'Entendre l’issue du duel derrière vous'}], 'casualty':'billy','canonBeat':'Billy se sépare du groupe et affronte seul le Predator; le combat reste volontairement hors champ.'},
 {'id':'H12','title':'Poncho tombe','location':'L25','playable':'dutch','companions':['poncho','anna'], 'loadout':['AR-15/SP1 + faux M203'], 'steps':[{'type':'reach','x':960,'label':'Transporter Poncho'},{'type':'survive','seconds':4,'label':'Subir la reprise de la chasse'},{'type':'interact','x':1810,'label':'Empêcher Anna de prendre l’arme'},{'type':'reach','x':2370,'label':'Envoyer Anna vers la LZ'}], 'casualty':'poncho','canonBeat':'Poncho est tué; Dutch comprend qu’Anna non armée n’est pas ciblée et l’envoie vers l’extraction.'},
 {'id':'H13','title':'Cascade et boue','location':'L28','playable':'dutch','companions':[], 'loadout':['aucun armement intact'], 'steps':[{'type':'reach','x':880,'label':'Sortir de l’eau'},{'type':'interact','x':1380,'label':'Se plaquer dans la boue'},{'type':'survive','seconds':7,'label':'Rester immobile pendant le balayage thermique'},{'type':'reach','x':1940,'label':'Quitter la rive sans être repéré'}], 'canonBeat':'La boue froide masque la signature thermique de Dutch.'},
 {'id':'H14','title':'Devenir le chasseur','location':'L30','playable':'dutch','companions':[], 'loadout':['arc improvisé','flèches explosives','lance','pièges'], 'steps':[{'type':'interact','x':680,'label':'Fabriquer l’arc et les flèches'},{'type':'placeTrap','x':1240,'label':'Installer le piège à pieux'},{'type':'placeTrap','x':1860,'label':'Armer le contrepoids'},{'type':'interact','x':2320,'label':'S’enduire de boue'}], 'canonBeat':'Dutch prépare une arène nocturne avec des armes et pièges improvisés.'},
 {'id':'H15','title':'Le duel','location':'L33','playable':'dutch','companions':[], 'loadout':['arc improvisé','lance','pièges'], 'boss':'jungle-hunter','steps':[{'type':'bossDamage','amount':3,'label':'Toucher le Predator depuis la boue'},{'type':'survive','seconds':7,'label':'Forcer le combat à se déplacer vers la rivière'},{'type':'interact','x':1780,'label':'Déclencher la séquence de duel à mains nues'},{'type':'interact','x':2260,'label':'Activer le contrepoids final'},{'type':'reach','x':2510,'label':'S’éloigner du dispositif d’autodestruction'}], 'canonBeat':'Dutch blesse le Predator, survit au duel et déclenche le contrepoids qui le condamne.'},
 {'id':'H16','title':'Extraction','location':'L36','playable':'dutch','companions':['anna','phillips'], 'loadout':['aucun'], 'steps':[{'type':'reach','x':1480,'label':'Atteindre l’hélicoptère'},{'type':'interact','x':1830,'label':'Monter à bord'}], 'canonBeat':'Dutch est récupéré au lever du jour avec Anna déjà secourue.'},
]

pred=[
 {'id':'P01','title':'Descente','location':'L03','playable':'jungle-hunter','companions':[], 'loadout':['cloak','thermal vision','plasmacaster','wristblades'], 'allowCanopy':True,'steps':[{'type':'cloak','label':'Activer le camouflage'},{'type':'scan','x':1420,'label':'Scanner les signatures armées'},{'type':'reach','x':2110,'label':'Gagner la canopée'}], 'canonBeat':'Le chasseur observe la zone et choisit des proies armées.'},
 {'id':'P02','title':'Des intrus dangereux','location':'L10','playable':'jungle-hunter','companions':[], 'loadout':['cloak','thermal vision'], 'allowCanopy':True,'steps':[{'type':'scan','x':1060,'label':'Observer l’assaut sans intervenir'},{'type':'reach','x':1940,'label':'Suivre Dutch et son équipe depuis la canopée'},{'type':'mimic','label':'Enregistrer un échantillon vocal'}], 'canonBeat':'Le Predator suit la destruction du camp et évalue les capacités du groupe.'},
 {'id':'P03','title':'Première prise','location':'L14','playable':'jungle-hunter','companions':[], 'loadout':['cloak','wristblades'], 'allowCanopy':True,'targets':['hawkins'],'steps':[{'type':'cloak','label':'Rester invisible'},{'type':'reach','x':1320,'label':'Se placer derrière Hawkins'},{'type':'meleeTarget','target':'hawkins','label':'Neutraliser Hawkins'},{'type':'reach','x':2050,'label':'Emporter la prise hors du sentier'}], 'canonBeat':'Hawkins est la première victime de l’équipe montrée à l’écran.'},
 {'id':'P04','title':'Le canon de Blain','location':'L15','playable':'jungle-hunter','companions':[], 'loadout':['plasmacaster','cloak'], 'allowCanopy':True,'targets':['blain'],'steps':[{'type':'scan','x':940,'label':'Isoler Blain'},{'type':'plasmaTarget','target':'blain','label':'Frapper Blain au plasmacaster'},{'type':'reach','x':2040,'label':'Rompre le contact avant la riposte'}], 'canonBeat':'Le Predator tue Blain et se replie sous le déluge de feu du groupe.'},
 {'id':'P05','title':'Sous la tempête de balles','location':'L16','playable':'jungle-hunter','companions':[], 'loadout':['cloak'], 'allowCanopy':True,'steps':[{'type':'survive','seconds':9,'label':'Traverser la rafale sans rester dans la ligne de tir'},{'type':'reach','x':2860,'label':'Quitter la zone détruite'}], 'canonBeat':'La jungle est criblée de tirs, mais le chasseur échappe au barrage.'},
 {'id':'P06','title':'Piège nocturne','location':'L18','playable':'jungle-hunter','companions':[], 'loadout':['cloak','wristblades'], 'allowCanopy':True,'steps':[{'type':'reach','x':1120,'label':'Entrer dans le dispositif humain'},{'type':'interact','x':1510,'label':'Se libérer du piège'},{'type':'survive','seconds':5,'label':'Fuir blessé'},{'type':'reach','x':2500,'label':'Disparaître avec une plaie ouverte'}], 'canonBeat':'Le Predator est blessé et laisse un sang lumineux qui confirme qu’il peut être atteint.'},
 {'id':'P07','title':'Mac et Dillon','location':'L22','playable':'jungle-hunter','companions':[], 'loadout':['cloak','plasmacaster','wristblades'], 'allowCanopy':True,'targets':['mac','dillon'],'steps':[{'type':'scan','x':900,'label':'Localiser Mac'},{'type':'meleeTarget','target':'mac','label':'Éliminer Mac'},{'type':'plasmaTarget','target':'dillon','label':'Neutraliser Dillon'},{'type':'reach','x':2110,'label':'Reprendre la poursuite principale'}], 'canonBeat':'Le Predator surclasse Mac puis Dillon, qui avait rejoint son ami.'},
 {'id':'P08','title':'Billy','location':'L23','playable':'jungle-hunter','companions':[], 'loadout':['wristblades'], 'allowCanopy':False,'targets':['billy'],'steps':[{'type':'reach','x':1040,'label':'Accepter le défi de Billy'},{'type':'meleeTarget','target':'billy','label':'Conclure le duel hors champ'},{'type':'reach','x':1820,'label':'Poursuivre les survivants'}], 'canonBeat':'Le film ne montre pas la chorégraphie du duel; le DLC conserve seulement son résultat et son hors-champ.'},
 {'id':'P09','title':'Poncho','location':'L25','playable':'jungle-hunter','companions':[], 'loadout':['plasmacaster','cloak'], 'allowCanopy':True,'targets':['poncho'],'steps':[{'type':'plasmaTarget','target':'poncho','label':'Abattre Poncho'},{'type':'scan','x':1560,'label':'Évaluer Anna non armée'},{'type':'reach','x':2320,'label':'Choisir Dutch comme proie principale'}], 'canonBeat':'Le Predator ignore Anna quand elle n’est plus armée et concentre sa chasse sur Dutch.'},
 {'id':'P10','title':'La proie disparaît','location':'L28','playable':'jungle-hunter','companions':[], 'loadout':['thermal vision','cloak'], 'allowCanopy':True,'targets':['dutch'],'steps':[{'type':'scan','x':920,'label':'Rechercher Dutch au thermique'},{'type':'reach','x':1500,'label':'Inspecter la rive'},{'type':'survive','seconds':6,'label':'Échouer à distinguer la signature sous la boue'},{'type':'reach','x':1980,'label':'Quitter la rive'}], 'canonBeat':'Le masque thermique ne distingue pas Dutch recouvert de boue froide.'},
 {'id':'P11','title':'Trophées et retour au duel','location':'L29','playable':'jungle-hunter','companions':[], 'loadout':['wristblades','wrist computer'], 'allowCanopy':True,'steps':[{'type':'interact','x':790,'label':'Récupérer les trophées déjà acquis'},{'type':'mimic','label':'Réécouter les voix humaines mémorisées'},{'type':'reach','x':1890,'label':'Répondre à l’appel de Dutch'}], 'canonBeat':'Le film suggère la collecte de trophées hors champ avant le duel final; l’espace est volontairement abstrait.'},
 {'id':'P12','title':'La dernière chasse','location':'L33','playable':'jungle-hunter','companions':[], 'loadout':['plasmacaster','cloak','wristblades','wrist computer'], 'allowCanopy':False,'targets':['dutch'],'steps':[{'type':'survive','seconds':6,'label':'Subir les premiers pièges de Dutch'},{'type':'plasmaTarget','target':'dutch','label':'Riposter avant que le camouflage ne tombe'},{'type':'interact','x':1650,'label':'Retirer masque et plasmacaster'},{'type':'meleeTarget','target':'dutch','label':'Engager le duel à mains nues'},{'type':'interact','x':2210,'label':'Tomber sous le contrepoids'},{'type':'interact','x':2390,'label':'Activer l’autodestruction'}], 'canonBeat':'La campagne Predator se termine par la défaite canonique du Jungle Hunter et son autodestruction.'},
]

sources=[
 {'id':'S1','label':'IMDb — Predator (1987), Plot Summary','url':'https://www.imdb.com/title/tt0093773/plotsummary/','use':'ordre des événements et personnages'},
 {'id':'S2','label':'Wikipedia — Predator (film)','url':'https://en.wikipedia.org/wiki/Predator_(film)','use':'séquence finale, pièges, boue et extraction'},
 {'id':'S3','label':'Internet Movie Firearms Database — Predator (1987)','url':'https://www.imfdb.org/wiki/Predator_(1987)','use':'armes à feu et affectations par personnage'},
 {'id':'S4','label':'AvP Central — Predator (1987): Plot, Characters, And Lore','url':'https://www.avpcentral.com/predator-1987','use':'équipement et comportement du Jungle Hunter'},
 {'id':'S5','label':'AvP Central — Jungle Hunter profile','url':'https://www.avpcentral.com/jungle-hunter-predator-profile','use':'biomask, caster, cloak, wristblades et apparence de l’équipement'},
]

data={
 'title':'PREDATOR 1987 — Chasseur / Proie',
 'version':'0.1.0',
 'baseRepo':'darknigthmare/yautja-la-longue-chasse',
 'baseCommit':'3d8efbcfb42939a33093ee3ad923c0e97ff53ff5',
 'copyrightNote':'Prototype fan non commercial. Aucun pixel, audio ou dialogue officiel embarqué.',
 'locations':locations,
 'characters':characters,
 'campaigns':[
   {'id':'human','title':'Campagne I — Les humains','subtitle':'Dutch et son équipe','chapters':human},
   {'id':'predator','title':'Campagne II — Le Predator','subtitle':'Jungle Hunter 1987','chapters':pred},
 ],
 'sources':sources,
 'controls':{
   'move':'Q/D ou ←/→','lane':'Z/S ou ↑/↓ (Predator, scènes autorisées)','primary':'J','secondary':'K','interact':'E','utility':'F','cloak':'C','vision':'V','pause':'Échap'
 }
}
(root/'src'/'game-data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
(root/'src'/'game-data.mjs').write_text('export const GAME_DATA = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf8')

# Registry
registry={
 'schemaVersion':1,
 'contentClass':'private-film-dlc-prototype',
 'id':'predator-1987-dual-campaign',
 'title':data['title'],
 'version':data['version'],
 'base':{'repository':data['baseRepo'],'commit':data['baseCommit']},
 'publicBuildPolicy':{
   'importableByPublicApp':False,'containsOfficialPixels':False,'containsOfficialAudio':False,'containsScreenplayText':False,
   'publicDeploymentRecommended':False,'intendedForPrivateDlcFolder':True
 },
 'fidelity':{
   'goal':'séquence, casting, équipement et résultats canoniques',
   'geometry':'reconstruction 2D; les distances et raccords hors champ sont interprétés',
   'dialogue':'paraphrasé; aucune transcription du scénario',
   'offscreen':'les événements non montrés restent abstraits et signalés comme tels'
 },
 'counts':{'locations':len(locations),'humanChapters':len(human),'predatorChapters':len(pred),'characters':len(characters),'sources':len(sources)},
 'sources':sources,
}
(root/'manifest.dlc.json').write_text(json.dumps(registry,ensure_ascii=False,indent=2),encoding='utf8')

# Markdown docs
fid = f'''# PREDATOR 1987 — registre de fidélité\n\nVersion **{data['version']}**. Base de compatibilité observée : `{data['baseRepo']}` @ `{data['baseCommit']}`.\n\n## Ce que « fidélité 1:1 » signifie dans ce prototype\n\n- **Ordre des événements** : la campagne humaine suit la progression du film et la campagne Predator reprend les mêmes événements depuis son angle.\n- **Personnages** : Dutch, Dillon, Mac, Blain, Billy, Poncho, Hawkins, Anna, Phillips, Hopper et le Jungle Hunter sont suivis comme entités distinctes.\n- **Équipement** : les armes humaines et l’arsenal du Predator sont alignés sur les références disponibles.\n- **Résultats canoniques** : le joueur ne peut pas sauver un personnage dont la mort est nécessaire au film, ni donner une victoire alternative au Predator dans la campagne canonique.\n- **Hors-champ** : Billy vs Predator et la récupération de certains trophées restent volontairement abstraits ; le jeu ne prétend pas connaître une chorégraphie que le film ne montre pas.\n- **Géométrie** : le film ne fournit pas de plan métrique complet de la jungle. Les zones sont donc reconstruites en 2D selon leur enchaînement visuel ; les distances de raccord sont des interprétations prudentes.\n- **Dialogues** : paraphrasés. Aucun script ou long dialogue officiel n’est recopié.\n- **Assets** : aucun photogramme, texture, logo, musique ou voix officielle n’est embarqué. Les silhouettes sont des formes vectorielles originales destinées au prototype.\n\n## Sources de vérification\n\n'''
for s in sources:
    fid += f"- **{s['id']} — {s['label']}** — {s['use']} — {s['url']}\n"
(root/'docs'/'FIDELITE_1_1.md').write_text(fid,encoding='utf8')

codex='# CODEX LEVEL DESIGN — PREDATOR 1987\n\n## Topologie des lieux\n\n'
for l in locations:
    codex += f"### {l['id']} — {l['name']}\n- Statut: **{l['canon']}**\n- Biome/traitement: `{l['theme']}`\n- Largeur prototype: {l['width']} px\n- Rôle: {l['note']}\n\n"
codex += '\n## Campagne I — Humains\n\n'
for ch in human:
    codex += f"### {ch['id']} — {ch['title']}\n- Lieu: {ch['location']}\n- Jouable: {ch['playable']}\n- Compagnons: {', '.join(ch.get('companions',[])) or 'aucun'}\n- Loadout: {', '.join(ch.get('loadout',[]))}\n- Beat canonique: {ch['canonBeat']}\n- Objectifs:\n"
    for st in ch['steps']:
        codex += f"  - {st['label']} (`{st['type']}`)\n"
    codex += '\n'
codex += '\n## Campagne II — Predator\n\n'
for ch in pred:
    codex += f"### {ch['id']} — {ch['title']}\n- Lieu: {ch['location']}\n- Canopée jouable: {'oui' if ch.get('allowCanopy') else 'non'}\n- Loadout: {', '.join(ch.get('loadout',[]))}\n- Beat canonique: {ch['canonBeat']}\n- Objectifs:\n"
    for st in ch['steps']:
        codex += f"  - {st['label']} (`{st['type']}`)\n"
    codex += '\n'
(root/'docs'/'CODEX_LEVEL_DESIGN.md').write_text(codex,encoding='utf8')

chars='# REGISTRE PERSONNAGES / ÉQUIPEMENTS\n\n'
for c in characters:
    chars += f"## {c['name']}\n- ID: `{c['id']}`\n- Camp: {c['side']}\n- Rôle: {c['role']}\n- Repères visuels: {c['visual']}\n- Équipement: {', '.join(c['weapons']) if c['weapons'] else 'aucun défini'}\n\n"
(root/'docs'/'PERSONNAGES_EQUIPEMENT.md').write_text(chars,encoding='utf8')

print('generated', len(locations), len(human), len(pred), len(characters))
