import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("galaxy navigation keeps flight controls inside its spatial region", async () => {
  const source = await read("app/game/GalaxyMapPanel.tsx");
  const sectionTag = source.slice(
    source.indexOf("<section"),
    source.indexOf(">", source.indexOf("<section")) + 1,
  );

  assert.doesNotMatch(sectionTag, /onKeyDown/);
  assert.match(source, /role="region"/);
  assert.match(source, /<nav className="galaxy-v10-spatial-map"/);
  assert.match(source, /aria-current=\{selected \? "true"/);
  assert.match(source, /ref=\{stageRef\}[\s\S]*onKeyDown=\{onKeyDown\}/);
  assert.match(source, /if \(event\.target !== event\.currentTarget\) return/);
  assert.match(source, /event\.code === "KeyE"/);
  assert.doesNotMatch(source, /event\.key === "Tab"/);
  assert.match(source, /data-flight-x="-1"/);
});

test("galaxy route and bridge origins survive briefing and station detours", async () => {
  const [panel, client] = await Promise.all([
    read("app/game/GalaxyMapPanel.tsx"),
    read("app/game/GameClient.tsx"),
  ]);

  assert.match(panel, /initialState\?: GalaxyNavigationState/);
  assert.match(panel, /onStateChange\?: \(state: GalaxyNavigationState\)/);
  assert.match(panel, /initialState \?\? createGalaxyNavigationState\(\)/);
  assert.match(panel, /onStateChange\?\.\(state\)/);

  assert.match(client, /useState<GalaxyNavigationState>\(createGalaxyNavigationState\)/);
  assert.match(client, /initialState=\{galaxyNavigationState\}/);
  assert.match(client, /onStateChange=\{setGalaxyNavigationState\}/);
  assert.match(client, /onBack=\{\(\) => go\(mapReturnScreen\)\}/);
  assert.match(client, /onOpenMap=\{\(\) => openMap\("deck"\)\}/);
  assert.match(client, /openStationScreen\("armory", "briefing"\)/);
  assert.match(client, /onBack=\{\(\) => go\(stationReturnScreen\)\}/);
});

test("trophy workshop traps and restores focus with a narrow-screen layout", async () => {
  const [source, css] = await Promise.all([
    read("app/game/TrophyWorkshop.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(source, /previouslyFocusedRef/);
  assert.match(source, /setAttribute\("inert", ""\)/);
  assert.match(source, /event\.key === "Tab"/);
  assert.match(source, /previouslyFocusedRef\.current\?\.focus/);
  assert.match(source, /event\.detail === 0/);
  assert.match(css, /@media \(max-width: 440px\)[\s\S]*\.trophy-workshop-work-area[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
});

test("physical deck exposes semantic shortcuts and a mobile tracking viewport", async () => {
  const [source, css] = await Promise.all([
    read("app/game/PhysicalShipDeck.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(source, /role="region"/);
  assert.match(source, /role="group"/);
  assert.match(source, /physical-ship-deck__station-shortcuts/);
  assert.match(source, /event\.defaultPrevented/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /viewport\.scrollLeft = clamp/);
  assert.match(source, /const idleAtRest =[\s\S]*if \(idleAtRest\) \{[\s\S]*return;/);
  assert.match(source, /current\.x === x[\s\S]*return current/);
  assert.match(source, /touchControls: \{[\s\S]*flexWrap: "wrap"/);
  assert.match(css, /\.physical-ship-deck__map[\s\S]*min-width: 52rem !important/);
  assert.match(css, /\.physical-ship-deck__station-shortcuts[\s\S]*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 440px\)[\s\S]*\.physical-ship-deck__touch-controls[\s\S]*justify-content: center !important/);
  assert.match(
    css,
    /\.physical-medbay-entry__back[\s\S]*position: absolute[\s\S]*z-index: 13[\s\S]*top: 88px/,
  );
});

test("hunt mission keeps keyboard controls, live updates and modal focus accessible", async () => {
  const [hunt, client, css] = await Promise.all([
    read("app/game/HuntCanvas.tsx"),
    read("app/game/GameClient.tsx"),
    read("app/globals.css"),
  ]);
  const actionButton = hunt.slice(
    hunt.indexOf("function ActionButton("),
    hunt.indexOf("function formatTime("),
  );

  assert.match(hunt, /className="screen hunt-screen"[\s\S]*data-screen-focus[\s\S]*tabIndex=\{-1\}/);
  assert.match(hunt, /button, a, input, select, textarea, \[contenteditable\]/);
  assert.match(hunt, /event\.code !== "Escape" && isInteractiveControl\(event\.target\)/);
  assert.match(hunt, /onKeyDown: \(event: ReactKeyboardEvent<HTMLButtonElement>\)/);
  assert.match(hunt, /onKeyUp: \(event: ReactKeyboardEvent<HTMLButtonElement>\)/);
  assert.match(hunt, /event\.key !== " " && event\.key !== "Enter"/);
  assert.match(hunt, /onBlur: \(\) => setTouchHeld\(action, false\)/);
  assert.match(hunt, /onClick=\{\(\) => pressAction\("jump"\)\}/);
  assert.match(actionButton, /onClick=\{onPress\}/);
  assert.doesNotMatch(actionButton, /onPointerDown/);
  assert.match(
    hunt,
    /<div style=\{styles\.objectiveBar\}>\s*<div aria-live="polite" aria-atomic="true">/,
  );
  assert.doesNotMatch(hunt, /<div style=\{styles\.objectiveBar\}[^>]*aria-live/);
  assert.doesNotMatch(hunt, /<div style=\{styles\.trophyTimer\}[^>]*aria-live/);
  assert.match(hunt, /const huntDialogRef/);
  assert.match(hunt, /setAttribute\("inert", ""\)/);
  assert.match(hunt, /if \(event\.key !== "Tab"\) return/);
  assert.match(hunt, /previouslyFocusedRef\.current/);
  assert.match(hunt, /role="group" aria-label="Déplacement tactile"/);
  assert.match(hunt, /role="group" aria-label="Actions tactiles"/);
  assert.match(client, /data-high-contrast=\{save\.settings\.highContrastVision\}/);
  assert.match(client, /<h2 id="briefing-title">/);
  assert.doesNotMatch(client, /<h1 id="briefing-title">/);
  assert.match(css, /\.hunt-screen:focus-visible,\s*\.hunt-canvas:focus-visible/);
  assert.match(css, /\.hub-screen\[data-ship-room\]:focus-visible/);
});

test("mobile catalogue, armory and galaxy keep the map spatial without the previous crop", async () => {
  const [catalogue, client, hub, css] = await Promise.all([
    read("app/game/CatalogueHunterBrowser.tsx"),
    read("app/game/GameClient.tsx"),
    read("app/game/ShipHub.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(catalogue, /matchMedia\("\(max-width: 760px\)"\)/);
  assert.match(catalogue, /mediaQuery\.matches \? 6 : 18/);
  assert.match(catalogue, /aria-current=\{selected \? "true"/);
  assert.doesNotMatch(client, /className="physical-deck-launch"/);
  assert.match(hub, /id: "explore-physical-deck"/);
  assert.match(css, /\.armory-war-room-background[\s\S]*object-fit: contain/);
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*\.galaxy-v10-stage \{ min-height: max\(650px, calc\(100svh - 178px\)\); \}/,
  );
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*\.galaxy-v10-node \{[^}]*top: clamp\(24%, var\(--node-y\), 78%\); left: clamp\(18%, var\(--node-x\), 82%\)/,
  );
  assert.match(
    css,
    /\.galaxy-v10-node \{[\s\S]*position: absolute;[\s\S]*top: var\(--node-y\);[\s\S]*left: var\(--node-x\)/,
  );
  const mobileV10Start = css.lastIndexOf("@media (max-width: 760px)");
  const mobileV10End = css.indexOf("@media (max-width: 430px)", mobileV10Start);
  const mobileV10 = css.slice(mobileV10Start, mobileV10End);
  assert.doesNotMatch(mobileV10, /galaxy-v10-spatial-map[\s\S]*grid-template-columns/);
  assert.match(
    css,
    /rotate\(var\(--ship-rotation\)\) scaleX\(var\(--ship-flip\)\)/,
  );
});
