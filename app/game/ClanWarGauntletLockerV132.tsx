"use client";

import { useMemo, useState } from "react";
import {
  GAUNTLET_CATALOG_V132, GAUNTLET_EVIDENCE_LABELS_V132,
  GAUNTLET_PALETTES_V132, GAUNTLET_READOUT_LABELS_V132,
  gauntletByIdV132, gauntletUnlockedV132, gauntletUnlockLabelV132,
  type HunterRankV132,
} from "./systems/clanWarGauntletCatalogV132";
import styles from "./ClanWarGauntletLockerV132.module.css";
import HunterGauntletArtV132 from "./HunterGauntletArtV132";
import { evaluateGauntletStudyV134, type GauntletCampaignEvidenceV134 } from "./systems/gauntletCampaignV134";

const PAGE_SIZE = 12;
const sourceNames: Record<string,string> = {
  cinema:"Films", animation:"Animation", game:"Jeu licencié", "video-game":"Jeu vidéo", comic:"Comics",
};
export default function ClanWarGauntletLockerV132({ hunterRank, equippedId, onEquip, disabled = false, claimedStudies = [], campaignEvidence, onClaimStudy }: {
  hunterRank: HunterRankV132;
  equippedId: string;
  onEquip: (id: string) => void;
  disabled?: boolean;
  claimedStudies?: readonly string[];
  campaignEvidence?: GauntletCampaignEvidenceV134;
  onClaimStudy?: (id:string)=>boolean | void;
}) {
  const [query,setQuery]=useState("");
  const [medium,setMedium]=useState("all");
  const [page,setPage]=useState(0);
  const [previewId,setPreviewId]=useState(equippedId);
  const [coverOpen,setCoverOpen]=useState(true);
  const visible=useMemo(()=>GAUNTLET_CATALOG_V132.filter(item=>
    (medium==="all"||item.medium===medium) &&
    (!query || `${item.id} ${item.name} ${item.notes} ${item.artBrief}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))))
  ,[medium,query]);
  const maxPages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
  const currentPage=Math.min(page,maxPages-1);
  const display=visible.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
  const preview=gauntletByIdV132(previewId) ?? gauntletByIdV132(equippedId) ?? GAUNTLET_CATALOG_V132[0];
  const unlocked=GAUNTLET_CATALOG_V132.filter(item=>gauntletUnlockedV132(item.id,hunterRank,claimedStudies)).length;
  const study=preview.unlock.startsWith("challenge:") && campaignEvidence
    ? evaluateGauntletStudyV134(campaignEvidence,preview.id) : null;
  const studyClaimed=claimedStudies.includes(preview.id);
  return <details className={styles.locker} data-testid="gauntlet-locker-v132" data-equiv="cosmetic-hud-only">
    <summary>Armurerie de clan · gauntlets <span>{unlocked}/{GAUNTLET_CATALOG_V132.length} accessibles</span></summary>
    <div className={styles.head}>
      <p>Choisissez le brassard représenté dans la projection. Les variantes apportent une palette, un rythme d&apos;ouverture, une signature sonore de conception et une <strong>lecture tactique des seules informations déjà connues</strong>, jamais des dégâts ou des unités supplémentaires.</p>
      <p><strong>Équipé :</strong> {gauntletByIdV132(equippedId)?.name ?? "Jungle Hunter"} · <strong>Profil :</strong> {hunterRank}.</p>
    </div>
    <div className={styles.filters}>
      <label>Rechercher un modèle<input type="search" value={query} maxLength={80} onChange={e=>{setQuery(e.currentTarget.value);setPage(0);}} placeholder="Jungle, Wolf, Feral, PHG…"/></label>
      <label>Origine<select value={medium} onChange={e=>{setMedium(e.currentTarget.value);setPage(0);}}>
        <option value="all">Toutes les sources</option>
        {Object.entries(sourceNames).map(([value,label])=><option value={value} key={value}>{label}</option>)}
      </select></label>
    </div>
    <div className={styles.preview} aria-live="polite" data-preview-model={preview.id}>
      <div className={styles.artPreview}>
        <HunterGauntletArtV132 entry={preview} coverOpen={coverOpen}/>
        <button type="button" aria-pressed={coverOpen} onClick={()=>setCoverOpen(open=>!open)} disabled={disabled}>
          {coverOpen?"Refermer le capot":"Ouvrir le capot"}
        </button>
      </div>
      <div className={styles.previewCopy}>
        <strong>{preview.name}</strong>
        <small>{GAUNTLET_EVIDENCE_LABELS_V132[preview.evidence]}</small>
        <p>{preview.artBrief}</p>
        <p>Interface : {GAUNTLET_READOUT_LABELS_V132[preview.readout]} · animation : {GAUNTLET_PALETTES_V132[preview.theme].motion} · son prévu : {GAUNTLET_PALETTES_V132[preview.theme].sound}.</p>
        <p className={styles.note}>{preview.notes}</p>
        <p className={styles.note}>Aperçu vectoriel de travail : fidélité 1:1 non encore validée.</p>
        {study && <section className={styles.research} aria-label="Dossier d'étude du gauntlet">
          <h4>Dossier d&apos;étude · reconstitution de l&apos;atelier de clan</h4>
          <p>Source de preuve : {study.study?.missionId} · trophée {study.study?.quality} · {study.study?.minimumScans} scans au total.</p>
          {studyClaimed ? <p className={styles.studyReady}>Archive de recherche validée et sauvegardée.</p>
            : study.missing.length ? <p className={styles.studyMissing}>{study.missing.join(" · ")}</p>
            : <p className={styles.studyReady}>Conditions remplies : validation disponible au comptoir.</p>}
          <button type="button" disabled={disabled||studyClaimed||!study.ok||!onClaimStudy}
            onClick={()=>onClaimStudy?.(preview.id)}>
            {studyClaimed?"Dossier déjà validé":study.ok?"Valider l'étude et débloquer":"Étude encore verrouillée"}
          </button>
          <small>Récompense : reproduction cosmétique du design, pas récupération du gauntlet original sur la planète de chasse.</small>
        </section>}
        <a href={preview.sourceUrl} target="_blank" rel="noopener noreferrer">Source de référence</a>
      </div>
    </div>
    <p className={styles.count} role="status">{visible.length} modèles répertoriés · page {currentPage+1}/{maxPages}</p>
    <div className={styles.grid}>
      {display.map(item=>{
        const available=gauntletUnlockedV132(item.id,hunterRank,claimedStudies);
        return <article className={styles.card} key={item.id} data-gauntlet-model={item.id} data-unlocked={available}>
          <div className={styles.top}>
            <span className={styles.swatch} style={{background:GAUNTLET_PALETTES_V132[item.theme].accent}} aria-hidden="true"/>
            <strong>{item.name}</strong>
          </div>
          <small>{sourceNames[item.medium]??item.medium} · {GAUNTLET_READOUT_LABELS_V132[item.readout]}</small>
          <p className={styles.unlock}>{gauntletUnlockLabelV132(item,hunterRank,claimedStudies)}</p>
          <div className={styles.actions}>
            <button type="button" aria-pressed={preview.id===item.id} onClick={()=>setPreviewId(item.id)}>Fiche</button>
            <button type="button" disabled={disabled||!available||equippedId===item.id}
              aria-label={available?`Équiper ${item.name}`:`${item.name} verrouillé`}
              onClick={()=>{onEquip(item.id);setPreviewId(item.id);}}>
              {equippedId===item.id?"Équipé":available?"Équiper":"Verrouillé"}
            </button>
          </div>
        </article>;
      })}
    </div>
    {visible.length===0&&<p>Aucun modèle ne correspond aux filtres.</p>}
    <div className={styles.pagination}>
      <button type="button" disabled={currentPage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Précédent</button>
      <span>{currentPage+1}/{maxPages}</span>
      <button type="button" disabled={currentPage+1>=maxPages} onClick={()=>setPage(p=>p+1)}>Suivant</button>
    </div>
    <p className={styles.footnote}>Les 44 études nécessitent une chasse enregistrée, un véritable trophée et parfois un rite d&apos;atelier. La validation sauvegarde une reconstitution cosmétique dans la campagne V13. Les sites de films ne sont pas déplacés artificiellement sur nos planètes. Le catalogue garde les objets originaux distincts des reproductions.</p>
  </details>;
}
