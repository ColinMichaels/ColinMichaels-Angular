const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

test('loads every deployed function export without eagerly loading Sharp', () => {
  const originalLoad = Module._load;
  let sharpLoadCount = 0;

  Module._load = function trackSharpLoad(request, parent, isMain) {
    if (request === 'sharp') {
      sharpLoadCount += 1;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  let deployedFunctions;
  try {
    deployedFunctions = require('../lib/index.js');
  } finally {
    Module._load = originalLoad;
  }

  assert.equal(sharpLoadCount, 0);
  assert.equal(typeof deployedFunctions.finalizeBlogMedia, 'function');
  assert.equal(typeof deployedFunctions.deleteBlogMedia, 'function');
});
