import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {BlogPost} from '../../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../../features/blog/services/blog-repository.service';
import {CmsPostListComponent} from './post-list.component';

function createPost(overrides: Partial<BlogPost>): BlogPost {
  return {
    id: overrides.id ?? `post-${overrides.slug ?? 'test'}`,
    slug: overrides.slug ?? 'test-post',
    title: overrides.title ?? 'Test Post',
    excerpt: overrides.excerpt ?? 'A test post.',
    coverImage: overrides.coverImage ?? '/assets/images/backgrounds/night.webp',
    author: overrides.author ?? {
      name: 'Colin Michaels',
      title: 'Applications Developer',
    },
    categories: overrides.categories ?? ['CMS'],
    tags: overrides.tags ?? ['Firebase'],
    status: overrides.status ?? 'draft',
    seo: overrides.seo ?? {
      title: overrides.title ?? 'Test Post',
      description: overrides.excerpt ?? 'A test post.',
      openGraphImage: '',
    },
    contentFormat: 'editorjs',
    blocks: overrides.blocks ?? [],
    createdAt: overrides.createdAt ?? '2026-01-01T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T12:00:00.000Z',
    publishedAt: overrides.publishedAt ?? null,
  };
}

function findButton(element: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll('button'))
    .find(candidate => candidate.textContent?.includes(text));

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button with text "${text}" was not found.`);
  }

  return button;
}

function selectAllVisiblePosts(fixture: ComponentFixture<CmsPostListComponent>): void {
  const element = fixture.nativeElement as HTMLElement;
  const checkbox = element.querySelector<HTMLInputElement>(
    'thead input[aria-label="Select all posts on this page"]'
  );

  if (!checkbox) {
    throw new Error('Select-all checkbox was not found.');
  }

  checkbox.checked = true;
  checkbox.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

describe('CmsPostListComponent', () => {
  let fixture: ComponentFixture<CmsPostListComponent>;
  let blogRepository: jasmine.SpyObj<Pick<
    BlogRepositoryService,
    'getAdminPosts$' | 'updatePostStatuses' | 'deletePosts' | 'deletePost' | 'createPreviewUrl'
  >>;

  const draftPost = createPost({
    id: 'draft-post',
    slug: 'draft-post',
    title: 'Draft Post',
    status: 'draft',
  });
  const publishedPost = createPost({
    id: 'published-post',
    slug: 'published-post',
    title: 'Published Post',
    status: 'published',
    publishedAt: '2026-01-02T12:00:00.000Z',
  });

  beforeEach(async () => {
    blogRepository = jasmine.createSpyObj('BlogRepositoryService', [
      'getAdminPosts$',
      'updatePostStatuses',
      'deletePosts',
      'deletePost',
      'createPreviewUrl',
    ]);
    blogRepository.getAdminPosts$.and.returnValue(of([draftPost, publishedPost]));
    blogRepository.updatePostStatuses.and.resolveTo({
      requestedCount: 2,
      affectedCount: 2,
      notFoundIds: [],
    });
    blogRepository.deletePosts.and.resolveTo({
      requestedCount: 2,
      affectedCount: 2,
      notFoundIds: [],
    });
    blogRepository.deletePost.and.resolveTo('deleted-cms-post');
    blogRepository.createPreviewUrl.and.returnValue('/blog/preview/test-token');

    await TestBed.configureTestingModule({
      imports: [
        CmsPostListComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: BlogRepositoryService, useValue: blogRepository},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CmsPostListComponent);
    fixture.detectChanges();
  });

  it('does not render bulk actions until a post is selected', () => {
    const element = fixture.nativeElement as HTMLElement;
    const bulkSection = element.querySelector('section[aria-label="Bulk post actions"]');

    expect(bulkSection).toBeNull();
    expect(element.querySelector('thead')?.textContent).toContain('Author');
    expect(element.querySelector('tbody')?.textContent).toContain('Colin Michaels');
  });

  it('groups maintenance actions behind a native disclosure', () => {
    const element = fixture.nativeElement as HTMLElement;
    const details = element.querySelector<HTMLDetailsElement>('header details');
    const summary = details?.querySelector('summary');
    const actions = details?.querySelector<HTMLElement>('[aria-label="Maintenance actions"]');
    const newPostLink = element.querySelector<HTMLAnchorElement>('header a[href="/admin/cms/new"]');

    expect(details).not.toBeNull();
    expect(details?.open).toBeFalse();
    expect(summary?.textContent).toContain('Maintenance');
    expect(actions).not.toBeNull();
    expect(findButton(actions as HTMLElement, 'Import JSON')).toBeTruthy();
    expect(findButton(actions as HTMLElement, 'Export JSON')).toBeTruthy();
    expect(findButton(actions as HTMLElement, 'Refresh Firestore')).toBeTruthy();
    expect(newPostLink?.textContent).toContain('New Post');
  });

  it('opens the import picker and closes Maintenance', () => {
    const element = fixture.nativeElement as HTMLElement;
    const details = element.querySelector<HTMLDetailsElement>('header details');
    const input = element.querySelector<HTMLInputElement>('input[type="file"]');

    if (!details || !input) {
      throw new Error('Maintenance import controls were not found.');
    }

    const inputClickSpy = spyOn(input, 'click');
    details.open = true;
    findButton(details, 'Import JSON').click();

    expect(inputClickSpy).toHaveBeenCalled();
    expect(details.open).toBeFalse();
  });

  it('selects visible posts and clears the selection', () => {
    const element = fixture.nativeElement as HTMLElement;

    selectAllVisiblePosts(fixture);

    expect(element.textContent).toContain('2 selected');
    expect(findButton(element, 'Apply status').disabled).toBeFalse();
    expect(findButton(element, 'Delete selected').disabled).toBeFalse();

    findButton(element, 'Clear').click();
    fixture.detectChanges();

    expect(element.querySelector('section[aria-label="Bulk post actions"]')).toBeNull();
  });

  it('applies a bulk status change to selected posts', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);

    selectAllVisiblePosts(fixture);
    const statusSelect = element.querySelector('section[aria-label="Bulk post actions"] select');

    if (!(statusSelect instanceof HTMLSelectElement)) {
      throw new Error('Bulk status select was not found.');
    }

    statusSelect.value = 'archived';
    statusSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    findButton(element, 'Apply status').click();

    await fixture.whenStable();

    expect(confirmSpy).toHaveBeenCalled();
    expect(blogRepository.updatePostStatuses).toHaveBeenCalled();
    const [postIds, status] = blogRepository.updatePostStatuses.calls.mostRecent().args;
    expect(postIds).toEqual(jasmine.arrayWithExactContents(['published-post', 'draft-post']));
    expect(status).toBe('archived');
  });

  it('deletes selected posts after confirmation', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);

    selectAllVisiblePosts(fixture);
    findButton(element, 'Delete selected').click();

    await fixture.whenStable();

    expect(confirmSpy).toHaveBeenCalled();
    expect(blogRepository.deletePosts).toHaveBeenCalled();
    const [postIds] = blogRepository.deletePosts.calls.mostRecent().args;
    expect(postIds).toEqual(jasmine.arrayWithExactContents(['published-post', 'draft-post']));
  });
});
