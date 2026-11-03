import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

// Check the webpack output used by the game route, never the source stylesheet.
// --next-dir exists for isolated negative fixtures; production uses .next.
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--next-dir')) {
  console.error('Usage: node scripts/verify-pit-built-css-v61.mjs [--next-dir directory]');
  process.exit(1);
}
const nextDir = path.resolve(args[1] ?? '.next');
const checks = [
  { id: 'toast-does-not-intercept-hud', selector: 'toast', property: 'pointer-events', expected: 'none' },
  { id: 'immersive-toast-above-desktop-menu', selector: 'desktop', property: 'bottom', expected: 'max(76px, calc(env(safe-area-inset-bottom) + 64px))' },
  { id: 'touch-toast-below-health-hud', selector: 'touch', property: 'top', expected: 'max(152px, calc(env(safe-area-inset-top) + 142px))' },
  { id: 'touch-toast-releases-bottom', selector: 'touch', property: 'bottom', expected: 'auto' },
];

// PostCSS parses rule/declaration boundaries and ignores comments. These anchored
// selector contracts accept the source spelling and webpack's escaped/minified
// attribute spelling, while preserving the required descendant and child axes.
const trueAttribute = String.raw`\[\s*data-pit-immersive\s*=\s*(?:true|"true"|'true')\s*\]`;
const touchAttribute = String.raw`\[\s*aria-label\s*=\s*(?:"Commandes tactiles"|'Commandes tactiles'|Commandes\\ tactiles)\s*\]`;
const selectors = {
  toast: /^\.toast$/,
  desktop: new RegExp(String.raw`^\.game-shell:has\(\s*${trueAttribute}\s*\)\s*>\s*\.toast$`),
  touch: new RegExp(String.raw`^\.game-shell:has\(\s*${trueAttribute}\s+${touchAttribute}\s*\)\s*>\s*\.toast$`),
};

function valueSignature(value) {
  const simplify = (nodes) => nodes.filter((node) => !['space', 'comment'].includes(node.type)).map((node) => ({
    type: node.type,
    value: node.value,
    ...(node.unclosed ? { unclosed: true } : {}),
    ...(node.nodes ? { nodes: simplify(node.nodes) } : {}),
  }));
  return JSON.stringify(simplify(valueParser(value).nodes));
}

const report = {
  status: 'FAIL',
  checkedAt: new Date().toISOString(),
  nextDir,
  scope: 'Root game route compiled CSS referenced by its webpack client manifest; no source CSS is read.',
  files: [],
  checks: [],
  errors: [],
  limits: [
    'Verifies these exact compiled selectors and declarations, not the entire CSS cascade or visual layout.',
    'Does not certify CDN contents, service-worker caches, or the deployed browser; public smoke QA remains required.',
    'The webpack manifest format is required and fails closed if it changes; equivalent unsupported CSS spellings need review.',
  ],
};

try {
  // Restrict the gate to linked CSS: an unused good chunk must not hide a stale
  // stylesheet actually selected for the game. Parse generated JSON, not JS eval.
  const manifestPath = path.join(nextDir, 'server/app/page_client-reference-manifest.js');
  const manifestText = await readFile(manifestPath, 'utf8');
  const marker = 'globalThis.__RSC_MANIFEST["/page"]=';
  const offset = manifestText.indexOf(marker);
  if (offset < 0) throw new Error('Missing root /page webpack client manifest assignment.');
  const manifest = JSON.parse(manifestText.slice(offset + marker.length).trim().replace(/;$/, ''));
  if (!manifest.entryCSSFiles || typeof manifest.entryCSSFiles !== 'object') throw new Error('Missing entryCSSFiles in root webpack manifest.');
  const linkedPaths = [...new Set(Object.values(manifest.entryCSSFiles).flat().map((entry) => entry.path))];
  if (!linkedPaths.length) throw new Error('Root game route has no linked compiled CSS.');
  const rules = [];

  for (const relativePath of linkedPaths) {
    if (typeof relativePath !== 'string' || !/^static\/.+\.css$/.test(relativePath)) throw new Error(`Unexpected compiled CSS reference: ${relativePath}`);
    const cssPath = path.resolve(nextDir, relativePath);
    const staticRoot = path.join(nextDir, 'static') + path.sep;
    if (!cssPath.startsWith(staticRoot)) throw new Error(`Compiled CSS reference escapes .next/static: ${relativePath}`);
    const bytes = await readFile(cssPath);
    report.files.push({ path: relativePath, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    const parsed = postcss.parse(bytes.toString('utf8'), { from: cssPath });
    parsed.walkRules((rule) => {
      for (const [id, pattern] of Object.entries(selectors)) {
        if (!rule.selectors.some((selector) => pattern.test(selector.trim()))) continue;
        rules.push({ id, rule, file: relativePath });
      }
    });
  }

  for (const check of checks) {
    const candidates = rules.filter(({ id }) => id === check.selector);
    const declarations = candidates.flatMap(({ rule, file }) => (rule.nodes ?? [])
      .filter((node) => node.type === 'decl' && node.prop.toLowerCase() === check.property)
      .map((node) => ({
        file, selector: rule.selector, value: node.value, important: Boolean(node.important),
        unconditional: rule.parent.type === 'root',
        matches: valueSignature(node.value) === valueSignature(check.expected),
      })));
    const resets = candidates.flatMap(({ rule, file }) => (rule.nodes ?? [])
      .filter((node) => node.type === 'decl' && ['all', 'inset', 'inset-block', 'inset-block-start', 'inset-block-end'].includes(node.prop.toLowerCase()))
      .map((node) => ({ file, property: node.prop, value: node.value })));
    const pass = declarations.some((decl) => decl.matches && decl.unconditional)
      && declarations.every((decl) => decl.matches) && resets.length === 0;
    report.checks.push({ ...check, status: pass ? 'PASS' : 'FAIL', declarations, resets });
    if (!pass) report.errors.push(`${check.id}: missing, conditional-only, conflicting or reset compiled declaration.`);
  }
  report.status = report.errors.length === 0 ? 'PASS' : 'FAIL';
} catch (error) {
  report.errors.push(error.message);
}

console.log(JSON.stringify(report, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
