import config from '../data/cloudAccountConfigV71.json';

/** Only a publishable key ships to the client. Supabase verifies JWTs and RLS. */
export const CLOUD_SESSION_KEY_V71 = 'yautja-long-hunt.cloud.session-v71';
export interface CloudSessionV71 { accessToken:string; refreshToken:string; expiresAt:number; user:{id:string;email:string} }
export class CloudNetworkErrorV71 extends Error { constructor(message:string,readonly status=0){super(message);this.name='CloudNetworkErrorV71';} }
export class CloudRevisionConflictV71 extends Error { constructor(){super('La sauvegarde du compte a changé sur un autre appareil. Choisissez à nouveau la copie à conserver.');this.name='CloudRevisionConflictV71';} }
export type CloudFetchV71=typeof fetch;
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);

export function parseCloudSessionV71(raw:string|null):CloudSessionV71|null {
 if(!raw||raw.length>32000)return null;
 try{const v=JSON.parse(raw);return object(v)&&typeof v.accessToken==='string'&&v.accessToken.length>10&&typeof v.refreshToken==='string'&&v.refreshToken.length>10&&typeof v.expiresAt==='number'&&Number.isFinite(v.expiresAt)&&object(v.user)&&uuid(v.user.id)&&typeof v.user.email==='string'?v as unknown as CloudSessionV71:null;}catch{return null;}
}
function sessionFromResponse(data:unknown):CloudSessionV71|null {
 if(!object(data)||typeof data.access_token!=='string'||data.access_token.length<=10||typeof data.refresh_token!=='string'||data.refresh_token.length<=10||!object(data.user)||!uuid(data.user.id)||typeof data.user.email!=='string')return null;
 const expiresAt=typeof data.expires_at==='number'?data.expires_at:Date.now()/1000+Number(data.expires_in??3600);
 return Number.isFinite(expiresAt)&&expiresAt>0?{accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt,user:{id:data.user.id,email:data.user.email}}:null;
}
export function createCloudRestV71(fetcher:CloudFetchV71=fetch) {
 async function request(path:string,options:RequestInit={},session:CloudSessionV71|null=null):Promise<unknown>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const res=await fetcher(config.url+path,{...options,signal:controller.signal,cache:'no-store',headers:{apikey:config.publishableKey,...(session?{Authorization:`Bearer ${session.accessToken}`} : {}),'Content-Type':'application/json',...options.headers}});
   const body=await res.text();let data:unknown=null;try{data=body?JSON.parse(body):null;}catch{throw new CloudNetworkErrorV71('Réponse du service de compte illisible. Aucune archive remplacée.',res.status);}
   if(!res.ok){
    // Never display raw provider messages, tokens or submitted credentials.
    const message=res.status===429?'Trop de tentatives. Réessayez dans quelques minutes.':res.status===401||res.status===400?'Connexion refusée : vérifiez votre adresse, votre mot de passe et la confirmation du compte.':res.status===403?'Le compte ne permet pas cette opération.':`Service de compte indisponible (${res.status}). Votre progression locale reste protégée.`;
    throw new CloudNetworkErrorV71(message,res.status);
   }
   return data;
  }catch(error){if(error instanceof CloudNetworkErrorV71)throw error;throw new CloudNetworkErrorV71('Connexion au compte interrompue. Votre progression reste sur cet appareil.');}finally{clearTimeout(timeout);}
 }
 return {
  async signIn(email:string,password:string){const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:email.trim(),password})});const session=sessionFromResponse(data);if(!session)throw new CloudNetworkErrorV71('Session de compte invalide.');return session;},
  async signUp(email:string,password:string){return sessionFromResponse(await request('/auth/v1/signup',{method:'POST',body:JSON.stringify({email:email.trim(),password})}));},
  async refresh(session:CloudSessionV71){const next=sessionFromResponse(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refreshToken})}));if(!next||next.user.id!==session.user.id)throw new CloudNetworkErrorV71('Le propriétaire du compte ne correspond plus à cette session.',401);return next;},
  async verify(session:CloudSessionV71){const user=await request('/auth/v1/user',{},session);if(!object(user)||user.id!==session.user.id)throw new CloudNetworkErrorV71('Session de compte non confirmée.',401);return session;},
  async signOut(session:CloudSessionV71){await request('/auth/v1/logout?scope=local',{method:'POST'},session);},
  async pull(session:CloudSessionV71){const rows=await request(`/rest/v1/${config.table}?select=user_id,revision,snapshot,updated_at&user_id=eq.${session.user.id}&limit=1`,{},session);if(!Array.isArray(rows))throw new CloudNetworkErrorV71('Archive distante invalide.');return rows[0]??null;},
  async push(session:CloudSessionV71,expectedRevision:number|null,snapshot:unknown){
   if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<1||expectedRevision>=1000000000))throw new CloudNetworkErrorV71('Révision distante invalide.');
   const filter=expectedRevision===null?'':`?user_id=eq.${session.user.id}&revision=eq.${expectedRevision}`;
   let rows:unknown;
   try{rows=await request(`/rest/v1/${config.table}${filter}`,{method:expectedRevision===null?'POST':'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:session.user.id,revision:expectedRevision===null?1:expectedRevision+1,snapshot})},session);}catch(error){if(error instanceof CloudNetworkErrorV71&&error.status===409)throw new CloudRevisionConflictV71();throw error;}
   if(!Array.isArray(rows)||rows.length!==1)throw new CloudRevisionConflictV71();return rows[0];
  },
 };
}
