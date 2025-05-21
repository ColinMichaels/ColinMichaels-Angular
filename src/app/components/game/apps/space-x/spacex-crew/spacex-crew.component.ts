import {Component, Input} from '@angular/core';
import {SpaceXCrew} from '../models/spacex-models';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-spacex-crew',
  templateUrl: './spacex-crew.component.html',
  imports: [
    NgIf,
    NgForOf
  ]
})
export class SpacexCrewComponent {
  @Input() crew: SpaceXCrew | undefined;
}
