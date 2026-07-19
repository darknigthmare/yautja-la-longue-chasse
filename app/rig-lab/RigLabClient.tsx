"use client";

import { useState } from "react";

import HunterRigPreview, {
  type HunterRigPreviewProps,
} from "../game/HunterRigPreview";
import type {
  HunterAppearance,
  HunterBodyMorphId,
} from "../game/types";

const MORPHS: readonly HunterBodyMorphId[] = [
  "classic",
  "elder",
  "super",
  "feral",
  "huntress",
  "young",
];

interface RigCase {
  id: string;
  label: string;
  trophyAdornment?: boolean;
  props: Omit<HunterRigPreviewProps, "appearance" | "size">;
}

const CASES: readonly RigCase[] = [
  {
    id: "bind",
    label: "Bind · masque retiré",
    props: { armorId: "scout", weaponIds: [], maskWorn: false },
  },
  {
    id: "mask",
    label: "Biomasque + armure",
    props: {
      armorId: "hunter",
      weaponIds: [],
      maskWorn: true,
    },
  },
  {
    id: "caster-rest",
    label: "Plasmacaster · repos",
    props: {
      armorId: "hunter",
      weaponIds: ["plasma-caster"],
      aiming: false,
    },
  },
  {
    id: "caster-aim",
    label: "Plasmacaster · visée médiane",
    props: {
      armorId: "hunter",
      weaponIds: ["plasma-caster"],
      aiming: true,
      aimAngle: -0.48,
    },
  },
  {
    id: "caster-aim-high",
    label: "Plasmacaster · visée haute",
    props: {
      armorId: "hunter",
      weaponIds: ["plasma-caster"],
      aiming: true,
      aimAngle: -0.86,
    },
  },
  {
    id: "caster-aim-low",
    label: "Plasmacaster · visée basse",
    props: {
      armorId: "hunter",
      weaponIds: ["plasma-caster"],
      aiming: true,
      aimAngle: 0.46,
    },
  },
  {
    id: "gauntlet-closed",
    label: "Gantelet · fermé",
    props: {
      armorId: "hunter",
      weaponIds: [],
      gauntletOpen: false,
    },
  },
  {
    id: "gauntlet-open",
    label: "Gantelet · ouvert",
    props: {
      armorId: "hunter",
      weaponIds: [],
      gauntletOpen: true,
    },
  },
  {
    id: "blades-retracted",
    label: "Griffes · rétractées",
    props: {
      armorId: "hunter",
      weaponIds: ["wristblades"],
      bladesExtended: false,
    },
  },
  {
    id: "blades-extended",
    label: "Griffes · sorties",
    props: {
      armorId: "hunter",
      weaponIds: ["wristblades"],
      bladesExtended: true,
    },
  },
  {
    id: "combistick",
    label: "Combistick · prise",
    props: {
      armorId: "hunter",
      weaponIds: ["wristblades", "combistick"],
      bladesExtended: false,
    },
  },
  {
    id: "smart-disc",
    label: "Smart-disc · prise",
    props: {
      armorId: "hunter",
      weaponIds: ["wristblades", "smart-disc"],
    },
  },
  {
    id: "bow",
    label: "Arc · visée",
    props: {
      armorId: "scout",
      weaponIds: ["wristblades", "yautja-bow"],
      aiming: true,
      aimAngle: -0.32,
    },
  },
  {
    id: "gear",
    label: "Deux crochets de ceinture",
    props: {
      armorId: "hunter",
      weaponIds: [],
      gearIds: ["netgun", "motion-sensor"],
    },
  },
  {
    id: "trophy-belt",
    label: "Trophée · ceinture",
    trophyAdornment: true,
    props: {
      armorId: "hunter",
      weaponIds: [],
      trophyCarried: false,
    },
  },
  {
    id: "trophy-hand",
    label: "Trophée · main",
    props: {
      armorId: "hunter",
      weaponIds: [],
      trophyCarried: true,
    },
  },
  {
    id: "run",
    label: "Course · coutures",
    props: {
      armorId: "hunter",
      weaponIds: ["plasma-caster", "wristblades"],
      pose: "run",
      phase: 0.24,
      speed: 280,
      bladesExtended: true,
    },
  },
  {
    id: "climb",
    label: "Escalade · coutures",
    props: {
      armorId: "scout",
      weaponIds: ["wristblades", "combistick"],
      pose: "climb",
      phase: 0.34,
    },
  },
  {
    id: "extract",
    label: "Extraction · trophée",
    props: {
      armorId: "hunter",
      weaponIds: [],
      pose: "extract",
      extractionProgress: 0.76,
      trophyCarried: true,
      gauntletOpen: true,
    },
  },
  {
    id: "left-facing",
    label: "Miroir · visée gauche",
    props: {
      armorId: "hunter",
      weaponIds: ["plasma-caster", "wristblades"],
      facing: -1,
      aiming: true,
      aimAngle: Math.PI + 0.38,
      bladesExtended: true,
    },
  },
];

function appearanceFor(morph: HunterBodyMorphId): HunterAppearance {
  return {
    presetId: "custom",
    bodyMorphId: morph,
    skinId: morph === "super" ? "dark-mottle" : "ochre-mottle",
    biomaskId: morph === "feral" ? "feral" : "jungle",
    dreadStyleId: morph === "huntress" ? "huntress" : "classic",
    dreadTintId: "obsidian",
    armorStyleId:
      morph === "super" ? "super" : morph === "feral" ? "feral" : "classic",
    armorTintId: morph === "super" ? "obsidian" : "bronze",
    trophyAdornmentId: "none",
  };
}

export default function RigLabClient() {
  const [morph, setMorph] = useState<HunterBodyMorphId>("classic");
  const appearance = appearanceFor(morph);

  return (
    <main
      data-rig-lab=""
      data-active-morph={morph}
      style={{
        minHeight: "100vh",
        padding: "24px",
        color: "#e8f1df",
        background:
          "radial-gradient(circle at 50% -10%, #223b31 0, #0c1513 36%, #050908 100%)",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      <header style={{ maxWidth: 1180, margin: "0 auto 22px" }}>
        <p
          style={{
            margin: 0,
            color: "#9fcfaa",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            fontSize: 12,
          }}
        >
          Diagnostic interne · V3
        </p>
        <h1 style={{ margin: "6px 0 8px", fontSize: 34 }}>
          Rig Lab — contrôle pièce par pièce
        </h1>
        <p style={{ margin: 0, maxWidth: 800, color: "#b8c7bc" }}>
          {CASES.length} assemblages critiques, six morphologies, deux orientations et les
          états ouverts, fermés, rétractés, portés et visés.
        </p>
      </header>

      <nav
        aria-label="Morphologies à tester"
        style={{
          maxWidth: 1180,
          margin: "0 auto 22px",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {MORPHS.map((bodyMorph) => (
          <button
            data-rig-morph-button={bodyMorph}
            key={bodyMorph}
            onClick={() => setMorph(bodyMorph)}
            style={{
              border: `1px solid ${
                morph === bodyMorph ? "#b8e05a" : "#385047"
              }`,
              borderRadius: 999,
              padding: "8px 13px",
              color: morph === bodyMorph ? "#11170f" : "#dce8dc",
              background: morph === bodyMorph ? "#b8e05a" : "#14201d",
              cursor: "pointer",
            }}
            type="button"
          >
            {bodyMorph}
          </button>
        ))}
      </nav>

      <section
        aria-label={`Assemblages ${morph}`}
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
        }}
      >
        {CASES.map((rigCase) => (
          <article
            data-rig-case={rigCase.id}
            key={rigCase.id}
            style={{
              minHeight: 344,
              padding: "12px 12px 10px",
              border: "1px solid #263c35",
              borderRadius: 12,
              background:
                "linear-gradient(180deg, rgb(26 40 35 / .92), rgb(8 13 12 / .96))",
              overflow: "hidden",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 650,
                color: "#cfe6d1",
              }}
            >
              {rigCase.label}
            </h2>
            <div
              style={{
                display: "grid",
                minHeight: 306,
                placeItems: "center",
                backgroundImage:
                  "linear-gradient(rgb(100 160 130 / .08) 1px, transparent 1px), linear-gradient(90deg, rgb(100 160 130 / .08) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >
              <HunterRigPreview
                appearance={
                  rigCase.trophyAdornment
                    ? { ...appearance, trophyAdornmentId: "skull-spine" }
                    : appearance
                }
                debugBones={rigCase.id === "bind"}
                size={204}
                {...rigCase.props}
              />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
