import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {archivePlaqueRouteV109} from './helpers/archive-plaque-v109-route.mjs';

const journey=archivePlaqueRouteV109(),initial=structuredClone(journey.state());
const record=journey.qa.load('app/game/systems/homeworldArchivePlaqueRecordV110.ts');
const ui=journey.qa.load('app/game/HomeworldArchivePlaqueRecordV110.tsx');
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const post=ledger=>journey.qa.render('app/game/HomeworldArchivePlaqueV109.tsx',{ledger,disabled:false,message:'',onAction:()=>false,onClose(){}});

function parkedOutside(){
  journey.restore(initial);journey.start();journey.walkTo(journey.b.objects[0].stand);
  for(const action of ['observe-plaque','copy-plaque','take-plaque'])journey.action(action);
  journey.walkTo({x:7380,y:5350});journey.action('interrupt',{active:false});journey.action('park');
  return structuredClone(journey.state());
}

test('an actually carried then parked piece stays legible outside the K-17 map without changing its saved coordinates',()=>{
  const state=parkedOutside(),before=JSON.stringify(state.ledger),piece=state.ledger.receipt.objects[0];
  assert.equal(piece.place,'ground');assert(piece.x<record.HOMEWORLD_ARCHIVE_PLAQUE_MAP_V110.left);
  assert(journey.schema.normalizeHomeworldArchivePlaqueV109(state.ledger));
  const rows=record.archivePlaqueRecordsV110(state.ledger),plaque=rows.find(row=>row.id==='plaque');
  assert.equal(plaque.projection.outside,true);assert(plaque.projection.x>piece.x);
  assert.deepEqual(plaque.position,{x:piece.x,y:piece.y});assert.deepEqual(plaque.discoveryPosition,journey.b.objects[0].origin);
  const html=render(ui.ArchivePlaqueMapV110,{ledger:state.ledger,actor:state.actor});
  assert.match(html,/data-plaque-map-object-v109="plaque" data-plaque-map-outside-v110="true"/);
  assert.match(html,/hors cadre du poste/);assert.match(html,/position 7381, 5290/);
  assert.match(html,/data-plaque-map-actor-v110="true" data-plaque-map-outside-v110="true"/);
  assert.equal(JSON.stringify(state.ledger),before);
});

test('the recorded discovery place stays distinct from current placement after moving and parking the actual object',()=>{
  const {ledger}=parkedOutside(),before=JSON.stringify(ledger),rows=record.archivePlaqueRecordsV110(ledger),plaque=rows[0];
  assert(plaque.observed&&plaque.provenanceCopied);assert.notDeepEqual(plaque.position,plaque.discoveryPosition);
  const html=render(ui.ArchivePlaqueProvenanceV110,{ledger,id:'plaque'});
  assert.match(html,/Lieu de découverte observé/);assert.match(html,/Quai oriental · étage 0 · 7760, 5260/);
  assert.match(html,/Lieu copié et conservé avec cette pièce/);assert.match(html,/posé au sol · 7381, 5290/);
  plaque.position.x=0;plaque.discoveryPosition.x=0;
  assert.equal(JSON.stringify(ledger),before,'read-only view models do not expose references into the saved receipt');
  assert.equal(record.archivePlaqueRecordsV110(ledger)[0].discoveryPosition.x,7760,'source definitions are also isolated');
});

test('observation and copied provenance remain separate facts and unrevealed fragment records remain hidden',()=>{
  journey.restore(initial);journey.start();
  let rows=record.archivePlaqueRecordsV110(journey.state().ledger);
  assert.deepEqual(rows.map(row=>row.id),['plaque','trace']);assert(rows.every(row=>!row.observed&&!row.provenanceCopied&&row.discoveryPosition===null));
  let html=render(ui.ArchivePlaqueMapV110,{ledger:journey.state().ledger});
  assert(!html.includes('data-plaque-map-discovery-v110'));assert(!html.includes('data-plaque-map-object-v109="fragment"'));
  journey.walkTo(journey.b.objects[0].stand);journey.action('observe-plaque');
  rows=record.archivePlaqueRecordsV110(journey.state().ledger);assert(rows[0].observed&&!rows[0].provenanceCopied);
  html=render(ui.ArchivePlaqueProvenanceV110,{ledger:journey.state().ledger,id:'plaque'});
  assert.match(html,/7760, 5260/);assert.match(html,/Lieu non copié/);
  journey.action('copy-plaque');assert(record.archivePlaqueRecordsV110(journey.state().ledger)[0].provenanceCopied);
  assert.equal(render(ui.ArchivePlaqueProvenanceV110,{ledger:journey.state().ledger,id:'fragment'}),'');
});

test('the live journal exposes the map, real actor, provenance and preserved point while another floor never aliases the quay',()=>{
  const {ledger,actor}=parkedOutside(),before=JSON.stringify(ledger);
  const journal=journey.qa.load('app/game/HomeworldArchivePlaqueV109.tsx').HomeworldArchivePlaqueJournalV109;
  const props={ledger,actor,blocked:false,writePaused:false,message:'',onAction:()=>false,onRetry(){},onGuide(){}};
  let html=render(journal,props);
  assert.match(html,/Voir les pièces et leurs lieux/);assert.match(html,/data-plaque-map-v110="true"/);
  assert.match(html,/data-plaque-map-actor-v110="true"/);assert.match(html,/Dernier point confirmé : 7381, 5350/);
  assert.match(html,/7760, 5260/);assert.match(html,/ne prouvent ni auteur de l’empreinte, ni lien de lignée/);
  html=render(journal,{...props,actorInStudySpace:false});
  assert(!html.includes('data-plaque-map-actor-v110'));assert.match(html,/Tu es sur un autre étage ou dans un intérieur/);
  assert.match(html,/data-plaque-map-object-v109="plaque"/);assert.equal(JSON.stringify(ledger),before);
});

test('both completed approaches keep only their genuine observed pieces and retain uncertainty in the displayed record',()=>{
  journey.restore(initial);journey.complete('B');const b=structuredClone(journey.state().ledger);
  assert.deepEqual(record.archivePlaqueRecordsV110(b).map(row=>row.id),['plaque','trace']);
  assert(record.archivePlaqueRecordsV110(b).every(row=>row.observed&&row.provenanceCopied&&row.place==='support'));
  assert(!post(b).includes('data-plaque-provenance-v110="fragment"'));
  journey.restore(initial);journey.complete('A');const a=structuredClone(journey.state().ledger),html=post(a);
  assert.equal(record.archivePlaqueRecordsV110(a).length,3);assert.match(html,/data-plaque-provenance-v110="fragment"/);
  assert.match(html,/Candidat conservé à part ; aucune réparation certifiée/);
  assert.match(html,/Les pièces K-17 appartiennent à ce poste/);assert.match(html,/dossiers A\/B et le contenant C/);
});

test('all four outside directions remain projected inside the map while actual coordinates remain available',()=>{
  const f=record.HOMEWORLD_ARCHIVE_PLAQUE_MAP_V110;
  for(const point of [{x:f.left-500,y:f.top+100},{x:f.left+f.width+500,y:f.top+100},{x:f.left+100,y:f.top-500},{x:f.left+100,y:f.top+f.height+500}]){
    const before=structuredClone(point),projection=record.archivePlaqueMapPointV110(point);
    assert(projection.outside);assert(projection.x>f.left&&projection.x<f.left+f.width);assert(projection.y>f.top&&projection.y<f.top+f.height);
    assert.deepEqual(point,before);
  }
});

test('the two older archive interfaces distinguish their sealed dossiers from the K-17 pieces',()=>{
  const archive=journey.qa.load('app/game/systems/homeworldArchiveLedgerV106.ts').defaultHomeworldArchiveV106(journey.owner);
  let html=journey.qa.render('app/game/HomeworldArchiveV106.tsx',{ledger:archive,disabled:false,message:'',onAction:()=>false,onClose(){}});
  assert.match(html,/Ce dépôt concerne les dossiers A\/B/);assert.match(html,/poste K-17 du quai oriental/);
  const comparison=journey.qa.load('app/game/systems/homeworldArchiveComparisonLedgerV107.ts').defaultHomeworldArchiveComparisonV107(journey.owner);
  html=journey.qa.render('app/game/HomeworldArchiveComparisonV107.tsx',{ledger:comparison,disabled:false,message:'',onAction:()=>false,onClose(){},onLegacy(){}});
  assert.match(html,/Le contenant C reste scellé/);assert.match(html,/leurs études et relevés restent distincts/);
});
