import {Component, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';


@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [
    FaIconComponent
  ],
  styles: ``,
  template: `
    <div class=" w-fit  justify-center mx-auto mb-8 pb-1.5">
      <div class="flex space-x-2">
        <h2 class="text-2xl">{{sectionTitle}}</h2>
        <h4 class="text-base" [class.hidden]="!subTitle">{{subTitle}}</h4>
        <fa-icon class="text-emerald-400" [class.hidden]="!showIcon" [size]="iconSize" [icon]="icon"/>
      </div>
    </div>
  `
})
export class SectionHeaderComponent {
  @Input() sectionTitle!: string;
  @Input() subTitle!: string;
  @Input() hidden!: boolean;
  @Input() iconSize!: any;
  @Input() iconColor!: string;
  @Input() showIcon!: boolean;
  @Input() icon!: any;

}
