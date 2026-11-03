#!/usr/bin/env python3
"""Read-only V114 source-cell, historical ZIP/XML and native alpha verification."""
import argparse
import importlib.util
import io
import json
from pathlib import Path
import posixpath
import sys
import xml.etree.ElementTree as E
from zipfile import ZipFile
from PIL import Image

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('v114_native_production',Path(__file__).with_name('build-native-open-workbook-v114.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)
MAIN = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'

def column(index):
    result = ''
    while index:
        index,letter = divmod(index-1,26)
        result = chr(65+letter)+result
    return result

def alpha_measure(alpha,threshold):
    width,height = alpha.size
    box = alpha.point(lambda value:255 if value>threshold else 0).getbbox()
    build.require(box is not None,'Native image/cell must have visible pixels')
    histogram = alpha.histogram()
    edge = sum(alpha.getpixel((x,0))>threshold for x in range(width))
    edge += sum(alpha.getpixel((x,height-1))>threshold for x in range(width))
    edge += sum(alpha.getpixel((0,y))>threshold for y in range(1,height-1))
    edge += sum(alpha.getpixel((width-1,y))>threshold for y in range(1,height-1))
    return {'bboxExclusive':list(box),'margins':[box[0],box[1],width-box[2],height-box[3]],
            'visiblePixels':sum(histogram[threshold+1:]),'edgeVisiblePixels':edge}

def verify_pixels(data):
    for row in data['homeworldCandidates']:
        with Image.open(build.local(row['path'])) as image:
            build.require(image.mode=='RGBA' and list(image.size)==row['dimensions'],'Actual native RGBA dimensions disagree: '+row['path'])
            alpha = image.getchannel('A')
            build.require(alpha.getextrema()[0]==0 and alpha.getextrema()[1]>8,'Nonempty transparent native expected')
            for threshold in [0,2,8]:
                actual = alpha_measure(alpha,threshold)
                declared = row['thresholdMeasurements'][str(threshold)]
                build.require(all(actual[key]==value for key,value in declared.items()),'Actual HW alpha measure differs: '+row['path']+' /'+str(threshold))
    for row in data['pitCandidates']:
        with Image.open(build.local(row['path'])) as image:
            build.require(image.mode=='RGBA' and list(image.size)==row['dimensions'],'Native Pit dimensions disagree')
            alpha = image.getchannel('A')
            build.require(list(alpha.getextrema())==row['alphaExtrema'],'Native Pit alpha range disagrees')
            for frame in row['frames']:
                x,y,width,height = frame['rect']
                # Read-only native rectangle analysis, never save or rewrite pixels.
                cell = alpha.crop((x,y,x+width,y+height))
                for threshold in [0,2,8]:
                    actual = alpha_measure(cell,threshold)
                    declared = frame['alphaGt'+str(threshold)]
                    build.require(actual['bboxExclusive']==declared['bboxExclusive'] and actual['margins']==declared['margins'],'Pit native cell bounds differ')
                    build.require(actual['edgeVisiblePixels']==frame['edgePixelsByThreshold'][str(threshold)],'Pit native cell boundary count differs')
    return {'nativePngsChecked':43,'newPortableRawPngsChecked':39,
            'homeworldAlphaMasksRecomputed':120,'pitCellAlphaMasksRecomputed':54,
            'pixelWrites':0,'admissionGranted':False}

def verify_file(data,workbook,check_pixels=True):
    build.validate_manifest(data)
    canonical_bytes = build.append.build_workbook(build.payload(data))
    with ZipFile(build.local(build.BASELINE['path'])) as original,ZipFile(workbook) as current,ZipFile(io.BytesIO(canonical_bytes)) as canonical:
        for name in original.namelist():
            if name not in build.append.ASSEMBLY_PARTS and original.read(name)!=current.read(name):
                raise ValueError('Historical ZIP part changed: '+name)
        book = E.fromstring(current.read('xl/workbook.xml'))
        relations = {r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(current.read('xl/_rels/workbook.xml.rels'))}
        sheets = list(book.find(MAIN+'sheets'))
        build.require(len(sheets)==135 and [s.attrib['name'] for s in sheets[130:]]==build.SHEET_NAMES,'130historical sheets plus5explicit V114 sheets required')
        cells_checked = 0
        for sheet,expected in zip(sheets[130:],build.build_sheets(data),strict=True):
            target = relations[sheet.attrib[REL+'id']]
            target = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
            xml = E.fromstring(current.read(target))
            rows = xml.find(MAIN+'sheetData')
            build.require(len(rows)==len(expected['rows'])+4,'Unexpected V114 data row count')
            actual = {}
            for cell in xml.iter(MAIN+'c'):
                build.require(cell.find(MAIN+'f') is None,'New V114 sheets must retain literal source values')
                inline = cell.find(MAIN+'is')
                actual[cell.attrib['r']] = ''.join(inline.itertext()) if inline is not None else cell.findtext(MAIN+'v','')
            for row_index,row in enumerate(expected['rows'],5):
                for column_index,col in enumerate(expected['columns'],1):
                    ref = column(column_index)+str(row_index)
                    build.require(actual.get(ref)==build.words(row.get(col['key'],'')),'V114 source cell differs: '+expected['name']+'!'+ref)
                    cells_checked += 1
            build.require(current.read(target)==canonical.read(target),'V114 canonical title,headers or worksheet metadata differs: '+expected['name'])
    historical = build.append.verify_workbook({**build.payload(data),'workbookPath':str(workbook)})
    pixels = verify_pixels(data) if check_pixels else {'scope':'Pixels not rechecked by this invocation'}
    return {'status':'PASS_STRUCTURE_SOURCES_NATIVE_BYTES_NOT_ADMISSION',
            'worksheets':135,'historicalWorksheetsByteIdentical':130,
            'appendedSourceCellsChecked':cells_checked,'newFormulas':0,
            'sourceRequirementsOpen':56,'artTargetsOpen':354,
            'humanArtisticValidations':0,'sourceClosures':0,
            'runtimeR8Status':data['runtimeR8Status'],'nativeExcelExecuted':False,
            'pixelVerification':pixels,'historicalVerification':historical}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',default=str(build.MANIFEST))
    parser.add_argument('--workbook',default=str(build.OUTPUT))
    args = parser.parse_args()
    data = json.loads(build.local(args.manifest).read_text())
    result = verify_file(data,build.local(args.workbook))
    print(json.dumps({key:value for key,value in result.items() if key!='historicalVerification'},ensure_ascii=False))

if __name__=='__main__':
    main()
