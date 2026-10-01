import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const bundle=await build({stdin:{contents:"export * from './app/game/systems/yautjaTranslationV67';export {default as Translation} from './app/game/YautjaTranslationV67';",resolveDir:process.cwd()},bundle:true,write:false,outfile:'translation-test.cjs',format:'cjs',platform:'node',external:['react','react/jsx-runtime'],logLevel:'silent'});
const evaluated={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),evaluated,evaluated.exports);
const api=evaluated.exports;
test('French accents, combined graphemes, punctuation and whitespace survive decorative segmentation exactly',()=>{
 const text='Le maître : « Écoute. »\n\t👩🏽‍🚀 42 — clan';
 const parsed=api.translationWordsV67(text);
 assert.equal(parsed.words.map(word=>word.units.map(unit=>unit.text).join('')).join(''),text);
 assert(parsed.words.flatMap(word=>word.units).some(unit=>unit.text==='î'));
 const huge=api.translationWordsV67('ab '.repeat(1000));assert.equal(huge.symbols,360);
 assert.equal(api.translationWordsV67('a'.repeat(600)).symbols,0,'Unbroken input stays plain and wrap-able');
});
test('decoding timing is bounded, monotone and suspended time never creates a catch-up jump',()=>{
 const duration=api.translationDurationV67(360);assert.equal(duration,1600);
 assert.equal(api.translationDurationV67(0),0);
 let elapsed=0;for(let n=0;n<20;n++){const next=api.advanceTranslationV67(elapsed,80,duration,false);assert(next>=elapsed&&next<=duration);elapsed=next;}
 assert.equal(elapsed,duration);assert.equal(api.advanceTranslationV67(300,20000,duration,true),300);
 assert.equal(api.advanceTranslationV67(300,20000,duration,false),400);
 for(const delta of [-1,NaN,Infinity])assert.equal(api.advanceTranslationV67(300,delta,duration,false),300);
});
test('SSR supplies complete French immediately and hides decorative symbols from assistive technology',()=>{
 const text='Le maître conserve les preuves.';
 const html=renderToStaticMarkup(React.createElement(api.Translation,{text,paused:true}));
 assert.match(html,/lang="fr">Le maître conserve les preuves\.<\/span>/);
 assert.match(html,/aria-hidden="true"/);assert.match(html,/data-translation-paused="true"/);
 assert.match(html,/data-translation-skip/);assert.match(html,/data-youth-control/);
 assert.doesNotMatch(html,/aria-live|autoFocus|autofocus/);
});
test('game reduced-motion and plain text never create an artificial reading barrier or useless skip control',()=>{
 const reduced=renderToStaticMarkup(React.createElement(api.Translation,{text:'Le maître parle.',reducedMotion:true}));
 assert.match(reduced,/data-translation-complete="true"/);assert.doesNotMatch(reduced,/data-translation-skip/);
 const punctuation=renderToStaticMarkup(React.createElement(api.Translation,{text:'… — !'}));
 assert.match(punctuation,/data-translation-complete="true"/);assert.doesNotMatch(punctuation,/<svg|data-translation-skip/);
 assert.equal(renderToStaticMarkup(React.createElement(api.Translation,{text:''})), '');
});
