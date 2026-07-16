const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createPostPollResults,
  normalizePostPollCounts,
  parsePostPollDefinition,
} = require('../lib/post-polls.js');

const definitionBlock = {
  id: 'poll-1',
  type: 'poll',
  data: {
    question: 'Which topic is next?',
    description: 'Choose one.',
    pollOptions: [
      {id: 'angular', label: 'Angular'},
      {id: 'firebase', label: 'Firebase'},
    ],
    pollResultsVisibility: 'afterVote',
  },
};

test('parses a valid poll from a stored post block', () => {
  assert.deepEqual(parsePostPollDefinition({blocks: [definitionBlock]}, 'poll-1'), {
    id: 'poll-1',
    question: 'Which topic is next?',
    description: 'Choose one.',
    options: [
      {id: 'angular', label: 'Angular'},
      {id: 'firebase', label: 'Firebase'},
    ],
    resultsVisibility: 'afterVote',
  });
});

test('rejects missing questions and fewer than two unique options', () => {
  assert.equal(parsePostPollDefinition({blocks: [{...definitionBlock, data: {
    question: '',
    pollOptions: [{id: 'one', label: 'One'}],
  }}]}, 'poll-1'), null);
});

test('rejects option ids that cannot be used as callable or Firestore identifiers', () => {
  assert.equal(parsePostPollDefinition({blocks: [{...definitionBlock, data: {
    question: 'Which topic is next?',
    pollOptions: [
      {id: 'contains/slash', label: 'Invalid'},
      {id: 'firebase', label: 'Firebase'},
    ],
  }}]}, 'poll-1'), null);
});

test('rejects polls without two uniquely labeled answers', () => {
  assert.equal(parsePostPollDefinition({blocks: [{...definitionBlock, data: {
    question: 'Which topic is next?',
    pollOptions: [
      {id: 'first', label: 'Same answer'},
      {id: 'second', label: 'same answer'},
    ],
  }}]}, 'poll-1'), null);
});

test('normalizes active counts and computes directly labeled percentages', () => {
  const definition = parsePostPollDefinition({blocks: [definitionBlock]}, 'poll-1');
  assert.ok(definition);

  const counts = normalizePostPollCounts({angular: 3, firebase: 1, removed: 10}, definition.options);
  assert.deepEqual(counts, {angular: 3, firebase: 1});
  assert.deepEqual(createPostPollResults(definition, counts, 'angular', true), {
    pollId: 'poll-1',
    selectedOptionId: 'angular',
    resultsVisible: true,
    totalResponses: 4,
    options: [
      {id: 'angular', label: 'Angular', count: 3, percent: 75},
      {id: 'firebase', label: 'Firebase', count: 1, percent: 25},
    ],
  });
});

test('does not expose result counts when visibility is denied', () => {
  const definition = parsePostPollDefinition({blocks: [definitionBlock]}, 'poll-1');
  assert.ok(definition);

  assert.deepEqual(createPostPollResults(definition, {angular: 3, firebase: 1}, null, false), {
    pollId: 'poll-1',
    selectedOptionId: null,
    resultsVisible: false,
    totalResponses: 0,
    options: [],
  });
});
