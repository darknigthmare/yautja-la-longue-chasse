#!/usr/bin/env python3
"""Import the ten native individual images 31-40 without changing existing art."""
from __future__ import annotations
import argparse
import concurrent.futures
import importlib.util
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

DOC = Path('docs/campagne/mobilite')
ART = Path('art-source/mobilite')
HD = ART / 'vehicules-montures/v0.2-individual-hd'
OLD = DOC / 'LIVRAISON_HD_SUITE_20261106.json'
MANIFEST = DOC / 'LIVRAISON_HD_31_40_20261106.json'
REPORT = DOC / 'LIVRAISON_HD_31_40_20261106.md'
INDEX = ART / 'INDEX_HD_31_40_20261106.md'
HOST = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3JHwJlNzgmcxQy32tjF7NiVZPuH/'
BASE = 'e1dd24c3bbd20bf0d536de856c8829aa9627a265'
FLAGS = dict(runtime_integrated=False, canonical_1_to_1_certified=False, human_art_validated=False)
ROWS = [
(31,'enforcer_prison_skiff','f09daced-b0ed-47e6-bbfc-a9353793b285','e7bcdab1e00d5ecece898d3d6fb9ec8b9dd1ed8ecdc3c15f79a34ef695e8802f',2377444,'Six capsules visibles ; equipage absent. Sas, tourelle et dimensions interieures a verifier dans les autres vues.'),
(32,'arbiter_command_chariot','45653d73-a1c8-488e-9960-d649e5c12e49','3e880802fdf9492f11151ad334d85a9f1745ff5884ed2ed6d44ba24ae92a286a',2527212,'Plateforme, trone et boucliers visibles. Version vide : Arbitre et deux gardes non produits par cette image.'),
(33,'tracker_drone_sled','97b324b7-2102-4426-a240-9872822f5161','f018c09a129cf9f0874ef15112291a3ef47ada227f06b9a86c5ab70e8d92e64b',2205505,'Drone sans pilote. Projecteur rouge inclus dans les pixels ; VFX separe et etat pinces repliees restent a produire.'),
(34,'barrier_carrier','035f7543-2f36-4c28-91ed-5c698b8eddcc','c3f8dd96d25bb7c21518705f50c826cc3e56ed3f28b4d64f286e61fafc7d5b8e',2547613,'Trois structures dorsales visibles. Arches completes, repli et deploiement non demontres ; projecteur rouge au lieu du blanc prevu.'),
(35,'kha_rha','a30cd26a-8b68-4838-b699-ac8837025111','d28942498b701a72ff56fbfafb6957f420e70ab4d6b67fc105a75cbb201e6381',2588862,'Quadrupede selle sans cavalier. Plaques et filaments visibles ; gabarit, attaches et contacts a tester en jeu.'),
(36,'war_kha_rha','48ebd620-69e0-4f9f-baa1-4bc46e6120d6','32d270f3fec9fb69beb787cd27f7702c667589291d41e1ce29ed18ddecae0b11',2793940,'Monture lourde cornee et cuirassee, sans cavalier. Articulations sous armure et silhouette en mouvement non testees.'),
(37,'forest_stalker_mount','9e582dcd-ca51-493a-b2de-f4ff679d03be','5e5a93a837378d1a97ca221afe91e693863b6a33decdaa5e1e6d228dbb45979d',2392947,'Queue prehensile et plusieurs appuis visibles. Les six membres et leur raccord anatomique doivent etre controles dans des vues complementaires.'),
(38,'sand_mauler','4e9df023-dd5e-4d80-b398-d6954bc5333a','98dec4e3bfabc04f2ebdcb8e2e008f8ff40c0b67c3e41e221e73a7a1d36c62bd',2850112,'Six appuis apparents ; voiles dorsales et museau effile different des voiles laterales et de la tete en pelle prevues.'),
(39,'stoneback','17b51675-485e-40ff-997d-56ef1ca50306','225c494c7273afb1ada426a5f49f66d3681f03afc80d779992ce5f390ea98c69',3108885,'Dos mineral et harnais de charge visibles. Corne pointue au lieu de la corne plate en belier du brief ; cavalier absent.'),
(40,'ice_fang','6ba4e8bc-9dba-4f55-b311-73061f5641a0','5d33ad71ca0991fcafb33100992257c0012bde4736186d5f4a02f151c4d6a0bc',2774986,'Fourrure blanche, crocs translucides et petits stabilisateurs visibles. Raccord des six membres, appuis et souffle a verifier en mouvement.')
]


def require(ok, message):
    if not ok:
        raise ValueError(message)


def helper():
    spec = importlib.util.spec_from_file_location('mobility_png_verifier', DOC / 'import_all_sources_20261106.py')
    require(spec is not None and spec.loader is not None, 'Existing PNG verifier missing')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Unexpected source redirect')


def acquire(row, catalogue, verifier, check_only):
    number, uid, media, digest, size, note = row
    require(catalogue[number-1]['id'] == uid, 'Catalogue identity changed')
    path = HD / f'{number:02d}_{uid}__3q_left.png'
    if path.exists():
        data = path.read_bytes()
    else:
        require(not check_only, 'Missing committed PNG: ' + str(path))
        with urllib.request.build_opener(NoRedirect).open(HOST + media + '.png', timeout=60) as response:
            require(response.status == 200, 'Download failed')
            data = response.read(size + 1)
    require(len(data) == size and verifier.sha(data) == digest, 'Native file mismatch: ' + uid)
    require(verifier.verify_png(data) == [1536,1024], 'Invalid native PNG: ' + uid)
    entry = dict(index=number, catalogue_id=uid, name=catalogue[number-1]['name'],
        path=str(path), bytes=size, sha256=digest, git_blob_sha1=verifier.git_sha(data),
        size=[1536,1024], mode='RGBA', category='individual_hd',
        source='image_gen - individual output from the immediately preceding conversation turn',
        pixels_preserved=True, source_upscaled=False, source_cropped_from_sheet=False,
        alpha_extrema_observed_locally=[0,254], visual_review_note=note,
        status='individual_hd_source_requires_art_review', **FLAGS)
    return entry, data


def documents(previous, added, old_sha):
    entries = previous + added
    require(len(entries) == len({e['path'] for e in entries}) == len({e['sha256'] for e in entries}) == 108, 'Inventory collision')
    groups = dict(individual_hd=40, concept_low_resolution=50, individual_trial=2, collective_archive=16)
    for group,count in groups.items():
        require(sum(e['category'] == group for e in entries) == count, 'Incorrect category count')
    manifest = dict(schema='yautja-mobility-hd-31-40/1', baseline_commit=BASE,
        previous_manifest=str(OLD), previous_manifest_sha256=old_sha,
        png_count=108, catalogue_subjects=50, catalogue_individual_hd_count=40,
        new_png_count=10, preserved_png_count=98, new_png_bytes=26167506,
        total_png_bytes=sum(e['bytes'] for e in entries), groups=groups,
        individual_hd_missing_catalogue_indices=list(range(41,51)),
        scope='Transfer only: ten existing image_gen individual outputs, no new generation or runtime integration.',
        entries=entries, **FLAGS)
    report = '''# Mobilité — réception des dix PNG individuels 31–40

Les dix images générées individuellement au tour précédent avec **image_gen** sont conservées à l’octet près dans la PR de complément. **Un seul véhicule ou une seule monture par fichier**, format natif **1536 × 1024 RGBA**. Aucune planche collective n’est découpée ou ajoutée par cette passe ; aucun agrandissement ni retouche.

## Inventaire actuel

**40 sujets de catalogue disposent désormais d’une source individuelle HD (01–40).** Le total est de **108 PNG** : 40 sources HD, 50 petits concepts historiques, deux essais non retenus et seize planches historiques. Il y a toujours 50 sujets, pas 108 véhicules. Les **98 PNG antérieurs sont préservés** ; les dix ajouts représentent **26 167 506 octets**.

Les reçus précédents restent datés et inchangés. Leur mention « 31–50 ouverts » décrit l’état antérieur ; **41–50 restent à générer individuellement en HD**. Aucune animation supplémentaire n’est livrée par cet import.

## Sources ajoutées

| N° | PNG individuel natif | Réserve de production |
|---|---|---|
'''
    for e in added:
        report += f"| {e['index']} | [{e['name']}](../../../{e['path']}) | {e['visual_review_note']} |\n"
    report += '''
## Fidélité et intégration

Ces sujets sont des créations originales du catalogue : leur conformité au brief se distingue d’une certification canonique. Les écarts visibles sont conservés dans la colonne ci-dessus. Les véhicules sont vides et les montures sans cavalier ; ce lot ne contient pas de sprites de gardes ou de PNJ autonomes. Aucun équipage, recrutement, rang ou droit d’accès n’est activé par ces images.

L’alpha natif observé s’étend de 0 à 254. Il est conservé, avec les éventuels halos et effets lumineux. Les sources demandent une revue des contours, de l’anatomie, des échelles et des variantes en contexte moteur. `runtime_integrated`, `canonical_1_to_1_certified` et `human_art_validated` restent `false`.

## Vérifications de conservation

Le vérificateur existant contrôle signatures PNG, CRC, décompression, filtres de lignes et dimensions. Chaque nouvel original est figé par SHA-256 avant transfert ; son empreinte Git est enregistrée. Le contrôle historique `import_hd_suite_20261106.py --check-only` protège les 98 fichiers et leurs reçus antérieurs. Le présent script contrôle 108 chemins et empreintes uniques, relit les fichiers écrits et vérifie une deuxième exécution sans modification.

[Manifeste consolidé des 108 PNG](LIVRAISON_HD_31_40_20261106.json) · [Reçu précédent 21–30](LIVRAISON_HD_SUITE_20261106.md) · [Catalogue](INDEX.md) · [Production visuelle](PRODUCTION_VISUELLE.md).

Périmètre : sources graphiques, inventaire et import contrôlé uniquement. Aucun runtime, sauvegarde, dépendance ou atlas validé n’est modifié. Aucun build, parcours navigateur, certification artistique humaine, fusion ou déploiement manuel n’est revendiqué.
'''
    index = '# Mobilité — sources individuelles HD 01–40\n\n[Réception des dix PNG 31–40 et réserves de production](../../docs/campagne/mobilite/LIVRAISON_HD_31_40_20261106.md).\n\n[Inventaire consolidé des 108 PNG](../../docs/campagne/mobilite/LIVRAISON_HD_31_40_20261106.json). Les index précédents restent historiques. Les sujets 41–50, les autres vues, animations et validations restent ouverts.\n'
    return {MANIFEST:(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode(),REPORT:report.encode(),INDEX:index.encode()}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-only',action='store_true')
    args=parser.parse_args()
    verifier=helper()
    # The previous checker protects all earlier sources and receipts, without writes.
    subprocess.run([sys.executable,str(DOC/'import_hd_suite_20261106.py'),'--check-only'],check=True)
    old_data=OLD.read_bytes(); previous=json.loads(old_data)['entries']
    require(len(previous)==98,'Expected 98 historical PNGs')
    require([r[0] for r in ROWS]==list(range(31,41)) and sum(r[4] for r in ROWS)==26167506,'Source list changed')
    catalogue=[]
    for name in ('01-10.json','11-20.json','21-30.json','31-40.json','41-50.json'):
        catalogue.extend(json.loads((DOC/'catalogue'/name).read_text()))
    require(len(catalogue)==50 and len({e['id'] for e in catalogue})==50,'Catalogue contract changed')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        acquired=list(pool.map(lambda r:acquire(r,catalogue,verifier,args.check_only),ROWS))
    added=[e for e,_ in acquired]
    outputs=documents(previous,added,verifier.sha(old_data))
    outputs.update({Path(e['path']):data for e,data in acquired})
    require(len(outputs)==13,'Unexpected output boundary')
    for path,data in outputs.items():
        if path.exists():
            require(path.read_bytes()==data,'Refusing overwrite: '+str(path))
        else:
            require(not args.check_only,'Missing output: '+str(path))
    if not args.check_only:
        for path,data in outputs.items():
            if not path.exists():
                path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(data)
    require(all(path.read_bytes()==data for path,data in outputs.items()),'Readback mismatch')
    print(json.dumps(dict(added_png=10,preserved_png=98,total_png=108,hd_subjects=40,
        added_bytes=26167506,total_bytes=sum(e['bytes'] for e in previous+added),output_files=13,
        check_only=args.check_only,manifest_sha256=verifier.sha(MANIFEST.read_bytes()),**FLAGS)))


if __name__=='__main__':
    main()
