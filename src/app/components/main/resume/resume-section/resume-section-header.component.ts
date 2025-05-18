import {Component, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';


@Component({
  selector: 'app-resume-section-header',
  standalone: true,
  imports: [
    FaIconComponent
  ],
  styles: ``,
  template: `
    <div class="flex w-fit  justify-center mx-auto mb-8 pb-1.5">
      <div class="flex space-x-2">
        <fa-icon class="text-emerald-400" [icon]="icon"/>
      <h2 class="text-2xl">{{sectionTitle}}</h2>
      </div>
    </div>
  `
})
export class ResumeSectionHeaderComponent {
  @Input() sectionTitle!: string;
  @Input() icon!: any;

}
