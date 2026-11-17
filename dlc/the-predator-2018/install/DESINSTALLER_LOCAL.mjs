import {
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node DESINSTALLER_LOCAL.mjs <repo>");
  process.exit(2);
}

const root = resolve(target);
const publicDest = join(root, "public", "dlc", "the-predator-2018");
const marker = join(publicDest, ".installed-by-the-predator-dlc");
const menu = join(root, "app", "game", "CampaignMainMenu.tsx");
const start = "/* THE_PREDATOR_2018_DLC_LINK_START */";
const end = "/* THE_PREDATOR_2018_DLC_LINK_END */";
let menuRestored = false;

if (existsSync(menu)) {
  let source = readFileSync(menu, "utf8");
  const a = source.indexOf(start);
  const b = source.indexOf(end);
  if (a >= 0 && b > a) {
    source = source.slice(0, a) + source.slice(b + end.length);
    writeFileSync(menu, source);
    menuRestored = true;
  }
}

const routeDir = join(root, "app", "dlc", "the-predator-2018");
const route = join(routeDir, "page.tsx");
if (
  existsSync(route) &&
  readFileSync(route, "utf8").includes("THE_PREDATOR_2018_NATIVE_ROUTE")
) {
  rmSync(routeDir, { recursive: true, force: true });
}

const bridge = join(root, "app", "game", "dlc", "the-predator-2018");
const contract = join(bridge, "integrationContract.ts");
if (
  existsSync(contract) &&
  readFileSync(contract, "utf8").includes("THE_PREDATOR_2018_NATIVE_BRIDGE")
) {
  rmSync(bridge, { recursive: true, force: true });
}

if (existsSync(marker)) {
  rmSync(publicDest, { recursive: true, force: true });
}

console.log(
  JSON.stringify({
    ok: true,
    menuRestored,
    removedManagedPublic: !existsSync(publicDest),
    removedRoute: !existsSync(route),
    removedBridge: !existsSync(bridge),
  }),
);
