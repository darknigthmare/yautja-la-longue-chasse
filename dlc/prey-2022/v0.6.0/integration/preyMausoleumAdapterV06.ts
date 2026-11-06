import type { MausoleumDlcAdapter, MausoleumReturnTicket } from "./mausoleum";
const DEFAULT_URL="http://127.0.0.1:4319";
export const PREY_MAUSOLEUM_ADAPTER_V06: MausoleumDlcAdapter = Object.freeze({
  chronicleId:"prey",installed:true,owned:true,campaignVersion:"0.6.0",status:"ready",
  async start(ticket:MausoleumReturnTicket){
    if(typeof window==="undefined")return{started:false,reason:"Lancement PREY disponible uniquement depuis le client local."};
    const base=(process.env.NEXT_PUBLIC_PREY_DLC_LOCAL_URL||DEFAULT_URL).replace(/\/$/,"");
    try{const status=await fetch(`${base}/__prey/status`,{cache:"no-store"});if(!status.ok)return{started:false,reason:"Bridge PREY V0.6 hors ligne."};const info=await status.json();if(info?.version!=="0.6.0")return{started:false,reason:"Version du bridge PREY incompatible."};const url=new URL(`${base}/JOUER_PREY_DLC_V0_6.html`);url.searchParams.set("campaign","human");url.searchParams.set("mausoleum","1");url.searchParams.set("returnOwner",ticket.ownerCreatedAt);window.open(url.toString(),"_blank","noopener,noreferrer");return{started:true}}catch{return{started:false,reason:"Bridge PREY V0.6 indisponible. Lancez le serveur local privé."}}
  }
});
