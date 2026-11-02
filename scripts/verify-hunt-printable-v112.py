#!/usr/bin/env python3
"""Independent PDF check against the unchanged source JSON; requires PyMuPDF."""
import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote

import fitz


class HtmlNode:
    def __init__(self, tag, attrs=None, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs or []), parent, []

    def text(self):
        return ''.join(child if isinstance(child, str) else child.text() for child in self.children)

    def nodes(self):
        yield self
        for child in self.children:
            if isinstance(child, HtmlNode):
                yield from child.nodes()


class PrintableHtmlParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = HtmlNode('document')
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = HtmlNode(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def check_html_fields(container, columns, row):
    failures = []
    for column in columns:
        matches = [node for node in container.nodes() if node.attrs.get('data-key') == column['key']]
        if len(matches) != 1:
            failures.append(column['key'] + ': expected one field block')
            continue
        labels = [node for node in matches[0].nodes() if node.tag == 'dt']
        values = [node for node in matches[0].nodes() if node.tag == 'dd']
        if len(labels) != 1 or labels[0].text() != column['label']:
            failures.append(column['key'] + ': field label differs')
        if len(values) != 1 or values[0].text() != str(row.get(column['key'], '')):
            failures.append(column['key'] + ': exact field value differs')
    return failures


def compact(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFC', str(value)))


def source_url(source, row):
    raw = row['source']
    origin = 'https://github.com/' + source['repository']
    if re.fullmatch(re.escape(origin) + r'/actions/runs/\d+', raw):
        return raw
    if re.fullmatch(re.escape(origin) + r'/blob/[a-f0-9]{40}/(?:app|docs|scripts|tests|public)/[A-Za-z0-9_./-]+', raw):
        return raw
    if not re.fullmatch(r'(?:app|docs|scripts|tests|public)/[A-Za-z0-9_./-]+', raw):
        raise ValueError('Unrecognized source link: ' + raw)
    ref = source['baseCommit'] if row['status'] == 'BASE_V111' else source['reviewRef']
    return origin + '/blob/' + quote(ref, safe='') + '/' + '/'.join(quote(part, safe='') for part in raw.split('/'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/hunt-mechanics-v112.json')
    parser.add_argument('--output', type=Path, required=True, help='JSON report path; screenshots are saved beside it')
    parser.add_argument('--html', type=Path, help='Companion HTML; defaults to the PDF path with an .html extension')
    args = parser.parse_args()
    source_bytes = args.source.read_bytes()
    source = json.loads(source_bytes)
    groups = [next(sheet for sheet in source['sheets'] if sheet['name'] == name) for name in ['Cloture', 'Restant']]
    assert [len(group['rows']) for group in groups] == [219, 8]
    records = [(group, row) for group in groups for row in group['rows']]
    ids = [row['id'] for _, row in records]
    assert len(set(ids)) == 227
    document = fitz.open(args.pdf)
    errors = []
    journal = next((sheet for sheet in source['sheets'] if sheet['name'] == 'Reprise'), None)
    if source['schemaVersion'] == 3:
        if len(source['sheets']) != 22 or source.get('cycleBaseline', {}).get('commit') != 'e4a6c64a1e77edad8865aa05ca7c2901d62bfa09':
            errors.append('Schema 3 requires 22 sheets and the exact e4 cycle baseline.')
        if not journal or [row['id'] for row in journal['rows']] != ['RPR112-001', 'RPR112-002']:
            errors.append('Expected the two ordered continuation entries RPR112-001/002.')
        elif {row['target'] for row in journal['rows']} != {'CHA112-02', 'ROU112-06'} or any(row['status'] != 'VALIDE_AUTOMATISE' for row in journal['rows']):
            errors.append('Only CHA112-02 and ROU112-06 may receive these two automated continuation decisions.')
        if any(row['status'] != 'NON_QUALIFIE' for row in groups[1]['rows']):
            errors.append('All eight outstanding criteria must retain NON_QUALIFIE.')
    html_path = args.html or args.pdf.with_suffix('.html')
    html_tree = None
    if html_path.is_file():
        html_tree = PrintableHtmlParser()
        html_tree.feed(html_path.read_text())
    elif journal:
        errors.append('The companion HTML is required to verify data-transition placement and exact archived layers.')
    if not 30 <= len(document) <= 100:
        errors.append(f'Page count {len(document)} is outside the 30–100 target.')
    pages, spans, annotations = [], [], []
    heading_candidates = {identifier: [] for identifier in ids}
    for page_index, page in enumerate(document):
        if abs(page.rect.width - 595.276) > .8 or abs(page.rect.height - 841.89) > .8:
            errors.append(f'Page {page_index + 1}: expected portrait A4, got {page.rect}.')
        page_spans = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                for span in line['spans']:
                    if not span['text'].strip():
                        continue
                    entry = {**span, 'page': page_index}
                    page_spans.append(entry)
                    spans.append(entry)
                    if span['size'] < 9.98:
                        errors.append(f'Page {page_index + 1}: text smaller than 10 pt ({span["size"]:.3f} pt): {span["text"][:120]}')
                    x0, y0, x1, y1 = span['bbox']
                    if x0 < -.1 or y0 < -.1 or x1 > page.rect.width + .1 or y1 > page.rect.height + .1:
                        errors.append(f'Page {page_index + 1}: text outside the page: {span["text"][:120]}')
                    for identifier in re.findall(r'(?:CLS112-\d{3}|REM112-\d{2})', span['text']):
                        if identifier in heading_candidates:
                            heading_candidates[identifier].append(entry)
        for link in page.get_links():
            if link.get('uri'):
                annotations.append({'page': page_index, 'y': link['from'].y0, 'uri': link['uri']})
        pages.append({'page': page_index + 1, 'sizePoints': [page.rect.width, page.rect.height],
                      'minimumFontPt': min((span['size'] for span in page_spans), default=None),
                      'textSpans': len(page_spans), 'uriAnnotations': len([a for a in annotations if a['page'] == page_index])})
    # A real fiche heading is larger than a cross-reference appearing in body text.
    headings = {}
    for identifier, candidates in heading_candidates.items():
        if not candidates:
            errors.append('Missing record ID: ' + identifier)
            continue
        chosen = min(candidates, key=lambda span: (-span['size'], span['page'], span['bbox'][1]))
        headings[identifier] = (chosen['page'], chosen['bbox'][1])
    ordered = sorted(headings, key=lambda identifier: headings[identifier])
    if ordered != ids:
        errors.append('Fiche headings do not preserve the source order of all 219 + 8 records.')
    field_checks, journal_checks = [], []
    missing_links = []
    for index, (group, row) in enumerate(records):
        identifier = row['id']
        if identifier not in headings:
            continue
        start = headings[identifier]
        end = headings.get(ids[index + 1], (len(document), 0)) if index + 1 < len(ids) else (len(document), 0)
        record_spans = [span for span in spans if start <= (span['page'], span['bbox'][1]) < end]
        record_text = compact(' '.join(span['text'] for span in record_spans))
        missing_fields = [column['key'] for column in group['columns']
                          if row.get(column['key'], '') and compact(row[column['key']]) not in record_text]
        missing_labels = [column['label'] for column in group['columns'] if compact(column['label']) not in record_text]
        if missing_fields:
            errors.append(identifier + ': source field text missing from its fiche: ' + ', '.join(missing_fields))
        if missing_labels:
            errors.append(identifier + ': field label missing from its fiche: ' + ', '.join(missing_labels))
        article = None
        if html_tree:
            articles = [node for node in html_tree.root.nodes() if node.tag == 'article' and node.attrs.get('data-record') == identifier]
            if len(articles) != 1:
                errors.append(identifier + ': expected one HTML fiche.')
            else:
                article = articles[0]
                archived = [node for node in article.children if isinstance(node, HtmlNode) and node.tag == 'dl']
                html_failures = check_html_fields(archived[0], group['columns'], row) if len(archived) == 1 else ['expected one direct archived definition list']
                errors.extend(identifier + ': archived HTML ' + failure for failure in html_failures)
        expected_link = source_url(source, row)
        local_links = [link['uri'] for link in annotations if start <= (link['page'], link['y']) < end]
        if expected_link not in local_links:
            missing_links.append(identifier)
            errors.append(identifier + ': expected clickable source link missing from its fiche: ' + expected_link)
        field_checks.append({'id': identifier, 'sheet': group['name'], 'startPage': start[0] + 1,
                             'fieldsRequired': len(group['columns']), 'missingFieldLabels': missing_labels,
                             'nonemptyFields': sum(bool(row.get(column['key'], '')) for column in group['columns']),
                             'missingFields': missing_fields, 'expectedSourceUrl': expected_link,
                             'sourceUrlClickable': expected_link in local_links})
        for entry in journal['rows'] if journal else []:
            if entry['target'] != row.get('target', row['id']):
                continue
            missing = [column['key'] for column in journal['columns'] if entry.get(column['key'], '') and compact(entry[column['key']]) not in record_text]
            if missing:
                errors.append(entry['id'] + ': journal fields missing from target fiche: ' + ', '.join(missing))
            current_label = compact('État courant : ' + entry['status'])
            if current_label not in record_text:
                errors.append(entry['id'] + ': current status is not explicitly printed in target fiche.')
            if entry['previous'] != row['status']:
                errors.append(entry['id'] + ': journal previous status differs from the archived target status.')
            transition_url = source_url(source, entry)
            if transition_url not in local_links:
                errors.append(entry['id'] + ': clickable journal source missing from target fiche.')
            html_failures = []
            if article:
                transitions = [node for node in article.nodes() if node.attrs.get('data-transition') == entry['id']]
                global_transitions = [node for node in html_tree.root.nodes() if node.attrs.get('data-transition') == entry['id']]
                if len(transitions) != 1 or len(global_transitions) != 1:
                    html_failures.append('expected one data-transition block inside the target fiche')
                else:
                    html_failures.extend(check_html_fields(transitions[0], journal['columns'], entry))
                current_blocks = [node for node in article.nodes() if node.attrs.get('data-current-target') == entry['target']]
                status_nodes = [node for block in current_blocks for node in block.nodes() if 'data-effective-status' in node.attrs]
                if len(current_blocks) != 1 or len(status_nodes) != 1 or status_nodes[0].text() != entry['status']:
                    html_failures.append('explicit effective status is missing or differs')
            else:
                html_failures.append('target HTML fiche unavailable')
            errors.extend(entry['id'] + ': HTML ' + failure for failure in html_failures)
            journal_checks.append({'id': entry['id'], 'target': entry['target'], 'fiche': identifier,
                                   'previous': entry['previous'], 'effectiveStatus': entry['status'],
                                   'fieldsRequired': len(journal['columns']), 'missingPdfFields': missing,
                                   'sourceUrl': transition_url, 'sourceUrlClickable': transition_url in local_links,
                                   'htmlFailures': html_failures})
    if journal and len(journal_checks) != len(journal['rows']):
        errors.append('Each continuation entry must appear within its exact target fiche.')
    selected = {0, len(document) // 2, len(document) - 1}
    if 'REM112-01' in headings:
        selected.add(headings['REM112-01'][0])
    for entry in journal['rows'] if journal else []:
        target_fiche = next((row['id'] for _, row in records if row.get('target', row['id']) == entry['target']), None)
        if target_fiche in headings:
            selected.add(headings[target_fiche][0])
        selected.update(span['page'] for span in spans if entry['id'] in span['text'])
    for row in [max((row for _, row in records), key=lambda row: len(row['source'])),
                max((row for _, row in records), key=lambda row: max(len(str(value)) for value in row.values()))]:
        if row['id'] in headings:
            selected.add(headings[row['id']][0])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    screenshots = []
    for page_index in sorted(selected):
        target = args.output.parent / f'printable-page-{page_index + 1:03}.png'
        page = document[page_index]
        page.get_pixmap(matrix=fitz.Matrix(1500 / page.rect.width, 1500 / page.rect.width), alpha=False).save(target)
        screenshots.append(str(target))
    report = {
        'scope': 'PRINTABLE_COMPANION_PDF_ONLY', 'executedAtUtc': datetime.now(timezone.utc).isoformat(),
        'sourceJson': str(args.source.resolve()), 'sourceJsonSha256': hashlib.sha256(source_bytes).hexdigest(),
        'pdf': str(args.pdf.resolve()), 'pdfSha256': hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
        'pages': len(document), 'requiredRecords': {'Cloture': 219, 'Restant': 8},
        'sourceSchemaVersion': source['schemaVersion'], 'sourceSheetCount': len(source['sheets']),
        'html': str(html_path.resolve()) if html_path.is_file() else None,
        'htmlSha256': hashlib.sha256(html_path.read_bytes()).hexdigest() if html_path.is_file() else None,
        'journalEntries': journal_checks,
        'recordHeadingsFound': len(headings), 'minimumTextFontPt': min((span['size'] for span in spans), default=None),
        'pageChecks': pages, 'fieldAndLinkChecks': field_checks, 'missingSourceLinks': missing_links,
        'screenshots': screenshots, 'errors': errors, 'result': 'OK' if not errors else 'FAILED',
        'limits': ['PDF geometry/text/link assertions are not physical print review.',
                   'Screenshots require separate visual inspection.', 'No Microsoft Excel session or criterion qualification.']
    }
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['result', 'pages', 'recordHeadingsFound', 'minimumTextFontPt', 'pdfSha256', 'screenshots']}, indent=2))
    if errors:
        print('\n'.join(errors[:20]))
        raise SystemExit(1)


if __name__ == '__main__':
    main()
