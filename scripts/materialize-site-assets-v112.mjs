#!/usr/bin/env node
/** Reconstruct immutable public assets without putting their history in the Site Git repository. */
import {createHash, randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {lstat, mkdir, open, readFile, rename, rm} from 'node:fs/promises';
import path from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';

export const SITE_ASSET_REPOSITORY_V112 = 'darknigthmare/yautja-la-longue-chasse';
const SHA1 = /^[a-f0-9]{40}$/;
const ownKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const invalid = message => { throw new TypeError(message); };

/** Paths are relative to public/. URL encoding is performed once, after validation. */
export function validateSiteAssetManifestV112(manifest) {
  if (!ownKeys(manifest, ['schemaVersion', 'repository', 'commit', 'files']) ||
      manifest.schemaVersion !== 1 || manifest.repository !== SITE_ASSET_REPOSITORY_V112 ||
      typeof manifest.commit !== 'string' || !SHA1.test(manifest.commit) ||
      !Array.isArray(manifest.files) || manifest.files.length > 100000) invalid('Invalid immutable Site asset manifest');
  const paths = new Set();
  let bytes = 0;
  for (const file of manifest.files) {
    if (!ownKeys(file, ['path', 'gitBlobSha1', 'size']) || typeof file.path !== 'string' ||
        !file.path || !file.path.isWellFormed() || file.path.length > 4096 || /[\\\u0000-\u001f\u007f]/.test(file.path) ||
        file.path.startsWith('/') || /^[A-Za-z]:/.test(file.path) ||
        file.path.split('/').some(segment => !segment || segment === '.' || segment === '..') ||
        typeof file.gitBlobSha1 !== 'string' || !SHA1.test(file.gitBlobSha1) ||
        !Number.isSafeInteger(file.size) || file.size < 0) invalid('Invalid Site asset entry');
    if (paths.has(file.path)) invalid('Duplicate Site asset path: ' + file.path);
    paths.add(file.path);
    bytes += file.size;
    if (!Number.isSafeInteger(bytes)) invalid('Site asset total exceeds safe byte accounting');
  }
  for (const file of manifest.files) {
    const segments = file.path.split('/');
    for (let index = 1; index < segments.length; index++) {
      if (paths.has(segments.slice(0, index).join('/'))) invalid('Site asset file/directory conflict: ' + file.path);
    }
  }
  // Copy validated values so the caller cannot change a descriptor during a download.
  return Object.freeze({...manifest, files:Object.freeze(manifest.files.map(file => Object.freeze({...file}))), bytes});
}

export function siteAssetUrlV112(commit, relativePath) {
  // Validate both arguments through the same contract as the manifest.
  validateSiteAssetManifestV112({schemaVersion:1, repository:SITE_ASSET_REPOSITORY_V112, commit,
    files:[{path:relativePath, gitBlobSha1:'0'.repeat(40), size:0}]});
  return 'https://raw.githubusercontent.com/' + SITE_ASSET_REPOSITORY_V112 + '/' + commit +
    '/public/' + relativePath.split('/').map(encodeURIComponent).join('/');
}

async function statOrMissing(target) {
  try { return await lstat(target); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

/** Inspect every component, including the selected root, rather than following directory links. */
async function safeDirectory(directory, create = true) {
  const absolute = path.resolve(directory), parsed = path.parse(absolute);
  let current = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let info = await statOrMissing(current);
    if (!info && create) {
      try { await mkdir(current, {mode:0o755}); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      info = await statOrMissing(current);
    }
    if (!info) return false;
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Asset directory must contain only real directories: ' + current);
  }
  return true;
}

async function inspectDestination(target) {
  const info = await statOrMissing(target);
  if (info && (info.isSymbolicLink() || !info.isFile())) throw new Error('Asset destination must be a regular file: ' + target);
  return info;
}

async function existingAssetMatches(target, file) {
  const info = await inspectDestination(target);
  if (!info || info.size !== file.size) return false;
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.size !== file.size || opened.ino !== info.ino || opened.dev !== info.dev) return false;
    const hash = createHash('sha1').update('blob ' + file.size + '\0');
    let bytes = 0;
    for await (const chunk of handle.createReadStream({autoClose:false})) {
      bytes += chunk.length;
      if (bytes > file.size) return false;
      hash.update(chunk);
    }
    return bytes === file.size && hash.digest('hex') === file.gitBlobSha1;
  } finally { await handle.close(); }
}

async function downloadAsset(manifest, file, target, fetchImpl, signal, timeoutMs) {
  const temporary = path.join(path.dirname(target), '.site-asset-v112-' + randomUUID() + '.tmp');
  let handle = null, created = false;
  try {
    const response = await fetchImpl(siteAssetUrlV112(manifest.commit, file.path), {
      redirect:'error', signal:AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error('Asset download failed with HTTP ' + response.status + ': ' + file.path);
    }
    if (!await safeDirectory(path.dirname(target), false)) throw new Error('Asset parent disappeared during download: ' + file.path);
    await inspectDestination(target);
    handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
    created = true;
    const hash = createHash('sha1').update('blob ' + file.size + '\0');
    let bytes = 0;
    const integrity = new Transform({transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (signal.aborted) return callback(signal.reason);
      if (bytes > file.size) return callback(new Error('Asset exceeds declared size: ' + file.path));
      hash.update(chunk);
      callback(null, chunk);
    }});
    await pipeline(Readable.fromWeb(response.body), integrity, handle.createWriteStream());
    if (bytes !== file.size || hash.digest('hex') !== file.gitBlobSha1) throw new Error('Asset integrity mismatch: ' + file.path);
    signal.throwIfAborted();
    // Recheck immediately before replacement; never replace or traverse a link.
    await safeDirectory(path.dirname(target), false);
    await inspectDestination(target);
    await rename(temporary, target);
    created = false;
  } finally {
    if (handle) await handle.close();
    if (created) await rm(temporary, {force:true});
  }
}

/** fetchImpl exists for isolated tests; the CLI always uses the fixed GitHub URL and native fetch. */
export async function materializeSiteAssetsV112(manifest, {
  directory = 'public', concurrency = 6, timeoutMs = 120000, fetchImpl = globalThis.fetch, onProgress,
} = {}) {
  const source = validateSiteAssetManifestV112(manifest);
  if (typeof directory !== 'string' || !directory || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16 ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600000 || typeof fetchImpl !== 'function' ||
      (onProgress !== undefined && typeof onProgress !== 'function')) invalid('Invalid Site materialization options');
  const root = path.resolve(directory), abort = new AbortController();
  await safeDirectory(root);
  // Refuse every existing unsafe path before beginning any request or replacement.
  for (const file of source.files) {
    const target = path.join(root, ...file.path.split('/'));
    if (await safeDirectory(path.dirname(target), false)) await inspectDestination(target);
  }
  const result = {repository:source.repository, commit:source.commit, files:source.files.length,
    bytes:source.bytes, downloaded:0, downloadedBytes:0, skipped:0};
  let next = 0, failure = null;
  const worker = async () => {
    try {
      while (!abort.signal.aborted) {
        const index = next++;
        if (index >= source.files.length) return;
        const file = source.files[index], target = path.join(root, ...file.path.split('/'));
        await safeDirectory(path.dirname(target));
        if (await existingAssetMatches(target, file)) result.skipped++;
        else {
          await downloadAsset(source, file, target, fetchImpl, abort.signal, timeoutMs);
          result.downloaded++;
          result.downloadedBytes += file.size;
        }
        onProgress?.({...result});
      }
    } catch (error) {
      if (!failure) { failure = error; abort.abort(error); }
    }
  };
  await Promise.all(Array.from({length:Math.min(concurrency, source.files.length)}, worker));
  if (failure) throw failure;
  return result;
}

async function cli() {
  const options = {manifest:null, directory:'public'}, seen = new Set();
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/, '');
    if (!args[index].startsWith('--') || !Object.hasOwn(options, key) || seen.has(key) || !args[index + 1] || args[index + 1].startsWith('--'))
      invalid('Usage: node scripts/materialize-site-assets-v112.mjs --manifest PATH [--directory public]');
    options[key] = args[index + 1]; seen.add(key);
  }
  if (!options.manifest) invalid('An immutable asset manifest is required');
  const manifestPath = path.resolve(options.manifest);
  if (!await safeDirectory(path.dirname(manifestPath), false)) invalid('Manifest parent does not exist');
  const info = await inspectDestination(manifestPath);
  if (!info || info.size > 32 * 1024 * 1024) invalid('Manifest must be a regular JSON file of at most 32 MiB');
  const handle = await open(manifestPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes;
  try { bytes = await readFile(handle, 'utf8'); } finally { await handle.close(); }
  const result = await materializeSiteAssetsV112(JSON.parse(bytes), {directory:options.directory, onProgress(progress) {
    const complete = progress.downloaded + progress.skipped;
    if (complete % 100 === 0) console.error('Site assets verified: ' + complete + '/' + progress.files);
  }});
  console.log(JSON.stringify({result:'PASS_BYTE_EXACT_SITE_ASSETS', ...result}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await cli().catch(error => { console.error('Site asset materialization failed: ' + error.message); process.exitCode = 1; });
}
