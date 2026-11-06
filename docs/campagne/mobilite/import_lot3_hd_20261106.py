#!/usr/bin/env python3
"""Import ten native PNGs already generated in the preceding conversation.
No claim of producing missing 31-50, animations, or canonically faithful assets.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import struct
import urllib.request
import zlib

DOC = Path('docs/campagne/mobilite')
ART = Path('art-source/mobilite')
HD = ART / 'vehicules-montures/v0.2-individual-hd'
REQUEST = DOC / 'IMPORT_LOT3_HD_21_30_20261106.json'
PREVIOUS = DOC / 'DEPOT_COMPLET_SPRITES_20261106.json'
LOT = DOC / 'LOT3_HD_21_30_20261106.json'
CURRENT = DOC / 'ETAT_SPRITES_HD_20261106.json'
REPORT = DOC / 'LOT3_HD_21_30_20261106.md'
QUEUE = DOC / 'REPRISE_HD_31_50.json'
INDEX = ART / 'INDEX_SOURCES_ACTUEL.md'
MEDIA = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3JHwJlNzgmcxQy32tjF7NiVZPuH/'
FLAGS = {'runtime_integrated': False, 'canonical_1_to_1_certified': False, 'human_art_validated': False}
LIMIT = 8_000_000


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git_sha(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def verify_png(data):
    require(8 < len(data) <= LIMIT and data[:8] == b'\x89PNG\r\n\x1a\n', 'PNG signature/length')
    pos, header, parts, ended = 8, None, [], False
    while pos + 12 <= len(data):
        n = struct.unpack('>I', data[pos:pos + 4])[0]
        end = pos + n + 12
        require(end <= len(data), 'Truncated PNG')
        kind, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + n]
        require(zlib.crc32(kind + body) & 0xffffffff == struct.unpack('>I', data[end - 4:end])[0], 'PNG CRC')
        if kind == b'IHDR':
            require(pos == 8 and header is None and n == 13, 'PNG IHDR')
            header = struct.unpack('>IIBBBBB', body)
        elif kind == b'IDAT':
            parts.append(body)
        elif kind == b'IEND':
            require(n == 0 and end == len(data), 'PNG IEND')
            ended = True
        pos = end
        if ended:
            break
    require(ended and header and parts, 'Incomplete PNG')
    w, h, depth, color, comp, filt, interlace = header
    require(0 < w <= 4096 and 0 < h <= 4096 and (depth, color, comp, filt, interlace) == (8, 6, 0, 0, 0), 'PNG RGBA8')
    expected = (w * 4 + 1) * h
    dec = zlib.decompressobj()
    raw = dec.decompress(b''.join(parts), expected + 1)
    require(len(raw) == expected and dec.eof and not dec.unused_data, 'PNG decoded size')
    require(all(raw[y * (w * 4 + 1)] <= 4 for y in range(h)), 'PNG row filter')
    return [w, h]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Unexpected media redirect')


def acquire(row, source_dir):
    i, uid, name, filename, media, count, digest, blob, note = row
    require(type(i) is int and 21 <= i <= 30, 'Out-of-scope number')
    require(re.fullmatch(r'[a-z0-9_]+', uid) and re.fullmatch(r'[a-f0-9-]{36}', media), 'Unsafe identifier')
    require(Path(filename).name == filename and '/' not in filename and '\\' not in filename, 'Unsafe source filename')
    path = HD / f'{i:02d}_{uid}__3q_left.png'
    if path.exists():
        data = path.read_bytes()
    elif source_dir:
        data = (source_dir / filename).read_bytes()
    else:
        with urllib.request.build_opener(NoRedirect).open(MEDIA + media + '.png', timeout=60) as response:
            require(response.status == 200, 'Media HTTP status')
            data = response.read(LIMIT + 1)
    require(len(data) == count and sha(data) == digest and git_sha(data) == blob, 'Native bytes changed: ' + uid)
    require(verify_png(data) == [1536, 1024], 'HD dimensions changed')
    entry = dict(index=i, catalogue_id=uid, name=name, path=str(path), bytes=count, sha256=digest,
        git_blob_sha1=blob, size=[1536, 1024], mode='RGBA', source_filename=filename,
        category='individual_hd', source='native individual generation in preceding conversation turn',
        source_upscaled=False, source_cropped_from_sheet=False, pixels_preserved=True,
        alpha_extrema_observed_locally=[0, 254], visual_review_note=note,
        status='individual_hd_source_requires_art_review', **FLAGS)
    return entry, data


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def build_documents(req, old, entries, catalogue):
    all_entries = old['entries'] + entries
    require(len(all_entries) == 97 and len({e['path'] for e in all_entries}) == 97, 'Collection paths')
    require(len({e['sha256'] for e in all_entries}) == 97, 'Duplicate images')
    require(sum(e['bytes'] for e in all_entries) == 122449259, 'Collection size')
    hd_indices = sorted(e['index'] for e in all_entries if e['category'] == 'individual_hd')
    require(hd_indices == list(range(1, 31)), 'Exact HD coverage 01-30 required')
    lot = dict(schema='yautja-mobility-lot3-hd/1', count=10, bytes=24349576, entries=entries,
        source_turn='preceding conversation; ten individual images, not newly generated in this turn',
        review='Native alpha and defects preserved; no certified 1:1 or runtime validation', **FLAGS)
    current = dict(schema='yautja-mobility-current-hd/1', previous_manifest=str(PREVIOUS),
        previous_manifest_sha256=sha(PREVIOUS.read_bytes()), png_count=97,
        groups={'individual_hd':30,'concept_low_resolution':50,'individual_trial':1,'collective_archive':16},
        unique_catalogue_subjects=50, catalogue_individual_hd_count=30,
        individual_hd_missing_catalogue_indices=list(range(31,51)), bytes=122449259,
        newly_imported_png_count=10, preserved_png_count=87, entries=all_entries,
        excluded_generation_outputs=req['excluded_generation_outputs'], **FLAGS)
    jobs=[]
    for i in range(31,51):
        item=catalogue[i-1]
        jobs.append(dict(index=i, catalogue_id=item['id'], name=item['name'], status='missing_individual_hd',
            reference_path=f"art-source/mobilite/vehicules-montures/v0.1/{i:02d}_{item['id']}__concept_3q_left.png",
            source_class=item['source_class'], silhouette=item['silhouette'], art_brief=item['art_brief'],
            requirements=['One full subject per native HD PNG; not a crop or enlargement of a collective sheet',
              'Transparent background without drawn checkerboard, labels, floor or decorative frame',
              'Preserve exact limb/wing count, equipment, silhouette and functions from this catalogue',
              'Keep unoccupied and occupied versions separate where applicable; no pilot for the drone',
              'Real limbs/contact points; no mirrored asymmetric equipment; review on light and dark backgrounds'],
            generated=False, runtime_integrated=False, human_art_validated=False))
    queue=dict(schema='yautja-mobility-remaining-hd/1', count=20, scope='Production specifications only; no generated images for 31-50 delivered by this pass', jobs=jobs)
    report='''# Mobilité — lot individuel HD 21–30, transfert effectué

**Dix PNG individuels natifs de 1536 × 1024 du tour précédent sont ajoutés à la PR.** Les sorties montrées précédemment étaient de vraies images individuelles mais n'avaient pas encore été envoyées. Ce lot conserve leurs octets, sans découpe de planche, agrandissement, retouche ou récompression.

## État réel

Le dossier contient maintenant **30 sujets de catalogue en HD, 01–30**, ainsi que les 50 concepts historiques, un essai et seize planches archivées : **97 PNG distincts, 122 449 259 octets**. Ce sont toujours les mêmes 50 véhicules/montures, pas 97 modèles. Les anciens manifestes restent des reçus historiques.

**Les sorties individuelles HD 31–50 restent manquantes.** Les nouvelles tentatives de cette passe ont renvoyé cinq planches collectives avec des sujets ou identifiants incorrects. Elles ne sont ni découpées pour simuler une livraison HD, ni importées, ni comptées. Les textes « complet » et « 1:1 » dessinés sur ces planches n'ont aucune valeur de validation. Leurs empreintes sont consignées dans le manifeste de reprise.

La demande de génération fidèle complète n'est donc pas terminée. [Les vingt jobs restants](REPRISE_HD_31_50.json) reprennent le catalogue existant, dont les six membres requis pour plusieurs montures et les quatre ailes de Razorwing; leur état reste `missing_individual_hd`.

## Fidélité et alpha

Les dix sujets sont revus visuellement comme images sources, mais pas validés humainement en jeu. Le canal alpha natif va de 0 à 254 : des halos, reflets, fumées ou effets incorporés restent à séparer/contrôler. Les sorties 21–30 ne deviennent pas certifiées 1:1 par ce transfert. Les réserves de silhouette, assise, orientation et détails sont consignées par image ci-dessous. Les références existantes Kenner/Viper/Badlands 01–03 ne sont pas corrigées dans cette passe.

Le projet conserve ses identifiants, rangs, compagnons, règles de recrutement, Warp et vaisseaux. Aucun code du jeu, sauvegarde, atlas validé ou accès n'est modifié. Aucun PNJ autonome n'est ajouté par l'import de ces véhicules. Pas de fusion ni de déploiement manuel.

## Vérifications exécutées

Empreintes SHA-256 et Git des dix fichiers comparées aux sources de la conversation, signatures/CRC PNG, dimensions RGBA8, décompression et filtres de ligne. Les 87 sources antérieures sont revérifiées et conservées à l'identique. Vérification de la couverture exacte HD 01–30, des 97 chemins et empreintes uniques, et de la seconde exécution idempotente. Ces contrôles de fichiers ne prouvent ni animation fluide, ni fidélité canonique, ni comportement moteur.

[Manifeste du lot](LOT3_HD_21_30_20261106.json) · [Inventaire consolidé actuel](ETAT_SPRITES_HD_20261106.json) · [Contrat visuel](PRODUCTION_VISUELLE.md).

| N° | Source individuelle HD | Réserve de revue |
|---|---|---|
'''
    for e in entries:
        report+=f"| {e['index']} | [{e['name']}](../../../{e['path']}) | {e['visual_review_note']} |\n"
    report+='\nLes drapeaux `runtime_integrated`, `canonical_1_to_1_certified` et `human_art_validated` restent `false`.\n'
    index='''# Mobilité — état actuel des sources individuelles

[Rapport actuel : 30 sujets HD disponibles, 20 encore manquants](../../docs/campagne/mobilite/LOT3_HD_21_30_20261106.md).

[Inventaire des 97 PNG](../../docs/campagne/mobilite/ETAT_SPRITES_HD_20261106.json) : 30 sources HD, 50 concepts historiques, un essai et 16 planches archivées. Les identifiants 01–50 sont inchangés. Les 97 fichiers ne sont pas 97 véhicules. Aucun import moteur ou certificat artistique 1:1 n'est revendiqué.

[Source HD 01–30](vehicules-montures/v0.2-individual-hd/) · [Travaux HD 31–50](../../docs/campagne/mobilite/REPRISE_HD_31_50.json).
'''
    docs={LOT:encoded(lot),CURRENT:encoded(current),QUEUE:encoded(queue),REPORT:report.encode(),INDEX:index.encode()}
    addition='\n\n<!-- mobility-lot3-hd-21-30:start -->\n## Complément : dix sources individuelles HD 21–30 envoyées\n\n[Rapport et liens des PNG](LOT3_HD_21_30_20261106.md) : 30 sujets HD 01–30 dans le dépôt, 97 PNG au total en conservant les archives. [Inventaire actuel](ETAT_SPRITES_HD_20261106.json). Les vingt sorties HD 31–50, les corrections 1:1, animations et intégration restent ouvertes. Les cinq nouvelles planches incorrectes sont exclues, pas comptées comme des sprites livrés.\n<!-- mobility-lot3-hd-21-30:end -->\n'
    for filename in ['README.md','PRODUCTION_VISUELLE.md']:
        path=DOC/filename
        text=path.read_text()
        if '<!-- mobility-lot3-hd-21-30:start -->' in text:
            require(addition in text,'Conflicting status paragraph')
        else:
            docs[path]=(text+addition).encode()
    return docs


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request-sha256',required=True)
    parser.add_argument('--source-dir',type=Path)
    parser.add_argument('--check-only',action='store_true')
    args=parser.parse_args()
    require(sha(REQUEST.read_bytes())==args.request_sha256,'Request fingerprint changed')
    req=json.loads(REQUEST.read_text());old=json.loads(PREVIOUS.read_text())
    require(req['schema']=='yautja-mobility-lot3-import/1','Request schema')
    require([r[0] for r in req['entries']]==list(range(21,31)),'Expected ordered IDs 21-30')
    require(len({r[1] for r in req['entries']})==10,'Duplicate catalogue IDs')
    catalogue=[]
    for p in sorted((DOC/'catalogue').glob('[0-9][0-9]-[0-9][0-9].json')):
        catalogue.extend(json.loads(p.read_text()))
    require(len(catalogue)==50 and len({c['id'] for c in catalogue})==50,'Catalogue changed')
    for row in req['entries']:
        require(catalogue[row[0]-1]['id']==row[1] and catalogue[row[0]-1]['name']==row[2],'Catalogue mapping mismatch')
    require(len(old['entries'])==87 and old['bytes']==98099683,'Historical manifest count')
    for e in old['entries']:
        path=Path(e['path'])
        require(path.is_relative_to(ART) and '..' not in path.parts,'Historical path out of scope')
        data=path.read_bytes()
        require(len(data)==e['bytes'] and sha(data)==e['sha256'] and verify_png(data)==e['size'],'Historical bytes mismatch')
    if args.check_only:
        require(all((HD/f'{r[0]:02d}_{r[1]}__3q_left.png').is_file() for r in req['entries']),'Missing imported PNG')
    with ThreadPoolExecutor(max_workers=4) as pool:
        acquired=list(pool.map(lambda row:acquire(row,args.source_dir),req['entries']))
    entries=[e for e,_ in acquired]
    require(sum(e['bytes'] for e in entries)==24349576,'Lot size')
    docs=build_documents(req,old,entries,catalogue)
    for path,data in docs.items():
        if path.exists() and path not in [DOC/'README.md',DOC/'PRODUCTION_VISUELLE.md']:
            require(path.read_bytes()==data,'Refusing different metadata overwrite: '+str(path))
    if args.check_only:
        require(all(p.is_file() and p.read_bytes()==b for p,b in docs.items()),'Readback documents mismatch')
        require(all('mobility-lot3-hd-21-30:start' in (DOC/p).read_text() for p in ['README.md','PRODUCTION_VISUELLE.md']),'Index links missing')
    else:
        for e,data in acquired:
            path=Path(e['path']);path.parent.mkdir(parents=True,exist_ok=True)
            if path.exists():require(path.read_bytes()==data,'PNG conflict')
            else:path.write_bytes(data)
        for path,data in docs.items():
            path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    current=json.loads(CURRENT.read_text())
    require(all(sha(Path(e['path']).read_bytes())==e['sha256'] for e in current['entries']),'Final source readback')
    print(json.dumps(dict(new_png=10,preserved_png=87,all_png=97,hd_subjects=30,missing_hd=list(range(31,51)),
        png_bytes=122449259,manifest_sha256=sha(CURRENT.read_bytes()),check_only=args.check_only,**FLAGS)))


if __name__=='__main__':
    main()
