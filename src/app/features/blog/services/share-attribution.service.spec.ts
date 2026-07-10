import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';

import {BlogEngagementService} from './blog-engagement.service';
import {ShareAttributionService} from './share-attribution.service';

@Component({template: '', standalone: true})
class EmptyRouteComponent {}

describe('ShareAttributionService', () => {
  let router: Router;
  let service: ShareAttributionService;
  let engagement: jasmine.SpyObj<Pick<BlogEngagementService, 'recordShareLanding'>>;

  beforeEach(() => {
    sessionStorage.clear();
    engagement = jasmine.createSpyObj('BlogEngagementService', ['recordShareLanding']);
    engagement.recordShareLanding.and.resolveTo({recorded: true});

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{path: 'blog/:slug', component: EmptyRouteComponent}]),
        {provide: BlogEngagementService, useValue: engagement},
      ],
    });

    router = TestBed.inject(Router);
    service = TestBed.inject(ShareAttributionService);
  });

  it('records a valid share id once per browser session', async () => {
    service.start();
    service.start();
    await router.navigateByUrl('/blog/test?share=1234567890abcdefghij');

    expect(engagement.recordShareLanding).toHaveBeenCalledTimes(1);
    expect(engagement.recordShareLanding).toHaveBeenCalledWith({
      shareId: '1234567890abcdefghij',
      visitId: jasmine.stringMatching(/^[A-Za-z0-9_-]{20,80}$/),
    });

    await router.navigateByUrl('/blog/second?share=1234567890abcdefghij');
    expect(engagement.recordShareLanding).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed attribution parameters', async () => {
    service.start();
    await router.navigateByUrl('/blog/test?share=short');

    expect(engagement.recordShareLanding).not.toHaveBeenCalled();
  });
});
