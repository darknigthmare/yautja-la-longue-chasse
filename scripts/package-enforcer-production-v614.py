"""Package the four Enforcer deliveries and all 17 workbooks from immutable Git blobs."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit
import zipfile

ROOT=Path(__file__).resolve().parents[1]
BASE='92e7c824fd80d6b8152855b3d66560448f8c48c0'
CURRENT='docs/suivi-production/v614'
VERSIONS=('v611','v612','v613','v614')
PR_URL='https://github.com/darknigthmare/yautja-la-longue-chasse/pull/15'
LIMIT=95*1024*1024
WRAPPERS={'index.html','LISEZ_MOI.txt','publication.json','SHA256_FICHIERS.json'}

# Reuse the tested byte-preserving Git/ZIP routines from the preceding lot.
spec=importlib.util.spec_from_file_location('enforcer_package_v613',ROOT/'scripts/package-enforcer-production-v613.py')
shared=importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
git,read_tree,stage_files=shared.git,shared.read_tree,shared.stage_committed_files
write_zip,verify_zip,json_bytes=shared.write_zip,shared.verify_zip,shared.json_bytes


def verify_links(stage: Path) -> int:
    class Links(HTMLParser):
        def __init__(self):
            super().__init__()
            self.links=set()
        def handle_starttag(self,_tag,attributes):
            self.links.update(v for k,v in attributes if k in {'href','src'} and v)
    checked=0
    for name in ('index.html',*(f'docs/suivi-production/{v}/index.html' for v in VERSIONS)):
        page=stage/name
        parser=Links()
        parser.feed(page.read_text(encoding='utf-8'))
        for href in parser.links:
            url=urlsplit(href)
            if url.scheme in {'http','https','data','mailto'} or url.netloc or not url.path:
                continue
            if url.scheme or url.path.startswith('/'):
                raise ValueError('Non-relative offline link: '+href)
            target=(page.parent/unquote(url.path)).resolve()
            if not target.is_relative_to(stage.resolve()) or not target.is_file():
                raise ValueError(f'Missing offline target: {name}: {href}')
            checked+=1
    return checked


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('published_commit')
    parser.add_argument('output_directory')
    args=parser.parse_args()
    commit=args.published_commit
    if not re.fullmatch(r'[0-9a-f]{40}',commit) or git('rev-parse','--verify',commit+'^{commit}').decode().strip()!=commit:
        raise ValueError('Supply the complete published commit SHA')
    if subprocess.run(['git','merge-base','--is-ancestor',BASE,commit],cwd=ROOT,check=False).returncode:
        raise ValueError('The delivery must descend from main V106')
    tree=read_tree(commit)
    def metadata(name):
        return json.loads(git('cat-file','blob',tree[name]['blob']))
    reconciliation=metadata(CURRENT+'/data/main-reconciliation.json')
    if reconciliation['currentMainCommit']!=BASE or reconciliation['successorPullRequestUrl']!=PR_URL:
        raise ValueError('Wrong main or PR provenance')
    manifests=[metadata(f'docs/suivi-production/{v}/data/production-manifest.json') for v in VERSIONS]
    for version,manifest,count,variants in zip(VERSIONS,manifests,(36,36,36,18),({4,5},{6,7},{8,9},{10})):
        assets=manifest['assets']
        if len(assets)!=count or {a['variant'] for a in assets}!=variants or len({a['groupId'] for a in assets})!=18:
            raise ValueError('Wrong cohort '+version)
        if any(not a['repoPngPath'].startswith(f'public/game/production/enforcers-{version}/') for a in assets):
            raise ValueError('Wrong native tree '+version)
    assets=[a for manifest in manifests for a in manifest['assets']]
    if len({a['id'] for a in assets})!=126 or len({a['sha256'] for a in assets})!=126:
        raise ValueError('Expected 126 unique native PNGs')
    originals=metadata(CURRENT+'/data/base-workbooks.json')['workbooks']
    expected_workbooks={w['repoPath'] for w in originals}|{CURRENT+'/Yautja_Suivi_Variantes_V614_2026-10-23.xlsx'}
    if len(originals)!=16 or len(expected_workbooks)!=17 or {p for p in tree if p.endswith('.xlsx')}!=expected_workbooks:
        raise ValueError('Expected all 16 previous workbooks plus the new V6.14')
    native_paths={a['repoPngPath'] for a in assets}
    files=set(expected_workbooks)
    for version in VERSIONS:
        for prefix in (f'docs/suivi-production/{version}/',f'public/game/production/enforcers-{version}/'):
            files.update(p for p,e in tree.items() if p.startswith(prefix) and e['kind']=='blob')
        files.update({f'app/game/data/enforcerProduction{version.upper()}.json',f'tests/enforcer-production-{version}.test.mjs'})
    files.update(p for p in tree if re.fullmatch(r'scripts/(?:build|verify|checkpoint|package|prepare|reconcile|audit)-enforcer-[a-z-]+-v61[1-4]\.(?:mjs|py)',p))
    files.update({'app/game/RecentSpriteLibraryV85.tsx','app/game/systems/recentSpriteLibraryV85.ts',
                  'scripts/lib/sanitize-enforcer-public-record.mjs','tests/drive-new-deposits-v89.test.mjs','package.json','package-lock.json','.github/workflows/audit-v94.yml'})
    # Include every added/modified file of this PR, including its historical
    # proof adapter; the delivery still does not replace a full game checkout.
    files.update(git('diff','--name-only','--diff-filter=AM',BASE,commit).decode().splitlines())
    if files&WRAPPERS:
        raise ValueError('A repository file would be replaced by a delivery wrapper')
    packaged_native={p for p in files if re.fullmatch(r'public/game/production/enforcers-v61[1-4]/.+\.png',p)}
    if packaged_native!=native_paths or {p for p in files if p.endswith('.xlsx')}!=expected_workbooks:
        raise ValueError('Native PNG or workbook membership mismatch')
    counts=metadata(CURRENT+'/data/current-counts.json')
    if counts['total']!=5120 or sum(counts['statusCounts'].values())!=5120 or counts['remainingEnforcerVariant10Count']!=0:
        raise ValueError('Invalid cumulative counts')
    current_prompts=sum(bool(a.get('acceptedOutputPromptExact')) for a in manifests[3]['assets'])
    historical_missing=sum(not a.get('acceptedOutputPromptExact') for a in manifests[2]['assets'])
    if current_prompts!=18 or historical_missing!=21:
        raise ValueError('Unexpected prompt provenance')
    date=datetime.fromtimestamp(int(git('show','-s','--format=%ct',commit)),timezone.utc)
    timestamp=(date.year,date.month,date.day,date.hour,date.minute,date.second//2*2)
    out=Path(args.output_directory).resolve()
    out.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='v614-package-',dir=out) as temp:
        stage=Path(temp)
        records=stage_files(tree,files,stage)
        for a in assets:
            r=records[a['repoPngPath']]
            if r['sha256']!=a['sha256'] or r['bytes']!=a['bytes']:
                raise ValueError('Native bytes mismatch '+a['id'])
        for w in originals:
            r=records[w['repoPath']]
            if r['sha256']!=w['sha256'] or r['bytes']!=w['bytes'] or r['gitBlobSha1']!=w['gitBlobSha']:
                raise ValueError('Historical workbook modified '+w['repoPath'])
        publication={
            'version':'V6.14','githubPullRequest':PR_URL,'publishedCommit':commit,'sourceMainCommit':BASE,
            'previousMergedPullRequests':[7,9,10],'includedDeliveryVersions':['V6.11','V6.12','V6.13','V6.14'],
            'newNativePngFiles':18,'cumulativeNativePngFiles':126,'groups':18,'newVariants':[10],'priorVariants':[4,5,6,7,8,9],
            'unchangedPriorWorkbooks':16,'xlsxFiles':17,'statusCounts':counts['statusCounts'],
            'finalPromptsDocumentedV614':18,'finalPromptsUnrecoveredV613':21,'remainingEnforcerVariant10Count':0,
            'allMissingProjectVariantsCompleted':False,'newAnimations':0,'newMapPlacements':0,'githubMergePerformed':False,
            'repositoryPayloadSource':'Immutable Git blobs from the supplied published commit.',
            'generatedDeliveryWrappers':sorted(WRAPPERS),
            'scopeFR':'126 PNG, quatre livraisons Enforcers, leurs registres et outils, 17 classeurs. Le dépôt complet reste nécessaire pour exécuter le jeu et les tests.',
        }
        wrappers={
            'publication.json':json_bytes(publication),
            'index.html':b'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=docs/suivi-production/v614/index.html"><title>Yautja V6.14</title></head><body><a href="docs/suivi-production/v614/index.html">Galerie des 126 Enforcers</a></body></html>\n',
            'LISEZ_MOI.txt':(
                'Yautja — Enforcers V6.14\n\n'
                'OUVRIR\nExtraire le ZIP complet, puis ouvrir index.html.\n'
                'Pour les parties, extraire TOUTES les archives Partie_XX_sur_YY.zip dans LE MÊME DOSSIER, en conservant les chemins. Chaque partie est un ZIP standard indépendant inférieur à 95 Mio. Ne pas concaténer leurs octets.\n\n'
                'CONTENU\n126 PNG natifs : 36 V6.11, 36 V6.12, 36 V6.13 et 18 V6.14.\n'
                '17 classeurs XLSX : les 16 déjà présents dans main, dont les suivis jeu V104, V105 et V106, et le nouveau suivi PNJ V6.14.\n'
                'Le suivi actualisé et la galerie sont dans docs/suivi-production/v614.\n'
                'Les 18 variantes Enforcers 10 sont produites ; les autres familles manquantes restent dans le suivi.\n'
                'Le ZIP contient la livraison de production et la galerie, pas un checkout complet du jeu.\n\n'
                'PROVENANCE\nLes 18 nouveaux PNG conservent leurs octets natifs, leurs prompts finaux et leurs reçus. Les dates de production désignent le retour observé de l’outil, pas un horodatage serveur certifié.\n'
                'Les 21 prompts finaux V6.13 non récupérés restent explicitement manquants. Les 36 traces V6.10 restent sans PNG retrouvé.\n'
                'V6.11 à V6.13 sont dans main ; V6.14 est dans la PR nº 15. Les personnages sont des poses fixes raccordées à la galerie et au codex. Aucune nouvelle animation ni nouveau placement en scène.\n'
                'Les marges réelles et les observations anatomiques sont documentées dans les reçus, sans certification canonique 1:1.\n\n'
                'VÉRIFICATION\nSHA256_FICHIERS.json contient tailles et empreintes ; SHA256_ARCHIVES.json identifie le ZIP complet et les parties. L’union des parties contient exactement le ZIP complet.\n'
                'publication.json, index.html, LISEZ_MOI.txt et SHA256_FICHIERS.json sont les seuls fichiers d’emballage dérivés hors du commit.\n'
                f'Commit publié : {commit}\nPR : {PR_URL}\nMain source : {BASE}\n'
            ).encode('utf-8'),
        }
        for name,content in wrappers.items():
            (stage/name).write_bytes(content)
            records[name]={'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest(),'source':'delivery-wrapper','derivedFromCommit':commit}
        checksums=json_bytes({'publishedCommit':commit,'excludedSelfPath':'SHA256_FICHIERS.json','files':[records[n] for n in sorted(records)]})
        (stage/'SHA256_FICHIERS.json').write_bytes(checksums)
        records['SHA256_FICHIERS.json']={'path':'SHA256_FICHIERS.json','bytes':len(checksums),'sha256':hashlib.sha256(checksums).hexdigest(),'source':'delivery-wrapper','derivedFromCommit':commit}
        links=verify_links(stage)
        names=sorted(records)
        complete=out/'Yautja_V614_126_Enforcers_Excel_et_Galerie.zip'
        write_zip(complete,names,stage,timestamp)
        complete_report=verify_zip(complete,set(names),records)
        with zipfile.ZipFile(complete) as archive:
            costs={i.filename:i.compress_size+76+2*len(i.filename.encode('utf-8')) for i in archive.infolist()}
        def priority(name):
            if name in WRAPPERS:return 0,name
            if name not in native_paths:return 1,name
            version=next(v for v in VERSIONS if f'enforcers-{v}/' in name)
            return 5-VERSIONS.index(version),name
        partitions=[]
        partition=[]
        size=22
        for name in sorted(names,key=priority):
            cost=costs[name]
            if cost+22>=LIMIT:raise ValueError('Single file exceeds part limit')
            if partition and size+cost>=LIMIT:
                partitions.append(partition)
                partition=[]
                size=22
            partition.append(name)
            size+=cost
        if partition:partitions.append(partition)
        parts=[]
        union=set()
        for i,partition in enumerate(partitions,1):
            expected=set(partition)
            if union&expected:raise ValueError('Overlapping ZIP parts')
            union.update(expected)
            target=out/f'Yautja_V614_Partie_{i:02d}_sur_{len(partitions):02d}.zip'
            write_zip(target,partition,stage,timestamp)
            report=verify_zip(target,expected,records,LIMIT)
            report.update({'part':i,'parts':len(partitions),'strictlyBelow95MiB':True,'nativePngFiles':len(expected&native_paths),'xlsxFiles':len(expected&expected_workbooks)})
            parts.append(report)
        if union!=set(names):raise ValueError('ZIP parts do not equal the full archive')
        archive_index={'version':'V6.14','publishedCommit':commit,'complete':complete_report,'parts':parts,'partLimitBytesExclusive':LIMIT,'partsUnionEqualsComplete':True,'duplicateEntriesAcrossParts':0,
                       'extractionFR':'Extraire toutes les parties standard dans le même dossier, puis ouvrir index.html.'}
        report={**archive_index,'passed':True,'sourceMainCommit':BASE,'githubPullRequest':PR_URL,'nativePngFiles':126,'xlsxFiles':17,
                'originalProjectWorkbookHashesPreserved':16,'repositoryPayloadCount':len(files),'repositoryPayloadsReadDirectlyFromCommit':True,
                'repositoryPayloadsMatchPublishedCommit':True,'everyPayloadHashVerified':True,'offlineGalleryLinksVerified':links,
                'exactWorkbookPathsVerified':sorted(expected_workbooks),'exactNativePathsVerified':sorted(native_paths),
                'generatedWrapperPaths':sorted(WRAPPERS),'finalPromptsDocumentedV614':18,'finalPromptsUnrecoveredV613':21}
        (out/'SHA256_ARCHIVES.json').write_bytes(json_bytes(archive_index))
        (out/'SHA256_FICHIERS.json').write_bytes(checksums)
        (out/'LISEZ_MOI.txt').write_bytes(wrappers['LISEZ_MOI.txt'])
        (out/'pack-verification.json').write_bytes(json_bytes(report))
        print(json.dumps({'passed':True,'publishedCommit':commit,'nativePngFiles':126,'xlsxFiles':17,'complete':complete_report,'parts':parts,'offlineLinks':links},ensure_ascii=False))


if __name__=='__main__':
    main()
