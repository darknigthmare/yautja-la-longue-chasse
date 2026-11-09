"""Read-only reconciliation of all 1,806 P0/P1 PHG source subjects.

Exact catalog IDs / explicit aliases only. Family contracts remain family contracts.
No regex source-presence assertion and no promotion to human/1:1 certification.
"""
from pathlib import Path
import json, hashlib, collections, datetime, openpyxl

ROOT=Path.cwd()
OUT=ROOT/'production/p0p1-20261109/qa/phg-admission'
INVENTORY=Path('/workspace/p0p1-20261109/inventory/Personnalisation-et-arsenal.json')
load=lambda p:json.loads(Path(p).read_text())
write=lambda p,d:(OUT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
runtime=load(OUT/'runtime-assets.json')
rows=load(INVENTORY)
original_count=len(rows)
original_keys={x['key'] for x in rows}
current_register=load(ROOT/'production/p0p1-20261109/suivi/registre-priorites.json')
for extra in current_register['rows']:
 if extra['domain']=='Personnalisation et arsenal' and extra['key'] not in original_keys:
  rows.append({**extra,'sourceStatus':extra['sourceDeclaration'],'remaining':''})
images={x['path']:x for x in runtime['images']}
native=load(ROOT/'app/game/data/driveLatestSpritesV85.json')['assets']
native_by_path={x['src']:x for x in native if x.get('groupId')=='drive-phg-20261007'}
queue=load(ROOT/'app/game/data/phgVisualFidelityQueueV122.json')['records']
books={}
source_snapshots={}
for row in rows:
 for source in row['sources']:
  p=source['path']
  if p not in books:books[p]=openpyxl.load_workbook(ROOT/p,data_only=True)
  key=f"{p}::{source['sheet']}::{source['row']}"
  source_snapshots[key]={'path':p,'sheet':source['sheet'],'row':source['row'],'values':list(books[p][source['sheet']].values)[source['row']-1]}
write('source-xlsx-rows.json',list(source_snapshots.values()))

entities={}
aliases=collections.defaultdict(list)
def add(e,alias=()):
 entities[e['key']]=e
 for a in {e['id'],*alias}:aliases[a].append(e['key'])
def image_evidence(paths):
 return [images[p] for p in dict.fromkeys(paths) if p in images]
hooks={
 'material':['app/game/hunterChromaticsV113.ts#getChromaticMaterialV113','app/game/hunterChromaticsV113.ts#normalizeHunterChromaticsV113','app/game/HunterChromaticForgeV113.tsx','app/game/ChromaticSurfaceV113.tsx','app/game/hunterChromaticCanvasV113.ts'],
 'mask':['app/game/hunterVisuals.ts#hunterMaskRigPath','app/game/hunterVisuals.ts#hunterMaskRigPlacement','app/game/GameClient.tsx#MASK_OPTIONS','app/game/HunterRigPreview.tsx','app/game/HuntCanvas.tsx'],
 'decal':['app/game/yautjaDecalsV133.ts#yautjaDecalV133','app/game/yautjaDecalsV133.ts#normalizeDecalIdV133','app/game/DecalSurfaceV133.tsx','app/game/decalCanvasV133.ts','app/game/HunterChromaticForgeV113.tsx'],
 'drive':['app/game/hunterChromaticsV113.ts#PHG_DRIVE_CANDIDATES_V120','app/game/data/phgDriveV120Installed.json','scripts/install-phg-runtime-v120.py#verify_bundle'],
}
refs={x['materialId']:x for x in runtime['referenceCatalog']}
for m in runtime['materials']:
 source=native_by_path.get(m['src'])
 e={'key':'material:'+m['id'],'id':m['id'],'family':'Matière admise / '+m['channel'],'kind':'material','channel':m['channel'],'runtimeAdmitted':m['admittedByRealGetter'],'artNature':m['evidence'],'paths':[m['src']],'imageEvidence':image_evidence([m['src']]),'runtimeHooks':hooks['material'],'sourceEvidence':([source] if source else [])+([refs[m['id']]] if m['id'] in refs else []),'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Référence PHG nommée et attribuée à la variante','Couleurs, motifs et UV comparés sous lumière contrôlée','Captures individuelles six morphologies × face/profil/dos','Contrôle en animation et sauvegarde/import pour cet actif']}
 add(e,[Path(m['sourceFile']).stem])
for n in runtime['nativeSources']:
 existing=[e for e in entities.values() if e['kind']=='material' and n['src'] in e['paths']]
 if existing:
  for e in existing:
   e['nativeSource']=n
   aliases[n['id']].append(e['key'])
   aliases['phg-'+n['id']].append(e['key'])
 else:
  e={'key':'native-source:'+n['id'],'id':n['id'],'family':'PNG source V85 hors registre chromatique','kind':'native-source','runtimeAdmitted':False,'paths':[n['src']],'imageEvidence':image_evidence([n['src']]),'runtimeHooks':['app/game/hunterMaterialsV113.ts','app/game/hunterChromaticsV113.ts#EXCLUDED_NATIVE_IDS_V114'],'sourceEvidence':[native_by_path.get(n['src'],{})],'nativeSource':n,'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Raccord à un objet / calque correct et validation artistique individuelle; exclusion générique volontaire à respecter']}
  add(e,['phg-'+n['id']])
drive=load(ROOT/'app/game/data/phgDriveV120Catalog.json')
for d in drive['assets']:
 candidate=d['candidateChannel'] is not None
 e={'key':'drive-source:'+d['id'],'id':'phg-drive-'+d['id'] if candidate else 'source-v120-'+d['id'],'sourceId':d['id'],'family':'V120 candidat / '+str(d['candidateChannel']) if candidate else 'V120 accessoire séparé','kind':'drive-candidate' if candidate else 'drive-accessory','channel':d['candidateChannel'],'runtimeAdmitted':False,'paths':[d['runtimePath'],d['previewPath']],'imageEvidence':image_evidence([d['runtimePath'],d['previewPath']]),'sourceEvidence':[d],'runtimeHooks':hooks['drive'],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Bundle V120 local aux bytes vérifiés SHA-256 puis 312 conversions runtime/preview','Admission atomique du manifeste avec bundleSha256 concordant','Référence visuelle attribuée, UV et captures individuelles'] if candidate else ['Source locale vérifiée et sprite indépendant','Point d’attache / collision correct sur mèche ou masque','Six morphologies × trois vues; ne pas traiter comme peinture de peau']}
 add(e,[d['id']])
for m in runtime['masks']:
 concept=m['id'].startswith('concept-v133-')
 e={'key':'mask:'+m['id'],'id':m['id'],'family':'Coques conceptuelles V133' if concept else 'Masques existants V62/V3','kind':'mask','runtimeAdmitted':True,'paths':[m['assetPath'],m['thumbnailPath']],'imageEvidence':image_evidence([m['assetPath'],m['thumbnailPath']]),'sourceEvidence':[m],'runtimeHooks':hooks['mask'],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Axe de tête / yeux / dreadlocks et poses inspectés sur six morphologies','Captures réelles face/profil/dos','Pour une géométrie PHG: source canonique exacte; un concept original ne fournit pas cette géométrie']}
 add(e)
for d in runtime['decals']:
 e={'key':'decal:'+d['id'],'id':d['id'],'family':'Decals originaux V133 / '+d['zone'],'kind':'decal','channel':d['zone'],'runtimeAdmitted':d['admittedByRealGetter'],'paths':[d['src']],'imageEvidence':image_evidence([d['src']]),'tileEvidence':next(x for x in runtime['cropChecks'] if x['id']==d['id']),'sourceEvidence':[d],'runtimeHooks':hooks['decal'],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Clipping, pivots et profondeur réels sur six morphologies × face/profil/dos','Contrôle de chaque decal en atelier, aperçu et chasse','Motifs originaux distincts des six Warpaints PHG sans pixels authentifiés']}
 add(e)
# The 34 named documentary targets may link to a study but never inherit its pixels/UV proof.
study_alias={
 'skin_classe_junglehunter87_wasteland':'phg-study-v125-jungle87_wasteland',
 'skin_classe_junglehunter87_undergrowth':'phg-study-v125-jungle87_undergrowth',
 'skin_classe_junglehunter87_badland':'phg-study-v125-jungle87_badland',
 'skin_classe_junglehunter87_quagmire':'phg-study-v125-jungle87_quagmire',
 'skin_classe_elder_ancient':'phg-study-v125-elder_ancient',
 'skin_classe_elder_primeval':'phg-study-v125-elder_primeval',
 'skin_classe_elder_stoic':'phg-study-v125-elder_stoic',
 'skin_classe_cityhunter97_sector':'phg-study-v125-city97_sector',
 'skin_classe_cityhunter97_ward':'phg-study-v125-city97_ward',
 'skin_classe_cityhunter97_tract':'phg-study-v125-city97_tract',
 'skin_classe_feral_default_apres_3_6_0':'phg-study-v125-feral_post_3_6_default',
 'skin_default_terror':'phg-study-v127-terror','skin_classic_slice':'phg-study-v127-slice',
 'skin_gator_virus':'phg-study-v127-virus','skin_unassigned_aurora':'phg-study-v127-aurora',
 'skin_mottle_dread':'phg-study-v129-mottle_dread_skin',
 'dread_exiled_tint_patch239_unidentified':'phg-study-v128-exiled-marbled-bronze',
 'armure_v2_ogre_pending':'phg-study-v131-alpha-ogre-biomask',
 'armure_v2_epic_exclusive_pending':'phg-study-v128-epic-copper',
 'armure_v2_playstation_themed_pending':'phg-study-v128-playstation-graphite',
 'skin_shatter_demon':'phg-shatter-demon-study',
}
for q in queue:
 related=list(dict.fromkeys(aliases.get(q['id'],[])))
 if q['id'] in study_alias:related+=aliases.get(study_alias[q['id']],[])
 add({'key':'reference-gap:'+q['id'],'id':q['id'],'family':'Référence visuelle PHG non attribuée','kind':'reference-gap','runtimeAdmitted':False,'relatedEntityKeys':list(dict.fromkeys(related)),'sourceEvidence':[q],'runtimeHooks':[],'paths':[],'imageEvidence':[],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Capture de menu PHG avec variante réellement sélectionnée','Classe + vue face/profil/dos + date + hash','Correspondance des pixels/UV non attestée malgré études ou PNG existants']})
# Nine explicitly enumerated geometry candidates are absent from the selectable mask registry.
missing_masks=['mr-black-phg','city-rebreather-phg','saber-phg','tank-phg','vex-phg','viking-phg','rival-phg','haze-phg','wretch-phg']
for mid in missing_masks:
 add({'key':'mask-candidate:'+mid,'id':mid,'family':'Géométries PHG candidates sans objet sélectionnable','kind':'mask-candidate','runtimeAdmitted':False,'sourceEvidence':[],'runtimeHooks':['app/game/GameClient.tsx#MASK_OPTIONS (absent de l’énumération)','app/game/types.ts#BiomaskId (absent de l’union)'],'paths':[],'imageEvidence':[],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Référence PHG exacte des trois angles','Créer/identifier géométrie distincte sans substitution par une teinte ou un concept','Raccord objet, alpha/pivot et six morphologies en animation']})
for tint in runtime['official']['maskTints']:
 for a in [tint['name'].lower(),tint['id']]:aliases[a]+=aliases.get(tint['materialId'],[])
# New V137 reference gap IDs point to the candidate, never to a V133 concept with a similar name.
for gap,mid in {'phg-mask-wretch':'wretch-phg','phg-mask-haze':'haze-phg','phg-mask-rival':'rival-phg','phg-mask-bone':None,'phg-mask-pirate-warpaint':None,'phg-mask-scar-bugs':None}.items():
 add({'key':'official-gap:'+gap,'id':gap,'family':'Référence/correctif officiel PHG','kind':'official-gap','runtimeAdmitted':False,'relatedEntityKeys':['mask-candidate:'+mid] if mid else [],'sourceEvidence':[x for x in runtime['official']['maskCompatibility'] if gap in ['phg-mask-pirate-warpaint','phg-mask-scar-bugs']],'runtimeHooks':['app/game/data/phgOfficialCosmeticsV141.json'],'paths':[],'imageEvidence':[],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Sources officielles attestent nom/restriction, pas les pixels','Références PHG et objets nominatifs/Scars à produire ou qualifier selon le critère exact']})

# Family-level source work is described explicitly; it does not claim per-asset browser proof.
family_defs={
 'all-materials':('Matières/teintes: rendu et persistance',[k for k,e in entities.items() if e['kind']=='material'],hooks['material']),
 'v132':('Sept finitions biomask V132',[k for k,e in entities.items() if e['id'].startswith('phg-study-v132-')],['app/game/phgBiomaskStudiesV132.ts','app/game/hunterChromaticsV113.ts#maskChromaticsForAppearanceV131']),
 'concept':('Sept coques conceptuelles V133',[k for k,e in entities.items() if e['id'].startswith('concept-v133-')],hooks['mask']),
 'existing-masks':('26 masques V62/V3 existants',[k for k,e in entities.items() if e['kind']=='mask' and not e['id'].startswith('concept-v133-')],hooks['mask']),
 'decals':('48 decals originaux V133',[k for k,e in entities.items() if e['kind']=='decal'],hooks['decal']),
 'v120':('149 matières V120 non installées',[k for k,e in entities.items() if e['kind']=='drive-candidate'],hooks['drive']),
 'rings':('Six anneaux V120 indépendants',[k for k,e in entities.items() if e['kind']=='drive-accessory' and e.get('sourceId','').startswith('anneau_')],hooks['drive']),
 'references':('34 références de fidélité V122',[k for k,e in entities.items() if e['kind']=='reference-gap'],['app/game/data/phgVisualFidelityQueueV122.json']),
 'candidates':('Neuf géométries PHG candidates',[k for k,e in entities.items() if e['kind']=='mask-candidate'],['app/game/data/phgOfficialCosmeticsV141.json']),
 'save':('Contrat sauvegarde/migration chromatique',[],['app/game/hunterChromaticsV113.ts#normalizeHunterChromaticsV113','app/game/hunterChromaticsV113.ts#migrateLegacyPhgAppearanceV115','app/game/systems/hunterChromaticPersistenceV116.ts','app/game/GameClient.tsx']),
 'official':('Noms, Warpaints, Scars et séparation canonique',[],['app/game/data/phgOfficialCosmeticsV141.json','app/game/yautjaDecalsV133.ts#PHG_WARPAINT_EVIDENCE_V133']),
 'browser':('Parcours réels à rapprocher des captures du run courant',[],['app/game/GameClient.tsx','app/game/HunterChromaticForgeV113.tsx','scripts/qa-phg-p0p1-20261109.mjs']),
 'soak':('Atlas/FPS/mémoire: mesure longue requise',[],['app/game/hunterChromaticCanvasV113.ts','app/game/decalCanvasV133.ts']),
 'release':('Livraison/CI/merge/droits: critère externe',[],['docs/production/Yautja_PHG_V137_MANIFEST.json']),
 'gauntlets':('Gauntlets campagne hors admission PHG',[],['app/game/systems/gauntletMissionVisualV141.ts','app/game/GameClient.tsx']),
}
for fid,(label,keys,hook) in family_defs.items():
 add({'key':'family:'+fid,'id':'family:'+fid,'family':label,'kind':'family-contract','runtimeAdmitted':None,'relatedEntityKeys':keys,'runtimeHooks':hook,'paths':[],'imageEvidence':[],'sourceEvidence':[],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Critère exact de la ligne source conservé; preuves de famille à borner, recette individuelle et revue humaine non closes']})
for channel in ['skin','dreads','outfit','armor','biomask']:
 add({'key':'family:channel-'+channel,'id':'family:channel-'+channel,'family':'Contrat canal '+channel,'kind':'family-contract','runtimeAdmitted':None,'relatedEntityKeys':[k for k,e in entities.items() if e['kind']=='material' and e['channel']==channel],'runtimeHooks':hooks['material'],'paths':[],'imageEvidence':[],'sourceEvidence':[],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Recette sur la surface nommée dans la ligne Excel; preuve source du seul canal '+channel]})
for zone in ['face','body','armor','biomask']:
 add({'key':'family:decal-'+zone,'id':'family:decal-'+zone,'family':'Contrat decal '+zone,'kind':'family-contract','runtimeAdmitted':None,'relatedEntityKeys':[k for k,e in entities.items() if e['kind']=='decal' and e['channel']==zone],'runtimeHooks':hooks['decal'],'paths':[],'imageEvidence':[],'sourceEvidence':[],'art1to1Certified':False,'humanArtReview':'Non attestée','remaining':['Recette sur la surface nommée dans la ligne Excel; preuve source des seuls decals '+zone]})
family_by_id={
 'IMP-136-01':'v132','IMP-136-02':'decals','IMP-136-03':'concept','IMP-136-04':'rings','IMP-136-05':'v120','IMP-136-06':'save','IMP-136-07':'official','IMP-136-08':'candidates','IMP-136-09':'decals','IMP-136-10':'browser','IMP-136-11':'references','IMP-136-12':'soak',
 'T01':'save','T02':'v132','T03':'save','T04':'browser','T05':'decals','T06':'decals','T07':'decals','T08':'decals','T14':'browser','T16':'official',
 'B136-0374':'browser','B136-0375':'browser','B136-0376':'browser','B136-0377':'browser','B136-0378':'browser','B136-0379':'references','B136-0380':'rings','B136-0381':'soak','B136-0383':'release',
 'QA-134-07':'browser','QA-134-08':'browser','QA-134-10':'references','QA-134-11':'references','QA-134-12':'candidates','QA-134-13':'official','QA-135-06':'v132','QA-135-07':'concept','QA-135-08':'v120','QA-135-09':'references','QA-135-10':'browser','QA-135-11':'official','QA-135-12':'official',
 'CELL-04beb158f7c8':'v132','CELL-145ddcb13a53':'official','CELL-2b52b9aef019':'save','CELL-3502fa5c3d90':'references','CELL-3675f625b93a':'decals','CELL-388dc0b0942c':'decals','CELL-4013830d0ac8':'concept','CELL-684b64665da6':'v120','CELL-6e3d477f3e11':'browser','CELL-723e25a965c7':'release','CELL-9fea2d396050':'rings','CELL-d8976f409487':'concept','CELL-f63261843991':'references',
 'PHG-PLAN-6':'save','PHG-PLAN-10':'v120','PHG-PLAN-8':'existing-masks','T13':'rings','T15':'soak',
}
# Explicit titles of six new V137 documentary items.
title_alias={'Biomask officiel Wretch':'phg-mask-wretch','Biomask officiel Haze':'phg-mask-haze','Biomask officiel Rival':'phg-mask-rival','Biomask officiel Bone':'phg-mask-bone','Warpaint/Scar Pirate':'phg-mask-pirate-warpaint','Warpaint/Scar Captured/JH87':'phg-mask-scar-bugs'}
for e in entities.values():
 present=[i for i in e.get('imageEvidence',[]) if i['exists']]
 missing=[i for i in e.get('imageEvidence',[]) if not i['exists']]
 checks=[x for x in runtime['hashChecks'] if x['path'] in e.get('paths',[])]
 e['hashChecks']=checks
 e['phases']={
  'sourceIdentity':'Catalogue/manifeste explicite' if e.get('sourceEvidence') else 'Contrat de famille ou référence/objet candidat; voir sources Excel',
  'localPixels':'Présents et décodés' if present else 'Absents aux chemins runtime catalogués' if missing else 'Sans fichier local attribué par ce rapprochement',
  'pinnedHash':'Empreinte attendue concordante' if checks and all(x['pass'] for x in checks) else 'Empreinte locale calculée, sans empreinte attendue indépendante' if present else 'Bytes locaux non disponibles',
  'alphaAndVisiblePixels':'Pixels visibles mesurés; alpha et bornes dans imageEvidence' if present else 'Non mesurable sans bytes locaux',
  'runtimeAdmission':'Admis par fonction/registre de production réel' if e['runtimeAdmitted'] is True else 'Contrat de famille seulement; voir relatedEntityKeys' if e['runtimeAdmitted'] is None else 'Non admis sous cet identifiant exact; ne signifie pas fonction générique absente',
  'browserIndividual':'Non attesté par audit source',
  'humanArtReview':'Non attestée',
  'officialUV1to1':'Non certifié',
 }
reconciled=[]
unmapped=[]
for row in rows:
 matches=[];method=[]
 for value in [row['id'],row['title'],title_alias.get(row['title'],'')]:
  if value in aliases:matches+=aliases[value];method.append({'value':value,'method':'Identifiant exact / alias explicite du catalogue'})
 # Backlog rows expose canonical Element_ID in column D; no fuzzy name matching.
 for s in row['sources']:
  if s['sheet']=='Backlog_Master':
   val=source_snapshots[f"{s['path']}::{s['sheet']}::{s['row']}"]['values'][3]
   if val in aliases:matches+=aliases[val];method.append({'value':val,'method':'Backlog_Master colonne D Element_ID exact'})
 if row['id'] in family_by_id:matches.append('family:'+family_by_id[row['id']]);method.append({'value':row['id'],'method':'Contrat de famille identifié explicitement; ne vaut pas test individuel'})
 if row['id'].startswith('V144-'):matches.append('family:gauntlets');method.append({'value':row['id'],'method':'Source Gauntlets V144, hors admission PHG'})
 if row['id'].startswith('QA-') and row['id'][3:].isdigit():
  fid='family:'+row['title'] if row['title'].startswith('decal-') else 'family:channel-'+row['title']
  assert fid in entities
  matches.append(fid);method.append({'value':row['title'],'method':'QA du canal/zone exact; contexte de surface conservé dans sourceCases'})
 matches=list(dict.fromkeys(matches))
 if not matches:unmapped.append({k:row[k] for k in ['id','title','criterion']})
 linked=[entities[k] for k in matches]
 kinds={e['kind'] for e in linked}
 if any(e['runtimeAdmitted'] is True for e in linked):diagnosis='PARTIEL_SOURCE_ADMIS_REVUE_OUVERTE'
 elif 'drive-candidate' in kinds:diagnosis='BLOQUE_SOURCE_LOCALE_ADMISSION'
 elif 'drive-accessory' in kinds:diagnosis='ACCESSOIRE_DISTINCT_A_PRODUIRE_RACCORDER'
 elif 'native-source' in kinds:diagnosis='SOURCE_PRESENTE_HORS_REGISTRE_CHROMATIQUE'
 elif kinds & {'mask-candidate','official-gap'}:diagnosis='REFERENCE_NOMMEE_OBJET_OU_PIXELS_NON_QUALIFIES'
 elif 'reference-gap' in kinds:diagnosis='REFERENCE_PHG_ATTRIBUEE_UV_MANQUANTE'
 elif 'family-contract' in kinds:diagnosis='CONTRAT_FAMILLE_PREUVE_BORNEE_CRITERE_OUVERT'
 else:diagnosis='RAPPROCHEMENT_NON_RESOLU'
 cases=[source_snapshots[f"{s['path']}::{s['sheet']}::{s['row']}"] for s in row['sources']]
 criteria=[row['criterion']]+([row['remaining']] if row['remaining'] else [])
 divergences=[]
 for case in cases:
  if case['sheet']=='View_Coverage':
   declared=case['values'][2]
   current=list(dict.fromkeys(e.get('channel') for e in linked if e['kind']=='material'))
   if current and declared not in current:
    divergences.append({'kind':'source-workbook-channel-differs-from-current-registry','declared':declared,'actual':current,'evidence':'app/game/hunterChromaticsV113.ts#PHG_CHROMATIC_MATERIALS_V113','impact':'Écart de métadonnée documentaire; aucune preuve de mauvaise application runtime'})
 if row['id'].startswith('VIS138-'):
  v=cases[0]['values'];criteria+=['Morphologie requise: '+str(v[5]),'Vue requise: '+str(v[6]),'Capture nommée réelle et résultat observé de ce cas non fournis par audit source']
 reconciled.append({'key':row['key'],'id':row['id'],'priority':row['priority'],'title':row['title'],'sourceStatus':row['sourceStatus'],'diagnosis':diagnosis,'entityKeys':matches,'matchingEvidence':method,'sourceCases':cases,'sources':row['sources'],'documentaryDivergences':divergences,'runtimeAdmittedEntityIds':[e['id'] for e in linked if e['runtimeAdmitted'] is True],'runtimeHookEvidence':list(dict.fromkeys(h for e in linked for h in e['runtimeHooks'])),'generated': 'Actifs locaux décodés et hashés pour les entités admises' if any(e['runtimeAdmitted'] is True for e in linked) else 'Voir diagnostic et sourceEvidence entité; aucune déduction depuis la seule absence navigateur','integrated':'Admission source exacte démontrée, recette graphique ouverte' if any(e['runtimeAdmitted'] is True for e in linked) else 'Non admis ou contrat de famille, voir entités','tested':'Fonctions/bytes/alpha source vérifiés par famille; recette individuelle non attestée ici','browserTested':'Non établi par cet audit source; rapprocher qualification-native et soak séparément','humanArtReview':'Non attestée','art1to1Certified':False,'openCriteriaExact':criteria,'evidencePaths':['production/p0p1-20261109/qa/phg-admission/runtime-assets.json','production/p0p1-20261109/qa/phg-admission/source-tests.tap']})

families=[]
for family in sorted({e['family'] for e in entities.values()}):
 es=[e for e in entities.values() if e['family']==family];keys={e['key'] for e in es};rr=[r for r in reconciled if keys.intersection(r['entityKeys'])]
 families.append({'family':family,'entityKeys':sorted(keys),'entities':len(es),'subjects':len(rr),'runtimeAdmittedEntities':sum(e['runtimeAdmitted'] is True for e in es),'localImagePaths':sorted({p for e in es for p in e['paths'] if images.get(p,{}).get('exists')}),'missingLocalImagePaths':sorted({p for e in es for p in e['paths'] if p in images and not images[p]['exists']}),'diagnoses':dict(collections.Counter(r['diagnosis'] for r in rr)),'humanArtReviewClosed':0,'officialUV1to1Closed':0})
sourceFiles=['app/game/hunterChromaticsV113.ts','app/game/hunterMaterialsV113.ts','app/game/hunterVisuals.ts','app/game/phgBiomaskStudiesV132.ts','app/game/phgBiomaskTintsV131.ts','app/game/yautjaDecalsV133.ts','app/game/conceptBiomasksV133.ts','app/game/data/phgOfficialCosmeticsV141.json','app/game/data/phgDriveV120Catalog.json','app/game/data/phgDriveV120Installed.json','app/game/data/driveLatestSpritesV85.json','app/game/data/phgVisualFidelityQueueV122.json','app/game/GameClient.tsx','app/game/HunterRigPreview.tsx']
manifest={'schemaVersion':1,'asOf':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseCommit':runtime['baseCommit'],'inventory':{'path':str(INVENTORY),'sha256':sha(INVENTORY),'originalSubjects':original_count,'supplementalSubjects':len(rows)-original_count,'subjects':len(rows)},'sourceFiles':[{'path':p,'sha256':sha(ROOT/p)} for p in sourceFiles],'sourceWorkbooks':[{'path':p,'sha256':sha(ROOT/p)} for p in books],'method':'Tous les sujets conservés, IDs exacts/alias déclarés, contexte Excel original. Preuves de source/famille distinctes des observations navigateur et approbations artistiques. Aucun non-observé transformé en absent du code.','counts':{'subjects':len(reconciled),'mapped':sum(bool(x['entityKeys']) for x in reconciled),'unmapped':len(unmapped),'diagnoses':dict(collections.Counter(x['diagnosis'] for x in reconciled)),'entities':len(entities),'families':len(families),'humanArtReviewClosed':0,'officialUV1to1Closed':0},'runtimeAssertions':runtime['assertions'],'unmapped':unmapped,'families':families}
write('entities.json',list(entities.values()));write('rows.json',reconciled);write('summary.json',manifest)
updates=[{'key':r['key'],'diagnosis':r['diagnosis'],'status':'PARTIEL' if r['runtimeAdmittedEntityIds'] else 'OUVERT_DIAGNOSTIQUE','implementation':'Admission source démontrée' if r['runtimeAdmittedEntityIds'] else 'Voir diagnostic entités/contrat','domainTested':'Source: fonctions réelles / fichiers; recette individuelle ouverte','humanArtReview':'Non attestée','art1to1Certified':False,'openCriteria':r['openCriteriaExact'],'evidence':r['evidencePaths'],'entityKeys':r['entityKeys'],'reconciliationEvidence':'production/p0p1-20261109/qa/phg-admission/rows.json'} for r in reconciled]
write('registre-updates.json',updates)
print(json.dumps(manifest['counts'],ensure_ascii=False,indent=2));print('UNMAPPED',json.dumps(unmapped,ensure_ascii=False))
assert original_count==1806 and len(rows)==1811 and len({x['key'] for x in reconciled})==1811
