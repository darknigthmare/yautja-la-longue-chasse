import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {archiveContinuationRouteV111} from './helpers/archive-continuation-v111-route.mjs';

const route=archiveContinuationRouteV111(),initial=structuredClone(route.state());
const Journal=route.qa.load('app/game/HomeworldArchiveContinuationV111.tsx').HomeworldArchiveContinuationJournalV111;
function render(patch={}){
  const state=route.state(),before=JSON.stringify(state),props={...state,actorInStudySpace:true,blocked:false,writePaused:false,message:'',onAction:()=>false,onRetry(){},onGuide(){},...patch};
  const element=Journal(props),html=renderToStaticMarkup(createElement(Journal,props));
  assert.equal(JSON.stringify(route.state()),before,'rendering does not alter the preserved first record or the continuation');
  assert.equal(element.props['aria-label'],'Carnet de la continuation K-17');
  assert.equal(element.props['data-homeworld-continuation-scroll-v111'],true,'the complete journal root owns scrolling');
  assert.equal((html.match(/data-homeworld-continuation-scroll-v111/g)??[]).length,1);
  assert.match(html,/data-homeworld-first-archive-record-v111/);
  assert(!/<details[^>]*\bopen(?:=|\s|>)/.test(html),'a journal does not expand records over the terrain on arrival');
  return {element,html};
}

test('V111 prelude keeps the first record and K17 controls in the same labelled scrollport through the actual offer and consent',()=>{
  route.restore(initial);
  for(const action of [null,'open','choose-a','reply','authorize']){
    if(action)route.action(action);
    const {element,html}=render();
    assert.equal(element.type,'aside');
    assert.match(html,/Rejoindre le poste K-17/);
    assert(!html.includes('data-homeworld-plaque-journal-v109'),'a prelude does not introduce another study journal');
  }
  const {html}=render({writePaused:true,message:'Enregistrement à reprendre.'});
  assert.match(html,/<button disabled="">Rejoindre le poste K-17<\/button>/);
  assert.match(html,/<button>Réessayer l’enregistrement de la continuation<\/button>/);
  assert.match(html,/role="status">Enregistrement à reprendre\./);
});

test('V111 active and interrupted journals group the continuation counter, first record and current study under one scrollport',()=>{
  route.restore(initial);route.start();
  for(const interrupted of [false,true]){
    if(interrupted)route.action('interrupt',{active:false});
    const {element,html}=render();
    assert.equal(element.type,'section');
    const children=element.props.children;
    assert.equal(children[0].type,'p');
    assert.match(html,/Marche de cette nouvelle recherche/);
    assert(children.some(child=>child?.props?.base===route.state().base),'the preserved record belongs to the root scrollport');
    const currentStudy=children.find(child=>child?.props?.ledger);
    assert(currentStudy,'the current study belongs to that same scrollport');
    assert.deepEqual(currentStudy.props.ledger,route.state().ledger.receipt.study);
    assert.match(html,/data-homeworld-plaque-journal-v109/);
    assert.match(html,interrupted?/Reprendre l’étude ici/:/Interrompre et conserver les pièces/);
    assert.match(html,/Afficher le prochain repère à pied/);
    assert.equal((html.match(/aria-label="Carnet de la continuation K-17"/g)??[]).length,1);
  }
});
