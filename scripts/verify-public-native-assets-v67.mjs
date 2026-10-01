import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base=process.env.V67_PUBLIC_BASE??'https://yautja-la-longue-chasse.vercel.app';
const output=process.env.V67_PUBLIC_ASSET_REPORT??'docs/v67-public-native-assets.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=await Promise.all(['ash-causeway-vista','glass-processional-vista','processional-bridge'].map(async id=>{
 const asset='/game/homeworld/v67/'+id+'.png',local=await fs.readFile('public'+asset);
 const response=await fetch(new URL(asset,base),{signal:AbortSignal.timeout(60000)}),remote=Buffer.from(await response.arrayBuffer());
 return {asset,status:response.status,bytes:remote.length,contentType:response.headers.get('content-type'),localSha256:sha(local),remoteSha256:sha(remote),match:response.ok&&response.headers.get('content-type')?.includes('image/png')&&sha(local)===sha(remote)};
}));
const report={status:checks.every(c=>c.match)?'PASS':'FAIL',base,checkedAt:new Date().toISOString(),checks};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');assert.equal(report.status,'PASS');console.log({status:report.status,assets:checks.length});
