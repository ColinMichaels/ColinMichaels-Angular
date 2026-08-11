import assert from 'node:assert/strict';
import test from 'node:test';

import {validateFirebaseStorageCors} from './validate-firebase-storage-cors.mjs';

const validRule = {
  origin: ['*'],
  method: ['GET', 'HEAD'],
  responseHeader: ['Content-Type', 'ETag'],
  maxAgeSeconds: 3600,
};

test('accepts the read-only Firebase Storage browser policy', () => {
  assert.deepEqual(validateFirebaseStorageCors([validRule]), [validRule]);
});

test('rejects mutating methods', () => {
  assert.throws(
    () => validateFirebaseStorageCors([{...validRule, method: ['GET', 'PUT']}]),
    /must remain read-only; PUT is not allowed/
  );
});

test('rejects the Cloud Storage JSON API wrapper', () => {
  assert.throws(
    () => validateFirebaseStorageCors({cors: [validRule]}),
    /without a top-level cors wrapper/
  );
});

test('rejects malformed origins and excessive cache lifetimes', () => {
  assert.throws(
    () => validateFirebaseStorageCors([{...validRule, origin: ['colinmichaels.com']}]),
    /invalid HTTP\(S\) origin/
  );
  assert.throws(
    () => validateFirebaseStorageCors([{...validRule, origin: ['https://colinmichaels.com/blog']}]),
    /invalid HTTP\(S\) origin/
  );
  assert.throws(
    () => validateFirebaseStorageCors([{...validRule, maxAgeSeconds: 86401}]),
    /0 through 86400/
  );
});
