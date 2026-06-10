import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-project-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="project-section" [attr.title]="title" [attr.dir]="isReversed ? 'rtl' : null">
      <div class="project-section-header" [attr.dir]="isReversed ? 'ltr' : null">
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <div class="project-example-container" [attr.dir]="isReversed ? 'ltr' : null">
        <ng-content></ng-content>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .project-section {
      @apply grid min-w-0 grid-cols-1 gap-5 border border-white/20 bg-teal-950/30 p-4 shadow-2xl sm:p-6;
      .project-section-header {
        @apply min-w-0 text-pretty text-left font-sans;
        h3 {
          @apply text-2xl font-semibold text-white;
        }

        p {
          @apply mt-2 max-w-3xl text-sm leading-6 text-gray-400;
        }
      }

      .project-example-container {
        @apply block min-w-0 w-full overflow-hidden;
        .project-example {
          @apply w-full;
        }

        > div {
          @apply flex flex-col items-start justify-start w-full;
        }

        app-window-header {
          @apply w-full;
        }
      }
    }
  `]
})
export class ProjectItemComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() isReversed: boolean = false;
}
