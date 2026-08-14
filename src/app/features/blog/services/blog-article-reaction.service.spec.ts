import {DOCUMENT} from '@angular/common';
import {PLATFORM_ID} from '@angular/core';
import {TestBed} from '@angular/core/testing';

import {BlogArticleReactionService} from './blog-article-reaction.service';

describe('BlogArticleReactionService', () => {
  let service: BlogArticleReactionService;
  let storage: Storage;

  beforeEach(() => {
    const values = new Map<string, string>();
    storage = {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: key => values.get(key) ?? null,
      key: index => [...values.keys()][index] ?? null,
      removeItem: key => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: DOCUMENT, useValue: {defaultView: {localStorage: storage}}},
        {provide: PLATFORM_ID, useValue: 'browser'},
      ],
    });
    service = TestBed.inject(BlogArticleReactionService);
  });

  it('keeps one anonymous reaction per article on the current device', () => {
    service.setReaction('My-Story', 'useful');
    expect(service.getReaction('my-story')).toBe('useful');

    service.setReaction('my-story', 'more_like_this');
    expect(service.getReaction('MY-STORY')).toBe('more_like_this');
  });

  it('ignores malformed stored values', () => {
    storage.setItem('cm-blog-article-reactions-v1', JSON.stringify({
      valid: 'surprising',
      invalid: 'send_me_everything',
    }));

    expect(service.getReaction('valid')).toBe('surprising');
    expect(service.getReaction('invalid')).toBeNull();
  });
});
