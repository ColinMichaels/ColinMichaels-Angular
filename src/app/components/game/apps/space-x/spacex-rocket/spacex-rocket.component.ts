import {Component, Input} from '@angular/core';
import {SpaceXRocket} from '../models/spacex-models'
import {DecimalPipe, NgForOf, NgIf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faWikipediaW} from '@fortawesome/free-brands-svg-icons';
import {TooltipDirective} from '../../../directives/tooltip.directive';

@Component({
  selector: 'app-spacex-rocket',
  templateUrl: './spacex-rocket.component.html',
  imports: [
    DecimalPipe,
    NgForOf,
    NgIf,
    FaIconComponent,
    TooltipDirective
  ],
})
export class SpacexRocketComponent {
  @Input() rocket: SpaceXRocket = {} as SpaceXRocket;
  protected readonly faWikipediaW = faWikipediaW;
}
