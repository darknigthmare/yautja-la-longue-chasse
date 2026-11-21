/** Play all three witnessed Elite-to-Elder scenes from the same campaign in compiled Next. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";
import { completeElderMentoring, eliteAdmission, openCampaignDossier } from "./qa-elder-mentoring-v168.mjs";
import { completeElderPassage } from "./lib/qa-elder-passage-ui-v168.mjs";

const origin = "http://127.0.0.1:3121/";
const output = resolve("outputs/qa-elder-assembly-v168");
await mkdir(output, { recursive: true });
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (process.env.ELDER_ASSEMBLY_QA_COMMIT) assert.equal(commit, process.env.ELDER_ASSEMBLY_QA_COMMIT);
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
assert.ok(buildId);
const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const { getChronicleRank } = qa.load("app/game/systems/clanChronicle.ts");
const admitted = eliteAdmission(qa);
const report = {
  commit, buildId, passed: false, errors: [],
  admission: "Declared narrative Elite and 8000 career honor. All three acts are played in one compiled campaign.",
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 980, height: 840 }, storageState: { cookies: [], origins: [{
    origin: new URL(origin).origin, localStorage: [{ name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(admitted) }],
  }] } });
  page.on("pageerror", error => report.errors.push(error.message));
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
  const button = name => page.getByRole("button", { name, exact: true });
  const openPassage = "Ouvrir le dossier du passage";
  const openAssembly = "Ouvrir l’assemblée des aînés";
  const regular = "Siéger régulièrement au conseil";
  const travel = "Assumer un engagement itinérant";
  await page.goto(origin);
  await openCampaignDossier(page);
  await button("Ouvrir le terrain du novice").waitFor();
  assert.equal(await button(openAssembly).count(), 0);
  report.mentoring = await completeElderMentoring(page);
  assert.equal(await button(openAssembly).count(), 0);
  await button(openPassage).click();
  await page.locator("[data-elder-passage-v168]").waitFor();
  await completeElderPassage(page, disk);
  const before = await disk();
  assert.equal(getChronicleRank(before.prologue.chronicle), "elite");
  assert.deepEqual(before.elderPassageJudgmentV168.trial, { method: "schedule", delay: 3 });
  report.judgment = before.elderPassageJudgmentV168;
  await button(openAssembly).click();
  assert.equal(await button(travel).isEnabled(), false);
  await button("Écouter la déposition du mentor").click();
  assert.equal(await button(regular).isEnabled(), false);
  await button("Écouter la déposition du témoin").click();
  assert.equal(await button(travel).isEnabled(), true);
  await button(travel).focus();
  await page.keyboard.press("Enter");
  await page.locator("[data-elder-assembly-complete]").waitFor();
  const completed = await disk();
  assert.deepEqual(completed.elderAssemblyV168, {
    version: 1, ownerCreatedAt: admitted.createdAt, revision: 3,
    mentoringReviewed: true, judgmentReviewed: true, responsibility: "travel",
  });
  assert.equal(completed.profile.honor, before.profile.honor);
  assert.equal(getChronicleRank(completed.prologue.chronicle), "elder");
  assert.deepEqual(completed.elderMentoringV168, report.mentoring);
  assert.deepEqual(completed.elderPassageJudgmentV168, report.judgment);
  report.assembly = completed.elderAssemblyV168;
  await page.locator("[data-elder-assembly-v168]").screenshot({ path: join(output, "assemblée.png") });
  await page.reload();
  await openCampaignDossier(page);
  await button(openAssembly).click();
  await page.locator("[data-elder-assembly-complete]").waitFor();
  assert.deepEqual((await disk()).elderAssemblyV168, report.assembly);
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = error.stack ?? String(error);
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
