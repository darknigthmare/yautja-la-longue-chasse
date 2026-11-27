/** Play the witnessed R2-M050 schedule through the compiled campaign. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { completeElderPassage } from "./lib/qa-elder-passage-ui-v168.mjs";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";

const url = "http://127.0.0.1:3121/";
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (process.env.ELDER_PASSAGE_QA_COMMIT) assert.equal(commit, process.env.ELDER_PASSAGE_QA_COMMIT);
const buildId = (await readFile(".next/BUILD_ID","utf8")).trim();
assert(buildId);
const output = resolve("outputs/p0-p3-20261121/passage");
await mkdir(output,{recursive:true});
const { defaultSave, parseSaveImport, exportSave, SAVE_STORAGE_KEY } = homeworldSceneSsrV78().load("app/game/save.ts");
const save = defaultSave("2026-11-21T07:00:00.000Z");
save.profile = { ...save.profile, honor: 8000, rankId: "elite", acquiredRankIdV166: "elite" };
save.settings.masterVolume = 0;
const admitted = parseSaveImport(exportSave(save)).save;
assert(admitted);
const report = { commit, buildId, passed: false, errors: [], admission: "Declared adult save with 8,000 honor. All passage actions are played through the compiled game." };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless:true });
const page = await browser.newPage({ viewport: { width:980,height:840 },storageState:{cookies:[],origins:[{
  origin:new URL(url).origin,localStorage:[{name:SAVE_STORAGE_KEY,value:JSON.stringify(admitted)}],
}]} });
page.on("pageerror",error=>report.errors.push(error.message));
const disk = () => page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_STORAGE_KEY);
async function open() {
  await page.waitForSelector("[data-campaign-menu], [data-campaign-session]");
  if (await page.locator("[data-campaign-menu]").isVisible()) {
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator("[data-campaign-session]").waitFor();
  }
  const play = page.getByRole("button",{name:"Jouer",exact:true});
  if(await play.isVisible()) await play.click();
  const dossier = page.getByRole("button",{name:"Dossier de campagne",exact:true});
  const enter = page.getByRole("button",{name:"Ouvrir le dossier du passage",exact:true});
  await dossier.or(enter).first().waitFor();
  if (!(await enter.isVisible())) await dossier.click();
  await enter.click();
  await page.locator("[data-elder-passage-v168]").waitFor();
}
try {
  await page.goto(url);
  await open();
  await completeElderPassage(page, disk);
  const concluded = await disk();
  assert.deepEqual(concluded.elderPassageJudgmentV168.trial,{method:"schedule",delay:3});
  assert.deepEqual(concluded.profile,admitted.profile);
  await page.screenshot({path:join(output,"temoin.png")});
  await page.reload();
  await open();
  await page.locator("[data-passage-resolved]").waitFor();
  assert.deepEqual((await disk()).elderPassageJudgmentV168,concluded.elderPassageJudgmentV168);
  assert.deepEqual(report.errors,[]);
  report.passed = true;
} finally {
  await browser.close();
  await writeFile(join(output,"report.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report));
}
