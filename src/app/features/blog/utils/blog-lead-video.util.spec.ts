import type {BlogContentBlock} from '../models/blog-post.model';
import {selectBlogLeadVideo} from './blog-lead-video.util';

function video(id: string, url: string, companion = false): BlogContentBlock {
  return {id, type: 'embed', data: {provider: 'youtube', url, isCompanionVideo: companion}};
}

describe('selectBlogLeadVideo', () => {
  it('prefers the editor-selected companion over an earlier reference', () => {
    expect(selectBlogLeadVideo([
      video('reference', 'https://youtu.be/L229QDxDakU'),
      video('companion', 'https://youtu.be/abcdefghijk', true),
    ])?.blockId).toBe('companion');
  });

  it('falls back to the first valid YouTube embed and rejects lookalike hosts', () => {
    expect(selectBlogLeadVideo([
      video('unsafe', 'https://youtube.com.example.com/watch?v=abcdefghijk', true),
      video('first', 'https://youtu.be/L229QDxDakU'),
      video('second', 'https://youtu.be/abcdefghijk'),
    ])?.blockId).toBe('first');
  });

  it('leaves text and non-YouTube content in the normal article layout', () => {
    expect(selectBlogLeadVideo([{id: 'text', type: 'paragraph', data: {text: 'A story'}}])).toBeNull();
    expect(selectBlogLeadVideo([{id: 'app', type: 'embed', data: {provider: 'iframe', url: 'https://example.com'}}])).toBeNull();
  });
});
