"use client";

import {useEffect, useRef, useState} from "react";
import {
  W3_S14_DOSSIER_PREFIX, W3_S14_RECEIPT_MAX_BYTES, verifyW3S14Receipt, w3s14OwnerDigest,
  type W3S14SignedReceipt,
} from "./systems/clanWarW3S14Receipt";

const trustedKey = (() => {
  try {return process.env.NEXT_PUBLIC_YAUTJA_W3_S14_VERIFY_KEY?.trim() ?? "";}
  catch {return "";}
})();
const outcomeLabels = {won: "Victoire du challenger", lost: "Victoire du rival", declined: "Duel refusé"};

function parse(text: string): unknown {
  if (text.length > W3_S14_RECEIPT_MAX_BYTES) return null;
  try {return JSON.parse(text);}
  catch {return null;}
}

export default function ClanWarW3S14ReceiptDossier({ownerCreatedAt, sourceSha}: {
  ownerCreatedAt: string;
  sourceSha: string;
}) {
  const [receipts, setReceipts] = useState<W3S14SignedReceipt[]>([]);
  const [message, setMessage] = useState("");
  const ticket = useRef({value: 0});
  const storedRevision = useRef(0);

  useEffect(() => {
    const admission = ticket.current;
    let alive = true;
    let readNumber = 0;
    async function reload() {
      const reading = ++readNumber;
      const revision = storedRevision.current;
      try {
        if (!trustedKey) return;
        const prefix = W3_S14_DOSSIER_PREFIX + await w3s14OwnerDigest(ownerCreatedAt) + ":";
        const matches: Promise<W3S14SignedReceipt | null>[] = [];
        for (let index = 0; index < localStorage.length; index++) {
          const key = localStorage.key(index);
          if (!key?.startsWith(prefix)) continue;
          matches.push(verifyW3S14Receipt(parse(localStorage.getItem(key) ?? ""), trustedKey, ownerCreatedAt, sourceSha)
            .then(receipt => receipt && key === prefix + receipt.body.roomId ? receipt : null));
        }
        const next = (await Promise.all(matches)).filter(receipt => receipt !== null);
        if (alive && reading === readNumber && revision === storedRevision.current) {
          setReceipts(next.sort((a, b) => a.body.roomId.localeCompare(b.body.roomId)));
        }
      } catch {
        if (alive && reading === readNumber) setMessage("Le dossier local ne peut pas être lu.");
      }
    }
    function storage(event: StorageEvent) {
      if (event.key === null || event.key.startsWith(W3_S14_DOSSIER_PREFIX)) void reload();
    }
    window.addEventListener("storage", storage);
    void reload();
    return () => {
      alive = false;
      admission.value++;
      window.removeEventListener("storage", storage);
    };
  }, [ownerCreatedAt, sourceSha]);

  async function admit(file: File) {
    const attempt = ++ticket.current.value;
    setMessage("Vérification du reçu…");
    try {
      const receipt = file.size <= W3_S14_RECEIPT_MAX_BYTES
        ? await verifyW3S14Receipt(parse(await file.text()), trustedKey, ownerCreatedAt, sourceSha)
        : null;
      if (attempt !== ticket.current.value) return;
      if (!receipt) {
        setMessage("Reçu refusé. Vérifiez le document signé, la clé configurée et le créneau de campagne.");
        return;
      }
      const key = W3_S14_DOSSIER_PREFIX + receipt.body.ownerDigest + ":" + receipt.body.roomId;
      const existing = localStorage.getItem(key);
      if (existing !== null) {
        const prior = await verifyW3S14Receipt(parse(existing), trustedKey, ownerCreatedAt, sourceSha);
        if (attempt !== ticket.current.value) return;
        if (prior) {
          setMessage(prior.signature === receipt.signature ? "Ce reçu est déjà classé." : "Un autre résultat signé occupe déjà ce salon.");
          return;
        }
      }
      const bytes = JSON.stringify(receipt);
      localStorage.setItem(key, bytes);
      if (localStorage.getItem(key) !== bytes) throw new Error("Écriture non confirmée.");
      storedRevision.current++;
      setReceipts(current => [...current.filter(entry => entry.body.roomId !== receipt.body.roomId), receipt]
        .sort((a, b) => a.body.roomId.localeCompare(b.body.roomId)));
      setMessage("Reçu signé vérifié et classé.");
    } catch {
      if (attempt === ticket.current.value) setMessage("Le reçu n’a pas pu être classé dans le dossier local.");
    }
  }

  return <details data-w3-s14-receipt-dossier>
    <summary>Dossier de campagne · reçus du duel W3-S14</summary>
    <p>Créneau à déclarer au salon <code>{ownerCreatedAt}</code></p>
    {trustedKey
      ? <label>Importer mon reçu signé
        <input type="file" accept=".json,application/json" onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void admit(file);
        }}/>
      </label>
      : <p>La clé publique de l’arbitre doit être configurée pour vérifier les reçus.</p>}
    <p role="status">{message}</p>
    {receipts.length > 0 && <ul aria-label="Reçus signés vérifiés">{receipts.map(({body}) =>
      <li key={body.roomId} data-w3-s14-receipt={body.roomId}>
        <strong>{outcomeLabels[body.outcome]}</strong>
        {" · "}{body.role === "challenger" ? "Challenger" : "Rival"}
        {" · "}{3 - body.rival}–{3 - body.player} touches
        {" · "}<code>{body.roomId}</code>
      </li>)}</ul>}
  </details>;
}
