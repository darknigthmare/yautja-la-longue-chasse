import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const data=JSON.parse(fs.readFileSync('app/game/data/driveCompletionSpritesV87.json','utf8'));
const library=homeworldSceneSsrV78().load('app/game/systems/recentSpriteLibraryV85.ts');
const codex=homeworldSceneSsrV78().load('app/game/systems/recentSpriteCodexV85.ts');
const source=JSON.parse(fs.readFileSync('docs/drive-completion-v87-sources.json','utf8'));
const pinnedArchives=new Map([
 ['1OnTyIl3gog3tvC2H0URFjFKJiIofkjAI',[101449970,'0ae72f543fc540fe1aaef22acef676ce5b409afbcfff067ce31b274d6427bbb2']],
 ['1J0I2wg_xH6L-q82WvBc0UIpbmxwlQKt6',[77027896,'a44e1d6702935b96214acd31c2aecfe3fbe5d4708443f177e8b926f990682a6e']],
 ['1WbaYR26vu42ZSlt_a3uos-SEytJcpO6T',[13979918,'b3f80a3ad46c172be9d0e6ea2739ade0aeb19e463da93649f0f4fba8d3712184']],
 ['13etiHpr4Q1ZbgWM9NswjhFvpq_QIC2TZ',[99997209,'9e19acefda71c5e980e6bb716094074c96368cfc814531371b5464c14515cb55']],
]);
test('native completion covers 72 V65 subjects, 7 V14 additions and 27 historical references, never metadata-only V69 pixels',()=>{
 assert.equal(data.assets.length,106);assert.equal(new Set(data.assets.map(a=>a.sha256)).size,106);
 assert.deepEqual(data.packs.map(p=>p.pngEntriesImported),[40,32,7,27]);
 assert.equal(data.summary.v69NativePixels,0);assert.equal(data.summary.newDistinctPngFiles,106);
 const v65=data.assets.filter(a=>a.version==='V6.5');assert.equal(v65.length,72);
 const groups=new Set(v65.map(a=>a.groupId));assert.equal(groups.size,18);
 for(const id of groups){const members=v65.filter(a=>a.groupId===id);assert.equal(members.length,4);assert.equal(members.filter(a=>a.role==='matriarches').length,2);assert.equal(members.filter(a=>a.role==='chevaucheurs').length,2);}
 for(const a of v65){assert.equal(a.lifeStage,'adult');assert(a.sourceMetadataPath);assert(a.producerInspection);assert.equal(a.bodyComposition,a.role==='chevaucheurs'?'rider-and-mount':'single-individual');}
 for(const [id,receipt] of pinnedArchives){const found=source.sourceReceipts.find(r=>r.id===id);assert.deepEqual([found.bytes,found.sha256],receipt);assert.equal(found.transport,'authenticated-file-uri');}
 assert.equal(source.pixelsModified,false);assert.equal(source.archiveCodeExecuted,false);
});
test('all recovered public PNGs retain exact native bytes and header dimensions',()=>{
 let bytes=0;
 for(const a of data.assets){const content=fs.readFileSync(path.join('public',a.src.slice(1)));assert.equal(content.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(content.length,a.bytes);assert.equal(createHash('sha256').update(content).digest('hex'),a.sha256,a.sourcePath);assert.deepEqual([content.readUInt32BE(16),content.readUInt32BE(20)],[a.width,a.height]);assert.equal(a.animationAvailable,false);assert.equal(a.canonicalFidelity,'not-certified-1-to-1');bytes+=content.length;}
 assert.equal(bytes,252209592);assert.equal(bytes,data.summary.newDistinctPngBytes);
});
test('archive consumer preserves all new records, old mount references remain unavailable as Yautja bodies',()=>{
 for(const a of data.assets){const installed=library.recentSpriteByIdV85(a.id);assert(installed);assert.equal(installed.sha256,a.sha256);assert.equal(installed.kind,a.kind);if(a.kind!=='npc'||a.groupId==='human-accepted'||a.bodyComposition==='rider-and-mount')assert.equal(library.findImportedYautjaArtV85({assetId:a.id,includeHistorical:true}),null);}
 const riders=data.assets.filter(a=>a.bodyComposition==='rider-and-mount');assert.equal(riders.length,36);
 for(const a of riders)assert.deepEqual(library.importedYautjaArtVariantsV85({identityId:a.identityId,includeHistorical:true}),[],'mounted source cannot become an individual body');
 const legacyRiders=library.RECENT_SPRITE_ASSETS_V85.filter(a=>a.kind==='npc'&&!a.bodyComposition&&['chevaucheur','chevaucheurs'].includes(library.normalizeRecentSpriteTextV85(a.role)));assert(legacyRiders.length>=156);
 for(const a of legacyRiders){assert(library.recentSpriteByIdV85(a.id),'legacy source preserved');assert.equal(library.findImportedYautjaArtV85({assetId:a.id,includeHistorical:true}),null);assert.deepEqual(library.importedYautjaArtVariantsV85({identityId:a.identityId,includeHistorical:true}),[]);const entry=codex.RECENT_SPRITE_CODEX_V85.find(c=>c.source.id===a.id);assert(entry.constraints.some(text=>text.includes('Cavalier et monture')));}
 const animals=library.RECENT_SPRITE_ASSETS_V85.filter(a=>a.kind==='npc'&&(/--monture-seule-/.test(a.identityId)||['monture','montures','monture seule'].includes(library.normalizeRecentSpriteTextV85(a.role))));assert(animals.length>=29);
 for(const a of animals){assert(library.recentSpriteByIdV85(a.id),'source preserved');assert.equal(library.findImportedYautjaArtV85({assetId:a.id,includeHistorical:true}),null);assert.deepEqual(library.importedYautjaArtVariantsV85({identityId:a.identityId,includeHistorical:true}),[]);}
 const references=data.assets.filter(a=>a.kind==='reference');assert.equal(references.length,27);assert(references.every(a=>a.bodyComposition==='reference-image'));
 assert(references.some(a=>a.sourceExclusionEvidence.length>0));assert.equal(new Set(references.flatMap(a=>a.sourceAliases)).size,28);
 for(const a of references){const entry=codex.RECENT_SPRITE_CODEX_V85.find(c=>c.source.id===a.id);assert(entry.constraints.some(text=>text.includes('aucun corps de PNJ')));}
 assert(library.RECENT_SPRITE_KINDS_V85.some(k=>k.id==='reference'));
});
test('V14 vulture poses reach the real fauna reference selector through their exact source species',()=>{
 const vultures=library.recentFaunaVariantsV85('vulture');
 for(const id of ['badlands-160','badlands-161'])assert(vultures.some(a=>a.identityId===id&&a.canonicalSubject==='vulture'));
 assert(vultures.every(a=>a.kind==='fauna'));
 for(const id of ['badlands-4','badlands-25'])assert(vultures.some(a=>a.identityId===id),'older vulture pose remains accessible');
 for(const id of ['badlands-7','badlands-8','badlands-20','badlands-21'])assert(library.recentFaunaVariantsV85('exploding-worm').some(a=>a.identityId===id),'documented French explosive-worm label remains accessible');
 const html=homeworldSceneSsrV78().render('app/game/RecentFaunaReferencesV85.tsx',{});
 assert.match(html,/data-recent-fauna-species-v85="Vulture"/);
 for(const a of data.assets.filter(a=>['badlands-160','badlands-161'].includes(a.identityId)))assert(html.includes(a.label));
 // This exact species correction does not collapse the adult/juvenile split.
 assert(library.recentFaunaVariantsV85('kalisk').every(a=>library.normalizeRecentSpriteTextV85(a.label).startsWith('kalisk adulte')));
 assert(library.recentFaunaVariantsV85('bud').every(a=>library.normalizeRecentSpriteTextV85(a.label).startsWith('bud juvenile')));
});
