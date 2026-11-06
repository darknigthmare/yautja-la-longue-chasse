import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const port = Math.max(1024, Math.min(65535, Number(process.env.PREY_DLC_PORT || process.argv[2] || 4319)));
const mime = new Map([[".html","text/html; charset=utf-8"],[".js","text/javascript; charset=utf-8"],[".css","text/css; charset=utf-8"],[".json","application/json; charset=utf-8"],[".svg","image/svg+xml; charset=utf-8"],[".md","text/markdown; charset=utf-8"]]);

function safeFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0] || "/");
  const rel = clean === "/" ? "OUVRIR_PREY_DLC_V0_6.html" : clean.replace(/^\/+/, "");
  const candidate = resolve(root, normalize(rel));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  return candidate;
}

const server = createServer((req,res) => {
  const cors={"access-control-allow-origin":"*","access-control-allow-methods":"GET,OPTIONS","access-control-allow-headers":"content-type"};
  if(req.method==="OPTIONS"){res.writeHead(204,cors);res.end();return;}
  if (req.url === "/__prey/status") {
    res.writeHead(200,{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
    res.end(JSON.stringify({ok:true,id:"yautja.prey.1719",version:"0.6.0",saveSchema:6,chapters:37,challenges:37,mirrorDossiers:15,huntMarks:6,noiseStealth:true,mausoleum:true,root}));
    return;
  }
  if (req.url === "/__prey/descriptor") {
    res.writeHead(200,{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
    res.end(readFileSync(join(root,"integration","private-dlc-registry-v06.json")));
    return;
  }
  const file = safeFile(req.url || "/");
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404,{...cors,"content-type":"text/plain; charset=utf-8"});res.end("PREY DLC: fichier introuvable");return;
  }
  res.writeHead(200,{...cors,"content-type":mime.get(extname(file).toLowerCase())||"application/octet-stream","cache-control":"no-store","x-content-type-options":"nosniff"});
  res.end(readFileSync(file));
});
server.listen(port,"127.0.0.1",()=>console.log(`PREY V0.6 local bridge: http://127.0.0.1:${port}`));
