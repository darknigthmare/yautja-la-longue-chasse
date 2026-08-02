/**
 * Pure keyboard-binding model shared by every playable surface.
 *
 * The module deliberately depends on neither React nor browser globals so a
 * settings screen, save migration, or Node test can use the same rules.
 */

export const CONTROL_BINDING_SCHEMA_VERSION = 1 as const;

export const CONTROL_CONTEXTS = [
  "hunt",
  "galaxy",
  "shipHub",
  "training",
  "workshop",
] as const;

export type ControlContextId = (typeof CONTROL_CONTEXTS)[number];
export type ControlActionBehavior = "hold" | "press";

export interface ControlActionDefinition {
  readonly id: string;
  readonly context: ControlContextId;
  readonly behavior: ControlActionBehavior;
  readonly label: string;
}

export const CONTROL_ACTION_DEFINITIONS = [
  { id: "hunt.moveLeft", context: "hunt", behavior: "hold", label: "Se déplacer à gauche" },
  { id: "hunt.moveRight", context: "hunt", behavior: "hold", label: "Se déplacer à droite" },
  { id: "hunt.moveUp", context: "hunt", behavior: "hold", label: "Se déplacer vers le haut" },
  { id: "hunt.moveDown", context: "hunt", behavior: "hold", label: "Se déplacer vers le bas" },
  { id: "hunt.jump", context: "hunt", behavior: "press", label: "Sauter" },
  { id: "hunt.melee", context: "hunt", behavior: "press", label: "Attaque de mêlée" },
  { id: "hunt.weaponPrimary", context: "hunt", behavior: "press", label: "Utiliser l’arme" },
  { id: "hunt.selectWeaponOne", context: "hunt", behavior: "press", label: "Sélectionner l’arme 1" },
  { id: "hunt.selectWeaponTwo", context: "hunt", behavior: "press", label: "Sélectionner l’arme 2" },
  { id: "hunt.nextWeapon", context: "hunt", behavior: "press", label: "Arme suivante" },
  { id: "hunt.aim", context: "hunt", behavior: "hold", label: "Viser" },
  { id: "hunt.toggleMask", context: "hunt", behavior: "press", label: "Activer le biomask" },
  { id: "hunt.scan", context: "hunt", behavior: "press", label: "Scanner" },
  { id: "hunt.toggleCloak", context: "hunt", behavior: "press", label: "Activer le camouflage" },
  { id: "hunt.heal", context: "hunt", behavior: "press", label: "Utiliser le medicomp" },
  { id: "hunt.useGearOne", context: "hunt", behavior: "press", label: "Utiliser l’équipement 1" },
  { id: "hunt.useGearTwo", context: "hunt", behavior: "press", label: "Utiliser l’équipement 2" },
  { id: "hunt.interact", context: "hunt", behavior: "press", label: "Interagir" },
  { id: "hunt.pause", context: "hunt", behavior: "press", label: "Pause" },

  { id: "galaxy.flyLeft", context: "galaxy", behavior: "hold", label: "Piloter à gauche" },
  { id: "galaxy.flyRight", context: "galaxy", behavior: "hold", label: "Piloter à droite" },
  { id: "galaxy.flyUp", context: "galaxy", behavior: "hold", label: "Piloter vers le haut" },
  { id: "galaxy.flyDown", context: "galaxy", behavior: "hold", label: "Piloter vers le bas" },
  { id: "galaxy.previousTarget", context: "galaxy", behavior: "press", label: "Cible précédente" },
  { id: "galaxy.nextTarget", context: "galaxy", behavior: "press", label: "Cible suivante" },
  { id: "galaxy.activate", context: "galaxy", behavior: "press", label: "Tracer ou entrer" },
  { id: "galaxy.back", context: "galaxy", behavior: "press", label: "Revenir en arrière" },
  { id: "galaxy.returnToGalaxy", context: "galaxy", behavior: "press", label: "Retourner à la galaxie" },

  { id: "shipHub.previousRoom", context: "shipHub", behavior: "press", label: "Salle précédente" },
  { id: "shipHub.nextRoom", context: "shipHub", behavior: "press", label: "Salle suivante" },
  { id: "shipHub.previousAction", context: "shipHub", behavior: "press", label: "Action précédente" },
  { id: "shipHub.nextAction", context: "shipHub", behavior: "press", label: "Action suivante" },
  { id: "shipHub.activate", context: "shipHub", behavior: "press", label: "Valider l’action" },
  { id: "shipHub.returnToBridge", context: "shipHub", behavior: "press", label: "Retourner à la passerelle" },
  { id: "shipHub.firstRoom", context: "shipHub", behavior: "press", label: "Première salle" },
  { id: "shipHub.lastRoom", context: "shipHub", behavior: "press", label: "Dernière salle" },

  { id: "training.left", context: "training", behavior: "press", label: "Signal gauche" },
  { id: "training.right", context: "training", behavior: "press", label: "Signal droit" },
  { id: "training.primary", context: "training", behavior: "press", label: "Signal principal / démarrer" },
  { id: "training.secondary", context: "training", behavior: "press", label: "Signal secondaire" },
  { id: "training.cancel", context: "training", behavior: "press", label: "Abandonner l’épreuve" },

  { id: "workshop.left", context: "workshop", behavior: "press", label: "Geste gauche" },
  { id: "workshop.up", context: "workshop", behavior: "press", label: "Geste haut" },
  { id: "workshop.down", context: "workshop", behavior: "press", label: "Geste bas" },
  { id: "workshop.right", context: "workshop", behavior: "press", label: "Geste droit" },
  { id: "workshop.confirm", context: "workshop", behavior: "press", label: "Valider / démarrer" },
  { id: "workshop.restart", context: "workshop", behavior: "press", label: "Recommencer" },
  { id: "workshop.cancel", context: "workshop", behavior: "press", label: "Quitter l’atelier" },
] as const satisfies readonly ControlActionDefinition[];

export type ControlActionId =
  (typeof CONTROL_ACTION_DEFINITIONS)[number]["id"];

export const CONTROL_ACTION_IDS = Object.freeze(
  CONTROL_ACTION_DEFINITIONS.map((definition) => definition.id),
) as readonly ControlActionId[];

export type ControlKeyCode = string;
export type ControlBindings = Readonly<
  Record<ControlActionId, readonly ControlKeyCode[]>
>;

export type ControlBindingsInput = Partial<
  Record<ControlActionId, string | readonly string[]>
>;

const LETTER_CODES = Array.from(
  { length: 26 },
  (_, index) => `Key${String.fromCharCode(65 + index)}`,
);
const DIGIT_CODES = Array.from(
  { length: 10 },
  (_, index) => `Digit${index}`,
);
const NUMPAD_DIGIT_CODES = Array.from(
  { length: 10 },
  (_, index) => `Numpad${index}`,
);
const FUNCTION_CODES = Array.from(
  { length: 24 },
  (_, index) => `F${index + 1}`,
);

export const SUPPORTED_CONTROL_KEY_CODES = Object.freeze([
  ...LETTER_CODES,
  ...DIGIT_CODES,
  ...NUMPAD_DIGIT_CODES,
  ...FUNCTION_CODES,
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "Enter",
  "Escape",
  "Backspace",
  "Delete",
  "Insert",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "CapsLock",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "ContextMenu",
  "PrintScreen",
  "ScrollLock",
  "Pause",
  "NumLock",
  "Backquote",
  "Minus",
  "Equal",
  "BracketLeft",
  "BracketRight",
  "Backslash",
  "Semicolon",
  "Quote",
  "Comma",
  "Period",
  "Slash",
  "IntlBackslash",
  "IntlRo",
  "IntlYen",
  "NumpadMultiply",
  "NumpadAdd",
  "NumpadSubtract",
  "NumpadDecimal",
  "NumpadDivide",
  "NumpadEnter",
  "NumpadEqual",
  "NumpadComma",
]) as readonly ControlKeyCode[];

const SUPPORTED_CODE_BY_LOWERCASE = new Map(
  SUPPORTED_CONTROL_KEY_CODES.map((code) => [code.toLowerCase(), code]),
);

const KEY_CODE_ALIASES: Readonly<Record<string, ControlKeyCode>> = {
  " ": "Space",
  space: "Space",
  spacebar: "Space",
  esc: "Escape",
  return: "Enter",
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  shift: "ShiftLeft",
  control: "ControlLeft",
  ctrl: "ControlLeft",
  alt: "AltLeft",
  meta: "MetaLeft",
};

const ACTION_ID_SET = new Set<string>(CONTROL_ACTION_IDS);
const CONTEXT_ID_SET = new Set<string>(CONTROL_CONTEXTS);
const ACTION_DEFINITION_BY_ID = new Map<
  ControlActionId,
  (typeof CONTROL_ACTION_DEFINITIONS)[number]
>(
  CONTROL_ACTION_DEFINITIONS.map((definition) => [definition.id, definition]),
);

function freezeBindings(
  source: Record<ControlActionId, readonly string[]>,
): ControlBindings {
  const result = {} as Record<ControlActionId, readonly string[]>;
  for (const actionId of CONTROL_ACTION_IDS) {
    result[actionId] = Object.freeze([...(source[actionId] ?? [])]);
  }
  return Object.freeze(result);
}

export const DEFAULT_CONTROL_BINDINGS = freezeBindings({
  "hunt.moveLeft": ["KeyQ", "ArrowLeft"],
  "hunt.moveRight": ["KeyD", "ArrowRight"],
  "hunt.moveUp": ["KeyZ", "ArrowUp"],
  "hunt.moveDown": ["KeyS", "ArrowDown"],
  "hunt.jump": ["Space"],
  "hunt.melee": ["KeyJ"],
  "hunt.weaponPrimary": ["KeyK"],
  "hunt.selectWeaponOne": ["Digit1", "Numpad1"],
  "hunt.selectWeaponTwo": ["Digit2", "Numpad2"],
  "hunt.nextWeapon": ["KeyR"],
  "hunt.aim": ["ShiftLeft", "ShiftRight"],
  "hunt.toggleMask": ["KeyM"],
  "hunt.scan": ["KeyV"],
  "hunt.toggleCloak": ["KeyC"],
  "hunt.heal": ["KeyH"],
  "hunt.useGearOne": ["Digit3", "Numpad3"],
  "hunt.useGearTwo": ["Digit4", "Numpad4"],
  "hunt.interact": ["KeyE"],
  "hunt.pause": ["Escape"],

  "galaxy.flyLeft": ["KeyQ", "ArrowLeft"],
  "galaxy.flyRight": ["KeyD", "ArrowRight"],
  "galaxy.flyUp": ["KeyZ", "ArrowUp"],
  "galaxy.flyDown": ["KeyS", "ArrowDown"],
  "galaxy.previousTarget": ["PageUp", "KeyR"],
  "galaxy.nextTarget": ["PageDown", "KeyE"],
  "galaxy.activate": ["Enter", "Space"],
  "galaxy.back": ["Escape", "Backspace"],
  "galaxy.returnToGalaxy": ["KeyG"],

  "shipHub.previousRoom": ["KeyQ", "ArrowLeft"],
  "shipHub.nextRoom": ["KeyD", "ArrowRight"],
  "shipHub.previousAction": ["ArrowUp"],
  "shipHub.nextAction": ["ArrowDown"],
  "shipHub.activate": ["Enter", "Space"],
  "shipHub.returnToBridge": ["Escape"],
  "shipHub.firstRoom": ["Home"],
  "shipHub.lastRoom": ["End"],

  "training.left": ["KeyQ", "ArrowLeft"],
  "training.right": ["KeyD", "ArrowRight"],
  "training.primary": ["Space", "KeyJ", "Enter"],
  "training.secondary": ["KeyE", "KeyK", "ShiftLeft", "ShiftRight"],
  "training.cancel": ["Escape"],

  "workshop.left": ["KeyQ", "ArrowLeft"],
  "workshop.up": ["KeyZ", "ArrowUp"],
  "workshop.down": ["KeyS", "ArrowDown"],
  "workshop.right": ["KeyD", "ArrowRight"],
  "workshop.confirm": ["Enter", "Space", "KeyE"],
  "workshop.restart": ["KeyR"],
  "workshop.cancel": ["Escape"],
});

export type ControlBindingIssueSeverity = "error" | "warning";

export type ControlBindingIssueCode =
  | "invalid-root"
  | "unknown-action"
  | "missing-action"
  | "invalid-binding-list"
  | "unsupported-key"
  | "duplicate-key"
  | "empty-binding"
  | "key-conflict"
  | "invalid-json"
  | "unsupported-version";

export interface ControlBindingIssue {
  readonly severity: ControlBindingIssueSeverity;
  readonly code: ControlBindingIssueCode;
  readonly message: string;
  readonly actionId?: ControlActionId;
  readonly keyCode?: ControlKeyCode;
}

export interface ControlBindingConflict {
  readonly context: ControlContextId;
  readonly keyCode: ControlKeyCode;
  readonly actionIds: readonly ControlActionId[];
}

export interface ControlBindingsNormalizationResult {
  readonly bindings: ControlBindings;
  readonly valid: boolean;
  readonly issues: readonly ControlBindingIssue[];
  readonly conflicts: readonly ControlBindingConflict[];
}

function issue(
  severity: ControlBindingIssueSeverity,
  code: ControlBindingIssueCode,
  message: string,
  actionId?: ControlActionId,
  keyCode?: ControlKeyCode,
): ControlBindingIssue {
  return Object.freeze({ severity, code, message, actionId, keyCode });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isControlContextId(
  value: unknown,
): value is ControlContextId {
  return typeof value === "string" && CONTEXT_ID_SET.has(value);
}

export function isControlActionId(value: unknown): value is ControlActionId {
  return typeof value === "string" && ACTION_ID_SET.has(value);
}

export function controlContextForAction(
  actionId: ControlActionId,
): ControlContextId {
  return ACTION_DEFINITION_BY_ID.get(actionId)?.context ?? "hunt";
}

export function normalizeControlKeyCode(value: unknown): ControlKeyCode | null {
  if (typeof value !== "string") return null;
  if (value === " ") return "Space";
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const lowercase = trimmed.toLowerCase();
  const alias = KEY_CODE_ALIASES[lowercase];
  if (alias) return alias;
  if (/^[a-z]$/i.test(trimmed)) return `Key${trimmed.toUpperCase()}`;
  if (/^[0-9]$/.test(trimmed)) return `Digit${trimmed}`;
  return SUPPORTED_CODE_BY_LOWERCASE.get(lowercase) ?? null;
}

function normalizeBindingValue(
  actionId: ControlActionId,
  value: unknown,
  issues: ControlBindingIssue[],
): readonly ControlKeyCode[] {
  const rawCodes = typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value
      : null;
  if (!rawCodes) {
    issues.push(issue(
      "error",
      "invalid-binding-list",
      `La configuration de ${actionId} doit être une touche ou une liste de touches.`,
      actionId,
    ));
    return [];
  }

  const codes: ControlKeyCode[] = [];
  const seen = new Set<string>();
  for (const rawCode of rawCodes) {
    const code = normalizeControlKeyCode(rawCode);
    if (!code) {
      issues.push(issue(
        "error",
        "unsupported-key",
        `La touche « ${String(rawCode)} » n’est pas prise en charge.`,
        actionId,
      ));
      continue;
    }
    if (seen.has(code)) {
      issues.push(issue(
        "warning",
        "duplicate-key",
        `La touche ${code} est répétée pour ${actionId}.`,
        actionId,
        code,
      ));
      continue;
    }
    seen.add(code);
    codes.push(code);
  }
  return Object.freeze(codes);
}

function conflictsForBindings(
  bindings: ControlBindings,
): readonly ControlBindingConflict[] {
  const conflicts: ControlBindingConflict[] = [];
  for (const context of CONTROL_CONTEXTS) {
    const actionsByCode = new Map<ControlKeyCode, ControlActionId[]>();
    for (const definition of CONTROL_ACTION_DEFINITIONS) {
      if (definition.context !== context) continue;
      for (const keyCode of bindings[definition.id]) {
        const actions = actionsByCode.get(keyCode) ?? [];
        actions.push(definition.id);
        actionsByCode.set(keyCode, actions);
      }
    }
    for (const [keyCode, actionIds] of actionsByCode) {
      if (actionIds.length < 2) continue;
      conflicts.push(Object.freeze({
        context,
        keyCode,
        actionIds: Object.freeze([...actionIds]),
      }));
    }
  }
  return Object.freeze(conflicts);
}

export function normalizeControlBindings(
  input: unknown = undefined,
): ControlBindingsNormalizationResult {
  if (input === undefined || input === null) {
    return Object.freeze({
      bindings: DEFAULT_CONTROL_BINDINGS,
      valid: true,
      issues: Object.freeze([]),
      conflicts: Object.freeze([]),
    });
  }

  const issues: ControlBindingIssue[] = [];
  const source = isRecord(input) ? input : null;
  if (!source) {
    issues.push(issue(
      "error",
      "invalid-root",
      "La configuration des commandes doit être un objet.",
    ));
  }

  if (source) {
    for (const key of Object.keys(source)) {
      if (!isControlActionId(key)) {
        issues.push(issue(
          "warning",
          "unknown-action",
          `L’action inconnue « ${key} » a été ignorée.`,
        ));
      }
    }
  }

  const normalized = {} as Record<ControlActionId, readonly string[]>;
  for (const actionId of CONTROL_ACTION_IDS) {
    if (!source || !Object.prototype.hasOwnProperty.call(source, actionId)) {
      normalized[actionId] = DEFAULT_CONTROL_BINDINGS[actionId];
      if (source) {
        issues.push(issue(
          "warning",
          "missing-action",
          `La commande ${actionId} a été restaurée par défaut.`,
          actionId,
        ));
      }
      continue;
    }
    const codes = normalizeBindingValue(actionId, source[actionId], issues);
    if (codes.length === 0) {
      issues.push(issue(
        "error",
        "empty-binding",
        `La commande ${actionId} doit conserver au moins une touche.`,
        actionId,
      ));
      normalized[actionId] = DEFAULT_CONTROL_BINDINGS[actionId];
    } else {
      normalized[actionId] = codes;
    }
  }

  const bindings = freezeBindings(normalized);
  const conflicts = conflictsForBindings(bindings);
  for (const conflict of conflicts) {
    issues.push(issue(
      "error",
      "key-conflict",
      `${conflict.keyCode} est attribuée à plusieurs actions du contexte ${conflict.context}.`,
      conflict.actionIds[0],
      conflict.keyCode,
    ));
  }

  const frozenIssues = Object.freeze(issues);
  return Object.freeze({
    bindings,
    valid: !issues.some((entry) => entry.severity === "error"),
    issues: frozenIssues,
    conflicts,
  });
}

export function validateControlBindings(
  input: unknown,
): Omit<ControlBindingsNormalizationResult, "bindings"> {
  const result = normalizeControlBindings(input);
  return Object.freeze({
    valid: result.valid,
    issues: result.issues,
    conflicts: result.conflicts,
  });
}

export function findControlBindingConflicts(
  input: unknown,
): readonly ControlBindingConflict[] {
  return normalizeControlBindings(input).conflicts;
}

export interface KeyboardInputLike {
  readonly code?: unknown;
  readonly key?: unknown;
  readonly location?: unknown;
}

export function controlKeyCodeFromInput(
  input: KeyboardInputLike | string,
): ControlKeyCode | null {
  if (typeof input === "string") return normalizeControlKeyCode(input);
  const code = normalizeControlKeyCode(input.code);
  if (code && input.code !== "Unidentified") return code;

  if (typeof input.key === "string") {
    const key = input.key.toLowerCase();
    const right = input.location === 2;
    if (key === "shift") return right ? "ShiftRight" : "ShiftLeft";
    if (key === "control") return right ? "ControlRight" : "ControlLeft";
    if (key === "alt") return right ? "AltRight" : "AltLeft";
    if (key === "meta") return right ? "MetaRight" : "MetaLeft";
  }
  return normalizeControlKeyCode(input.key);
}

export function matchesControlAction(
  actionId: ControlActionId,
  input: KeyboardInputLike | string,
  bindings: ControlBindings = DEFAULT_CONTROL_BINDINGS,
): boolean {
  const keyCode = controlKeyCodeFromInput(input);
  return keyCode !== null &&
    (bindings[actionId] ?? DEFAULT_CONTROL_BINDINGS[actionId]).includes(keyCode);
}

export function matchingControlActions(
  context: ControlContextId,
  input: KeyboardInputLike | string,
  bindings: ControlBindings = DEFAULT_CONTROL_BINDINGS,
): readonly ControlActionId[] {
  const keyCode = controlKeyCodeFromInput(input);
  if (!keyCode) return Object.freeze([]);
  return Object.freeze(
    CONTROL_ACTION_DEFINITIONS
      .filter((definition) =>
        definition.context === context && bindings[definition.id].includes(keyCode)
      )
      .map((definition) => definition.id),
  );
}

export interface ControlBindingEntry {
  readonly actionId: ControlActionId;
  readonly behavior: ControlActionBehavior;
  readonly label: string;
  readonly keyCodes: readonly ControlKeyCode[];
}

export function controlBindingsForContext(
  context: ControlContextId,
  bindings: ControlBindings = DEFAULT_CONTROL_BINDINGS,
): readonly ControlBindingEntry[] {
  return Object.freeze(
    CONTROL_ACTION_DEFINITIONS
      .filter((definition) => definition.context === context)
      .map((definition) => Object.freeze({
        actionId: definition.id,
        behavior: definition.behavior,
        label: definition.label,
        keyCodes: bindings[definition.id],
      })),
  );
}

export type ControlBindingConflictPolicy = "reject" | "replace";

export interface RebindControlActionOptions {
  readonly conflictPolicy?: ControlBindingConflictPolicy;
}

export interface RebindControlActionResult {
  readonly accepted: boolean;
  readonly bindings: ControlBindings;
  readonly issues: readonly ControlBindingIssue[];
  readonly conflicts: readonly ControlBindingConflict[];
}

export function rebindControlAction(
  current: unknown,
  actionId: ControlActionId,
  requestedCodes: string | readonly string[],
  options: RebindControlActionOptions = {},
): RebindControlActionResult {
  const base = normalizeControlBindings(current);
  if (!base.valid) {
    return Object.freeze({
      accepted: false,
      bindings: base.bindings,
      issues: base.issues,
      conflicts: base.conflicts,
    });
  }

  if (!isControlActionId(actionId)) {
    const issues = Object.freeze([
      issue("error", "unknown-action", `L’action « ${String(actionId)} » est inconnue.`),
    ]);
    return Object.freeze({
      accepted: false,
      bindings: base.bindings,
      issues,
      conflicts: Object.freeze([]),
    });
  }

  const issues: ControlBindingIssue[] = [];
  const codes = normalizeBindingValue(actionId, requestedCodes, issues);
  if (codes.length === 0) {
    issues.push(issue(
      "error",
      "empty-binding",
      `La commande ${actionId} doit conserver au moins une touche.`,
      actionId,
    ));
  }
  if (issues.some((entry) => entry.severity === "error")) {
    return Object.freeze({
      accepted: false,
      bindings: base.bindings,
      issues: Object.freeze(issues),
      conflicts: Object.freeze([]),
    });
  }

  const mutable = {} as Record<ControlActionId, readonly string[]>;
  for (const id of CONTROL_ACTION_IDS) mutable[id] = base.bindings[id];
  mutable[actionId] = codes;
  let candidate = freezeBindings(mutable);
  let conflicts: readonly ControlBindingConflict[] = conflictsForBindings(candidate).filter((conflict) =>
    conflict.actionIds.includes(actionId)
  );

  if (conflicts.length > 0 && options.conflictPolicy !== "replace") {
    for (const conflict of conflicts) {
      issues.push(issue(
        "error",
        "key-conflict",
        `${conflict.keyCode} est déjà utilisée dans ${conflict.context}.`,
        actionId,
        conflict.keyCode,
      ));
    }
    return Object.freeze({
      accepted: false,
      bindings: base.bindings,
      issues: Object.freeze(issues),
      conflicts: Object.freeze(conflicts),
    });
  }

  if (conflicts.length > 0) {
    const context = controlContextForAction(actionId);
    const requested = new Set(codes);
    for (const definition of CONTROL_ACTION_DEFINITIONS) {
      if (definition.context !== context || definition.id === actionId) continue;
      const remaining = mutable[definition.id].filter((code) => !requested.has(code));
      if (remaining.length === 0) {
        issues.push(issue(
          "error",
          "empty-binding",
          `Le remplacement laisserait ${definition.id} sans touche.`,
          definition.id,
        ));
        return Object.freeze({
          accepted: false,
          bindings: base.bindings,
          issues: Object.freeze(issues),
          conflicts: Object.freeze(conflicts),
        });
      }
      mutable[definition.id] = remaining;
    }
    candidate = freezeBindings(mutable);
    conflicts = conflictsForBindings(candidate);
  }

  return Object.freeze({
    accepted: true,
    bindings: candidate,
    issues: Object.freeze(issues),
    conflicts: Object.freeze(conflicts),
  });
}

export interface SerializedControlBindingsV1 {
  readonly version: typeof CONTROL_BINDING_SCHEMA_VERSION;
  readonly bindings: Readonly<Record<ControlActionId, readonly string[]>>;
}

export class ControlBindingsSerializationError extends Error {
  readonly issues: readonly ControlBindingIssue[];

  constructor(issues: readonly ControlBindingIssue[]) {
    super("La configuration des commandes est invalide.");
    this.name = "ControlBindingsSerializationError";
    this.issues = issues;
  }
}

export function serializeControlBindings(
  input: unknown,
): SerializedControlBindingsV1 {
  const normalized = normalizeControlBindings(input);
  if (!normalized.valid) {
    throw new ControlBindingsSerializationError(normalized.issues);
  }
  const bindings = {} as Record<ControlActionId, readonly string[]>;
  for (const actionId of CONTROL_ACTION_IDS) {
    bindings[actionId] = Object.freeze([...normalized.bindings[actionId]]);
  }
  return Object.freeze({
    version: CONTROL_BINDING_SCHEMA_VERSION,
    bindings: Object.freeze(bindings),
  });
}

export interface DeserializeControlBindingsResult {
  readonly bindings: ControlBindings;
  readonly restored: boolean;
  readonly issues: readonly ControlBindingIssue[];
}

function failedDeserialization(
  issueEntry: ControlBindingIssue | readonly ControlBindingIssue[],
): DeserializeControlBindingsResult {
  return Object.freeze({
    bindings: DEFAULT_CONTROL_BINDINGS,
    restored: false,
    issues: Object.freeze(
      Array.isArray(issueEntry) ? [...issueEntry] : [issueEntry],
    ),
  });
}

export function deserializeControlBindings(
  stored: unknown,
): DeserializeControlBindingsResult {
  let decoded = stored;
  if (typeof stored === "string") {
    try {
      decoded = JSON.parse(stored) as unknown;
    } catch {
      return failedDeserialization(issue(
        "error",
        "invalid-json",
        "Les commandes enregistrées ne contiennent pas de JSON valide.",
      ));
    }
  }
  if (!isRecord(decoded)) {
    return failedDeserialization(issue(
      "error",
      "invalid-root",
      "Les commandes enregistrées doivent être un objet versionné.",
    ));
  }
  if (decoded.version !== CONTROL_BINDING_SCHEMA_VERSION) {
    return failedDeserialization(issue(
      "error",
      "unsupported-version",
      `La version ${String(decoded.version)} des commandes n’est pas prise en charge.`,
    ));
  }
  const normalized = normalizeControlBindings(decoded.bindings);
  if (!normalized.valid) {
    return failedDeserialization(normalized.issues);
  }
  return Object.freeze({
    bindings: normalized.bindings,
    restored: true,
    issues: normalized.issues,
  });
}
