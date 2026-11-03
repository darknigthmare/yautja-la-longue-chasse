/** Real menu hook, native controls and an emulated controller. No game assets or saves. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/menu-controls-v94.fixture.tsx'],bundle:true,write:false,jsx:'automatic',platform:'browser'});
const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>Menu control QA</title><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
const server=createServer((request,response)=>{
  if(request.url==='/'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end(html);}
  else if(request.url==='/fixture.js'){response.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});response.end(bundle.outputFiles[0].contents);}
  else{response.writeHead(404);response.end();}
});
let browser;
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();assert.ok(address&&typeof address==='object');
  browser=await chromium.launch(process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{});
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/`);await page.bringToFront();await page.waitForSelector('#range');
  const results=await page.evaluate(()=>window.__runMenuControlsQaV94());
  console.log(JSON.stringify({scope:'Actual menu controller hook and native inputs; emulated pad, not a hardware or full-game test',results,errors},null,2));
  assert.equal(results.length,10);assert.equal(results.filter(item=>item.status!=='PASS').length,0);assert.deepEqual(errors,[]);
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
