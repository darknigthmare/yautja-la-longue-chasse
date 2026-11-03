import { writeFile, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const icons=[
  ["visual","CORPS REPÉRÉ",'<ellipse cx="24" cy="24" rx="15" ry="9"/><circle cx="24" cy="24" r="4"/>'],
  ["radio","RADIO · CORPS",'<path d="M16 38V14l9-9M24 18a12 12 0 010 18M28 12a20 20 0 010 30"/>'],
  ["scent","ODEUR · CORPS",'<path d="M12 34c20-12-12-14 8-28M26 40c20-12-12-14 8-28"/>'],
  ["animal","RÉACTION ANIMALE",'<circle cx="24" cy="30" r="8"/><circle cx="13" cy="17" r="4"/><circle cx="25" cy="12" r="4"/><circle cx="37" cy="19" r="4"/>'],
];
const root=new URL("../public/game/assets/v112/discovery/",import.meta.url);
const svg=(id,label,geometry)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-labelledby="title"><title id="title">'+label+'</title><g fill="none" stroke="#e8d6a9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+geometry+'</g></svg>\n';
const check=process.argv.includes("--check");
if(!check)await mkdir(root,{recursive:true});
for(const [id,label,geometry] of icons){
  const path=new URL(id+".svg",root),content=svg(id,label,geometry);
  if(check){if(await readFile(path,"utf8")!==content)throw new Error("Generated discovery signal drift: "+fileURLToPath(path));}
  else await writeFile(path,content);
}
console.log("V112 discovery signals: "+icons.length+" original deterministic SVGs "+(check?"verified":"generated")+".");
