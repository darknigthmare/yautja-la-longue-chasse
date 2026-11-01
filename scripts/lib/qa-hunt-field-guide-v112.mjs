import assert from "node:assert/strict";

/** Checks the real guide's DOM disclosure and readable layout. The surrounding
 * fixture supplies state; this does not measure a beginner's understanding. */
export async function runFieldGuideBrowserV112(page){
  const checks=[];
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.__huntMechanicsQaV112.reset();window.__huntMechanicsQaV112.show("accessibility");});
  const guide=page.locator("[data-field-guide-v112]");
  await guide.waitFor({state:"visible"});
  const remap=page.getByText("Remapper la manette de chasse",{exact:true});
  if(!await remap.evaluate(element=>element.parentElement.open))await remap.click();
  await page.getByLabel("Manette : Interagir",{exact:true}).selectOption("3");
  await page.waitForFunction(()=>window.__huntMechanicsQaV112.settings().gamepadButtons.interact===3);
  await page.evaluate(()=>window.__huntMechanicsQaV112.guide("extraction",false));
  await page.waitForFunction(()=>document.querySelector("[data-guide-cue-v112]")?.textContent.includes("Y / Triangle"));
  assert.match(await guide.locator("[data-guide-cue-v112]").textContent(),/Extraction : rejoins la balise/);
  assert.match(await guide.locator("[data-guide-cue-v112]").textContent(),/Y \/ Triangle/);
  checks.push("guide immediate extraction cue reflects the actual remapped controller action");

  const summary=guide.locator("summary");
  if(await summary.evaluate(element=>element.parentElement.open))await summary.click();
  await summary.focus();await page.keyboard.press("Enter");
  assert.equal(await summary.evaluate(element=>element.parentElement.open),true);
  const steps=guide.locator("[data-guide-checklist-v112] > li");
  assert.equal(await steps.count(),11);
  assert.match(await guide.innerText(),/Tab puis Entrée/);
  assert.match(await guide.innerText(),/corps est la proie vaincue/);
  assert.match(await guide.innerText(),/ne crée pas un trophée/);
  assert.match(await guide.innerText(),/nettoie, traite, sèche puis monte/);
  await steps.last().scrollIntoViewIfNeeded();
  assert.equal(await steps.last().isVisible(),true);
  await summary.focus();await page.keyboard.press("Space");
  assert.equal(await summary.evaluate(element=>element.parentElement.open),false);
  await page.keyboard.press("Space");
  assert.equal(await summary.evaluate(element=>element.parentElement.open),true);
  checks.push("guide opens and closes by native Enter/Space; eleven steps reach the workshop and stay keyboard reachable");

  await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
  try{
    assert.ok(await guide.evaluate(element=>parseFloat(getComputedStyle(element).fontSize))>=32);
    await steps.last().scrollIntoViewIfNeeded();
    const geometry=await guide.evaluate(element=>({viewport:window.innerWidth,document:document.documentElement.scrollWidth,
      left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right,
      childOverflow:[...element.querySelectorAll("li,p,summary")].some(child=>child.scrollWidth>child.clientWidth+1)}));
    assert.ok(geometry.document<=geometry.viewport+1,"390px guide at 200% text has no horizontal document overflow");
    assert.ok(geometry.left>=0&&geometry.right<=geometry.viewport+1,"guide fits the viewport");
    assert.equal(geometry.childOverflow,false,"guide paragraphs and lists wrap at doubled root text size");
  }finally{await page.evaluate(()=>{document.documentElement.style.fontSize="";});}
  checks.push("390px viewport with 200% root text preserves wrapped guide content and the final conservation step");
  await summary.scrollIntoViewIfNeeded();
  return checks;
}
