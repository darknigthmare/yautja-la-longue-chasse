import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {createHash} from "node:crypto";

/** V135: separately export 4 source layers for each of four named gauntlets.
 * These are self-authored studies, not certified 1:1 props. No external binary assets. */
const root=path.resolve("public/game/assets/v135/gauntlets");
const target=path.resolve(process.argv[2] && process.argv[2]!=="--check"?
  process.argv[2]:"outputs/gauntlet-v135");
const checkOnly=process.argv.includes("--check");
const models=["city-hunter","wolf","feral","dek"];
const layers=["01-forearm.svg","02-shell.svg","03-panel.svg","04-cover.svg"];
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
const documents=[];
async function main(){
  for(const model of models){
    const parts=[];
    for(const name of layers){
      const source=await readFile(path.join(root,model,name));
      const xml=source.toString("utf8");
      if(!xml.includes('<svg xmlns="http://www.w3.org/2000/svg"')||
         !xml.includes('viewBox="0 0 540 290"')||
         !xml.includes('NOT a certified 1:1'))
        throw new Error(`Invalid or misrepresented source ${model}/${name}`);
      parts.push({name,source:xml,sourceHash:digest(source)});
    }
    const glyph=parts[2].source;
    if(model==="city-hunter" && (glyph.match(/<rect x="/g)||[]).length-1!==4)
      throw new Error("City Hunter must use four source-guided vertical screen cells");
    if(model==="wolf" && (glyph.match(/<rect x="/g)||[]).length-1!==5)
      throw new Error("Wolf must use five distinct vertical glyph cells");
    if(model==="feral" && (!glyph.includes("etched")&&!glyph.includes('stroke="#664b31"')))
      throw new Error("Feral's bone/etched control lacks definition");
    if(model==="dek" && !glyph.includes('<circle cx="287" cy="151"'))
      throw new Error("Dek circular scan lens is absent");
    const record={id:model,stage:"unapproved-film-informed-art-study",layers:[]};
    if(!checkOnly)await mkdir(path.join(target,model),{recursive:true});
    const pngs=[];
    for(const item of parts){
      const png=item.name.replace(".svg",".png");
      const rendered=!checkOnly?await sharp(Buffer.from(item.source))
        .resize({width:1080,height:580,fit:"fill"}).png().toBuffer():null;
      if(rendered){
        await writeFile(path.join(target,model,png),rendered);
        pngs.push({name:png,buffer:rendered});
      }
      record.layers.push({source:item.name,sourceSha256:item.sourceHash,
        png:png,outputSha256:rendered?digest(rendered):null});
    }
    if(!checkOnly){
      const composite=await sharp({create:{width:1080,height:580,channels:4,background:"#00000000"}})
        .composite(pngs.map(x=>({input:x.buffer,left:0,top:0}))).png().toBuffer();
      await writeFile(path.join(target,model,`${model}-closed-composite.png`),composite);
      record.compositeSha256=digest(composite);
    }
    documents.push(record);
  }
  if(checkOnly){console.log("V135: four distinct families, 16 SVG layers, source geometry verified");return;}
  const meta={schema:135,modelCount:4,independentLayers:16,
    artisticValidation:"unapproved; frame-by-frame checks mandatory",
    oneToOneCertified:0,sourceRenders:documents};
  await writeFile(path.join(target,"manifest.json"),JSON.stringify(meta,null,2)+"\n");
  const bytes=(await stat(path.join(target,"manifest.json"))).size;
  console.log(`V135: 16 independent alpha PNGs, 4 composites; manifest ${bytes} bytes`);
}
main().catch(err=>{console.error(String(err));process.exitCode=1;});
