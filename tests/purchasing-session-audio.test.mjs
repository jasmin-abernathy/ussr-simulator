import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../web/runtime-anthem-v15/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
test('blocked browser tab offers an explicit recovery action rather than permanently disabling purchases',()=>{
 assert.match(app,/Reprendre la partie sur cet onglet/);
 assert.match(app,/document\.body\.append\(warning\)/);
 assert.match(html,/player-session-repair-2/);
 assert.match(app,/navigator\.locks\.request\(SAVE_KEY,options/);
 assert.match(app,/force\?\{steal:true\}:\{ifAvailable:true\}/);
 assert.match(app,/sessionChannel\?\.postMessage\(\{type:'release-request'\}\)/);
 assert.match(app,/sessionRequested=false;showSessionWarning\(\);return;/);
});
test('the French sung recording is same-origin and the audio element is explicitly unmuted at playback',()=>{
 assert.match(html,/src="\.\/assets\/internationale-francaise\.mp3"/);
 assert.match(app,/anthemAudio\.muted=false/);
 assert.match(app,/anthemAudio\.volume=1/);
 assert.match(app,/ANTHEM_END_SECONDS/);
});
