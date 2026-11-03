import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Versioned additions only. Never rename an existing hunter or rewrite user packs.
const sourceRoot = 'C:/Users/chuck/.codex/generated_images/01a056ec-9dd5-7433-8bd5-5ace123409c6';
const specs = [
  { id: 'user-last-hunt-super', name: 'Super Predator — The Last Hunt', slug: 'last-hunt-super',
    sourceFile: 'exec-5a34b8b8-cd25-4f7c-94cd-fdc510e4f011.png', expectedSha256: 'a3a6bae74c1c6609bb4f29ba7a3a46ed5ed0b64b633e6ba4812fe003bc46b603', width: 1024, height: 1536, pivot: [534, 1503], bodyTopY: 26,
    sourceLabel: 'Predator: The Last Hunt #3 · apparence masquée · adaptation référencée',
    references: ['last-hunt-3-preview-3.jpg', 'last-hunt-3-preview-5.jpg'],
    sourceUrls: ['https://www.marvel.com/comics/collection/110461/', 'https://aiptcomics.com/2024/04/19/marvel-preview-predator-the-last-hunt-3/'],
    sourceNotes: ['Only the large foreground spiked hunter is the identity reference; the two inset hunters are excluded.', 'Helmet, pauldrons, mottled skin and crescent wrist blades reviewed against the issue preview. Unseen surfaces and guard stance are conservative reconstructions, not certified 1:1.', 'One native right-facing stance only. Left-facing display is a provisional mirror, not separately authored canon art. No drawn movement, attack, victory or defeat animation is delivered.'] },
  { id: 'user-avp-classic-2000', name: 'Predator — AVP Classic 2000', slug: 'avp-classic-2000',
    sourceFile: 'exec-f045aef2-1dc5-48e9-86f1-b827525111b0.png', expectedSha256: '04a93516a65155301eeb0ea8484cde6a7da349b582598965920806c8cee5a227', width: 1145, height: 1374, pivot: [540, 1354], bodyTopY: 13,
    sourceLabel: 'Aliens versus Predator Classic 2000 · modèle joueur Rebellion · adaptation référencée',
    references: ['classic-steam-api-03.jpg', 'classic-steam-api-09.jpg', 'classic-steam-api-10.jpg'],
    sourceUrls: ['https://store.steampowered.com/app/3730/', 'https://store.steampowered.com/manual/3730'],
    sourceNotes: ['The model from the official Classic 2000 screenshots is distinct from the 2010 AVP hunters. No personal name is invented.', 'Bronze/olive broad mask, dark blue locks with gold rings, green angular armor and rectangular gauntlets reviewed against the actual game model. Small hidden surfaces are reconstructed.', 'No combi-stick is assigned: the Classic 2000 manual lists wrist blades, plasma pistol, speargun, shoulder cannon and disc.', 'One native right-facing stance only; no complete animation sheet or certified 1:1 fidelity. The shared duel profile does not create exclusive canonical techniques.'] },
];
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const publicRoot = fs.realpathSync('public');
const root = path.resolve(publicRoot, 'game', 'sprites', 'v79', 'fighters');
if (!root.startsWith(publicRoot + path.sep)) throw Error('Asset destination escapes public.');
const install = process.argv.includes('--install');
const fighters = [];
for (const spec of specs) {
  const source = path.join(sourceRoot, spec.sourceFile), bytes = fs.readFileSync(source), sourceSha256 = sha(bytes);
  if (sourceSha256 !== spec.expectedSha256) throw Error('Selected generation changed: ' + spec.slug);
  const meta = await sharp(bytes).metadata();
  if (meta.width !== spec.width || meta.height !== spec.height || !meta.hasAlpha) throw Error('Unexpected selected PNG: ' + spec.slug);
  const stats = await sharp(bytes).stats();
  if (stats.channels[3].min !== 0 || stats.channels[3].max < 16) throw Error('Missing transparent/visible pixels: ' + spec.slug);
  for (const reference of spec.references) if (!fs.existsSync(path.join('work-local/v79/references', reference))) throw Error('Missing reviewed reference: ' + reference);
  const directory = path.join(root, spec.slug), target = path.join(directory, 'stance-right.png');
  if (fs.existsSync(target) && sha(fs.readFileSync(target)) !== sourceSha256) throw Error('Refusing to overwrite different existing art: ' + spec.slug);
  const iconBytes = await sharp(bytes).resize({ width: 128, height: 192, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toBuffer();
  const iconTarget = path.join(directory, 'roster-icon.webp');
  if (fs.existsSync(iconTarget) && sha(fs.readFileSync(iconTarget)) !== sha(iconBytes)) throw Error('Refusing to overwrite different existing icon: ' + spec.slug);
  if (install) {
    fs.mkdirSync(directory, { recursive: true });
    if (!fs.existsSync(target)) fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    if (!fs.existsSync(iconTarget)) fs.writeFileSync(iconTarget, iconBytes, { flag: 'wx' });
    if (sha(fs.readFileSync(target)) !== sourceSha256) throw Error('Copy integrity failed: ' + spec.slug);
  }
  const src = '/game/sprites/v79/fighters/' + spec.slug + '/stance-right.png', variantId = spec.slug + '-referenced-stance-v79';
  fighters.push({ id: spec.id, name: spec.name, sourceLabel: spec.sourceLabel, artProvenance: 'openai-primary-reference', canonicalFidelityCertified: false,
    variants: [{ id: variantId, label: 'Apparence référencée · pose native fixe', src, width: spec.width, height: spec.height, pivot: spec.pivot,
      bodyTopY: spec.bodyTopY, nativeFacing: 'right', sha256: sourceSha256, sourceArchive: 'OpenAI V79 · références publiques inspectées', sourceEntry: 'docs/v79-reference-hunters-art.md',
      frameCount: 1, animated: false, identityStatus: 'referenced-incarnation', canonicalFidelityCertified: false, sourceUrls: spec.sourceUrls, sourceNotes: spec.sourceNotes }],
    icon: { src: '/game/sprites/v79/fighters/' + spec.slug + '/roster-icon.webp', width: 128, height: 192, bytes: iconBytes.length,
      sourceSrc: src, sourceSha256, sourceVariantId: variantId, sha256: sha(iconBytes) } });
  console.log(JSON.stringify({ slug: spec.slug, copied: fs.existsSync(target), sourceSha256, iconSha256: sha(iconBytes), alpha: true }));
}
if (install) fs.writeFileSync('app/game/data/pitUserHuntersV79.json', JSON.stringify({ schemaVersion: 1, release: 'V79', fighters }, null, 2) + '\n');
