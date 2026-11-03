import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/game/Mausoleum.tsx',import.meta.url),'utf8');
test('mausoleum uses physical-key tracking without target-driven animation restarts',()=>{
 assert.match(source,/controlKeyCodeFromInput\(event\.nativeEvent\)/);
 assert.match(source,/heldKeys\.current\.press\(code/);assert.match(source,/heldKeys\.current\.release\(code\)/);
 assert.match(source,/\[blocked, stopMovement\]/);assert.doesNotMatch(source,/\[blocked, target\]/);
});
test('focus loss pauses rituals and the gamepad instead of completing an unseen visit',()=>{
 assert.match(source,/const paused = suspended \|\| !pageActive/);
 assert.match(source,/useMenuGamepad\(root, !paused/);
 assert.match(source,/if \(!pageActivitySnapshotV94\(\) \|\| !clock\.finish\(phase, timing\.token\)\) return/);
 assert.match(source,/clock\.pause\(performance\.now\(\)\)/);
});
test('movement keys cannot steal native button activation',()=>{
 assert.match(source,/event\.target !== event\.currentTarget/);
 assert.match(source,/onBlur=\{event => \{ if \(event\.target === event\.currentTarget \|\| !event\.currentTarget\.contains/);
});
test('the existing Homeworld loader delegates to the bounded native verifier',()=>{
 const hook=readFileSync(new URL('../app/game/useHomeworldMotionAssetsV74.ts',import.meta.url),'utf8');
 assert.match(hook,/return preloadNativeImagesV94\(\{sources:resources\(youth,additionalSources\),reload,onProgress\}\)/);
 assert.match(hook,/return useNativeImageAssetsV94\(resources\(youth,additionalSources\)\)/);
 const shared=readFileSync(new URL('../app/game/useNativeImageAssetsV94.ts',import.meta.url),'utf8');
 assert.match(shared,/preload\.cancel\(\)/);assert.match(shared,/ready: false, error: null, loaded: 0, total, retry/);
});
test('consultation still does not unlock or launch an uninstalled DLC',()=>{
 assert.match(source,/disabled title=\{selected\.unavailableReason\}>Lancer la chronique/);
 assert.match(source,/persisted = onProgress\?\.\(next\) === true/);
 assert.match(source,/saveVisit\(selected\.id, "consulted"\)/);
});

test('native image hook keys its effect by serialized metadata, not array identity',()=>{
 const hook=readFileSync(new URL('../app/game/useNativeImageAssetsV94.ts',import.meta.url),'utf8');
 assert.match(hook,/\[serializedSources, attempt, key\]/);
 assert.match(hook,/JSON.parse\(serializedSources\)/);
 assert.match(hook,/progress.key === key/);
});
