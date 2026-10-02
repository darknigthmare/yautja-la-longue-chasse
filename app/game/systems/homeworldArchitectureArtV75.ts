import identities from '../data/homeworldArchitectureArtV75.json';
import type {HomeworldNativeBuildingArtV64} from './homeworldGeometryV64';

export type HomeworldArchitectureIdV75=keyof typeof identities;
export interface HomeworldArchitectureIdentityV75 {
  title:string; role:string; depth:number; art:HomeworldNativeBuildingArtV64;
  lore:'original-adaptation';
  measurement:{alphaThreshold:number;transparentPixelRatio:number;cornerAlphas:number[];
    doorWidthPlane:string;thresholdPlane:string;logicalOverride:null};
}
/** Original local-city architecture, not a canonical map or a new service.
 * Pure registry: the city may import it without a renderer/model dependency.
 * Source pixels and separate front-floor/foundation measurements are preserved. */
export const HOMEWORLD_ARCHITECTURE_IDENTITIES_V75=identities as Readonly<Record<HomeworldArchitectureIdV75,HomeworldArchitectureIdentityV75>>;
export function homeworldBuildingIdentityV75(id:string):HomeworldArchitectureIdentityV75|null {
  return HOMEWORLD_ARCHITECTURE_IDENTITIES_V75[id as HomeworldArchitectureIdV75]??null;
}
