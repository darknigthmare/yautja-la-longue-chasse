/** These later hunting UI assets are not Homeworld/Pit native-art admissions.
 * They remain runtime inputs and are fingerprinted by the V112 freeze. */
export const V112_HUNT_NATIVE_ASSETS = Object.freeze([
  'public/game/assets/v112/discovery/animal.svg',
  'public/game/assets/v112/discovery/radio.svg',
  'public/game/assets/v112/discovery/scent.svg',
  'public/game/assets/v112/discovery/visual.svg',
  'public/game/ui/v112/field-harvest-symbols.svg',
]);
const huntAssets = new Set(V112_HUNT_NATIVE_ASSETS);
export const isV112HuntNativeAsset = file => huntAssets.has(file);
