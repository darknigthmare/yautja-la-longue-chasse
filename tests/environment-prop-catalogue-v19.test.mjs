import assert from "node:assert/strict";
import test from "node:test";

import {
  ENVIRONMENT_PROP_BIOME_IDS,
  ENVIRONMENT_PROP_BIOMES,
  ENVIRONMENT_PROP_CATALOGUE_VERSION,
  ENVIRONMENT_PROP_CHROMA_BY_BIOME,
  ENVIRONMENT_PROP_ROLE_TARGETS,
  ENVIRONMENT_PROP_SILHOUETTES,
  ENVIRONMENT_PROP_SPECS,
  createEnvironmentPropCatalogue,
  chromaForEnvironmentPropBiome,
  environmentPropSpecsForBiome,
} from "../app/game/environmentPropCatalogue.ts";

const ROLE_ARCHETYPE_TARGETS = {
  platform: 4,
  climbable: 3,
  cover: 3,
  hazard: 3,
  surface: 3,
  decoration: 4,
};

test("V19 declares eight biome profiles with twenty unique archetypes each", () => {
  assert.deepEqual(ENVIRONMENT_PROP_BIOME_IDS, [
    "jungle",
    "ice",
    "volcano",
    "swamp",
    "desert",
    "ocean",
    "fungal",
    "ruins",
  ]);

  const globalArchetypeKeys = new Set();

  for (const biomeId of ENVIRONMENT_PROP_BIOME_IDS) {
    const profile = ENVIRONMENT_PROP_BIOMES[biomeId];
    const slugs = profile.archetypes.map(({ slug }) => slug);

    assert.equal(profile.archetypes.length, 20, `${biomeId}: archetype count`);
    assert.equal(new Set(slugs).size, 20, `${biomeId}: duplicate slug`);
    assert.ok(profile.artDirection.length > 40);
    assert.ok(profile.loreConstraint.length > 40);

    for (const [role, target] of Object.entries(ROLE_ARCHETYPE_TARGETS)) {
      assert.equal(
        profile.archetypes.filter((entry) => entry.role === role).length,
        target,
        `${biomeId}/${role}: archetype allocation`,
      );
    }

    for (const archetype of profile.archetypes) {
      assert.match(archetype.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(archetype.label.length > 2);
      assert.ok(archetype.subject.length > 35);
      const key = `${biomeId}/${archetype.role}/${archetype.slug}`;
      assert.ok(!globalArchetypeKeys.has(key), `${key}: duplicate archetype key`);
      globalArchetypeKeys.add(key);
    }
  }

  assert.equal(globalArchetypeKeys.size, 160);
});

test("every gameplay role owns five genuinely named silhouette variants", () => {
  for (const [role, variants] of Object.entries(
    ENVIRONMENT_PROP_SILHOUETTES,
  )) {
    assert.equal(variants.length, 5, `${role}: silhouette count`);
    assert.equal(
      new Set(variants.map(({ id }) => id)).size,
      5,
      `${role}: duplicate silhouette`,
    );

    for (const variant of variants) {
      assert.match(variant.id, /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(variant.promptDetail.length > 30);
    }
  }
});

test("the deterministic builder creates exactly 100 specs per biome and 800 total", () => {
  const rebuilt = createEnvironmentPropCatalogue();

  assert.deepEqual(rebuilt, ENVIRONMENT_PROP_SPECS);
  assert.equal(ENVIRONMENT_PROP_SPECS.length, 800);
  assert.equal(new Set(ENVIRONMENT_PROP_SPECS.map(({ id }) => id)).size, 800);
  assert.equal(
    new Set(ENVIRONMENT_PROP_SPECS.map(({ runtimePath }) => runtimePath)).size,
    800,
  );
  assert.equal(
    new Set(ENVIRONMENT_PROP_SPECS.map(({ masterPath }) => masterPath)).size,
    800,
  );

  for (const biomeId of ENVIRONMENT_PROP_BIOME_IDS) {
    const first = environmentPropSpecsForBiome(biomeId);
    const second = environmentPropSpecsForBiome(biomeId);

    assert.equal(first.length, 100, `${biomeId}: generated count`);
    assert.deepEqual(first, second, `${biomeId}: generation must be stable`);

    for (const [role, target] of Object.entries(
      ENVIRONMENT_PROP_ROLE_TARGETS,
    )) {
      assert.equal(
        first.filter((spec) => spec.role === role).length,
        target,
        `${biomeId}/${role}: generated allocation`,
      );
    }
  }
});

test("every V19 spec carries an OpenAI chroma prompt and canonical source/runtime paths", () => {
  for (const spec of ENVIRONMENT_PROP_SPECS) {
    const roleCode = spec.id.split("-")[4];

    assert.equal(spec.version, ENVIRONMENT_PROP_CATALOGUE_VERSION);
    assert.equal(spec.version, 19);
    assert.equal(spec.generator, "OpenAI built-in image_gen");
    assert.equal(spec.provenance, "project-original");
    assert.equal(spec.definitionId, spec.id);
    assert.equal(
      spec.chroma,
      chromaForEnvironmentPropBiome(spec.biomeId),
    );
    assert.match(spec.id, /^environment-prop-v19-[a-z]+-[a-z]{3}-/);
    assert.ok(
      spec.masterPath.startsWith(
        `art-source/v19/biome-decor/${spec.biomeId}/${roleCode}/masters/`,
      ),
    );
    assert.ok(
      spec.runtimePath.startsWith(
        `public/game/assets/v19/biome-decor/${spec.biomeId}/${roleCode}/`,
      ),
    );
    assert.equal(spec.runtimeUrl, `/${spec.runtimePath.slice("public/".length)}`);
    assert.ok(spec.masterPath.endsWith("-chroma.webp"));
    assert.ok(spec.runtimePath.endsWith(".webp"));
    assert.match(spec.prompt, /^Use case: stylized-concept$/m);
    assert.match(spec.prompt, /Generator: OpenAI image generation/);
    assert.ok(spec.prompt.includes(`RGB ${spec.chroma}`));
    assert.match(spec.prompt, /strict orthographic side view/);
    assert.match(spec.prompt, /exactly one complete prop/);
    assert.match(spec.prompt, /do not reproduce any film frame/);
    assert.ok(spec.prompt.includes(spec.subject));
  }
});

test("jungle and swamp use magenta chroma while other biomes use green", () => {
  assert.equal(ENVIRONMENT_PROP_CHROMA_BY_BIOME.jungle, "#FF00FF");
  assert.equal(ENVIRONMENT_PROP_CHROMA_BY_BIOME.swamp, "#FF00FF");

  for (const biomeId of ENVIRONMENT_PROP_BIOME_IDS.filter(
    (id) => id !== "jungle" && id !== "swamp",
  )) {
    assert.equal(ENVIRONMENT_PROP_CHROMA_BY_BIOME[biomeId], "#00FF00");
  }
});
