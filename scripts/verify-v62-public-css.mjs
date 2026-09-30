import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import postcss from 'postcss';

const url = process.env.V62_PUBLIC_URL ?? 'https://yautja-la-longue-chasse.vercel.app';
const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
assert.equal(response.status, 200);
const html = await response.text();
const hrefs = [...new Set([...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]))];
assert(hrefs.length > 0, 'Only CSS actually linked by the public HTML may satisfy the guard');
const rules = [], files = [];
for (const href of hrefs) {
  const cssResponse = await fetch(new URL(href, url), { signal: AbortSignal.timeout(60000) });
  assert.equal(cssResponse.status, 200, href);
  const css = await cssResponse.text();
  files.push({ href, bytes: Buffer.byteLength(css), sha256: createHash('sha256').update(css).digest('hex') });
  postcss.parse(css).walkRules(rule => {
    if (!rule.selector.includes('.toast')) return;
    const unconditional = rule.parent.type === 'root';
    rule.walkDecls(decl => rules.push({ selector: rule.selector, property: decl.prop, value: decl.value, unconditional }));
  });
}
const contracts = [
  { selector: '.toast', property: 'pointer-events', value: 'none' },
  { selector: '.game-shell:has([data-pit-immersive=true])>.toast', property: 'bottom', value: 'max(76px,calc(env(safe-area-inset-bottom)+64px))' },
  { selector: '.game-shell:has([data-pit-immersive=true] [aria-label=Commandes\\ tactiles])>.toast', property: 'top', value: 'max(152px,calc(env(safe-area-inset-top)+142px))' },
  { selector: '.game-shell:has([data-pit-immersive=true] [aria-label=Commandes\\ tactiles])>.toast', property: 'bottom', value: 'auto' },
];
const checks = contracts.map(contract => {
  const matches = rules.filter(rule => rule.unconditional && rule.selector === contract.selector && rule.property === contract.property);
  assert(matches.length > 0, `${contract.selector}: ${contract.property} missing in public CSS`);
  assert(matches.every(rule => rule.value.replaceAll(/\s+/g, '') === contract.value), `${contract.property}: unexpected public declaration`);
  return { ...contract, status: 'PASS', declarations: matches };
});
const report = { status: 'PASS', url, checkedAt: new Date().toISOString(), files, checks, scope: 'The four V61 HUD toast contracts in stylesheets linked by the public production HTML; not the entire computed cascade.' };
await fs.writeFile('docs/v62-public-css-qa.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', linkedStylesheets: files.length, checks: checks.length }));
