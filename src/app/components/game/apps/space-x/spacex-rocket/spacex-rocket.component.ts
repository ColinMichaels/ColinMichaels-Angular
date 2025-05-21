import {Component, Input} from '@angular/core';
import {SpaceXRocket} from '../models/spacex-models'
import {DecimalPipe, NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-spacex-rocket',
  templateUrl: './spacex-rocket.component.html',
  imports: [
    DecimalPipe,
    NgForOf,
    NgIf
  ],
})
export class SpacexRocketComponent {
  @Input() rocket: SpaceXRocket = {} as SpaceXRocket;
}
