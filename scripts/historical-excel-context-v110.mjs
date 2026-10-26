import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHistoricalExcelContext} from './lib/historical-excel-context.mjs';

export const EXCEL_HISTORY_COMMIT_V110 = '876a229f43cf01a8135df7ca864e4e11487d8613';
const context = createHistoricalExcelContext({
  repository: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  sourceCommit: EXCEL_HISTORY_COMMIT_V110,
  release: 'V109',
  manifestPath: 'tests/fixtures/excel-history-v109-v110.json',
  manifestSha256: 'd112c6587d2407cc0f21b9dcbf0086502fa39503e00437647792af666a0b617a',
  archiveSha256: 'c7c0c657ca462b0f77081a1502490f7dde6bd2699be15d9860779def401acc0c',
});
export const getHistoricalExcelContextV110 = context.get;
export const verifyHistoricalExcelContextV110 = context.verify;
export const loadHistoricalExcelV110 = context.load;
export const runHistoricalTestsV110 = context.runTests;
