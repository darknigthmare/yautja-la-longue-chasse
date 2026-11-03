import {
  DEFAULT_CONTROL_BINDINGS,
  type ControlActionId,
  type ControlBindings,
} from "./systems/controlBindings";

const COMPACT_CONTROL_KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "Espace",
  Enter: "Entrée",
  Escape: "Échap",
  Backspace: "Retour",
  PageUp: "Page haut",
  PageDown: "Page bas",
  ShiftLeft: "Maj gauche",
  ShiftRight: "Maj droite",
  ControlLeft: "Ctrl gauche",
  ControlRight: "Ctrl droite",
  AltLeft: "Alt gauche",
  AltRight: "Alt droite",
};

export function compactControlKeyLabel(code: string): string {
  const specialLabel = COMPACT_CONTROL_KEY_LABELS[code];
  if (specialLabel) return specialLabel;
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Pavé ${code.slice(6)}`;
  return code;
}

export function controlActionShortcut(
  actionId: ControlActionId,
  bindings: ControlBindings = DEFAULT_CONTROL_BINDINGS,
): string {
  const codes = bindings[actionId] ?? DEFAULT_CONTROL_BINDINGS[actionId];
  return codes.map(compactControlKeyLabel).join(" / ");
}
