import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import sharp from "sharp";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const base=path.join(root,"art-source/v27/known-yautja");
const read=name=>JSON.parse(fs.readFileSync(path.join(base,name),"utf8"));
const review=read("review.json"), registration=read("frame-registration.json");
const entries=[];
for(const item of review.entries){
 const registered=registration.entries.find(entry=>entry.id===item.id);
 if(!registered)throw Error("Missing registration: "+item.id);
 const sourcePath=path.resolve(root,registered.source.path);
 if(!sourcePath.startsWith(path.join(root,"art-source")+path.sep))throw Error("Source outside art-source");
 const bytes=fs.readFileSync(sourcePath),sha256=crypto.createHash("sha256").update(bytes).digest("hex");
 if(sha256!==registered.source.sha256)throw Error("Source changed: "+item.id);
 const metadata=await sharp(bytes).metadata();
 if(metadata.width!==registered.source.width||metadata.height!==registered.source.height)throw Error("Dimensions changed");
 const frames=registered.frames.map(frame=>({index:frame.index,stage:frame.stage,rect:frame.rectPx,pivot:[frame.pivotPx.x,frame.pivotPx.y],supportPoints:frame.supportPoints}));
 for(const frame of frames){
  const [x,y,w,h]=frame.rect;
  if(![x,y,w,h].every(Number.isSafeInteger)||x<0||y<0||w<3||h<3||x+w>metadata.width||y+h>metadata.height)throw Error("Invalid rectangle "+item.id);
  if(!frame.pivot.every(Number.isFinite)||frame.pivot[0]<0||frame.pivot[1]<0||frame.pivot[0]>w||frame.pivot[1]>h)throw Error("Invalid pivot");
 }
 for(let a=0;a<frames.length;a++)for(let b=a+1;b<frames.length;b++){
  const [x,y,w,h]=frames[a].rect,[xx,yy,ww,hh]=frames[b].rect;
  if(x<xx+ww&&x+w>xx&&y<yy+hh&&y+h>yy)throw Error("Overlapping rectangles: "+item.id);
 }
 entries.push({...item,source:{path:registered.source.path,sha256,bytes:bytes.length,width:metadata.width,height:metadata.height,hasAlpha:!!metadata.hasAlpha},frames});
}
const manifest={schemaVersion:1,scope:review.scope,sourceMutation:false,completion:review.completion,entries};
const serialized=JSON.stringify(manifest,null,2)+"\n";
const manifestPath=path.join(base,"manifest.json");
if(process.argv.includes("--check")){
 const publicDirectory=path.join(root,"public/game/assets/v27/sprite-review");
 for(const entry of entries){
  const published=fs.readFileSync(path.join(publicDirectory,entry.id+".png"));
  if(crypto.createHash("sha256").update(published).digest("hex")!==entry.source.sha256)throw Error("Published source differs: "+entry.id);
 }
 if(fs.readFileSync(path.join(publicDirectory,"manifest.json"),"utf8")!==serialized)throw Error("Published manifest stale");
 if(fs.readFileSync(manifestPath,"utf8")!==serialized)throw Error("V27 manifest stale; rebuild preview");
 console.log("V27: "+entries.length+" sheets / "+entries.reduce((n,e)=>n+e.frames.length,0)+" registered cells; hashes and rectangles verified; 0 gameplay clips validated");
 process.exit(0);
}
fs.writeFileSync(manifestPath,serialized);
const bundled=await build({entryPoints:[path.join(root,"scripts/known-yautja-preview-v27.client.ts")],bundle:true,format:"iife",platform:"browser",target:"es2022",write:false,minify:true});
const data=entries.map(entry=>({...entry,image:"data:image/png;base64,"+fs.readFileSync(path.join(root,entry.source.path)).toString("base64")}));
const template=fs.readFileSync(path.join(root,"scripts/known-yautja-preview-v27.html"),"utf8");
const html=template.replace("/*__SPRITE_DATA__*/","window.__yautjaReviewEntries="+JSON.stringify(data).replaceAll("<","\\u003c")+";").replace("/*__SPRITE_CLIENT__*/",bundled.outputFiles[0].text.replaceAll("</script","<\\/script"));
const output=path.join(root,"outputs/known-yautja-v27");fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,"preview.html"),html);
console.log(path.join(output,"preview.html"));

// Publish a review-only surface. These files do not enter the gameplay atlas registry.
const publicOutput=path.join(root,"public/game/assets/v27/sprite-review");
fs.mkdirSync(publicOutput,{recursive:true});
const publicData=entries.map(entry=>{
 const filename=entry.id+".png";
 fs.copyFileSync(path.join(root,entry.source.path),path.join(publicOutput,filename));
 return {...entry,image:filename};
});
const publicHtml=template.replace("/*__SPRITE_DATA__*/","window.__yautjaReviewEntries="+JSON.stringify(publicData).replaceAll("<","\\u003c")+";").replace("<script>/*__SPRITE_CLIENT__*/</script>",'<script src="review.js"></script>');
fs.writeFileSync(path.join(publicOutput,"index.html"),publicHtml);
fs.writeFileSync(path.join(publicOutput,"review.js"),bundled.outputFiles[0].text);
fs.writeFileSync(path.join(publicOutput,"manifest.json"),serialized);
console.log("Public review only: /game/assets/v27/sprite-review/index.html");
