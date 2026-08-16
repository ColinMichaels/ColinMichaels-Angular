import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SiteAnalyticsService} from '../../../../shared/analytics/site-analytics.service';
import {TopicHub, TOPIC_HUBS} from '../../topic-hubs.data';
import {TopicGuideComponent} from './topic-guide.component';

describe('TopicGuideComponent', () => {
  async function createComponent(
    hub: TopicHub,
    analytics: Pick<SiteAnalyticsService, 'trackResourceDownload'> = {trackResourceDownload: () => undefined}
  ): Promise<ComponentFixture<TopicGuideComponent>> {
    await TestBed.configureTestingModule({
      imports: [TopicGuideComponent],
      providers: [{provide: SiteAnalyticsService, useValue: analytics}],
    }).compileComponents();

    const fixture = TestBed.createComponent(TopicGuideComponent);
    fixture.componentRef.setInput('hub', hub);
    fixture.detectChanges();

    return fixture;
  }

  it('renders all supporting topic content in editorial lists and link rows', async () => {
    const hub = TOPIC_HUBS[0];
    const fixture = await createComponent({
      ...hub,
      resources: [
        {
          label: 'Internal resource',
          description: 'A resource within the site.',
          href: '/blog/tag/internal',
        },
        {
          label: 'External resource',
          description: 'A resource on another site.',
          href: 'https://example.com/reference',
        },
        {
          label: 'Printable resource',
          description: 'A same-site PDF download.',
          href: '/downloads/printable-resource.pdf',
        },
      ],
    });
    const element = fixture.nativeElement as HTMLElement;
    const assetItems = Array.from(element.querySelectorAll<HTMLElement>('.topic-guide-editorial-item'));
    const routeItems = Array.from(element.querySelectorAll<HTMLElement>('.topic-guide-route li'));
    const checklistItems = Array.from(element.querySelectorAll<HTMLElement>('.topic-guide-checklist li'));
    const resourceLinks = Array.from(element.querySelectorAll<HTMLAnchorElement>('.topic-guide-resources a'));

    expect(element.querySelector('.topic-guide-editorial-list')?.tagName).toBe('OL');
    expect(element.textContent).toContain(hub.asset.title);
    expect(element.textContent).toContain(hub.asset.intro);
    expect(assetItems.length).toBe(hub.asset.items.length);
    hub.asset.items.forEach(item => {
      expect(element.textContent).toContain(item.label);
      expect(element.textContent).toContain(item.description);
    });

    expect(element.querySelector('.topic-guide-route')?.tagName).toBe('OL');
    expect(routeItems.length).toBe(hub.learningPath.length);
    hub.learningPath.forEach(step => {
      expect(element.textContent).toContain(step.label);
      expect(element.textContent).toContain(step.title);
      expect(element.textContent).toContain(step.description);
    });

    expect(element.textContent).toContain('Keep in mind');
    expect(checklistItems.length).toBe(hub.checklist.length);
    hub.checklist.forEach(item => expect(element.textContent).toContain(item));
    expect(resourceLinks.map(link => link.getAttribute('href'))).toEqual([
      '/blog/tag/internal',
      'https://example.com/reference',
      '/downloads/printable-resource.pdf',
    ]);
    expect(resourceLinks[0].hasAttribute('target')).toBeFalse();
    expect(resourceLinks[0].hasAttribute('download')).toBeFalse();
    expect(resourceLinks[1].getAttribute('target')).toBe('_blank');
    expect(resourceLinks[1].getAttribute('rel')).toBe('noopener noreferrer');
    expect(resourceLinks[2].getAttribute('download')).toBe('printable-resource.pdf');
    expect(resourceLinks[2].hasAttribute('target')).toBeFalse();
    expect(element.textContent).toContain('Internal resource');
    expect(element.textContent).toContain('A resource within the site.');
    expect(element.textContent).toContain('External resource');
    expect(element.textContent).toContain('A resource on another site.');
    expect(element.textContent).toContain('Printable resource');
    expect(element.textContent).toContain('A same-site PDF download.');
  });

  it('suppresses an empty or normalized duplicate featured project', async () => {
    const hub = TOPIC_HUBS[0];
    const duplicateFixture = await createComponent({
      ...hub,
      featuredProject: {
        ...hub.featuredProject,
        title: `  ${hub.asset.title.toUpperCase().replace(/\s+/g, ' -- ')}  `,
      },
    });

    expect(duplicateFixture.nativeElement.querySelector('.topic-guide-featured')).toBeNull();

    TestBed.resetTestingModule();
    const emptyFixture = await createComponent({
      ...hub,
      featuredProject: {
        label: '',
        title: 'A distinct but incomplete project',
        description: '',
        href: '',
        ctaLabel: '',
      },
    });

    expect(emptyFixture.nativeElement.querySelector('.topic-guide-featured')).toBeNull();
  });

  it('tracks local PDF downloads without tracking internal or external navigation', async () => {
    const analytics = jasmine.createSpyObj<SiteAnalyticsService>('SiteAnalyticsService', ['trackResourceDownload']);
    const hub = TOPIC_HUBS[0];
    const fixture = await createComponent({
      ...hub,
      resources: [
        {label: 'Internal', description: 'Internal page.', href: '/blog'},
        {label: 'External', description: 'External page.', href: 'https://example.com'},
        {label: 'Worksheet', description: 'Printable worksheet.', href: '/downloads/buyer-check.pdf'},
      ],
    }, analytics);
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('.topic-guide-resources a'));

    links.forEach(link => {
      link.addEventListener('click', event => event.preventDefault());
      link.click();
    });

    expect(analytics.trackResourceDownload).toHaveBeenCalledOnceWith('buyer-check.pdf');
  });

  it('renders a complete featured project when its title is distinct', async () => {
    const hub = TOPIC_HUBS[0];
    const featuredProject = {
      label: 'Featured project',
      title: 'Prompt Review Workbook',
      description: 'A separate workbook for reviewing prompts before reuse.',
      href: 'https://example.com/prompt-workbook',
      ctaLabel: 'Open workbook',
    };
    const fixture = await createComponent({...hub, featuredProject});
    const element = fixture.nativeElement as HTMLElement;
    const featured = element.querySelector<HTMLElement>('.topic-guide-featured');
    const link = featured?.querySelector<HTMLAnchorElement>('a');

    expect(featured).not.toBeNull();
    expect(featured?.textContent).toContain(featuredProject.label);
    expect(featured?.textContent).toContain(featuredProject.title);
    expect(featured?.textContent).toContain(featuredProject.description);
    expect(featured?.textContent).toContain(featuredProject.ctaLabel);
    expect(link?.getAttribute('href')).toBe(featuredProject.href);
  });

  it('preserves the recovery medical disclaimer', async () => {
    const recoveryHub = TOPIC_HUBS.find(hub => hub.slug === 'recovery-planning');

    expect(recoveryHub).toBeDefined();

    const fixture = await createComponent(recoveryHub as TopicHub);
    const element = fixture.nativeElement as HTMLElement;
    const disclaimer = element.querySelector<HTMLElement>('[role="note"]');

    expect(disclaimer?.textContent).toContain(
      'Health-related writing here is personal experience and organization help only, not medical advice.'
    );
  });
});
