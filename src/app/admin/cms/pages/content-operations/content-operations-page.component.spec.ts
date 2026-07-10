import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';

import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {ContentOperationsPageComponent} from './content-operations-page.component';

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'post-1',
    slug: 'test-post',
    title: 'Test post',
    excerpt: 'Short excerpt',
    coverImage: '/cover.webp',
    author: {name: 'Colin Michaels'},
    categories: ['Technology'],
    tags: ['Firebase'],
    status: 'published',
    seo: {
      title: 'Short SEO title',
      description: 'Short description',
      canonical: 'https://colinmichaels.com/blog/test-post',
      openGraphImage: '/open-graph.jpg',
    },
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    publishedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function buttonByText(element: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => button.textContent?.trim().includes(text));
}

describe('ContentOperationsPageComponent', () => {
  let fixture: ComponentFixture<ContentOperationsPageComponent>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    const blogRepository = {
      getAdminPosts$: jasmine.createSpy('getAdminPosts$').and.returnValue(of([
        createPost(),
        createPost({id: 'post-2', slug: 'second-post', title: 'Second post', status: 'draft'}),
      ])),
    } satisfies Pick<BlogRepositoryService, 'getAdminPosts$'>;

    await TestBed.configureTestingModule({
      imports: [ContentOperationsPageComponent],
      providers: [{provide: BlogRepositoryService, useValue: blogRepository}],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentOperationsPageComponent);
    nativeElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders a read-only bulk scope without apply or publish controls', () => {
    expect(nativeElement.textContent).toContain('Bulk Post Editor');
    expect(nativeElement.textContent).toContain('Dry run only');
    expect(nativeElement.textContent).toContain('0 canonical writes');
    expect(nativeElement.textContent).toContain('Apply and publish remain locked');
    expect(buttonByText(nativeElement, 'Apply changes')?.disabled).toBeTrue();
  });

  it('creates and validates a local review draft from selected posts', async () => {
    const row = nativeElement.querySelector<HTMLElement>('tr[data-post-id="post-1"]');
    const checkbox = row?.querySelector<HTMLInputElement>('input[type="checkbox"]');

    expect(checkbox).not.toBeNull();
    if (checkbox) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
    }
    fixture.detectChanges();

    buttonByText(nativeElement, 'Create review draft')?.click();
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain('Prepared a local review draft for 1 post');
    expect(nativeElement.querySelector('[aria-label="Content operation review results"]')).not.toBeNull();
    expect(nativeElement.textContent).toContain('Post ID / locked');
    expect(nativeElement.textContent).toContain('Slug / locked');

    buttonByText(nativeElement, 'Validate draft')?.click();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain('Validated 1 candidate artifact');
    expect(nativeElement.textContent).toContain('Protected fields unchanged');
  });

  it('removes deselected posts from the local review scope', () => {
    const row = nativeElement.querySelector<HTMLElement>('tr[data-post-id="post-1"]');
    const checkbox = row?.querySelector<HTMLInputElement>('input[type="checkbox"]');

    expect(checkbox).not.toBeNull();
    checkbox?.click();
    fixture.detectChanges();
    buttonByText(nativeElement, 'Create review draft')?.click();
    fixture.detectChanges();

    expect(nativeElement.querySelector('[aria-label="Content operation review results"]')).not.toBeNull();
    checkbox?.click();
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain('No review draft selected');
    expect(buttonByText(nativeElement, 'Create review draft')?.disabled).toBeTrue();
  });
});
