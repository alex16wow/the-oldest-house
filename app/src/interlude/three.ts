/**
 * three.js, loaded on demand from the CDN the first time a WebGL transition is
 * needed, so visitors who never see one never download it. The page's import
 * map points `three/webgpu` and `three/tsl` at the same pinned build.
 */
const WEBGPU = 'three/webgpu';
const TSL_URL = 'three/tsl';

let pending: Promise<{ THREE: any; TSL: any }> | undefined;

export function loadThree() {
  return (pending ??= (async () => {
    // Kept in variables so the bundler leaves these imports to the browser and its import map.
    const [THREE, TSL] = await Promise.all([import(WEBGPU), import(TSL_URL)]);
    return { THREE, TSL };
  })().catch((error) => {
    pending = undefined; // a later transition may try again
    throw error;
  }));
}
