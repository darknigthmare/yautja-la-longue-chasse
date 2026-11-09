# Independent B05 source review — 2026-11-09

Reviewed `/workspace/yautja-la-longue-chasse` branch `codex/bible-coherence-20261109`, baseline `main` / `19317af4`. Read AGENTS.md, docs/GAMEDEV_AGENT_GUIDE.md, operations-spec.md §13.1, the B05 selector/panel and changed interior/civic-caption code, their owner validators, companion presence, C-37 suppression and targeted tests. Source and Git left unchanged.

## Findings

1. **P3 — masculine withdrawal outcome gets a feminine article.** `app/game/systems/clanShipCrewDialogue.ts:93`, `:94`, `:97` interpolate `une ${outcome(encounter)}`, while `outcome` returns `repli` for `withdrawn` (`:79–80`). Real reducer reproduction (`accept-contract` → `space-screening`, then `withdraw`) produced “une repli” for Cold Trace, Black Suture and Threshold Guard. Sent to module owner `/root/remote_current_audit`; fix advised through a full outcome phrase or neutral sentence. No progression or integrity effect.

No blocking regression found in reviewed changes.

## Checked boundaries

- Selector `:136–149` validates operations/campaign access and refuses foreign/invalid/future operations, residence and hearing data. Docking owner/version/location is checked at `:158–162`. No save writes, clock or reward action is introduced.
- Five explicit contexts and six distinct voices use retained real receipts/terminal tactical data (`:163–173`). No invented wound, loss, rank or reward claim found. “Recent” uses the available proof/order relation, without simulating elapsed time.
- Physical native entry still passes the live actor/service distance and active-input gate in `ClanShipInterior.tsx:268–278`. Unfocused remote dossiers cannot speak through the panel (`ClanShipOperationsPanel.tsx:214–216`).
- Modern residents get talk controls only with `avatarVisible`, `serviceAvailable` and matching `avatarRoomId` (`ClanShipInterior.tsx:435–438`, `:564–568`). Their avatar remains owned by CompanionQuartersScene, while `companionUsesLegacyClanPost` suppresses the old actor. Reserve, suspension and other-hull records cannot retain this entry.
- Gathered C-37 witnesses are filtered from legacy actors and managed talk controls; CompanionQuartersScene receives the same suppression IDs (`ClanShipInterior.tsx:430–438`, `:493–508`). Selector `:150–152` refuses dialogue during the active shared audience. The pre-existing presence predicate retains real-assignment conditions.
- New listening action only sets local acknowledgement/feedback (`ClanShipOperationsPanel.tsx:240–246`); suspension removes physical focus, disables controls and keeps existing inert/modal/focus handling. Native buttons retain focus styling, wrapping and disabled behavior. No new source-level keyboard/suspension bypass found.
- `homeworldCivicNeighborhoodsV80.ts:9–23` changes caption detail strings only. Existing IDs, labels, coordinates and routing functions remain unchanged; all current court-composition keys are covered.

## Verification and limits

Read-only source review plus a single small real-owner withdrawal reproduction, using `tests/helpers/clan-ship-trophy-hearing-fixture.mjs` and the actual selector/reducer. No broad tests, build or browser run performed by this reviewer. SSR/source assertions establish content and gates, not pixels, native play, artistic admission or full-game completion; root owns the final browser/type/build checks.
