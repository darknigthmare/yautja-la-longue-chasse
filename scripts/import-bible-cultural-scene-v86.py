"""Extract one approved V6 scene without executing formulas or changing sources."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SCENE_ID = 'D6-W-CULT-25'
SOURCE_SHA = '87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183'


def extract_scene(document, corpus_bytes):
    if document.get('schemaVersion') != 1 or document.get('source', {}).get('sha256') != SOURCE_SHA:
        raise ValueError('Expected the approved Bible V6 source, no substitute workbook.')
    result = []
    for sheet in document['sheets']:
        if sheet['name'] not in ('Scènes de dialogue V6', 'Répliques V6', 'Choix et actions V6', 'Variantes V6', 'Réactions et gestes V6'):
            continue
        rows = [row for row in sheet['rows'] if row['number'] > 5
                and any(str(cell['value']) == SCENE_ID or str(cell['value']).startswith(SCENE_ID + '-') for cell in row['cells'])]
        if rows:
            result.append({'name': sheet['name'], 'rows': rows})
    counts = {sheet['name']: len(sheet['rows']) for sheet in result}
    if counts != {'Scènes de dialogue V6': 1, 'Répliques V6': 8, 'Choix et actions V6': 2}:
        raise ValueError('Scene source changed: inspect its new rows before replacing the runtime extraction.')
    return {'schemaVersion': 1, 'source': document['source'], 'sourceCorpusSha256': hashlib.sha256(corpus_bytes).hexdigest(),
            'sceneId': SCENE_ID, 'sheets': result}


if __name__ == '__main__':
    original = ROOT / 'public/game/dialogues/v85/bible-dialogues.json'
    corpus = original.read_bytes()
    result = extract_scene(json.loads(corpus), corpus)
    target = ROOT / 'app/game/data/bibleSceneCulturalV86.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Exact V6 scene extraction:', target)
