import type { HunterLorePresetId } from "./hunterLore";

export const CATALOGUE_SOURCE_WORKBOOK = Object.freeze({
  fileName: "catalogue_yautja_tous_medias.xlsx",
  sheet: "Index maître",
  byteLength: 62_111,
  sha256: "6b696cabe94f0821f4bc02a1587ca5782789ffcc58ad52339626cc173515e68e",
  archivedPath:
    "art-source/v6/catalogue/catalogue_yautja_tous_medias.xlsx",
});

const EXISTING_HUNTER_PRESET_IDS = [
  "jungle-hunter",
  "city-hunter",
  "greyback",
  "boar",
  "shaman",
  "lost-borg",
  "snake",
  "warrior",
  "guardian",
  "lost-scout",
  "lost-stalker",
  "scar",
  "celtic",
  "chopper",
  "avp-elder",
  "ancient-warrior",
  "temple-guard",
  "youngblood",
  "wolf",
  "bull",
  "bonegrill",
  "classic-captive",
  "berserker",
  "falconer",
  "tracker",
  "fugitive",
  "assassin",
  "emissary-one",
  "emissary-two",
  "feral-hunter",
  "kok-jotun",
  "kok-oni",
  "kok-pilot",
  "kok-warlord",
  "kok-captive",
  "kok-arena-guard",
  "dek",
  "kwei",
  "dek-father",
  "scarface",
  "stone-heart",
  "alpha",
  "samurai",
  "valkyrie",
  "cleopatra",
  "bionic",
  "witch",
  "broken-tusk",
  "ahab",
  "big-mama",
  "enforcer",
  "bad-blood-comic",
  "hashori",
] as const satisfies readonly HunterLorePresetId[];

type RawCatalogueRow = readonly [
  sourceRow: number,
  id: string,
  name: string,
  aliases: string,
  typeLabel: string,
  mediaLabel: string,
  work: string,
  sourceStatus: string,
  canonicalName: string,
  notes: string,
  distinctIdentity: string,
  sourceUrl: string,
  family: string,
];

/**
 * Extraction en lecture seule de « Index maître » dans le classeur archivé
 * ci-dessus. Les identifiants Y-xxx et les libellés
 * bruts sont conservés afin que chaque entrée reste traçable à sa ligne Excel.
 */
const RAW_CATALOGUE_ROWS = [
  [2, "Y-001", "'Aseigan", "", "Individu nommé ou surnommé", "Roman / prose", "Aliens vs. Predator: Prey", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/'Aseigan", "Roman / prose"],
  [3, "Y-002", "A'ni-de", "", "Individu nommé ou surnommé", "Roman / prose", "Aliens vs. Predator: Prey", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/A'ni-de", "Roman / prose"],
  [4, "Y-003", "Adilgashii", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Adilgashii", "Comics"],
  [5, "Y-004", "Ahab", "", "Individu nommé ou surnommé", "Comics", "Fire and Stone / Life and Death", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ahab", "Comics"],
  [6, "Y-005", "Akuma Predator", "", "Concept de fan-film", "Fan-film / concept", "Predator: Akuma (concept / bande-annonce)", "Non officiel / fan-made", "", "Projet/concept de fan-film; statut de diffusion incertain.", "À confirmer", "https://avp.fandom.com/wiki/Akuma_Predator", "Fan-film"],
  [7, "Y-006", "Albino Predator", "", "Individu fan-made puis licencié", "Fan-film • Figurine / jouet", "Batman: Dead End (2003) / NECA", "Fan-made puis licencié", "", "Créé pour Batman: Dead End, puis officiellement licencié par NECA.", "Oui", "https://avp.fandom.com/wiki/Albino_Predator", "Fan-film"],
  [8, "Y-007", "Alien Head Predator", "Serpent Hunter Predator", "Individu nommé ou surnommé", "Jeu vidéo • Figurine / jouet", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Alien_Head_Predator", "Jeu vidéo"],
  [9, "Y-008", "Alpha Predator", "", "Individu de merchandising devenu jouable", "Figurine / jouet • Jeu vidéo", "Predator: Hunting Grounds / NECA", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Alpha_Predator", "Jeu vidéo"],
  [10, "Y-009", "Amazon Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Amazon_Predator", "Jeu vidéo"],
  [11, "Y-010", "Ambush Predator", "", "Individu de merchandising", "Figurine / jouet", "Kenner", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Ambush_Predator", "Figurine / jouet"],
  [12, "Y-011", "Ancient Nuke Carrier", "", "Individu nommé ou surnommé", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ancient_Nuke_Carrier", "Jeu vidéo"],
  [13, "Y-012", "Ancient Predator (Earth)", "", "Individu nommé ou surnommé", "Film / animation", "Alien vs. Predator (2004)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Ancient_Predator_%28Earth%29", "Film / animation"],
  [14, "Y-013", "Ancient Predator (LV-1201)", "", "Individu nommé ou surnommé", "Jeu vidéo", "Aliens versus Predator 2: Primal Hunt (2002)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ancient_Predator_%28LV-1201%29", "Jeu vidéo"],
  [15, "Y-014", "Anubis Predator", "", "Individu jouable", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Anubis_Predator", "Jeu vidéo"],
  [16, "Y-015", "Apex Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Apex_Predator", "Jeu vidéo"],
  [17, "Y-016", "Ar'Wen", "", "Individu nommé ou surnommé", "Roman / prose", "Aliens vs. Predators: Rift War", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ar'Wen", "Roman / prose"],
  [18, "Y-017", "Assassin Predator", "", "Alias", "Film / animation • Figurine / jouet", "The Predator (2018)", "Alias / doublon", "Upgrade Predator", "", "Alias", "https://avp.fandom.com/wiki/Assassin_Predator", "Film / animation"],
  [19, "Y-018", "Assault Predator", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Assault_Predator", "Univers étendu"],
  [20, "Y-019", "Bad Blood (Gotham City)", "", "Individu nommé ou surnommé", "Comics", "Batman versus Predator II: Bloodmatch", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Bad_Blood_%28Gotham_City%29", "Comics"],
  [21, "Y-020", "Bad Blood (Yautja)", "", "Rang / catégorie culturelle", "Comics • Roman / prose • Jeu vidéo", "Concept récurrent de la franchise", "Rang / classe", "", "Titre/catégorie culturelle, pas un individu.", "Non (rang)", "https://avp.fandom.com/wiki/Bad_Blood_%28Yautja%29", "Jeu vidéo"],
  [22, "Y-021", "Bad Blood Predator", "", "Individu nommé ou surnommé", "Comics", "Predator: Bad Blood", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Bad_Blood_Predator", "Comics"],
  [23, "Y-022", "Bakuub", "", "Individu nommé ou surnommé", "Roman / prose", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Bakuub", "Roman / prose"],
  [24, "Y-023", "Beads", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Beads", "Univers étendu"],
  [25, "Y-024", "Berserker (Game Preserve Planet)", "Mr. Black", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Predators (2010)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Berserker_%28Game_Preserve_Planet%29", "Film / animation"],
  [26, "Y-025", "Berserker (LV-412)", "", "Individu nommé ou surnommé", "Jeu vidéo", "Aliens vs. Predator: Extinction (2003)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Berserker_%28LV-412%29", "Jeu vidéo"],
  [27, "Y-026", "Bet-Karh", "", "Individu nommé ou surnommé", "Comics • Roman / prose", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Bet-Karh", "Comics"],
  [28, "Y-027", "Big Mama", "", "Individu nommé ou surnommé", "Comics", "Aliens vs. Predator: Deadliest of the Species", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Big_Mama", "Comics"],
  [29, "Y-028", "Big Red", "", "Individu nommé ou surnommé", "Figurine / jouet • Fan-film", "Batman: Dead End (2003) / NECA", "Fan-made puis licencié", "", "Créé pour le fan-film Batman: Dead End, puis officiellement licencié en figurine.", "Oui", "https://avp.fandom.com/wiki/Big_Red", "Fan-film"],
  [30, "Y-029", "Bionic Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Bionic_Predator", "Jeu vidéo"],
  [31, "Y-030", "Blazer (title)", "", "Rang / classe", "Jeu vidéo", "Jeux Alien/Predator", "Rang / classe", "", "", "Non (rang)", "https://avp.fandom.com/wiki/Blazer_%28title%29", "Jeu vidéo"],
  [32, "Y-031", "Boar", "", "Individu nommé ou surnommé", "Film / animation • Comics • Roman / prose", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Boar", "Film / animation"],
  [33, "Y-032", "Bogey (Predator)", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Bogey_%28Predator%29", "Univers étendu"],
  [34, "Y-033", "Bone (AVP: Annihilation)", "", "Individu nommé", "Anime inédit", "Aliens vs. Predator: Annihilation (anime inédit)", "Œuvre achevée non diffusée", "", "Nom révélé pour un guerrier maniant des armes en os dans l'anime achevé mais non diffusé.", "Oui", "https://avp.fandom.com/wiki/Bone_%28AVP%3A_Annihilation%29", "Anime inédit"],
  [35, "Y-034", "Bonegrill", "", "Individu nommé ou surnommé", "Film / animation", "Aliens vs. Predator: Requiem (2007)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Bonegrill", "Film / animation"],
  [36, "Y-035", "Borg", "Lost Predator", "Individu nommé ou surnommé", "Film / animation", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Borg", "Film / animation"],
  [37, "Y-036", "Bosu", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Bosu", "Comics"],
  [38, "Y-037", "Brawler", "", "Classe / archétype de jeu", "Jeu vidéo", "Jeux Alien/Predator", "Rang / classe", "", "", "Non (rang)", "https://avp.fandom.com/wiki/Brawler", "Jeu vidéo"],
  [39, "Y-038", "Broken Tusk Predator", "", "Alias / désignation", "Comics • Roman / prose • Figurine / jouet", "Aliens vs. Predator / Aliens vs. Predator: Prey", "Alias / doublon", "Dachande", "", "Alias", "https://avp.fandom.com/wiki/Broken_Tusk_Predator", "Comics"],
  [40, "Y-039", "Brother Boar Predator", "", "Alias de production / figurine", "Film / animation • Figurine / jouet", "Predator 2 / NECA", "Alias / doublon", "Stalker (Lost Tribe)", "", "Alias", "https://avp.fandom.com/wiki/Brother_Boar_Predator", "Film / animation"],
  [41, "Y-040", "Bull (Predator)", "", "Individu nommé ou surnommé", "Film / animation", "Aliens vs. Predator: Requiem (2007)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Bull_%28Predator%29", "Film / animation"],
  [42, "Y-041", "Captive Predator", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Captive_Predator", "Comics"],
  [43, "Y-042", "Captured Hunters", "", "Groupe / collectif", "Jeu vidéo", "Voir la source individuelle", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Captured_Hunters", "Jeu vidéo"],
  [44, "Y-043", "Captured Predator", "", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Predators (2010)", "Alias / doublon", "Crucified Predator", "Même individu que le Crucified/Classic Predator de Predators (2010).", "Alias", "https://avp.fandom.com/wiki/Captured_Predator", "Film / animation"],
  [45, "Y-044", "Celtic", "", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Alien vs. Predator (2004)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Celtic", "Film / animation"],
  [46, "Y-045", "Chopper", "", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Alien vs. Predator (2004)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Chopper", "Film / animation"],
  [47, "Y-046", "Chulonte", "", "Individu nommé ou surnommé", "Roman / prose", "Aliens vs. Predator: Prey", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Chulonte", "Roman / prose"],
  [48, "Y-047", "Ci'tde", "", "Individu nommé ou surnommé", "Roman / prose", "Aliens vs. Predator: Prey", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ci'tde", "Roman / prose"],
  [49, "Y-048", "City Demon Predator", "", "Alias / variante de figurine", "Figurine / jouet", "NECA", "Alias / doublon", "City Hunter", "", "Alias", "https://avp.fandom.com/wiki/City_Demon_Predator", "Figurine / jouet"],
  [50, "Y-049", "City Hunter", "City Demon Predator", "Individu nommé ou surnommé", "Film / animation", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/City_Hunter", "Film / animation"],
  [51, "Y-050", "Clan Leader (LV-797)", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Clan_Leader_%28LV-797%29", "Comics"],
  [52, "Y-051", "Clan Leader (Predator)", "", "Individu nommé ou surnommé", "Figurine / jouet", "Voir la source individuelle", "Création de merchandising licenciée", "", "", "Oui", "https://avp.fandom.com/wiki/Clan_Leader_%28Predator%29", "Figurine / jouet"],
  [53, "Y-052", "Classic Predator (1987)", "", "Alias", "Film / animation • Figurine / jouet", "Predator (1987)", "Alias / doublon", "Jungle Hunter", "", "Alias", "https://avp.fandom.com/wiki/Classic_Predator_%281987%29", "Film / animation"],
  [54, "Y-053", "Classic Predator (2010)", "", "Alias", "Film / animation • Figurine / jouet", "Predators (2010)", "Alias / doublon", "Crucified Predator", "", "Alias", "https://avp.fandom.com/wiki/Classic_Predator_%282010%29", "Film / animation"],
  [55, "Y-054", "Claw", "", "Individu nommé ou surnommé", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Claw", "Jeu vidéo"],
  [56, "Y-055", "Cleopatra", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Cleopatra", "Jeu vidéo"],
  [57, "Y-056", "Comrade", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Comrade", "Univers étendu"],
  [58, "Y-057", "Cracked Tusk Predator", "", "Individu nommé ou surnommé", "Comics • Figurine / jouet", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "Identité Kenner/NECA souvent rapprochée de Broken Tusk, mais conservée séparément car les gammes de jouets l'ont traitée comme un personnage propre.", "Oui", "https://avp.fandom.com/wiki/Cracked_Tusk_Predator", "Comics"],
  [59, "Y-058", "Crucified Predator", "Captured Predator; Classic Predator (2010)", "Individu nommé ou surnommé", "Film / animation • Comics", "Predators (2010)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Crucified_Predator", "Film / animation"],
  [60, "Y-059", "Cyborg Predator (AVP: Annihilation)", "", "Individu anonyme désigné", "Anime inédit", "Aliens vs. Predator: Annihilation (anime inédit)", "Œuvre achevée non diffusée", "", "Membre cyborg du clan de l'anime achevé mais non diffusé; aucun nom propre public connu.", "Oui", "https://avp.fandom.com/wiki/Cyborg_Predator_%28AVP%3A_Annihilation%29", "Anime inédit"],
  [61, "Y-060", "Da-ec'te", "", "Individu nommé ou surnommé", "Roman / prose", "Aliens vs. Predator: Prey", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Da-ec'te", "Roman / prose"],
  [62, "Y-061", "Dachande", "Broken Tusk Predator", "Individu nommé", "Comics • Roman / prose", "Aliens vs. Predator / Aliens vs. Predator: Prey", "Univers étendu / merchandising licencié", "Broken Tusk est son surnom/titre.", "", "Oui", "https://avp.fandom.com/wiki/Dachande", "Comics"],
  [63, "Y-062", "Dachande's Clan", "", "Groupe / clan", "Comics • Roman / prose", "Aliens vs. Predator / Prey", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Dachande's_Clan", "Comics"],
  [64, "Y-063", "Dark", "", "Individu nommé ou surnommé", "Jeu vidéo", "Aliens vs. Predator (2010)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Dark", "Jeu vidéo"],
  [65, "Y-064", "Dark Ages Predator", "", "Individu anonyme désigné", "Fan-film", "Predator: Dark Ages (2015)", "Non officiel / fan-made", "", "Désignation descriptive d'un Yautja anonyme du fan-film.", "Oui", "https://avp.fandom.com/wiki/Dark_Ages_Predator", "Fan-film"],
  [66, "Y-065", "Dark Horse 25th Anniversary Predator", "", "Individu / design de merchandising", "Figurine / jouet", "NECA", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Dark_Horse_25th_Anniversary_Predator", "Figurine / jouet"],
  [67, "Y-066", "Dek", "", "Individu nommé ou surnommé", "Film / animation", "Predator: Badlands (2025)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Dek", "Film / animation"],
  [68, "Y-067", "Devil", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Devil", "Comics"],
  [69, "Y-068", "Disc Master", "", "Rang / classe", "Jeu vidéo", "Jeux Alien/Predator", "Rang / classe", "", "", "Non (rang)", "https://avp.fandom.com/wiki/Disc_Master", "Jeu vidéo"],
  [70, "Y-069", "Disgraced Predator", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Disgraced_Predator", "Univers étendu"],
  [71, "Y-070", "Djinn", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Djinn", "Comics"],
  [72, "Y-071", "Dominator Predators", "", "Groupe / collectif", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Dominator_Predators", "Univers étendu"],
  [73, "Y-072", "Dragon (Yautja)", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Dragon_%28Yautja%29", "Comics"],
  [74, "Y-073", "Elder (New Way City)", "", "Individu de jeu vidéo", "Jeu vidéo", "Predator: Concrete Jungle", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Elder_%28New_Way_City%29", "Jeu vidéo"],
  [75, "Y-074", "Elder Predator (Predator: Hunting Grounds)", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Elder_Predator_%28Predator%3A_Hunting_Grounds%29", "Jeu vidéo"],
  [76, "Y-075", "Elite Clan", "", "Groupe / clan", "Jeu vidéo", "Aliens vs. Predator (2010)", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Elite_Clan", "Jeu vidéo"],
  [77, "Y-076", "Emissary Predator", "", "Désignation collective / individus supprimés", "Film / animation • Jeu vidéo", "The Predator (2018), scènes supprimées", "Écran officiel / licencié", "", "Deux Emissaries avaient été tournés pour The Predator; scènes retirées du montage cinéma. La désignation collective est conservée ici.", "Oui", "https://avp.fandom.com/wiki/Emissary_Predator", "Film / animation"],
  [78, "Y-077", "Enforcer Predator", "", "Individu nommé ou surnommé", "Comics", "Predator: Bad Blood", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Enforcer_Predator", "Comics"],
  [79, "Y-078", "Esch'ande", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Esch'ande", "Univers étendu"],
  [80, "Y-079", "Etah'-dte", "", "Individu nommé ou surnommé", "Roman / prose", "Aliens vs. Predator: Prey", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Etah'-dte", "Roman / prose"],
  [81, "Y-080", "Exalted Predator", "", "Individu jouable", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Exalted_Predator", "Jeu vidéo"],
  [82, "Y-081", "Exiled Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Exiled_Predator", "Jeu vidéo"],
  [83, "Y-082", "Exiles", "", "Groupe / clan", "Comics", "Univers étendu", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Exiles", "Comics"],
  [84, "Y-083", "Falconer (Game Preserve Planet)", "", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Predators (2010)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Falconer_%28Game_Preserve_Planet%29", "Film / animation"],
  [85, "Y-084", "Father Predator", "", "Alias", "Jeu vidéo", "Predator: Hunting Grounds (alias de Njohrr)", "Alias / doublon", "Njohrr", "", "Alias", "https://avp.fandom.com/wiki/Father_Predator", "Jeu vidéo"],
  [86, "Y-085", "Feral Predator", "", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Prey (2022)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Feral_Predator", "Film / animation"],
  [87, "Y-086", "First Heavy Predator", "", "Individu anonyme désigné", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/First_Heavy_Predator", "Univers étendu"],
  [88, "Y-087", "First Light Predator", "", "Individu anonyme désigné", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/First_Light_Predator", "Univers étendu"],
  [89, "Y-088", "First POC Predator", "", "Individu anonyme désigné", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/First_POC_Predator", "Univers étendu"],
  [90, "Y-089", "Forest Devil", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Forest_Devil", "Comics"],
  [91, "Y-090", "Four-armed Predator", "", "Individu / hybride ou mutation", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Four-armed_Predator", "Comics"],
  [92, "Y-091", "Freckles", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Freckles", "Univers étendu"],
  [93, "Y-092", "Fugitive Predator", "Rogue Predator", "Individu / hybride ou mutation", "Film / animation", "The Predator (2018)", "Écran officiel / licencié", "", "Aussi Rogue Predator; Yautja modifié/hybride dans le film.", "Oui", "https://avp.fandom.com/wiki/Fugitive_Predator", "Film / animation"],
  [94, "Y-093", "Ghardeh", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ghardeh", "Univers étendu"],
  [95, "Y-094", "Ghost Predator", "", "Individu nommé ou surnommé", "Figurine / jouet", "Voir la source individuelle", "Création de merchandising licenciée", "", "Personnage Kenner/NECA distinct dans ce catalogue; ne pas le confondre avec l'ancien surnom de fan parfois donné au City Hunter.", "Oui", "https://avp.fandom.com/wiki/Ghost_Predator", "Figurine / jouet"],
  [96, "Y-095", "Gkyaun", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Gkyaun", "Univers étendu"],
  [97, "Y-096", "Gladiator Predator", "", "Individu jouable", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Gladiator_Predator", "Jeu vidéo"],
  [98, "Y-097", "Golden Angel Predator", "", "Alias / version plus jeune", "Comics • Figurine / jouet", "Predator 1718 / NECA", "Alias / doublon", "Greyback", "", "Alias", "https://avp.fandom.com/wiki/Golden_Angel_Predator", "Comics"],
  [99, "Y-098", "Gollywomp", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Gollywomp", "Comics"],
  [100, "Y-099", "Goreph", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Goreph", "Univers étendu"],
  [101, "Y-100", "Gort Predator", "", "Alias de production / figurine", "Film / animation • Figurine / jouet", "Predator 2 / NECA", "Alias / doublon", "Guardian", "", "Alias", "https://avp.fandom.com/wiki/Gort_Predator", "Film / animation"],
  [102, "Y-101", "Grendel (Yautja)", "Jotun Predator", "Individu nommé ou surnommé", "Film / animation", "Predator: Killer of Killers (2025)", "Écran officiel / licencié", "", "Appelé Jotun dans Predator: Hunting Grounds.", "Oui", "https://avp.fandom.com/wiki/Grendel_%28Yautja%29", "Film / animation"],
  [103, "Y-102", "Grendel King", "", "Individu nommé ou surnommé", "Film / animation", "Predator: Killer of Killers (2025)", "Écran officiel / licencié", "", "Aussi appelé Warlord Predator; chef du clan de l'arène.", "Oui", "https://avp.fandom.com/wiki/Grendel_King", "Film / animation"],
  [104, "Y-103", "Greyback", "Elder Predator / Golden Angel; Golden Angel Predator", "Individu nommé ou surnommé", "Film / animation", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Greyback", "Film / animation"],
  [105, "Y-104", "Guardian", "Gort Predator", "Individu nommé ou surnommé", "Film / animation • Comics • Roman / prose", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Guardian", "Film / animation"],
  [106, "Y-105", "H'chak", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/H'chak", "Univers étendu"],
  [107, "Y-106", "Hashori", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Hashori", "Univers étendu"],
  [108, "Y-107", "Hippie Predator", "", "Alias de production / fan", "Film / animation • Figurine / jouet", "Predator 2 / NECA", "Alias / doublon", "Shaman", "", "Alias", "https://avp.fandom.com/wiki/Hippie_Predator", "Film / animation"],
  [109, "Y-108", "Hive Wars Predator", "", "Individu nommé ou surnommé", "Comics • Figurine / jouet", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Hive_Wars_Predator", "Comics"],
  [110, "Y-109", "Hook", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Hook", "Comics"],
  [111, "Y-110", "Hornhead", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Hornhead", "Comics"],
  [112, "Y-111", "Hunter (Elite Clan)", "", "Individu nommé ou surnommé", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Hunter_%28Elite_Clan%29", "Jeu vidéo"],
  [113, "Y-112", "Hunter (title)", "", "Rang / classe", "Jeu vidéo / univers étendu", "Franchise Predator", "Rang / classe", "", "", "Non (rang)", "https://avp.fandom.com/wiki/Hunter_%28title%29", "Jeu vidéo"],
  [114, "Y-113", "Hunter Captain", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Predator: Concrete Jungle (2005)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Hunter_Captain", "Univers étendu"],
  [115, "Y-114", "Inu", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Inu", "Univers étendu"],
  [116, "Y-115", "Isolated Clan", "", "Groupe / clan", "Film / animation • Jeu vidéo", "Franchise AVP", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Isolated_Clan", "Film / animation"],
  [117, "Y-116", "Jotun Predator", "", "Alias", "Jeu vidéo", "Predator: Hunting Grounds (alias de Grendel)", "Alias / doublon", "Grendel (Yautja)", "", "Alias", "https://avp.fandom.com/wiki/Jotun_Predator", "Jeu vidéo"],
  [118, "Y-117", "Jungle Demon Predator", "", "Alias / variante de figurine", "Figurine / jouet", "NECA", "Alias / doublon", "Jungle Hunter", "", "Alias", "https://avp.fandom.com/wiki/Jungle_Demon_Predator", "Figurine / jouet"],
  [119, "Y-118", "Jungle Hunter", "Classic Predator (1987); Jungle Demon Predator", "Individu nommé ou surnommé", "Film / animation", "Predator (1987)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Jungle_Hunter", "Film / animation"],
  [120, "Y-119", "Jungle Hunter Clan", "", "Groupe / clan", "Film / animation • univers étendu", "Predator / Prey", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Jungle_Hunter_Clan", "Film / animation"],
  [121, "Y-120", "Ka'Torag", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ka'Torag", "Univers étendu"],
  [122, "Y-121", "Kaail", "", "Individu nommé ou surnommé", "Jeu vidéo • Figurine / jouet", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Kaail", "Jeu vidéo"],
  [123, "Y-122", "Kalakta", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Kalakta", "Univers étendu"],
  [124, "Y-123", "Kata'nu", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Kata'nu", "Univers étendu"],
  [125, "Y-124", "Ki'vik'non", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ki'vik'non", "Univers étendu"],
  [126, "Y-125", "Killers Clan", "", "Groupe / clan", "Comics", "Aliens vs. Predator: Three World War", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Killers_Clan", "Comics"],
  [127, "Y-126", "Ku'dlak", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ku'dlak", "Univers étendu"],
  [128, "Y-127", "Kwei", "", "Individu nommé ou surnommé", "Film / animation", "Predator: Badlands (2025)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Kwei", "Film / animation"],
  [129, "Y-128", "Lasershot Predator", "", "Individu nommé ou surnommé", "Figurine / jouet", "Voir la source individuelle", "Création de merchandising licenciée", "", "", "Oui", "https://avp.fandom.com/wiki/Lasershot_Predator", "Figurine / jouet"],
  [130, "Y-129", "Lava Planet Predator", "", "Individu de merchandising", "Figurine / jouet", "Kenner / NECA", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Lava_Planet_Predator", "Figurine / jouet"],
  [131, "Y-130", "Lefty", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Lefty", "Univers étendu"],
  [132, "Y-131", "Light-Stepper", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Light-Stepper", "Comics"],
  [133, "Y-132", "Long Spear", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Concrete Jungle (2005)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Long_Spear", "Jeu vidéo"],
  [134, "Y-133", "Lord", "", "Individu nommé ou surnommé", "Jeu vidéo", "Aliens versus Predator 2: Primal Hunt (2002)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Lord", "Jeu vidéo"],
  [135, "Y-134", "Lost Predator", "", "Alias de production / figurine", "Film / animation • Figurine / jouet", "Predator 2 / NECA", "Alias / doublon", "Borg", "", "Alias", "https://avp.fandom.com/wiki/Lost_Predator", "Film / animation"],
  [136, "Y-135", "Lost Tribe / Los Angeles hunting party", "", "Groupe / clan", "Film / animation", "Predator 2 (1990)", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Lost_Tribe_%2F_Los_Angeles_hunting_party", "Film / animation"],
  [137, "Y-136", "M'icli-de", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/M'icli-de", "Univers étendu"],
  [138, "Y-137", "Mad Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Alien vs. Predator (arcade, 1994)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Mad_Predator", "Jeu vidéo"],
  [139, "Y-138", "Mahnde", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Mahnde", "Univers étendu"],
  [140, "Y-139", "Mersh-Trep", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Mersh-Trep", "Univers étendu"],
  [141, "Y-140", "Minikui", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Minikui", "Univers étendu"],
  [142, "Y-141", "Mr. Black", "", "Alias", "Film / animation • Jeu vidéo", "Predators (2010)", "Alias / doublon", "Berserker (Game Preserve Planet)", "", "Alias", "https://avp.fandom.com/wiki/Mr._Black", "Film / animation"],
  [143, "Y-142", "Mutated Yautja", "", "Individu / hybride ou mutation", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Mutated_Yautja", "Univers étendu"],
  [144, "Y-143", "Mystery Competitor", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Mystery_Competitor", "Comics"],
  [145, "Y-144", "Nakande", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Nakande", "Univers étendu"],
  [146, "Y-145", "Nat'ka'pu", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Nat'ka'pu", "Univers étendu"],
  [147, "Y-146", "Nei'hman-de", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Nei'hman-de", "Univers étendu"],
  [148, "Y-147", "Night Hunter Clan", "", "Groupe / clan", "Figurine / jouet", "Kenner / NECA", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Night_Hunter_Clan", "Figurine / jouet"],
  [149, "Y-148", "Night Recon Predator", "", "Individu de merchandising", "Figurine / jouet", "Kenner Aliens: Hive Wars", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Night_Recon_Predator", "Figurine / jouet"],
  [150, "Y-149", "Nightmare Kid", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Nightmare_Kid", "Univers étendu"],
  [151, "Y-150", "Nightstorm Predator", "", "Individu de merchandising", "Figurine / jouet", "Kenner / NECA", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Nightstorm_Predator", "Figurine / jouet"],
  [152, "Y-151", "Njohrr", "Father Predator", "Individu nommé ou surnommé", "Film / animation", "Predator: Badlands (2025)", "Écran officiel / licencié", "", "Appelé Father Predator dans Predator: Hunting Grounds.", "Oui", "https://avp.fandom.com/wiki/Njohrr", "Film / animation"],
  [153, "Y-152", "Nk'mecci", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Nk'mecci", "Univers étendu"],
  [154, "Y-153", "Oc'djy", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Oc'djy", "Univers étendu"],
  [155, "Y-154", "Oni Predator", "Predator (Feudal Era)", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Predator: Killer of Killers (2025)", "Écran officiel / licencié", "", "Aussi catalogué comme Predator (Feudal Era).", "Oui", "https://avp.fandom.com/wiki/Oni_Predator", "Film / animation"],
  [156, "Y-155", "Ozarks Hunter", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ozarks_Hunter", "Comics"],
  [157, "Y-156", "Pig Iron", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Pig_Iron", "Comics"],
  [158, "Y-157", "Pirate Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Pirate_Predator", "Jeu vidéo"],
  [159, "Y-158", "Predator (Feudal Era)", "", "Alias", "Film / animation", "Predator: Killer of Killers (2025)", "Alias / doublon", "Oni Predator", "", "Alias", "https://avp.fandom.com/wiki/Predator_%28Feudal_Era%29", "Film / animation"],
  [160, "Y-159", "Predator (Mega-City One)", "", "Individu nommé ou surnommé", "Comics", "Predator vs. Judge Dredd", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Predator_%28Mega-City_One%29", "Comics"],
  [161, "Y-160", "Predator (Rite of Passage)", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Predator_%28Rite_of_Passage%29", "Comics"],
  [162, "Y-161", "Predator (World War II)", "", "Individu nommé ou surnommé", "Film / animation", "Predator: Killer of Killers (2025)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Predator_%28World_War_II%29", "Film / animation"],
  [163, "Y-162", "Predator A6718", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Alien vs. Predator (arcade, 1994)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Predator_A6718", "Univers étendu"],
  [164, "Y-163", "Predator de AVP: Redemption", "", "Groupe / individus anonymes désignés", "Fan-film", "AVP: Redemption (2010)", "Groupe / catégorie", "", "Le film de fans met en scène des Yautja non nommés; entrée collective/descriptive.", "Non (groupe)", "", "Fan-film"],
  [165, "Y-164", "Predator de Predator: Last Will", "", "Individu anonyme désigné", "Fan-film / machinima", "Predator: Last Will", "Non officiel / fan-made", "", "Désignation descriptive; production non officielle.", "Oui", "", "Fan-film"],
  [166, "Y-165", "Prient'de", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Prient'de", "Comics"],
  [167, "Y-166", "Prince", "", "Individu nommé ou surnommé", "Jeu vidéo", "Aliens versus Predator 2 (2001)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Prince", "Jeu vidéo"],
  [168, "Y-167", "R'ka", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/R'ka", "Univers étendu"],
  [169, "Y-168", "Rakshasa", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Rakshasa", "Comics"],
  [170, "Y-169", "Ram Predator", "", "Alias de production / figurine", "Film / animation • Figurine / jouet", "Predator 2 / NECA", "Alias / doublon", "Warrior (Yautja)", "", "Alias", "https://avp.fandom.com/wiki/Ram_Predator", "Film / animation"],
  [171, "Y-170", "Renegade Predator", "", "Individu nommé ou surnommé", "Figurine / jouet", "Voir la source individuelle", "Création de merchandising licenciée", "", "", "Oui", "https://avp.fandom.com/wiki/Renegade_Predator", "Figurine / jouet"],
  [172, "Y-171", "Rogue Predator", "", "Alias", "Film / animation • Figurine / jouet", "The Predator (2018)", "Alias / doublon", "Fugitive Predator", "", "Alias", "https://avp.fandom.com/wiki/Rogue_Predator", "Film / animation"],
  [173, "Y-172", "Rogue Space Tribe", "", "Groupe / clan", "Figurine / jouet", "NECA / biographie de Spiked Tail", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Rogue_Space_Tribe", "Figurine / jouet"],
  [174, "Y-173", "Sakana", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Sakana", "Univers étendu"],
  [175, "Y-174", "Samurai Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Samurai_Predator", "Jeu vidéo"],
  [176, "Y-175", "Scar", "", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Alien vs. Predator (2004)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Scar", "Film / animation"],
  [177, "Y-176", "Scar (Shell)", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Scar_%28Shell%29", "Univers étendu"],
  [178, "Y-177", "Scarface", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Concrete Jungle (2005)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Scarface", "Jeu vidéo"],
  [179, "Y-178", "Scavage Predator", "", "Individu nommé ou surnommé", "Figurine / jouet", "Voir la source individuelle", "Création de merchandising licenciée", "", "", "Oui", "https://avp.fandom.com/wiki/Scavage_Predator", "Figurine / jouet"],
  [180, "Y-179", "Scout", "", "Individu nommé ou surnommé", "Film / animation • Comics • Roman / prose", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Scout", "Film / animation"],
  [181, "Y-180", "Second Heavy Predator", "", "Individu anonyme désigné", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Second_Heavy_Predator", "Univers étendu"],
  [182, "Y-181", "Second Light Predator", "", "Individu anonyme désigné", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Second_Light_Predator", "Univers étendu"],
  [183, "Y-182", "Second POC Predator", "", "Individu anonyme désigné", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Second_POC_Predator", "Univers étendu"],
  [184, "Y-183", "See-through Slasher", "", "Individu nommé ou surnommé", "Comics", "Batman versus Predator", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/See-through_Slasher", "Comics"],
  [185, "Y-184", "Serpent Hunter Predator", "", "Alias de figurine", "Figurine / jouet", "NECA", "Alias / doublon", "Alien Head Predator", "", "Alias", "https://avp.fandom.com/wiki/Serpent_Hunter_Predator", "Figurine / jouet"],
  [186, "Y-185", "Set-Thwei", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Set-Thwei", "Univers étendu"],
  [187, "Y-186", "Shadow Predator", "", "Alias de production / figurine", "Film / animation • Figurine / jouet", "Predator 2 / NECA", "Alias / doublon", "Snake", "", "Alias", "https://avp.fandom.com/wiki/Shadow_Predator", "Film / animation"],
  [188, "Y-187", "Shaman", "Hippie Predator", "Individu nommé ou surnommé", "Film / animation", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Shaman", "Film / animation"],
  [189, "Y-188", "Shamana", "", "Individu nommé ou surnommé", "Roman / prose", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Shamana", "Roman / prose"],
  [190, "Y-189", "Shesh-Kuk", "", "Individu nommé ou surnommé", "Roman / prose", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Shesh-Kuk", "Roman / prose"],
  [191, "Y-190", "Shorty", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Shorty", "Comics"],
  [192, "Y-191", "Shriek", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Shriek", "Univers étendu"],
  [193, "Y-192", "Sister Midnight", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Sister_Midnight", "Univers étendu"],
  [194, "Y-193", "Skemte", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Skemte", "Univers étendu"],
  [195, "Y-194", "Skinner", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Skinner", "Univers étendu"],
  [196, "Y-195", "Skl'da'-si", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Skl'da'-si", "Univers étendu"],
  [197, "Y-196", "Sky Devil", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Sky_Devil", "Univers étendu"],
  [198, "Y-197", "Slats", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Slats", "Univers étendu"],
  [199, "Y-198", "Smiley", "", "Individu nommé ou surnommé", "Comics • Roman / prose", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Smiley", "Comics"],
  [200, "Y-199", "Snake", "Shadow Predator", "Individu nommé ou surnommé", "Film / animation", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Snake", "Film / animation"],
  [201, "Y-200", "Spartan", "", "Individu nommé ou surnommé", "Jeu vidéo", "Aliens vs. Predator (2010)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Spartan", "Jeu vidéo"],
  [202, "Y-201", "Spear Master", "", "Rang / classe", "Jeu vidéo", "Jeux Alien/Predator", "Rang / classe", "", "", "Non (rang)", "https://avp.fandom.com/wiki/Spear_Master", "Jeu vidéo"],
  [203, "Y-202", "Spiked Tail Predator", "", "Individu nommé ou surnommé", "Figurine / jouet", "Voir la source individuelle", "Création de merchandising licenciée", "", "", "Oui", "https://avp.fandom.com/wiki/Spiked_Tail_Predator", "Figurine / jouet"],
  [204, "Y-203", "Splitter", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Splitter", "Comics"],
  [205, "Y-204", "Stalker (Bad Blood)", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Stalker_%28Bad_Blood%29", "Univers étendu"],
  [206, "Y-205", "Stalker (Elite Clan)", "", "Individu / skin de jeu", "Jeu vidéo", "Aliens vs. Predator (2010)", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Stalker_%28Elite_Clan%29", "Jeu vidéo"],
  [207, "Y-206", "Stalker (Lost Tribe)", "Brother Boar Predator", "Individu nommé ou surnommé", "Film / animation", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Stalker_%28Lost_Tribe%29", "Film / animation"],
  [208, "Y-207", "Stalker (Night Hunter Clan)", "", "Individu nommé ou surnommé", "Figurine / jouet", "Voir la source individuelle", "Création de merchandising licenciée", "", "", "Oui", "https://avp.fandom.com/wiki/Stalker_%28Night_Hunter_Clan%29", "Figurine / jouet"],
  [209, "Y-208", "Stalker (title)", "", "Rang / classe", "Jeu vidéo / univers étendu", "Franchise Predator", "Rang / classe", "", "", "Non (rang)", "https://avp.fandom.com/wiki/Stalker_%28title%29", "Jeu vidéo"],
  [210, "Y-209", "Stone Heart", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Concrete Jungle (2005)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Stone_Heart", "Jeu vidéo"],
  [211, "Y-210", "Super Predators", "", "Groupe / branche", "Film / animation • Jeu vidéo • Figurine / jouet", "Predators (2010) et dérivés", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Super_Predators", "Film / animation"],
  [212, "Y-211", "Swift Knife", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Concrete Jungle (2005)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Swift_Knife", "Jeu vidéo"],
  [213, "Y-212", "Ta'roga", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Ta'roga", "Univers étendu"],
  [214, "Y-213", "Temple Guard Predator", "", "Désignation de production / figurine", "Film / animation • Figurine / jouet", "Alien vs. Predator (2004) / NECA", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Temple_Guard_Predator", "Film / animation"],
  [215, "Y-214", "The Devil", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/The_Devil", "Univers étendu"],
  [216, "Y-215", "Three Sparks (Aokigahara)", "", "Groupe / collectif", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Three_Sparks_%28Aokigahara%29", "Univers étendu"],
  [217, "Y-216", "Three-mandibled Predator", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Three-mandibled_Predator", "Comics"],
  [218, "Y-217", "Three-Spot", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Three-Spot", "Comics"],
  [219, "Y-218", "Tichinde", "", "Individu nommé ou surnommé", "Comics • Roman / prose", "Aliens vs. Predator: Prey", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Tichinde", "Comics"],
  [220, "Y-219", "Tli'uukop", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Tli'uukop", "Univers étendu"],
  [221, "Y-220", "Top-Knot", "", "Individu nommé ou surnommé", "Comics • Roman / prose", "Aliens vs. Predator: War / Hunter's Planet", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Top-Knot", "Comics"],
  [222, "Y-221", "Top-Knot's Clan", "", "Groupe / clan", "Comics • Roman / prose", "Aliens vs. Predator: War / Hunter's Planet", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Top-Knot's_Clan", "Comics"],
  [223, "Y-222", "Tracker", "", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Predators (2010)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Tracker", "Film / animation"],
  [224, "Y-223", "Tress", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Tress", "Univers étendu"],
  [225, "Y-224", "Tunnels Predator", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Tunnels_Predator", "Univers étendu"],
  [226, "Y-225", "Two-Stripes", "", "Individu nommé ou surnommé", "Comics", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Two-Stripes", "Comics"],
  [227, "Y-226", "Ultimate Predator (2018)", "", "Alias", "Film / animation • Figurine / jouet", "The Predator (2018)", "Alias / doublon", "Upgrade Predator", "", "Alias", "https://avp.fandom.com/wiki/Ultimate_Predator_%282018%29", "Film / animation"],
  [228, "Y-227", "Ultimate Predator (Kenner)", "", "Individu de merchandising", "Figurine / jouet", "Kenner", "Univers étendu / merchandising licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Ultimate_Predator_%28Kenner%29", "Figurine / jouet"],
  [229, "Y-228", "Unnamed Elite Predator (BG-386)", "", "Individu anonyme désigné", "Jeu vidéo", "Aliens vs. Predator (2010)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Unnamed_Elite_Predator_%28BG-386%29", "Jeu vidéo"],
  [230, "Y-229", "Unnamed First Predator (Odobenus)", "", "Individu anonyme désigné", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Unnamed_First_Predator_%28Odobenus%29", "Jeu vidéo"],
  [231, "Y-230", "Unnamed Gateway Predators", "", "Groupe / collectif", "Jeu vidéo", "Voir la source individuelle", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Unnamed_Gateway_Predators", "Jeu vidéo"],
  [232, "Y-231", "Unnamed Jungle Hunter Predator (Temple Arena)", "", "Individu anonyme désigné", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Unnamed_Jungle_Hunter_Predator_%28Temple_Arena%29", "Jeu vidéo"],
  [233, "Y-232", "Unnamed Predator (LV-426)", "", "Individu anonyme désigné", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Unnamed_Predator_%28LV-426%29", "Jeu vidéo"],
  [234, "Y-233", "Unnamed Predator (Tyrargo)", "", "Individu anonyme désigné", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Unnamed_Predator_%28Tyrargo%29", "Jeu vidéo"],
  [235, "Y-234", "Unnamed Second Predator (Odobenus)", "", "Individu anonyme désigné", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Unnamed_Second_Predator_%28Odobenus%29", "Jeu vidéo"],
  [236, "Y-235", "Unnamed Third Predator (Odobenus)", "", "Individu anonyme désigné", "Jeu vidéo", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Unnamed_Third_Predator_%28Odobenus%29", "Jeu vidéo"],
  [237, "Y-236", "Unnamed Young Blood Predator (BG-386)", "", "Individu anonyme désigné", "Jeu vidéo", "Aliens vs. Predator (2010)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Unnamed_Young_Blood_Predator_%28BG-386%29", "Jeu vidéo"],
  [238, "Y-237", "Upgrade Predator", "Assassin Predator; Ultimate Predator (2018)", "Individu / hybride ou mutation", "Film / animation", "The Predator (2018)", "Écran officiel / licencié", "", "Aussi Assassin Predator / Ultimate Predator; hybride génétiquement amélioré.", "Oui", "https://avp.fandom.com/wiki/Upgrade_Predator", "Film / animation"],
  [239, "Y-238", "Vagouti", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Vagouti", "Univers étendu"],
  [240, "Y-239", "Valkyrie Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Valkyrie_Predator", "Jeu vidéo"],
  [241, "Y-240", "Viking Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Viking_Predator", "Jeu vidéo"],
  [242, "Y-241", "Viper Predator", "", "Individu nommé ou surnommé", "Figurine / jouet", "Voir la source individuelle", "Création de merchandising licenciée", "", "", "Oui", "https://avp.fandom.com/wiki/Viper_Predator", "Figurine / jouet"],
  [243, "Y-242", "Vk'leita", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Vk'leita", "Univers étendu"],
  [244, "Y-243", "Warkha", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Warkha", "Univers étendu"],
  [245, "Y-244", "Warlord's Clan", "", "Groupe / clan", "Film / animation", "Predator: Killer of Killers (2025)", "Groupe / catégorie", "", "", "Non (groupe)", "https://avp.fandom.com/wiki/Warlord's_Clan", "Film / animation"],
  [246, "Y-245", "Warrior (Yautja)", "Ram Predator", "Individu nommé ou surnommé", "Film / animation • Figurine / jouet", "Predator 2 (1990)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Warrior_%28Yautja%29", "Film / animation"],
  [247, "Y-246", "Warrior Yautja (LV-412)", "", "Individu nommé ou surnommé", "Jeu vidéo", "Aliens vs. Predator: Extinction (2003)", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Warrior_Yautja_%28LV-412%29", "Jeu vidéo"],
  [248, "Y-247", "Wasp Predator", "", "Individu fan-made puis licencié", "Fan-film • Figurine / jouet", "Batman: Dead End (2003) / NECA", "Fan-made puis licencié", "", "Créé pour Batman: Dead End, puis officiellement licencié par NECA.", "Oui", "https://avp.fandom.com/wiki/Wasp_Predator", "Fan-film"],
  [249, "Y-248", "Wendigo", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Wendigo", "Univers étendu"],
  [250, "Y-249", "Witch Predator", "", "Individu nommé ou surnommé", "Jeu vidéo", "Predator: Hunting Grounds", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Witch_Predator", "Jeu vidéo"],
  [251, "Y-250", "Wolf (Earth)", "", "Individu nommé ou surnommé", "Film / animation • Jeu vidéo", "Aliens vs. Predator: Requiem (2007)", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Wolf_%28Earth%29", "Film / animation"],
  [252, "Y-251", "Wolf (Elite Clan)", "", "Individu nommé ou surnommé", "Jeu vidéo", "Aliens vs. Predator (2010)", "Univers étendu licencié / catalogué", "", "Individu du jeu AVP (2010), distinct du Wolf d'AVPR malgré le nom et une inspiration visuelle communes.", "Oui", "https://avp.fandom.com/wiki/Wolf_%28Elite_Clan%29", "Jeu vidéo"],
  [253, "Y-252", "Yaquita", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Yaquita", "Univers étendu"],
  [254, "Y-253", "Yen'sha", "", "Individu nommé ou surnommé", "Univers étendu (comic/roman/audio/jeu)", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Yen'sha", "Univers étendu"],
  [255, "Y-254", "Yeyinde", "", "Individu nommé ou surnommé", "Comics • Roman / prose", "Voir la source individuelle", "Univers étendu licencié / catalogué", "", "", "Oui", "https://avp.fandom.com/wiki/Yeyinde", "Comics"],
  [256, "Y-255", "Youngblood Predator", "", "Désignation de production / figurine", "Film / animation • Figurine / jouet", "Alien vs. Predator (2004) / NECA", "Écran officiel / licencié", "", "", "Oui", "https://avp.fandom.com/wiki/Youngblood_Predator", "Film / animation"],
] as const satisfies readonly RawCatalogueRow[];

export type CatalogueStableId = (typeof RAW_CATALOGUE_ROWS)[number][1];
export type CatalogueContinuity = "canon" | "expanded" | "fan";
export type CatalogueEntryKind = "individual" | "alias" | "group" | "rank";

export interface CatalogueYautjaEntry {
  readonly id: CatalogueStableId;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly kind: CatalogueEntryKind;
  readonly typeLabel: string;
  readonly media: readonly string[];
  readonly mediaLabel: string;
  readonly work: string;
  /**
   * Année explicitement présente dans le libellé d'œuvre du classeur.
   * null signifie que le fichier ne fournit pas d'année exploitable.
   */
  readonly year: number | null;
  readonly continuity: CatalogueContinuity;
  readonly sourceStatus: string;
  readonly canonicalName: string | null;
  readonly notes: string | null;
  readonly distinctIdentity: boolean | null;
  readonly distinctIdentityLabel: string;
  readonly sourceUrl: string | null;
  readonly family: string;
  readonly source: {
    readonly sheet: "Index maître";
    readonly row: number;
  };
  readonly presetIds: readonly HunterLorePresetId[];
}

const PRESET_IDS_BY_ENTRY_ID = {
  "Y-004": ["ahab"],
  "Y-008": ["alpha"],
  "Y-012": ["ancient-warrior"],
  "Y-017": ["assassin"],
  "Y-021": ["bad-blood-comic"],
  "Y-024": ["berserker"],
  "Y-027": ["big-mama"],
  "Y-029": ["bionic"],
  "Y-031": ["boar"],
  "Y-034": ["bonegrill"],
  "Y-035": ["lost-borg"],
  "Y-038": ["broken-tusk"],
  "Y-039": ["lost-stalker"],
  "Y-040": ["bull"],
  "Y-043": ["classic-captive"],
  "Y-044": ["celtic"],
  "Y-045": ["chopper"],
  "Y-049": ["city-hunter"],
  "Y-052": ["jungle-hunter"],
  "Y-053": ["classic-captive"],
  "Y-055": ["cleopatra"],
  "Y-058": ["classic-captive"],
  "Y-061": ["broken-tusk"],
  "Y-066": ["dek"],
  "Y-076": ["emissary-one", "emissary-two"],
  "Y-077": ["enforcer"],
  "Y-083": ["falconer"],
  "Y-084": ["dek-father"],
  "Y-085": ["feral-hunter"],
  "Y-092": ["fugitive"],
  "Y-097": ["greyback"],
  "Y-100": ["guardian"],
  "Y-101": ["kok-jotun"],
  "Y-102": ["kok-warlord"],
  "Y-103": ["greyback"],
  "Y-104": ["guardian"],
  "Y-106": ["hashori"],
  "Y-107": ["shaman"],
  "Y-116": ["kok-jotun"],
  "Y-117": ["jungle-hunter"],
  "Y-118": ["jungle-hunter"],
  "Y-127": ["kwei"],
  "Y-134": ["lost-borg"],
  "Y-141": ["berserker"],
  "Y-151": ["dek-father"],
  "Y-154": ["kok-oni"],
  "Y-158": ["kok-oni"],
  "Y-161": ["kok-pilot"],
  "Y-169": ["warrior"],
  "Y-171": ["fugitive"],
  "Y-174": ["samurai"],
  "Y-175": ["scar"],
  "Y-177": ["scarface"],
  "Y-179": ["lost-scout"],
  "Y-186": ["snake"],
  "Y-187": ["shaman"],
  "Y-199": ["snake"],
  "Y-206": ["lost-stalker"],
  "Y-209": ["stone-heart"],
  "Y-213": ["temple-guard"],
  "Y-222": ["tracker"],
  "Y-226": ["assassin"],
  "Y-237": ["assassin"],
  "Y-239": ["valkyrie"],
  "Y-245": ["warrior"],
  "Y-249": ["witch"],
  "Y-250": ["wolf"],
  "Y-255": ["youngblood"],
} as const satisfies Partial<
  Record<CatalogueStableId, readonly HunterLorePresetId[]>
>;

const EMPTY_PRESET_IDS = Object.freeze([]) as readonly HunterLorePresetId[];
const PRESET_MAPPING = PRESET_IDS_BY_ENTRY_ID as Partial<
  Record<CatalogueStableId, readonly HunterLorePresetId[]>
>;

function splitList(value: string, separator: RegExp): readonly string[] {
  if (!value.trim()) return Object.freeze([]);
  return Object.freeze(
    value
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function catalogueKind(
  typeLabel: string,
  sourceStatus: string,
  distinctIdentity: string,
): CatalogueEntryKind {
  if (
    distinctIdentity === "Alias" ||
    /^Alias\b/.test(typeLabel) ||
    sourceStatus === "Alias / doublon"
  ) {
    return "alias";
  }
  if (
    /Groupe|collectif|clan/i.test(typeLabel) ||
    sourceStatus === "Groupe / catégorie" ||
    /Non \(groupe\)/i.test(distinctIdentity)
  ) {
    return "group";
  }
  if (
    /Rang|classe|catégorie culturelle/i.test(typeLabel) ||
    sourceStatus === "Rang / classe" ||
    /Non \(rang\)/i.test(distinctIdentity)
  ) {
    return "rank";
  }
  return "individual";
}

function catalogueContinuity(
  mediaLabel: string,
  work: string,
  sourceStatus: string,
): CatalogueContinuity {
  if (
    /Non officiel|fan-made/i.test(sourceStatus) &&
    !/puis licencié/i.test(sourceStatus)
  ) {
    return "fan";
  }
  if (/Fan-film/i.test(mediaLabel) && !/licencié/i.test(sourceStatus)) {
    return "fan";
  }
  if (/Écran officiel/i.test(sourceStatus)) return "canon";
  if (
    /Film \/ animation/i.test(mediaLabel) &&
    /^(?:Predator(?:\s|:|$)|Alien vs\. Predator|Aliens vs\. Predator: Requiem|Predators(?:\s|$)|The Predator|Prey(?:\s|$))/i.test(
      work,
    )
  ) {
    return "canon";
  }
  return "expanded";
}

function catalogueYear(work: string): number | null {
  const match = work.match(/\b(?:19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function distinctIdentity(value: string): boolean | null {
  if (value === "Oui") return true;
  if (/^(?:Alias|Non\b)/i.test(value)) return false;
  return null;
}

export const CATALOGUE_ROSTER = Object.freeze(
  RAW_CATALOGUE_ROWS.map(
    ([
      sourceRow,
      id,
      name,
      aliases,
      typeLabel,
      mediaLabel,
      work,
      sourceStatus,
      canonicalName,
      notes,
      distinctIdentityLabel,
      sourceUrl,
      family,
    ]): CatalogueYautjaEntry =>
      Object.freeze({
        id,
        name,
        aliases: splitList(aliases, /\s*;\s*/),
        kind: catalogueKind(typeLabel, sourceStatus, distinctIdentityLabel),
        typeLabel,
        media: splitList(mediaLabel, /\s*•\s*/),
        mediaLabel,
        work,
        year: catalogueYear(work),
        continuity: catalogueContinuity(mediaLabel, work, sourceStatus),
        sourceStatus,
        canonicalName: canonicalName || null,
        notes: notes || null,
        distinctIdentity: distinctIdentity(distinctIdentityLabel),
        distinctIdentityLabel,
        sourceUrl: sourceUrl || null,
        family,
        source: Object.freeze({
          sheet: "Index maître" as const,
          row: sourceRow,
        }),
        presetIds: Object.freeze([
          ...(PRESET_MAPPING[id] ?? EMPTY_PRESET_IDS),
        ]),
      }),
  ),
);

export const CATALOGUE_ENTRY_BY_ID = Object.freeze(
  Object.fromEntries(CATALOGUE_ROSTER.map((entry) => [entry.id, entry])),
) as Readonly<Record<CatalogueStableId, CatalogueYautjaEntry>>;

export const CATALOGUE_PRESET_IDS_BY_ENTRY_ID = Object.freeze(
  Object.fromEntries(
    CATALOGUE_ROSTER.map((entry) => [entry.id, entry.presetIds]),
  ),
) as Readonly<Record<CatalogueStableId, readonly HunterLorePresetId[]>>;

export const CATALOGUE_ENTRY_IDS_BY_PRESET_ID = Object.freeze(
  Object.fromEntries(
    EXISTING_HUNTER_PRESET_IDS.map((presetId) => [
      presetId,
      Object.freeze(
        CATALOGUE_ROSTER.filter((entry) =>
          entry.presetIds.includes(presetId),
        ).map((entry) => entry.id),
      ),
    ]),
  ),
) as Readonly<Record<HunterLorePresetId, readonly CatalogueStableId[]>>;

export const CATALOGUE_PRESETS_WITHOUT_WORKBOOK_ENTRY = Object.freeze(
  EXISTING_HUNTER_PRESET_IDS.filter(
    (presetId) => CATALOGUE_ENTRY_IDS_BY_PRESET_ID[presetId].length === 0,
  ),
);

export const CATALOGUE_ENTRIES_WITHOUT_PRESET = Object.freeze(
  CATALOGUE_ROSTER.filter((entry) => entry.presetIds.length === 0),
);

function countBy<T extends string>(
  values: readonly T[],
): Readonly<Record<T, number>> {
  return Object.freeze(
    values.reduce<Record<T, number>>(
      (counts, value) => {
        counts[value] = (counts[value] ?? 0) + 1;
        return counts;
      },
      {} as Record<T, number>,
    ),
  );
}

const MAPPED_PRESET_COUNT = new Set(
  CATALOGUE_ROSTER.flatMap((entry) => entry.presetIds),
).size;

export const CATALOGUE_ROSTER_COUNTS = Object.freeze({
  total: CATALOGUE_ROSTER.length,
  byContinuity: countBy(
    CATALOGUE_ROSTER.map((entry) => entry.continuity),
  ),
  byKind: countBy(CATALOGUE_ROSTER.map((entry) => entry.kind)),
  withExplicitYear: CATALOGUE_ROSTER.filter((entry) => entry.year !== null)
    .length,
  withoutExplicitYear: CATALOGUE_ROSTER.filter((entry) => entry.year === null)
    .length,
  withSourceUrl: CATALOGUE_ROSTER.filter((entry) => entry.sourceUrl !== null)
    .length,
  withoutSourceUrl: CATALOGUE_ROSTER.filter((entry) => entry.sourceUrl === null)
    .length,
  mappedEntries: CATALOGUE_ROSTER.length - CATALOGUE_ENTRIES_WITHOUT_PRESET.length,
  unmappedEntries: CATALOGUE_ENTRIES_WITHOUT_PRESET.length,
  mappedPresets: MAPPED_PRESET_COUNT,
  unmappedPresets: CATALOGUE_PRESETS_WITHOUT_WORKBOOK_ENTRY.length,
});
