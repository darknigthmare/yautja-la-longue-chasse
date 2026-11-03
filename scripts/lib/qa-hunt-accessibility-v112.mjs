import assert from "node:assert/strict";

/** Real React controls in the bounded QA fixture. Persistence is the fixture's
 * native localStorage parent, not a claim of end-to-end GameClient durability. */
export async function runAccessibilityBrowserV112(page) {
  const checks=[];
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.__huntMechanicsQaV112.reset());
  await page.evaluate(()=>window.__huntMechanicsQaV112.show("accessibility"));
  const heading=page.getByRole("heading",{name:"Rites et canopée · accessibilité"});
  await heading.waitFor({state:"visible"});
  const timing=page.getByLabel("Fenêtre des glyphes",{exact:true});
  const confirmation=page.getByLabel("Confirmation du rite",{exact:true});
  const expectSettings=async(key,value)=>page.waitForFunction(({key,value})=>window.__huntMechanicsQaV112.settings()[key]===value,{key,value});
  for(const mode of ["generous","unlimited","normal"]) {
    await timing.selectOption(mode);await expectSettings("ritualTiming",mode);
    assert.equal(await page.evaluate(()=>window.__huntMechanicsQaV112.save().settings.huntAccessibility.ritualTiming),mode);
  }
  checks.push("native selects save all three glyph timing preferences");
  for(const mode of ["hold","toggle","press"]) {
    await confirmation.selectOption(mode);await expectSettings("ritualConfirm",mode);
  }
  checks.push("press, hold and toggle confirmation choices remain available");

  const grip=page.getByRole("checkbox",{name:/^Prise en bascule/});
  await grip.focus();await page.keyboard.press("Space");await expectSettings("gripInput","toggle");
  assert.equal(await grip.isChecked(),true);
  await page.keyboard.press("Space");await expectSettings("gripInput","hold");
  const aim=page.getByRole("checkbox",{name:/^Visée en bascule/});
  await aim.check();await expectSettings("aimInput","toggle");
  checks.push("keyboard Space toggles grip without pointer precision; aim persists separately");

  await page.getByText("Remapper la manette de chasse",{exact:true}).click();
  const jump=page.getByLabel("Manette : Saut / lâcher",{exact:true});
  const old=await page.evaluate(()=>window.__huntMechanicsQaV112.settings().gamepadButtons);
  await jump.selectOption("2");
  await page.waitForFunction(()=>window.__huntMechanicsQaV112.settings().gamepadButtons.jump===2);
  const swapped=await page.evaluate(()=>window.__huntMechanicsQaV112.settings().gamepadButtons);
  assert.equal(swapped.jump,2);assert.equal(swapped.melee,old.jump);
  assert.equal(new Set(Object.values(swapped)).size,12);
  assert.equal(await page.getByLabel("Manette : Lames",{exact:true}).inputValue(),String(old.jump));
  checks.push("controller reassignment swaps actions and preserves twelve unique bindings");

  const guide=page.locator("[data-field-guide-v112]");
  await page.evaluate(()=>window.__huntMechanicsQaV112.guide("tracking",true));
  await guide.getByText(/Prise épuisée/).waitFor({state:"visible"});
  const summary=guide.locator("summary");
  await summary.focus();await page.keyboard.press("Space");
  assert.equal(await summary.evaluate(element=>element.parentElement.open),true);
  assert.match(await guide.innerText(),/X \/ Carré/);
  assert.match(await guide.innerText(),/corps est la proie vaincue/);
  checks.push("field guide opens with the keyboard and reflects remapped jump labels");
  await page.evaluate(()=>window.__huntMechanicsQaV112.guide("trophy",false));
  await guide.getByText(/Trophée Apex/).waitFor({state:"visible"});
  await page.evaluate(()=>window.__huntMechanicsQaV112.guide("extraction",false));
  await guide.getByText(/Extraction : rejoins la balise/).waitFor({state:"visible"});
  checks.push("guide distinguishes exhausted grip, corpse harvesting and extraction");

  await page.getByRole("button",{name:"Restaurer ces options de chasse",exact:true}).click();
  await expectSettings("ritualTiming","normal");await expectSettings("ritualConfirm","press");
  const reset=await page.evaluate(()=>window.__huntMechanicsQaV112.settings());
  assert.equal(reset.gripInput,"hold");assert.equal(reset.aimInput,"hold");assert.equal(reset.gamepadButtons.jump,0);
  assert.equal(reset.fieldGuide,true);assert.equal(reset.largeGlyphs,true);
  assert.deepEqual(await page.evaluate(()=>window.__huntMechanicsQaV112.save().settings.huntAccessibility),reset);
  checks.push("explicit reset restores a complete serializable profile");
  const geometry=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(geometry.scroll<=geometry.width+1,"accessibility controls must fit the 390px viewport");
  assert.match(await page.locator("body").innerText(),/Le temps de chasse et les dangers continuent/);
  checks.push("390px layout fits horizontally and announces scoring/time consequences");
  return checks;
}
