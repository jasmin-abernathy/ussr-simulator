import test from 'node:test';
import assert from 'node:assert/strict';
import {ANTHEM_END_SECONDS, anthemClipFinished} from '../web/anthem-clip.js';

test('the fragment ends after the first instrumental refrain',()=>{
  assert.equal(ANTHEM_END_SECONDS,38);
  for(const time of [0,10,20,30,37,37.5])assert.equal(anthemClipFinished(time),false);
  for(const time of [37.75,38,39,76])assert.equal(anthemClipFinished(time),true);
  for(const time of [NaN,Infinity,-Infinity,'76'])assert.equal(anthemClipFinished(time),false);
});
