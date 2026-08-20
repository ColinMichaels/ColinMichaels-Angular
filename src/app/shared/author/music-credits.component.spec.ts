import {TestBed} from '@angular/core/testing';

import {MusicCreditsComponent} from './music-credits.component';

describe('MusicCreditsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MusicCreditsComponent],
    }).compileComponents();
  });

  it('starts with a concise, readable credit list and can reveal every credit', () => {
    const fixture = TestBed.createComponent(MusicCreditsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Showing 6 of 33 credits');
    expect(element.querySelectorAll('ol > li')).toHaveSize(6);
    (Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Show all')) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Showing 33 of 33 credits');
    expect(element.querySelectorAll('ol > li')).toHaveSize(33);
  });

  it('filters and searches the credit list while keeping unknown years visually understated', () => {
    const fixture = TestBed.createComponent(MusicCreditsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('input[type="search"]');

    input!.value = 'Calle 13';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Showing 1 of 1 credits');
    expect(element.textContent).toContain('Engineer, Mixing, Mixing Engineer');

    input!.value = 'Everything Sucks';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Artist not listed');
    expect(element.textContent).toContain('—');
    expect(element.textContent).not.toContain('Year not listed');
  });

  it('uses safe external links for music-service searches', () => {
    const fixture = TestBed.createComponent(MusicCreditsComponent);
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'));

    expect(links[0].href).toContain('open.spotify.com');
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel).toBe('noopener noreferrer');
    expect(links[1].href).toContain('music.apple.com');
    expect(links[0].title).toBe('Spotify');
    expect(links[1].title).toBe('Apple Music');
    expect(links[0].querySelector('[role="tooltip"]')?.textContent?.trim()).toBe('Spotify');
    expect(links[1].querySelector('[role="tooltip"]')?.textContent?.trim()).toBe('Apple Music');
  });
});
