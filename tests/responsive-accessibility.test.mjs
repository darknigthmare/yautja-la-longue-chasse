import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("galaxy navigation keeps keyboard handling inside the composite widget", async () => {
  const source = await read("app/game/GalaxyMapPanel.tsx");
  const sectionTag = source.slice(
    source.indexOf("<section"),
    source.indexOf(">", source.indexOf("<section")) + 1,
  );

  assert.doesNotMatch(sectionTag, /onKeyDown/);
  assert.match(source, /aria-activedescendant=/);
  assert.match(source, /data-screen-focus/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /ref=\{chartRef\}[\s\S]*onKeyDown=\{onKeyDown\}/);
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

test("mobile catalogue and armory avoid the previous excessive page and crop", async () => {
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
  assert.match(css, /left: clamp\(23%, var\(--node-x\), 77%\)/);
});
