import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogPost} from '../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../features/blog/services/blog-repository.service';
import {AdminAuthorization, AuthService} from '../../../services/auth.service';
import {AdminOverviewComponent} from './admin-overview.component';

const adminLinksRoute = `/${PATH_NAMES.ADMIN}/${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`;

function createPost(
  id: string,
  status: BlogPost['status'],
  updatedAt: string,
  publishedAt: string | null = null
): BlogPost {
  return {
    id,
    slug: id,
    title: id.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    excerpt: `Working notes for ${id}.`,
    coverImage: '/assets/images/backgrounds/night.webp',
    author: {name: 'Colin Michaels'},
    categories: ['CMS'],
    tags: ['Admin'],
    status,
    seo: {title: id, description: id, openGraphImage: ''},
    contentFormat: 'editorjs',
    blocks: [],
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt,
    publishedAt,
  };
}

const mockPosts: readonly BlogPost[] = [
  createPost('next-article', 'scheduled', '2026-07-08T12:00:00.000Z', '2026-07-23T15:00:00.000Z'),
  createPost('active-draft', 'draft', '2026-07-09T12:00:00.000Z'),
  createPost('older-draft', 'draft', '2026-07-08T12:00:00.000Z'),
  createPost('published-one', 'published', '2026-07-07T12:00:00.000Z', '2026-07-07T12:00:00.000Z'),
  createPost('published-two', 'published', '2026-07-06T12:00:00.000Z', '2026-07-06T12:00:00.000Z'),
  createPost('archived-one', 'archived', '2026-07-01T12:00:00.000Z'),
];

function createAuthorization(requiredRoles: readonly string[]): AdminAuthorization {
  return {
    uid: 'admin-user',
    email: 'admin@example.com',
    isAuthenticated: true,
    isAdmin: true,
    isAuthorized: true,
    claims: {admin: true},
    requiredRoles,
  };
}

describe('AdminOverviewComponent', () => {
  let fixture: ComponentFixture<AdminOverviewComponent>;

  beforeEach(async () => {
    const blogRepository = {
      getAdminPosts$: jasmine.createSpy('getAdminPosts$').and.returnValue(of(mockPosts)),
    } satisfies Pick<BlogRepositoryService, 'getAdminPosts$'>;
    const authService = jasmine.createSpyObj<Pick<AuthService, 'getRoleAuthorization'>>('AuthService', ['getRoleAuthorization']);
    authService.getRoleAuthorization.and.callFake((requiredRoles: readonly string[]) => of(createAuthorization(requiredRoles)));

    await TestBed.configureTestingModule({
      imports: [
        AdminOverviewComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: BlogRepositoryService, useValue: blogRepository},
        {provide: AuthService, useValue: authService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminOverviewComponent);
    fixture.detectChanges();
  });

  it('renders an operations-first publishing overview from repository posts', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Publishing Console');
    expect(element.textContent).toContain('Publishing schedule');
    expect(element.textContent).toContain('Next Article');
    expect(element.textContent).toContain('Drafts in progress');
    expect(element.textContent).toContain('Active Draft');
    expect(element.textContent).toContain('Recently published');
    expect(element.textContent).toContain('Published One');
    expect(element.textContent).toContain('6');
  });

  it('keeps site managers in one compact role-aware list', () => {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>(`a[href="${adminLinksRoute}"]`));

    expect(element.textContent).toContain('Manage site');
    expect(element.textContent).toContain('Homepage');
    expect(element.textContent).toContain('Topics');
    expect(element.textContent).toContain('Recommended Links');
    expect(element.textContent).toContain('Media Library');
    expect(element.textContent).toContain('Users');
    expect(links.length).toBe(1);
  });
});
