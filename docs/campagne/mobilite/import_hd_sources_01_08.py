#!/usr/bin/env python3
"""Preserve eight already-generated individual PNGs, without 1:1 certification."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import urllib.request
import zlib

DEST = Path('art-source/mobilite/vehicules-montures/v0.2-individual-hd')
REPORT = Path('docs/campagne/mobilite/INDIVIDUELS_HD_01_08.md')
CDN = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3JHwJlNzgmcxQy32tjF7NiVZPuH/'
ROWS = [
[1,'blade_fighter_k93','Blade Fighter K-93','76ad064411a510087103a13eebbba895a336d751ec95b7cac8062070183218a1',2219655,'63499886-07b2-4477-9c31-9be467c6547f','Mâchoire verticale encore présente : non conforme au correctif Kenner demandé. Référence primaire et géométrie à reprendre.'],
[2,'blade_fighter_viper','Blade Fighter Viper','c4073073694ff57948c76b4e6dcb37da4b5da6b83def1cb560d03bbbcbacbbd6',2305451,'58edadf7-e998-4475-abb1-59476ebe554f','Silhouette interprétée ; conformité exacte NECA à comparer aux références primaires.'],
[3,'clan_hoverbike','Moto antigrav de clan','5d2cf7d95a54de403f39a65233426a707ae628a547f1f5d5c23296ace2b97965',2099363,'6dda35a7-e8b3-4a67-8cd4-1a7d140934ab','Interprétation ; conformité exacte à la moto de Badlands non établie.'],
[4,'hunter_hoverbike','Moto antigrav de chasse','75b9fc8a73aa28550127255d13377d5b8bf72789b71e7e7adcce8b429e94300e',2342511,'286658bc-09a1-4878-afbc-74d6b37019af','Conception originale du projet ; proportions, points de contact et équipements à comparer au brief avant validation.'],
[5,'scout_grav_sled','Grav-Sled éclaireur','7772c50e75aa0935f71b7161c7ada3a9d40ad58e9618248d94b45215badc6929',1896315,'e529fedb-1b64-43b7-b6a1-b041d1459c5a','Conception originale du projet ; proportions, points de contact et équipements à comparer au brief avant validation.'],
[6,'hunter_speeder','Hunter Speeder','acf4c18b9b5c81e0b297223e20f2a5e2464aff6188f7e52d0f75f453d3fbfa1d',2210890,'29e957ab-eaa9-492f-87a1-86cde52d76fb','Selle haute inclinée au lieu de posture quasi couchée du brief : à corriger.'],
[7,'thunder_fang_warbike','Thunder Fang','23efde709293a261cbc3bd9426cbb029271d13e3ee60eb23d0858754d63d5b9c',2485493,'90f25701-5592-4fb1-bd99-de2e332e303c','Conception originale du projet ; proportions, points de contact et équipements à comparer au brief avant validation.'],
[8,'sand_skimmer','Skimmer des dunes','b3eb867d37355b6ea1f79f4f69e391981481431bee21dd9243abc97e04499dea',2206276,'b11c523c-0708-4460-adbe-86fd89a999ec','Présence visuelle de deux assises/éléments de poste à clarifier avec le monoplace du catalogue.']
]

def need(condition, message):
    if not condition:
        raise ValueError(message)


def png_check(raw):
    need(raw[:8] == b'\x89PNG\r\n\x1a\n', 'PNG signature')
    pos = 8
    compressed = bytearray()
    header = None
    ended = False
    while pos < len(raw):
        need(pos + 12 <= len(raw), 'Truncated chunk')
        size = struct.unpack('>I', raw[pos:pos+4])[0]
        kind = raw[pos+4:pos+8]
        need(size <= len(raw) - pos - 12, 'Invalid chunk size')
        body = raw[pos+8:pos+8+size]
        crc = struct.unpack('>I', raw[pos+8+size:pos+12+size])[0]
        need(zlib.crc32(kind + body) & 0xffffffff == crc, 'PNG CRC mismatch')
        if kind == b'IHDR':
            need(header is None and pos == 8 and size == 13, 'IHDR')
            header = struct.unpack('>IIBBBBB', body)
        if kind == b'IDAT':
            compressed.extend(body)
        pos += size + 12
        if kind == b'IEND':
            need(size == 0 and pos == len(raw), 'IEND/trailing data')
            ended = True
            break
    need(ended and header == (1536, 1024, 8, 6, 0, 0, 0), 'Expected native 1536x1024 RGBA8 PNG')
    expected = (1536 * 4 + 1) * 1024
    dec = zlib.decompressobj()
    scanlines = dec.decompress(compressed, expected + 1)
    need(len(scanlines) == expected and dec.eof and not dec.unused_data and not dec.unconsumed_tail, 'Invalid compressed scanlines')
    need(all(scanlines[y*(1536*4+1)] in range(5) for y in range(1024)), 'PNG filter type')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path, help='Optional local directory of the same individual PNGs, for offline verification')
    args = parser.parse_args()
    need([r[0] for r in ROWS] == list(range(1, 9)), 'Ordered eight-entry scope')
    need(len({r[1] for r in ROWS}) == 8, 'Unique catalogue IDs')
    pending = []
    entries = []
    for index, uid, name, expected_sha, size, media_id, note in ROWS:
        need(re.fullmatch(r'[a-z0-9_]+', uid), 'Unsafe catalogue ID')
        filename = f'{index:02d}_{uid}__3q_left.png'
        if args.source_dir:
            raw = (args.source_dir / filename).read_bytes()
        else:
            with urllib.request.urlopen(CDN + media_id + '.png', timeout=60) as response:
                need(response.geturl() == CDN + media_id + '.png', 'Unexpected redirect')
                raw = response.read(size + 1)
        need(len(raw) == size and hashlib.sha256(raw).hexdigest() == expected_sha, 'Source mismatch: ' + uid)
        png_check(raw)
        path = DEST / filename
        pending.append((path, raw))
        entries.append({'index': index, 'catalogue_id': uid, 'name': name, 'path': str(path), 'sha256': expected_sha,
                        'git_blob_sha1': hashlib.sha1(b'blob ' + str(size).encode() + b'\0' + raw).hexdigest(),
                        'bytes': size, 'size': [1536, 1024], 'mode': 'RGBA',
                        'alpha_extrema_observed_locally': [0, 254],
                        'source': 'individual native generation from the previous lot-1 turn',
                        'pixels_preserved': True, 'source_upscaled': False, 'source_cropped_from_sheet': False,
                        'status': 'individual_hd_source_requires_art_review', 'visual_review_note': note,
                        'runtime_integrated': False, 'canonical_1_to_1_certified': False, 'human_art_validated': False})
    need(len({e['sha256'] for e in entries}) == 8, 'Duplicate images')
    manifest = {'schema': 'yautja-mobility-individual-hd/0.2', 'count': 8,
                'scope': 'Eight already-generated individual HD sources (01–08), not new outputs 21–30.',
                'alpha_warning': 'Native alpha preserved. Semi-transparent background halos require clean-up and review on light/dark backgrounds before runtime use.',
                'entries': entries,
                'next_lot_21_30': 'not_produced_as_individual_hd; incorrect collective outputs excluded',
                'remaining_previous_sources_09_20': 'not_imported_by_this_delivery'}
    pending.append((DEST / 'MANIFEST.json', (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode()))
    report = '''# Mobilité — huit sources individuelles HD conservées (01–08)

**Livraison partielle : huit PNG de 1536 × 1024 provenant du lot 1 déjà généré. Ce ne sont pas dix nouvelles images du lot 3.**

Les octets natifs sont conservés : aucun agrandissement, recadrage de planche ni remplacement des anciennes sources V0.1. Une image distincte par véhicule, identifiants du catalogue conservés.

## Limites de cette passe

Les tentatives du lot suivant 21–30 ont renvoyé des planches collectives des anciens sujets. Elles sont écartées, non comptées et non importées. Le transfert de la source 09 a été bloqué par un contrôle de sécurité ; il n'a pas été réessayé par une autre voie. Les sources 09–20 restent non importées par cette livraison. Seules les huit sources dont le transfert avait déjà réussi entrent ici.

La génération individuelle HD ne certifie pas la fidélité 1:1 : le Blade Fighter conserve une mâchoire incorrecte, Viper/Badlands demandent des références primaires, le Hunter Speeder garde une posture de siège à corriger. Les détails par fichier sont dans le manifeste. L'alpha natif atteint 254 et certaines images conservent un halo semi-transparent ; nettoyage et inspection dans le moteur restent nécessaires.

## Vérifications

Huit identifiants et huit SHA-256 distincts ; tailles, signatures PNG, dimensions RGBA8, CRC, décompression et filtres des lignes contrôlés. Comparaison à l'empreinte des fichiers sources de la conversation. La seconde exécution vérifie l'idempotence. Aucun code du jeu, sauvegarde, rang, recrutement, catalogue de gameplay ou atlas validé n'est modifié. Pas de fusion ni de déploiement manuel.

`runtime_integrated`, `canonical_1_to_1_certified` et `human_art_validated` restent `false`.

## Images individuelles

| N° | Véhicule | Source native |
|---|---|---|
'''
    for e in entries:
        report += f"| {e['index']:02d} | {e['name']} | [PNG 1536 × 1024](../../../{e['path']}) |\n"
    report += '\n[Manifeste](../../../' + str(DEST / 'MANIFEST.json') + ').\n'
    pending.append((REPORT, report.encode()))
    pending.append((DEST/'README.md', b'# Individual HD sources 01-08 - partial delivery\n\nEight previous individual native generations, not new lot 21-30. No 1:1 certification or runtime integration. See MANIFEST.json and [the delivery report](../../../../docs/campagne/mobilite/INDIVIDUELS_HD_01_08.md).\n'))
    for path, raw in pending:
        if path.exists():
            need(path.read_bytes() == raw, 'Refusing overwrite: ' + str(path))
    for path, raw in pending:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_bytes(raw)
    print(json.dumps({'png': 8, 'native_size': [1536,1024], 'files_verified': len(pending), 'bytes': sum(e['bytes']for e in entries), 'unique_sha256': 8, 'runtime_modified': False, 'certified_1_to_1': False}))

if __name__ == '__main__':
    main()
