import {TestBed} from '@angular/core/testing';
import {firstValueFrom, of} from 'rxjs';

import {BlogPost} from '../../blog/models/blog-post.model';
import {BlogRepositoryService} from '../../blog/services/blog-repository.service';
import {TopicHubRepositoryService} from '../../topics/services/topic-hub-repository.service';
import {searchSiteItems, SiteSearchService} from './site-search.service';

function createMarkdownPost(): BlogPost {
  return {
    id: 'markdown-search-post',
    slug: 'markdown-search-post',
    title: 'Markdown Search Post',
    excerpt: 'A post built from Markdown.',
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Markdown'],
    status: 'published',
    seo: {
      title: 'Markdown Search Post',
      description: 'A post built from Markdown.',
    },
    contentFormat: 'editorjs',
    blocks: [{
      id: 'markdown-1',
      type: 'markdown',
      data: {
        markdown: '## Setup\n\nUse **typed blocks** and read [the guide](https://example.com).',
      },
    }],
    createdAt: '2026-07-10T12:00:00.000Z',
    updatedAt: '2026-07-10T12:00:00.000Z',
    publishedAt: '2026-07-10T12:00:00.000Z',
  };
}

describe('SiteSearchService', () => {
  it('indexes readable Markdown content without formatting syntax or link destinations', async () => {
    await TestBed.configureTestingModule({
      providers: [
        SiteSearchService,
        {
          provide: BlogRepositoryService,
          useValue: {
            loading$: of(false),
            error$: of(null),
            getPublishedFullPosts$: () => of([createMarkdownPost()]),
          },
        },
        {
          provide: TopicHubRepositoryService,
          useValue: {getPublishedTopicHubs$: () => of([])},
        },
      ],
    }).compileComponents();

    const service = TestBed.inject(SiteSearchService);
    const items = await firstValueFrom(service.getSearchItems$());
    const markdownItem = items.find(item => item.id === 'markdown-search-post');

    expect(markdownItem?.bodyText).toBe('setup use typed blocks and read the guide.');
    expect(markdownItem?.bodyText).not.toContain('**');
    expect(markdownItem?.bodyText).not.toContain('example.com');
    expect(searchSiteItems(items, {
      query: 'typed blocks',
      type: 'all',
      category: '',
      tag: '',
      author: '',
      sort: 'relevance',
    })[0]?.id).toBe('markdown-search-post');

    const authorResult = searchSiteItems(items, {
      query: 'Colin Michaels',
      type: 'blog',
      category: '',
      tag: '',
      author: 'colin-michaels',
      sort: 'relevance',
    })[0];
    expect(authorResult?.id).toBe('markdown-search-post');
    expect(authorResult?.matchedFields).toContain('Author');
  });
});
