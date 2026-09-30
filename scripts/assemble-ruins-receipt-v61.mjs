import fs from 'node:fs/promises';
const stageId='arena-146-primal-hunt-pilot-ruins';
const groupedPath=`docs/v61-generation/${stageId}.json`;
const grouped=JSON.parse(await fs.readFile(groupedPath,'utf8'));
for(const id of ['ambient-02','ambient-03']){
 const file=`docs/v61-generation/${stageId}-${id}.json`;
 const asset=JSON.parse(await fs.readFile(file,'utf8'));
 if(asset.frames.some(f=>f.borderPixels||f.borderSolidPixels))throw Error('Unexpected border pixels');
 asset.sourceCells=[`10_VIE_DES_STAGES!E${id==='ambient-02'?147:148}`];
 asset.status='accepted';
 asset.visualNotes=id==='ambient-02'?'Six complete native drawings inspected: muted ferns bending with wind, root and porous stone ledge remain coherent. All borders transparent. Original vegetation alternative; canonical fauna remains open.':'Six complete native drawings inspected: fixed ribbed stone frame and mechanical iris opening/closing, no characters or human machinery. All borders transparent. Original door design, not claimed 1:1.';
 await fs.writeFile(file,JSON.stringify(asset,null,2)+'\n');
 grouped.assets=grouped.assets.filter(a=>a.id!==id).concat(asset);
}
grouped.assets.sort((a,b)=>a.id.localeCompare(b.id));
await fs.writeFile(groupedPath,JSON.stringify(grouped,null,2)+'\n');
console.log(grouped.assets.map(a=>({id:a.id,status:a.status,sha256:a.sha256})));
