import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANTHEM_END_SECONDS, anthemClipFinished} from '../web/anthem-clip.js';

test('French-language Internationale stops after first refrain at about 47 percent',()=>{
 assert.equal(ANTHEM_END_SECONDS,70);
 for(const time of [0,10,38,60,69.5])assert.equal(anthemClipFinished(time),false);
 for(const time of [69.75,70,76,148])assert.equal(anthemClipFinished(time),true);
 for(const time of [NaN,Infinity,-Infinity,'70'])assert.equal(anthemClipFinished(time),false);
});
test('public player retains French recording while rewarding at the first refrain',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 const runtimeClip=readFileSync(new URL('../web/runtime-anthem-v15/anthem-clip.js',import.meta.url),'utf8');
 assert.match(html,/The_Internationale_%28French_Version%29\.flac\.mp3/);
 assert.match(html,/Version chantée en français · CC0/);
 assert.equal(runtimeClip.includes('ANTHEM_END_SECONDS = 70'),true);
 assert.match(app,/if \(rewardedThisListen \|\| !anthemClipFinished\(anthemAudio.currentTime\)\) return/);
 assert.match(app,/Camaraderie renforcée/);
});
