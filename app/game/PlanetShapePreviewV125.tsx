"use client";

import { shapedRadiusV115, warShapeTemplateV115, type WarShapeCategoryV115 } from "./systems/clanWarShapeAtlasV115";
import styles from "./PlanetShapePreviewV125.module.css";

const shapes = [
  ["island", "Île"], ["continent", "Continent"], ["region", "Région"],
] as const;

/** The outline uses exactly the V115 radial profile, shown as a schematic
 * footprint. Planetary war geometry still comes from the V103/V115 generator. */
export function planetShapePreviewPathV125(category: WarShapeCategoryV115, index: number, samples=96): string {
  const template = warShapeTemplateV115(category,index);
  const points = Array.from({length:samples},(_,i)=>{
    const angle = Math.PI*2*i/samples;
    const r = shapedRadiusV115(.83,angle,template,0)*43;
    return [50+Math.cos(angle)*r,50+Math.sin(angle)*r] as const;
  });
  return points.map(([x,y],i)=>`${i?"L":"M"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")+" Z";
}

export default function PlanetShapePreviewV125({island,continent,region}:{
  island:number; continent:number; region:number;
}) {
  const selections = {island,continent,region} as const;
  return <section className={styles.preview} aria-label="Silhouettes des formes planétaires" data-testid="planet-shapes-preview-v125">
    <p>Aperçu des trois contours radiaux qui orientent la géographie. Les terres et frontières définitives restent soudées par le générateur.</p>
    <div className={styles.grid}>
      {shapes.map(([category,label])=>{
        const template=warShapeTemplateV115(category,selections[category]);
        return <figure key={category}>
          <svg viewBox="0 0 100 100" role="img" aria-label={`${label} : ${template.name}`}>
            <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" opacity=".19"/>
            <path d={planetShapePreviewPathV125(category,template.index)} fill="#879e85" stroke="#d0d7ab" strokeWidth="1.25" strokeLinejoin="round"/>
          </svg>
          <figcaption><strong>{template.name}</strong><span>{template.description}</span></figcaption>
        </figure>;
      })}
    </div>
  </section>;
}
