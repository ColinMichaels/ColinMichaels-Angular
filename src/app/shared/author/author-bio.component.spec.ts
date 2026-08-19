import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {DEFAULT_AUTHOR_PROFILE} from '../../features/authors/authors.constants';
import {AuthorBioComponent} from './author-bio.component';

describe('AuthorBioComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorBioComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('connects the default article bio to the author profile, policy, and public identity profiles', () => {
    const fixture = TestBed.createComponent(AuthorBioComponent);
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'));
    const hrefs = links.map(link => link.getAttribute('href'));

    expect(hrefs).toContain('/authors/colin-michaels');
    expect(hrefs).toContain('/editorial-standards');
    expect(hrefs).toContain('https://www.youtube.com/channel/UCCJMwxuUIb6S4aoZiZeAVeQ');
    expect(hrefs).toContain('https://www.instagram.com/colinmichaels/');
    expect(hrefs).toContain('https://github.com/ColinMichaels');
    expect(hrefs).toContain('https://www.linkedin.com/in/colinmichaels');
  });

  it('uses a canonical author input while retaining the site-wide editorial policy link', () => {
    const fixture = TestBed.createComponent(AuthorBioComponent);
    fixture.componentRef.setInput('author', {
      ...DEFAULT_AUTHOR_PROFILE,
      id: 'guest-writer',
      slug: 'guest-writer',
      name: 'Guest Writer',
      externalProfiles: [{label: 'Website', url: 'https://writer.example'}],
    });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const hrefs = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'))
      .map(link => link.getAttribute('href'));

    expect(element.textContent).toContain('Guest Writer');
    expect(hrefs).toContain('/authors/guest-writer');
    expect(hrefs).toContain('/editorial-standards');
    expect(hrefs).toContain('https://writer.example');
    expect(hrefs).not.toContain('https://github.com/ColinMichaels');
  });
});
