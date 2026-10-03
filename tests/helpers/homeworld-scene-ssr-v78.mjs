import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';

/** Execute the actual React scene without a bundler or disk output. Only CSS
 * module names are substituted; no gameplay or component function is mocked.
 * SSR verifies the rendered records, not pixels, hydration or browser layout. */
export function homeworldSceneSsrV78(root=process.cwd()){
 const base=path.resolve(root),requirePackage=createRequire(path.join(base,'package.json')),cache=new Map();
 const React=requirePackage('react'),{renderToStaticMarkup}=requirePackage('react-dom/server');
 function load(file){
  const resolved=path.resolve(file);
  if(!resolved.startsWith(base+path.sep))throw Error('SSR import outside workspace: '+resolved);
  if(cache.has(resolved))return cache.get(resolved).exports;
  if(resolved.endsWith('.module.css'))return new Proxy({}, {get:(_target,key)=>key==='__esModule'?false:String(key)});
  const loadedModule={exports:{}};cache.set(resolved,loadedModule);
  if(resolved.endsWith('.json'))return loadedModule.exports=JSON.parse(fs.readFileSync(resolved,'utf8'));
  const code=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{fileName:resolved,compilerOptions:{
   target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,
  }}).outputText;
  const localRequire=specifier=>{
   if(specifier==='react'||specifier==='react/jsx-runtime')return requirePackage(specifier);
   if(!specifier.startsWith('.'))throw Error('Unsupported SSR dependency: '+specifier);
   const candidate=path.resolve(path.dirname(resolved),specifier),next=[candidate,candidate+'.ts',candidate+'.tsx',candidate+'.json'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
   if(!next)throw Error('Missing SSR source: '+candidate);
   return load(next);
  };
  new Function('require','module','exports',code)(localRequire,loadedModule,loadedModule.exports);
  return loadedModule.exports;
 }
 return{
  load:relative=>load(path.join(base,relative)),
  render:(relative,props)=>renderToStaticMarkup(React.createElement(load(path.join(base,relative)).default,props)),
 };
}
