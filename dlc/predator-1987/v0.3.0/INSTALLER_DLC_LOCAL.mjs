import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const repoArg = process.argv[2];
if (!repoArg) {
  console.error('Usage: node INSTALLER_DLC_LOCAL.mjs <chemin-du-repo-yautja-la-longue-chasse>');
  process.exit(2);
}
const repo = resolve(repoArg);
const pkgPath = join(repo, 'package.json');
if (!existsSync(pkgPath)) {
  console.error(`package.json introuvable dans ${repo}`);
  process.exit(2);
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if (pkg.name !== 'yautja-la-longue-chasse') {
  console.error(`Dépôt inattendu: package name = ${pkg.name ?? '(absent)'}`);
  process.exit(2);
}
const target = join(repo, 'private-dlc', 'predator-1987');
if (existsSync(target)) rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
const skip = new Set(['INSTALLER_DLC_LOCAL.mjs', 'DESINSTALLER_DLC_LOCAL.mjs']);
for (const entry of ['JOUER_PREDATOR_1987.html','manifest.dlc.json','README.md','RAPPORT_PREDATOR_1987.html','CODEX_PREDATOR_1987.html','VALIDATION.json','src','docs','captures','tests','scripts']) {
  const src = join(HERE, entry);
  if (!existsSync(src)) continue;
  cpSync(src, join(target, entry), { recursive: statSync(src).isDirectory() });
}
console.log(`DLC privé installé dans: ${target}`);
console.log('Aucun fichier public, package.json ou route du jeu principal n’a été modifié.');
