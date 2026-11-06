import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
const repoArg = process.argv[2];
if (!repoArg) {
  console.error('Usage: node DESINSTALLER_DLC_LOCAL.mjs <chemin-du-repo-yautja-la-longue-chasse>');
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
rmSync(target, { recursive: true, force: true });
console.log(`DLC privé retiré: ${target}`);
