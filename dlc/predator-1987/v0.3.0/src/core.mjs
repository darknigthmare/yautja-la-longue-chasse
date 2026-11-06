export function getCampaign(data, id) {
  return data.campaigns.find((c) => c.id === id) ?? null;
}

export function getChapter(data, campaignId, chapterIndex = 0) {
  const campaign = getCampaign(data, campaignId);
  return campaign?.chapters?.[chapterIndex] ?? null;
}

export function getLocation(data, locationId) {
  return data.locations.find((l) => l.id === locationId) ?? null;
}

export function createProgress() {
  return {
    human: { unlocked: 0, completed: [] },
    predator: { unlocked: 0, completed: [] },
    codexUnlocked: [],
    trophies: [],
    trapCraft: {},
    mastery: {},
    totalPlaySeconds: 0,
  };
}

export function completeChapter(progress, campaignId, chapterId, nextIndex) {
  const branch = progress[campaignId];
  if (!branch) throw new Error(`Unknown campaign ${campaignId}`);
  if (!branch.completed.includes(chapterId)) branch.completed.push(chapterId);
  branch.unlocked = Math.max(branch.unlocked, nextIndex);
  return progress;
}

export function stepSatisfied(step, runtime) {
  switch (step.type) {
    case 'reach': return runtime.x >= step.x;
    case 'survive': return runtime.stepElapsed >= step.seconds;
    case 'eliminate': return runtime.kills >= step.count;
    case 'bossDamage': return runtime.bossHits >= step.amount;
    case 'interact': return Boolean(runtime.interacted);
    case 'scan': return Boolean(runtime.scanned);
    case 'cloak': return Boolean(runtime.cloak);
    case 'placeTrap': return Boolean(runtime.trapPlaced);
    case 'mimic': return Boolean(runtime.mimicked);
    case 'meleeTarget': return runtime.targetsHit?.includes(step.target) ?? false;
    case 'plasmaTarget': return runtime.targetsHit?.includes(step.target) ?? false;
    default: return false;
  }
}

export function validateData(data) {
  const errors = [];
  const locationIds = new Set(data.locations.map((x) => x.id));
  const characterIds = new Set(data.characters.map((x) => x.id));
  for (const campaign of data.campaigns) {
    const chapterIds = new Set();
    for (const chapter of campaign.chapters) {
      if (chapterIds.has(chapter.id)) errors.push(`duplicate chapter ${chapter.id}`);
      chapterIds.add(chapter.id);
      if (!locationIds.has(chapter.location)) errors.push(`${chapter.id}: unknown location ${chapter.location}`);
      if (!characterIds.has(chapter.playable)) errors.push(`${chapter.id}: unknown playable ${chapter.playable}`);
      for (const id of chapter.companions ?? []) {
        if (!characterIds.has(id)) errors.push(`${chapter.id}: unknown companion ${id}`);
      }
      for (const id of chapter.targets ?? []) {
        if (!characterIds.has(id)) errors.push(`${chapter.id}: unknown target ${id}`);
      }
      if (!Array.isArray(chapter.steps) || chapter.steps.length === 0) errors.push(`${chapter.id}: no steps`);
    }
  }
  return errors;
}
