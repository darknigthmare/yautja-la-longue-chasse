import fs from 'node:fs/promises';
const file='docs/v61-stage-layout.json',layout=JSON.parse(await fs.readFile(file,'utf8'));
const placement=(x,bottom,height)=>({x,bottom,height,parallax:.05,renderPass:'P2',anchor:'world'});
layout.stages['arena-146-primal-hunt-pilot-ruins']={notes:'Original environmental mechanisms and vegetation; not verified 1:1 Artifact or fauna. On rear dais, lower moss ledge, and right ribbed stone wall. Review through actual compositor before release.',events:{
 'ambient-01':{name:'Dais ancien — colliers mécaniques',placement:placement(652,247,48)},
 'ambient-02':{name:'Fougères sur corniche — souffle humide',placement:placement(579,317,80)},
 'ambient-03':{name:'Porte de pierre — iris et poussière',placement:placement(823,304,90)},
}};
await fs.writeFile(file,JSON.stringify(layout,null,2)+'\n');
