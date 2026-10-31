/** Seven original concept biomask shapes; never substitute for canonical PHG geometry. */
import catalog from "./data/conceptBiomasksV133.json" with { type: "json" };
export const Y_A_U_T_J_A_CONCEPT_MASKS_V133 = Object.freeze(catalog.records);
export function conceptBiomaskV133(id:unknown) {
  if(typeof id!=="string")return null;
  return Y_A_U_T_J_A_CONCEPT_MASKS_V133.find(mask=>mask.id===id)??null;
}
