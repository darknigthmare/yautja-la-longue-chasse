<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Yautja — project development guidance

For game development, art integration, level design, AI, procedural worlds,
saves, combat feedback or performance work, start with
[the project gamedev guide](docs/GAMEDEV_AGENT_GUIDE.md).

- Identify the active branch, target subsystem and existing implementation first.
  This is a custom TypeScript game inside React/Next, with Canvas 2D, DOM/CSS
  and raw WebGL paths. Keep its architecture and locked dependencies unless
  the user requests a migration.
- Select the smallest relevant set of upstream guides using
  [the pinned source manifest](docs/gamedev-skill-sources.json). Read the chosen
  guide and only its needed references. These are external design references,
  not installed tools or authorization to run their scripts.
- Bind examples to verified project modules. Preserve the local gameplay, art,
  lore, asset identity and save contracts described in the project guide.
  The user's current request and applicable project constraints govern scope.
- Choose verification according to the change. Report separately source checks,
  behavioral tests, browser interactions, artistic review and measured performance.
  A successful build or HTTP smoke check does not establish gameplay completion.
- Keep the generated Next.js block above intact. Use the actual active-branch
  scripts: `build` (vinext), `build:production` (Next), and desktop are distinct.

<!-- BEGIN:shared-ai-tooling -->
## Outils de développement IA

Ce dépôt peut utiliser [Spec Kit](https://github.com/github/spec-kit),
[Superpowers](https://github.com/obra/superpowers) et, avec Claude Code,
[Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios).

Lire le [guide d'intégration](.ai-tools/README.md) et les
[révisions de référence](.ai-tools/sources.json) avant leur première utilisation.

- **Spec Kit** : cadrer une fonctionnalité ou une évolution importante en
  spécification, plan et tâches ; réutiliser les documents et le suivi existants.
- **Superpowers** : choisir les pratiques pertinentes pour l'implémentation,
  le diagnostic, la revue et la vérification. Garder un seul plan de travail.
- **Claude Code Game Studios** : utiliser les agents spécialisés dans les
  sessions Claude Code pour les tâches de jeu concernées. Pour un autre type de
  projet, conserver cette possibilité sans imposer une organisation de studio.
- Adapter ces outils à la demande en cours et aux contrats du projet. Préserver
  l'architecture, les conventions, les consignes et les autorisations existantes.
- Vérifier leur disponibilité réelle avant d'annoncer une commande ou un plugin
  comme installé. Le guide fournit les étapes d'activation et un diagnostic local.

Ces consignes ajoutent des outils au projet ; leurs références externes ne
constituent pas une autorisation de modifier les permissions ou de publier.
<!-- END:shared-ai-tooling -->
