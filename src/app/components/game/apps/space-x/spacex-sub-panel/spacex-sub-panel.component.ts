import {Component, ChangeDetectionStrategy} from '@angular/core';
import {
  SpaceXCrew,
  SpaceXLaunch,
  SpaceXLaunchpad,
  SpaceXPanelItemId,
  SpaceXRocket
} from '../models/spacex-models';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class SpacexSubPanelComponent {
  launch!: SpaceXLaunch;
  rocket!: SpaceXRocket;
  launchpad!: SpaceXLaunchpad;
  crew: SpaceXCrew[] = [];
  panel: string = 'rocket';
  itemId: SpaceXPanelItemId = '';

  constructor(
    private readonly spacex: SpacexService,
  ) {
    this.spacex.selectedPanel.pipe(takeUntilDestroyed())
      .subscribe(selection => {
        if (!selection.panel || !selection.itemId) return;

        this.panel = selection.panel;
        this.itemId = selection.itemId;
        this.loadPanelData(selection.itemId, selection.panel);
      })
  }

  private loadPanelData(id: SpaceXPanelItemId, type: string) {
    switch (type) {
      case 'launch':
        if (typeof id !== 'string') return;
        this.spacex.getLaunchById(id).pipe(take(1)).subscribe(data => this.launch = data);
        break;
      case 'rocket':
        if (typeof id !== 'string') return;
        this.spacex.getRocketById(id).pipe(take(1)).subscribe(data => this.rocket = data);
        break;
      case 'launchpad':
        if (typeof id !== 'string') return;
        this.spacex.getLaunchpadById(id).pipe(take(1)).subscribe(data => this.launchpad = data);
        break;
      case 'crew':
        if (typeof id === 'string') return;
        id.forEach(({crew}) => {
          this.spacex.getCrewById(crew).pipe(take(1)).subscribe((data: SpaceXCrew) => this.crew.push(data));
        });
        break;
    }
  }
}
