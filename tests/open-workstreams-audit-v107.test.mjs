import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,verifyOpenWorkstreamsAuditV107} from '../scripts/check-open-workstreams-audit-v107.mjs';

const source=()=>fs.readFile(path.join(ROOT,'docs/v107-open-workstreams-audit.json'),'utf8').then(JSON.parse);

test('all77 original open rows and eight families are covered without granting a runtime validation',async()=>{
 const result=await verifyOpenWorkstreamsAuditV107();assert.equal(result.result,'PASS_AUDIT_STRUCTURE');assert.equal(result.trackedOpenItems,77);assert.equal(result.originalV6Sheets,139);assert.equal(result.runtimeOrBrowserValidationGranted,false);
});

test('missing rows, forged source cells, duplicate IDs and an audit closure are rejected',async()=>{
 for(const mutate of [value=>value.items.pop(),value=>value.items[0].source='02_PERSONNAGES!A999:V999',value=>value.items[1].id=value.items[0].id,value=>value.items[0].auditStatus='VALIDE_CIBLE',value=>value.families[0].count=6]){
  const value=await source();mutate(value);await assert.rejects(verifyOpenWorkstreamsAuditV107(value));
 }
});

test('the original V6 hash and supplemental Homeworld counts cannot silently become delivery claims',async()=>{
 for(const mutate of [value=>value.supplementalHomeworld.status='TERMINE',value=>value.supplementalHomeworld.sourceWorkbookSha256='0'.repeat(64),value=>value.supplementalHomeworld.sourceDesignCounts.allDomainsScenes=177,value=>value.supplementalHomeworld.artTarget.entries=0]){
  const value=await source();mutate(value);await assert.rejects(verifyOpenWorkstreamsAuditV107(value));
 }
});


test('the two V79 references remain partial right-facing drawings rather than missing identities or complete animated kits',async()=>{
 for(const mutate of [value=>delete value.items.find(item=>item.id==='add-last-hunt-super').assessmentV107,value=>value.items.find(item=>item.id==='add-avp-classic').assessmentV107.nativeFacings.push('left'),value=>value.items.find(item=>item.id==='add-last-hunt-super').assessmentV107.animated=true,value=>value.families.find(item=>item.id==='pit-roster-kits').unresolvedIdentityAndArtFiles=6]){const value=await source();mutate(value);await assert.rejects(verifyOpenWorkstreamsAuditV107(value));}
});
