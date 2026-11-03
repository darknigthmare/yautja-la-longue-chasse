import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

export async function historicalReserveApiV6(version) {
  const root = new URL('../fixtures/preserve-v6-history-20261102/', import.meta.url);
  const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', root), 'utf8'));
  const capsule = manifest.capsules.find(item => item.version === version);
  if (!capsule) throw new Error('Unknown historical Preserve context: ' + version);
  const compressed = await fs.readFile(new URL(capsule.path, root));
  const digest = value => createHash('sha256').update(value).digest('hex');
  if (digest(compressed) !== capsule.sha256) throw new Error('Historical Preserve capsule bytes changed');
  const source = gunzipSync(compressed);
  if (digest(source) !== capsule.sourceSha256) throw new Error('Historical Preserve source changed');
  return import('data:text/javascript;base64,' + source.toString('base64'));
}
