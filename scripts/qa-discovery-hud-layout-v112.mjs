#!/usr/bin/env node
/** Chrome font/layout check of the native badge, separate from gameplay QA. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

assert.notEqual(process.env.SITES_MANAGED_LINUX_CONTAINER,'1','Portable reference browser only.');
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'docs/qa/v112-discovery-hud');
await mkdir(out,{recursive:true});
const sourcePath=path.join(root,'app/game/discoverySignalsV112.ts'),source=await readFile(sourcePath);
const bundle=await build({stdin:{contents:'export * from "./app/game/discoverySignalsV112";',resolveDir:root,loader:'ts'},bundle:true,write:false,format:'iife',globalName:'Badge',platform:'browser',logLevel:'silent'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const cases=[];
try{
  for(const width of [320,768,1280])for(const dpr of [1,2]){
    const context=await browser.newContext({viewport:{width,height:720},deviceScaleFactor:dpr});
    const page=await context.newPage();await page.setContent('<style>body{margin:0;background:#050b0a}canvas{display:block;width:100%;height:auto}</style><canvas width="1280" height="720"></canvas>');
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
    const screenshot='label-matrix-'+width+'-dpr'+dpr+'.png';await page.screenshot({path:path.join(out,screenshot),fullPage:true});
    const rows=measured.rows.map(r=>({...r,gapCssPx:r.gapLogicalPx*width/1280,gapDevicePx:r.gapLogicalPx*width/1280*dpr}));
    assert.ok(rows.every(r=>r.insideBadge&&r.noVerticalOverlap&&r.withinNativeTextWidth),'native two-line text bounds at '+width+'/'+dpr);
    cases.push({viewport:{width,height:720},deviceScaleFactor:dpr,...measured,rows,screenshot});await context.close();
  }
  await writeFile(path.join(out,'layout.json'),JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),
    sourcePath:'app/game/discoverySignalsV112.ts',sourceSha256:createHash('sha256').update(source).digest('hex'),browser:browser.version(),
    qualification:'CHROME_TEXT_BOUNDS_PASS',cases,
    scope:'12 cause/response combinations at three CSS widths and two DPR values, native draw function and real Chrome TextMetrics. These are explicit layout fixtures, not live encounters.',
    limits:['Geometric non-overlap under uniform Canvas scaling does not certify human reading on a phone','No physical display or controller qualification','Native encounter captures are recorded separately']},null,2)+'\n');
  console.log('Chrome native badge text bounds PASS: 6 configurations, 72 combinations.');
}finally{await browser.close();}
