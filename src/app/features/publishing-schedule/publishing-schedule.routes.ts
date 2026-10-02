import {Routes} from '@angular/router';
import {createSiteTitle, HOMEPAGE_OG_IMAGE} from '../../shared/seo/seo.metadata';

export const publishingScheduleRoutes: Routes = [
  {
    path: 'schedule', pathMatch: 'full',
    data: {seo: {title: createSiteTitle('Posting schedule'), description: 'What is coming next: announced articles and seasons to look forward to.',
      path: '/schedule', image: HOMEPAGE_OG_IMAGE, imageAlt: 'ColinMichaels.com posting schedule', type: 'website', robots: 'noindex,follow'}},
    loadComponent: () => import('./pages/publishing-schedule.component').then(m => m.PublishingScheduleComponent),
  },
  {
    path: 'schedule/read/:slug',
    data: {seo: {title: createSiteTitle('Member early reading'), description: 'An early reading experience for eligible members.',
      path: '/schedule', image: HOMEPAGE_OG_IMAGE, imageAlt: 'ColinMichaels.com', type: 'website', robots: 'noindex,nofollow'}},
    loadComponent: () => import('./pages/scheduled-reader.component').then(m => m.ScheduledReaderComponent),
  },
];
