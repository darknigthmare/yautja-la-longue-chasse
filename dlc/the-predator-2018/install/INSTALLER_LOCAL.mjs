import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node INSTALLER_LOCAL.mjs <repo>");
  process.exit(2);
}

const root = resolve(target);
const here = resolve(import.meta.dirname, "..");
if (!existsSync(join(root, "package.json"))) {
  console.error("package.json introuvable");
  process.exit(3);
}

const publicDest = join(root, "public", "dlc", "the-predator-2018");
const routeDir = join(root, "app", "dlc", "the-predator-2018");
const routeDest = join(routeDir, "page.tsx");
const bridgeDest = join(root, "app", "game", "dlc", "the-predator-2018");
const markerPath = join(publicDest, ".installed-by-the-predator-dlc");

if (existsSync(publicDest) && !existsSync(markerPath)) {
  console.error(
    "Dossier public/dlc/the-predator-2018 déjà présent et non géré par cet installateur.",
  );
  process.exit(4);
}

if (
  existsSync(routeDest) &&
  !readFileSync(routeDest, "utf8").includes("THE_PREDATOR_2018_NATIVE_ROUTE")
) {
  console.error(
    "Route app/dlc/the-predator-2018/page.tsx déjà présente et non gérée.",
  );
  process.exit(5);
}

rmSync(publicDest, { recursive: true, force: true });
mkdirSync(publicDest, { recursive: true });
cpSync(join(here, "web"), publicDest, { recursive: true });

rmSync(routeDir, { recursive: true, force: true });
mkdirSync(routeDir, { recursive: true });
cpSync(
  join(here, "native-integration", "app", "dlc", "the-predator-2018"),
  routeDir,
  { recursive: true },
);

rmSync(bridgeDest, { recursive: true, force: true });
mkdirSync(bridgeDest, { recursive: true });
cpSync(
  join(here, "native-integration", "app", "game", "dlc", "the-predator-2018"),
  bridgeDest,
  { recursive: true },
);

const menu = join(root, "app", "game", "CampaignMainMenu.tsx");
const start = "/* THE_PREDATOR_2018_DLC_LINK_START */";
const end = "/* THE_PREDATOR_2018_DLC_LINK_END */";
const block = `${start}
     <button type="button" disabled={busy} onClick={()=>{window.location.href='/dlc/the-predator-2018';}}><span className={styles.actionTitle}>DLC · The Predator (2018)</span><small>v0.5 · 52 séquences · 183 zones · maîtrise miroir</small><span className={styles.actionArrow} aria-hidden="true">›</span></button>
     ${end}`;

let patchedMenu = false;
if (existsSync(menu)) {
  let source = readFileSync(menu, "utf8");
  const oldStart = source.indexOf(start);
  const oldEnd = source.indexOf(end);
  if (oldStart >= 0 && oldEnd > oldStart) {
    source =
      source.slice(0, oldStart) +
      block +
      source.slice(oldEnd + end.length);
    writeFileSync(menu, source);
    patchedMenu = true;
  } else {
    const anchor =
      "<button type=\"button\" disabled={busy||!catalog||!catalog.slots.some(s=>s.status!=='empty')} onClick={()=>open('load')}><span className={styles.actionTitle}>Charger une partie</span>";
    const at = source.indexOf(anchor);
    if (at >= 0) {
      const close = source.indexOf("</button>", at);
      if (close >= 0) {
        source =
          source.slice(0, close + 9) +
          `\n     ${block}` +
          source.slice(close + 9);
        writeFileSync(menu, source);
        patchedMenu = true;
      }
    }
  }
}

writeFileSync(
  markerPath,
  JSON.stringify(
    {
      version: "0.5.0-candidate.1",
      patchedMenu,
      route: "/dlc/the-predator-2018",
      hostCampaignSlots: false,
      huntCanvasFusion: false,
      nativeEventBridge: true,
      nativeCommandBridge: true,
      managedRouteFiles: ["page.tsx", "DlcFrame.tsx"],
      managedBridgeFiles: ["manifest.ts", "integrationContract.ts", "hostBridge.ts"],
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify({
    ok: true,
    version: "0.5.0-candidate.1",
    publicDest,
    routeDir,
    bridgeDest,
    patchedMenu,
    nativeEventBridge: true,
    nativeCommandBridge: true,
  }),
);
