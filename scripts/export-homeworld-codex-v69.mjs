import fs from 'node:fs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldElementCodexV64.ts','homeworldLifeV69.ts','homeworldVillageLifeV69.ts']);
fs.writeFileSync('docs/homeworld-placement-codex-v69.json',JSON.stringify({version:'V69',lore:'original project adaptation, not a canonical city map',
  convention:'ground x/y; screen y=y*sin(35deg)-z; uniform upright scale; adult100u approximately2.3m as production convention',
  city:api.HOMEWORLD_ELEMENT_CODEX_V64,residents:api.HOMEWORLD_RESIDENTS_V69,villageLife:api.HOMEWORLD_VILLAGE_LIFE_V69},null,2)+'\n');
console.log(JSON.stringify({cityElements:api.HOMEWORLD_ELEMENT_CODEX_V64.length,cityResidents:api.HOMEWORLD_RESIDENTS_V69.length,villages:Object.keys(api.HOMEWORLD_VILLAGE_LIFE_V69).length}));
