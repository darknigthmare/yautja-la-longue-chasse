import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
export const DESKTOP_SOURCE_PATHS = ["app", "desktop", "public", "package.json", "package-lock.json", "tsconfig.json", "scripts/stamp-desktop-build.mjs", "scripts/package-desktop.mjs"];
const sha256 = file => new Promise((resolve, reject) => { const hash = createHash("sha256"); const stream = createReadStream(file); stream.on("data",chunk=>hash.update(chunk)); stream.on("error",reject); stream.on("end",()=>resolve(hash.digest("hex"))); });
export async function desktopSourceStamp() {
  const listed = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...DESKTOP_SOURCE_PATHS], { cwd: root, encoding: "utf8" });
  const names = [...new Set(listed.split("\0").filter(Boolean))].sort();
  const files = []; let cursor = 0;
  await Promise.all(Array.from({length:8},async()=>{
    while(cursor<names.length){const name=names[cursor++];const file=path.join(root,name);try{const stat=await fs.stat(file);if(stat.isFile())files.push({path:name,sha256:await sha256(file)});}catch(error){if(error.code!=="ENOENT")throw error;}}
  }));
  files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  return { schemaVersion: 1, sourceDigest: createHash("sha256").update(JSON.stringify(files)).digest("hex"), files };
}
export function cleanDesktopSourceCommit() {
  const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", ...DESKTOP_SOURCE_PATHS], {cwd:root,encoding:"utf8"});
  if(dirty.trim())throw new Error("Commit the desktop sources before packaging a release; working tree differs from HEAD.");
  return execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const stamp=await desktopSourceStamp();
  const before=process.argv.includes("--before");
  if(!before){const initial=JSON.parse(await fs.readFile(path.join(root,"tmp/desktop-build/source-before.json"),"utf8"));if(initial.sourceDigest!==stamp.sourceDigest)throw new Error("Desktop sources changed during build; rebuild before packaging.");}
  const destination=path.join(root,"tmp/desktop-build",before?"source-before.json":"source-stamp.json");await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,JSON.stringify(stamp,null,2)+"\n");
  console.log(JSON.stringify({sourceDigest:stamp.sourceDigest,files:stamp.files.length}));
}
