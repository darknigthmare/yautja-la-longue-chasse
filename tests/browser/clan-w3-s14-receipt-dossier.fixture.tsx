import {createRoot} from "react-dom/client";
import ClanWarBibleV6Panel from "../../app/game/ClanWarBibleV6Panel";

const role = new URLSearchParams(location.search).get("slot");
const owner = role === "rival" ? "2026-11-21T12:00:00.000Z" : "2026-11-21T09:00:00.000Z";
const root = document.getElementById("root");
if (!root) throw new Error("Point de montage du dossier absent.");
createRoot(root).render(<ClanWarBibleV6Panel campaignOwnerCreatedAt={owner}/>);
