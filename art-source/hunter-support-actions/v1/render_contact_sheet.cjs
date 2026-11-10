#!/usr/bin/env node
'use strict';
// A labelled contact sheet of existing native-size PNGs; no new character art.
const fs=require('node:fs/promises');
const path=require('node:path');
const {assert}=require('./playback_core.js');
let sharp;
try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules','sharp'));}
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
async function renderContactSheet(folder,destination) {
  folder=path.resolve(folder || __dirname);
  destination=path.resolve(destination || path.join(folder,'Yautja_Survie_Equipement_Canopee_V1_Contact.png'));
  const manifest=JSON.parse(await fs.readFile(path.join(folder,'animations.json'),'utf8'));
  const columns=4,margin=24,gap=18,heading=108,cardWidth=manifest.preview.stageWidth,cardHeight=manifest.preview.stageHeight+76;
  const rows=Math.ceil(manifest.actions.length/columns),width=margin*2+columns*cardWidth+(columns-1)*gap,height=heading+rows*cardHeight+(rows-1)*gap+margin;
  const choice={idle:8,aim_enter:14,aim_hold:8,aim_exit:8,canopy_attach:13,canopy_hold:8,canopy_release:8,canopy_swing:6,aerial_boost:8,scan:10,cloak_on:8,cloak_off:8,heal:12,second_wind:{page:1,number:12},hurt:7,death:{page:1,number:16}};
  const layers=[],captions=[],selections=[];
  for(const [index,action] of manifest.actions.entries()) {
    const phase=action.phases.action || action.phases.loop || action.phases.enter;
    const selected=choice[action.id] || 8;
    const clip=manifest.clips.find(item=>item.id===phase.clips[typeof selected==='number' ? 0 : selected.page]);
    assert(clip,`${action.id}: representative source page is unavailable.`);
    const frame=clip.frames[(typeof selected==='number' ? selected : selected.number)-1];
    assert(frame,`${action.id}: representative source frame is unavailable.`);
    const x=margin+(index%columns)*(cardWidth+gap),y=heading+Math.floor(index/columns)*(cardHeight+gap);
    const left=Math.round(x+manifest.preview.padding+frame.drawOffset.x),top=Math.round(y+50+manifest.preview.padding+frame.drawOffset.y);
    assert(left>=x && top>=y+42 && left+frame.exportedFrameSize.width<=x+cardWidth && top+frame.exportedFrameSize.height<=y+cardHeight-24,`${action.id}: contact frame exceeds card.`);
    const sourceDrawings=new Set(Object.values(action.phases).flatMap(item=>item.clips)).size*16;
    captions.push(`<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="13" fill="#202d23" stroke="#3b4b35"/><text x="${x+20}" y="${y+30}" font-size="21" fill="#e9efdf">${escape(action.label)}</text><text x="${x+20}" y="${y+cardHeight-17}" font-size="12" fill="#b2c49f">${sourceDrawings} dessins · ${action.kind==='loop'?'boucle':'action ponctuelle'} · ${escape(clip.id)} #${frame.number}</text>`);
    layers.push({input:await fs.readFile(path.join(folder,frame.file)),left,top});
    selections.push({action:action.id,label:action.label,clip:clip.id,number:frame.number,file:frame.file,sha256:frame.sha256,sourceDrawings,drawOffset:frame.drawOffset,compositionPosition:{x:left,y:top}});
  }
  const background=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101a13"/><g font-family="sans-serif"><text x="24" y="28" font-size="12" letter-spacing="3" fill="#b8d992">YAUTJA · THE LONG HUNT</text><text x="24" y="69" font-size="35" font-weight="600" fill="#eff4e8">${manifest.actions.length} mouvements · ${manifest.frameCount} dessins</text><text x="${width-24}" y="69" text-anchor="end" font-size="14" fill="#b8caa8">Planche de contact · sources en revue</text>${captions.join('')}</g></svg>`);
  await sharp(background).composite(layers).png({compressionLevel:9}).toFile(destination);
  const report={schemaVersion:1,file:path.basename(destination),width,height,actions:manifest.actions.length,sourceDrawings:manifest.frameCount,shownDrawings:selections.length,composition:'One representative authored source PNG per action at native scale, with labelled neutral backing. Full sequences remain in the reader and MP4.',selections,artisticStatus:'draft',artisticApproval:false};
  await fs.writeFile(path.join(folder,'contact_sheet.json'),JSON.stringify(report,null,2)+'\n');
  return {file:report.file,width,height,actions:report.actions,sourceDrawings:report.sourceDrawings,shownDrawings:report.shownDrawings,artisticStatus:'draft',selectedLaterPagePoses:Object.fromEntries(selections.filter(item=>['death','second_wind'].includes(item.action)).map(item=>[item.action,{clip:item.clip,number:item.number}]))};
}
if(require.main===module)renderContactSheet(process.argv[2],process.argv[3]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={renderContactSheet};

