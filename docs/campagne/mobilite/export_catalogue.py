#!/usr/bin/env python3
"""Validate and export the editorial catalogue. Standard library; no game imports/network."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
STATS = ('speed', 'acceleration', 'handling', 'armor', 'offense', 'traversal', 'stealth', 'cargo')
TEXT_FIELDS = ('id', 'name', 'family', 'source_class', 'crew', 'dimensions', 'silhouette', 'role', 'acquisition', 'art_brief')
LIST_FIELDS = ('abilities', 'weapons', 'biomes', 'level_design_gates', 'weaknesses', 'unique_animations', 'mission_hooks', 'tags')
NOTICE = ('Conception uniquement. Lire README.md et ses arbitrages avant utilisation. '
          'Le catalogue historique ne certifie ni canon, ni licence, ni jouabilité. '
          'Export de production interne, pas registre de personnages connus du joueur.')


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding='utf-8'))


def validate(root: Path = ROOT) -> tuple[dict, list[dict]]:
    manifest = read_json(root / 'MANIFEST.json')
    metadata = read_json(root / 'catalogue/metadata.json')
    if metadata.get('runtime_enabled') is not False or metadata.get('production_status') != 'design-only':
        raise ValueError('Le catalogue doit rester documentaire et désactivé.')
    items: list[dict] = []
    seen: set[str] = set()
    for block in manifest['catalogue_blocks']:
        path = (root / block['path']).resolve()
        if not path.is_relative_to(root.resolve()):
            raise ValueError('Chemin de catalogue hors du dossier.')
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != block['sha256']:
            raise ValueError(f'Empreinte incorrecte : {block["path"]}')
        values = json.loads(raw)
        if not isinstance(values, list) or len(values) != block['count']:
            raise ValueError(f'Nombre incorrect : {block["path"]}')
        for item in values:
            if not isinstance(item, dict):
                raise ValueError('Une fiche doit être un objet.')
            for key in TEXT_FIELDS:
                if not isinstance(item.get(key), str) or not item[key].strip():
                    raise ValueError(f'{item.get("id", "?")}.{key} doit être un texte non vide.')
            identifier = item['id']
            if not re.fullmatch(r'[a-z][a-z0-9_]*', identifier) or identifier in seen:
                raise ValueError(f'Identifiant invalide ou dupliqué : {identifier}')
            seen.add(identifier)
            if type(item.get('tier')) is not int or not 1 <= item['tier'] <= 5:
                raise ValueError(f'{identifier}.tier invalide.')
            for key in LIST_FIELDS:
                value = item.get(key)
                if not isinstance(value, list) or not value or not all(isinstance(v, str) and v.strip() for v in value):
                    raise ValueError(f'{identifier}.{key} doit être une liste de textes.')
            if not isinstance(item.get('stats'), dict) or set(item['stats']) != set(STATS):
                raise ValueError(f'{identifier}.stats : huit axes requis.')
            for key, value in item['stats'].items():
                lower = 0 if key == 'offense' else 1
                if type(value) is not int or not lower <= value <= 10:
                    raise ValueError(f'{identifier}.stats.{key} hors bornes.')
            if item['stats']['offense'] == 0 and item['weapons'] != ['Aucune']:
                raise ValueError(f'{identifier} : offense 0 exige absence explicite d’armement.')
        items.extend(values)
    if len(items) != manifest['expected_count'] or len(seen) != 50:
        raise ValueError('Le catalogue doit contenir 50 identifiants uniques.')
    canonical = json.dumps(items, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
    if hashlib.sha256(canonical).hexdigest() != manifest['semantic_items_sha256']:
        raise ValueError('Les données ne correspondent plus au pack de référence.')
    packs = metadata.get('base_animation_packs', {})
    if set(packs) != {'technology', 'mounts'} or not all(packs.values()):
        raise ValueError('Les deux socles d’animations doivent être conservés.')
    return metadata, items


def export(out: Path, metadata: dict, items: list[dict]) -> None:
    out = out.resolve()
    if out == ROOT or out.is_relative_to(ROOT) or ROOT.is_relative_to(out):
        raise ValueError('Choisir un dossier de sortie séparé des sources, par exemple /tmp/yautja-mobilite.')
    out.mkdir(parents=True, exist_ok=True)
    payload = dict(metadata, items=items, usage_notice=NOTICE)
    (out / 'yautja_mobility_catalog_v1.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    bible = ['# Véhicules et montures — 50 fiches', '', NOTICE, '']
    prompts = ['# Prompts visuels — 50 dossiers de production', '', NOTICE,
               'Appliquer aussi PRODUCTION_VISUELLE.md ; une vue par asset, sujet entier, pilote cohérent, aucune typographie.', '']
    for family, clips in metadata['base_animation_packs'].items():
        bible += [f'## Animations communes : {family}', '', '; '.join(clips), '']
    for number, item in enumerate(items, 1):
        bible += [f'## {number:02d}. {item["name"]}', '', f'Identifiant : `{item["id"]}`', '']
        for key, value in item.items():
            if key == 'id':
                continue
            text = '; '.join(value) if isinstance(value, list) else json.dumps(value, ensure_ascii=False) if isinstance(value, dict) else str(value)
            bible += [f'**{key} :** {text}', '']
        prompts += [f'## {number:02d}. {item["name"]} — `{item["id"]}`', '',
                    f'Concevoir {item["name"]} pour Yautja : La Longue Chasse. {item["art_brief"]} '
                    f'Silhouette : {item["silhouette"]} Dimensions proposées : {item["dimensions"]}. '
                    f'Rôle : {item["role"]} Équipage : {item["crew"]}. '
                    f'Capacités à rendre lisibles : {" ; ".join(item["abilities"])}. '
                    f'Animations propres à préparer séparément : {" ; ".join(item["unique_animations"])}. '
                    'Éclairage neutre de production, sujet non coupé, vues séparées, fond transparent, '
                    'sans texte, logo, interface ou décor narratif. Références à valider selon README.md.', '']
    (out / 'BIBLE_PRODUCTION_50_VEHICULES_MONTURES.md').write_text('\n'.join(bible), encoding='utf-8')
    (out / 'prompts_images_50_vehicules_montures.md').write_text('\n'.join(prompts), encoding='utf-8')
    with (out / 'index_50_mobility.csv').open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.writer(handle, delimiter=';')
        writer.writerow(['No', 'ID', 'Nom', 'Famille', 'Source', 'Tier', *STATS, 'Obtention', 'Statut'])
        for number, item in enumerate(items, 1):
            writer.writerow([number, item['id'], item['name'], item['family'], item['source_class'], item['tier'],
                             *(item['stats'][key] for key in STATS), item['acquisition'], 'proposé — non implémenté'])
    for name in ('README.md', 'PROMPT_CODEX.md', 'PRODUCTION_VISUELLE.md', 'MANIFEST.json'):
        (out / name).write_bytes((ROOT / name).read_bytes())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, help='Exporter dans un dossier séparé ; sans cette option, vérifier seulement.')
    args = parser.parse_args()
    try:
        metadata, items = validate()
        if args.out:
            export(args.out, metadata, items)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f'Erreur de validation/export : {error}\n')
    print(f'OK : {len(items)} fiches uniques, 5 blocs intacts, empreinte sémantique conservée. Aucun test de gameplay.')


if __name__ == '__main__':
    main()
