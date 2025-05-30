import {Component} from '@angular/core';
import {SpaceXLaunch, SpaceXRocket, SpaceXLaunchpad, SpaceXCrew} from '../models/spacex-models';
import {SpacexCrewComponent} from '../spacex-crew/spacex-crew.component';
import {SpacexLaunchpadComponent} from '../spacex-launchpad/spacex-launchpad.component';
import {SpacexRocketComponent} from '../spacex-rocket/spacex-rocket.component';
import {NgSwitch, NgSwitchCase} from '@angular/common';
import {SpacexService} from '../spacex.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {take} from 'rxjs';

@Component({
  selector: 'app-spacex-sub-panel',
  imports: [
    SpacexCrewComponent,
    SpacexLaunchpadComponent,
    SpacexRocketComponent,
    NgSwitch,
    NgSwitchCase
  ],
  templateUrl: './spacex-sub-panel.component.html',
  styles: ``
})
export class SpacexSubPanelComponent {
  launch!: SpaceXLaunch;
  rocket!: SpaceXRocket;
  launchpad!: SpaceXLaunchpad;
  crew: SpaceXCrew[] = [];
  panel: string = 'rocket';
  itemId: string = '';

  constructor(
    private readonly spacex: SpacexService,
  ) {
    this.spacex.selectedPanel.pipe(takeUntilDestroyed())
      .subscribe((panel: any) => {
        this.panel = panel.panel;
        this.itemId = panel.itemId;
        this.loadPanelData(panel.itemId, panel.panel);
      })
  }

  private loadPanelData(id: any, type: 'launch' | 'rocket' | 'launchpad' | 'crew') {
    console.warn(id);
    if (!id) return;

    switch (type) {
      case 'launch':
        this.spacex.getLaunchById(id).pipe(take(1)).subscribe(data => this.launch = data);
        break;
      case 'rocket':
        this.spacex.getRocketById(id).pipe(take(1)).subscribe(data => this.rocket = data);
        break;
      case 'launchpad':
        this.spacex.getLaunchpadById(id).pipe(take(1)).subscribe(data => this.launchpad = data);
        break;
      case 'crew':
        id.map((crew: any) => {
          console.log(crew);
          this.spacex.getCrewById(crew.crew).pipe(take(1)).subscribe((data: SpaceXCrew) => this.crew.push(data));
        })

        break;
    }
  }
}
