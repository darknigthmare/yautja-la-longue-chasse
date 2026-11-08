import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = new URL('./', import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', root), 'utf8'));
const actors = JSON.parse(await fs.readFile(new URL('actors/manifest.json', root), 'utf8'));
const assets = [...manifest.assets, ...actors.assets];
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const figures = assets.map(asset => {
  const src = '../../../public' + asset.src;
  return `<figure><div class="stage"><img src="${escape(src)}" alt="${escape(asset.label)}"></div><figcaption>${escape(asset.label)}<small>${asset.sourceWidth} × ${asset.sourceHeight} px · PNG transparent</small></figcaption></figure>`;
}).join('\n');
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Modules et compagnons</title><style>
*{box-sizing:border-box} body{margin:0;padding:28px;background:#0b1218;color:#e9eeee;font:16px/1.45 Arial,sans-serif} h1{font-size:25px;margin:0 0 7px} p{color:#aebfc7;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px} figure{margin:0;background:#15212a;border:1px solid #3f4d55;border-radius:8px;overflow:hidden}.stage{height:265px;display:flex;justify-content:center;align-items:center;background:linear-gradient(90deg,#e4e9e5 50%,#27323c 50%)}img{display:block;max-width:240px;max-height:240px;object-fit:contain}figcaption{padding:12px 14px;font-weight:600;min-height:68px}small{display:block;color:#acbdc5;font-size:11px;font-weight:normal;margin-top:5px}footer{margin-top:20px;color:#aebfc7;font-size:13px}
</style><body><h1>Modules personnels, habitats et compagnons</h1><p>Dix modules et trois acteurs. Chaque sprite est montré sur un fond clair et sombre, à une dimension maximale de 240 px. Un seul état natif par asset.</p><div class="grid">${figures}</div><footer>Créations de jeu d'après la bible. Les occupants sont rendus séparément. Revue artistique humaine et contrôle en scène distincts. L'aperçu ne constitue pas une preuve de fonctionnement en jeu.</footer></body></html>`;
await fs.writeFile(new URL('preview.html', root), html);
if (process.argv.includes('--html-only')) {
  console.log(JSON.stringify({htmlBuilt:true,assets:assets.length,browserValidation:false}));
  process.exit(0);
}
const { chromium } = require('playwright-core');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || await fs.stat('/usr/bin/chromium').then(()=>'/usr/bin/chromium',()=>undefined);
const browser = await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
try {
  const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  await page.goto(new URL('preview.html', root).href);
  const images = await page.locator('img').evaluateAll(async nodes => {
    await Promise.all(nodes.map(node => node.decode()));
    return nodes.map(node => ({alt:node.alt,complete:node.complete,width:node.naturalWidth,height:node.naturalHeight,renderWidth:node.width,renderHeight:node.height}));
  });
  const passed = images.length===assets.length && images.every(image=>image.complete && image.width>0 && image.renderWidth<=240 && image.renderHeight<=240);
  await page.screenshot({path:fileURLToPath(new URL('native-scale-preview.png',root)),fullPage:true});
  const report={date:'2026-11-08',browser:'Chromium '+browser.version()+' via Playwright',viewport:{width:1440,height:900},test:'PNG decode and display on paired light/dark backgrounds',passed,images,gameplaySceneValidation:false,humanArtValidation:false};
  await fs.writeFile(new URL('preview-verification.json',root),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed,images:images.length,screenshot:fileURLToPath(new URL('native-scale-preview.png',root))}));
  if(!passed)process.exitCode=1;
} finally {await browser.close();}
