"""Record seven named Drive PNG sources without changing their pixels or gameplay."""
from pathlib import Path
import base64
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / '.work-local/recent-approved-hunters-v85'
PUBLIC = ROOT / 'work-local/drive-import-20261007/public-assets/drive-latest/approved-hunters'
metadata = json.loads((STAGING / 'source-files.json').read_text(encoding='utf-8'))
known = {}
for filename in ('recentSpriteLibraryV85.json', 'driveLatestSpritesV85.json', 'badlandsLatestSpritesV85.json'):
    data = json.loads((ROOT / 'app/game/data' / filename).read_text(encoding='utf-8'))
    for asset in data['assets']:
        known.setdefault(asset['sha256'], asset['src'])

labels = {
    'V14__neca_rhino_kenner_version2_blue_v14.png': 'Rhino Kenner · bleu · V14',
    'V14__neca_rhino_kenner_orange_v14.png': 'Rhino Kenner · orange · V14',
    'V14__neca_snake_series13_v14.png': 'Snake · NECA série 13 · V14',
    'V14__neca_panther_kenner_tribute_v14.png': 'Panther · Kenner Tribute · V14',
    'V14__neca_night_cougar_kenner_tribute_v14.png': 'Night Cougar · Kenner Tribute · V14',
    'V1__wolf_2007_unmasked_profile_v2.png': 'Wolf 2007 · sans masque · profil V2',
    'V1__wolf_2007_masked_profile_v2.png': 'Wolf 2007 · masqué · profil V2',
}
PUBLIC.mkdir(parents=True, exist_ok=True)
originals = STAGING / 'originals'
originals.mkdir(parents=True, exist_ok=True)
assets = []
new_sha = set()
for file in metadata['files']:
    title = file['title']
    if title not in labels or Path(title).name != title:
        raise ValueError('Source outside the seven named Yautja PNGs')
    pixels = base64.b64decode((STAGING / (file['id'] + '.b64')).read_text(encoding='utf-8'), validate=False)
    if pixels[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Source is not PNG bytes')
    width, height = struct.unpack('>II', pixels[16:24])
    sha = hashlib.sha256(pixels).hexdigest()
    (originals / title).write_bytes(pixels)
    existing = known.get(sha)
    if existing:
        src = existing
    else:
        target = (PUBLIC / (sha + '.png')).resolve()
        if not target.is_relative_to(PUBLIC.resolve()):
            raise ValueError('Public target outside the allowed namespace')
        target.write_bytes(pixels)
        src = '/game/imports/v85/drive-latest/approved-hunters/' + sha + '.png'
        known[sha] = src
        new_sha.add(sha)
    url = file.get('url') or 'https://drive.google.com/file/d/' + file['id'] + '/view'
    assets.append({
        'id': 'approved-hunter-v85:' + file['id'], 'identityId': 'approved-hunter:' + title[:-4],
        'label': labels[title], 'src': src, 'width': width, 'height': height,
        'sha256': sha, 'bytes': len(pixels), 'kind': 'npc',
        'groupId': 'approved-yautja-portraits', 'groupLabel': 'Portraits Yautja · dossier validé source',
        'packId': 'approved-hunters', 'packLabel': 'Portraits Yautja · sources récentes',
        'version': 'V14' if title.startswith('V14') else 'V1 · profil V2', 'priority': 94,
        'role': '', 'preferredVersion': True,
        'sourceArchive': 'Google Drive · dossier images validées PHG', 'sourcePath': title,
        'sourceStatus': 'provided-approved-folder-native-unverified',
        'producerStatus': 'approved-folder-designation-no-game-certification',
        'sourceNote': 'PNG original inchangé. « Validé » désigne le dossier source ; aucune certification visuelle, canonique 1:1 ou gameplay. Référence statique distincte, sans clips ni combattant ajouté.',
        'pose': 'Portrait ou profil natif unique · pose statique',
        'canonicalSubject': labels[title], 'canonicalState': 'source-filename-designation', 'fullBody': None,
        'sourceDriveFileId': file['id'], 'sourceDriveUrl': url,
        'sourceCreatedTime': file.get('created_time'), 'sourceModifiedTime': file.get('modified_time'),
        'sourceFolderId': metadata['folderId'], 'deduplicatedExistingPixels': bool(existing),
        'animationReady': False, 'rigReady': False, 'collider': None, 'physicalScale': None,
    })

summary = {'sourceDirectFilesListed': metadata['listedDirectFiles'], 'selectedNamedYautjaFiles': len(assets),
    'pngEntriesImported': len(assets), 'uniqueNewPngBytes': len(new_sha),
    'deduplicatedExistingPngEntries': sum(a['deduplicatedExistingPixels'] for a in assets),
    'selectedPngBytes': sum(a['bytes'] for a in assets), 'qaPerformed': False,
    'scopeComplete': 'Seven explicitly named sources only; not all Drive PNGs from Oct 4 to Oct 7.'}
registry = {'version': 'V85', 'assets': assets, 'sourceSummary': summary,
    'sourceFolder': metadata['folderUrl'], 'deliveryStatus': 'source-import-authored-no-qa'}
(ROOT / 'app/game/data/recentApprovedHuntersV85.json').write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
provenance = {'version': 'V85', 'folderId': metadata['folderId'], 'folderUrl': metadata['folderUrl'],
    'scope': metadata['scope'], 'summary': summary,
    'files': [{k: a[k] for k in ('id', 'label', 'src', 'sha256', 'bytes', 'width', 'height', 'sourcePath', 'sourceDriveFileId', 'sourceDriveUrl', 'sourceCreatedTime', 'deduplicatedExistingPixels')} for a in assets],
    'excluded': ['Other subjects in the same folder', 'Rejected and attempt folder', 'Unbounded Drive recent-image search'],
    'fidelity': 'Source titles and folder designation preserved; no visual or canonical 1:1 certification.'}
(ROOT / 'docs/recent-approved-hunters-v85-sources.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(STAGING / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(summary, ensure_ascii=False))
