import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Provenance and review metadata only. Never edits or transforms any PNG.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../../../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const referenceHashCache = new Map();
const referenceHash = async file => {
  if (!referenceHashCache.has(file)) referenceHashCache.set(file, sha(await fs.readFile(file)));
  return referenceHashCache.get(file);
};
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const relative = file => path.relative(root, file).split(path.sep).join('/');
const files = await fs.readdir(directory);
const sourcePlan = await readJson(path.join(root, 'app/game/data/pitWorkbookAnimationPlanV100.json'));
const sourceFighter = sourcePlan.fighters.find(fighter => fighter.fighterId === 'feral-hunter');
const central = await readJson(path.join(root, 'app/game/data/pitWorkbookAnimationsV100.json'));
const proposals = await Promise.all(files.filter(file => /^admission-proposal-.*\.json$/.test(file)).map(file => readJson(path.join(directory, file))));
assert.equal(proposals.length, 13, 'All thirteen owned source actions require a proposal');
const wanted = new Set(proposals.map(proposal => proposal.actionId));
assert.equal(wanted.size, 13, 'Each owned source action requires exactly one distinct proposal');
const admitted = central.filter(entry => entry.fighterId === 'feral-hunter' && entry.appearanceId === sourceFighter.appearanceId && wanted.has(entry.actionId));
const measurements = new Map();
for (const file of files.filter(file => file.endsWith('.measurement.json'))) {
  measurements.set(file.replace('.measurement.json', ''), await readJson(path.join(directory, file)));
}
const pngs = files.filter(file => file.endsWith('.png')).sort();
const byHash = new Map();
for (const file of pngs) {
  const bytes = await fs.readFile(path.join(directory, file));
  byHash.set(sha(bytes), { file, bytes });
}
const selected = new Map();
const reviewedCandidatePages = new Map();
for (const proposal of proposals) {
  for (const page of proposal.definition.atlas.pages) {
    const hash = proposal.review.sourceHashes?.[page.src] ?? proposal.review.sourcePageSha256?.[page.id];
    const intake = byHash.get(hash);
    assert.ok(intake, `No candidate original for ${page.src}`);
    reviewedCandidatePages.set(intake.file, [...(reviewedCandidatePages.get(intake.file) ?? []), proposal.actionId]);
  }
}
const actions = [];
for (const proposal of proposals) {
  const entry = admitted.find(candidate => candidate.actionId === proposal.actionId);
  const source = sourceFighter.actions.find(action => action.id === proposal.actionId);
  assert.ok(source, proposal.actionId);
  const action = { actionId: proposal.actionId, source: { sheet: source.sheet, cell: source.cell, label: source.label, text: source.sourceText }, status: entry ? 'ADMITTED_NATIVE_BODY_STUDY' : 'PROPOSED_AWAITING_ENGINE_ADMISSION', review: entry?.review ?? proposal.review, pages: [], clips: [] };
  if (entry) {
    assert.ok(!Object.hasOwn(entry.definition, 'variantId'), 'Historical runtime-default must not acquire a variant owner');
    assert.equal(entry.definition.atlas.variantId, 'body-default-v100');
    for (const page of entry.definition.atlas.pages) {
      const publicPath = path.join(root, 'public', page.src);
      const publicBytes = await fs.readFile(publicPath);
      const hash = sha(publicBytes), intake = byHash.get(hash);
      assert.ok(intake, `No original intake PNG for ${page.src}`);
      assert.ok(publicBytes.equals(intake.bytes), `Non-identical public PNG ${page.src}`);
      const measurement = measurements.get(intake.file.slice(0, -4));
      assert.equal(measurement.sourceSha256, hash);
      assert.equal(measurement.noiseFloor, 2);
      const pageFrames = [];
      for (const clip of entry.definition.atlas.clips) {
        for (const frame of clip.frames.filter(frame => frame.pageId === page.id)) {
          const measured = measurement.frames.find(candidate => candidate.rect.every((value, index) => value === frame.rect[index]));
          assert.ok(measured && measured.borderPixels === 0, `Unsafe admitted crop ${intake.file}`);
          assert.ok(frame.pivot[0] >= 0 && frame.pivot[0] <= frame.rect[2] && frame.pivot[1] >= 0 && frame.pivot[1] <= frame.rect[3]);
          const evidence = { actionId: entry.actionId, facing: clip.facing, frameIndex: measured.index, rect: frame.rect, pivot: frame.pivot, durationTicks: frame.durationTicks };
          pageFrames.push(evidence);
          selected.set(intake.file, [...(selected.get(intake.file) ?? []), evidence]);
        }
      }
      assert.ok(pageFrames.length, `No active action frames in ${page.src}`);
      action.pages.push({ source: relative(path.join(directory, intake.file)), public: page.src, sha256: hash, byteIdentical: true, bodyHeightPx: entry.definition.pageBodyHeightPx?.[page.id] ?? entry.definition.bodyHeightPx });
    }
    action.clips = entry.definition.atlas.clips.map(clip => ({ facing: clip.facing, actionDrawings: clip.frames.length, inspectionTicks: clip.frames.reduce((total, frame) => total + frame.durationTicks, 0) }));
  }
  actions.push(action);
}

const rejectionReasons = {
  's2-attempt-01': 'No safe complete native gutter layout; never admitted.',
  's2-attempt-02': 'Native gutter/crop study rejected; never admitted.',
  's2-attempt-03': 'Native gutter/crop study rejected; never admitted.',
  's2-attempt-04': 'Native gutter/crop study rejected; never admitted.',
  's4-attempt-01b': 'Ground mine changed from thin circular openwork ring to thick octagonal box.',
  's4-attempt-02b': 'Circular mine continuity improved but second round device remained at hip.',
  's4-attempt-03b': 'Hip duplicate removed; scale variation remained. Superseded by reviewed final B05.',
  's4-attempt-04b': 'Native spacing attempt did not provide complete safe gutters.',
  'taunt-1-attempt-01a': 'Blade tips projected on shield face rather than its rim; unsafe native spacing.',
  'taunt-1-attempt-02a': 'Blade tips still projected on shield face; replaced by thin profile A03.',
  'taunt-1-attempt-01b': 'Right wrist blades disappeared during deliberate guard opening.',
  'taunt-1-attempt-02b': 'Right wrist blades disappeared during deliberate guard opening.',
  'taunt-1-attempt-03b': 'Residual alpha background blocks true transparent gutters.',
  'taunt-1-attempt-04b': 'Correct gear/alpha but lower-row gutter overlap; replaced by native spacing B05.',
  'taunt-2-attempt-01a': 'Unsafe native crop/gutter layout; replaced by smaller authored page A02.',
  'super-attempt-01a': 'Launcher changed arms during shield bash and right wrist blades protruded.',
  'fatalite-2-attempt-01b': 'Anatomical left shield switched to right arm during left-facing actions.',
  'defaite-attempt-01a': 'Shield and wrist blades changed anatomical arms during early collapse.',
  'defaite-attempt-01b': 'Final left collapse touched crop edge; replaced by fully contained B02.',
  'clemence-attempt-01a': 'Continuity of already existing case not demonstrated; replaced by explicit case-on-ground study.',
  'clemence-attempt-01b': 'Wrong anatomical shield arm and mission case appeared without prior ground continuity.',
  'clemence-attempt-02a-left': 'Left shield disappeared from final open-palm pose.',
  'clemence-attempt-02b-left': 'Shield moved onto right spear arm during case pickup.',
  'clemence-attempt-03a-left': 'Anatomy corrected but alpha haze/overlap prevented safe crops.',
};
const partialNotes = {
  's3-attempt-01a': 'Only twist2/3 and separation4/5 played; unsafe lower6/7 excluded.',
  's3-attempt-01b': 'Old2/3 repeated the left strike, so excluded. Only alignment4/5 and rejoin6/7 played.',
  's3-strike-attempt-02': 'Only actual left strike2/3 played; calibrations0/1 excluded.',
  's3-counter-attempt-03': 'Only actual right counter2/3 played; calibrations0/1 excluded.',
  'fatalite-1-attempt-01a': 'Only right preparation1/2/3 played; unsafe later rows and calibration0 excluded.',
  'fatalite-1-attempt-02b-right': 'Old final1 exposed spear/sternum contact, excluded. Only withdrawal2 and check3 played.',
  'fatalite-1-attempt-03b-right': 'Only newly masked final1 played; crop3 has six border pixels and remains excluded.',
  'fatalite-2-stow-attempt-03-left': 'Only true final stow3 played. Unsafe upper0/1 excluded; standing BODY474 from mask crown514, not hair500.',
  'super-attempt-01b': 'Only valid right aim/recoil/return2/4/6 played. Original left recoil5 lost launcher and remains excluded.',
  'super-attempt-02-left': 'Only correct left aim/recoil/return4/5/7 played; old early bash/draw attempts excluded.',
  'victoire-attempt-01a': 'Only actual pickups/join2..7 played; calibration0/1 with ground spear parts excluded from gesture count.',
};
const attempts = [];
for (const file of pngs) {
  const stem = file.slice(0, -4), short = stem.replace('feral-special-', '');
  const bytes = await fs.readFile(path.join(directory, file)), hash = sha(bytes);
  const measurement = measurements.get(stem);
  assert.ok(measurement, `Missing alpha/crop measurement ${file}`);
  assert.equal(measurement.sourceSha256, hash);
  const provenanceFiles = files.filter(candidate => candidate.startsWith(stem + '.') && /\.(?:prompt|handoff|generation)\.json$/.test(candidate));
  assert.ok(provenanceFiles.length, `Missing prompt/provenance ${file}`);
  const provenance = [];
  for (const metadataFile of provenanceFiles) {
    const metadata = await readJson(path.join(directory, metadataFile));
    const original = metadata.originalSource ?? metadata.originalGeneratedPath ?? metadata.sourcePath ?? metadata.source;
    let originalCopyVerified = false;
    if (typeof original === 'string' && original.startsWith('/workspace/generated_images/')) {
      const originalBytes = await fs.readFile(original);
      originalCopyVerified = bytes.equals(originalBytes);
      assert.ok(originalCopyVerified, `Original mismatch ${file} vs ${original}`);
    }
    const references = metadata.referenced_image_paths ?? metadata.references ?? metadata.refs ?? [];
    const referenceImages = [];
    for (const reference of references) {
      const file = typeof reference === 'string' ? reference : reference.path;
      if (!file) continue;
      const absolute = path.isAbsolute(file) ? file : path.join(root, file);
      const actualSha256 = await referenceHash(absolute);
      if (typeof reference === 'object' && reference.sha256) assert.equal(actualSha256, reference.sha256, `Reference mismatch ${file}`);
      referenceImages.push({ file: absolute.startsWith(root + path.sep) ? relative(absolute) : absolute, sha256: actualSha256 });
    }
    provenance.push({ file: relative(path.join(directory, metadataFile)), sha256: sha(await fs.readFile(path.join(directory, metadataFile))), ...(referenceImages.length ? { referenceImages } : {}), ...(originalCopyVerified ? { originalGeneratedPath: original, originalCopyVerified } : {}) });
  }
  assert.ok(provenance.some(record => record.originalCopyVerified), `No byte-proven original for ${file}`);
  const activeFrames = selected.get(file) ?? [];
  const awaitingAdmission = !activeFrames.length && reviewedCandidatePages.has(file);
  let reason = partialNotes[short] ?? rejectionReasons[short];
  if (awaitingAdmission) reason = 'Independently reviewed final candidate referenced by the current proposal. Awaiting engine admission; not counted as public content, not superseded by itself.';
  if (!reason && !activeFrames.length) {
    if (short.startsWith('intro-')) reason = 'Earlier native choreography/weapon/spacing attempt superseded by independently reviewed final A04/B03. Unsafe cells are not repaired or played.';
    else if (short.startsWith('victoire-')) reason = 'Earlier native launcher/spear study superseded by final B08; trials include changed hands, floating grip, wrong spear model or insufficient gutters. No frames from this unused page are played.';
    else if (short.startsWith('fatalite-1-')) reason = 'Earlier scene study superseded for facing, exposed final contact, support continuity or safe gutters; no unselected cell is played.';
    else if (short.startsWith('super-')) reason = 'Earlier native staging/arm ownership study superseded by actual left-waist draw and reviewed final fragments.';
    else reason = 'Archived native attempt superseded by reviewed selected sources; not presented as completed content.';
  }
  if (short === 's4-attempt-05b') reason = 'Accepted BODY-only native variation: mine width is about19–21% larger after fixed body normalization (about3–4 display pixels). No stable entity scale or proximity mechanic certified.';
  if (short === 'taunt-1-attempt-03a' || short === 'taunt-1-attempt-05b') reason = 'Final independent QA/root approved metal rim contact and natural palm occlusion of aligned right-blade roots. Earlier contradictory interpretation was considered; no requirement to see roots through palm or touch orange paint was imposed.';
  attempts.push({ file: relative(path.join(directory, file)), sha256: hash, bytes: bytes.length, provenance, decision: activeFrames.length ? 'ADMITTED_SELECTED_SAFE_FRAMES' : awaitingAdmission ? 'REVIEWED_AWAITING_ENGINE_ADMISSION' : 'ARCHIVED_NOT_ADMITTED', ...(reason ? { reviewNotes: reason } : {}), measurement: { path: relative(path.join(directory, stem + '.measurement.json')), status: measurement.status, scope: 'Alpha2 geometry only: zero border pixels do not approve anatomy, source semantics or calibrations as action.', noiseFloor: measurement.noiseFloor, width: measurement.width, height: measurement.height, issues: measurement.issues, zeroBorderFrameIndices: measurement.frames.filter(frame => frame.borderPixels === 0).map(frame => frame.index), unsafeBorderFrameIndices: measurement.frames.filter(frame => frame.borderPixels > 0).map(frame => frame.index) }, activeFrames, unplayedMeasuredFrameIndices: measurement.frames.filter(frame => !activeFrames.some(active => active.frameIndex === frame.index)).map(frame => frame.index) });
}
const ledger = { schemaVersion: 1, fighterId: 'feral-hunter', scope: 'Thirteen historical Excel BODY actions, both independent facings; no procedural pixel editing or mirroring. Scene studies remain separate from real opponent/gameplay mechanics.', source: sourcePlan.source, decisionsFrom: 'Central registry plus original PNG alpha2 measurements, independent visual reviews and exact-copy verification; historical request/proposal statuses do not override this final ledger.', counts: { originalAttempts: attempts.length, originalCopiesVerified: attempts.filter(attempt => attempt.provenance.some(record => record.originalCopyVerified)).length, admittedActions: admitted.length, proposedActions: proposals.length, admittedOrientations: actions.reduce((total, action) => total + action.clips.length, 0), admittedActionDrawings: actions.reduce((total, action) => total + action.clips.reduce((count, clip) => count + clip.actionDrawings, 0), 0), admittedOriginalPages: attempts.filter(attempt => attempt.activeFrames.length).length, reviewedPagesAwaitingAdmission: attempts.filter(attempt => attempt.decision === 'REVIEWED_AWAITING_ENGINE_ADMISSION').length, archivedUnplayedAttempts: attempts.filter(attempt => attempt.decision === 'ARCHIVED_NOT_ADMITTED').length }, actions, attempts };
await fs.writeFile(path.join(directory, 'intake-review-ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
await fs.writeFile(path.join(directory, '..', 'manifest.json'), JSON.stringify({ schemaVersion: 1, fighterId: ledger.fighterId, source: ledger.source, counts: ledger.counts, ledger: relative(path.join(directory, 'intake-review-ledger.json')), actions }, null, 2) + '\n');
console.log(JSON.stringify(ledger.counts));
