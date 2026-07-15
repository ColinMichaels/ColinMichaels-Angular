import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BlogTableOfContentsComponent} from './blog-table-of-contents.component';

describe('BlogTableOfContentsComponent', () => {
  const originalMatchMedia = window.matchMedia;
  let fixture: ComponentFixture<BlogTableOfContentsComponent>;

  beforeEach(async () => {
    window.matchMedia = jasmine.createSpy('matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
      addListener: jasmine.createSpy('addListener'),
      removeListener: jasmine.createSpy('removeListener'),
      dispatchEvent: jasmine.createSpy('dispatchEvent'),
    });

    await TestBed.configureTestingModule({
      imports: [BlogTableOfContentsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogTableOfContentsComponent);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders post-scoped section links with active section state', () => {
    fixture.componentRef.setInput('postPath', '/blog/test-post');
    fixture.componentRef.setInput('activeHeadingId', 'second-heading');
    fixture.componentRef.setInput('items', [
      {
        blockId: 'heading-1',
        id: 'first-heading',
        level: 2,
        text: 'First Heading',
      },
      {
        blockId: 'heading-2',
        id: 'second-heading',
        level: 3,
        text: 'Second Heading',
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));

    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/blog/test-post#first-heading',
      '/blog/test-post#second-heading',
    ]);
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(links[1].getAttribute('aria-current')).toBe('location');
    expect(links[1].classList).toContain('border-cyan-600');
    expect(links[1].classList).toContain('dark:border-cyan-300');
  });

  it('scrolls to the natural heading position when a sticky heading link is clicked', () => {
    const heading = document.createElement('h2');
    heading.id = 'smooth-heading';
    heading.style.position = 'sticky';
    spyOn(heading, 'getBoundingClientRect').and.callFake(() => ({
      bottom: 520,
      height: 40,
      left: 0,
      right: 320,
      top: heading.style.position === 'static' ? 480 : 108,
      width: 320,
      x: 0,
      y: heading.style.position === 'static' ? 480 : 108,
      toJSON: () => ({}),
    }));
    const scrollTo = spyOn(window, 'scrollTo');
    const headingSelected = spyOn(fixture.componentInstance.headingSelected, 'emit');
    document.body.appendChild(heading);

    fixture.componentRef.setInput('items', [
      {
        blockId: 'heading-1',
        id: 'smooth-heading',
        level: 2,
        text: 'Smooth Heading',
      },
    ]);
    fixture.detectChanges();

    let scrollFrame: FrameRequestCallback | undefined;
    spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
      scrollFrame = callback;
      return 1;
    });

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('a');
    const clickEvent = new MouseEvent('click', {bubbles: true, cancelable: true});

    link?.dispatchEvent(clickEvent);
    scrollFrame?.(0);
    scrollFrame?.(16);

    expect(clickEvent.defaultPrevented).toBeTrue();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    const reduceMotion = document.defaultView
      ?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
    expect(scrollTo.calls.mostRecent().args[0] as unknown as ScrollToOptions)
      .toEqual({top: 480, behavior: reduceMotion ? 'auto' : 'smooth'});
    expect(headingSelected).toHaveBeenCalledOnceWith('smooth-heading');
    expect(heading.style.position).toBe('sticky');

    document.body.removeChild(heading);
  });
});
