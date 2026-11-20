/**
 * V154 — répliques des scènes de maison, lues dans le corpus V6 déjà importé
 * (`data/dialoguesV6-*.json`, onglets « Scènes de dialogue V6 », « Répliques
 * V6 », « Choix et actions V6 »). Scène de maison `V5-HOME-CMxx-Sy` →
 * scène de dialogue `D6-H-V5-HOME-CMxx-Sy`. Les répliques sont affichées
 * telles quelles avec le locuteur du corpus ; aucune n'est rédigée ici.
 *
 * Les morceaux du corpus (≈ 430 Ko chacun) sont chargés à la demande.
 *
 * Choix du jeu « proposé » : rattachement des phases du corpus aux états de
 * la scène — OUV avant le premier geste, REPRISE quand des gestes sont faits
 * sans que la séquence soit finie, SUCCES après le dernier geste, CHOIX (ligne
 * du joueur) pendant l'aperçu d'une option, REPONSE après la décision. ECHEC
 * n'est pas utilisé : les gestes de ces scènes n'ont pas d'échec dans le jeu.
 */

export interface DialogueLineV154 { id: string; scene: string; phase: string; choice: string; order: number; speaker: string; text: string; gesture?: string }
export interface DialogueSceneV154 { id: string; title: string; participants?: string; situation?: string }
export interface DialogueChunkV154 { scenes: DialogueSceneV154[]; lines: DialogueLineV154[] }
export interface HouseDialogueV154 { id: string; title: string; participants: string; lines: DialogueLineV154[] }

export const houseDialogueIdV154 = (sceneId: string) => `D6-H-${sceneId}`;

/** Pure reading of one loaded chunk. Null when the corpus has no such scene or no line. */
export function houseDialogueFromChunkV154(chunk: DialogueChunkV154, sceneId: string): HouseDialogueV154 | null {
  const id = houseDialogueIdV154(sceneId);
  const scene = chunk.scenes.find(entry => entry.id === id);
  if (!scene) return null;
  const lines = chunk.lines.filter(line => line.scene === id).sort((a, b) => a.order - b.order);
  return lines.length ? { id, title: scene.title, participants: scene.participants ?? "", lines } : null;
}

export type DialogueMomentV154 =
  | { kind: "opening" } | { kind: "resume" } | { kind: "success" }
  | { kind: "preview"; choice: 0 | 1 } | { kind: "response"; choice: 0 | 1 };
export function dialogueLinesForV154(dialogue: HouseDialogueV154, moment: DialogueMomentV154): DialogueLineV154[] {
  const letter = (choice: 0 | 1) => (choice === 0 ? "A" : "B");
  switch (moment.kind) {
    case "opening": return dialogue.lines.filter(line => line.phase === "OUV");
    case "resume": return dialogue.lines.filter(line => line.phase === "REPRISE");
    case "success": return dialogue.lines.filter(line => line.phase === "SUCCES");
    case "preview": return dialogue.lines.filter(line => line.phase === "CHOIX" && line.choice === letter(moment.choice));
    case "response": return dialogue.lines.filter(line => (line.phase === "CHOIX" || line.phase === "REPONSE") && line.choice === letter(moment.choice));
  }
}

const CHUNKS: readonly (() => Promise<unknown>)[] = [
  () => import("../data/dialoguesV6-first100.json"),
  () => import("../data/dialoguesV6-101-200.json"),
  () => import("../data/dialoguesV6-201-300.json"),
  () => import("../data/dialoguesV6-301-400.json"),
  () => import("../data/dialoguesV6-401-500.json"),
  () => import("../data/dialoguesV6-501-600.json"),
  () => import("../data/dialoguesV6-601-700.json"),
  () => import("../data/dialoguesV6-701-733.json"),
];
const unwrap = (module: unknown): unknown => (module && typeof module === "object" && "default" in module ? (module as { default: unknown }).default : module);

/** Loads the corpus chunk holding this house scene; null when the corpus has none. */
export async function loadHouseDialogueV154(sceneId: string): Promise<HouseDialogueV154 | null> {
  const index = unwrap(await import("../data/dialoguesV6-index.json")) as { scenes: { id: string; chunk: number }[] };
  const entry = index.scenes.find(scene => scene.id === houseDialogueIdV154(sceneId));
  if (!entry || !CHUNKS[entry.chunk]) return null;
  return houseDialogueFromChunkV154(unwrap(await CHUNKS[entry.chunk]()) as DialogueChunkV154, sceneId);
}
