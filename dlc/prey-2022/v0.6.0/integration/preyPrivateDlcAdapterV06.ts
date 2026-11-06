export const PREY_PRIVATE_DLC_ID = "yautja.prey.1719" as const;
export const PREY_PRIVATE_DLC_SAVE_KEY = "yautja.prey.2022.dlc.v06" as const;
export const PREY_PRIVATE_DLC_DEFAULT_URL = "http://127.0.0.1:4319" as const;

export type PreyPrivateCampaignId = "human" | "feral";
export interface PreyPrivateDlcDescriptor {
  id: typeof PREY_PRIVATE_DLC_ID; version: "0.6.0"; title: string; visibility: "owner-local-only";
  campaigns: readonly { id: PreyPrivateCampaignId; label: string; chapters: number }[];
  hostCompatibility: { repository: string; testedCommit: string; hostSaveVersion: number; integrationMode: "isolated-save-local-bridge" };
}
export const PREY_PRIVATE_DLC: PreyPrivateDlcDescriptor = Object.freeze({
  id: PREY_PRIVATE_DLC_ID, version: "0.6.0", title: "PREY — La chasse de 1719", visibility: "owner-local-only",
  campaigns: Object.freeze([Object.freeze({id:"human",label:"Naru / Taabe",chapters:22}),Object.freeze({id:"feral",label:"Feral Predator",chapters:15})]),
  hostCompatibility:Object.freeze({repository:"darknigthmare/yautja-la-longue-chasse",testedCommit:"73c0f6e8fe5e0a1301c6aa9becb5a67f0fb34aa9",hostSaveVersion:9,integrationMode:"isolated-save-local-bridge"}),
});
export function preyPrivateDlcLaunchUrl(campaign:PreyPrivateCampaignId,chapter?:string|null,baseUrl=PREY_PRIVATE_DLC_DEFAULT_URL):string{const url=new URL("/JOUER_PREY_DLC_V0_6.html",baseUrl);url.searchParams.set("campaign",campaign);if(chapter)url.searchParams.set("chapter",chapter);return url.toString()}
export interface PreyPrivateDlcProgressSummary{version:number;humanCompleted:number;feralCompleted:number;humanCurrent:number;feralCurrent:number;humanRecordCount:number;feralRecordCount:number;humanCheckpoint:string|null;feralCheckpoint:string|null;challengeCount:number;featCount:number;mirrorCount:number;huntMarkCount:number;mirrorJumps:number;endingSeen:boolean}
export function summarizePreyPrivateDlcSave(raw:string|null):PreyPrivateDlcProgressSummary{let parsed:any=null;try{parsed=raw?JSON.parse(raw):null}catch{parsed=null}const list=(v:unknown):unknown[]=>Array.isArray(v)?v:[];const int=(v:unknown):number=>typeof v==="number"&&Number.isFinite(v)?Math.max(0,Math.floor(v)):0;return{version:int(parsed?.version),humanCompleted:list(parsed?.completed?.human).length,feralCompleted:list(parsed?.completed?.feral).length,humanCurrent:int(parsed?.current?.human),feralCurrent:int(parsed?.current?.feral),humanRecordCount:list(parsed?.records?.human).length,feralRecordCount:list(parsed?.records?.feral).length,humanCheckpoint:typeof parsed?.resume?.human?.chapterId==="string"?parsed.resume.human.chapterId:null,feralCheckpoint:typeof parsed?.resume?.feral?.chapterId==="string"?parsed.resume.feral.chapterId:null,challengeCount:Object.values(parsed?.challenges??{}).filter(Boolean).length,featCount:list(parsed?.feats).length,mirrorCount:list(parsed?.mirrors).length,huntMarkCount:list(parsed?.huntMarks).length,mirrorJumps:int(parsed?.mirrorJumps),endingSeen:parsed?.endingSeen===true}}
