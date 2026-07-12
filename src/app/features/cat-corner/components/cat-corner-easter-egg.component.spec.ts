import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';

import {CatCornerEasterEggComponent} from './cat-corner-easter-egg.component';

describe('CatCornerEasterEggComponent', () => {
  let fixture: ComponentFixture<CatCornerEasterEggComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CatCornerEasterEggComponent,
        RouterTestingModule.withRoutes([
          {path: 'blog/:slug', component: CatCornerEasterEggComponent},
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    await router.navigateByUrl('/blog/gretchen-dispatch?from=archive');
    fixture = TestBed.createComponent(CatCornerEasterEggComponent);
    fixture.detectChanges();
  });

  it('renders a keyboard-focusable Gretchen link that preserves the discovery URL', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a');
    const image = link?.querySelector<HTMLImageElement>('img');

    expect(link?.getAttribute('aria-label')).toContain('Unlock Cat Corner');
    expect(link?.getAttribute('href')).toBe(
      '/cat-corner/unlock?returnUrl=%2Fblog%2Fgretchen-dispatch%3Ffrom%3Darchive'
    );
    expect(image?.getAttribute('src')).toBe('/assets/images/cat-corner/gretchen-easter-egg-small.png');
    expect(link?.hasAttribute('tabindex')).toBeFalse();
  });
});
