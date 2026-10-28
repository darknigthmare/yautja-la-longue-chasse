import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHistoricalExcelContext} from './lib/historical-excel-context.mjs';

export const EXCEL_HOMEWORLD_HISTORY_COMMIT_V111 = '59bcc32929b1d3f6ee6e967da8cab8c561ca6f1d';
const context = createHistoricalExcelContext({
  repository: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  sourceCommit: EXCEL_HOMEWORLD_HISTORY_COMMIT_V111,
  release: 'V110',
  manifestPath: 'tests/fixtures/excel-history-v110-homeworld-v111.json',
  manifestSha256: '59837fbfdfb6f6e64ef00a1e07d4676bddd1090fc8106718ed16f698200b5bdf',
  archiveSha256: '7806c606111c667beee13726e725df61a738e60921c273f0cd7b2b3b372d8fd2',
});
export const getHistoricalHomeworldExcelContextV111 = context.get;
export const verifyHistoricalHomeworldExcelContextV111 = context.verify;
export const loadHistoricalHomeworldExcelV111 = context.load;
export const runHistoricalHomeworldTestsV111 = context.runTests;
