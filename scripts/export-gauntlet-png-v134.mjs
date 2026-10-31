import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const root=path.resolve("public/game/assets/v134/gauntlets/jungle-hunter");
const target=path.resolve(process.argv[2] && process.argv[2]!=="--check"
  ? process.argv[2] : "outputs/gauntlet-v134");
const checkOnly=process.argv.includes("--check");
const layers=[
"01-arm.svg","02-housing.svg","03-display-glyphs.svg","04-hinge.svg",
"05-lid.svg","06-emitter.svg","07-beam.svg",
];
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
async function main(){
  const records=[];
  const images=[];
  for(const name of layers){
    const data=await readFile(path.join(root,name));
    const source=data.toString("utf8");
    if(!source.includes('<svg ')||!source.includes('viewBox="0 0 540 290"'))
      throw new Error(`Invalid SVG source layer ${name}`);
    if(source.includes("1:1-certified"))throw new Error(`Misleading artwork certification ${name}`);
    if(name==="03-display-glyphs.svg"){
      const cells=(source.match(/<rect x="200"/g)||[]).length;
      if(cells!==5)throw new Error(`Expected five horizontal display glyph cells, got ${cells}`);
    }
    const png=name.replace(".svg",".png");
    records.push({layer:name,sourceSha256:digest(data),png,validation:"art-blockout-not-reviewed"});
    if(!checkOnly)images.push({
      input:await sharp(data).resize({width:1080,height:580,fit:"fill"}).png().toBuffer(),
      name:png,
    });
  }
  if(checkOnly){process.stdout.write(`OK: ${records.length} distinct authoring layers, 5 horizontal glyph rows, no 1:1 claim\n`);return;}
  await mkdir(target,{recursive:true});
  for(const item of images){
    await writeFile(path.join(target,item.name),item.input);
    records.find(x=>x.png===item.name).outputSha256=digest(item.input);
  }
  const background={create:{width:1080,height:580,channels:4,background:"#00000000"}};
  const preview=await sharp(background)
    .composite(images.map(item=>({input:item.input,left:0,top:0})))
    .png().toBuffer();
  await writeFile(path.join(target,"jungle-hunter-open-composite.png"),preview);
  records.push({layer:"composite",png:"jungle-hunter-open-composite.png",outputSha256:digest(preview),validation:"art-blockout-not-reviewed"});
  await writeFile(path.join(target,"manifest.json"),
    JSON.stringify({version:134,identity:"jungle-hunter",stage:"art-blockout-not-film-validated",
      capture:"vector-to-png reproducible at 1080x580",sourceFramesApproved:false,
      source:"Predator (1987) — five red glyph rows from screen references; 1:1 ratios need film-frame review",
      records},null,2)+"\n");
  const result=await stat(path.join(target,"manifest.json"));
  process.stdout.write(`V134: ${images.length} alpha PNG layers and source-tracked preview generated; manifest ${result.size} bytes\n`);
}
main().catch(error=>{process.stderr.write(String(error)+"\n");process.exitCode=1;});
