// Explicit isolated QA prerequisites, validated through real domain functions.
// These reports are fixtures, not a claim that this test played either expedition.
export function createInquiryFixture(world, { beacon = "disable", witness = "protect" } = {}) {
  const context = { rankId: "young-blood", ownedTrophyCount: 0 };
  let progress = world.defaultHomeworldProgress();
  for (const item of world.HOMEWORLD_EVIDENCE) progress = world.applyHomeworldAction(progress, { type: "inspect", evidenceId: item.id }, context).progress;
  progress = world.applyHomeworldAction(progress, { type: "choose-witness", choice: witness }, context).progress;
  progress = world.applyHomeworldAction(progress, { type: "audience" }, context).progress;
  progress.expeditions = {
    "ash-marches": { expeditionId: "ash-marches", trueTrailInspected: true, falseTrailRejected: true,
      obstacleMoved: true, convoyRecovered: true, shortcutOpened: true, secretFound: true, ticks: 1500 },
    "glass-desert": { expeditionId: "glass-desert", terrainSurveyed: true, transportLogRecovered: true,
      diversionCorroborated: true, safePassageOpened: true, crossingRoute: "decoy-corridor",
      beaconDisposition: beacon, secretFound: false, ticks: 2400 },
  };
  return world.normalizeHomeworldProgress(progress);
}
