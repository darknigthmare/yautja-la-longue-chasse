type Evidence = "creator" | "screen-transcription" | "classic-reference";

interface LexicalSource {
  readonly evidence: Evidence;
  readonly label: string;
  readonly url: string;
}

const WATKINS = {
  evidence: "creator",
  label: "Britton Watkins · entretien au Los Angeles Times",
  url: "https://www.latimes.com/entertainment-arts/movies/story/2025-11-10/predator-badlands-yautja-alien-language-dan-trachtenberg-britton-watkins",
} as const satisfies LexicalSource;

const SCREEN = {
  evidence: "screen-transcription",
  label: "AvP Central · transcriptions des répliques des films",
  url: "https://www.avpcentral.com/yautja-dictionary-vocabulary-of-predators",
} as const satisfies LexicalSource;

const CLASSIC = {
  evidence: "classic-reference",
  label: "AvP Central · vocabulaire classique repris par la Bible",
  url: "https://www.avpcentral.com/yautja-dictionary-vocabulary-of-predators",
} as const satisfies LexicalSource;

interface LexicalEntry {
  readonly form: string;
  readonly french: string;
  readonly source: LexicalSource;
}

export const YAUTJA_LEXICON_V67 = {
  chish: { form: "chish", french: "je, moi", source: WATKINS },
  ngai: { form: "ngai", french: "non", source: WATKINS },
  dau: { form: "dau", french: "tu ou vous, avec respect", source: WATKINS },
  kai: { form: "kai", french: "tu, adressé à un proche", source: WATKINS },
  wul: { form: "wul", french: "tu, adressé avec mépris", source: WATKINS },
  "ngu-djei-chish": { form: "Ngu djei chish", french: "Je ne suis la proie de personne", source: SCREEN },
  "yauhwaq-yi-ai": { form: "Yauhwaq yi'ai", french: "Tueur de tueurs", source: SCREEN },
  "kainde-amedha": { form: "Kainde Amedha", french: "Xénomorphe, littéralement viande dure", source: CLASSIC },
  "kainde-amedha-chiva": { form: "Kainde Amedha Chiva", french: "Épreuve de la viande dure", source: CLASSIC },
  chiva: { form: "Chiva", french: "Épreuve ou rite de passage", source: CLASSIC },
  kehrite: { form: "Kehrite", french: "Aire de combat ou d’entraînement", source: CLASSIC },
  "ic-jit": { form: "Ic'jit", french: "Bad Blood, hors-la-loi yautja", source: CLASSIC },
  "yin-tekai": { form: "Yin'tekai", french: "Honneur", source: CLASSIC },
  thwei: { form: "Thwei", french: "Sang", source: CLASSIC },
} as const satisfies Record<string, LexicalEntry>;

export type YautjaLexemeV67 = keyof typeof YAUTJA_LEXICON_V67;

export const YAUTJA_EVIDENCE_LABELS_V67: Readonly<Record<Evidence, string>> = {
  creator: "Badlands · expliqué par Britton Watkins",
  "screen-transcription": "Badlands · transcription recensée",
  "classic-reference": "Univers étendu · lexique classique",
};

function fold(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’‘ʼ]/gu, "'").toLowerCase();
}

export function searchYautjaLexiconV67(query: string) {
  const needle = fold(query.trim());
  return Object.entries(YAUTJA_LEXICON_V67).filter(([, entry]) =>
    [entry.form, entry.french, YAUTJA_EVIDENCE_LABELS_V67[entry.source.evidence]].some(value => fold(value).includes(needle)),
  );
}

const FILM_LINES: readonly YautjaLexemeV67[] = ["ngu-djei-chish", "yauhwaq-yi-ai"];
const CLASSIC_MATCHES: readonly [YautjaLexemeV67, RegExp][] = [
  ["kainde-amedha-chiva", /(?<![\p{L}\p{N}_-])epreuve de la viande dure(?![\p{L}\p{N}_-])/u],
  ["kainde-amedha", /(?<![\p{L}\p{N}_-])xenomorphes?(?![\p{L}\p{N}_-])/u],
  ["kehrite", /(?<![\p{L}\p{N}_-])(?:aires? d'entrainement|aires? de combat)(?![\p{L}\p{N}_-])/u],
  ["chiva", /(?<![\p{L}\p{N}_-])rites? de passage(?![\p{L}\p{N}_-])/u],
  ["ic-jit", /(?<![\p{L}\p{N}_-])bad bloods?(?![\p{L}\p{N}_-])/u],
  ["yin-tekai", /(?<![\p{L}\p{N}_-])honneur(?![\p{L}\p{N}_-])/u],
  ["thwei", /(?<![\p{L}\p{N}_-])sang(?![\p{L}\p{N}_-])/u],
];

/** Returns an exact recorded line or lexical notes alongside the original French. */
export function readYautjaV67(text: string): { kind: "line" | "terms"; ids: readonly YautjaLexemeV67[] } {
  const folded = fold(text);
  const sentence = folded.trim().replace(/^[«“"' ]+|[.!?…»”"' ]+$/gu, "").replace(/\s+/gu, " ");
  const line = FILM_LINES.find(id => sentence === fold(YAUTJA_LEXICON_V67[id].french));
  if (line) return { kind: "line", ids: [line] };
  return { kind: "terms", ids: CLASSIC_MATCHES.filter(([, pattern]) => pattern.test(folded)).map(([id]) => id) };
}
