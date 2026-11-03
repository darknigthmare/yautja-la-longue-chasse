@AGENTS.md

# Claude Code Game Studios — workflow for Yautja : La Longue Chasse

This repo uses the Claude Code Game Studios (CCGS) framework v1.2.0
(https://github.com/Donchitos/Claude-Code-Game-Studios, MIT — see
`.claude/CCGS-LICENSE`): 49 agents, 74 slash-command skills, hooks and rules
under `.claude/`. **The project guidance in `AGENTS.md` above takes precedence
over any CCGS default below** (architecture, locked dependencies, save/asset
contracts, verification reporting).

## Technology Stack

- **Engine**: Custom — TypeScript game inside React 19 / Next 16 (not Godot, Unity or Unreal)
- **Rendering**: Canvas 2D, DOM/CSS and raw WebGL
- **Language**: TypeScript (`tsc --noEmit`, ESLint)
- **Build System**: `npm run build` (vinext), `npm run build:production` (Next), `npm run build:desktop` (Vite + Electron)
- **Tests**: Node test runner — `tests/*.test.mjs`, `tests/*.test.ts`; audits in `scripts/`
- **Version Control**: Git, PRs into `main` (CI in `.github/workflows/`)

> The engine-specialist agents (`godot-*`, `unity-*`, `ue-*`) do not apply.
> Route code work to `lead-programmer`, `gameplay-programmer`,
> `engine-programmer`, `ui-programmer` and `performance-analyst`.

## Project Structure

This project keeps its own layout; the CCGS `src/` examples do not apply.

- `app/` — game source (code root): `app/game/`, `app/game/systems/`, `app/game/data/`
- `public/game/` — runtime assets; `art-source/` — art provenance
- `tests/` — test root; `scripts/` — build, audit and QA tooling
- `docs/` — technical docs, integration notes, ADRs (`docs/architecture/`)
- `design/` — CCGS design docs and registry; `production/` — sprints, session state
- `studio-tests/` — QA for the CCGS skills/agents themselves, never the game

Reference only (read on demand, written for engine projects):
`.claude/docs/directory-structure.md`.

## Technical Preferences

`project.yaml` at the repo root is the primary config store. Skills resolve it via
`resolve_config` (see `.claude/docs/config-resolution.md`).
`.claude/docs/technical-preferences.md` is the legacy fallback, read on demand.

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session with CCGS?** This is an existing project: run `/adopt`
> (or `/start`) to set `modes.rigor` and map the existing work.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.**
