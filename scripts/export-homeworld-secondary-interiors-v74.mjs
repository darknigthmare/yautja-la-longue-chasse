import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';

const output=process.env.V74_INTERIOR_EXPORT_DIR??'work-local/v74/interiors';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldInteriorsV64.ts','homeworldSecondaryInteriorCodexV74.ts','homeworldFurnitureV72.ts']);
const rooms=api.HOMEWORLD_INTERIORS_V64.filter(room=>room.secondaryLayoutV74);
const nativeBytes=await fs.readFile('public/game/homeworld/v72/civic-furniture-kit.png');
const manifest={version:'V74',projection:'unprojected x/y; renderer applies y*sin(35deg) exactly once',
  source:{src:'/game/homeworld/v72/civic-furniture-kit.png',sha256:crypto.createHash('sha256').update(nativeBytes).digest('hex'),unchanged:true},
  stats:{rooms:rooms.length,civic:rooms.filter(r=>r.kind==='civic').length,domestic:rooms.filter(r=>r.kind==='domestic').length,
    zones:rooms.reduce((n,r)=>n+r.zones.length,0),partitions:rooms.reduce((n,r)=>n+r.partitions.length,0),passages:rooms.reduce((n,r)=>n+r.secondaryLayoutV74.passages.length,0),
    independentFurniture:rooms.reduce((n,r)=>n+r.furniture.length,0),legacyProps:rooms.reduce((n,r)=>n+r.props.length,0),codex:api.HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74.length},
  limits:['Public/original interior adaptation; no canonical Yautja customs asserted.','Six principal V73 wings remain byte-identical.','No floor, facade, entrance or existing service is enlarged or unlocked.','No new loot, domestic service, NPC resident or complete animation sheet generated.'],
  rooms:rooms.map(room=>({...room,furniture:room.furniture.map(item=>({...item,footprint:api.homeworldFurnitureFootprintV72(item),art:api.HOMEWORLD_FURNITURE_ART_V72[item.artId]}))})),
  codex:api.HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74};
await fs.writeFile(output+'/plans.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output,...manifest.stats,sha256:manifest.source.sha256}));
