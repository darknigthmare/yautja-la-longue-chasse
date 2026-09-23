import assert from 'node:assert/strict';

/** User files are static reference material, never inferred roster or animation coverage. */
export function appendUserSpriteReferences(entries, intake) {
  assert.equal(intake.schemaVersion, 1);
  assert.equal(intake.runtimeIntegrated, false);
  const knownIds = new Set(entries.map(entry => entry.id));
  const knownSources = new Set(entries.map(entry => entry.src));
  for (const asset of intake.assets) {
    assert.equal(asset.sourceGenerator, 'user-supplied');
    assert.equal(asset.animated, false);
    assert.equal(asset.frameCount, 1);
    assert.equal(asset.canonicalIdentityVerified, false);
    assert.equal(asset.visualReview, 'reviewed-with-limitations');
    assert.equal(asset.declaredSha256Matches, true);
    assert.equal(asset.usage, 'static-reference-gallery-only');
    assert(/^v43-user-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.galleryId));
    assert(/^\/game\/sprites\/v43\/user-packs\/[a-z0-9]+(?:-[a-z0-9]+)*\.png$/.test(asset.publicPath));
    assert(/^[a-f0-9]{64}$/.test(asset.sha256));
    assert.equal(asset.mode, 'RGBA');
    assert(['left', 'right'].includes(asset.nativeFacing));
    assert(!knownIds.has(asset.galleryId) && !knownSources.has(asset.publicPath), 'Duplicate user reference');
    entries.push({
      id: asset.galleryId, category: 'reference', name: asset.title + ' · pose fournie',
      src: asset.publicPath, status: 'reviewed', width: asset.width, height: asset.height,
      sha256: asset.sha256, transparency: { mode: 'alpha' }, frames: [],
      sourceGenerator: 'user-supplied', assetKind: 'single-pose-reference', frameCount: 1,
      animated: false, canonicalIdentityVerified: false, nativeFacing: asset.nativeFacing,
      notes: [
        'Référence utilisateur · pose statique unique. Ne constitue ni un clip animé ni un combattant intégré.',
        asset.nativeFacing === 'left' ? 'Orientation native : gauche ; aucune symétrie appliquée.' : 'Orientation native : droite ; aucune symétrie appliquée.',
        'Provenance des pixels : archive fournie par l’utilisateur ; génération OpenAI non certifiée indépendamment.',
        ...asset.notes,
      ],
    });
    knownIds.add(asset.galleryId); knownSources.add(asset.publicPath);
  }
  return entries;
}
