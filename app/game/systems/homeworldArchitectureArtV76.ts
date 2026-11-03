import identities from '../data/homeworldArchitectureArtV76.json';
import type {HomeworldGroundPointV64,HomeworldNativeBuildingArtV64} from './homeworldGeometryV64';

export type HomeworldArchitectureIdV76=keyof typeof identities;
export interface HomeworldArchitectureIdentityV76 {
 title:string;role:string;depth:340;art:HomeworldNativeBuildingArtV64;
 lore:'original-adaptation';
 measurement:{alphaThreshold:number;opaqueAlphaThresholdV76?:number;transparentPixelRatio:number;cornerAlphas:number[];
  jambTops:HomeworldGroundPointV64[];requestedYawDegrees:number;observedSide:'left'|'right';
  sourceReference:string;sourceReferenceSha256:string;doorWidthPlane:string;thresholdPlane:string;
  foundationPlane:string;lipInspection:string;logicalOverride:null};
}
/** Six independent native views of existing original civic buildings. The world
 * camera stays yaw0/pitch35; measured groundFrame points orient their actual
 * supports, access and volume. No CSS mirror/rotation or model import cycle. */
export const HOMEWORLD_ARCHITECTURE_IDENTITIES_V76=identities as Readonly<Record<HomeworldArchitectureIdV76,HomeworldArchitectureIdentityV76>>;
export function homeworldBuildingIdentityV76(id:string):HomeworldArchitectureIdentityV76|null {
 return HOMEWORLD_ARCHITECTURE_IDENTITIES_V76[id as HomeworldArchitectureIdV76]??null;
}
