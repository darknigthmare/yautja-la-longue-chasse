/**
 * V19 production catalogue for player-plane environment props.
 *
 * Every entry is an original project design intended to be generated through
 * OpenAI image generation. Official franchise imagery may be used as visual
 * research, but is never copied into either the source master or runtime asset.
 */

export const ENVIRONMENT_PROP_CATALOGUE_VERSION = 19 as const;
/** Default/fallback chroma. Production specs use the per-biome map below. */
export const ENVIRONMENT_PROP_CHROMA = "#00FF00" as const;

export type EnvironmentPropBiomeId =
  | "jungle"
  | "ice"
  | "volcano"
  | "swamp"
  | "desert"
  | "ocean"
  | "fungal"
  | "ruins";

export type EnvironmentPropChroma = "#00FF00" | "#FF00FF";

export type EnvironmentPropRole =
  | "platform"
  | "climbable"
  | "cover"
  | "hazard"
  | "surface"
  | "decoration";

export interface EnvironmentPropSilhouetteVariant {
  id: string;
  label: string;
  promptDetail: string;
}

export interface EnvironmentPropArchetype {
  slug: string;
  role: EnvironmentPropRole;
  label: string;
  subject: string;
}

export interface EnvironmentPropBiomeProfile {
  id: EnvironmentPropBiomeId;
  planetName: string;
  label: string;
  artDirection: string;
  loreConstraint: string;
  archetypes: readonly EnvironmentPropArchetype[];
}

export interface EnvironmentPropSpec {
  version: typeof ENVIRONMENT_PROP_CATALOGUE_VERSION;
  generator: "OpenAI built-in image_gen";
  provenance: "project-original";
  id: string;
  definitionId: string;
  biomeId: EnvironmentPropBiomeId;
  planetName: string;
  role: EnvironmentPropRole;
  archetypeId: string;
  variantId: string;
  label: string;
  subject: string;
  silhouette: string;
  chroma: EnvironmentPropChroma;
  masterPath: string;
  runtimePath: string;
  runtimeUrl: string;
  prompt: string;
}

const ROLE_CODES: Readonly<Record<EnvironmentPropRole, string>> = {
  platform: "plt",
  climbable: "clm",
  cover: "cov",
  hazard: "haz",
  surface: "srf",
  decoration: "orn",
};

export const ENVIRONMENT_PROP_CHROMA_BY_BIOME: Readonly<
  Record<EnvironmentPropBiomeId, EnvironmentPropChroma>
> = {
  jungle: "#FF00FF",
  ice: "#00FF00",
  volcano: "#00FF00",
  swamp: "#FF00FF",
  desert: "#00FF00",
  ocean: "#00FF00",
  fungal: "#00FF00",
  ruins: "#00FF00",
};

export function chromaForEnvironmentPropBiome(
  biomeId: EnvironmentPropBiomeId,
): EnvironmentPropChroma {
  return ENVIRONMENT_PROP_CHROMA_BY_BIOME[biomeId];
}

const ROLE_REQUIREMENTS: Readonly<Record<EnvironmentPropRole, string>> = {
  platform:
    "Show a continuous, unmistakable walkable upper edge and a silhouette suitable for one-way platform collision.",
  climbable:
    "Show readable attached handholds from bottom to top and an uninterrupted vertical traversal silhouette.",
  cover:
    "Show a solid waist-to-head-height mass that clearly communicates line-of-sight and projectile cover.",
  hazard:
    "Show a non-verbal dormant warning cue and a clearly readable source area for a telegraphed gameplay hazard; do not include detached effects.",
  surface:
    "Show a thin ground overlay with readable edges, direction and material response while keeping the underlying collision baseline visible.",
  decoration:
    "Show a non-interactive near-plane prop with a clean silhouette that frames gameplay without resembling a platform, pickup or enemy.",
};

export const ENVIRONMENT_PROP_SILHOUETTES: Readonly<
  Record<EnvironmentPropRole, readonly EnvironmentPropSilhouetteVariant[]>
> = {
  platform: [
    {
      id: "01-low-wide",
      label: "basse et large",
      promptDetail: "A low, broad span with a long horizontal top edge.",
    },
    {
      id: "02-high-narrow",
      label: "haute et étroite",
      promptDetail: "A raised narrow perch with a compact support footprint.",
    },
    {
      id: "03-forked",
      label: "fourchue",
      promptDetail: "An asymmetric forked span with two visibly different ends.",
    },
    {
      id: "04-broken",
      label: "brisée",
      promptDetail: "A fractured span with one readable jump gap and jagged damage.",
    },
    {
      id: "05-tiered",
      label: "double niveau",
      promptDetail: "A two-tier silhouette with clearly separated upper ledges.",
    },
  ],
  climbable: [
    {
      id: "01-straight",
      label: "droite",
      promptDetail: "A straight full-height ascent with evenly readable handholds.",
    },
    {
      id: "02-hooked",
      label: "courbe",
      promptDetail: "A hooked ascent that bends distinctly toward one side.",
    },
    {
      id: "03-forked",
      label: "bifurquée",
      promptDetail: "A Y-shaped climb with two visually distinct upper exits.",
    },
    {
      id: "04-interrupted",
      label: "interrompue",
      promptDetail: "A damaged climb with one short but readable traversal break.",
    },
    {
      id: "05-paired",
      label: "jumelée",
      promptDetail: "Two attached parallel climbing lines joined by cross braces.",
    },
  ],
  cover: [
    {
      id: "01-narrow",
      label: "étroite",
      promptDetail: "A narrow upright cover silhouette for one hunter.",
    },
    {
      id: "02-broad",
      label: "large",
      promptDetail: "A broad heavy cover mass with a stable base.",
    },
    {
      id: "03-pierced",
      label: "percée",
      promptDetail: "An asymmetric damaged mass with one visible non-traversable opening.",
    },
    {
      id: "04-fallen",
      label: "renversée",
      promptDetail: "A fallen diagonal mass that remains tall enough for cover.",
    },
    {
      id: "05-destructible",
      label: "destructible",
      promptDetail: "A visibly cracked cover mass with a readable structural weak point.",
    },
  ],
  hazard: [
    {
      id: "01-isolated",
      label: "isolé",
      promptDetail: "One compact hazard source with a clear warning perimeter.",
    },
    {
      id: "02-linear",
      label: "linéaire",
      promptDetail: "A long horizontal hazard source that reads as a traversal gate.",
    },
    {
      id: "03-cluster",
      label: "amas",
      promptDetail: "Three connected hazard sources forming one coherent cluster.",
    },
    {
      id: "04-cyclic",
      label: "cyclique",
      promptDetail: "A mechanical or ecological source with visible cyclic warning structures.",
    },
    {
      id: "05-unstable",
      label: "instable",
      promptDetail: "A damaged, irregular source with pronounced pre-trigger warning cracks or sacs.",
    },
  ],
  surface: [
    {
      id: "01-patch",
      label: "plaque",
      promptDetail: "One compact irregular ground patch.",
    },
    {
      id: "02-trail",
      label: "piste",
      promptDetail: "A directional ground trail with a clear entry and exit.",
    },
    {
      id: "03-ridge",
      label: "crête",
      promptDetail: "A low raised strip with a distinct material ridge.",
    },
    {
      id: "04-crater",
      label: "cratère",
      promptDetail: "A shallow impact or pressure depression seen strictly from the side.",
    },
    {
      id: "05-transition",
      label: "transition",
      promptDetail: "A long blending strip with two clearly different material edges.",
    },
  ],
  decoration: [
    {
      id: "01-single",
      label: "isolé",
      promptDetail: "One complete freestanding prop.",
    },
    {
      id: "02-pair",
      label: "paire",
      promptDetail: "Two unequal attached or compositionally grouped specimens.",
    },
    {
      id: "03-cluster",
      label: "amas",
      promptDetail: "A dense asymmetric cluster with three silhouette peaks.",
    },
    {
      id: "04-fallen",
      label: "tombé",
      promptDetail: "A weathered fallen arrangement with a strong diagonal silhouette.",
    },
    {
      id: "05-evidence",
      label: "trace narrative",
      promptDetail: "A small environmental evidence arrangement with no readable writing.",
    },
  ],
};

function prop(
  slug: string,
  role: EnvironmentPropRole,
  label: string,
  subject: string,
): EnvironmentPropArchetype {
  return { slug, role, label, subject };
}

export const ENVIRONMENT_PROP_BIOMES: Readonly<
  Record<EnvironmentPropBiomeId, EnvironmentPropBiomeProfile>
> = {
  jungle: {
    id: "jungle",
    planetName: "Oseris-IV",
    label: "jungle lacustre",
    artDirection:
      "Humid storm jungle, black lake, giant roots, mossy expedition debris and restrained red utility lights; earthy late-1980s science-fiction hunting mood.",
    loreConstraint:
      "Keep the composition original: evoke vertical Yautja hunting logic without copying a Predator film frame, set prop or official game asset.",
    archetypes: [
      prop("root-bridge", "platform", "pont de racine", "A massive knotted buttress root forming a walkable natural bridge."),
      prop("mossy-ruin-slab", "platform", "dalle de ruine moussue", "A cyclopean rain-dark stone slab bound by moss and thin roots."),
      prop("canopy-crown", "platform", "couronne de canopée", "A dense crown of interlocked limbs and broad wet leaves with a stable top."),
      prop("expedition-deck", "platform", "passerelle d’expédition", "A weathered timber-and-oxidized-metal field deck with cables and braces."),
      prop("buttress-trunk", "climbable", "tronc à contreforts", "An ancient rain-slick tree trunk with huge attached bark handholds."),
      prop("hanging-vine", "climbable", "liane suspendue", "A thick braided living vine with secondary tendrils wrapped around it."),
      prop("field-ladder", "climbable", "échelle de terrain", "A lashed expedition ladder of dark timber, rope and oxidized rungs."),
      prop("strangler-root-wall", "cover", "mur de racines étrangleuses", "A dense wall of fused strangler roots with a solid mud-packed base."),
      prop("ruined-idol", "cover", "idole ruinée", "An original eroded alien stone idol consumed by moss and rain."),
      prop("supply-palisade", "cover", "palissade de ravitaillement", "A human field barricade made from cargo panels, timber and wet netting."),
      prop("flooded-sinkhole", "hazard", "doline noyée", "A black-water sinkhole rimmed by sinking mud, bubbles and tilted reeds."),
      prop("spectral-flare-tripwire", "hazard", "piège à fusée spectrale", "A Vey expedition tripwire linked to one shielded flare projector."),
      prop("collapsing-branch", "hazard", "branche prête à céder", "A stressed canopy limb with split fibers and falling-leaf warning cues."),
      prop("footprint-mud", "surface", "boue à empreintes", "A deep warm mud bed that preserves crisp tracks and dragged equipment marks."),
      prop("rain-puddle", "surface", "flaque de pluie", "A shallow reflective puddle with ripples that can betray active camouflage."),
      prop("crushed-fern-bed", "surface", "lit de fougères écrasées", "A ground mat of bent wet ferns showing a recent passage direction."),
      prop("lake-reeds", "decoration", "roseaux du lac", "Tall wet alien reeds with restrained amber seed heads and black-water roots."),
      prop("vine-curtain", "decoration", "rideau de lianes", "A hanging near-plane curtain of thin vines and dripping leaves."),
      prop("storm-flower", "decoration", "fleur d’orage", "An original broad storm flower folded under heavy rain."),
      prop("transponder-debris", "decoration", "débris de transpondeur", "Broken field-transponder casing, cable ends and one dim red diode."),
    ],
  },
  ice: {
    id: "ice",
    planetName: "Nivalis-K",
    label: "cryomonde minier",
    artDirection:
      "Blue glacier canyon, translucent crystal, wind-cut snow, abandoned mining equipment and dim emergency lighting beneath a gas giant.",
    loreConstraint:
      "Mineral nodules and frozen cavities must never resemble Xenomorph eggs, hives or recognizable Alien franchise architecture.",
    archetypes: [
      prop("glacier-shelf", "platform", "corniche glaciaire", "A layered blue-white glacier shelf with a wind-polished walkable edge."),
      prop("crystal-bridge", "platform", "pont cristallin", "A naturally fused span of translucent ice crystals over a dark fissure."),
      prop("mine-gantry", "platform", "passerelle minière", "A contracted steel mining gantry crusted with frost and safety braces."),
      prop("frozen-wreck-deck", "platform", "pont d’épave gelée", "A torn research-vehicle deck locked into the glacier by opaque ice."),
      prop("ice-wall", "climbable", "paroi de glace", "A vertical protected ice face with cracks, ledges and embedded stone."),
      prop("crystal-column", "climbable", "colonne cristalline", "A ribbed translucent crystal column with staggered natural handholds."),
      prop("maintenance-rope", "climbable", "cordage de maintenance", "A heavy insulated mining rope stiffened by ice but still anchored."),
      prop("fractured-ice-pillar", "cover", "pilier de glace fracturé", "A thick translucent pillar with visible internal fracture planes."),
      prop("overturned-drill", "cover", "foreuse renversée", "A compact industrial bore unit overturned and half buried in snow."),
      prop("frozen-cargo-stack", "cover", "chargement gelé", "Interlocked neutral cargo cases fused into one solid frost-covered mass."),
      prop("thin-ice", "hazard", "glace mince", "A pale resonant ice sheet with dark water, stress rings and trapped bubbles below."),
      prop("falling-icicle-zone", "hazard", "zone de chute de glace", "A fractured ceiling-root cluster with small fallen shards marking danger below."),
      prop("cryo-steam-vent", "hazard", "évent cryogénique", "A ruptured mine pipe outlet with frost petals and pressure-warning valves."),
      prop("snowdrift-track", "surface", "congère à traces", "A soft wind-built snowdrift that records bioelectric pack footprints."),
      prop("black-ice", "surface", "verglas noir", "A thin glossy dark ice layer with a sharply readable slippery boundary."),
      prop("frost-shard-trail", "surface", "piste d’éclats givrés", "A directional scatter of newly fractured frost and crystal slivers."),
      prop("frozen-cordage", "decoration", "cordage gelé", "A coiled industrial line frozen into a sculptural near-plane mass."),
      prop("emergency-beacon", "decoration", "balise d’urgence", "A neutral damaged colony beacon with one dim cyan lens and no logo."),
      prop("bone-cache", "decoration", "amas d’ossements gelés", "A non-gory cache of original polar-fauna bones sealed in clear ice."),
      prop("mineral-nodule", "decoration", "nodule minéral", "An irregular geode cluster with faceted mineral layers, explicitly not an egg."),
    ],
  },
  volcano: {
    id: "volcano",
    planetName: "Cinder-12",
    label: "sanctuaire volcanique",
    artDirection:
      "Black basalt, cooling lava, obsidian ritual architecture, suspended chains, ash and restrained amber Yautja technology beneath red moons.",
    loreConstraint:
      "Yautja cultural objects must remain respectful project-original extensions; glyphs are abstract and unreadable, never copied official symbols.",
    archetypes: [
      prop("basalt-slab", "platform", "dalle de basalte", "A heavy natural basalt plate with a cooled level upper surface."),
      prop("aqueduct-fragment", "platform", "fragment d’aqueduc", "A broken volcanic aqueduct section spanning a glowing fissure."),
      prop("obsidian-altar", "platform", "autel d’obsidienne", "An original clan ritual dais cut from black volcanic glass."),
      prop("chain-bridge", "platform", "pont de chaînes", "A heat-darkened bridge of linked plates and heavy suspended chains."),
      prop("basalt-column", "climbable", "colonne basaltique", "A tall hexagonal basalt stack with staggered fracture handholds."),
      prop("ritual-ladder", "climbable", "échelle rituelle", "A bronze-black clan access ladder with abstract geometric fittings."),
      prop("suspended-chain", "climbable", "chaîne suspendue", "A massive heat-scaled chain anchored into an obsidian lintel."),
      prop("charred-idol", "cover", "idole calcinée", "An original clan memorial statue blackened by repeated ash storms."),
      prop("obsidian-pylon", "cover", "pylône d’obsidienne", "A thick angular volcanic-glass pylon with a solid protected base."),
      prop("fallen-statue", "cover", "statue renversée", "A monumental abstract hunter statue fallen across the arena edge."),
      prop("lava-seam", "hazard", "veine de lave", "A glowing lava seam under a cracked cooling crust with bright warning edges."),
      prop("steam-vent", "hazard", "évent de vapeur", "A mineral chimney with pressure cracks and condensed vapor droplets."),
      prop("heat-burst-fissure", "hazard", "fissure thermique", "An obsidian fracture with cyclic amber heat plates around its mouth."),
      prop("ash-track", "surface", "cendre à traces", "A deep fine ash bed preserving the footsteps of the Bad Blood."),
      prop("cooled-lava-crust", "surface", "croûte de lave refroidie", "A dark ropy lava surface with brittle raised seams."),
      prop("obsidian-shard-bed", "surface", "lit d’éclats d’obsidienne", "A noisy ground strip of sharp black glass flakes and red dust."),
      prop("fallen-hunter-marker", "decoration", "marque d’un chasseur tombé", "A restrained original clan memorial of stacked stone and blank metal."),
      prop("profaned-trophy-rack", "decoration", "présentoir profané", "An empty damaged ritual trophy rack with cut chains and no gore."),
      prop("ember-brazier", "decoration", "brasero de braises", "A low obsidian ritual vessel filled with natural volcanic embers."),
      prop("stolen-clan-beacon", "decoration", "balise de clan volée", "A damaged original Yautja locator shell with abstract amber indicators."),
    ],
  },
  swamp: {
    id: "swamp",
    planetName: "Naraka-Delta",
    label: "delta de mangroves",
    artDirection:
      "Black tidal water, cathedral mangrove roots, peat, hot rain, amber mud and restrained acid-green endemic bioluminescence.",
    loreConstraint:
      "Hydra capsules use trifid amphibian anatomy and must not resemble Xenomorph eggs, ovomorphs or recognizable franchise creatures.",
    archetypes: [
      prop("mangrove-root-platform", "platform", "plateforme de mangrove", "A huge wet mangrove root forming a stable path over opaque water."),
      prop("peat-islet", "platform", "îlot de tourbe", "A compact floating peat island bound by visible living roots."),
      prop("drowned-delta-pier", "platform", "quai du delta noyé", "A collapsed survey pier of dark timber and corroded neutral hardware."),
      prop("floating-log", "platform", "tronc flottant", "A massive waterlogged trunk with attached root fins and a stable upper ridge."),
      prop("mangrove-trunk", "climbable", "tronc de mangrove", "A tall fluted mangrove trunk with wet bark steps and attached aerial roots."),
      prop("hanging-root", "climbable", "racine suspendue", "A thick aerial root rope descending from an unseen mangrove crown."),
      prop("salvage-rope", "climbable", "corde de récupération", "A mud-dark survey rope with floats, knots and one secure anchor."),
      prop("root-cathedral-buttress", "cover", "contrefort racinaire", "A monumental mangrove buttress wall packed solid with peat."),
      prop("drowned-stump", "cover", "souche noyée", "A broad broken tree stump rising above black tidal water."),
      prop("sunken-cargo-stack", "cover", "chargement englouti", "Waterlogged survey cases and panels fused into one mud-filled barrier."),
      prop("tidal-breakline", "hazard", "front de marée", "A reed-and-debris waterline visibly bending before a sudden tidal surge."),
      prop("suction-bog", "hazard", "vasière aspirante", "A concave mud pocket with concentric bubbles and sinking organic debris."),
      prop("acid-mud-vent", "hazard", "évent de vase acide", "A mineral mud vent rimmed by bleached reeds and warning blisters."),
      prop("hydra-mucus-trail", "surface", "traînée de mucus d’Hydre", "A broad iridescent amphibian trail linking water and shore."),
      prop("black-mud", "surface", "vase noire", "A heavy reflective mud bed with readable track retention."),
      prop("shallow-water", "surface", "eau peu profonde", "A thin near-shore water overlay with ripples that expose camouflage."),
      prop("luminous-reeds", "decoration", "roseaux lumineux", "Original alien reeds with dim lime sensory veins and amber tips."),
      prop("hydra-egg-capsule", "decoration", "capsule d’Hydre", "A sealed low trifid amphibian capsule nested in mud, explicitly not an egg shape."),
      prop("driftbone-cluster", "decoration", "amas d’ossements charriés", "A non-gory cluster of original delta-fauna bones caught in roots."),
      prop("flooded-survey-beacon", "decoration", "balise de relevé noyée", "A tilted neutral survey pole half submerged with no logo or writing."),
    ],
  },
  desert: {
    id: "desert",
    planetName: "Serekh-9",
    label: "mer de silice",
    artDirection:
      "Orange silica dunes, black vitrified canyon walls, buried mining equipment, copper dust and pale twin-sun lighting.",
    loreConstraint:
      "Sandmaw ecology is an original mineral-armored burrower design and must not resemble a Dune sandworm, Graboid or copied licensed creature.",
    archetypes: [
      prop("sandstone-ledge", "platform", "corniche de grès", "A wind-carved ochre canyon ledge with a stable upper lip."),
      prop("vitrified-glass-slab", "platform", "dalle de verre vitrifié", "A thick black silica-glass plate bridging two sandstone supports."),
      prop("mining-gantry", "platform", "passerelle minière", "A copper-dark industrial access gantry emerging from a dune."),
      prop("eroded-arch", "platform", "arche érodée", "A natural sandstone arch cut into a readable horizontal traversal span."),
      prop("canyon-rock-face", "climbable", "paroi du canyon", "A vertical wind-cut canyon face with dark mineral handhold bands."),
      prop("anchor-rope", "climbable", "corde d’ancrage", "A sand-scoured mining rope fixed to a buried rock bolt."),
      prop("mine-ladder", "climbable", "échelle de mine", "A partially exposed industrial ladder with copper rungs and glass dust."),
      prop("obsidian-glass-fin", "cover", "ailette de verre noir", "A thick upright fin of vitrified black silica with chipped edges."),
      prop("buried-cargo", "cover", "chargement enseveli", "A solid block of neutral mining cargo exposed by shifting sand."),
      prop("ruin-pillar", "cover", "pilier érodé", "An original ancient sandstone pillar with no readable culture marks."),
      prop("collapse-crust", "hazard", "croûte prête à céder", "A thin dune crust with radial fractures above a concealed void."),
      prop("burrow-breach-crater", "hazard", "cratère de percée", "A fresh Sandmaw-family breach ring with vibrating pebbles and no creature."),
      prop("razor-glass-field", "hazard", "champ de verre tranchant", "A band of black silica blades emerging from wind-stripped sand."),
      prop("sand-track", "surface", "piste dans le sable", "A directional dune strip preserving pack and equipment tracks."),
      prop("singing-silica-ripple", "surface", "rides de silice chantante", "Fine parallel silica ridges that visibly transmit vibration."),
      prop("glass-crack", "surface", "fissure vitrifiée", "A branching crack pattern across a thin canyon glass floor."),
      prop("buried-mining-beacon", "decoration", "balise minière ensevelie", "A neutral locator mast almost consumed by silica sand."),
      prop("drill-wreckage", "decoration", "débris de foreuse", "A broken rotary drill head, cable and cooling fins with no logo."),
      prop("shed-mandible-fragment", "decoration", "fragment mandibulaire", "A small mineral plate shed by original burrowing fauna, not a trophy."),
      prop("survey-pole", "decoration", "borne de relevé", "A wind-bent neutral survey stake with blank reflective plates."),
    ],
  },
  ocean: {
    id: "ocean",
    planetName: "Pelagos-M",
    label: "récif océanique",
    artDirection:
      "Storm-dark global ocean, giant coral arches, wet station wreckage, hydrothermal minerals and cyan endemic bioluminescence.",
    loreConstraint:
      "Marine organisms and station technology remain original; avoid recognizable Xenomorph anatomy, Weyland branding or copied Alien marine hardware.",
    archetypes: [
      prop("coral-arch-shelf", "platform", "corniche d’arche corallienne", "A massive storm-wet coral arch with a naturally level upper shelf."),
      prop("reef-plate", "platform", "plaque récifale", "A fused limestone-and-shell reef plate with a broad stable top."),
      prop("drowned-station-deck", "platform", "pont de station noyée", "A corroded neutral research-station deck covered in attached barnacles."),
      prop("clan-harpoon-perch", "platform", "perchoir de harpon du clan", "An original bronze-black Yautja hunting perch anchored into coral."),
      prop("salvage-rope", "climbable", "corde de sauvetage", "A heavy station rope with fixed knots, floats and a corroded anchor."),
      prop("kelp-cable", "climbable", "câble aux algues", "A structural cable wrapped by attached tough kelp and shell handholds."),
      prop("station-ladder", "climbable", "échelle de station", "A corroded pressure-station ladder reinforced by attached braces."),
      prop("coral-pillar", "cover", "pilier corallien", "A thick branching reef pillar with a solid limestone core."),
      prop("pressure-module", "cover", "module pressurisé renversé", "A sealed neutral station module overturned and crusted with shell."),
      prop("shell-ridge", "cover", "crête de coquilles", "A broad fused ridge of original giant shells and reef stone."),
      prop("rogue-wave-breakline", "hazard", "ligne de vague scélérate", "A foaming debris line and bending kelp that telegraph an incoming wave."),
      prop("live-electrical-pylon", "hazard", "pylône électrique actif", "A flooded station power junction with visible insulated warning vanes."),
      prop("abyssal-vent", "hazard", "cheminée abyssale", "A hydrothermal mineral chimney with bright heat seams and pressure pores."),
      prop("tide-pool", "surface", "bassin de marée", "A shallow reef basin with moving water that disrupts camouflage."),
      prop("wet-algae-track", "surface", "piste d’algues humides", "A slick directional strip of attached dark algae and disturbed shells."),
      prop("shallow-surf", "surface", "zone de ressac", "A thin wave-washed ground overlay with a readable high-water edge."),
      prop("bioluminescent-coral", "decoration", "corail bioluminescent", "Original branching coral with restrained cyan sensory polyps."),
      prop("hanging-kelp", "decoration", "algues suspendues", "A dense near-plane curtain of attached storm-bent kelp ribbons."),
      prop("abandoned-clan-harpoon", "decoration", "harpon de clan abandonné", "One original inactive Yautja ritual harpoon secured into reef stone."),
      prop("sonar-buoy", "decoration", "bouée sonar", "A damaged neutral research buoy with blank lenses and no writing."),
    ],
  },
  fungal: {
    id: "fungal",
    planetName: "Mycora-V",
    label: "biosphère mycélienne",
    artDirection:
      "Conscious violet fungal forest, tower caps, wet membranes, ivory cords, cold cyan pulses and a continuous sensory mycelial network.",
    loreConstraint:
      "Fungal forms must avoid Xenomorph, ovomorph and facehugger silhouettes; every cord, tendril, sac and effect source remains visibly attached.",
    archetypes: [
      prop("mycelial-bridge", "platform", "pont mycélien", "A thick living bridge of fused ivory cords and violet support membranes."),
      prop("giant-cap", "platform", "chapeau géant", "A broad layered mushroom cap with a stable fibrous upper skin."),
      prop("root-membrane-shelf", "platform", "corniche membraneuse", "A taut organic shelf stretched between massive fungal roots."),
      prop("sterilization-gantry", "platform", "passerelle de stérilisation", "A neutral industrial gantry colonized by attached mycelial braces."),
      prop("cord-vine", "climbable", "cordon mycélien", "A braided vertical mycelium cord with attached grip nodules."),
      prop("tower-gill", "climbable", "lamelles de tour fongique", "A tall fungal stem exposing sturdy staggered gill ledges."),
      prop("maintenance-ladder", "climbable", "échelle colonisée", "An industrial ladder reinforced and partly enclosed by living hyphae."),
      prop("tower-stem", "cover", "tronc de tour fongique", "A thick wet fungal tower stem with a dense fibrous core."),
      prop("puffball-barricade", "cover", "barricade de vesse-de-loup", "A fused wall of armored puffball nodules with no detached spores."),
      prop("sterilizer-tank", "cover", "réservoir de stérilisant", "A sealed industrial tank wrapped by attached fungal cords."),
      prop("spore-pod", "hazard", "capsule de spores", "A low attached fruiting pod with swelling warning veins and sealed pores."),
      prop("mycelial-snare", "hazard", "collet mycélien", "A ground-root loop with visible tension cords and sensory bulbs."),
      prop("acid-bloom", "hazard", "floraison acide", "An original attached fungal bloom with a closed corrosive reservoir."),
      prop("memory-mycelium", "surface", "mycélium-mémoire", "A luminous ground network that records directional pressure pulses."),
      prop("spore-dust-track", "surface", "piste de poussière sporale", "A thin disturbed spore layer showing a recent route."),
      prop("nerve-filament-mat", "surface", "tapis de filaments nerveux", "A dense attached sensory filament mat with cold cyan pulse nodes."),
      prop("memory-seed-capsule", "decoration", "graine-mémoire", "A sealed asymmetric archive nodule with layered fibrous plates, not an egg."),
      prop("fruiting-body", "decoration", "fructification", "An original fan-shaped fungal specimen attached to a dark root base."),
      prop("pulse-node", "decoration", "nœud d’impulsion", "A small attached junction where ivory cords meet one violet sensory bulb."),
      prop("shed-hyphae", "decoration", "hyphes desséchées", "A fallen non-gory arrangement of dry fungal cords and empty membranes."),
    ],
  },
  ruins: {
    id: "ruins",
    planetName: "Acheron-Sigma",
    label: "cité d’obsidienne",
    artDirection:
      "Airless black-stone city, gunmetal mechanisms, fractured gravity systems, rare cyan energy and a gas giant on the horizon.",
    loreConstraint:
      "The city predates known clan records: avoid Yautja, Engineer, Space Jockey, LV-426 or Hadley's Hope design language; no wind, rain, open flame, vegetation or free water.",
    archetypes: [
      prop("obsidian-bridge", "platform", "pont d’obsidienne", "A monumental black-glass bridge segment with unknown geometric supports."),
      prop("gravity-slab", "platform", "dalle gravitationnelle", "A floating dark stone slab held above a fractured cyan field frame."),
      prop("sentinel-gantry", "platform", "passerelle de sentinelles", "An ancient gunmetal service gantry with non-human joint geometry."),
      prop("prism-dais", "platform", "estrade prismatique", "A black-stone dais built around inert angular memory-prism sockets."),
      prop("service-ladder", "climbable", "échelle de service", "A rigid ancient ladder with offset non-human rungs and stone anchors."),
      prop("magnetic-wall-rungs", "climbable", "prises murales magnétiques", "A vertical array of attached gunmetal grips with faint cyan edges."),
      prop("fractured-spire", "climbable", "flèche fracturée", "A split obsidian spire exposing staggered structural ribs."),
      prop("reactive-stela", "cover", "stèle réactive", "A thick blank black stela with unreadable abstract sensor facets."),
      prop("sentinel-shield-wreck", "cover", "bouclier de sentinelle brisé", "A detached inert slab shield fused to ancient floor anchors."),
      prop("prism-console-plinth", "cover", "socle de console prismatique", "A heavy stone-and-gunmetal console base with blank dark sockets."),
      prop("gravity-pulse-emitter", "hazard", "émetteur gravitationnel", "A floor-mounted ring mechanism with visibly misaligned field vanes."),
      prop("nanite-field-obelisk", "hazard", "obélisque de champ nanite", "A sealed angular obelisk with warning erosion around its base."),
      prop("laser-grid-projector", "hazard", "projecteur de grille photonique", "An ancient paired lens assembly with inert red alignment shutters."),
      prop("obsidian-scuff-track", "surface", "piste sur l’obsidienne", "A directional trail of fresh pale scuffs across black glass."),
      prop("electrostatic-debris", "surface", "débris électrostatiques", "A ground strip of metallic fragments held in ordered field patterns."),
      prop("phase-tile", "surface", "dalle à déphasage", "A segmented floor tile with visibly offset material layers."),
      prop("memory-prism", "decoration", "prisme mémoriel", "An inert asymmetric crystal-metal prism with no readable symbols."),
      prop("dormant-sentinel-shell", "decoration", "carapace de sentinelle inerte", "An unmistakably inactive empty automaton shell with detached power core absent."),
      prop("unreadable-glyph-fragment", "decoration", "fragment gravé illisible", "A fallen black-stone fragment bearing purely abstract non-linguistic grooves."),
      prop("ancient-mechanism", "decoration", "mécanisme ancien", "An inert unknown-purpose assembly of concentric stone and gunmetal parts."),
    ],
  },
};

export const ENVIRONMENT_PROP_BIOME_IDS = Object.freeze(
  Object.keys(ENVIRONMENT_PROP_BIOMES) as EnvironmentPropBiomeId[],
);

export const ENVIRONMENT_PROP_ROLE_TARGETS: Readonly<
  Record<EnvironmentPropRole, number>
> = {
  platform: 20,
  climbable: 15,
  cover: 15,
  hazard: 15,
  surface: 15,
  decoration: 20,
};

function promptForSpec(
  profile: EnvironmentPropBiomeProfile,
  archetype: EnvironmentPropArchetype,
  variant: EnvironmentPropSilhouetteVariant,
  chroma: EnvironmentPropChroma,
): string {
  return [
    "Use case: stylized-concept",
    "Generator: OpenAI image generation",
    "Asset type: one isolated high-resolution 2D player-plane environment prop for a side-scrolling Yautja hunting game",
    `Primary request: create one completely original ${profile.label} prop: ${archetype.subject}`,
    `Planet and biome: ${profile.planetName}; ${profile.artDirection}`,
    `Gameplay role: ${archetype.role}. ${ROLE_REQUIREMENTS[archetype.role]}`,
    `Silhouette variant: ${variant.label}. ${variant.promptDetail}`,
    "Style and camera: dense cinematic hand-painted pixel art, crisp deliberate pixel clusters, strict orthographic side view, consistent upper-left lighting, complete readable silhouette.",
    `Lore constraint: ${profile.loreConstraint}`,
    `Backdrop: perfectly flat, uniform solid RGB ${chroma} chroma-key background across the entire canvas.`,
    `Chroma separation: reserve exact ${chroma} exclusively for the background; use no exact chroma pixels, chroma spill or chroma halo in the subject.`,
    "Composition: exactly one complete prop centered with at least 10 percent empty padding on every side; gameplay-facing baseline and anchor fully visible.",
    "Constraints: no character, creature, weapon pickup, detached effect, cast shadow, contact shadow, floor, scenery, gradient, reflection, text, number, readable glyph, label, logo, watermark, frame, grid, crop, duplicated part or official bitmap.",
    "Originality: an original fan-project production design informed only by broad franchise hunting logic; do not reproduce any film frame, official set dressing, licensed model, game texture or copyrighted prop.",
  ].join("\n");
}

export function environmentPropSpecsForBiome(
  biomeId: EnvironmentPropBiomeId,
): readonly EnvironmentPropSpec[] {
  const profile = ENVIRONMENT_PROP_BIOMES[biomeId];

  return profile.archetypes.flatMap((archetype) =>
    ENVIRONMENT_PROP_SILHOUETTES[archetype.role].map((variant) => {
      const roleCode = ROLE_CODES[archetype.role];
      const fileStem = `${roleCode}-${archetype.slug}-${variant.id}`;
      const id = `environment-prop-v19-${biomeId}-${fileStem}`;
      const relativeDirectory = `${biomeId}/${roleCode}`;
      const chroma = chromaForEnvironmentPropBiome(biomeId);

      return {
        version: ENVIRONMENT_PROP_CATALOGUE_VERSION,
        generator: "OpenAI built-in image_gen",
        provenance: "project-original",
        id,
        definitionId: id,
        biomeId,
        planetName: profile.planetName,
        role: archetype.role,
        archetypeId: archetype.slug,
        variantId: variant.id,
        label: `${archetype.label} — ${variant.label}`,
        subject: archetype.subject,
        silhouette: variant.promptDetail,
        chroma,
        masterPath: `art-source/v19/biome-decor/${relativeDirectory}/masters/${fileStem}-chroma.webp`,
        runtimePath: `public/game/assets/v19/biome-decor/${relativeDirectory}/${fileStem}.webp`,
        runtimeUrl: `/game/assets/v19/biome-decor/${relativeDirectory}/${fileStem}.webp`,
        prompt: promptForSpec(profile, archetype, variant, chroma),
      } satisfies EnvironmentPropSpec;
    }),
  );
}

export function createEnvironmentPropCatalogue(): readonly EnvironmentPropSpec[] {
  return ENVIRONMENT_PROP_BIOME_IDS.flatMap(environmentPropSpecsForBiome);
}

export const ENVIRONMENT_PROP_SPECS = Object.freeze(
  createEnvironmentPropCatalogue(),
);
