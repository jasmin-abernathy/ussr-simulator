import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANTHEM_END_SECONDS, anthemClipFinished} from '../web/anthem-clip.js';

test('French-language Internationale completes after physically trimmed 135-second excerpt',()=>{
 assert.equal(ANTHEM_END_SECONDS,135);
 for(const time of [0,10,60,90,134.5])assert.equal(anthemClipFinished(time),false);
 for(const time of [134.75,135,136,148])assert.equal(anthemClipFinished(time),true);
 for(const time of [NaN,Infinity,-Infinity,'135'])assert.equal(anthemClipFinished(time),false);
});
test('public player plays the 2:15 edited French recording and pays only upon completion',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const runtimeClip=readFileSync(new URL('../web/runtime-anthem-v15/anthem-clip.js',import.meta.url),'utf8');
 assert.match(html,/assets\/internationale-francaise-extrait-135s\.mp3/);
 assert.doesNotMatch(html,/src="https:\/\/upload\.wikimedia\.org/);
 assert.match(html,/Version chantée en français · CC0/);
 assert.equal(runtimeClip.includes('ANTHEM_END_SECONDS = 135'),true);
 assert.match(app,/if \(rewardedThisListen \|\| !anthemClipFinished\(anthemAudio.currentTime\)\) return/);
 assert.match(app,/Camaraderie renforcée/);
});
