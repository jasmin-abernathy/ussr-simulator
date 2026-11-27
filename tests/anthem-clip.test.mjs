import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANTHEM_END_SECONDS, anthemClipFinished} from '../web/anthem-clip.js';

test('new French-language Internationale runs for the full 2m28 recording',()=>{
 assert.equal(ANTHEM_END_SECONDS,148);
 for(const time of [0,10,38,76,100,130,147.5])assert.equal(anthemClipFinished(time),false);
 for(const time of [147.75,148,149])assert.equal(anthemClipFinished(time),true);
 for(const time of [NaN,Infinity,-Infinity,'148'])assert.equal(anthemClipFinished(time),false);
});
test('public player selects the French recording rather than the older solo piano',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
 assert.match(html,/The_Internationale_%28French_Version%29\.flac\.mp3/);
 assert.match(html,/Version chantée en français · CC0/);
 assert.doesNotMatch(html,/Special:Redirect\/file\/L%27internationale\.ogg/);
 assert.match(app,/anthemAudio\.ended && Number\.isFinite\(anthemAudio\.duration\)/);
 assert.match(app,/Camaraderie renforcée/);
});
