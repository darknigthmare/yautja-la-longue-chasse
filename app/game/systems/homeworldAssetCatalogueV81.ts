import target from '../data/homeworldAssetCatalogueTargetV81.json';

export type HomeworldAssetGapStatusV81='EXISTING_GOOD'|'EXISTING_NEEDS_VARIANT'|'EXISTING_WRONG_SCALE'|'EXISTING_WRONG_FUNCTION'|'MISSING'|'MISSING_ORIENTATION'|'MISSING_ANIMATION'|'REPLACE'|'REMOVE';
type CatalogueRecord={id:string;label:string;category:string;asset:string|null};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
/** These are conservative family candidates, not automatic claims that an
 * atlas cell supplies the requested independent silhouette, angle or motion.
 * Exact matching is followed by human-facing requirements in the gap report. */
const aliases:readonly [RegExp,RegExp][]=[
 // Specialized functions may not borrow an unrelated broad family. A bridge
 // source cannot satisfy an elevator; a creature illustration is not a cage.
 [/ascenseur/,/elevator|ascenseur|lift-native/],
 [/tunnel/,/tunnel/], [/balcon/,/balcony|balcon/], [/hangar/,/hangar/],
 [/champ energetique|emetteur|porte energetique|barriere energie/,/energy-barrier|energy-field|emitter|energetique/],
 [/grue|gantry|bras mecanique|treuil|palan/,/gantry|crane|grue|mechanical-arm|winch|hoist/],
 [/enclos/,/enclosure|enclos/], [/nourrisseur|mangeoire/,/feeder|nourrisseur|mangeoire/],
 [/harnais/,/harness|harnais/], [/selle/,/saddle|selle/], [/cage/,/cage/],
 [/abreuvoir/,/trough|abreuvoir/], [/signal danger/,/danger|warning/],
 [/generateur/,/generator|generateur/], [/transformateur/,/transformer|transformateur/],
 [/radiateur/,/radiator|radiateur/], [/pompe/,/pump|pompe/], [/valve/,/valve/],
 [/tuyau/,/pipe|tuyau/], [/drainage|caniveau/,/drain|caniveau/], [/trappe/,/hatch|trappe/],
 [/echafaudage/,/scaffold|echafaudage/], [/pile scrap/,/scrap/],
 [/totem/,/totem/], [/crochet/,/hook|crochet/], [/chaine/,/chain|chaine/],
 [/plante|arbuste|fourre|vegetation|espece cotiere/,/plant|vegetation|flora|shrub/],
 [/fondation|socle|plateforme|terrasse|pont|passerelle|escalier|rampe|ascenseur|tunnel|arche|parapet|balustrade|garde-corps/,/foundation|plinth|base|socle|platform|plateforme|terrasse|terrace|bridge|viaduct|stair|escalier|ramp|lift|connector|gateway|portique|retaining|soutenement/],
 [/mur|angle|contrefort|poutre|colonne|pilier|console|linteau|corniche|balcon|toit|creneau/,/wall|mur|corner|retaining|pillar|pilier|column|colonne|console|panel|panneau|civic-identity|civic-furniture/],
 [/porte|seuil|entree|sas|grille/,/door|porte|threshold|seuil|gateway|gate|dock-control|hangar|entrance|building|maison|residence|palace|royal|council/],
 [/barriere|emetteur|champ energetique|poteau|^gate$|extremite/,/barrier|barriere|rail|garde-corps|retaining|wall|mur|canyon|beacon|balise/],
 [/habitation|logement/,/house|residence|housing|maison|foyer|lodge|refuge/],
 [/salle clanique|maison de delegation|archives|registre|justice|conseil|ceremoniel|trophees|mausolee|armurerie|forge|atelier|marche|entrepot|poste de garde|bastion|infirmerie|soins|entrainement|arene|dock control|hangar|atelier skiff/,/clan|archive|memory|registre|council|rite-sanctum|royal|trophy|mausoleum|armory|forge|workshop|market|store|depot|guard|bastion|healer|soin|training|pit-gate|dock-control|shuttle/],
 [/banc|assise|siege|seat|tabouret|repos|trone/,/bench|banc|seat|siege|throne|trone|clan-table|table commune/],
 [/table|etabli/,/table|worktable|etabli|forge-workstation|market-stall|lectern/],
 [/caisse|conteneur|coffre|rack|casier|etagere|support outils|zone de stock/,/cargo|case|crates|container|chest|coffre|rack|shelf|storage|sealed|atelier|equipment/],
 [/forge active|foyer|enclume|refroidissement|stock metal|pieces suspendues|chaleur|cheminee|brasier|brasero|support armure|support masque|support arme/,/forge|brazier|brasero|workstation|worktable|maintenance|rack|basin|mineral|mask|weapon|armour/],
 [/stall|stand|auvent|presentoir|marchand/,/market-stall|canopy|merchant|marche|auvent|presentoir|cargo|clothing-rack|table/],
 [/banniere|mat|totem|glyph|lectern|monument|statue|trophee|biomask|crane|crochet|chaine|vitrine|cabinet/,/banner|banniere|standard|glyph|signal|lectern|statue|warrior|memorial|trophy|trophee|mask|weapon|rack|chest|coffre/],
 [/balise|landing light|borne dock|clamp|navette|gantry|grue|bras mecanique|chariot|cart|fuel|energy|energie|maintenance|skiff|depart|arrivee|controle|antenne/,/beacon|balise|lamp|light|dock|shuttle|navette|gantry|cargo|cart|chariot|maintenance|skiff|signal|depart|arrivee|console|control/],
 [/lampadaire|lampe|eclairage|borne|bollard|marqueur|signal|plaque|drainage|caniveau|trappe|joint|ventilation|conduit|cable/,/lamp|lantern|light|balise|beacon|banner|glyph|signal|pavement|pavage|panel|panneau|vent|cable|conduit|machinery|industrial/],
 [/rocher|roche|affleurement|basalte|basaltique|fracturee|volcanique|fissure|craquele|event|coulee|cristal|mineral|cendre/,/rock|roche|basalt|basalte|cinder|cendre|lava|lave|mineral|crystal|ground|outskirts|landscape/],
 [/plante|arbuste|fourre|vegetation|espece cotiere/,/plant|vegetation|flora|coast|outskirts|cinder/],
 [/enclos|nourrisseur|harnais|dressage|cage|fosse|danger|attache|selle|monte|mangeoire|soin/,/fauna|habitat|cage|mount|monture|horse|harnais|training|dressage|danger|observation|healer/],
 [/reparation|recupere|renforcee|bricolee|tuyau|usee|recuperation|scrap|tole|pauvre|endommage|echafaudage/,/under|lower|refuge|maintenance|recovery|industrial|workshop|rack|machinery|panel/],
 [/generateur|transformateur|radiateur|pompe|reservoir|cuve|valve|technique|treuil|palan|rail|industriel/,/machinery|industrial|maintenance|cistern|water|rack|cargo|convoy|workstation/],
 [/garde/,/guard|garde|enforcer/],
];
export const HOMEWORLD_ASSET_CATALOGUE_TARGET_V81=target.entries;
export function auditHomeworldAssetCatalogueV81(records:readonly CatalogueRecord[],installedSources:readonly string[]=[]){
 const live=records.filter(r=>r.asset&&r.category!=='panel'&&!r.label.startsWith('Ancienne vue conservée'));
 return target.entries.map(entry=>{
  const key=normalize(entry.label),alias=aliases.find(([pattern])=>pattern.test(key))?.[1];
  const direct=live.filter(r=>normalize(r.label).includes(key)||normalize(r.id).includes(key.replaceAll(' ','-')));
  const matches=direct.length?direct:alias?live.filter(r=>alias.test(normalize(r.id+' '+r.label+' '+r.asset))):[];
  // Limit candidate families: a broad civic-building list is evidence of a
  // related source, never proof that all 22 target buildings are delivered.
  const sourceCandidates=[...new Set(matches.map(r=>r.asset!))];
  const installed=installedSources.filter(s=>alias?.test(normalize(s))&&!sourceCandidates.includes(s));
  const left=sourceCandidates.some(s=>/left|gauche/.test(s)),right=sourceCandidates.some(s=>/right|droite/.test(s));
  const oriented=/diagonal|gauche|droite|laterale/.test(key);
  const status:HomeworldAssetGapStatusV81=!matches.length&&!installed.length?'MISSING':oriented&&(!left||!right)?'MISSING_ORIENTATION':/active|energetique|energetie/.test(key)?'MISSING_ANIMATION':'EXISTING_NEEDS_VARIANT';
  return{...entry,status,sourceCandidates:sourceCandidates.slice(0,8),sourceCandidateCount:sourceCandidates.length,installedOnlyCandidates:installed.slice(0,4),consumerIds:matches.map(r=>r.id).slice(0,8),consumerCount:matches.length,
   missingOrientations:oriented?[...(!left?['native-left']:[]),...(!right?['native-right']:[])]:[],
   assessment:status==='MISSING'?'Aucun équivalent de famille trouvé dans les consommateurs/copies Homeworld inventoriés ; un sprite indépendant doit être produit.':status==='MISSING_ORIENTATION'?'Une famille existe, mais les vues natives gauche/droite du besoin ne sont pas toutes établies.':status==='MISSING_ANIMATION'?'Une représentation statique ne prouve pas le cycle animé demandé.':'Équivalents de famille repérés ; indépendance, silhouette spécifique, fidélité et variantes 4–8 restent à vérifier visuellement. Aucun EXISTING_GOOD automatique.',
  };
 });
}
