import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {BlogPost} from '../../models/blog-post.model';
import {BlogEditorialEvidenceComponent} from './blog-editorial-evidence.component';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'evidence-post',
    slug: 'evidence-post',
    title: 'Evidence Post',
    excerpt: 'A post used to verify reader-facing evidence and disclosure labels.',
    coverImage: '/assets/images/evidence.webp',
    author: {name: 'Colin Michaels', slug: 'colin-michaels'},
    categories: ['Drones'],
    tags: ['Field notes'],
    status: 'published',
    seo: {title: 'Evidence Post', description: 'Evidence post description.'},
    contentFormat: 'editorjs',
    blocks: [{
      id: 'source',
      type: 'paragraph',
      data: {text: 'Review the <a href="https://www.faa.gov/uas">FAA UAS guidance</a>.'},
    }],
    createdAt: '2026-08-15T12:00:00.000Z',
    updatedAt: '2026-08-15T12:00:00.000Z',
    publishedAt: '2026-08-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('BlogEditorialEvidenceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogEditorialEvidenceComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders reviewed evidence, disclosures, source count, and the policy path', () => {
    const fixture = TestBed.createComponent(BlogEditorialEvidenceComponent);
    fixture.componentRef.setInput('post', createPost({
      editorial: {
        evidenceBasis: 'mixed',
        evidenceSummary: 'The flight notes are hands-on; range figures remain manufacturer claims.',
        sourceReviewedAt: '2026-08-15',
        relationshipDisclosure: 'The aircraft was purchased by Colin.',
        aiAssistanceDisclosure: 'AI assisted with transcript organization.',
        syntheticMediaDisclosure: 'The cover is an editorial illustration.',
        updateNote: 'Separated observed flight behavior from specifications.',
      },
    }));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';

    expect(text).toContain('Mixed evidence');
    expect(text).toContain('The flight notes are hands-on');
    expect(text).toContain('1 explicit source in the article');
    expect(text).toContain('The aircraft was purchased by Colin.');
    expect(text).toContain('AI assisted with transcript organization.');
    expect(text).toContain('The cover is an editorial illustration.');
    expect(text).toContain('Separated observed flight behavior from specifications.');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/editorial-standards');
  });

  it('renders an honest unclassified notice for legacy posts', () => {
    const fixture = TestBed.createComponent(BlogEditorialEvidenceComponent);
    fixture.componentRef.setInput('post', createPost({editorial: undefined}));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Not yet classified');
    expect(text).toContain('do not assume a product was owned, tested, supplied, or independently verified');
    expect(text).toContain('1 explicit source in the article');
  });
});
