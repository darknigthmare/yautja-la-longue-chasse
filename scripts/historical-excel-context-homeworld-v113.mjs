import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHistoricalExcelContext} from './lib/historical-excel-context.mjs';

/** The published V112 Homeworld/Pit commit: every one of its 1 813 pinned fingerprints holds here. */
export const EXCEL_HOMEWORLD_HISTORY_COMMIT_V113 = 'a5ed39dfbed118669b2e76402c490b200136a74d';
export const EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V113 = '6c86bf561e9b5cf5f3439280a19d1963682cefa5fe5d03b2b1533c9bba08911b';
export const EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V113 = 'f5a39694079995b6c168c856b2251c51d478f30d831a02ab47c3a9ed0df137ea';
const context = createHistoricalExcelContext({
  repository: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  sourceCommit: EXCEL_HOMEWORLD_HISTORY_COMMIT_V113,
  release: 'V112',
  manifestPath: 'tests/fixtures/excel-history-v112-homeworld-v113.json',
  manifestSha256: EXCEL_HOMEWORLD_HISTORY_MANIFEST_SHA256_V113,
  archiveSha256: EXCEL_HOMEWORLD_HISTORY_ARCHIVE_SHA256_V113,
});
export const getHistoricalHomeworldExcelContextV113 = context.get;
export const verifyHistoricalHomeworldExcelContextV113 = context.verify;
export const loadHistoricalHomeworldExcelV113 = context.load;
export const runHistoricalHomeworldTestsV113 = context.runTests;
