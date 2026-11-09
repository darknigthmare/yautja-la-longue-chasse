#!/usr/bin/env python3
"""Reconcile all107 current Homeworld subjects without importing candidates."""
from pathlib import Path
from collections import Counter
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[5];OUT=ROOT/'production/p0p1-20261109/qa/war-admission'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
S=json.loads((OUT/'homeworld-source-rows.json').read_text())
A=json.loads((OUT/'homeworld-current-targets/audit.json').read_text())
I=json.loads((OUT/'homeworld-independent-review.json').read_text())
T={x['id']:x for x in A['targets']};B={x['id']:x for x in I['assets']}
for s in I['sources']:assert sha(ROOT/s['path'])==s['sha256'],s['path']
for a in I['assets']:
 for s in a['exactSources']:assert sha(ROOT/s['path'])==s['sha256'],s['path']
# Geometry files are unchanged against current base; historical geometry receipt
# is linked as existing coverage, not rerun nor relabeled as native browser QA.
changed=subprocess.check_output(['git','diff','--name-only','HEAD','--','app/game/systems/homeworld*','app/game/data/homeworld*','app/game/Homeworld*'],cwd=ROOT,text=True).splitlines()
assert not changed,changed
source_hashes=I['sources']
proof_paths=['production/p0p1-20261109/qa/war-admission/homeworld-current-targets/audit.json','production/p0p1-20261109/qa/war-admission/homeworld-independent-review.json','production/p0p1-20261109/qa/war-admission/homeworld-v162-verify.log','production/p0p1-20261109/qa/war-admission/homeworld-reconcile-tests.log','production/p0p1-20261109/qa/homeworld/access-before.json','production/p0p1-20261109/qa/homeworld/npc-segments-before.json']
refs=[{'path':p,'sha256':sha(ROOT/p),'scope':'Read-only identity/geometry/file check; no native artist or gameplay admission of new candidates.'}for p in proof_paths]
access=json.loads((ROOT/proof_paths[-2]).read_text());segments=json.loads((ROOT/proof_paths[-1]).read_text())
assert access['anchors']==71 and access['unreachableAnchors']==[] and access['blockedAnchorCentres']==[]
assert segments=={'samples':9769,'findings':[]}
manifest161=json.loads((ROOT/'production/homeworld-v161/manifest.json').read_text())
rows=[]
for s in S['items']:
 ident=s['id'];title=s['registeredTitle'];cells=s['observations'][0]['cells'];code_refs=source_hashes
 if ident in T:
  t=T[ident];b=B[ident];state=t['stateAtAudit'];assert state==b['currentBindingState']
  exact=b['exactSources'];family=t['familyEvidencePaths']
  if state=='SOURCE_NOMMEE_PRESENTE':
   diagnosis='PARTIEL_RUNTIME_EXISTANT';present=f"{title} : source publique exacte identifiée et usage actif retrouvé dans les données/rendus actuels."
   remaining='Vérifier la variante et les états de cette cible, la proportion dans chaque scène, raccords et revue artistique ; une source active ne certifie pas la fidélité1:1. L’ancienne fixed-frame n’est pas le portique actif.'
  elif state=='CANDIDAT_EXACT_PRESENT':
   diagnosis='OUVERT_CANDIDAT_HORS_RUNTIME';present=f"{title} : {len(exact)} candidat(s) lié(s) à cet ID exact, fichier et SHA vérifiés ; aucune référence app ni copie publique de mêmes octets."
   zero=[a['path']for a in exact if 0 in a.get('nativeEmptyMargins',[])]
   remaining='Candidat de production non intégré : vérifier proportions/caméra/alpha/appuis, obtenir revue artistique puis implantation/collision/accès et recette en jeu.'+(' Alpha atteint un bord pour : '+' ; '.join(zero)+'.'if zero else '')
  else:
   assert state=='FAMILLE_SEULE_A_RECONCILIER'
   diagnosis='OUVERT_LIAISON_EXACTE_NON_DEMONTREE';present=f"{title} : {b['familyPathsCount']} chemin(s) de famille répertorié(s), sans liaison nominative exacte démontrée pour cet ID."
   remaining='Identifier une pièce précise dans les sources de cette famille puis vérifier fonction, silhouette, vue native et états. Aucune absence d’objet ni nécessité de régénérer n’est déduite du manque de liaison exacte.'
  detail={'bindingState':state,'exactSources':exact,'familyEvidencePaths':family,'runtimeAdmissionNew':False}
  tested='Audit sources/fichiers/liaisons ; comportement de cette cible non admis'
  browser='Non attesté pour cette cible et ses variantes'
 elif ident.startswith('HWA160-N'):
  target={'HWA160-N01':'target-v81-55-21','HWA160-N02':'target-v81-55-13','HWA160-N03':'target-v81-55-33'}[ident]
  b=B[target];assets=[a for a in b['exactSources']if a['assetId']==ident];assert len(assets)==1
  m=next(x for x in manifest161['assets']if x['id']==ident)
  diagnosis='OUVERT_CANDIDAT_ALPHA_ECHELLE';present=f'{ident} présent et lié à {target}, SHA et géométrie de fichier vérifiés, aucune référence app.'
  remaining='Caméra non mesurée/échelle non mesurée dans les métadonnées V161 ; alpha touche au moins un bord. Reprendre la source native si nécessaire, revue artistique puis implantation/empreinte et recette en jeu. Ne pas modifier silencieusement l’image par padding/étirement.'
  detail={'targetId':target,'exactSources':assets,'manifestMetadata':m,'countingNote':'Même candidat que la cible V81 correspondante, pas un objet supplémentaire.'}
  tested='Vérification binaire/métadonnées seulement';browser='Non : candidat hors runtime'
 elif ident in I['p0Findings']:
  finding=I['p0Findings'][ident];diagnosis='PARTIEL_GEOMETRIE_ADMISSION_OUVERTE';present=finding['implementedEvidence'];remaining=finding['remaining'];detail={'geometryPhaseOnly':True};tested='Code/production géométrique et sources vérifiés ; comparaison artistique en scène non faite';browser='Non attesté pour les candidats de cette exigence'
 elif ident=='QA-008':
  diagnosis='PARTIEL_NAVIGATION_GEOMETRIQUE';present='Géométrie courante :71 ancrages accessibles,7 connecteurs rejoints,9769 échantillons des segments PNJ sans collision. Le parcours natif Atlas traverse arrivée/hangar/Conseil.'
  remaining='La recette navigateur arrivée→tous services→retour n’a pas été exécutée pour toutes les portes/prop candidats. Aucun des nouveaux candidats de production n’est admis par ces anciens trajets verts.'
  detail={'geometryCoverage':{'anchors':71,'connectors':7,'npcSamples':9769,'runtimeSourceChangedFromHead':changed},'enclosedEmptyPockets':access['enclosedPockets'],'pocketsNote':'Quatre poches sans ancrage/service/objectif ; aucun déplacement arbitraire justifié.'};tested='Oui — graphe et segments existants';browser='Partiel — trajet arrivée/hangar/Conseil seulement'
 elif ident=='QA-009':
  diagnosis='OUVERT_ADMISSION_SOURCE_HUMAINE';present='Noms de sources et références des candidats conservés ; prototypes V162 déclarés adaptation originale, sans certification canon.';remaining='Concordance source nominative/surfaces visibles à revoir par artiste pour chaque cible ; aucune espèce/tribu inventée ne reçoit une étiquette canonique.';detail={'canonicalAdmissions':0};tested='Inventaire documentaire seulement';browser='Sans recette documentaire humaine'
 elif ident=='QA-010':
  diagnosis='OUVERT_ADMISSION_PERFORMANCE_PNG';present='Les PNG V161/V162 restent dans production hors bundle du jeu ; leurs octets/alpha et sources Blender sont vérifiables.';remaining='Aucun chargement runtime de ces fichiers à mesurer actuellement. Après admission et import explicites, mesurer mémoire/chargement sur appareil réel ; le soak PHG ne qualifie pas ces PNG Homeworld absents du bundle.';detail={'candidateRuntimeImports':0};tested='Fichiers uniquement ; pas mesure mémoire de ces PNG en jeu';browser='Non — candidats hors bundle'
 else:raise AssertionError(ident)
 status='PARTIEL'if diagnosis.startswith('PARTIEL')else 'OUVERT'
 rows.append({'key':s['key'],'id':ident,'priority':s['priority'],'domain':'Homeworld et habitats','status':status,'diagnosticCode':diagnosis,'implementation':'Partielle'if status=='PARTIEL'else 'Candidat de production ou référence à admettre, selon détail','implementationScope':present,'domainTested':tested,'browserTested':browser,'physicalController':'Non attesté','humanArt':'Non attestée','evidence':refs,'sourceRequirementRestored':' | '.join(str(v)for v in cells.values()),'sourceCells':cells,'sourceReferences':[{k:v for k,v in o.items()if k not in ['cells','headers']}for o in s['observations']],'sourceCode':code_refs,'detail':detail,'remaining':remaining,'qualificationScope':present+' Limite : '+remaining,'globalClosure':False})
assert len(rows)==107 and len({x['key']for x in rows})==107
counts={'subjects':107,'priority':dict(Counter(r['priority']for r in rows)),'status':dict(Counter(r['status']for r in rows)),'diagnosticCode':dict(Counter(r['diagnosticCode']for r in rows)),'catalogueTargets97':dict(Counter(T[x['id']]['stateAtAudit']for x in S['items']if x['id']in T)),'runtimeAdmissionsNew':0,'humanArtAdmissions':0}
report={'asOf':'2026-11-09','scope':'107 current Homeworld subjects individually reconciled; no source/old workbook edits, no new runtime admission.','counts':counts,'sourceIntegrity':{k:v for k,v in S.items()if k!='items'},'sourceHashes':source_hashes,'geometrySourceDiffFromHead':changed,'rows':rows}
(OUT/'homeworld-reconciliation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
updates=[{k:r[k]for k in ['key','status','diagnosticCode','implementation','domainTested','browserTested','physicalController','humanArt','evidence','remaining','qualificationScope','sourceRequirementRestored']}|{'sourceReconciliation':{'detail':r['detail'],'sourceReferences':r['sourceReferences'],'sourceCells':r['sourceCells']},'admissionReport':'production/p0p1-20261109/qa/war-admission/homeworld-reconciliation.json','admissionReportSha256':sha(OUT/'homeworld-reconciliation.json')}for r in rows]
(OUT/'homeworld-inventory-updates.json').write_text(json.dumps(updates,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(counts,ensure_ascii=False))
