#!/usr/bin/env python3
"""Import archived mobility PNGs without rewriting images or game data.

Source bytes are frozen by SHA-256. Historical manifests remain untouched.
Only the paths derived below may be written. No downloaded code is executed.
"""
from __future__ import annotations
import argparse
import concurrent.futures
import hashlib
import json
import re
import struct
import urllib.request
import zlib
from pathlib import Path

DOC = Path('docs/campagne/mobilite')
ART = Path('art-source/mobilite')
HD = ART / 'vehicules-montures/v0.2-individual-hd'
LOW = ART / 'vehicules-montures/v0.1'
REQUEST = DOC / 'IMPORT_SOURCES_COMPLET_20261106.json'
REPORT = DOC / 'DEPOT_COMPLET_SPRITES_20261106.md'
MANIFEST = DOC / 'DEPOT_COMPLET_SPRITES_20261106.json'
ART_INDEX = ART / 'INDEX_SOURCES_20261106.md'
MEDIA = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3JHwJlNzgmcxQy32tjF7NiVZPuH/'
EXPECTED = set(range(9, 21)) | {'A01'} | {f'S{i:02d}' for i in range(1, 17)}
LIMIT = 8 * 1024 * 1024
FLAGS = dict(runtime_integrated=False, canonical_1_to_1_certified=False, human_art_validated=False)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def verify_png(data: bytes) -> list[int]:
    require(8 < len(data) <= LIMIT and data[:8] == b'\x89PNG\r\n\x1a\n', 'Invalid PNG signature/size')
    pos, header, parts, ended = 8, None, [], False
    while pos + 12 <= len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        end = pos + length + 12
        require(end <= len(data), 'Truncated PNG chunk')
        kind, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + length]
        crc = struct.unpack('>I', data[end - 4:end])[0]
        require(zlib.crc32(kind + body) & 0xffffffff == crc, 'PNG CRC mismatch')
        if kind == b'IHDR':
            require(header is None and pos == 8 and length == 13, 'Invalid IHDR')
            header = struct.unpack('>IIBBBBB', body)
        elif kind == b'IDAT':
            parts.append(body)
        elif kind == b'IEND':
            require(length == 0 and end == len(data), 'Invalid PNG end')
            ended = True
        pos = end
        if ended:
            break
    require(ended and header is not None and parts, 'Incomplete PNG')
    width, height, bits, color, compression, filtering, interlace = header
    require(0 < width <= 4096 and 0 < height <= 4096, 'PNG dimensions out of range')
    require((bits, color, compression, filtering, interlace) == (8, 6, 0, 0, 0), 'Expected RGBA8 noninterlaced')
    size = (width * 4 + 1) * height
    decoder = zlib.decompressobj()
    raw = decoder.decompress(b''.join(parts), size + 1)
    require(len(raw) == size and decoder.eof and not decoder.unused_data, 'Invalid PNG data length')
    require(all(raw[y * (width * 4 + 1)] <= 4 for y in range(height)), 'Invalid PNG row filter')
    return [width, height]


def read_request(expected_sha: str) -> dict:
    data = REQUEST.read_bytes()
    require(sha(data) == expected_sha, 'Request fingerprint changed')
    req = json.loads(data)
    require(req['schema'] == 'yautja-mobility-all-sources/1', 'Unknown schema')
    require((req['expected_existing'], req['expected_new'], req['expected_total']) == (58, 29, 87), 'Counts changed')
    rows = req['rows']
    require(len(rows) == 29 and {r[0] for r in rows} == EXPECTED, 'Missing/duplicate source keys')
    require(len({r[3] for r in rows}) == 29, 'Duplicate source fingerprints')
    for key, filename, media_id, digest in rows:
        require(Path(filename).name == filename and '/' not in filename and '\\' not in filename, 'Unsafe filename')
        require(filename.endswith('.png'), 'Only PNG sources permitted')
        require(re.fullmatch(r'[0-9a-f-]{36}', media_id) is not None, 'Invalid media identifier')
        require(re.fullmatch(r'[0-9a-f]{64}', digest) is not None, 'Invalid source fingerprint')
    return req


def load_catalogue() -> list[dict]:
    result = []
    for path in sorted((DOC / 'catalogue').glob('[0-9][0-9]-[0-9][0-9].json')):
        result.extend(json.loads(path.read_text()))
    require(len(result) == 50 and len({e['id'] for e in result}) == 50, 'Catalogue must retain its 50 unique IDs')
    return result


def source_entry(row: list, catalogue: list[dict]) -> dict:
    key, filename, media_id, digest = row
    if type(key) is int:
        item = catalogue[key - 1]
        require(re.fullmatch(r'[a-z0-9_]+', item['id']) is not None, 'Unsafe catalogue identifier')
        path = HD / f"{key:02d}_{item['id']}__3q_left.png"
        category, uid, name = 'individual_hd', item['id'], item['name']
    elif key == 'A01':
        path = ART / 'essais-individuels/01_blade_fighter__essai_non_retenu.png'
        category, uid, name = 'individual_trial', 'blade_fighter_k93', 'Premier essai individuel — non retenu'
    else:
        path = ART / f'archives-planches/20261106/{key}_{filename}'
        category, uid, name = 'collective_archive', None, f'Planche historique {key}'
    return dict(source_key=key, source_filename=filename, path=str(path), category=category,
                catalogue_id=uid, name=name, sha256=digest, media_id=media_id)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Unexpected source redirect')


def acquire(entry: dict, source_dir: Path | None) -> tuple[dict, bytes]:
    path = Path(entry['path'])
    if path.exists():
        data = path.read_bytes()
    elif source_dir is not None:
        data = (source_dir / entry['source_filename']).read_bytes()
    else:
        url = MEDIA + entry['media_id'] + '.png'
        with urllib.request.build_opener(NoRedirect).open(url, timeout=60) as response:
            require(response.status == 200, 'Source response not successful')
            data = response.read(LIMIT + 1)
    require(sha(data) == entry['sha256'], 'Source SHA-256 mismatch: ' + path.name)
    size = verify_png(data)
    if entry['category'] in ('individual_hd', 'individual_trial'):
        require(size == [1536, 1024], 'Individual source resolution changed')
    record = {k: v for k, v in entry.items() if k != 'media_id'}
    record.update(bytes=len(data), git_blob_sha1=git_sha(data), size=size, mode='RGBA', pixels_preserved=True,
                  source_upscaled=False, source_cropped_from_sheet=False, **FLAGS)
    record['status'] = 'archived_not_production' if entry['category'] != 'individual_hd' else 'individual_hd_source_requires_art_review'
    record['visual_review_note'] = ('Archive collective : les textes, comptes et coches dessinés ne prouvent aucune livraison.'
        if entry['category'] == 'collective_archive' else 'Source conservée sans retouche ; conformité au brief et alpha à valider avant usage moteur.')
    return record, data


def prior_entries() -> list[dict]:
    result = []
    for folder, category, expected_count in [(LOW, 'concept_low_resolution', 50), (HD, 'individual_hd', 8)]:
        source = json.loads((folder / 'MANIFEST.json').read_text())
        entries = source['entries']
        require(len(entries) == expected_count, 'Historical manifest changed: ' + str(folder))
        for e in entries:
            path = Path(e['path'])
            require(path.parent == folder and path.suffix == '.png', 'Unexpected historical path')
            data = path.read_bytes()
            require(sha(data) == e['sha256'], 'Historical PNG changed: ' + str(path))
            size = verify_png(data)
            require(size == e['size'], 'Historical dimensions changed')
            if 'git_blob_sha1' in e:
                require(git_sha(data) == e['git_blob_sha1'], 'Historical Git blob changed')
            row = dict(e)
            row.update(category=category, bytes=len(data), git_blob_sha1=git_sha(data), **FLAGS)
            result.append(row)
    require(len(result) == 58, 'Incorrect historical total')
    return result


def safe_write(path: Path, data: bytes) -> None:
    if path.exists():
        require(path.read_bytes() == data, 'Refusing to overwrite existing different file: ' + str(path))
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def render_documents(req: dict, entries: list[dict]) -> dict[Path, bytes]:
    groups = {'individual_hd': 20, 'concept_low_resolution': 50, 'individual_trial': 1, 'collective_archive': 16}
    for category, count in groups.items():
        require(sum(e['category'] == category for e in entries) == count, 'Incorrect category count: ' + category)
    manifest = dict(schema='yautja-mobility-complete-sources/1', audited_head=req['audited_head'],
        png_count=87, groups=groups, unique_catalogue_subjects=50, catalogue_individual_hd_count=20,
        individual_hd_missing_catalogue_indices=list(range(21, 51)),
        bytes=sum(e['bytes'] for e in entries), added_png_count=29, preserved_png_count=58,
        alias_not_duplicated={'imagegen.png': str(HD / '11_jungle_strider__3q_left.png')},
        scope='Import des sources existantes seulement ; aucune nouvelle génération, animation ou intégration moteur.',
        alpha_warning='Alpha natif préservé. Les sources HD gardent des halos semi-transparents ; aucune certification artistique 1:1.',
        entries=entries, **FLAGS)
    text = '''# Mobilité — dépôt complet des sources disponibles · 6 novembre 2026

**87 PNG distincts conservés dans la PR : 20 images individuelles HD de catalogue, 50 petits concepts individuels, un essai individuel non retenu et 16 planches historiques.**

Les 70 PNG individuels du catalogue concernent les mêmes 50 véhicules/montures : les vingt HD ne créent pas vingt véhicules supplémentaires. Les planches sont des archives, pas des atlas moteur, animations découpées ou lots individuels supplémentaires. Les mentions « complet », « 1:1 », « prêt pour intégration » et les coches dessinées dans ces planches ne constituent pas une validation.

## Ce qui change

Les sources HD 09–20 sont ajoutées aux huit sources 01–08 déjà présentes, chacune dans son PNG natif de **1536 × 1024**. L'essai antérieur et les seize planches ont des dossiers séparés. Les 58 PNG précédents restent inchangés et leurs manifestes historiques sont conservés. Le nom générique `imagegen.png` est un alias exact du Jungle Strider : il n'est pas copié une seconde fois.

Le transfert ordinaire du skimmer des marais a abouti pendant cette passe. La mention de blocage dans le rapport historique 01–08 reste la trace de cet essai antérieur, pas l'état actuel du dépôt.

## Contrôles et limites

Vérifications sur les fichiers : SHA-256 des sources, SHA Git, signatures PNG, CRC de chaque chunk, dimensions RGBA8, décompression, taille et filtres des lignes ; 87 chemins uniques et 87 empreintes distinctes. Aucune récompression, découpe, recoloration ou mise à l'échelle des nouvelles sources. Les anciennes vues V0.1 sont préservées telles qu'elles avaient été extraites.

Il s'agit d'une vérification de conservation des sources, pas d'une QA de jeu. La mâchoire Kenner, la fidélité Viper/Badlands, les assises et équipements de plusieurs concepts et les halos d'alpha restent à reprendre. Les vues et animations manquantes ne sont pas créées par cet import. Les **entrées 21–50 n'ont toujours pas de sortie individuelle HD** ; elles restent représentées par leurs petits concepts V0.1. Aucune validation artistique humaine ou canonique 1:1 n'est accordée.

Aucun code du jeu, sauvegarde, rang, recrutement, géographie, atlas validé ou droit d'accès n'est modifié. Compagnons, Warp, Clan Ship et progression restent inchangés. La PR n'est ni fusionnée ni déployée par cet import.

[Manifeste de tous les fichiers](DEPOT_COMPLET_SPRITES_20261106.json) · [Catalogue de conception](INDEX.md) · [Contrat de production](PRODUCTION_VISUELLE.md).
'''
    titles = {'individual_hd': '20 sources individuelles HD — catalogue 01–20',
              'concept_low_resolution': '50 concepts individuels historiques V0.1',
              'individual_trial': 'Essai individuel antérieur — archive non retenue',
              'collective_archive': '16 planches historiques — hors production'}
    for category in groups:
        text += '\n## ' + titles[category] + '\n\n| Source | PNG dans le dépôt | Dimensions |\n|---|---|---|\n'
        for e in sorted((v for v in entries if v['category'] == category), key=lambda v: v['path']):
            label = e.get('catalogue_id') or e.get('source_key', '')
            text += f"| `{label}` | [{e['name']}](../../../{e['path']}) | {e['size'][0]} × {e['size'][1]} |\n"
    index = '''# Mobilité — sources graphiques

[Voir les 87 fichiers et leur statut](../../docs/campagne/mobilite/DEPOT_COMPLET_SPRITES_20261106.md).

- 20 sources individuelles HD 01–20 : `vehicules-montures/v0.2-individual-hd/`.
- 50 concepts historiques : `vehicules-montures/v0.1/`.
- Un essai distinct non retenu : `essais-individuels/`.
- 16 planches archivées, pas des sprites runtime : `archives-planches/20261106/`.

Le manifeste de huit HD V0.2 reste un reçu historique. Le [manifeste consolidé](../../docs/campagne/mobilite/DEPOT_COMPLET_SPRITES_20261106.json) fait foi pour l'inventaire actuel. Aucun fichier n'est certifié 1:1 ou intégré au moteur par sa seule conservation.
'''
    result = {REPORT: text.encode(), MANIFEST: (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode(), ART_INDEX: index.encode()}
    note = '\n\n<!-- mobility-all-sources-20261106:start -->\n## Sources graphiques conservées dans la PR\n\n[Inventaire actuel des 87 PNG](DEPOT_COMPLET_SPRITES_20261106.md) : 20 sorties individuelles HD 01–20, 50 concepts V0.1, un essai non retenu et 16 planches archivées séparément. Les anciens reçus restent historiques. Aucun nouveau lot 21–30, aucune animation, intégration moteur ou validation artistique 1:1 ne découle de cet import.\n<!-- mobility-all-sources-20261106:end -->\n'
    for name in ['README.md', 'PRODUCTION_VISUELLE.md']:
        path = DOC / name
        current = path.read_text()
        if '<!-- mobility-all-sources-20261106:start -->' in current:
            require(note in current, 'Existing index section differs')
        else:
            result[path] = (current + note).encode()
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request-sha256', required=True)
    parser.add_argument('--source-dir', type=Path, help='Use mounted native files for offline checks')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    req = read_request(args.request_sha256)
    catalogue = load_catalogue()
    previous = prior_entries()
    requested = [source_entry(row, catalogue) for row in req['rows']]
    require(len({e['path'] for e in requested}) == 29, 'Duplicate destination')
    if args.check_only:
        require(all(Path(e['path']).is_file() for e in requested), 'Missing committed PNG')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        acquired = list(executor.map(lambda e: acquire(e, args.source_dir), requested))
    entries = previous + [e for e, _ in acquired]
    require(len({e['path'] for e in entries}) == 87 and len({e['sha256'] for e in entries}) == 87, 'Duplicate/incomplete collection')
    documents = render_documents(req, entries)
    # Validate all candidate outputs before the first write.
    for entry, data in acquired:
        target = Path(entry['path'])
        if target.exists():
            require(target.read_bytes() == data, 'Destination conflict')
    if args.check_only:
        for path, data in documents.items():
            require(path.read_bytes() == data, 'Published metadata differs: ' + str(path))
        for name in ['README.md', 'PRODUCTION_VISUELLE.md']:
            require('mobility-all-sources-20261106:start' in (DOC / name).read_text(), 'Missing index link')
    else:
        for path, data in documents.items():
            if path not in [DOC / 'README.md', DOC / 'PRODUCTION_VISUELLE.md'] and path.exists():
                require(path.read_bytes() == data, 'Refusing metadata overwrite: ' + str(path))
        for entry, data in acquired:
            safe_write(Path(entry['path']), data)
        for path, data in documents.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    require(all(Path(e['path']).is_file() and sha(Path(e['path']).read_bytes()) == e['sha256'] for e in entries), 'Readback mismatch')
    print(json.dumps(dict(png=87, existing_preserved=58, new_png=29, individual_hd=20,
        historical_concepts=50, archived_individual_trial=1, archived_sheets=16,
        unique_paths=87, unique_sha256=87, manifest_sha256=sha(MANIFEST.read_bytes()),
        total_png_bytes=sum(e['bytes'] for e in entries), check_only=args.check_only, **FLAGS)))


if __name__ == '__main__':
    main()
