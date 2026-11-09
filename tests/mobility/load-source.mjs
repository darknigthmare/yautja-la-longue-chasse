import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import ts from 'typescript';
export function mobilitySourceLoader(root=process.cwd()){
 const cache=new Map();const requirePackage=createRequire(path.join(root,'package.json'));
 const load=file=>{const resolved=path.resolve(root,file);if(cache.has(resolved))return cache.get(resolved).exports;
  if(resolved.endsWith('.json'))return JSON.parse(fs.readFileSync(resolved,'utf8'));
  const m={exports:{}};cache.set(resolved,m);
  const code=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{fileName:resolved,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const req=s=>{if(!s.startsWith('.'))return requirePackage(s);const c=path.resolve(path.dirname(resolved),s),p=[c,c+'.ts',c+'.json'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());if(!p)throw Error('Missing source '+c);return load(p);};
  new Function('require','module','exports',code)(req,m,m.exports);return m.exports;};
 return load;
}
