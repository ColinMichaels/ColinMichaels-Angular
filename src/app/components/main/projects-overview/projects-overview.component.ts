import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ScrollEffectsModule} from '../../../modules/scroll/scroll-effects.module';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-projects-overview',
  imports: [
    RouterLink,
    ScrollEffectsModule,
    NgForOf
  ],
  templateUrl: './projects-overview.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class ProjectsOverviewComponent {
  @Input() features!: any;
  @Input() title!: string;
  @Input() description!: string;
  @Input() githubUrl!: string;

}
