#!/usr/bin/env node
/**
 * V110 hunting-mechanics workbook. Deterministic OOXML ZIP, without dependencies.
 * The JSON is the editable source. Validation statuses describe execution only
 * when the source explicitly includes its command, commit and result.
 */
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const SOURCE_PATH = 'docs/hunt-mechanics-v110.json';
const OUTPUT_PATH = 'docs/YAUTJA_V110_MECANIQUES_CHASSE.xlsx';
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

/** Explicit UTF-8 encoder also usable in tool isolates without TextEncoder. */
function utf8(value) {
  const out = [];
  for (const char of String(value)) {
    const c = char.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
    else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
  }
  return Uint8Array.from(out);
}
function concat(parts) {
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) { result.set(part, at); at += part.length; }
  return result;
}
function little(values) {
  const result = [];
  for (const [value, width] of values) {
    for (let i = 0; i < width; i++) result.push(value >>> (i * 8) & 255);
  }
  return Uint8Array.from(result);
}
const CRC_TABLE = Array.from({length: 256}, (_, i) => {
  let value = i;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
  return value >>> 0;
});
function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) value = CRC_TABLE[(value ^ byte) & 255] ^ value >>> 8;
  return (value ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const locals = [], central = [];
  let offset = 0;
  for (const [path, value] of entries) {
    const name = utf8(path), body = utf8(value), crc = crc32(body);
    const header = little([[0x04034b50,4],[20,2],[0x800,2],[0,2],[0,2],[33,2],[crc,4],[body.length,4],[body.length,4],[name.length,2],[0,2]]);
    locals.push(header, name, body);
    central.push(little([[0x02014b50,4],[20,2],[20,2],[0x800,2],[0,2],[0,2],[33,2],[crc,4],[body.length,4],[body.length,4],[name.length,2],[0,2],[0,2],[0,2],[0,2],[0,4],[offset,4]]), name);
    offset += header.length + name.length + body.length;
  }
  const directory = concat(central);
  return concat([...locals, directory, little([[0x06054b50,4],[0,2],[0,2],[entries.length,2],[entries.length,2],[directory.length,4],[offset,4],[0,2]])]);
}
function column(index) {
  let value = index + 1, label = '';
  while (value) { value--; label = String.fromCharCode(65 + value % 26) + label; value = Math.floor(value / 26); }
  return label;
}
function cell(value, ref, style = 0) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite workbook value at ' + ref);
    return '<c r="' + ref + '" s="' + style + '"><v>' + value + '</v></c>';
  }
  return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' + escapeXml(value) + '</t></is></c>';
}
function statusStyle(value, alternate) {
  if (value === 'MODIFIE_DANS_PR') return 5;
  if (value === 'PROPOSE') return 6;
  if (value === 'A_EXECUTER') return 7;
  if (value === 'EXISTANT') return 8;
  return alternate ? 4 : 0;
}
function relationship(id, type, target, external = false) {
  return '<Relationship Id="' + id + '" Type="' + REL + '/' + type + '" Target="' + escapeXml(target) + '"' + (external ? ' TargetMode="External"' : '') + '/>';
}
function sourceUrl(source, row) {
  if (!row.source || !/^(app|docs|scripts|tests)\/[A-Za-z0-9_./-]+$/.test(row.source) && row.source !== 'README.md') return null;
  const ref = row.status === 'EXISTANT' ? source.baseCommit : source.reviewRef;
  return 'https://github.com/' + source.repository + '/blob/' + encodeURIComponent(ref) + '/' + row.source.split('/').map(encodeURIComponent).join('/');
}
function worksheet(source, sheet) {
  const last = column(sheet.columns.length - 1), lastRow = sheet.rows.length + 4;
  const subtitle = source.release + ' · ' + source.asOf + ' · EXISTANT / MODIFIE_DANS_PR / PROPOSE · validations consignées séparément';
  const rows = [
    '<row r="1" ht="30" customHeight="1">' + cell(sheet.title, 'A1', 1) + '</row>',
    '<row r="2" ht="34" customHeight="1">' + cell(subtitle, 'A2', 2) + '</row>',
    '<row r="3" ht="12" customHeight="1"/>',
    '<row r="4" ht="30" customHeight="1">' + sheet.columns.map((c, i) => cell(c.label, column(i) + '4', 3)).join('') + '</row>',
  ];
  const links = [], rels = [];
  for (const [index, row] of sheet.rows.entries()) {
    const number = index + 5;
    let lines = 1;
    for (const c of sheet.columns) {
      const text = String(row[c.key] ?? '');
      lines = Math.max(lines, ...text.split('\n').map(line => Math.ceil(line.length / Math.max(8, c.width - 3))));
    }
    const height = Math.max(36, Math.min(150, 15 * lines + 12));
    rows.push('<row r="' + number + '" ht="' + height + '" customHeight="1">' + sheet.columns.map((c, i) => cell(row[c.key], column(i) + number, statusStyle(row[c.key], index % 2 === 1))).join('') + '</row>');
    const sourceIndex = sheet.columns.findIndex(c => c.key === 'source');
    const url = sourceUrl(source, row);
    if (sourceIndex >= 0 && url) {
      const id = 'rId' + (rels.length + 1);
      links.push('<hyperlink ref="' + column(sourceIndex) + number + '" r:id="' + id + '" tooltip="Ouvrir la source GitHub"/>');
      rels.push(relationship(id, 'hyperlink', url, true));
    }
  }
  const xml = XML + '<worksheet xmlns="' + MAIN + '" xmlns:r="' + REL + '"><dimension ref="A1:' + last + lastRow + '"/><sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="85"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A5" sqref="A5"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="36"/><cols>' + sheet.columns.map((c, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + c.width + '" customWidth="1"/>').join('') + '</cols><sheetData>' + rows.join('') + '</sheetData><autoFilter ref="A4:' + last + lastRow + '"/><mergeCells count="2"><mergeCell ref="A1:' + last + '1"/><mergeCell ref="A2:' + last + '2"/></mergeCells>' + (links.length ? '<hyperlinks>' + links.join('') + '</hyperlinks>' : '') + '<printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L' + source.release + ' · ' + escapeXml(sheet.name) + '&amp;RPage &amp;P / &amp;N</oddFooter></headerFooter></worksheet>';
  return {xml, rels: rels.length ? XML + '<Relationships xmlns="' + PKG + '">' + rels.join('') + '</Relationships>' : null};
}
const STYLES = XML + '<styleSheet xmlns="' + MAIN + '"><fonts count="4"><font><sz val="10"/><color rgb="FF20332D"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="19"/><color rgb="FF173D32"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF51685F"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173D32"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F5F2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFCAE9DC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE5AC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD6CC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2EAF0"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="hair"><color rgb="FFCFDCD5"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

export function buildHuntMechanicsWorkbook(source) {
  if (source.schemaVersion !== 1 || source.release !== 'V110' || !/^\d{4}-\d{2}-\d{2}$/.test(source.asOf) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository) || !/^[a-f0-9]{40}$/.test(source.baseCommit) || !source.reviewRef) throw new TypeError('Invalid V110 source metadata');
  if (!Array.isArray(source.sheets) || source.sheets.length !== 8 || new Set(source.sheets.map(s => s.name)).size !== 8) throw new TypeError('Eight uniquely named worksheets required');
  const seen = new Set();
  for (const sheet of source.sheets) {
    if (!sheet.name || sheet.name.length > 31 || /[\\/?*\[\]:]/.test(sheet.name) || !sheet.title || !Array.isArray(sheet.columns) || sheet.columns.length < 1 || sheet.columns.length > 26 || !Array.isArray(sheet.rows) || !sheet.rows.length) throw new TypeError('Invalid worksheet');
    if (new Set(sheet.columns.map(c => c.key)).size !== sheet.columns.length) throw new TypeError('Repeated column');
    for (const c of sheet.columns) if (!c.key || !c.label || !Number.isFinite(c.width) || c.width < 8 || c.width > 90) throw new TypeError('Invalid column');
    for (const row of sheet.rows) {
      if (!row.id || seen.has(row.id)) throw new TypeError('Missing or repeated rule ID');
      seen.add(row.id);
      for (const [key, value] of Object.entries(row)) if (!sheet.columns.some(c => c.key === key) || !['string','number'].includes(typeof value)) throw new TypeError('Unknown column or invalid cell value');
    }
  }
  const entries = [];
  const types = source.sheets.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('');
  entries.push(['[Content_Types].xml', XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' + types + '</Types>']);
  entries.push(['_rels/.rels', XML + '<Relationships xmlns="' + PKG + '">' + relationship('rId1', 'officeDocument', 'xl/workbook.xml') + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' + relationship('rId3', 'extended-properties', 'docProps/app.xml') + '</Relationships>']);
  entries.push(['docProps/core.xml', XML + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + escapeXml(source.title) + '</dc:title><dc:creator>Yautja · suivi de conception</dc:creator><dc:description>' + escapeXml(source.scope) + '</dc:description><dcterms:created xsi:type="dcterms:W3CDTF">' + source.asOf + 'T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + source.asOf + 'T00:00:00Z</dcterms:modified></cp:coreProperties>']);
  entries.push(['docProps/app.xml', XML + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Yautja Mechanics Workbook</Application><AppVersion>1.0</AppVersion><TitlesOfParts><vt:vector size="8" baseType="lpstr">' + source.sheets.map(s => '<vt:lpstr>' + escapeXml(s.name) + '</vt:lpstr>').join('') + '</vt:vector></TitlesOfParts></Properties>']);
  entries.push(['xl/workbook.xml', XML + '<workbook xmlns="' + MAIN + '" xmlns:r="' + REL + '"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' + source.sheets.map((s, i) => '<sheet name="' + escapeXml(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets><definedNames>' + source.sheets.map((s, i) => '<definedName name="_xlnm.Print_Titles" localSheetId="' + i + '">&apos;' + escapeXml(s.name.replace(/'/g, "''")) + '&apos;!$1:$4</definedName>').join('') + '</definedNames><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>']);
  entries.push(['xl/_rels/workbook.xml.rels', XML + '<Relationships xmlns="' + PKG + '">' + source.sheets.map((_, i) => relationship('rId' + (i + 1), 'worksheet', 'worksheets/sheet' + (i + 1) + '.xml')).join('') + relationship('rId9', 'styles', 'styles.xml') + '</Relationships>']);
  entries.push(['xl/styles.xml', STYLES]);
  source.sheets.forEach((sheet, i) => {
    const data = worksheet(source, sheet);
    entries.push(['xl/worksheets/sheet' + (i + 1) + '.xml', data.xml]);
    if (data.rels) entries.push(['xl/worksheets/_rels/sheet' + (i + 1) + '.xml.rels', data.rels]);
  });
  return zip(entries);
}

async function cli() {
  const {readFile, writeFile} = await import('node:fs/promises');
  const {resolve} = await import('node:path');
  const {fileURLToPath} = await import('node:url');
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build-hunt-mechanics-workbook.mjs [--check]');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const source = JSON.parse(await readFile(resolve(root, SOURCE_PATH), 'utf8'));
  const workbook = buildHuntMechanicsWorkbook(source);
  if (args.includes('--check')) {
    const current = await readFile(resolve(root, OUTPUT_PATH));
    if (current.length !== workbook.length || current.some((byte, i) => byte !== workbook[i])) throw new Error('V110 workbook differs from its JSON source');
  } else await writeFile(resolve(root, OUTPUT_PATH), workbook);
  console.log(JSON.stringify({result: args.includes('--check') ? 'PASS_REPRODUCIBLE_BYTES' : 'GENERATED', sheets: source.sheets.length, rows: source.sheets.reduce((count, s) => count + s.rows.length, 0), bytes: workbook.length, nativeExcelExecuted: false}));
}
if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) await cli();
