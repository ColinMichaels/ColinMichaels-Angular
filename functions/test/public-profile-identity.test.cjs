const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  CREATOR_PROFILE_URLS,
  PERSON_AWARDS,
  PERSON_KNOWS_ABOUT,
  PERSON_OCCUPATIONS,
  PERSON_PROFILE_DESCRIPTION,
  PERSON_SAME_AS,
  CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID,
  CAPTAIN_COLIN_YOUTUBE_CHANNEL_URL,
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_CHANNEL_URL,
  YOUTUBE_SUBSCRIBE_URL,
} = require('../lib/seo-site.js');

const indexPath = path.resolve(__dirname, '../../src/index.html');
const angularIdentityPath = path.resolve(__dirname, '../../src/app/shared/seo/site-identity.ts');

test('keeps the primary Colin Michaels and Captain Colin identities aligned across builds', () => {
  const angularIdentity = readFileSync(angularIdentityPath, 'utf8');

  assert.equal(YOUTUBE_CHANNEL_ID, 'UCCJMwxuUIb6S4aoZiZeAVeQ');
  assert.equal(YOUTUBE_CHANNEL_URL, `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`);
  assert.equal(YOUTUBE_SUBSCRIBE_URL, `${YOUTUBE_CHANNEL_URL}?sub_confirmation=1`);
  assert.equal(CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID, 'UCKZ3E88t-BoUqPgZygJw6bA');
  assert.equal(
    CAPTAIN_COLIN_YOUTUBE_CHANNEL_URL,
    `https://www.youtube.com/channel/${CAPTAIN_COLIN_YOUTUBE_CHANNEL_ID}`,
  );
  assert.match(angularIdentity, /UCCJMwxuUIb6S4aoZiZeAVeQ/);
  assert.match(angularIdentity, /UCKZ3E88t-BoUqPgZygJw6bA/);
});

test('uses the verified active Instagram identity in the Functions entity graph', () => {
  assert.equal(CREATOR_PROFILE_URLS.instagram, 'https://www.instagram.com/colinmichaels/');
  assert.deepEqual(PERSON_SAME_AS, [
    'https://www.youtube.com/channel/UCCJMwxuUIb6S4aoZiZeAVeQ',
    'https://www.instagram.com/colinmichaels/',
    'https://github.com/ColinMichaels',
    'https://www.linkedin.com/in/colinmichaels',
  ]);
  assert.ok(PERSON_SAME_AS.every(url => new URL(url).protocol === 'https:'));
});

test('keeps the physical homepage Person graph aligned with the active profile contract', () => {
  const indexHtml = readFileSync(indexPath, 'utf8');
  const jsonLdMatch = indexHtml.match(
    /<script id="seo-json-ld" type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
  );

  assert.ok(jsonLdMatch, 'physical homepage JSON-LD must exist');
  const graph = JSON.parse(jsonLdMatch[1])['@graph'];
  const person = graph.find(node => node['@type'] === 'Person');

  assert.deepEqual(person.sameAs, [...PERSON_SAME_AS]);
  assert.deepEqual(person.award, [...PERSON_AWARDS]);
  assert.equal(person.description, PERSON_PROFILE_DESCRIPTION);
  assert.match(person.description, /recording and mixing engineer/i);
  assert.deepEqual(person.hasOccupation, [...PERSON_OCCUPATIONS]);
  assert.deepEqual(person.knowsAbout, [...PERSON_KNOWS_ABOUT]);
  assert.ok(person.knowsAbout.includes(
    'Recording engineering, mixing, album production, and music production workflows',
  ));
  assert.doesNotMatch(indexHtml, /captaincolinfpv/i);
});
