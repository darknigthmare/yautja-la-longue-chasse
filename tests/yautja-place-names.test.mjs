import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { firstTracksCompleted } from './helpers/solo-v67-campaign-route.mjs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const scene = homeworldSceneSsrV78();
const load = name => scene.load(`app/game/systems/${name}.ts`);
const { YAUTJA_CLANS, YAUTJA_HOME_REGIONS, homeworldRegionNames, homeworldLandmarkLabel, yautjaLocalLabel } = load('yautjaPlaceNames');
const { HOMEWORLD_REGION_IDS_V68, HOMEWORLD_REGIONS_V68 } = load('homeworldRegionsV68');
const { HOMEWORLD_POINTS_V77 } = load('homeworldWorldV77');
const { homeworldAtlasLandmarksV83, homeworldAtlasSearchV83, homeworldAtlasTargetV83 } = load('homeworldAtlasLandmarksV83');

test('the 10 regions, 15 clans and 20 communities match the campaign Bible and live region IDs', async () => {
  const bible = await readFile('docs/campagne/BIBLE_DE_CAMPAGNE.md', 'utf8');
  const section = bible.match(/### Noms du classeur V6\n([\s\S]*?)\n### /)?.[1];
  assert.ok(section);
  const preservedSpelling = text => text.replaceAll('’', "'");
  const regionRows = [...section.matchAll(/^\| ([^|]+) \| [^|]+ \| (CL\d+) ([^|]+) \| ([^|]+) \|$/gm)];
  assert.equal(regionRows.length, 10);
  assert.deepEqual(Object.keys(YAUTJA_HOME_REGIONS), HOMEWORLD_REGION_IDS_V68);
  for (const [index, id] of HOMEWORLD_REGION_IDS_V68.entries()) {
    const names = homeworldRegionNames(id);
    const actual = HOMEWORLD_REGIONS_V68[id];
    const [, french, clanId, clanFrench, regionName] = regionRows[index];
    assert.equal(actual.name, names.region.french);
    assert.equal(actual.village, names.village.french);
    assert.equal(actual.clan, names.clan.french);
    assert.equal(names.region.french, french.trim());
    assert.equal(preservedSpelling(names.region.name), regionName.trim());
    assert.equal(names.clan, YAUTJA_CLANS[clanId]);
    assert.equal(names.clan.french, clanFrench.trim());
  }
  const clanRows = [...section.matchAll(/^\| (CL\d+) ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm)];
  assert.equal(clanRows.length, 15);
  let count = 0;
  for (const [, id, french, name, sourceCommunities] of clanRows) {
    const clan = YAUTJA_CLANS[id];
    assert.equal(clan.french, french.trim());
    assert.equal(preservedSpelling(clan.name), name.trim());
    const original = [...sourceCommunities.matchAll(/CM\d{2} (.*?) → ([^; ]+)/g)];
    assert.equal(clan.communities.length, original.length);
    for (const [index, [, label, localName]] of original.entries()) {
      assert.equal(preservedSpelling(clan.communities[index].french), label);
      assert.equal(preservedSpelling(clan.communities[index].name), localName);
      count++;
    }
  }
  assert.equal(count, 20);
  assert.equal(homeworldRegionNames('constructor'), null);
  assert.equal(homeworldRegionNames('earth'), null);
});

test('the atlas resolves the same live locations by old ID, French title and local spelling', () => {
  const save = firstTracksCompleted();
  const before = structuredClone(save);
  const atlas = homeworldAtlasLandmarksV83(save);
  const point = HOMEWORLD_POINTS_V77.find(candidate => candidate.regionId === 'glass-desert');
  const desert = homeworldAtlasTargetV83(atlas, 'glass-desert');
  assert.equal(desert, homeworldAtlasTargetV83(atlas, point.id));
  assert.deepEqual(desert.position, { x: point.x, y: point.y });
  assert.equal(desert.label, 'Vhel-tor · Désert de Verre');
  assert.ok(homeworldAtlasSearchV83(atlas, 'desert de verre').includes(desert));
  assert.ok(homeworldAtlasSearchV83(atlas, 'Vhel-tor').includes(desert));
  assert.ok(homeworldAtlasSearchV83(atlas, "Quaa'resh").includes(desert));
  const memory = homeworldAtlasTargetV83(atlas, 'building:memory-vault');
  assert.ok(homeworldAtlasSearchV83(atlas, "Nhor'kesh").includes(memory));
  assert.ok(homeworldAtlasSearchV83(atlas, 'maison de la mémoire').includes(memory));
  assert.equal(homeworldAtlasTargetV83(atlas, 'forbidden-reserve'), null);
  assert.deepEqual(homeworldAtlasSearchV83(atlas, "Zhar'vos"), []);
  assert.equal(homeworldLandmarkLabel('pit-gate', 'Entrée THE PIT'), 'Entrée THE PIT');
  assert.equal(homeworldLandmarkLabel('__proto__', 'Lieu inconnu'), 'Lieu inconnu');
  assert.deepEqual(save, before);
});

test('the village map announces the same endonym and French subtitle', () => {
  const village = homeworldRegionNames('glass-desert').village;
  const html = scene.render('app/game/HomeworldVillageAtlasV70.tsx', {
    regionId: 'glass-desert', actor: { x: 520, y: 2800 }, onChoose() {},
  });
  assert.ok(html.includes(`aria-label="Plan des approches de ${yautjaLocalLabel(village)}"`));
});
