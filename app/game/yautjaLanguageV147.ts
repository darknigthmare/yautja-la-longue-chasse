/**
 * V147 Yautja language glossary (campaign bible, "Langue yautja").
 *
 * The user's decision: use the confirmed canon words, with an in-game glossary
 * that can be read in the codex. This module only holds what the bible writes:
 * every `word`, `meaning` and `usage` string is the exact cell text of the
 * bible table (Markdown emphasis included), and no word is added. The bible
 * does not plan a progressive unlock for the glossary, so every entry is
 * visible from the start and nothing is stored in the save.
 *
 * Reference: docs/campagne/BIBLE_DE_CAMPAGNE.md, branch
 * claude/bible-de-campagne, commit 723c97b (verbatim extract kept in
 * tests/fixtures/bible-langue-yautja-723c97b.md).
 */

export const YAUTJA_LANGUAGE_BIBLE_REF_V147 = Object.freeze({
  file: "docs/campagne/BIBLE_DE_CAMPAGNE.md",
  branch: "claude/bible-de-campagne",
  commit: "723c97b",
  section: "### Langue yautja",
});

/** Status as the bible writes it: canon words, or invented words marked « proposé ». */
export type YautjaWordStatusV147 = "canon" | "proposé";

export interface YautjaWordSourceV147 {
  /** Source label exactly as the bible gives it. */
  readonly label: string;
  readonly url: string | null;
  /** Work named in the bible cell, e.g. *Badlands*; null when none is named. */
  readonly work: string | null;
}

export interface YautjaWordV147 {
  readonly id: string;
  /** "Mot" cell, verbatim. Several forms are kept together as the bible writes them. */
  readonly word: string;
  /** "Sens" cell, verbatim. */
  readonly meaning: string;
  /** "Usage dans le jeu" cell, verbatim; null when the bible gives no use. */
  readonly usage: string | null;
  readonly status: YautjaWordStatusV147;
  readonly source: YautjaWordSourceV147;
  /** Bible part the entry comes from. */
  readonly origin: "Extrait du vocabulaire canon à utiliser" | "Passe de vérification (6 novembre 2026)";
  /** Other bible passages about the same word, quoted verbatim. */
  readonly bibleNotes: readonly { readonly section: string; readonly quote: string }[];
}

const AVP_DICTIONARY = "https://www.avpcentral.com/yautja-dictionary-vocabulary-of-predators";
const dictionary = (work: string | null = null): YautjaWordSourceV147 =>
  Object.freeze({ label: "dictionnaire yautja, AvP Central", url: AVP_DICTIONARY, work });

const word = (
  id: string, text: string, meaning: string, usage: string | null,
  options: { work?: string; origin?: YautjaWordV147["origin"]; notes?: YautjaWordV147["bibleNotes"] } = {},
): YautjaWordV147 => Object.freeze({
  id, word: text, meaning, usage, status: "canon",
  source: dictionary(options.work ?? null),
  origin: options.origin ?? "Extrait du vocabulaire canon à utiliser",
  bibleNotes: Object.freeze(options.notes ?? []),
});

/** Bible table "Extrait du vocabulaire canon à utiliser", in its order, then the
 * canon word named by the verification pass (Kaail). */
export const YAUTJA_WORDS_V147: readonly YautjaWordV147[] = Object.freeze([
  word("kainde-amedha", "Kainde Amedha", "« viande dure », Xénomorphe", "toutes les ruches"),
  word("kainde-amedha-chiva", "Kainde Amedha Chiva", "épreuve de la viande dure, chasse de passage", "la pyramide (L-04)"),
  word("pyode-amedha-ooman", "Pyode Amedha / Ooman", "« viande molle » / humain", "proies humaines"),
  word("ic-jit", "Ic'jit", "Bad Blood, hors-la-loi", "voie Bad Blood"),
  word("yin-tekai", "Yin'tekai, Thar'n-dha s'yin'tekai", "honneur ; « force et honneur »", "jauge d'honneur, salut"),
  word("thwei", "Thwei", "sang", "marque Blooded"),
  word("kehrite", "Kehrite", "aire de combat ou d'entraînement", "Cour des Maîtres, The Pit"),
  word("cetanu", "Cetanu", "dieu de la mort, le Black Warrior", "Black God, sacrifice", {
    notes: [{
      section: "Échelle des rangs — Repères canon",
      quote: "Black Warrior (*Cetanu*, « Destructeur ») : dieu de la chasse, de la mort et de l'honneur, qui « réclame » les morts honorables (*Prey*, *War*, AVP 2010) ; le canon ne prévoit pas qu'un Yautja le devienne.",
    }],
  }),
  word("u-darahje", "U'darahje", "abomination", "l'Ancienne déchue"),
  word("paya", "Paya", "dieu, guerrier conquérant", "prières, crédits"),
  word("mei-hswei-mei-jahdi", "Mei'hswei / Mei-jahdi", "frère / sœur", "dialogues du pack"),
  word("gkaun-yte-n-dhi-ja", "Gkaun-yte / N'dhi-ja", "bonjour / au revoir", "salutations"),
  word("yauhwaq-yi-ai", "Yauhwaq yi'ai", "tueur de tueurs (*Badlands*)", "titre de légende (héritage)", { work: "Badlands" }),
  word("ngu-djei-chish", "Ngu djei chish", "« je ne suis la proie de personne » (*Badlands*)", "phrase du départ O1", { work: "Badlands" }),
  word("kaail", "Kaail", "rage", null, {
    origin: "Passe de vérification (6 novembre 2026)",
    notes: [{
      section: "Langue yautja — Passe de vérification",
      quote: "Dans le dépôt, le système `system-kaail` porte un mot canon (*Kaail*, « rage ») : compatible comme nom de lieu, à garder.",
    }],
  }),
]);

export const YAUTJA_WORD_BY_ID_V147: Readonly<Record<string, YautjaWordV147>> =
  Object.freeze(Object.fromEntries(YAUTJA_WORDS_V147.map(entry => [entry.id, entry])));

/** Bible decision and rules, verbatim, shown at the top of the glossary. */
export const YAUTJA_LANGUAGE_DECISION_V147 =
  "mots canon, complétés par un glossaire inventé et cohérent ; clics et voix, sous-titres en français ; glossaire consultable dans le codex du jeu.";

export const YAUTJA_LANGUAGE_RULES_V147: readonly string[] = Object.freeze([
  "un mot canon existe pour une notion : on l'emploie (par exemple *Ic'jit* pour Bad Blood, *Chiva* pour une épreuve, *Kehrite* pour l'aire d'entraînement) ;",
  "un mot inventé ne doit jamais reprendre un mot canon avec un autre sens ; il est marqué « proposé » dans le glossaire ;",
  "deux couches de canon : le vocabulaire classique des romans et de l'univers étendu, et la langue de *Predator: Badlands* (2025), dont plusieurs mots ont été confirmés par Britton Watkins (d'après AvP Central) ; la seconde a une grammaire (pronoms, négation) que le glossaire suit.",
]);

/** Glossary entries are all visible: the bible plans no progressive unlock. */
export function visibleYautjaWordsV147(): readonly YautjaWordV147[] {
  return YAUTJA_WORDS_V147;
}

/** Removes the bible's Markdown emphasis and code marks for on-screen text. */
export function plainBibleTextV147(text: string): string {
  return text.replace(/[*`]/g, "");
}

/** Case- and accent-insensitive search over word, meaning and usage. */
export function searchYautjaWordsV147(query: string, words: readonly YautjaWordV147[] = YAUTJA_WORDS_V147): YautjaWordV147[] {
  const fold = (value: string) => plainBibleTextV147(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const needle = fold(query.trim());
  if (!needle) return [...words];
  return words.filter(entry => [entry.word, entry.meaning, entry.usage ?? ""].some(value => fold(value).includes(needle)));
}

/** Rejects an invented word that would reuse a canon word (bible rule 2). */
export function inventedWordConflictV147(candidate: string): YautjaWordV147 | null {
  const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const target = fold(candidate);
  return YAUTJA_WORDS_V147.find(entry => entry.status === "canon" &&
    entry.word.split(/\s*[/,]\s*/).some(form => fold(form) === target)) ?? null;
}
