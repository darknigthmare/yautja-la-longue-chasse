import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function extractRule(source, selector, startAt = 0) {
  const selectorStart = source.indexOf(`${selector} {`, startAt);
  assert.notEqual(selectorStart, -1, `Missing CSS rule: ${selector}`);
  const blockStart = source.indexOf("{", selectorStart);
  const blockEnd = source.indexOf("}", blockStart);
  assert.notEqual(blockEnd, -1, `Unclosed CSS rule: ${selector}`);
  return source.slice(blockStart + 1, blockEnd);
}

function pixelValue(rule, property) {
  const match = rule.match(new RegExp(`--${property}:\\s*([\\d.]+)px`));
  assert.ok(match, `Missing pixel custom property --${property}`);
  return Number(match[1]);
}

function assertVisualCenterAnchored({ rule, padding, positions }) {
  const visualSize = pixelValue(rule, "node-visual-size");
  const anchor = pixelValue(rule, "node-anchor-x");
  assert.equal(anchor, padding + visualSize / 2);

  for (const nodeX of positions) {
    const buttonLeft = nodeX - anchor;
    const visualCenter = buttonLeft + padding + visualSize / 2;
    assert.equal(visualCenter, nodeX);
  }
}

test("galaxy node coordinates anchor the celestial disc rather than the full dossier", async () => {
  const [css, panel] = await Promise.all([
    readFile(resolve(projectRoot, "app/globals.css"), "utf8"),
    readFile(resolve(projectRoot, "app/game/GalaxyMapPanel.tsx"), "utf8"),
  ]);

  const desktopStart = css.indexOf(".galaxy-v10-spatial-map");
  const nodeRule = extractRule(css, ".galaxy-v10-node", desktopStart);
  const sectorRule = extractRule(css, ".galaxy-v10-node.kind-sector", desktopStart);
  const visualRule = extractRule(css, ".galaxy-v10-node-visual", desktopStart);
  const haloRule = extractRule(css, ".galaxy-v10-node::before", desktopStart);

  assert.match(nodeRule, /top:\s*var\(--node-y\)/);
  assert.match(nodeRule, /left:\s*var\(--node-x\)/);
  assert.match(
    nodeRule,
    /translate:\s*calc\(0px - var\(--node-anchor-x\)\) -50%/,
  );
  assert.match(nodeRule, /transform-origin:\s*var\(--node-anchor-x\) 50%/);
  assert.doesNotMatch(nodeRule, /translate:\s*-50% -50%/);
  assert.match(visualRule, /width:\s*var\(--node-visual-size\)/);
  assert.match(visualRule, /min-width:\s*var\(--node-visual-size\)/);
  assert.match(haloRule, /left:\s*var\(--node-anchor-x\)/);

  assertVisualCenterAnchored({
    rule: nodeRule,
    padding: 4,
    positions: [18, 40, 50, 82],
  });
  assertVisualCenterAnchored({
    rule: sectorRule,
    padding: 4,
    positions: [18, 50, 82],
  });

  assert.match(
    panel,
    /<span className="galaxy-v10-node-visual">[\s\S]*?<\/span>\s*<span className="galaxy-v10-node-label">/,
  );
  assert.match(panel, /"--node-x": `\$\{position\.x\}%`/);
  assert.match(panel, /"--node-y": `\$\{position\.y\}%`/);
});

test("mobile nodes preserve the same visual-center anchor after resizing", async () => {
  const css = await readFile(resolve(projectRoot, "app/globals.css"), "utf8");
  const mobileStart = css.lastIndexOf("@media (max-width: 760px)");
  const mobileEnd = css.indexOf("@media (max-width: 430px)", mobileStart);
  assert.ok(mobileStart >= 0 && mobileEnd > mobileStart);
  const mobileCss = css.slice(mobileStart, mobileEnd);

  const nodeRule = extractRule(mobileCss, ".galaxy-v10-node");
  const sectorRule = extractRule(mobileCss, ".galaxy-v10-node.kind-sector");

  assertVisualCenterAnchored({
    rule: nodeRule,
    padding: 4,
    positions: [18, 40, 82],
  });
  assertVisualCenterAnchored({
    rule: sectorRule,
    padding: 4,
    positions: [18, 50, 82],
  });
  assert.match(nodeRule, /top:\s*clamp\(24%, var\(--node-y\), 78%\)/);
  assert.match(nodeRule, /left:\s*clamp\(18%, var\(--node-x\), 82%\)/);
});
