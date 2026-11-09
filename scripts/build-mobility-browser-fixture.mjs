/** Dependency-locked test bundler: no downloads, no replacement of gameplay functions. */
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import ts from 'typescript';
const root=process.cwd(),out=path.join(root,'outputs/qa-mobility-native'),requirePackage=createRequire(path.join(root,'package.json'));
const modules=new Map(),styles=[];
function resolve(spec,from){if(!spec.startsWith('.'))return requirePackage.resolve(spec);const p=path.resolve(path.dirname(from),spec);const f=[p,p+'.ts',p+'.tsx',p+'.json',p+'.js'].find(v=>fs.existsSync(v)&&fs.statSync(v).isFile());if(!f)throw Error('Unresolved '+p);return f;}
function add(file){if(modules.has(file))return modules.get(file).id;const id=modules.size,record={id,code:'',map:{}};modules.set(file,record);const source=fs.readFileSync(file,'utf8');
 if(file.endsWith('.css')){styles.push(source);const names=Object.fromEntries([...source.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m=>[m[1],m[1]]));record.code='module.exports='+JSON.stringify(names);return id;}
 if(file.endsWith('.json')){record.code='module.exports='+source;return id;}
 record.code=/\.tsx?$/.test(file)?ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText:source;
 for(const m of record.code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g))record.map[m[1]]=add(resolve(m[1],file));return id;
}
const entry=add(path.join(root,'tests/mobility/browser-entry.tsx'));
const output='const process={env:{NODE_ENV:"production"}};const M={'+[...modules.values()].map(m=>JSON.stringify(m.id)+':function(require,module,exports){\n'+m.code+'\n}').join(',')+'};const D='+JSON.stringify(Object.fromEntries([...modules.values()].map(m=>[m.id,m.map])))+';const C={};function req(id){if(C[id])return C[id].exports;const m=C[id]={exports:{}};M[id](name=>req(D[id][name]),m,m.exports);return m.exports;}req('+entry+');';
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'app.js'),output);fs.writeFileSync(path.join(out,'style.css'),'body{margin:0;background:#0a1115;font-family:system-ui,sans-serif}*{box-sizing:border-box}'+styles.join('\n'));
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script></html>');
console.log(JSON.stringify({modules:modules.size,bytes:output.length,path:out}));
