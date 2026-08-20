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
const {MUSIC_CREDIT_SCHEMA_ENTRIES} = require('../lib/music-credits.js');
const {GADGET_USEFULNESS_SCORECARD_SECTIONS} = require('../lib/gadget-usefulness-scorecard.js');

const indexPath = path.resolve(__dirname, '../../src/index.html');
const angularIdentityPath = path.resolve(__dirname, '../../src/app/shared/seo/site-identity.ts');
const canonicalMusicCreditsPath = path.resolve(__dirname, '../../data/colin-music-credits.json');

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

test('keeps general gadget-resource video links on the Colin Michaels channel', () => {
  const seriesSection = GADGET_USEFULNESS_SCORECARD_SECTIONS.find(
    section => section.heading === 'One recognizable framework across site and channel',
  );
  const youtubeLink = seriesSection?.links?.find(link => link.href.includes('youtube.com'));

  assert.equal(youtubeLink?.href, YOUTUBE_CHANNEL_URL);
  assert.equal(youtubeLink?.label, 'Colin Michaels on YouTube');
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

test('keeps the crawl-time music credit list aligned with the visible canonical credit data', () => {
  const canonicalCredits = JSON.parse(readFileSync(canonicalMusicCreditsPath, 'utf8'));

  assert.deepEqual(
    MUSIC_CREDIT_SCHEMA_ENTRIES,
    canonicalCredits.map(({year, album, artist, credit}) => ({year, album, artist, role: credit})),
  );
});

test('keeps the static homepage award entity anchored to the official Latin GRAMMY result', () => {
  const indexHtml = readFileSync(indexPath, 'utf8');
  const jsonLdMatch = indexHtml.match(
    /<script id="seo-json-ld" type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
  );
  const graph = JSON.parse(jsonLdMatch[1])['@graph'];
  const album = graph.find(node => node['@id'] === 'https://colinmichaels.com/#calle-13-2005-album');

  assert.equal(album['@type'], 'MusicAlbum');
  assert.equal(album.creditText, 'Colin Michaels — Mixing Engineer');
  assert.equal(
    album.subjectOf.url,
    'https://www.latingrammy.com/en/awards/categories/best-urban-music-album/2006/',
  );
});
