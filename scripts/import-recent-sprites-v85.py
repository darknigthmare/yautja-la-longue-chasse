"""Author a source registry from user-supplied archives; never execute pack code.

PNG bytes are copied unchanged into a content-addressed C: staging directory.
Hashes, archive inventory and PNG header dimensions are source metadata, not QA.
This script does not import or start any game module, test or build.
"""
from pathlib import Path, PurePosixPath
import argparse, csv, hashlib, io, json, re, shutil, struct, subprocess, zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--stage', required=True)
parser.add_argument('--downloads', default=r'C:\Users\chuck\Downloads\Yautja games')
parser.add_argument('--project', default=str(Path(__file__).resolve().parents[1]))
args = parser.parse_args()
stage, downloads, project = Path(args.stage).resolve(), Path(args.downloads).resolve(), Path(args.project).resolve()
if stage.drive.upper() != 'C:' or project not in stage.parents:
    raise ValueError('Staging must be a dedicated C: child of this project.')
blobs, raw = stage / 'library', stage / 'source-metadata'
blobs.mkdir(parents=True, exist_ok=True)
raw.mkdir(parents=True, exist_ok=True)

def digest(data): return hashlib.sha256(data).hexdigest()
def slug(value): return re.sub(r'[^a-z0-9]+', '-', str(value).lower()).strip('-')
def display_name(value):
    # Some ZIPs stored UTF-8 filenames without their UTF-8 flag. Preserve the
    # original member path and bytes, while decoding the display label only.
    try: return value.encode('cp437').decode('utf-8')
    except (UnicodeError, AttributeError): return value
def checked_name(name):
    path = PurePosixPath(name.replace('\\', '/'))
    if path.is_absolute() or '..' in path.parts or any(':' in part for part in path.parts):
        raise ValueError('Unsafe archive path: ' + name)
    return path.as_posix()
def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

assets, packs, groups, families, missing = [], [], {}, {}, []
blob_sizes = {}

def read_records(entries, reader):
    records, csvrows = {}, []
    for name in entries:
        lower = name.lower()
        if lower.endswith(('.json', '.csv', '.md', '.txt')):
            content = reader(name)
            if lower.endswith('.json'):
                try: records[name] = json.loads(content.decode('utf-8-sig'))
                except (UnicodeError, json.JSONDecodeError): pass
            elif lower.endswith('.csv'):
                text = content.decode('utf-8-sig')
                first = text.splitlines()[0] if text else ''
                csvrows.extend(csv.DictReader(io.StringIO(text), delimiter=';' if first.count(';') > first.count(',') else ','))
    return records, csvrows

def ingest(pack_id, label, version, priority, archive, names, reader, archive_sha, inside=None, include=None):
    names = [checked_name(name) for name in names if name and not name.endswith('/')]
    records, csvrows = read_records(names, reader)
    meta_dir = raw / pack_id
    for name in names:
        if name.lower().endswith(('.json', '.csv', '.md', '.txt')):
            target = meta_dir / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(reader(name))
    for name, data in records.items():
        if Path(name).name == 'GROUPS.json' and isinstance(data, list):
            for row in data:
                if isinstance(row, dict) and row.get('id'):
                    groups[row['id']] = {key: row.get(key) for key in ['id', 'nameFR', 'kind', 'regionId', 'regionFR', 'villageFR', 'canonStatus', 'morphotypeId']}
        if Path(name).name == 'FAMILIES.json' and isinstance(data, list):
            for row in data:
                if isinstance(row, dict) and row.get('id'): families[row['id']] = row.get('labelFR', row['id'])
    png_names = [name for name in names if name.lower().endswith('.png') and (include is None or include(name))]
    file_rows = {}
    for row in csvrows:
        file = row.get('output') or row.get('fichier') or row.get('file')
        if file:
            file_rows[checked_name(file)] = row
    file_metadata = {}
    for name, data in records.items():
        if isinstance(data, dict) and ('metadata/' in name or 'art-source/' in name) and data.get('id'):
            file_metadata[str(data['id'])] = data
    list_rows = []
    for name, data in records.items():
        if isinstance(data, dict) and isinstance(data.get('assets'), list): list_rows.extend(data['assets'])
    count = 0
    for name in png_names:
        row = next((row for file, row in file_rows.items() if name == file or name.endswith('/' + file)), {})
        manifest_row = next((row for row in list_rows if isinstance(row, dict) and (row.get('file') or row.get('fichier')) and (name == (row.get('file') or row.get('fichier')) or name.endswith('/' + (row.get('file') or row.get('fichier'))))), {})
        stem = Path(name).stem
        group_id = row.get('clanId') or (name.split('/sprites/', 1)[1].split('/')[0] if '/sprites/' in name else name.split('/')[1] if name.startswith('sprites/') and len(name.split('/')) > 2 else '')
        identity = str(row.get('id') or manifest_row.get('id') or ((group_id + '--') if group_id else '') + stem)
        metadata = file_metadata.get(identity, {})
        group_id = metadata.get('groupId') or group_id
        role = str(row.get('postId') or row.get('familyFR') or row.get('famille') or metadata.get('familyId') or stem.rsplit('-', 1)[0])
        title = display_name(str(row.get('nameFR') or row.get('nom') or manifest_row.get('name') or manifest_row.get('nom') or metadata.get('nameFR') or stem.replace('_', ' ').replace('-', ' ')))
        content = reader(name)
        sha = digest(content)
        # Header dimensions are recording source facts. No decoder, pixel edit,
        # perspective check, gameplay validation or supplied script is run.
        width, height = struct.unpack('>II', content[16:24]) if content.startswith(b'\x89PNG\r\n\x1a\n') else (0, 0)
        target = blobs / (sha + '.png')
        if not target.exists(): target.write_bytes(content)
        blob_sizes[sha] = len(content)
        category = row.get('categorie') or manifest_row.get('categorie') or ('texture' if pack_id == 'phg-textures' else 'faune' if pack_id == 'menagerie' else 'personnage')
        kind = 'texture' if category == 'texture' else 'fauna' if category == 'faune' else 'flora' if category == 'flore' else 'synthetic' if category == 'synthetiques' else 'npc'
        if category == 'yautja' and re.search(r'equipement|objet|accessoire|arme',str(row.get('type_visuel') or manifest_row.get('type_visuel') or ''),re.I): kind='equipment'
        if pack_id == 'phg-textures':
            group_id = name.split('/textures/', 1)[1].split('/')[0] if '/textures/' in name else 'phg'
            role = str(manifest_row.get('reference_name') or stem)
        if pack_id == 'menagerie':
            group_id, role = 'menagerie', stem.replace('_', ' ')
        if pack_id.startswith('badlands'):
            group_id, role = str(category), str(manifest_row.get('pose') or row.get('pose') or '')
            identity = 'badlands-' + str(row.get('id') or manifest_row.get('id') or stem)
        asset_id = 'import-v85:' + pack_id + ':' + slug(identity) + ':' + sha[:12]
        source_note = str(row.get('notes_fidelite') or manifest_row.get('reference_status') or manifest_row.get('description') or metadata.get('acceptanceStatus') or 'Identité et rôle selon le catalogue fourni ; fidélité 1:1 non certifiée.')
        if pack_id == 'phg-textures': source_note = 'Reconstitution visuelle de matériau Hunting Grounds ; fichier UV original non fourni et teinte non calibrée. ' + source_note
        pose = str(row.get('pose') or manifest_row.get('pose') or 'Pose native statique')
        assets.append({'id': asset_id, 'identityId': identity, 'label': title, 'packId': pack_id, 'packLabel': label, 'version': version, 'priority': priority,
            'kind': kind, 'groupId': group_id or 'unassigned', 'groupLabel': row.get('clanFR') or row.get('groupFR') or '', 'role': role,
            'roleLabel': row.get('postFR') or row.get('familyFR') or families.get(role, role), 'lifeStage': row.get('lifeStage') or '',
            'regionId': row.get('regionId') or '', 'morphotypeId': row.get('morphotypeId') or '', 'masked': row.get('masked') or row.get('visage') or '',
            'src': '/game/imports/v85/library/' + sha + '.png', 'width': width, 'height': height, 'bytes': len(content), 'sha256': sha,
            'sourceArchive': archive, 'insideArchive': inside, 'sourcePath': name, 'sourceStatus': 'native-bytes-imported-unverified',
            'producerStatus': metadata.get('acceptanceStatus') or manifest_row.get('reference_status') or '', 'pose': pose, 'motionStatus': 'single-pose-static',
            'canonicalFidelity': 'not-certified-1-to-1', 'sourceNote': source_note,
            'supersedesIdentityId': ('badlands-' + row['supersedes_asset_id']) if row.get('supersedes_asset_id') else '',
            'supersededByIdentityId': ('badlands-' + row['superseded_by_asset_id']) if row.get('superseded_by_asset_id') else ''})
        count += 1
    packs.append({'id': pack_id, 'label': label, 'version': version, 'priority': priority, 'archive': archive, 'insideArchive': inside,
        'sha256': archive_sha, 'pngEntriesImported': count, 'recordEntries': len(records), 'status': 'source-import-authored-no-qa'})
    print(json.dumps({'pack': pack_id, 'pngEntriesImported': count, 'recordEntries': len(records)}, ensure_ascii=True), flush=True)

selected = [
 ('clans-v5','Clans culturels · V5','V5',50,'YAUTJA_V5_10_CLANS_190_PNJ.zip'),
 ('lineages-v5','Lignées · V5','V5',50,'YAUTJA_V5_10_LIGNEES_190_PNJ.zip'),
 ('guards-v4','Gardes des dix clans · V4','V4',40,'YAUTJA_CLANS_V4_100_GARDES.zip'),
 ('war-v2','Guerre interne · V2 et chasseurs conservés','V2',20,'YAUTJA_GUERRE_INTERNE_30_NOUVEAUX_12_CHASSEURS.zip'),
 ('kings-v1','Rois et chefs · V1','V1',10,'YAUTJA_PNJ_ROIS_V1_7_SPRITES.zip'),
 ('riders-v52','Chevaucheurs · V5.2 complet','V5.2',52,'YAUTJA_CHEVAUCHEURS_COMPLET_V5_2.zip'),
 ('v6-baseline','PNJ historiques · base V6','V6',60,'YAUTJA_V6_BASE_200_PNG_HISTORIQUES.zip'),
 ('v6-cp01','PNJ supplémentaires · checkpoint V6','V6',60,'YAUTJA_V6_CP01_NOUVEAUX_VALIDES.zip'),
 ('v6-matriarchs','Matriarches · V6','V6',60,'YAUTJA_V6_36_MATRIARCHES_18_GROUPES.zip'),
 ('v6-military','Métiers militaires · V6','V6',60,'YAUTJA_V6_29_MILITAIRES_NOUVEAUX.zip'),
 ('v61-corrections','Ajouts et corrections · V6.1','V6.1',61,'YAUTJA_V61_AJOUTS_ET_CORRECTIONS.zip'),
 ('v61-humans','Humains acceptés · V6.1','V6.1',61,'YAUTJA_V61_HUMAINS_22_VALIDES_20261005T1800Z.zip'),
 ('v63-courts-a','Cours et cavaliers · V6.3 A','V6.3',63,'YAUTJA_V63_A_COURS_ET_CAVALIERS_10_GROUPES.zip'),
 ('v63-courts-b','Cours et cavaliers · V6.3 B','V6.3',63,'YAUTJA_V63_B_COURS_ET_CAVALIERS_8_GROUPES.zip'),
 ('v64-a','Matriarches et cavaliers · V6.4 A','V6.4',64,'YAUTJA_V64_A_MATRIARCHES_ET_CAVALIERS_10_GROUPES.zip'),
 ('v64-b','Matriarches et cavaliers · V6.4 B','V6.4',64,'YAUTJA_V64_B_MATRIARCHES_ET_CAVALIERS_8_GROUPES.zip'),
 ('menagerie','Ménagerie · 6 octobre','2026-10-06',80,'YAUTJA_MENAGERIE_VAISSEAUX_SPRITES_GENERES_2026-10-06.zip'),
 ('phg-textures','Matériaux Hunting Grounds · 78 reconstitutions','1.0',80,'YAUTJA_PHG_78_TEXTURES.zip'),
]
for pack_id, label, version, priority, filename in selected:
    archive = downloads / filename
    if not archive.is_file(): missing.append({'archive': filename, 'reason': 'archive-not-local'}); continue
    with zipfile.ZipFile(archive) as z:
        include = (lambda name: '/Menagerie/' in name) if pack_id == 'menagerie' else None
        ingest(pack_id,label,version,priority,filename,z.namelist(),z.read,digest(archive.read_bytes()),include=include)

portable = downloads / 'YAUTJA_V66_V67_PACK_PORTABLE_COMPLET.zip'
with zipfile.ZipFile(portable) as z:
    outer_sha = digest(portable.read_bytes())
    for info in z.infolist():
        if not info.filename.endswith('.zip'): continue
        content = z.read(info)
        with zipfile.ZipFile(io.BytesIO(content)) as inner:
            version = 'V6.7' if '_V67_' in info.filename else 'V6.6'
            pack_id = slug(info.filename.removesuffix('.zip'))
            ingest(pack_id,info.filename.removesuffix('.zip'),version,67 if version == 'V6.7' else 66,portable.name,inner.namelist(),inner.read,outer_sha,inside=info.filename)

badlands = downloads / 'PREDATOR_BADLANDS_V7_118_ASSETS.rar'
listed = subprocess.run(['tar','-tf',str(badlands)],check=True,capture_output=True).stdout.decode('utf-8').splitlines()
rar_names = [checked_name(name) for name in listed]
rar_stage = raw / 'badlands-rar-original'
rar_stage.mkdir(parents=True,exist_ok=True)
extract = [name for name in rar_names if name.lower().endswith(('.json','.csv','.md','.txt')) or '/sprites/' in name and name.lower().endswith('.png')]
for name in extract:
    target = (rar_stage / name).resolve()
    if rar_stage.resolve() not in target.parents: raise ValueError('RAR target escaped staging.')
subprocess.run(['tar','-xf',str(badlands),'-C',str(rar_stage),*extract],check=True)
ingest('badlands-v7','Predator: Badlands · V7 / 118 visuels','V7',70,badlands.name,extract,lambda name:(rar_stage/name).read_bytes(),digest(badlands.read_bytes()),include=lambda name:'/sprites/' in name)

pnj = downloads / 'YAUTJA_PNJ_V84_integration.zip'
with zipfile.ZipFile(pnj) as z:
    manifest = json.loads(z.read('YAUTJA_PNJ_V84/manifest.json'))
    cast = json.loads(z.read('YAUTJA_PNJ_V84/cast.json'))
    write_json(raw/'pnj-v84-manifest-original.json',manifest)
    write_json(raw/'pnj-v84-cast-original.json',cast)
    missing.append({'archive':pnj.name,'reason':'metadata-only-archive-no-png','declaredVariants':len(manifest.get('variants',[])),
        'roles':manifest.get('roles',[]),'claimStatus':'producer-manifest-not-revalidated','sha256':digest(pnj.read_bytes())})
    write_json(project/'app/game/data/recentNpcSourceMetadataV85.json',{'version':'V85','sourceArchive':pnj.name,
        'status':'metadata-only-pixels-not-in-archive','sourceRoles':manifest.get('roles',[]),'sourceVariants':manifest.get('variants',[]),
        'sourceCast':cast.get('cast',[]),'producerClaimsRevalidated':False,'importedPngCount':0})
missing.extend([{'archive':name,'reason':reason,'claimStatus':'source-inventory-reported-by-root-not-game-qa'} for name,reason in [
    ('Badlands V13 / 159 assets (Drive)','newer-drive-pack-not-yet-in-local-source-library'),
    ('Menagerie et vaisseaux / 52 fichiers (Drive)','newer-drive-pack-not-yet-in-local-source-library'),
    ('Hunting Grounds / fichiers du 7 octobre (Drive)','latest-individual-files-collected-by-root-separately')]])
badlands_complement=project/'app/game/data/badlandsLatestSpritesV85.json'
if badlands_complement.is_file():
    complement=json.loads(badlands_complement.read_text(encoding='utf-8'))
    for entry in missing:
        if entry['archive'].startswith('Badlands V13'):
            entry.update({'reason':'resolved-through-six-addition-lots-v8-v13','resolutionRegistry':'app/game/data/badlandsLatestSpritesV85.json',
                'importedAdditionPng':complement.get('summary',{}).get('pngEntriesImported',0)})

latest = {}
for asset in assets:
    previous = latest.get(asset['identityId'])
    if previous is None or asset['priority'] > previous['priority']: latest[asset['identityId']] = asset
for asset in assets:
    asset['preferredVersion'] = latest[asset['identityId']]['id'] == asset['id'] and not asset['supersededByIdentityId']
    if not asset['groupLabel']: asset['groupLabel'] = (groups.get(asset['groupId']) or {}).get('nameFR') or asset['groupId'].replace('-', ' ')
summary = {'sourceEntriesImported':len(assets),'uniquePngFiles':len(blob_sizes),'nativePngBytes':sum(blob_sizes.values()),
    'preferredIdentityEntries':sum(asset['preferredVersion'] for asset in assets),'packs':len(packs),'metadataOnlyNpcVariants':len(manifest.get('variants',[]))}
registry = {'version':'V85','createdAt':'2026-10-07','validation':'source-authoring-no-game-qa','pixelPolicy':'original-png-bytes-no-edit',
    'summary':summary,'packs':packs,'groups':list(groups.values()),'missingSources':missing,'assets':assets}
write_json(project/'app/game/data/recentSpriteLibraryV85.json',registry)
write_json(project/'docs/drive-imports-v85-sources.json',{'version':'V85','summary':summary,'packs':packs,'missingSources':missing,
    'sourceRoot':'C:/Users/chuck/Downloads/Yautja games','stagingRoot':str(stage),'publicNamespace':'/game/imports/v85/library/',
    'additionalDriveSources':'app/game/data/driveLatestSpritesV85.json',
    'badlandsAdditionRegistry':'app/game/data/badlandsLatestSpritesV85.json','badlandsAdditionSources':'docs/badlands-drive-additions-v85-sources.json',
    'archiveScriptsExecuted':False,'gameQaExecuted':False,'pngBytesModified':False})
write_json(stage/'import-summary.json',summary)
print(json.dumps(summary,ensure_ascii=True),flush=True)
