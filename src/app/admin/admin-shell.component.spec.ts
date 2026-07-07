import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {AdminShellComponent} from './admin-shell.component';

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<AdminShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AdminShellComponent,
        RouterTestingModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();
  });

  it('shows the Firebase environment badge above admin child routes', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-admin-environment-badge')).not.toBeNull();
    expect(element.textContent).toContain('Firebase');
  });
});
