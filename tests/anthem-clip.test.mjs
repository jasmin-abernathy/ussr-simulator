import test from 'node:test';
import assert from 'node:assert/strict';
import {ANTHEM_END_SECONDS, anthemClipFinished} from '../web/anthem-clip.js';

test('the excerpt retains the introduction and ends at the first refrain cadence',()=>{
  assert.equal(ANTHEM_END_SECONDS,76);
  for(const time of [0,10,20,30,38,45,60,75.5])assert.equal(anthemClipFinished(time),false);
  for(const time of [75.75,76,77,78])assert.equal(anthemClipFinished(time),true);
  for(const time of [NaN,Infinity,-Infinity,'76'])assert.equal(anthemClipFinished(time),false);
});
