import {Component, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faExclamationTriangle, faPersonDigging} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-disclaimer',
  imports: [
    FaIconComponent
  ],
  template: `
    <section class="container mx-auto text-center space-y-4 pointer-events-auto gap-x-20 px-4 sm:px-24 md:px-48 m-12">
      <h4>
        <fa-icon [icon]="icon" class="text-red-500 text-3xl"/>
        Disclaimer
        <fa-icon [icon]="icon" class="text-red-500 text-3xl"/>
      </h4>

      <fa-icon [icon]="workIcon" class="text-yellow-500 text-5xl"></fa-icon>

      <p>{{ message }}</p>
    </section>`,
  styles: ``
})
export class DisclaimerComponent {
  @Input() icon!: any;
  @Input() workIcon!: any;
  @Input() message!: string;

  protected readonly faExclamationTriangle = faExclamationTriangle;
  protected readonly faPersonDigging = faPersonDigging;
}
