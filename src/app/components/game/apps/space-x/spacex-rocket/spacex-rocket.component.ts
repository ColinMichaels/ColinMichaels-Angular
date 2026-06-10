import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {SpaceXRocket} from '../models/spacex-models'
import {DecimalPipe, NgForOf, NgIf, UpperCasePipe} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faWikipediaW} from '@fortawesome/free-brands-svg-icons';

@Component({
  selector: 'app-spacex-rocket',
  templateUrl: './spacex-rocket.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    DecimalPipe,
    NgForOf,
    NgIf,
    FaIconComponent,
    UpperCasePipe
  ],
})
export class SpacexRocketComponent {
  @Input() rocket: SpaceXRocket = {} as SpaceXRocket;
  protected readonly faWikipediaW = faWikipediaW;
}
