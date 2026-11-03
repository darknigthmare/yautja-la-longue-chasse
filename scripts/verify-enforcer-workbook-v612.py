"""Read-only validation of the delivered XLSX against the recovered baseline."""
from pathlib import Path
import collections, datetime, gzip, hashlib, json, math, re, sys, zipfile, xml.etree.ElementTree as E
REPO=Path(__file__).resolve().parents[1]
PACKAGE=REPO/'docs/suivi-production/v612'
TARGET=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else PACKAGE/'Yautja_Suivi_Variantes_V612_2026-10-21.xlsx'
SOURCE=REPO/'docs/suivi-production/v611/Yautja_Suivi_Variantes_2026-10-21.xlsx'
REPORT_DIR=TARGET.parent/'workbook-preview'
REPORT_DIR.mkdir(parents=True,exist_ok=True)
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def normalized_formula(value):
 """Only remove Excel's optional leading '='; do not hide reference/text changes."""
 assert isinstance(value,str) and value,('missing formula text',value)
 return value[1:] if value.startswith('=') else value

def utc_milliseconds(value):
 """Match JavaScript Date's millisecond precision, with an explicit UTC instant."""
 assert isinstance(value,str),('timestamp is not an ISO string',value)
 dt=datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
 assert dt.tzinfo is not None,('timestamp is missing its UTC offset',value)
 return dt.astimezone(datetime.timezone.utc).isoformat(timespec='milliseconds')

def epoch_milliseconds(value):
 """Integer epoch milliseconds without a floating timestamp conversion."""
 dt=datetime.datetime.fromisoformat(utc_milliseconds(value))
 delta=dt-datetime.datetime(1970,1,1,tzinfo=datetime.timezone.utc)
 return delta.days*86400000+delta.seconds*1000+delta.microseconds//1000

def new_production_date_check(expected,actual,cell,asset_id):
 """Admit only the observed -1 ms loss reproduced by the Excel serial route."""
 expected_normalized=utc_milliseconds(expected)
 assert isinstance(actual,str),('new production timestamp missing',cell,actual)
 if actual==expected_normalized:return None
 expected_ms=epoch_milliseconds(expected_normalized)
 actual_ms=epoch_milliseconds(actual)
 # 1899-12-30 -> 1970-01-01 is 25,569 days. This order of double
 # operations reproduces the three observed export differences exactly.
 serial_roundtrip=(expected_ms+2209161600000)/86400000*86400000-2209161600000
 reproduced_ms=math.trunc(serial_roundtrip)  # JavaScript Date TimeClip.
 delta_ms=actual_ms-expected_ms
 assert delta_ms==-1 and reproduced_ms==actual_ms,{
  'context':'new production timestamp changed','cell':cell,'id':asset_id,
  'expected':expected_normalized,'exported':actual,'deltaMs':delta_ms,
  'serialRoundtripMs':reproduced_ms}
 return {'cell':cell,'id':asset_id,'manifestTimestamp':expected,
  'expectedUtcMs':expected_normalized,'exportedUtcMs':actual,'deltaMs':delta_ms,
  'floatingRoundtripErrorMs':serial_roundtrip-expected_ms,
  'reason':'Exactly reproduced by Excel-epoch double conversion followed by JavaScript Date millisecond truncation.'}

def xml_signature(element):
 """Exact XML contents, ignoring only the ordering of attributes."""
 if element is None:return None
 return (element.tag,tuple(sorted(element.attrib.items())),element.text,
  tuple(xml_signature(child) for child in element))

def cell_style_signatures(sheet,styles):
 """Resolve style IDs, so format preservation does not depend on XF numbering."""
 xfs=list(styles.find('s:cellXfs',N));fonts=list(styles.find('s:fonts',N));fills=list(styles.find('s:fills',N))
 borders=list(styles.find('s:borders',N))
 formats={int(x.attrib['numFmtId']):x.attrib['formatCode'] for x in styles.find('s:numFmts',N)}
 resolved=[]
 for xf in xfs:
  fmt_id=int(xf.attrib.get('numFmtId','0'))
  resolved.append((xml_signature(fonts[int(xf.attrib.get('fontId','0'))]),
   xml_signature(fills[int(xf.attrib.get('fillId','0'))]),
   xml_signature(borders[int(xf.attrib.get('borderId','0'))]),
   formats.get(fmt_id,'General' if fmt_id==0 else f'builtin:{fmt_id}'),
   xml_signature(xf.find('s:alignment',N)),xml_signature(xf.find('s:protection',N))))
 signatures={}
 for cell in sheet['xml'].findall('s:sheetData/s:row/s:c',N):
  signatures[cell.attrib['r']]=resolved[int(cell.attrib.get('s','0'))]
 return signatures

def row_dimensions(sheet):
 result={}
 for row in sheet['xml'].findall('s:sheetData/s:row',N):
  attributes={k:v for k,v in row.attrib.items() if k!='r'}
  if 'ht' in attributes:attributes['ht']=float(attributes['ht'])
  result[int(row.attrib['r'])]=attributes
 return result

def assert_exact_mapping(expected,actual,context):
 missing=sorted(set(expected)-set(actual))
 extra=sorted(set(actual)-set(expected))
 changed=[(k,expected[k],actual[k]) for k in sorted(set(expected)&set(actual)) if expected[k]!=actual[k]]
 assert not (missing or extra or changed),{
  'context':context,'missingCount':len(missing),'missing':missing[:10],
  'extraCount':len(extra),'extra':extra[:10],'changedCount':len(changed),'changed':changed[:10]}

def conditional_rules(sheets):
 """Semantic CF identity, excluding renumberable dxf IDs and rule priorities."""
 rules=[]
 for name,sheet in sheets.items():
  for cf in sheet['xml'].findall('s:conditionalFormatting',N):
   for rule in cf.findall('s:cfRule',N):
    rules.append((name,cf.attrib['sqref'],rule.attrib.get('type'),rule.attrib.get('operator'),
     rule.attrib.get('text'),tuple(normalized_formula(f.text) for f in rule.findall('s:formula',N))))
 return rules

def read_xlsx(path):
 out={}
 with zipfile.ZipFile(path) as z:
  styles=E.fromstring(z.read('xl/styles.xml'))
  nums={int(x.attrib['numFmtId']):x.attrib['formatCode'] for x in styles.find('s:numFmts',N)}
  xfs=list(styles.find('s:cellXfs',N))
  strings=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   strings=[''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml'))]
  book=E.fromstring(z.read('xl/workbook.xml'))
  rels={e.attrib['Id']:e.attrib['Target'].lstrip('/') for e in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  for s in book.find('s:sheets',N):
   part=rels[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
   if not part.startswith('xl/'):part='xl/'+part
   r=E.fromstring(z.read(part));cells={};formulas={};date_cells=set();date_formats={}
   for c in r.findall('s:sheetData/s:row/s:c',N):
    addr=c.attrib['r'];typ=c.attrib.get('t');v=c.find('s:v',N)
    f=c.find('s:f',N)
    if f is not None:formulas[addr]=normalized_formula(f.text)
    fmt=nums.get(int(xfs[int(c.attrib.get('s','0'))].attrib.get('numFmtId','0')),'')
    if typ=='inlineStr':value=''.join(c.find('s:is',N).itertext())
    elif v is None:continue
    elif typ=='s':value=strings[int(v.text)]
    elif typ in ('str','e'):value=v.text or ''
    elif typ=='b':value=v.text=='1'
    elif typ=='d':
     value=utc_milliseconds(v.text);date_cells.add(addr);date_formats[addr]=fmt
    else:
     try:value=float(v.text);value=int(value) if value.is_integer() else value
     except (TypeError,ValueError):value=v.text
     if isinstance(value,(float,int)) and re.search(r'[dmyhs]',fmt,re.I):
      # Excel serial dates have no timezone. This workbook explicitly labels them
      # UTC. Round floating-point serial noise to the same millisecond precision.
      dt=datetime.datetime(1899,12,30,tzinfo=datetime.timezone.utc)+datetime.timedelta(milliseconds=round(value*86400000))
      value=dt.isoformat(timespec='milliseconds');date_cells.add(addr);date_formats[addr]=fmt
    cells[addr]=value
   out[s.attrib['name']]={'cells':cells,'formulas':formulas,'dateCells':date_cells,'dateFormats':date_formats,'xml':r}
  tables=[E.fromstring(z.read(p)) for p in z.namelist() if re.fullmatch(r'xl/tables/table\d+\.xml',p)]
 return out,styles,tables

before,bstyles,btables=read_xlsx(SOURCE)
after,styles,tables=read_xlsx(TARGET)
assert list(before)==list(after),('worksheet order changed',list(before),list(after))
manifest=json.loads((PACKAGE/'data/production-manifest.json').read_text())
current=json.loads(gzip.decompress((PACKAGE/'data/current-master.json.gz').read_bytes()))
assert len(manifest['assets'])==len({p['id'] for p in manifest['assets']})==36
for row in current['rows']:
 for c,v in row['values'].items():
  assert after['Variantes']['cells'].get(c+str(row['rowNumber']))==v,(row['values']['A'],c)
ids=[v for a,v in after['Variantes']['cells'].items() if re.fullmatch('A[0-9]+',a) and int(a[1:])>=7]
assert len(ids)==len(set(ids))==5120
counts=collections.Counter(after['Variantes']['cells'][f'E{r}'] for r in range(7,5127))
assert counts=={'Présente dans main':2125,'Produite — à vérifier':205,'Conservée hors main':36,'Pas faite':2754},counts
for addr,n in {'B11':2125,'B12':205,'B13':0,'B14':2754,'B15':36,'B16':5120,'J21':36,'J22':36,'J23':72}.items():
 assert after['Synthèse']['cells'][addr]==n,(addr,after['Synthèse']['cells'].get(addr))
pr=after['Production PR']['cells']
assert len([a for a in pr if re.fullmatch('A[0-9]+',a) and int(a[1:])>=7])==108
# The 36 V6.11 status formulas now resolve to main after PR 7 was merged.
# Every other value of the 72 historical records, including dates and notes,
# remains exactly equivalent at the decoded OpenXML cell-value level.
prior_manifest=json.loads((REPO/'docs/suivi-production/v611/data/production-manifest.json').read_text())
assert {before['Production PR']['cells'][f'A{r}'] for r in range(43,79)}=={p['id'] for p in prior_manifest['assets']}
merged_status_cells={f'F{r}' for r in range(43,79)}
for addr,value in before['Production PR']['cells'].items():
 if int(re.search(r'\d+$',addr).group())>=6:
  expected='Présente dans main' if addr in merged_status_cells else value
  if addr in merged_status_cells:assert value=='Conservée hors main',('unexpected old V6.11 status',addr,value)
  assert pr.get(addr)==expected,('historical production evidence changed',addr,expected,pr.get(addr))
date_quantization=[]
for r,p in enumerate(manifest['assets'],79):
 for c,value in {'A':p['id'],'B':p['groupFR'],'C':p['variant'],'D':p['nameFR'],
  'E':'Pas faite','F':'Conservée hors main','G':'Oui','H':'Oui','I':'Non','J':'Non',
  'K':p['repoPngPath'],'L':p['sha256'],'M':p['bytes'],
  'O':p['visualInspection']['notesFR'],
  'P':' '.join(p['visualInspection']['limitationsFR']) if isinstance(p['visualInspection']['limitationsFR'],list) else p['visualInspection']['limitationsFR'],
  'Q':p['plannedAppearance']['morphologyFR'],'R':p['plannedAppearance']['skinDirectionFR'],'S':p['plannedAppearance']['armorDirectionFR'],
  'T':' | '.join(ref['repoPath'] for ref in p['references']),'U':'Non','V':' '.join(p['userOverrides']),
  'W':'Vérifié localement','X':'V6.12'}.items():
  actual=pr.get(f'{c}{r}')
  # XLSX represents an empty string as either an empty cell or an empty text value.
  matches=actual in (None,'') if value in (None,'') else actual==value
  assert matches,('new production evidence changed',f'{c}{r}',value,actual)
 for c,expected in [('N',p['generatedAtUtc']),('Y',manifest['generatedAtUtc'])]:
  addr=f'{c}{r}'
  difference=new_production_date_check(expected,pr.get(addr),addr,p['id'])
  if difference is not None:date_quantization.append(difference)
  assert addr in after['Production PR']['dateCells'],('production date exported as text',addr)
  assert after['Production PR']['dateFormats'][addr]=='dd/mm/yy hh:mm',('production date format',addr,after['Production PR']['dateFormats'][addr])

expected_formulas={name:dict(s['formulas']) for name,s in before.items()}
assert sum(map(len,expected_formulas.values()))==559
expected_formulas['Synthèse'].update({
 'J21':'COUNTIFS(\'Production PR\'!$X$7:$X$114,"V6.12")',
 'J22':'COUNTIFS(\'Production PR\'!$W$7:$W$114,"Non retrouvé")',
 'J23':'COUNTIFS(\'Production PR\'!$W$7:$W$114,"Vérifié localement")'})
for r in range(79,115):
 expected_formulas['Production PR'][f'F{r}']=f"INDEX('Variantes'!$E$7:$E$5126,MATCH(A{r},'Variantes'!$A$7:$A$5126,0))"
for name in before:
 assert_exact_mapping(expected_formulas[name],after[name]['formulas'],f'exported formulas: {name}')
assert sum(len(s['formulas']) for s in after.values())==595

allowed_changes={'Synthèse':{'A3','A5','A17','G20','G21'},'Production PR':{'A2','A3'},
 'Contrôles':{'B11','B14','B36','B39','A43'},'Sources jeu':{'A3'},'Classeurs':{'A3'}}
assert after['Contrôles']['cells'].get('B36')==2125,('main inventory control',after['Contrôles']['cells'].get('B36'))
for name in before:
 if name=='Variantes':continue  # Compared against every master value above.
 for addr,value in before[name]['cells'].items():
  if addr in before[name]['formulas'] or addr in allowed_changes.get(name,set()):continue
  assert after[name]['cells'].get(addr)==value,('unexpected existing cell change',name,addr,value,after[name]['cells'].get(addr))
 for addr in set(after[name]['cells'])-set(before[name]['cells']):
  assert name=='Production PR' and 79<=int(re.search(r'\d+$',addr).group())<=114,('unexpected new cell',name,addr)

assert {x.attrib['name']:x.attrib['ref'] for x in tables}=={**{x.attrib['name']:x.attrib['ref'] for x in btables},'YautjaProductionPR':'A6:Y114'}
assert len(tables)==6
old_tables={table.attrib['name']:table for table in btables}
for table in tables:
 original_table=old_tables[table.attrib['name']]
 auto_filter=table.find('s:autoFilter',N)
 assert auto_filter is not None,('missing table autoFilter',table.attrib['name'])
 assert auto_filter.attrib.get('ref')==table.attrib['ref'],('table autoFilter range',table.attrib['name'],table.attrib['ref'],auto_filter.attrib.get('ref'))
 original_filter=original_table.find('s:autoFilter',N)
 assert original_filter is not None
 assert {k:v for k,v in original_filter.attrib.items() if k!='ref'}=={k:v for k,v in auto_filter.attrib.items() if k!='ref'},('table filter attributes changed',table.attrib['name'])
 assert [xml_signature(x) for x in original_filter]==[xml_signature(x) for x in auto_filter],('table filter criteria or visibility changed',table.attrib['name'])
 assert xml_signature(original_table.find('s:tableStyleInfo',N))==xml_signature(table.find('s:tableStyleInfo',N)),('table style changed',table.attrib['name'])
merge_counts={};style_counts={}
for name in before:
 for xpath,kind in [('s:sheetViews/s:sheetView/s:pane','freeze pane'),('s:mergeCells','merged ranges'),('s:dataValidations','validation'),('s:cols','column dimensions'),('s:sheetFormatPr','default dimensions')]:
  assert xml_signature(before[name]['xml'].find(xpath,N))==xml_signature(after[name]['xml'].find(xpath,N)),(kind,name)
 merge_counts[name]=len(after[name]['xml'].findall('s:mergeCells/s:mergeCell',N))
 original_styles=cell_style_signatures(before[name],bstyles)
 exported_styles=cell_style_signatures(after[name],styles)
 for addr,signature in original_styles.items():
  assert exported_styles.get(addr)==signature,('existing cell style changed',name,addr)
 style_counts[name]=len(original_styles)
 original_rows=row_dimensions(before[name]);exported_rows=row_dimensions(after[name])
 for row,attributes in original_rows.items():
  assert row in exported_rows,('existing row dimensions missing',name,row)
  actual=exported_rows[row]
  if name=='Contrôles' and row in (11,14,43):
   attributes={k:v for k,v in attributes.items() if k not in ('ht','customHeight')}
   actual={k:v for k,v in actual.items() if k not in ('ht','customHeight')}
  assert actual==attributes,('existing row dimensions changed',name,row,attributes,actual)
 # Old date cells retain their typed representation and number format, too.
 for addr in before[name]['dateCells']:
  assert addr in after[name]['dateCells'],('historical date lost its type',name,addr)
  assert before[name]['dateFormats'][addr]==after[name]['dateFormats'][addr],('historical date format changed',name,addr)

def extended_area(name,area):
 return area.replace('78','114') if name=='Production PR' else area
baseline_cf=conditional_rules(before)
assert len(baseline_cf)==21
expected_cf=[(name,extended_area(name,area),kind,operator,text,formulas)
 for name,area,kind,operator,text,formulas in baseline_cf]
actual_cf=conditional_rules(after)
expected_cf_counts=collections.Counter(expected_cf);actual_cf_counts=collections.Counter(actual_cf)
assert actual_cf_counts==expected_cf_counts,{
 'context':'conditional rule ranges/types/texts/formulas',
 'missing':list((expected_cf_counts-actual_cf_counts).elements()),
 'extra':list((actual_cf_counts-expected_cf_counts).elements())}
def conditional_styles(sheets,style_root,extend=False):
 signatures={};dxfs=style_root.find('s:dxfs',N)
 for name,sheet in sheets.items():
  for cf in sheet['xml'].findall('s:conditionalFormatting',N):
   area=extended_area(name,cf.attrib['sqref']) if extend else cf.attrib['sqref']
   for rule in cf.findall('s:cfRule',N):
    assert 'dxfId' in rule.attrib,('conditional rule missing differential style',name,area)
    key=(name,area,rule.attrib.get('type'),rule.attrib.get('text'),rule.attrib.get('operator'))
    assert key not in signatures,('duplicate conditional style key',key)
    dxf=dxfs[int(rule.attrib['dxfId'])]
    pattern=dxf.find('s:fill/s:patternFill',N)
    assert pattern is not None and pattern.attrib.get('patternType')=='solid',('conditional fill lost',key)
    signatures[key]=xml_signature(dxf)
 return signatures
assert_exact_mapping(conditional_styles(before,bstyles,True),conditional_styles(after,styles),'conditional colors and differential formats')
errors=[]
for name,s in after.items():
 for c in s['xml'].findall('s:sheetData/s:row/s:c',N):
  if c.attrib.get('t')=='e':errors.append((name,c.attrib['r'],c.find('s:v',N).text))
assert not errors,errors
report={'passed':True,'file':TARGET.name,'bytes':TARGET.stat().st_size,
 'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'sha256':hashlib.sha256(TARGET.read_bytes()).hexdigest(),
 'sheets':list(after),'uniqueVariantIds':len(ids),'statusCounts':dict(counts),'productionRows':108,
 'historicalProductionRowsPreserved':72,'historicalStatusTransitionsToMain':36,
 'historicalPreservationRule':'Only the existing F43:F78 status formula caches change to Présente dans main after PR 7 merged; all other old production values and all formulas are preserved.',
 'newProductionRows':36,'sourceSheetDataRowsPreserved':['Sources jeu','Classeurs'],
 'sourceSheetSubtitleChangesAllowed':{'Sources jeu':['A3'],'Classeurs':['A3']},
 'nativeTables':len(tables),'nativeAutoFiltersVerified':len(tables),'activeSolidConditionalFormats':len(actual_cf),'formulaErrors':errors,
 'exactExportedFormulas':595,'conditionalRuleIdentitiesVerified':21,
 'newProductionEvidenceRowsVerified':36,'newTypedProductionDatesVerified':36,'newTypedVerificationDatesVerified':36,
 'formulaNormalization':'Only one optional leading = is removed; no whitespace, case or reference rewriting.',
 'dateNormalization':'Historical timestamps remain exact. New N/Y timestamps may differ only by -1 ms when the Excel-epoch double roundtrip reproduces the exported value exactly; date types and display formats are checked separately.',
 'dateQuantizationExceptions':date_quantization,'mergedRangesPreservedBySheet':merge_counts,
 'originalFontAndFillCellsVerifiedBySheet':style_counts,'allOriginalFontsFillsAndColorsPreserved':True,
 'originalBordersAlignmentsNumberFormatsAndProtectionPreserved':True,
 'originalRowAndColumnDimensionsPreservedExceptIntentionalAutofit':True,
 'intentionalAutofitRows':{'Contrôles':[11,14,43]},'tableStylesAndFilterCriteriaPreserved':True,
 'freezePanesPreserved':True,'statusValidationPreserved':True,
 'scope':'OpenXML data, formulas, caches, tables, panes, validation and conditional styles; not a live Excel application session.'}
(REPORT_DIR/'openxml-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
