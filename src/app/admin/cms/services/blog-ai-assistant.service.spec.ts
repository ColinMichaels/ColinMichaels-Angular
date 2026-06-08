import {BlogAiAssistantService} from './blog-ai-assistant.service';

describe('BlogAiAssistantService', () => {
  let service: BlogAiAssistantService;

  beforeEach(() => {
    service = new BlogAiAssistantService();
  });

  it('creates metadata suggestions from editor content', () => {
    const result = service.createSuggestions({
      title: 'Untitled Post',
      excerpt: '',
      seoTitle: '',
      seoDescription: '',
      categories: [],
      tags: [],
      blocks: [
        {
          id: 'header-1',
          type: 'header',
          data: {
            text: 'Building a Blog CMS with Angular and Firebase',
            level: 2,
          },
        },
        {
          id: 'paragraph-1',
          type: 'paragraph',
          data: {
            text: 'This draft explains how Editor.js content, draft publishing, SEO metadata, categories, and tags fit into the CMS workflow.',
          },
        },
      ],
    });

    expect(result.source).toBe('local');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].title).toContain('Building a Blog CMS');
    expect(result.suggestions[0].categories).toContain('CMS');
    expect(result.suggestions[0].categories).toContain('Angular');
    expect(result.suggestions[0].categories).toContain('Firebase');
    expect(result.suggestions[0].tags).toContain('CMS');
    expect(result.thumbnailSuggestions.length).toBe(2);
  });

  it('preserves existing taxonomy while removing duplicates', () => {
    const result = service.createSuggestions({
      title: 'AI Metadata for Blog Drafts',
      excerpt: 'A workflow for turning draft notes into usable metadata.',
      seoTitle: '',
      seoDescription: '',
      categories: ['CMS', 'cms'],
      tags: ['Drafts', 'drafts'],
      blocks: [],
    });

    expect(result.suggestions[0].categories.filter(category => category === 'CMS').length).toBe(1);
    expect(result.suggestions[0].tags.filter(tag => tag === 'Drafts').length).toBe(1);
  });
});
