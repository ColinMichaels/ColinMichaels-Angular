import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {AuthService} from '../../services/auth.service';
import {UserAccountProfile} from '../../shared/user-account/user-account.model';
import {AdminGuidePageComponent} from './admin-guide-page.component';

function createProfile(roles: readonly string[]): UserAccountProfile {
  return {
    uid: 'guide-user',
    email: 'guide@example.com',
    displayName: 'Guide User',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    providerIds: ['password'],
    roles,
    claims: {},
  };
}

describe('AdminGuidePageComponent', () => {
  async function createFixture(roles: readonly string[]): Promise<ComponentFixture<AdminGuidePageComponent>> {
    const authService = jasmine.createSpyObj<Pick<AuthService, 'getCurrentUserProfile'>>('AuthService', ['getCurrentUserProfile']);
    authService.getCurrentUserProfile.and.returnValue(of(createProfile(roles)));

    await TestBed.configureTestingModule({
      imports: [AdminGuidePageComponent, RouterTestingModule],
      providers: [{provide: AuthService, useValue: authService}],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminGuidePageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders only the instructions available to a media manager', async () => {
    const fixture = await createFixture(['mediaManager']);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Find your way around the admin');
    expect(text).toContain('Upload and reuse media');
    expect(text).not.toContain('Create and publish a post');
    expect(text).not.toContain('Manage user roles');
  });

  it('filters the rendered guide from the search input', async () => {
    const fixture = await createFixture(['admin']);
    const element = fixture.nativeElement as HTMLElement;
    const search = element.querySelector<HTMLInputElement>('#admin-guide-search');

    expect(search).not.toBeNull();
    search!.value = 'topic hubs';
    search!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Manage topic hubs');
    expect(element.textContent).not.toContain('Create and publish a post');
    expect(element.textContent).toContain('1 guide found');
  });

  it('keeps unrelated reader roles out of the admin access summary', async () => {
    const fixture = await createFixture(['admin', 'catCornerAddict']);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Showing guidance for Admin access.');
    expect(text).not.toContain('Cat Corner Addict access.');
  });
});
