import art from '../data/homeworldBackdropArtV82.json';

/** Separate native industrial and docking silhouettes. These painted distant
 * assemblies grant no door, walkable ground, service or campaign discovery. */
export const HOMEWORLD_BACKDROP_ART_V82=art.assets;
export const HOMEWORLD_BACKDROP_SCENE_SOURCES_V82=Object.values(art.assets).map(a=>({src:a.src,sourceWidth:a.sourceWidth,sourceHeight:a.sourceHeight,kind:'scene' as const}));
export function homeworldBackdropArtV82(id:string,underground:boolean){
 if(underground)return art.assets['industrial-distant-quarter'];
 if(id==='far-port-city'||id==='secondary-east-logistics'||id==='outer-east-complex')return art.assets['port-distant-quarter'];
 return null;
}
