#!/usr/bin/env python3
"""Conserve eleven previously generated native PNGs; never certify art or modify runtime."""
from __future__ import annotations
import argparse
import concurrent.futures
import importlib.util
import json
import re
import urllib.request
from pathlib import Path

DOC = Path('docs/campagne/mobilite')
ART = Path('art-source/mobilite')
REQUEST = DOC / 'IMPORT_HD_SUITE_20261106.json'
MANIFEST = DOC / 'LIVRAISON_HD_SUITE_20261106.json'
REPORT = DOC / 'LIVRAISON_HD_SUITE_20261106.md'
INDEX = ART / 'INDEX_HD_SUITE_20261106.md'
HOST = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3JHwJlNzgmcxQy32tjF7NiVZPuH/'
FLAGS = dict(runtime_integrated=False, canonical_1_to_1_certified=False, human_art_validated=False)
EXPECTED_KEYS = set(range(21, 31)) | {'A02'}


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def helper():
    spec = importlib.util.spec_from_file_location('mobility_source_verifier', DOC / 'import_all_sources_20261106.py')
    require(spec is not None and spec.loader is not None, 'Missing existing PNG verifier')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Unexpected redirect; source import stopped')


def load_inputs(verifier):
    request = json.loads(REQUEST.read_text())
    require(request['schema'] == 'yautja-mobility-hd-followup/1', 'Unknown schema')
    require(request['base_commit'] == 'cb2f7647ee1c2a1d9cef417d25145431b75d001a', 'Unexpected base')
    require(request['previous_manifest'] == str(DOC / 'DEPOT_COMPLET_SPRITES_20261106.json'), 'Unexpected prior manifest')
    old_bytes = Path(request['previous_manifest']).read_bytes()
    require(verifier.sha(old_bytes) == request['previous_manifest_sha256'], 'Historical manifest changed')
    previous = json.loads(old_bytes)['entries']
    require(len(previous) == 87, 'Expected 87 historical PNG sources')
    for e in previous:
        path = Path(e['path'])
        require(path.is_relative_to(ART) and '..' not in path.parts, 'Unsafe historical path')
        data = path.read_bytes()
        require(verifier.sha(data) == e['sha256'], 'Historical PNG changed: ' + str(path))
        require(verifier.verify_png(data) == e['size'], 'Historical dimensions changed')
        require(verifier.git_sha(data) == e['git_blob_sha1'], 'Historical Git hash changed')
    catalogue = []
    for name in ('01-10.json', '11-20.json', '21-30.json', '31-40.json', '41-50.json'):
        catalogue.extend(json.loads((DOC / 'catalogue' / name).read_text()))
    require(len(catalogue) == 50 and len({e['id'] for e in catalogue}) == 50, 'Catalogue ID contract changed')
    rows = request['rows']
    require(len(rows) == 11 and {r[0] for r in rows} == EXPECTED_KEYS, 'Expected ten catalogue sources and one archived trial')
    require(len({r[3] for r in rows}) == 11, 'Duplicate native source')
    require(sum(r[4] for r in rows) == request['new_png_bytes'] == 26746681, 'Expected bytes changed')
    for key, uid, media, digest, size, note in rows:
        require(re.fullmatch(r'[a-z0-9_]+', uid) is not None, 'Unsafe catalogue ID')
        require(re.fullmatch(r'[0-9a-f-]{36}', media) is not None, 'Unsafe media ID')
        require(re.fullmatch(r'[0-9a-f]{64}', digest) is not None, 'Invalid SHA256')
        require(0 < size < 8 * 1024 * 1024, 'Invalid source size')
        if type(key) is int:
            require(catalogue[key - 1]['id'] == uid, 'Catalogue order/identity mismatch')
    return request, previous, catalogue


def acquire(row, catalogue, verifier, check_only):
    key, uid, media, digest, size, note = row
    numbered = type(key) is int
    path = ART / ('vehicules-montures/v0.2-individual-hd/' + f'{key:02d}_{uid}__3q_left.png' if numbered else 'essais-individuels/02_blade_fighter__essai_non_retenu.png')
    if path.exists():
        data = path.read_bytes()
    else:
        require(not check_only, 'Missing committed PNG: ' + str(path))
        with urllib.request.build_opener(NoRedirect).open(HOST + media + '.png', timeout=60) as response:
            require(response.status == 200, 'Download failed')
            data = response.read(size + 1)
    require(len(data) == size and verifier.sha(data) == digest, 'Source bytes differ: ' + str(path))
    require(verifier.verify_png(data) == [1536, 1024], 'Native dimensions/format differ')
    entry = dict(index=key if numbered else None, catalogue_id=uid,
        name=catalogue[key - 1]['name'] if numbered else 'Dernier essai Blade Fighter non retenu',
        path=str(path), bytes=size, sha256=digest, git_blob_sha1=verifier.git_sha(data),
        size=[1536, 1024], mode='RGBA', alpha_extrema_observed_locally=[0, 254],
        category='individual_hd' if numbered else 'individual_trial',
        source='image_gen — génération individuelle d’un tour précédent de la conversation',
        regenerated_in_this_turn=False, source_cropped_from_sheet=False, source_upscaled=False,
        pixels_preserved=True, visual_review_note=note,
        status='individual_hd_source_requires_art_review' if numbered else 'archived_nonconforming_trial', **FLAGS)
    return entry, data


def documents(request, previous, added, verifier):
    entries = previous + added
    require(len(entries) == len({e['path'] for e in entries}) == len({e['sha256'] for e in entries}) == 98, 'Inventory collision')
    manifest = dict(schema='yautja-mobility-hd-followup-delivery/1', base_commit=request['base_commit'],
        png_count=98, catalogue_subjects=50, catalogue_individual_hd_count=30,
        groups=dict(individual_hd=30, concept_low_resolution=50, individual_trial=2, collective_archive=16),
        new_png_count=11, preserved_png_count=87, new_png_bytes=26746681,
        total_png_bytes=sum(e['bytes'] for e in entries),
        individual_hd_missing_catalogue_indices=list(range(31, 51)),
        new_generation_attempts='Nonconforming collective outputs excluded; no new individual subject 31–50 claimed.',
        entries=entries, **FLAGS)
    report = '''# Mobilité — complément individuel HD après fusion de la PR 116

## Livraison réelle

**Dix PNG natifs individuels 21–30, déjà générés dans la conversation mais non envoyés, sont maintenant conservés.** Chaque source fait 1536 × 1024. La dernière image individuelle du Blade Fighter est archivée séparément : sa silhouette ne correspond pas à la référence Kenner et elle ne remplace aucun asset.

La PR 116 est fusionnée ; cet ajout utilise une branche de complément basée sur `cb2f7647ee1c2a1d9cef417d25145431b75d001a`. Les 87 anciens PNG sont contrôlés et conservés sans modification. Cette livraison ajoute 11 PNG / 26 746 681 octets. Le total devient **98 PNG : 30 sources individuelles HD de catalogue, 50 petits concepts, deux essais non retenus et 16 planches historiques**. Il y a toujours 50 sujets de catalogue, pas 98 véhicules.

## Génération et fidélité

La demande de poursuivre via `image_gen` a été exécutée, mais les nouvelles tentatives ont encore renvoyé des compositions collectives non conformes. Elles sont exclues de cette livraison : aucune découpe ou interpolation n'est présentée comme une nouvelle génération HD individuelle. Les inscriptions « 1:1 », « complet » ou « livré » dessinées dans ces compositions ne valent aucune attestation.

**31–50 restent sans nouvelle sortie individuelle HD acceptée.** Les dix images 21–30 sont des sources exploitables pour la revue, pas une certification canonique 1:1. La plupart sont des concepts originaux du jeu ; l'orbe reste une inspiration Badlands à confronter aux références primaires. Leurs halos alpha, états, vues utiles, postes de pilotage et effets séparés restent à traiter. Aucun sprite de PNJ autonome n'a été trouvé dans ces onze fichiers : aucun personnage n'est inventé pour gonfler le bilan.

## PNG ajoutés et observations

| N° | Source individuelle native | Observation à conserver |
|---|---|---|
'''
    for e in added:
        report += f"| {e['index'] or 'Essai'} | [{e['name']}](../../../{e['path']}) | {e['visual_review_note']} |\n"
    report += '''
## Contrôles de source

Le vérificateur PNG existant est réutilisé : signatures, CRC, dimensions RGBA8, décompression et filtres des lignes. Les empreintes SHA-256 des fichiers de conversation sont fixées avant transfert ; les SHA Git sont calculés pour la relecture du dépôt. Un second passage sans écriture vérifie l'idempotence. Les observations d'alpha locales indiquent 0–254 : conserver le canal ne signifie pas un détourage prêt pour le moteur.

[Manifeste consolidé](LIVRAISON_HD_SUITE_20261106.json) · [Production visuelle](PRODUCTION_VISUELLE.md) · [Réception historique des 87 PNG](DEPOT_COMPLET_SPRITES_20261106.md).

Aucun runtime, sauvegarde, rang, recrutement, progression, accès ou atlas validé n'est modifié. Ni build du jeu, ni parcours navigateur, ni revue artistique humaine ne sont revendiqués. Pas de fusion ou déploiement automatique. Le catalogue 01–50 garde ses identifiants.
'''
    index = '# Mobilité — complément HD individuel\n\n[30 sujets HD disponibles, dix ajouts et limites](../../docs/campagne/mobilite/LIVRAISON_HD_SUITE_20261106.md).\n\n[Manifeste consolidé des 98 PNG](../../docs/campagne/mobilite/LIVRAISON_HD_SUITE_20261106.json). Les index antérieurs sont des reçus historiques. Les entrées 31–50 et la validation 1:1 restent ouvertes.\n'
    return {MANIFEST: (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode(), REPORT: report.encode(), INDEX: index.encode()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    verifier = helper()
    request, previous, catalogue = load_inputs(verifier)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        acquired = list(pool.map(lambda r: acquire(r, catalogue, verifier, args.check_only), request['rows']))
    added = [e for e, _ in acquired]
    outputs = documents(request, previous, added, verifier)
    outputs.update({Path(e['path']): data for e, data in acquired})
    require(len(outputs) == 14, 'Unexpected output count')
    # Check every conflict before writing any file.
    for path, data in outputs.items():
        if path.exists():
            require(path.read_bytes() == data, 'Refusing to overwrite: ' + str(path))
        else:
            require(not args.check_only, 'Missing output: ' + str(path))
    if not args.check_only:
        for path, data in outputs.items():
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
    require(all(path.read_bytes() == data for path, data in outputs.items()), 'Readback failed')
    print(json.dumps(dict(added_png=11, preserved_png=87, total_png=98, hd_subjects=30,
        added_bytes=26746681, output_files=14, check_only=args.check_only,
        manifest_sha256=verifier.sha(MANIFEST.read_bytes()), **FLAGS)))


if __name__ == '__main__':
    main()
