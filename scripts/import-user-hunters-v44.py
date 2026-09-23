"""Import user-owned hunter PNGs, preserving every published byte and source provenance.
Archive text is treated only as data. No scripts, prompts, or instructions are executed.
Requires Python 3 + Pillow and Windows bsdtar for the supplied RAR.
"""
from __future__ import annotations
import argparse, base64, hashlib, io, json, pathlib, re, subprocess, unicodedata, zipfile, stat
from PIL import Image, ImageDraw, ImageFont

ARCHIVES = [
'YAUTJA_PARTIE_1_NECA_84_PAIRES_168_PNG.zip',
'YAUTJA_PARTIE_2_COMPLEMENTS_80_PAIRES_160_PNG.zip',
'YAUTJA_82_NOUVELLES_VERSIONS.zip',
'YAUTJA_NECA_PACK_COMPLET_RESTAURE.zip',
'YAUTJA_IMAGES_58_PNG.zip',
'YAUTJA_RECUPERATION_39_IMAGES.zip',
'THE_PIT_LOT2_6_SPRITES_V1.zip',
'YAUTJA_NECA_2_MANQUANTS_DC_2019.zip',
'YAUTJA_TOUTES_LES_IMAGES_50_PNG.rar',
'Yautja_Warp_Universe_Galerie.html',
]
EXISTING = {'jungle_hunter':'jungle-hunter','city_hunter':'city-hunter',
'feral':'feral-hunter','elder_greyback':'greyback','valkyrie_phg':'valkyrie',
'witch_phg':'witch','warlord':'kok-warlord','stone_heart':'stone-heart',
**{x:x for x in ['scar','celtic','wolf','berserker','falconer','tracker','scarface','enforcer']}}
GROUPS = {'assassin_armored':'assassin','assassin_unarmored':'assassin',
'dek_training_armor':'dek','dek_bone_bison':'dek','armored_lost':'lost','classic_lost':'lost',
'golden_angel':'elder_greyback','ambush_viper':'viper','berserker_unmasked':'berserker',
'celtic_battle_damaged':'celtic','city_demon':'city_hunter','falconer_camo':'falconer',
'feral_bear_blood':'feral','feral_camo_reveal':'feral','fugitive_lab_escape':'fugitive',
'jungle_demon':'jungle_hunter','scar_cloaked':'scar','wolf_mid_cloak':'wolf',
'avp_arcade_hunter':'arcade_hunter','mad_predator':'arcade_mad'}
for x in ['battle_damaged','cloaked','genesis','poster']:
    GROUPS['city_hunter_'+x]='city_hunter'
for x in ['battle_damaged','nes','prototype','unmasked']:
    GROUPS['jungle_hunter_'+x]='jungle_hunter'
NAMES={'assassin':'Assassin Predator','dek':'Dek','lost':'Lost Predator','elder_greyback':'Elder Greyback',
'jungle_hunter':'Jungle Hunter','city_hunter':'City Hunter','feral':'Feral Predator',
'scar':'Scar','celtic':'Celtic','wolf':'Wolf','berserker':'Berserker Predator','falconer':'Falconer Predator'}
def slug(s):
    return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
def safe_name(n):
    p=pathlib.PurePosixPath(n.replace('\\','/'))
    if p.is_absolute() or '..' in p.parts or any(':' in x for x in p.parts):
        raise ValueError('Unsafe archive path: '+n)
    return p
def excluded_reason(n):
    u=n.upper()
    if any(t in u for t in ['HISTORIQUE','AVANT_CORRECTION']):
        return 'historical-pre-correction'
    if 'NON_VALIDEES' in u:
        return 'source-explicitly-not-validated'
    if any(t in u for t in ['PLANCHE','CATALOGUE','03_ARMES','02_COMPAGNONS','PENDENTIF']):
        return 'not-an-individual-hunter'
    return None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--downloads',default='C:/Users/chuck/Downloads')
    ap.add_argument('--repo',default='.')
    ap.add_argument('--asset-dir',default='public/game/sprites/v44/user-hunters')
    ap.add_argument('--evidence-dir',default='work/v44/user-hunters')
    args=ap.parse_args()
    root=pathlib.Path(args.repo).resolve(); downloads=pathlib.Path(args.downloads)
    assetdir=pathlib.Path(args.asset_dir).resolve(); evidence=pathlib.Path(args.evidence_dir).resolve()
    assetdir.mkdir(parents=True,exist_ok=True); evidence.mkdir(parents=True,exist_ok=True)
    sources=[]; strong={}; jsons={}; archive_proofs=[]; archives={}
    for name in ARCHIVES:
        path=downloads/name
        archive_proofs.append({'name':name,'bytes':path.stat().st_size,'sha256':hashlib.file_digest(path.open('rb'),'sha256').hexdigest()})
        if name.endswith('.zip'):
            z=zipfile.ZipFile(path); archives[name]=z
            entries=z.infolist()
            if sum(e.file_size for e in entries)>2_000_000_000: raise ValueError('Archive expansion limit')
            if len({e.filename for e in entries})!=len(entries): raise ValueError('Duplicate member paths')
            for ent in entries:
                safe_name(ent.filename)
                if stat.S_ISLNK(ent.external_attr>>16) or ent.flag_bits&1: raise ValueError('Link/encrypted member')
                if ent.file_size>32_000_000: raise ValueError('Member size limit')
                if ent.filename.lower().endswith('.png'): sources.append((name,ent.filename))
                if ent.filename.endswith('.json'):
                    j=json.loads(z.read(ent).decode('utf-8-sig')); jsons[(name,ent.filename)]=j
                    if ent.filename.endswith('/fiche.json') and name in ARCHIVES[:2]:
                        for version,meta in j.get('versions',{}).items():
                            member=str(pathlib.PurePosixPath(ent.filename).parent/(version+'.png'))
                            if member not in z.namelist(): raise ValueError(member)
                            strong[(name,member)]={'sourceId':j['id'],'name':j['nom'],
                              'sourceLabel':j.get('famille','Pack fourni'),'variantLabel':meta.get('etat',version),
                              'version':version,'interpretation':meta.get('tete_statut')!='reference',
                              'notes':j.get('notes',[]),'sourceUrls':meta.get('sources',[])}
        elif name.endswith('.html'):
            source=path.read_text('utf-8')
            match=re.search(r'<script[^>]*id="asset-data"[^>]*>(.*?)</script>',source,re.S)
            if not match: raise ValueError('Missing HTML asset JSON')
            items=json.loads(match.group(1)); embedded={}
            html_ids={'06':'warp-adjutant','07':'warp-gardien','33':'feral','34':'jungle_hunter','35':'city_hunter','36':'scar','37':'wolf','38':'fugitive','39':'jotun_grendel','40':'oni','41':'pilot_bullet','48':'warp-enforcer'}
            for item in items:
                n=str(safe_name(item['file']));prefix=pathlib.PurePosixPath(n).name[:2]
                if prefix not in html_ids: continue
                if not item['src'].startswith('data:image/png;base64,'):raise ValueError('Unexpected embedded image')
                embedded[n]=base64.b64decode(item['src'].split(',',1)[1],validate=True)
                if len(embedded[n])>32_000_000:raise ValueError('Embedded image size limit')
                sources.append((name,n));strong[(name,n)]={'sourceId':html_ids[prefix], 'name':item['title'], 'sourceLabel':'Galerie Warp fournie', 'variantLabel':'Galerie Warp', 'version':'warp', 'interpretation':True, 'notes':[item.get('notes','')], 'sourceUrls':[]}
            archives[name]=embedded
            archive_proofs[-1]['embeddedAssetsTotal']=len(items);archive_proofs[-1]['hunterAssetsSelected']=len(embedded)
            del source,items
        else:
            result=subprocess.run(['tar','-tf',str(path)],capture_output=True,check=True)
            names=result.stdout.decode('utf-8' if b'\xc3' in result.stdout else 'cp1252').splitlines()
            if len(names)!=len(set(names)): raise ValueError('Duplicate RAR member paths')
            archives[name]=path
            for n in names:
                safe_name(n)
                if n.endswith('.png'): sources.append((name,n))
                if n.endswith('INVENTAIRE.json'):
                    j=json.loads(subprocess.run(['tar','-xOf',str(path),n],capture_output=True,check=True).stdout)
                    jsons[(name,n)]=j
    def read(a,n):
        data=archives[a].read(n) if isinstance(archives[a],zipfile.ZipFile) else archives[a][n] if isinstance(archives[a],dict) else subprocess.run(['tar','-xOf',str(archives[a]),n],capture_output=True,check=True).stdout
        if len(data)>32_000_000: raise ValueError('Member expansion limit')
        return data
    # Collect explicit title/source metadata without treating source prompts as executable instructions.
    secondary={}
    for (a,n),j in jsons.items():
        if isinstance(j,dict):
            items=j.get('items',j.get('fichiers',j.get('files',j.get('images',j.get('assets',[])))))
        elif isinstance(j,list): items=j
        else: continue
        if not isinstance(items,list): continue
        for it in items:
            if not isinstance(it,dict):continue
            sha=it.get('sha256')
            if sha: secondary.setdefault(sha,it)
    deprecated={}
    for a,n in sources:
        if excluded_reason(n)=='historical-pre-correction':
            deprecated[hashlib.sha256(read(a,n)).hexdigest()]=(a,n)
    # Strong paired sources first. Exact SHA duplicates reuse their identity and variant.
    sources.sort(key=lambda s:(0 if s in strong else 1,ARCHIVES.index(s[0]),s[1]))
    fighters={}; assets={}; records=[]; exclusions=[]
    orientation_overrides_path=root/'scripts/data/pit-user-hunters-v44-review.json'
    overrides=json.loads(orientation_overrides_path.read_text('utf-8')) if orientation_overrides_path.exists() else {}
    for index,(a,n) in enumerate(sources):
        data=read(a,n); sha=hashlib.sha256(data).hexdigest()
        reason=excluded_reason(n)
        if sha in deprecated:reason=reason or 'byte-identical-historical-pre-correction'
        record={'archive':a,'entry':n,'sha256':sha,'bytes':len(data)}
        if reason:
            record['status']='excluded';record['reason']=reason;exclusions.append(record.copy());records.append(record);continue
        if sha in assets:
            record.update(status='duplicate',fighterId=assets[sha]['fighterId'],variantId=assets[sha]['id'])
            records.append(record);continue
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            width,height=im.size
            if im.mode!='RGBA':
                reason='no-rgba-alpha'
            else:
                alpha=im.getchannel('A');extrema=alpha.getextrema();hist=alpha.histogram()
                bbox=alpha.point(lambda p:255 if p>=32 else 0).getbbox()
                if not bbox or extrema[0]!=0 or hist[0]/(width*height)<.05:reason='no-usable-transparent-silhouette'
                if width>=height:reason='not-a-portrait-single-fighter'
            if reason:
                record.update(status='excluded',reason=reason);exclusions.append(record.copy());records.append(record);continue
            x0,y0,x1,y1=bbox
            bottom=alpha.crop((0,round(y0+(y1-y0)*.86),width,y1)).point(lambda p:255 if p>=32 else 0).getbbox()
            pivot=[round((bottom[0]+bottom[2])/2,1) if bottom else round((x0+x1)/2,1),y1-1]
            topmask=alpha.crop((round(width*.25),0,round(width*.75),height)).point(lambda p:255 if p>=32 else 0).getbbox()
            top=topmask[1] if topmask else y0
            edges=[alpha.crop((0,0,width,1)).getextrema()[1],alpha.crop((0,height-1,width,height)).getextrema()[1],
                   alpha.crop((0,0,1,height)).getextrema()[1],alpha.crop((width-1,0,width,height)).getextrema()[1]]
        meta=strong.get((a,n)); sm=secondary.get(sha,{})
        stem=pathlib.PurePosixPath(n).stem
        source_id=(meta or {}).get('sourceId') or sm.get('id') or (pathlib.PurePosixPath(n).parent.name if stem in ['avec_casque','sans_casque'] else stem)
        if a=='THE_PIT_LOT2_6_SPRITES_V1.zip':source_id='lot2-'+str(sm.get('id',stem))
        # These identities are literally named in the supplied filenames, not inferred from appearance.
        for named in ['hashori','kalakta','ny_ytap','yaquita','yuahro']:
            if named in source_id:source_id=named
        source_id=GROUPS.get(source_id,source_id)
        fighter_id=EXISTING.get(source_id,'user-'+slug(source_id))
        name=(meta or {}).get('name') or sm.get('name') or sm.get('title') or sm.get('nom_original') or stem.replace('_',' ')
        name=NAMES.get(source_id,name)
        if source_id in ['hashori','kalakta','ny_ytap','yaquita','yuahro']:name=source_id.replace('_',' ').title()
        name=re.sub(r'\s*[—–-]\s*masque$','',name,flags=re.I)
        name=re.sub(r'\.png$','',name,flags=re.I).replace('_',' ').strip()
        name=name[:1].upper()+name[1:]
        variant_meta=(meta or {}).get('sourceId',source_id)
        version=(meta or {}).get('version') or (stem if stem in ['avec_casque','sans_casque'] else 'pose')
        label=(meta or {}).get('variantLabel') or ('Sans masque' if any(t in stem for t in ['sans_', 'demasque']) else 'Pose fournie')
        if variant_meta!=source_id:label=((meta or {}).get('name',variant_meta.replace('_',' ')))+' · '+label
        vid=slug(variant_meta+'-'+version)+'-'+sha[:10]
        facingtext=str(sm.get('facing','')).lower()
        facing='left' if 'gauche' in facingtext else 'right' if 'droite' in facingtext else 'neutral'
        review=overrides.get(sha,{})
        facing=review.get('nativeFacing',facing)
        fighter_id=review.get('fighterId',fighter_id)
        name=review.get('fighterName',name)
        label=review.get('variantLabel',label)
        pivot=review.get('pivot',pivot);top=review.get('bodyTopY',top)
        v={'id':vid,'label':label,'src':'/game/sprites/v44/user-hunters/'+sha+'.png',
           'width':width,'height':height,'pivot':pivot,'bodyTopY':top,'nativeFacing':facing,
           'sha256':sha,'sourceArchive':a,'sourceEntry':n,'frameCount':1,'animated':False,
           'alphaRange':list(extrema),'alphaBounds':list(bbox),'maxEdgeAlpha':max(edges),
           'measurementStatus':'alpha-estimate','orientationStatus':'visual-contact-reviewed' if review else 'source-metadata-or-unreviewed',
           'identityStatus':review.get('identityStatus','source-labelled' if meta or sm.get('id') else 'descriptive-source-name'),
           'interpretation':(meta or {}).get('interpretation',True),'sourceUrls':(meta or {}).get('sourceUrls',[]),
           'sourceNotes':(meta or {}).get('notes',[]),'qualityNotes':review.get('qualityNotes',[])}
        fighter=fighters.setdefault(fighter_id,{'id':fighter_id,'name':name,'sourceLabel':(meta or {}).get('sourceLabel','Images fournies'),
                                              'canonicalFidelityCertified':False,'variants':[]})
        fighter['variants'].append(v);assets[sha]={**v,'fighterId':fighter_id}
        target=assetdir/(sha+'.png')
        if target.exists():
            if hashlib.sha256(target.read_bytes()).hexdigest()!=sha:raise ValueError('Destination conflict')
        else:target.write_bytes(data)
        record.update(status='integrated',fighterId=fighter_id,variantId=vid);records.append(record)
        if index%40==0:print('Processed',index,'/',len(sources),flush=True)
    for fighter in fighters.values():
        fighter['identityStatus']='source-labelled' if any(v['identityStatus']=='source-labelled' for v in fighter['variants']) else 'descriptive-source-name'
    ordered=sorted(fighters.values(),key=lambda x:(x['id'].startswith('user-'),x['name'].casefold()))
    catalog={'schemaVersion':1,'fighters':ordered,'exclusions':exclusions}
    out=root/'app/game/data/pitUserHuntersV44.json';out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n','utf-8')
    report={'schemaVersion':1,'checkedAt':'2026-09-23','sourceArchivesModified':False,'archiveInstructionsExecuted':False,
            'publishedImageBytesUnchanged':True,'archives':archive_proofs,'inputPngCount':len(sources),
            'uniqueInputShaCount':len({r['sha256'] for r in records}),'fighterCount':len(ordered),
            'variantCount':len(assets),'sourceLabelledIdentities':sum(f['identityStatus']=='source-labelled' for f in ordered),'descriptiveIdentities':sum(f['identityStatus']!='source-labelled' for f in ordered),'publishedBytes':sum((assetdir/(s+'.png')).stat().st_size for s in assets),
            'duplicateEntries':sum(r['status']=='duplicate' for r in records),'excludedEntries':len(exclusions),
            'entries':records,'limits':['All supplied fighter assets are static poses, one frame, not animation sheets.',
             'Identity grouping follows explicit supplied names; fidelity 1:1 is not certified.',
             'Pixels and source files are unchanged. Alpha pivots are estimates unless visually reviewed.',
             'Excluded files remain intact in their original archives.']}
    (root/'docs/v44-user-hunters-intake.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8')
    # Review sheets are disposable derivatives, never used as runtime art.
    assetlist=list(assets.values())
    for page in range((len(assetlist)+39)//40):
        sheet=Image.new('RGB',(1000,1150),'#18212b');draw=ImageDraw.Draw(sheet)
        for j,v in enumerate(assetlist[page*40:page*40+40]):
            x=(j%8)*125;y=(j//8)*230
            with Image.open(assetdir/(v['sha256']+'.png')) as im:
                im.thumbnail((120,196));sheet.paste(im,(x+(125-im.width)//2,y),im)
            draw.text((x+3,y+198),str(page*40+j)+' '+v['sha256'][:6],fill='white')
            draw.text((x+3,y+211),v['fighterId'].removeprefix('user-')[:18],fill='white')
        sheet.save(evidence/('contact-'+str(page+1)+'.jpg'),quality=90)
    (evidence/'contact-index.json').write_text(json.dumps(assetlist,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps({k:report[k] for k in ['inputPngCount','uniqueInputShaCount','fighterCount','variantCount','publishedBytes','duplicateEntries','excludedEntries']}))
if __name__=='__main__':main()
