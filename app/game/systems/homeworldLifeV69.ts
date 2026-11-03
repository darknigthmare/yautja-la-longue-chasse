import life from '../data/homeworldLifeV69.json';
import { HOMEWORLD_RESIDENTS_V68, homeworldResidentPoseV68, homeworldResidentDialogueV68, type HomeworldResidentV68 } from './homeworldLifeV68';
import { HOMEWORLD_BUILDINGS, shouldFadeHomeworldBuilding, homeworldBuildingVisibleBoundsV72,homeworldBuildingRenderDepthV76, type HomeworldVec2 } from './homeworldCity';
import { homeworldProjectGroundV64,homeworldBuildingCoversPaintV76 } from './homeworldGeometryV64';
export interface HomeworldResidentV69 extends HomeworldResidentV68 {
  name?: string; activity?: 'inspection' | 'transmission' | 'preparation';
}
/** These are original inhabitants of the playable clan, not named canon hunters.
 * Their routes have been sampled on the real collision plan, including furniture. */
export const HOMEWORLD_NEW_RESIDENTS_V69 = life.population as HomeworldResidentV69[];
export const HOMEWORLD_RESIDENTS_V69: readonly HomeworldResidentV69[] = [...HOMEWORLD_RESIDENTS_V68, ...HOMEWORLD_NEW_RESIDENTS_V69];
export const homeworldResidentPoseV69 = homeworldResidentPoseV68;
export function homeworldResidentRoofOccludedV69(pose: HomeworldVec2, actor: HomeworldVec2) {
  const p=homeworldProjectGroundV64(pose);
  return HOMEWORLD_BUILDINGS.some(b=>{
    if(pose.y>=homeworldBuildingRenderDepthV76(b,pose) || !shouldFadeHomeworldBuilding(b,actor)) return false;
    if(b.art.opaqueRowsV76)return homeworldBuildingCoversPaintV76(b,pose);
    const r=homeworldBuildingVisibleBoundsV72(b);
    return p.x>r.left&&p.x<r.left+r.width&&p.y>r.top&&p.y<r.top+r.height;
  });
}
export function nearestHomeworldResidentV69(actor: HomeworldVec2, seconds: number, radius = 82) {
  let nearest: HomeworldResidentV69 | null = null, distance = radius;
  for (const resident of HOMEWORLD_RESIDENTS_V69) {
    const p = homeworldResidentPoseV69(resident, seconds), d = Math.hypot(actor.x-p.x,actor.y-p.y);
    if (d < distance && !homeworldResidentRoofOccludedV69(p,actor)) { nearest = resident; distance = d; }
  }
  return nearest;
}
const activities = {
  inspection: ['Vérifie les appuis', 'Consigne le passage', 'Observe le retour'],
  transmission: ['Échange un récit', 'Attend un courrier', 'Porte une réponse'],
  preparation: ['Prépare les outils', 'Écoute les anciens', 'Rejoint son poste'],
} as const;
export function homeworldResidentActivityV69(resident: HomeworldResidentV69, seconds: number) {
  if (!resident.activity) return resident.role;
  const slot = Math.floor((Math.max(0,seconds)+resident.phaseSeconds)/35)%3;
  return activities[resident.activity][slot];
}
export function homeworldResidentDialogueV69(resident: HomeworldResidentV69, seconds = 0) {
  const original = homeworldResidentDialogueV68(resident);
  if (!resident.activity) return original;
  const endings = {
    inspection: 'Une route sûre hier peut changer après une rafale. Les guides du village attendent tes observations avant de confirmer un retour.',
    transmission: 'La personne qui demande une chasse doit aussi en recevoir le rapport. Les marques de clan récompensent ce travail ; elles ne font pas un rite.',
    preparation: 'La cohorte reconnue se prépare au Premier Sang. Ses armes physiques et ses compagnons doivent être prêts avant une expédition encadrée.',
  };
  return `${resident.name} — ${homeworldResidentActivityV69(resident,seconds)}. ${original} ${endings[resident.activity]}`;
}
