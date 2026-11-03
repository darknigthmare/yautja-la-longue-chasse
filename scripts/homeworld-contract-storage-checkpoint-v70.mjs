import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/** Isolated browser QA only. Reads and preserves the whole actual localStorage;
 * no game data is synthesized and nothing is written back to the browser.
 */
export async function writeHomeworldContractStorageCheckpointV70(page, {
  folder, saveKey, chainId, url, checkpoint = 'durable-contract-progress',
}) {
  assert(folder && saveKey && chainId, 'A checkpoint must name its isolated campaign');
  const storage = await page.evaluate(() => Object.fromEntries(
    Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter(key => key !== null).sort().map(key => [key, localStorage.getItem(key)]),
  ));
  assert.equal(typeof storage[saveKey], 'string', 'The actual played save must exist');
  const save = JSON.parse(storage[saveKey]);
  const snapshot = {
    key: saveKey, save, storage, url, chainId, checkpoint,
    provenance: 'Entire localStorage read from this isolated played browser campaign; save, journal and slots are retained verbatim. No progress is reconstructed from a report.',
    storageSha256: createHash('sha256').update(JSON.stringify(storage)).digest('hex'),
    capturedAt: new Date().toISOString(),
  };
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, 'storage-full-snapshot.json'), JSON.stringify(snapshot, null, 2));
  return snapshot;
}

/** Explicit QA environment fallback for an already-running recipe which loads
 * the sensitive-expedition helper dynamically after its second chapter.
 * Unconfigured helpers do not write any checkpoint file.
 */
export async function writeHomeworldContractStorageCheckpointFromEnvV70(page, {
  saveKey, checkpoint,
}) {
  const output = process.env.V70_CHAIN_QA_OUTPUT, chainId = process.env.V70_CONTRACT_CHAIN;
  if (!output || !['return-line', 'hunter-measure'].includes(chainId)) return null;
  return writeHomeworldContractStorageCheckpointV70(page, {
    folder: path.join(output, chainId), saveKey, chainId,
    url: process.env.V70_QA_URL, checkpoint,
  });
}
