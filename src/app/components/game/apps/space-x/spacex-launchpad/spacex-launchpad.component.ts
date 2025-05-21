import {Component, Input} from '@angular/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {SpaceXLaunchpad} from '../models/spacex-models';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMapLocation} from '@fortawesome/free-solid-svg-icons';
import {SpacexService} from '../spacex.service';

@Component({
  selector: 'app-spacex-launchpad',
  templateUrl: './spacex-launchpad.component.html',
  imports: [
    NgClass,
    NgForOf,
    NgIf,
    FaIconComponent
  ]
})
export class SpacexLaunchpadComponent {
  @Input() launchpad: SpaceXLaunchpad = {} as SpaceXLaunchpad;
  googleMapsEndpoint = 'https://maps.google.com/?q=';

  constructor(private spacex: SpacexService) {
  }

  openMap(latitude: number, longitude: number) {
    window.open(this.googleMapsEndpoint + `${latitude},${longitude}`, '_blank', 'location=no width=800 height=600');
  }

  protected readonly faMapLocation = faMapLocation;

  loadLaunch(id: string) {
    this.spacex.setLaunchId(id);
  }
}
