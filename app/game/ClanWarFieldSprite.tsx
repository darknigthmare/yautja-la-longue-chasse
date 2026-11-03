/** Original vector-derived game props, not certified film assets. */
export const FIELD_SPRITE_IDS=[
 'relay-active','relay-disabled','beacon-active','beacon-disabled',
 'supply-sealed','supply-open','barrier-intact','barrier-damaged',
 'core-active','core-disabled','medical-stocked','medical-empty',
] as const;
export type FieldSpriteId=typeof FIELD_SPRITE_IDS[number];
export function fieldSpriteUrl(id:FieldSpriteId):string{
 if(!FIELD_SPRITE_IDS.includes(id))throw new RangeError('Unknown field sprite');
 return '/game/assets/clan-field-20261103/'+id+'.svg';
}
export default function ClanWarFieldSprite({id,label,size=56}:{id:FieldSpriteId;label:string;size?:number}){
 const bounded=Math.max(20,Math.min(128,size));
 return <svg width={bounded} height={bounded} viewBox="0 0 512 512"
  role="img" aria-label={label} data-field-prop={id}
  style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,pointerEvents:'none'}}>
  <title>{label}</title><image href={fieldSpriteUrl(id)} width="512" height="512"/>
 </svg>;
}
