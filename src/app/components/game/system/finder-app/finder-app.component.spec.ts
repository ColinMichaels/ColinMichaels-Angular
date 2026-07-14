import { ComponentFixture, TestBed } from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import { FinderAppComponent } from './finder-app.component';

describe('FinderAppComponent', () => {
  let component: FinderAppComponent;
  let fixture: ComponentFixture<FinderAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinderAppComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinderAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes Finder navigation and view choices as named buttons', () => {
    const element = fixture.nativeElement as HTMLElement;
    const favorite = element.querySelector<HTMLButtonElement>('aside button');
    const listView = element.querySelector<HTMLButtonElement>('button[aria-label="List view"]');
    const back = element.querySelector<HTMLButtonElement>('button[aria-label="Go back"]');

    expect(favorite?.type).toBe('button');
    expect(favorite?.getAttribute('aria-current')).toBe('page');
    expect(listView?.getAttribute('aria-pressed')).toBe('true');
    expect(back?.disabled).toBeTrue();
  });
});
