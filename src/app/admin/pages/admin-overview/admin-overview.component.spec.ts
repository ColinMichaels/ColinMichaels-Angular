import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {PATH_NAMES} from '../../../app-route-paths';
import {BlogAdminStats} from '../../../features/blog/models/blog-post.model';
import {BlogRepositoryService} from '../../../features/blog/services/blog-repository.service';
import {AdminAuthorization, AuthService} from '../../../services/auth.service';
import {AdminOverviewComponent} from './admin-overview.component';

const adminLinksRoute = `/${PATH_NAMES.ADMIN}/${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`;
const mockStats: BlogAdminStats = {
  total: 12,
  published: 7,
  drafts: 3,
  scheduled: 1,
  archived: 1,
};

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
  let authService: jasmine.SpyObj<Pick<AuthService, 'getRoleAuthorization'>>;

  beforeEach(async () => {
    const blogRepository = {
      getAdminStats: jasmine.createSpy('getAdminStats').and.returnValue(mockStats),
    } satisfies Pick<BlogRepositoryService, 'getAdminStats'>;
    authService = jasmine.createSpyObj('AuthService', ['getRoleAuthorization']);
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

  it('surfaces the Links manager from the admin landing page', () => {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>(`a[href="${adminLinksRoute}"]`));

    expect(element.textContent).toContain('Publishing Console');
    expect(element.textContent).toContain('Homepage Curation');
    expect(element.textContent).toContain('Feature exactly three recommended links.');
    expect(element.textContent).toContain('Links');
    expect(element.textContent).toContain('Curate links');
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it('renders publishing stats and workflow cards for authorized admins', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Total Posts');
    expect(element.textContent).toContain('12');
    expect(element.textContent).toContain('CMS');
    expect(element.textContent).toContain('New Post');
    expect(element.textContent).toContain('Topics');
    expect(element.textContent).toContain('Media Library');
    expect(element.textContent).toContain('User Management');
  });
});
