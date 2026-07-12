import {convertToParamMap} from '@angular/router';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {of, throwError} from 'rxjs';

import {CAT_CORNER_ADDICT_ROLE} from '../../../shared/user-account/user-account.model';
import {CatCornerAccessService} from '../services/cat-corner-access.service';
import {CatCornerUnlockComponent} from './cat-corner-unlock.component';

describe('CatCornerUnlockComponent', () => {
  let fixture: ComponentFixture<CatCornerUnlockComponent>;
  let claimAccess: jasmine.Spy;

  async function createComponent(returnUrl = '/blog/gretchen-dispatch'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CatCornerUnlockComponent, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {snapshot: {queryParamMap: convertToParamMap({returnUrl})}},
        },
        {
          provide: CatCornerAccessService,
          useValue: {claimAccess},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatCornerUnlockComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    claimAccess = jasmine.createSpy('claimAccess').and.returnValue(of({
      role: CAT_CORNER_ADDICT_ROLE,
      alreadyMember: false,
      updatedAt: '2026-07-12T12:00:00.000Z',
    }));
  });

  it('claims access automatically and renders the exact success copy and actions', async () => {
    await createComponent();
    const element = fixture.nativeElement as HTMLElement;
    const links = [...element.querySelectorAll<HTMLAnchorElement>('a')];

    expect(claimAccess).toHaveBeenCalledTimes(1);
    expect(element.querySelector('.unlock-copy')?.getAttribute('aria-live')).toBe('polite');
    expect(element.querySelector('.unlock-copy')?.getAttribute('aria-busy')).toBe('false');
    expect(element.textContent).toContain('You found Gretchen.');
    expect(element.textContent).toContain('Your account now carries the Cat Corner Addict badge.');
    expect(links.find(link => link.textContent?.includes('Enter Cat Corner'))?.getAttribute('href')).toBe('/cat-corner');
    expect(links.find(link => link.textContent?.includes('Return to the article'))?.getAttribute('href'))
      .toBe('/blog/gretchen-dispatch');
  });

  it('shows a retry state when the callable fails', async () => {
    claimAccess.and.returnValue(throwError(() => new Error('unavailable')));
    await createComponent();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain("Gretchen couldn't finish that.");
    expect([...element.querySelectorAll('button')].some(button => button.textContent?.includes('Try Again'))).toBeTrue();
  });

  it('does not allow an external return URL into the rendered link', async () => {
    await createComponent('//example.com/not-the-article');
    const returnLink = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a')]
      .find(link => link.textContent?.includes('Return to the article'));

    expect(returnLink?.getAttribute('href')).toBe('/');
  });
});
