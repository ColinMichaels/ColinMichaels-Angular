import {BlogContentBlock} from '../models/blog-post.model';
import {createBlogPostLayoutBlocks} from './blog-block-placement.util';

describe('blog block placement utilities', () => {
  it('moves legacy and rail polls out of the article stream', () => {
    const blocks: readonly BlogContentBlock[] = [
      {id: 'intro', type: 'paragraph', data: {text: 'Introduction'}},
      {id: 'legacy-poll', type: 'poll', data: {question: 'Legacy poll'}},
      {id: 'rail-poll', type: 'poll', data: {question: 'Rail poll', placement: 'rail'}},
    ];

    const result = createBlogPostLayoutBlocks(blocks);

    expect(result.content.map(block => block.id)).toEqual(['intro']);
    expect(result.rail.map(block => block.id)).toEqual(['legacy-poll', 'rail-poll']);
  });

  it('keeps explicitly inline polls in the article and supports future rail blocks', () => {
    const blocks: readonly BlogContentBlock[] = [
      {id: 'inline-poll', type: 'poll', data: {question: 'Inline poll', placement: 'content'}},
      {id: 'rail-stat', type: 'stats', data: {placement: 'rail', title: 'Quick stat'}},
      {id: 'body', type: 'paragraph', data: {text: 'Body copy'}},
    ];

    const result = createBlogPostLayoutBlocks(blocks);

    expect(result.content.map(block => block.id)).toEqual(['inline-poll', 'body']);
    expect(result.rail.map(block => block.id)).toEqual(['rail-stat']);
  });
});
