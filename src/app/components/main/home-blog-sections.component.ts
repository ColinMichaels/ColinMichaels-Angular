import {ChangeDetectionStrategy, Component} from '@angular/core';

import {HomeLatestWritingSectionComponent} from './home-latest-writing-section.component';
import {HomeRecoveryBlogSectionsComponent} from './home-recovery-blog-sections.component';
import {HomeTechTipsSectionComponent} from './home-tech-tips-section.component';
import {HomeTopicsSectionComponent} from './home-topics-section.component';

@Component({
  selector: 'app-home-blog-sections',
  imports: [
    HomeLatestWritingSectionComponent,
    HomeRecoveryBlogSectionsComponent,
    HomeTechTipsSectionComponent,
    HomeTopicsSectionComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-home-latest-writing-section></app-home-latest-writing-section>
    <app-home-topics-section></app-home-topics-section>
    <app-home-tech-tips-section></app-home-tech-tips-section>
    <app-home-recovery-blog-sections></app-home-recovery-blog-sections>
  `,
})
export class HomeBlogSectionsComponent {
}
