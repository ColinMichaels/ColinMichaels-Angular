import { TestBed } from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {AppComponent, shouldShowOsNotifications, shouldShowSiteHeader} from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('uses the dedicated shell for admin routes without enabling OS notifications', () => {
    expect(shouldShowSiteHeader('/admin')).toBeFalse();
    expect(shouldShowSiteHeader('/admin/cms/calendar?month=2026-07')).toBeFalse();
    expect(shouldShowOsNotifications('/admin/cms')).toBeFalse();
    expect(shouldShowSiteHeader('/blog')).toBeTrue();
  });

});
