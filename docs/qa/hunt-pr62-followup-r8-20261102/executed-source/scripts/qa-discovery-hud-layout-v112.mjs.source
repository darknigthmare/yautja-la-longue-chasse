#!/usr/bin/env node
/** Chrome font/layout check of the native badge, separate from gameplay QA. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.resolve(root,process.env.YAUTJA_DISCOVERY_HUD_OUTPUT??'docs/qa/hunt-pr62-followup-r8-20261102/hud-layout');
await mkdir(out,{recursive:true});
const sourcePath=path.join(root,'app/game/discoverySignalsV112.ts'),source=await readFile(sourcePath);
const bundle=await build({stdin:{contents:'export * from "./app/game/discoverySignalsV112";',resolveDir:root,loader:'ts'},bundle:true,write:false,format:'iife',globalName:'Badge',platform:'browser',logLevel:'silent'});
const digest=value=>createHash('sha256').update(value).digest('hex');
const fixture='<style>body{margin:0;background:#050b0a}canvas{display:block;width:100%;height:auto}</style><canvas width="1280" height="720"></canvas>';
await writeFile(path.join(out,'native-badge.bundle.js'),bundle.outputFiles[0].contents);
await writeFile(path.join(out,'fixture.html'),fixture);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??process.env.AUDIT_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const cases=[],pageErrors=[],consoleErrors=[];
try{
  for(const width of [320,768,1280])for(const dpr of [1,2]){
    const context=await browser.newContext({viewport:{width,height:720},deviceScaleFactor:dpr});
    const page=await context.newPage();
    page.on('pageerror',error=>pageErrors.push(String(error)));
    page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
    await page.setContent(fixture);
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    const measured=await page.evaluate(()=>{
      const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),layout=Badge.DISCOVERY_HUD_LAYOUT_V112;
      ctx.fillStyle='#050b0a';ctx.fillRect(0,0,1280,720);
      const rows=[];let index=0;
      for(const channel of ['visual','radio','scent'])for(const response of ['investigate','avoid','inspect','guard']){
        const reaction={channel,response,actorId:'layout-only',corpseId:'layout-only',startedAt:0,until:7};
        const x=160+(index%4)*320,y=120+Math.floor(index/4)*210;index++;
        Badge.drawDiscoverySignalV112(ctx,reaction,x,y);const text=Badge.discoverySignalTextV112(reaction);
        ctx.font=`700 ${layout.causeFontPx}px sans-serif`;const cause=ctx.measureText(text.cause);
        ctx.font=`600 ${layout.responseFontPx}px sans-serif`;const request=ctx.measureText(text.response);
        const causeTop=layout.causeBaseline-cause.actualBoundingBoxAscent,causeBottom=layout.causeBaseline+cause.actualBoundingBoxDescent;
        const responseTop=layout.responseBaseline-request.actualBoundingBoxAscent,responseBottom=layout.responseBaseline+request.actualBoundingBoxDescent;
        rows.push({channel,response,text,causeWidth:cause.width,responseWidth:request.width,causeTop,causeBottom,responseTop,responseBottom,
          gapLogicalPx:responseTop-causeBottom,insideBadge:causeTop>=-layout.height/2&&responseBottom<=layout.height/2,
          noVerticalOverlap:causeBottom<responseTop,withinNativeTextWidth:cause.width<=layout.textMaximumWidth&&request.width<=layout.textMaximumWidth});
      }
      return {layout,rows,logicalCanvas:{width:1280,height:720},cssCanvasWidth:canvas.getBoundingClientRect().width};
    });
    const screenshot='label-matrix-'+width+'-dpr'+dpr+'.png',capture=await page.screenshot({path:path.join(out,screenshot),fullPage:true});
    const rows=measured.rows.map(r=>({...r,gapCssPx:r.gapLogicalPx*width/1280,gapDevicePx:r.gapLogicalPx*width/1280*dpr}));
    assert.ok(rows.every(r=>r.insideBadge&&r.noVerticalOverlap&&r.withinNativeTextWidth),'native two-line text bounds at '+width+'/'+dpr);
    cases.push({viewport:{width,height:720},deviceScaleFactor:dpr,...measured,rows,screenshot,screenshotBytes:capture.length,screenshotSha256:digest(capture)});await context.close();
  }
  assert.deepEqual(pageErrors,[]);assert.deepEqual(consoleErrors,[]);
  assert.equal(digest(await readFile(sourcePath)),digest(source),'Native HUD source must stay unchanged during the run');
  await writeFile(path.join(out,'layout.json'),JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),
    sourcePath:'app/game/discoverySignalsV112.ts',sourceSha256:digest(source),sourceUnchangedDuringRun:true,browser:browser.version(),
    driverSha256:digest(await readFile(fileURLToPath(import.meta.url))),rawExecutedBundle:{path:'native-badge.bundle.js',bytes:bundle.outputFiles[0].contents.length,sha256:digest(bundle.outputFiles[0].contents)},fixtureSha256:digest(fixture),pageErrors,consoleErrors,
    qualification:'CHROME_TEXT_BOUNDS_PASS',cases,
    scope:'12 cause/response combinations at three CSS widths and two DPR values, native draw function and real Chrome TextMetrics. These are explicit layout fixtures, not live encounters.',
    limits:['Geometric non-overlap under uniform Canvas scaling does not certify human reading on a phone','No physical display or controller qualification','Native encounter captures are recorded separately']},null,2)+'\n');
  console.log('Chrome native badge text bounds PASS: 6 configurations, 72 combinations.');
}finally{await browser.close();}
