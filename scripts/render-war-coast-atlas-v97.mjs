import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

// A neutral silhouette sheet drawn from the same polygons as the game. This
// comparison artifact intentionally removes faction colours and biome textures.
const output = path.resolve(process.env.YAUTJA_COASTS_QA_OUTPUT ?? "outputs/qa-planet-coasts-v97");
const bundled = await build({
  stdin: { contents: "export { WAR_PLANETS_V96 } from './app/game/systems/clanWarPlanetsV96'; export { warAtlasMapPathV95 } from './app/game/systems/clanWarAtlasV95';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "esm", target: "es2022", logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const columns = 5, width = 1260, cardWidth = 248, cardHeight = 166;
const rows = Math.ceil(api.WAR_PLANETS_V96.length / columns), height = rows * cardHeight + 85;
const cards = api.WAR_PLANETS_V96.map((planet, index) => {
  const x = 10 + index % columns * 250, y = 63 + Math.floor(index / columns) * cardHeight;
  const paths = planet.territories.map(territory => {
    const d = api.warAtlasMapPathV95(territory.points, 232, 116);
    assert(d && !d.includes("NaN"), `${planet.id}/${territory.id}: invalid coastline projection`);
    return `<path d="${d}" fill="#e3eee6" stroke="#e3eee6" stroke-width=".14"/>`;
  }).join("");
  return `<g transform="translate(${x} ${y})"><rect width="${cardWidth}" height="156" rx="6" fill="#10252c" stroke="#35505b"/><text x="9" y="19" fill="#f1dfb9" font-size="13">${escape(planet.name)}</text><text x="239" y="18" text-anchor="end" fill="#a7c9c1" font-size="9">${Math.round(planet.landFraction * 100)} % terres</text><g transform="translate(8 29)"><rect width="232" height="116" fill="#07171f"/>${paths}</g></g>`;
}).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#071117"/><g font-family="system-ui,sans-serif"><text x="13" y="26" fill="#f1e2c7" font-size="20">Atlas des 30 silhouettes planétaires</text><text x="13" y="46" fill="#a1bbb9" font-size="11">Polygones du jeu · côtes seules · sans textures ni couleurs de faction</text>${cards}</g></svg>\n`;
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, "silhouette-atlas.svg"), svg);
console.log(JSON.stringify({ planets: api.WAR_PLANETS_V96.length, territories: api.WAR_PLANETS_V96.reduce((sum, planet) => sum + planet.territories.length, 0), output: path.join(output, "silhouette-atlas.svg") }));
