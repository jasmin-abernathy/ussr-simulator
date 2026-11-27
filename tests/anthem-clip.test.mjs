import test from 'node:test';
import assert from 'node:assert/strict';
import {ANTHEM_END_SECONDS, anthemClipFinished} from '../web/anthem-clip.js';

test('the fragment ends after the final cadence of the second instrumental refrain',()=>{
  assert.equal(ANTHEM_END_SECONDS,76);
  for(const time of [0,20,40,58,75,75.5])assert.equal(anthemClipFinished(time),false);
  for(const time of [75.75,76,77,78])assert.equal(anthemClipFinished(time),true);
  for(const time of [NaN,Infinity,-Infinity,'76'])assert.equal(anthemClipFinished(time),false);
});
