import {Component, Input} from '@angular/core';
import {NgForOf, NgIf, UpperCasePipe} from '@angular/common';
import {SpaceXCrew} from '../models/spacex-models';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faExternalLink} from '@fortawesome/free-solid-svg-icons';
import {SpacexService} from '../spacex.service';

@Component({
  selector: 'app-spacex-crew',
  templateUrl: './spacex-crew.component.html',
  imports: [
    NgForOf,
    NgIf,
    FaIconComponent,
    UpperCasePipe,
  ]
})
export class SpacexCrewComponent {
  @Input() crew: SpaceXCrew[] = [];

  protected readonly faExternalLink = faExternalLink;

  constructor(private spacex: SpacexService) {
  }

  loadLaunch(id: string) {
    this.spacex.setLaunchId(id);
  }
}
