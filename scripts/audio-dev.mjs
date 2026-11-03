import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { watchAudioManifest } from "./build-audio-manifest.mjs";

const close = await watchAudioManifest();
const packageRoot = path.resolve("node_modules/vinext");
const metadata = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));
const child = spawn(process.execPath, [path.join(packageRoot, metadata.bin.vinext), "dev", ...process.argv.slice(2)], { stdio: "inherit", windowsHide: true });
child.once("error", error => { close(); console.error(error.message); process.exitCode = 1; });
child.once("exit", code => { close(); process.exitCode = code ?? 0; });
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { close(); child.kill(signal); });
