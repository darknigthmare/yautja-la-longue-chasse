import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const lore = qa.load('app/game/hunterLore.ts');
const visuals = qa.load('app/game/hunterVisuals.ts');
const chromatics = qa.load('app/game/hunterChromaticsV113.ts');
const decals = qa.load('app/game/yautjaDecalsV133.ts');
const morphs = ['classic', 'elder', 'super', 'feral', 'huntress', 'young'];

// Parse actual SSR output, including the nested wrap and actual chromatic
// component. This checks ownership/clip/transform contracts, not native pixels.
function parse(html) {
  const root = { children: [] }, stack = [root];
  const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
  for (const match of html.matchAll(/<(\/?)([a-z][\w-]*)([^>]*?)>/gi)) {
    const [, closing, tag, rest] = match;
    if (closing) { assert.equal(stack.pop().tag, tag, 'balanced actual SSR elements'); continue; }
    const attributes = Object.fromEntries([...rest.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)]));
    const style = Object.fromEntries((attributes.style ?? '').split(';').filter(Boolean).map(entry => {
      const colon = entry.indexOf(':'); return [entry.slice(0, colon), entry.slice(colon + 1)];
    }));
    const node = { tag, attributes, style, children: [], parent: stack.at(-1) };
    node.parent.children.push(node);
    if (!['img', 'link', 'input', 'meta', 'br', 'hr'].includes(tag) && !rest.endsWith('/')) stack.push(node);
  }
  assert.equal(stack.length, 1); return root;
}
function all(node, predicate) { return node.children.flatMap(child => [...(predicate(child) ? [child] : []), ...all(child, predicate)]); }
function render(appearance, props = {}) {
  return parse(qa.render('app/game/HunterRigPreview.tsx', { appearance, armorId: 'hunter', weaponIds: [], pose: 'idle', phase: 0, ...props }));
}
function painted(overrides = {}) {
  return { ...lore.appearanceForPreset('samurai'), ...overrides,
    chromaticsV113: { armorHex: '#556677', ...overrides.chromaticsV113 } };
}
function directOverlay(node) {
  const index = node.parent.children.indexOf(node);
  const next = node.parent.children[index + 1];
  assert.equal(next?.attributes['data-chromatic-channel'], 'armor', 'the actual plate owns the adjacent recoloring layer');
  return next;
}
function assertPlate(node, expectedClip) {
  const overlay = directOverlay(node);
  assert.equal(node.style['clip-path'], expectedClip);
  assert.equal(overlay.style['clip-path'], expectedClip, 'tint/material cannot reintroduce source pixels removed from the plate');
  assert.equal(overlay.style.transform, node.style.transform, 'recoloring follows the exact same registration');
  assert.ok(overlay.style['mask-image'].includes(node.attributes.src), 'the original plate alpha remains authoritative');
}

test('Samurai armor pigment keeps both shin overlays and both limb wraps inside the existing source keep region', () => {
  const tree = render(painted()), expected = 'inset(0% 21.875% 0% 0%)';
  const ordinary = all(tree, node => ['armor-shin', 'armor-shin-far'].includes(node.attributes['data-rig-slot']));
  const wraps = all(tree, node => node.attributes['data-rig-armor-wrap'] === 'shin');
  assert.equal(ordinary.length, 2); assert.equal(wraps.length, 2);
  for (const node of ordinary) assertPlate(node, expected);
  for (const wrap of wraps) {
    assert.ok(wrap.style['mask-image'].includes('/body/classic/parts/shin-'), 'wrap keeps its real limb silhouette');
    assertPlate(wrap.children.find(node => node.tag === 'img'), expected);
  }
});

test('all six morphologies keep clipped shin and shoulder recoloring registered in both facings and resting/moving poses', () => {
  let renders = 0;
  for (const bodyMorphId of morphs) for (const armorStyleId of ['classic', 'avp', 'super']) {
    for (const pose of ['idle', 'run']) for (const facing of [-1, 1]) {
      const tree = render(painted({ bodyMorphId, armorStyleId }), { pose, facing, phase: .37, speed: pose === 'run' ? 240 : 0 });
      const plates = all(tree, node => node.tag === 'img' && node.attributes['data-rig-slot']?.startsWith('armor-'));
      for (const node of plates) {
        const moduleId = node.attributes.src.split('/').at(-1).replace('.webp', '');
        if (!visuals.HUNTER_ARMOR_KEEP_CLIP_V145[moduleId]) continue;
        assert.ok(node.style['clip-path'], `${bodyMorphId}/${armorStyleId}/${pose}/${facing}/${moduleId}`);
        assertPlate(node, node.style['clip-path']);
      }
      const wraps = all(tree, node => Object.hasOwn(node.attributes, 'data-rig-armor-wrap'));
      for (const wrap of wraps) {
        const node = wrap.children.find(child => child.tag === 'img');
        if (node.style['clip-path']) assertPlate(node, node.style['clip-path']);
      }
      renders += 1;
    }
  }
  assert.equal(renders, 72);
});

test('an integrated armor material obeys the same keep region with or without a pigment', () => {
  const material = chromatics.PHG_CHROMATIC_MATERIALS_V113.find(item => item.channel === 'armor' && item.status === 'integrated' && item.src);
  assert.ok(material, 'reuse an actually installed armor material');
  for (const armorHex of [null, '#556677']) {
    const tree = render(painted({ chromaticsV113: { armorHex, armorMaterialId: material.id } }));
    const images = all(tree, node => ['armor-shin', 'armor-shin-far'].includes(node.attributes['data-rig-slot']));
    assert.equal(images.length, 2);
    for (const node of images) {
      assertPlate(node, 'inset(0% 21.875% 0% 0%)');
      assert.ok(directOverlay(node).style['background-image'].includes(material.src));
    }
  }
});

test('adding pigment preserves all native art paths, transforms, clips and limb-owner masks', () => {
  const appearance = lore.appearanceForPreset('samurai');
  const native = tree => all(tree, node => node.tag === 'img').map(node => ({ src: node.attributes.src,
    slot: node.attributes['data-rig-slot'], transform: node.style.transform, clip: node.style['clip-path'] }));
  assert.deepEqual(native(render(painted())), native(render(appearance)), 'the fix never replaces or relocates a native layer');
  const tree = render(painted());
  for (const node of all(tree, node => node.attributes['data-rig-slot']?.startsWith('armor-'))) {
    const moduleId = node.attributes.src.split('/').at(-1).replace('.webp', '');
    if (!visuals.HUNTER_ARMOR_KEEP_CLIP_V145[moduleId]) assert.equal(directOverlay(node).style['clip-path'], undefined, moduleId);
  }
});

test('the armor decal remains attached to the chest rather than either shin or the detached pixels', () => {
  const decal = decals.Y_A_U_T_J_A_DECALS_V133.find(item => item.zone === 'armor');
  const tree = render(painted({ chromaticsV113: { armorDecalId: decal.id } }));
  const marks = all(tree, node => node.attributes['data-yautja-decal-zone'] === 'armor');
  assert.equal(marks.length, 1);
  const owner = all(marks[0], node => Object.hasOwn(node.attributes, 'data-decal-mask-owner-v139'))[0];
  assert.ok(owner.style['mask-image'].includes('/armor/registered/chest-avp.webp'));
  assert.ok(!owner.style['mask-image'].includes('/shin.webp'));
  assert.equal(all(tree, node => ['armor-shin', 'armor-shin-far'].includes(node.attributes['data-rig-slot'])).length, 2);
});
