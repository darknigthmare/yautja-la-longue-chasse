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
