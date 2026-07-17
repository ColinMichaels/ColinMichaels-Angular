import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';

import {AdminAuthorization, AuthService} from '../services/auth.service';
import {AdminShellComponent} from './admin-shell.component';

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

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<AdminShellComponent>;

  beforeEach(async () => {
    localStorage.removeItem('admin.navigation.collapsed');
    const authService = jasmine.createSpyObj<Pick<AuthService, 'getRoleAuthorization'>>('AuthService', ['getRoleAuthorization']);
    authService.getRoleAuthorization.and.callFake((requiredRoles: readonly string[]) => of(createAuthorization(requiredRoles)));

    await TestBed.configureTestingModule({
      imports: [
        AdminShellComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: AuthService, useValue: authService},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();
  });

  it('renders the role-aware sidebar and compact utility header', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-admin-environment-badge')).not.toBeNull();
    expect(element.textContent).toContain('Firebase');
    expect(element.textContent).toContain('COLIN MICHAELS');
    expect(element.textContent).toContain('Admin Guide');
    expect(element.textContent).toContain('Publishing');
    expect(element.textContent).toContain('Posts');
    expect(element.textContent).toContain('Bulk Editor');
    expect(element.textContent).toContain('Calendar');
    expect(element.textContent).toContain('Site Content');
    expect(element.textContent).toContain('Media Library');
    expect(element.textContent).toContain('Users');
    expect(element.textContent).toContain('New Post');
  });

  it('collapses the desktop sidebar to icon links and persists the preference', () => {
    const element = fixture.nativeElement as HTMLElement;
    const shell = element.querySelector<HTMLElement>('div.min-h-screen');
    const collapseButton = element.querySelector<HTMLButtonElement>('button[aria-label="Collapse admin navigation"]');

    expect(collapseButton).not.toBeNull();
    expect(shell?.style.getPropertyValue('--admin-sidebar-width')).toBe('14rem');
    collapseButton?.click();
    fixture.detectChanges();

    expect(element.querySelector('button[aria-label="Expand admin navigation"]')).not.toBeNull();
    expect(element.querySelector('a[title="Posts"]')).not.toBeNull();
    expect(element.querySelector('a[title="Bulk Editor"]')).not.toBeNull();
    expect(element.querySelector('a[title="Calendar"]')).not.toBeNull();
    expect(element.querySelector('[role="tooltip"]')?.textContent).toContain('Overview');
    expect(shell?.style.getPropertyValue('--admin-sidebar-width')).toBe('4.5rem');
    expect(localStorage.getItem('admin.navigation.collapsed')).toBe('true');
  });
});
