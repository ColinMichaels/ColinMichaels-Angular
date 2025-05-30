import {Component, Input} from '@angular/core';
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
  styles: [`
    .project-section {
      @apply p-4 sm:p-8 grid grid-cols-1 md:grid-cols-10 grid-flow-dense md:grid-flow-col border
      rounded-lg shadow-2xl  border-white/30 bg-teal-950/30;
      .project-section-header {
        @apply flex flex-col justify-center  sm:col-span-4 text-pretty text-left font-sans;
        h3 {
          @apply text-xl font-bold;
        }

        p {
          @apply mt-2 text-base text-gray-400;
        }
      }

      .project-example-container {
        @apply block w-full h-fit  justify-start max-h-full items-center max-w-4xl sm:col-span-6 scale-75 sm:scale-90;
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
