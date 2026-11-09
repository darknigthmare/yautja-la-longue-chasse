# OPS-B05 — panel integration, 9 November 2026

Scope: `app/game/ClanShipOperationsPanel.tsx`, its CSS module, and `tests/clan-ship-crew-dialogue-ui.test.mjs`. Shared working branch: `codex/bible-coherence-20261109`. No Git writes performed by this agent.

The panel delegates eligibility and all five contexts to `selectClanShipCrewDialogue`. Only its `spoken` result renders a blockquote and verified facts, and the panel passes no focused identity while suspended. Other crew remain factual dossiers with routes to the selector's actual available Clan post. Stored recruitment quotes are no longer broadcast by dossiers. Listening changes only local React feedback and a local heard marker; recruitment and circle actions retain their original callbacks and revision checks.

The dialogue occupies a full card grid row, so it does not overlap the portrait or inherit a narrow portrait-side column at 320 px. Existing article focus, dialog focus trap, Escape, tabs, route callbacks and menu gamepad hook are retained. Browser interaction and actual pixels are assigned to the browser agent and are not established by these source/SSR checks.

Verification: `results.json` records exact direct Node 22 SSR and scoped ESLint commands, each exit 0. `ssr-detailed.tap` records six declared tests, six passing. They render the actual React panel and real domain selectors/reducers, including all 30 combinations of six members and five contexts; remote and suspended contact; reserve, active Clan residence, suspension, personal transfer; C-37 gathering; explicit recruitment and circle controls; and 12 future/invalid/foreign payload refusals. Rendering invokes no action/navigation callback and preserves input bytes. `git diff --check` also passed.

`ssr-tests.tap` comes from the repository-recommended `--test --test-concurrency=1` invocation. This runtime reports only an outer file-level pass there; the direct invocation supplies the detailed six-test TAP. The direct detailed log and machine exit result should be used when quoting the six-test count.

References read: root AGENTS.md; .ai-tools README and source manifest; gamedev guide and pinned manifest; pinned router, custom-engine, dialogue-systems and game-ui-ux references; installed Next use-client/CSS module docs; operations-spec §13.1; Bible L-01 through L-10. No new progression, ship ownership, durable dialogue state, audio, animation or NPC routine is implemented or claimed.
