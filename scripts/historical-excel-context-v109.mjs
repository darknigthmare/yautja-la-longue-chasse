import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHistoricalExcelContext} from './lib/historical-excel-context.mjs';

export const EXCEL_HISTORY_COMMIT_V109 = '2d88854b44c7cac14063f4445b8e0855646e7dec';
const context = createHistoricalExcelContext({
  repository: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  sourceCommit: EXCEL_HISTORY_COMMIT_V109,
  release: 'V108',
  manifestPath: 'tests/fixtures/excel-history-v108-v109.json',
  manifestSha256: '006c9fe4001c7a68fbc34776b4b9d3097d52369441b2940bf4255abd8b39fa6c',
  archiveSha256: '0746d5176474cb5249ea262ec6ef0e0ad70ba439c1ec70de51bd8320d57e420c',
});
export const getHistoricalExcelContextV109 = context.get;
export const verifyHistoricalExcelContextV109 = context.verify;
export const loadHistoricalExcelV109 = context.load;
export const runHistoricalTestsV109 = context.runTests;
