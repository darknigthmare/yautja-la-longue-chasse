"""Read-only validation of the delivered XLSX against the recovered baseline."""
from pathlib import Path
import collections, datetime, gzip, hashlib, json, math, re, sys, zipfile, xml.etree.ElementTree as E
REPO=Path(__file__).resolve().parents[1]
PACKAGE=REPO/'docs/suivi-production/v611'
TARGET=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else PACKAGE/'Yautja_Suivi_Variantes_2026-10-21.xlsx'
SOURCE=PACKAGE/'references/Yautja_Suivi_Variantes_2026-10-20.xlsx'
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

def font_fill_signatures(sheet,styles):
 xfs=list(styles.find('s:cellXfs',N));fonts=list(styles.find('s:fonts',N));fills=list(styles.find('s:fills',N))
 signatures={}
 for cell in sheet['xml'].findall('s:sheetData/s:row/s:c',N):
  xf=xfs[int(cell.attrib.get('s','0'))]
  signatures[cell.attrib['r']]=(xml_signature(fonts[int(xf.attrib.get('fontId','0'))]),
   xml_signature(fills[int(xf.attrib.get('fillId','0'))]))
 return signatures

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

before,bstyles,btables=read_xlsx(SOURCE);after,styles,tables=read_xlsx(TARGET)
assert list(after)==list(before)
for name in ['Sources jeu','Classeurs']:
 assert before[name]['cells']==after[name]['cells'],f'Unexpected source data change: {name}'
 assert before[name]['formulas']==after[name]['formulas'],f'Unexpected formula change: {name}'
source_json=json.loads(gzip.decompress((PACKAGE/'references/source-workbook.json.gz').read_bytes()))
manifest=json.loads((PACKAGE/'data/production-manifest.json').read_text())
assert len(manifest['assets'])==len({p['id'] for p in manifest['assets']})==36
current=json.loads(gzip.decompress((PACKAGE/'data/current-master.json.gz').read_bytes()))
for row in current['rows']:
 for c,v in row['values'].items():assert after['Variantes']['cells'].get(c+str(row['rowNumber']))==v,(row['values']['A'],c)
ids=[v for a,v in after['Variantes']['cells'].items() if re.fullmatch('A[0-9]+',a) and int(a[1:])>=7]
assert len(ids)==len(set(ids))==5120
counts=collections.Counter(after['Variantes']['cells'][f'E{r}'] for r in range(7,5127))
assert counts=={'Présente dans main':2089,'Produite — à vérifier':205,'Conservée hors main':36,'Pas faite':2790}
for addr,n in {'B11':2089,'B12':205,'B13':0,'B14':2790,'B15':36,'B16':5120,'J21':36,'J22':36,'J23':36}.items():assert after['Synthèse']['cells'][addr]==n,(addr,after['Synthèse']['cells'].get(addr))
pr=after['Production PR']['cells']
assert len([a for a in pr if re.fullmatch('A[0-9]+',a) and int(a[1:])>=7])==72
for r in range(7,43):
 assert pr[f'W{r}']=='Non retrouvé';assert pr[f'X{r}']=='V6.10';assert pr[f'F{r}']=='Produite — à vérifier';assert pr[f'G{r}']==pr[f'H{r}']=='Non'
 for c in ['A','B','C','D','E','K','L','M','N','O','P','Q','R','S','T','U']:
  assert pr.get(c+str(r))==before['Production PR']['cells'].get(c+str(r)),('historical evidence changed',r,c)
for r in range(43,79):
 assert pr[f'W{r}']=='Vérifié localement';assert pr[f'X{r}']=='V6.11';assert pr[f'F{r}']=='Conservée hors main';assert pr[f'G{r}']==pr[f'H{r}']=='Oui'
 assert pr[f'I{r}']==pr[f'J{r}']=='Non'
date_quantization=[]
for r,p in enumerate(manifest['assets'],43):
 for c,value in {'A':p['id'],'K':p['repoPngPath'],'L':p['sha256'],'M':p['bytes']}.items():
  assert pr.get(f'{c}{r}')==value,('new production evidence changed',f'{c}{r}',value,pr.get(f'{c}{r}'))
 addr=f'N{r}'
 difference=new_production_date_check(p['generatedAtUtc'],pr.get(addr),addr,p['id'])
 if difference is not None:date_quantization.append(difference)
 assert addr in after['Production PR']['dateCells'],('production date exported as text',addr)
 assert after['Production PR']['dateFormats'][addr]=='dd/mm/yy hh:mm',('production date format',addr,after['Production PR']['dateFormats'][addr])
verification_time=utc_milliseconds(manifest['generatedAtUtc'])
for r in range(7,79):
 addr=f'Y{r}'
 assert pr.get(addr)==verification_time,('verification timestamp changed',addr,verification_time,pr.get(addr))
 assert addr in after['Production PR']['dateCells'],('verification date exported as text',addr)
 assert after['Production PR']['dateFormats'][addr]=='dd/mm/yy hh:mm',('verification date format',addr,after['Production PR']['dateFormats'][addr])

# Compare exported formulas, not only their cached answers. The three summary
# formulas are intentionally replaced; the other 520 baseline formulas remain.
expected_formulas={name:{f'{c}{row["rowNumber"]}':normalized_formula(f)
 for row in source_json['sheets'][name]['rows'] for c,f in row.get('formulas',{}).items()}
 for name in source_json['sheetNames']}
assert sum(map(len,expected_formulas.values()))==523
for name in source_json['sheetNames']:
 assert_exact_mapping(expected_formulas[name],before[name]['formulas'],f'extracted baseline formulas: {name}')
expected_formulas['Synthèse'].update({
 'J21':'COUNTIFS(\'Production PR\'!$X$7:$X$78,"V6.11")',
 'J22':'COUNTIFS(\'Production PR\'!$W$7:$W$78,"Non retrouvé")',
 'J23':'COUNTIFS(\'Production PR\'!$W$7:$W$78,"Vérifié localement")'})
for r in range(43,79):
 expected_formulas['Production PR'][f'F{r}']=f"INDEX('Variantes'!$E$7:$E$5126,MATCH(A{r},'Variantes'!$A$7:$A$5126,0))"
assert sum(map(len,expected_formulas.values()))==559
for name in source_json['sheetNames']:
 assert_exact_mapping(expected_formulas[name],after[name]['formulas'],f'exported formulas: {name}')
assert sum(len(s['formulas']) for s in after.values())==559

assert {x.attrib['name']:x.attrib['ref'] for x in tables}=={**{x.attrib['name']:x.attrib['ref'] for x in btables},'YautjaProductionPR':'A6:Y78'}
assert len(tables)==6,('table count for autoFilter verification',len(tables))
for table in tables:
 auto_filter=table.find('s:autoFilter',N)
 assert auto_filter is not None,('missing table autoFilter',table.attrib['name'])
 assert auto_filter.attrib.get('ref')==table.attrib['ref'],('table autoFilter range',table.attrib['name'],table.attrib['ref'],auto_filter.attrib.get('ref'))
merge_counts={}
for name in before:
 b=before[name]['xml'].find('s:sheetViews/s:sheetView/s:pane',N)
 a=after[name]['xml'].find('s:sheetViews/s:sheetView/s:pane',N)
 assert b.attrib==a.attrib,('pane',name,b.attrib,a.attrib)
 before_merges=[m.attrib['ref'] for m in before[name]['xml'].findall('s:mergeCells/s:mergeCell',N)]
 after_merges=[m.attrib['ref'] for m in after[name]['xml'].findall('s:mergeCells/s:mergeCell',N)]
 assert before_merges==after_merges,('merged ranges changed',name,before_merges,after_merges)
 merge_counts[name]=len(after_merges)
summary_before_styles=font_fill_signatures(before['Synthèse'],bstyles)
summary_after_styles=font_fill_signatures(after['Synthèse'],styles)
assert_exact_mapping(summary_before_styles,summary_after_styles,'Synthèse fonts and fills, including exact colors')
dv=after['Variantes']['xml'].find('s:dataValidations/s:dataValidation',N)
assert dv.attrib['sqref']=='E7:E5126' and 'Conservée hors main' in dv.find('s:formula1',N).text
baseline_cf=conditional_rules(before)
assert len(baseline_cf)==20,('baseline conditional rule count',len(baseline_cf))
expected_cf=[(name,'F7:F78' if name=='Production PR' and area=='F7:F42' else area,kind,operator,text,formulas)
 for name,area,kind,operator,text,formulas in baseline_cf]
# The recovered source exports containsText rules without formula children;
# the new W rule uses the same documented containsText API and representation.
expected_cf.append(('Production PR','W7:W78','containsText','containsText','Non retrouvé',()))
actual_cf=conditional_rules(after)
assert len(actual_cf)==21,('conditional rule count',21,len(actual_cf))
expected_cf_counts=collections.Counter(expected_cf);actual_cf_counts=collections.Counter(actual_cf)
assert actual_cf_counts==expected_cf_counts,{
 'context':'conditional rule ranges/types/texts/formulas',
 'missing':list((expected_cf_counts-actual_cf_counts).elements()),
 'extra':list((actual_cf_counts-expected_cf_counts).elements())}
active_dxf=[]
for name,s in after.items():
 for c in s['xml'].findall('s:conditionalFormatting/s:cfRule',N):
  if 'dxfId' in c.attrib:active_dxf.append(int(c.attrib['dxfId']))
assert len(active_dxf)==21,('conditional rules missing a differential style',len(active_dxf))
dxfs=styles.find('s:dxfs',N)
for i in active_dxf:
 p=dxfs[i].find('s:fill/s:patternFill',N);assert p is not None and p.attrib.get('patternType')=='solid',('lost conditional fill',i)
errors=[]
for name,s in after.items():
 for c in s['xml'].findall('s:sheetData/s:row/s:c',N):
  if c.attrib.get('t')=='e':errors.append((name,c.attrib['r'],c.find('s:v',N).text))
assert not errors,errors
report={'passed':True,'file':TARGET.name,'bytes':TARGET.stat().st_size,'sha256':hashlib.sha256(TARGET.read_bytes()).hexdigest(),
 'sheets':list(after),'uniqueVariantIds':len(ids),'statusCounts':dict(counts),'productionRows':72,
 'historicalProductionRowsPreserved':36,'newProductionRows':36,'unchangedSourceSheets':['Sources jeu','Classeurs'],
 'nativeTables':len(tables),'nativeAutoFiltersVerified':len(tables),'activeSolidConditionalFormats':len(active_dxf),'formulaErrors':errors,
 'exactExportedFormulas':559,'conditionalRuleIdentitiesVerified':21,
 'newProductionEvidenceRowsVerified':36,'newTypedProductionDatesVerified':36,'typedVerificationDatesVerified':72,
 'formulaNormalization':'Only one optional leading = is removed; no whitespace, case or reference rewriting.',
 'dateNormalization':'Explicit UTC instants at JavaScript Date millisecond precision; numeric Excel serials rounded to milliseconds. Historical N and all Y dates remain exact. A new N date may differ only by -1 ms when the specific Excel-epoch double roundtrip reproduces the exported value exactly. Date cells and display formats checked separately.',
 'dateQuantizationExceptions':date_quantization,
 'mergedRangesPreservedBySheet':merge_counts,
 'summaryFontAndFillCellsVerified':len(summary_after_styles),'summaryFontsFillsAndColorsPreserved':True,
 'freezePanesPreserved':True,'statusValidationPreserved':True,'scope':'OpenXML data, formulas, caches, tables, panes and conditional fills; not a live Excel application session.'}
(REPORT_DIR/'openxml-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
