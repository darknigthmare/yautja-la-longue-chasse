# V139 — V138 visual ledger retained, mathematical decal parity added

- Retains the **1,134** V138 visual QA cells and **40** official-source evidence gaps unchanged. None has been changed to `Conforme` without an actual reference screenshot.
- Adds **52** geometric projections: **6** compact V62 heads, **42** translated V137 mask/morphology combinations and **4** complete-frame decal channels.
- Calculated live formulas recombine the mask rectangle and local decal placement into exact global Canvas 256×384 pixel coordinates. All 52 yield `OK` in the **mathematical** column; 1,134 visual checks still show `À tester`.
- Real code fix: `DecalSurfaceV133.tsx` positions the alpha mask's owning rectangle instead of using CSS `mask-position:%` with a 100%-sized mask (which cannot translate the mask). Restores normal alpha blending parity with the `source-atop` Canvas.
- Reviewed [Yautja_PHG_QA_Visual_Morphologies_V139.xlsx](./production/Yautja_PHG_QA_Visual_Morphologies_V139.xlsx) by SHA-256. `scripts/verify-phg-visual-v139.py` and its CI unit tests reject forged visual passes, removed formula cells, missing source gaps and altered workbook bytes.
- These are original fan visual studies. A mathematical placement pass **is not** a claim of source-matched *Predator: Hunting Grounds* UV maps or certified visual fidelity 1:1.
