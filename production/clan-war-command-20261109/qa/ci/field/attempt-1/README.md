# CI field replay — 9 November 2026

The original driver failed on an invisible team checkbox: it had selected the territory but had not opened the new briefing step **03 Détachement**. `baseline/report.json` and `baseline.log` preserve the native Playwright failure after the unchanged 30 s deadline. `recipe-before.mjs` preserves the pre-edit source; `baseline/recipe-used.mjs` differs only by the optional artifact destination.

The maintained driver now scopes the native briefing dialog, selects its real Détachement step, checks the actual roster, and launches from that dialog. Default CI output remains `outputs/clan-field-20261103`. No force click, timeout increase, application edit, mocked result, fixture change or assertion removal was used. The complete script tail beginning at the first archive wait is byte-identical.

`replay/report.json` contains all six original PASS groups: native stealth vision; single keyboard orders and ignored repeats; focused control/shortcut/IME isolation; RTS planning and hidden opponents/objectives; real SVG 75–300% zoom with unchanged collisions/topology/vision; RTS keyboard isolation. Both original PNG were opened and inspected. The 1,293 application files were hashed before/after and are identical. The field pack regression file and driver lint pass.

Command, from the repository root:

```sh
CLAN_FIELD_QA_OUTPUT=production/clan-war-command-20261109/qa/ci/field/attempt-1/replay AUDIT_CHROME_EXECUTABLE=/usr/bin/chromium node scripts/qa-clan-field-20261103.mjs
```

The browser was Chromium 154 in headless mode. This is an esbuild host of the original production components, not a full Next application or artistic validation. V151 two-tab locks have a separate proof.
