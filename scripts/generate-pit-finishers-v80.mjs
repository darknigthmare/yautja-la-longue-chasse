import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import assert from 'node:assert/strict';

// Generate exact roster coverage, not weapons inferred from a name or shared Jungle preset.
const built = await build({ stdin: { contents: "export {PIT_FIGHTERS} from './app/game/systems/pitCombat'; export {PIT_VERSUS_FIGHTER_IDS} from './app/game/systems/pitRosterExpansion'; export {getPitFighterVariants} from './app/game/systems/pitUserRoster';", loader: 'ts', resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', logLevel: 'silent' });
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', built.outputFiles[0].text)(createRequire(import.meta.url), compiledModule, compiledModule.exports);
const { PIT_FIGHTERS, PIT_VERSUS_FIGHTER_IDS, getPitFighterVariants } = compiledModule.exports;
assert.equal(PIT_VERSUS_FIGHTER_IDS.length, 201);
const neca = 'https://necaonline.com/';
const sources = {
  jungle: neca + '2016/12/predator-7-scale-action-figure-ultimate-jungle-hunter/',
  city: 'https://store.necaonline.com/blogs/news/174244359-closer-look-predators-series-7-masked-city-hunter-action-shots-more',
  boar: neca + '2022/05/predator-2-7-scale-action-figure-ultimate-boar-predator/',
  warrior: neca + '2022/01/predator-2-7-scale-action-figure-ultimate-warrior-predator-30th-anniversary/',
  stalker: neca + '2020/06/predator-2-7-scale-action-figure-ultimate-stalker-predator/',
  shaman: neca + '2022/02/predator-7-scale-action-figure-ultimate-shaman/',
  viper: 'https://store.necaonline.com/blogs/news/action-figure-update-predators-series-12-line-up-is-changing',
  fugitive: neca + '2018/06/predator-2018-7-scale-action-figure-ultimate-predator/',
  assassin: neca + '2021/03/predator-2018-7-scale-action-figure-deluxe-ultimate-assassin-predator-unarmored/',
  guardian: 'https://store.necaonline.com/blogs/news/174244039-1-4-scale-predators-series-2-action-figures-guardian-unmasked-city-hunter',
  lasershot: 'https://store.necaonline.com/blogs/news/shipping-this-week-ultimate-lasershot-predator-8-cloth-new-nightmare-freddy-and-restocks-of-the-life-size-groot-flasher-gremlins-and-e-t-stunt-puppets-1',
  falconer: neca + '2012/11/closer-look-predators-series-7-camo-cloaked-falconer-predator/',
  feral: 'https://lumiere-a.akamaihd.net/v1/documents/prey_final_production_notes_bios_59_82be4e25.pdf',
  snake: neca + '2022/07/predator-2-7-scale-action-figure-ultimate-snake/',
  ahab: 'https://store.necaonline.com/blogs/news/shipping-this-week-ultimate-ahab-ultimate-dream-sequence-jason-and-chucky-thanos-groot-head-knockers-1',
  series18: 'https://store.necaonline.com/blogs/news/shipping-this-week-predator-series-18-aliens-ultimate-warriors-chucky-body-knocker-and-ultimate-chucky-restock-1',
};
const overrides = new Map();
function bind(ids, family, label, equipment, sourceKey, basis, evidence = 'attested-equipment') {
  for (const id of ids) overrides.set(id, { family, label, equipment, evidence,
    sourceUrls: sourceKey ? [sources[sourceKey]] : [], basis });
}
bind(['jungle-hunter'], 'plasma', 'Dernière mesure', ['shoulder-plasma'], 'jungle', 'Canon et effet documentés par NECA. La variante duel final retire explicitement le canon.');
bind(['city-hunter'], 'disc', 'Retour de chasse', ['smart-disc'], 'city', 'Disque fourni à City Hunter par le fabricant licencié ; pas un accessoire transposé de Boar.');
bind(['user-boar'], 'disc', 'Orbites du sanglier', ['smart-disc'], 'boar', 'Disque attesté dans le kit Boar.');
bind(['user-warrior'], 'staff', 'Mesure du guerrier', ['spear'], 'warrior', 'Lance documentée. Aucun pouvoir associé au nom Warrior.');
bind(['user-stalker'], 'disc', 'Retour silencieux', ['smart-disc'], 'stalker', 'Combi sticks et disques documentés pour Stalker Lost Tribe ; pas Stalker Kenner.');
bind(['user-shaman'], 'ritual', 'Le cercle se referme', [], 'shaman', 'Tenue et bâton rituels documentés ; conclusion corporelle, aucun pouvoir occulte ni lame ajoutée.');
bind(['user-viper'], 'blades', 'Croisement des gantelets', ['wrist-blades'], 'viper', 'Lames aux deux avant-bras expressément décrites pour Viper.');
bind(['user-fugitive'], 'blades', 'Dernier passage', ['wrist-blades'], 'fugitive', 'Lames de poignet documentées pour Fugitive.');
bind(['user-assassin'], 'heavy', 'Masse sans armure', [], 'assassin', 'Contact massif ; ne convertit pas son canon de poignet en canon d’épaule.');
bind(['user-guardian'], 'staff', 'Seuil du gardien', ['spear'], 'guardian', 'Lance télescopique documentée pour Guardian.');
bind(['user-lasershot'], 'capture', 'Crochet de verrouillage', ['grappling-hook'], 'lasershot', 'Crochet attaché au canon attesté ; représentation de contention, pas laser magique tiré depuis son œil.');
bind(['falconer'], 'drone', 'Veille puis entaille', ['recon-drone', 'wrist-blades'], 'falconer', 'Drone mécanique de reconnaissance et lames ; le drone n’est pas armé.');
bind(['feral-hunter'], 'bolt', 'Trois lignes de fuite', ['bolt-launcher'], 'feral', 'Carreaux distingués du plasma dans les notes officielles de Prey ; pas de canon d’épaule.');
bind(['user-snake'], 'blades', 'Croisement des faux', ['double-hand-scythes'], 'snake', 'Deux faux à main attestées par NECA pour Snake Lost Tribe ; aucune transposition à Stalker Kenner.');
bind(['user-ahab'], 'staff', 'Mesure de l’Ingénieur', ['spear'], 'ahab', 'Lance et Engineer Gun attestés dans le produit licencié. La séquence ne fabrique pas un tir ni une forme de fusil absente du sprite.');
bind(['user-hornhead'], 'staff', 'Le cercle de la lame', ['sword'], 'series18', 'Épée attestée pour Hornhead dans la série 18 ; la forme d’arme n’est pas redessinée génériquement.');
bind(['user-broken-tusk'], 'blades', 'Longue garde du clan', ['long-blade'], 'series18', 'Arme et longue lame attestées pour Broken Tusk ; aucun canon d’épaule déduit de son nom.');
// Existing individual workbook/consumer treatments: equipment is a design source, not newly certified canon.
bind(['scar'], 'staff', 'Passage du jeune sang', ['combistick'], null, 'Classeur V54 et kit individuel AVP. Pas de marque ni de mort narrative imposée.', 'identity-derived');
bind(['celtic'], 'capture', 'Fermeture du filet', ['net'], null, 'Classeur V54 : lance-filet de Celtic. Neutralisation originale, pas survie canonique après Grid.', 'identity-derived');
bind(['wolf'], 'blades', 'Dernier nettoyage', ['wrist-blades'], null, 'Conclusion de contact : pas de canon ajouté à un costume du dernier duel ni de liquide renommé poison.', 'identity-derived');
bind(['scarface'], 'counter', 'Riposte de Neonopolis', [], null, 'Contact rapproché ; arsenal non déverrouillé par chapitre jamais ajouté automatiquement.', 'identity-derived');
bind(['berserker'], 'heavy', 'Mesure du briseur', [], null, 'Choc physique au contact, aucune onde sismique à distance.', 'identity-derived');
bind(['valkyrie'], 'heavy', 'Jugement de l’appui', [], null, 'Percussion corporelle tant que le marteau natif de finition n’est pas livré ; aucune glace/ailes.', 'identity-derived');
bind(['witch'], 'ritual', 'Dernière veille', [], null, 'Approche et conclusion physiques ; ni malédiction ni magie déduites du nom.', 'identity-derived');
bind(['enforcer'], 'capture', 'Arrêt du contrevenant', [], null, 'Contention de duel hors canon ; aucune arme non mesurée introduite.', 'identity-derived');
bind(['tracker'], 'hound', 'Rappel de la réserve', ['reserve-hound'], null, 'Compagnon natif V57 existant et rappel ; aucun chien modifié de 2018.', 'identity-derived');
bind(['greyback'], 'ritual', 'Le jugement de l’Ancien', [], null, 'Sommation et retrait dignes ; le silex reste un trophée, jamais un pistolet de combat.', 'identity-derived');
bind(['theta'], 'counter', 'Contre de la survivante', [], null, 'Humaine : esquive/riposte sans force yautja, masque ni technologie ajoutée.', 'identity-derived');
bind(['machiko-noguchi'], 'capture', 'Fin de l’épreuve du clan', [], null, 'Humaine : contrôle corporel adapté à sa tenue de clan ; aucune physiologie yautja.', 'identity-derived');
bind(['machiko-noguchi'], 'capture', 'Fin de l’épreuve du clan', ['rifle'], 'series18', 'Rifle attesté dans le produit licencié Machiko. Conclusion de contrôle humaine ; pas de tir ou fusil procédural ajouté à un costume qui ne le porte pas.');
bind(['stone-heart'], 'heavy', 'Appui du colosse', [], null, 'Poings et masse du modèle individuel ; pas laser ou régénération inventés.', 'identity-derived');
bind(['kok-warlord'], 'heavy', 'L’ordre de la fosse', [], null, 'Contact ; armes précises non relevées dans le film, aucune onde magique.', 'identity-derived');
bind(['original-arid-ermit-yautja'], 'counter', 'Mesure de l’ermite', [], null, 'Création utilisateur V56 : riposte corporelle, biographie canonique inconnue.', 'original-contact');
bind(['original-mutated-yautja'], 'heavy', 'Pression de l’altéré', [], null, 'Création utilisateur V56 : contact lourd, sans régénération inventée.', 'original-contact');
bind(['guest-amengi-female'], 'sweep', 'Décrochage de l’Amengi', [], null, 'Dessins et nom fournis : allonge de contact adaptée, anatomie/espèce non certifiées.', 'original-contact');
const workbook = JSON.parse(await fs.readFile('docs/v56-excel-priorities.json', 'utf8'));
const p0 = new Map(workbook.p0Specifications.map(item => [item.fighterId, item]));
const originalFamilies = ['capture', 'sweep', 'rush', 'counter', 'ritual', 'heavy'];
const hash = value => [...value].reduce((sum, char) => (Math.imul(sum, 33) ^ char.charCodeAt(0)) >>> 0, 5381);
const profiles = PIT_VERSUS_FIGHTER_IDS.map(id => {
  const definition = PIT_FIGHTERS[id], variants = getPitFighterVariants(id), defaultArt = variants[0];
  const seed = hash(id + ':' + (defaultArt?.id ?? definition.name)), override = overrides.get(id);
  const family = override?.family ?? originalFamilies[seed % originalFamilies.length];
  const cells = p0.get(id)?.identity?.cells;
  const sourceFiles = ['app/game/systems/pitCombat.ts'];
  if (cells) sourceFiles.push('docs/v56-excel-priorities.json#' + p0.get(id).identity.range);
  if (defaultArt) sourceFiles.push(defaultArt.sourceArchive + '#' + defaultArt.sourceEntry);
  const result = {
    fighterId: id,
    label: override?.label ?? `Composition de contact · ${definition.name}`,
    family,
    equipment: override?.equipment ?? [],
    evidence: override?.evidence ?? 'original-contact',
    sourceUrls: override?.sourceUrls ?? [],
    sourceFiles,
    basis: override?.basis ?? 'Silhouette fournie conservée. Chorégraphie corporelle originale du jeu ; ni arme, pouvoir, clan ou éthique canonique déduits du nom ou du profil partagé.',
    gesture: seed % 7,
    approachMs: 800 + (seed % 5) * 90,
    signatureMs: 1300 + (seed % 7) * 120,
    settleMs: 800 + (seed % 4) * 100,
    appearance: defaultArt ? { src: defaultArt.src, sha256: defaultArt.sha256, variantId: defaultArt.id } : { consumer: 'existing-native-combat-bank', fighterId: id },
    canonical: false,
    nativeFinisherAnimation: false,
  };
  return result;
});
assert.equal(new Set(profiles.map(p => p.fighterId)).size, 201);
const output = { schemaVersion: 1, version: 'V80', policy: 'Final KO presentation only; no canon death, damage, saves, statistics or replay events. Shared corporeal recipes are declared compositions, not 201 authored animation kits.', sourcesCheckedAt: '2026-10-03', profiles };
const target = 'app/game/data/pitFinishersV80.json', bytes = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(await fs.readFile(target, 'utf8'), bytes);
else await fs.writeFile(target, bytes, { flag: process.argv.includes('--update') ? 'w' : 'wx' });
console.log(JSON.stringify({ file: target, total: profiles.length, evidence: Object.fromEntries(['attested-equipment','identity-derived','original-contact'].map(e => [e, profiles.filter(p => p.evidence === e).length])), families: Object.fromEntries([...new Set(profiles.map(p => p.family))].map(f => [f, profiles.filter(p => p.family === f).length])), nativeFinisherAnimations: 0 }));
