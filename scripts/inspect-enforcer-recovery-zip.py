"""Read-only ZIP evidence for the Enforcers recovery audit."""
import hashlib
import json
import stat
import sys
import zipfile

CHECKPOINT_SCHEMA = 'yautja-v613-native-checkpoint-1'
MAX_JSON_BYTES = 8 * 1024 * 1024


def inspect_zip(path, targets):
    by_size = {}
    for target in targets:
        group = by_size.setdefault(target['bytes'], {})
        group.setdefault(target['sha256'], []).append(target['id'])

    original_images = []
    checkpoints = []
    oversized_json = []
    with zipfile.ZipFile(path) as archive:
        seen = set()
        for entry in sorted(archive.infolist(), key=lambda item: item.filename):
            mode = stat.S_IFMT(entry.external_attr >> 16) if entry.create_system == 3 else 0
            if entry.is_dir() or mode not in (0, stat.S_IFREG):
                continue
            name = entry.filename
            if name in seen:
                raise ValueError('Duplicate ZIP entry: ' + name)
            seen.add(name)

            expected = by_size.get(entry.file_size)
            json_entry = name.lower().endswith('.json')
            if json_entry and entry.file_size > MAX_JSON_BYTES:
                oversized_json.append(name)
                json_entry = False
            if not expected and not json_entry:
                continue

            with archive.open(entry) as stream:
                payload = stream.read(entry.file_size + 1)
            if len(payload) != entry.file_size:
                raise ValueError('Wrong ZIP entry length: ' + name)
            digest = hashlib.sha256(payload).hexdigest()
            for target_id in (expected or {}).get(digest, []):
                original_images.append({
                    'id': target_id, 'path': name, 'bytes': len(payload), 'sha256': digest,
                })
            if json_entry:
                try:
                    document = json.loads(payload)
                except (ValueError, UnicodeError):
                    continue
                if isinstance(document, dict) and document.get('schemaVersion') == CHECKPOINT_SCHEMA:
                    checkpoints.append({
                        'path': name, 'checkpointSha256': digest, 'document': document,
                    })

    return {
        'originalImages': original_images,
        'checkpoints': checkpoints,
        'oversizedJson': oversized_json,
    }


if __name__ == '__main__':
    json.dump(inspect_zip(sys.argv[1], json.load(sys.stdin)), sys.stdout, ensure_ascii=True)
