import { ComponentFixture, TestBed } from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';

import { SystemTrayComponent } from './system-tray.component';

describe('SystemTrayComponent', () => {
  let component: SystemTrayComponent;
  let fixture: ComponentFixture<SystemTrayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemTrayComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemTrayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes named native controls for tray menus', () => {
    const appleMenu = fixture.nativeElement.querySelector(
      'button[aria-label="Apple menu"]'
    ) as HTMLButtonElement;

    expect(appleMenu.type).toBe('button');
    expect(appleMenu.getAttribute('aria-expanded')).toBe('false');

    appleMenu.click();
    fixture.detectChanges();

    expect(appleMenu.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="menu"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="menuitem"]')?.tagName).toBe('BUTTON');
  });
});
