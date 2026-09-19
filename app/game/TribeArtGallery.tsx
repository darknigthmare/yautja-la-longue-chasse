"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import catalogue from "./tribeArtV37.json";
import styles from "./TribeArtGallery.module.css";

type SourceAsset = (typeof catalogue.assets)[number];
function SourcePreview({ asset }: { asset: SourceAsset }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  return <div className={styles.imageSurface} data-source-image-status={status}>
    <img src={asset.src} alt={asset.label} width={asset.width} height={asset.height} decoding="async" hidden={status === "error"} onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
    {status !== "ready" && <p className={styles.imageStatus} role="status">{status === "error" ? "Image indisponible. Sélectionnez une autre source ou réessayez plus tard." : "Chargement de la source…"}</p>}
  </div>;
}
function SourceThumbnail({ asset }: { asset: SourceAsset }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.thumbnail}>{failed ? <small>Aperçu indisponible</small> : <img src={asset.thumbnailSrc} alt="" width={320} height={220} loading="lazy" decoding="async" onError={() => setFailed(true)} />}</div>;
}

const PAGE_SIZE = 12;
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");

/** Imported source library, not a destination selector or an animation registry. */
export default function TribeArtGallery() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [pack, setPack] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(catalogue.assets[0]?.id ?? "");
  const results = useMemo(() => {
    const search = fold(query.trim());
    return catalogue.assets.filter(asset => (!kind || asset.kind === kind) && (!pack || asset.pack === pack) &&
      fold(`${asset.label} ${asset.subject} ${asset.category} ${asset.sourceName}`).includes(search));
  }, [query, kind, pack]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(results.length / PAGE_SIZE) - 1));
  const visible = results.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selected = results.find(asset => asset.id === selectedId) ?? visible[0];
  const reset = () => { setPage(0); setSelectedId(""); };
  return <section className={styles.library} aria-labelledby="tribe-library-title" data-tribe-source-gallery="v37">
    <div className={styles.introduction}>
      <p className={styles.eyebrow}>PACKS FOURNIS · V2 / V3 / V4</p>
      <h3 id="tribe-library-title">Planètes et tribus · bibliothèque d’images</h3>
      <p><strong>{catalogue.assets.length} images uniques importées.</strong> Les planètes proposées et les cinq tribus Homeworld restent des ensembles distincts. Cette bibliothèque permet de consulter les fichiers reçus ; elle ne débloque aucun niveau et ne modifie pas votre sauvegarde.</p>
      <p className={styles.notice}>Une illustration composée n’est pas un kit de parallaxe séparé. Un personnage détouré n’est pas une animation. Les PNG originaux sont conservés ; les images de consultation en pleine résolution utilisent une compression sans perte vérifiée pixel par pixel.</p>
    </div>
    <div className={styles.filters}>
      <label>Rechercher une planète, une tribu ou un objet<input type="search" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); reset(); }} placeholder="Mycora, désert, forge…" /></label>
      <label>Type d’image<select value={kind} onChange={event => { setKind(event.target.value); reset(); }}><option value="">Tous les types</option>{catalogue.kinds.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Pack source<select value={pack} onChange={event => { setPack(event.target.value); reset(); }}><option value="">V2 + V3 + V4</option>{catalogue.packs.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    </div>
    <p role="status" aria-live="polite">{results.length} image(s) · page {results.length ? currentPage + 1 : 0} sur {Math.ceil(results.length / PAGE_SIZE)}</p>
    {selected && <figure className={styles.viewer} data-tribe-selected={selected.id}>
      <SourcePreview key={selected.id} asset={selected} />
      <figcaption><div><strong>{selected.label}</strong><p>{selected.category} · {selected.pack} · {selected.width} × {selected.height}</p><p>{selected.usageNote}</p></div><a href={selected.src} target="_blank" rel="noopener noreferrer">Ouvrir en pleine résolution</a></figcaption>
    </figure>}
    <div className={styles.grid}>
      {visible.map(asset => <button className={styles.card} key={asset.id} type="button" onClick={() => setSelectedId(asset.id)} aria-pressed={asset.id === selected?.id} data-tribe-asset={asset.id}>
        <SourceThumbnail asset={asset} /><span>{asset.label}</span><small>{asset.category} · {asset.pack}</small>
      </button>)}
    </div>
    {results.length === 0 && <button type="button" onClick={() => { setQuery(""); setKind(""); setPack(""); reset(); }}>Réinitialiser les filtres</button>}
    {results.length > PAGE_SIZE && <nav className={styles.pagination} aria-label="Pages des images de planètes et tribus"><button type="button" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelectedId(""); }}>Page précédente</button><button type="button" disabled={(currentPage + 1) * PAGE_SIZE >= results.length} onClick={() => { setPage(currentPage + 1); setSelectedId(""); }}>Page suivante</button></nav>}
  </section>;
}
