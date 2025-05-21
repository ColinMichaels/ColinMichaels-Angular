import {Component} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {DatePipe, NgForOf, NgIf} from '@angular/common';
import {
  faBars,
  faChevronLeft, faChevronRight, faFileArchive, faForward, faSpinner,
  faThumbsDown,
  faThumbsUp
} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHackerNews, faWikipediaW, faYoutube} from '@fortawesome/free-brands-svg-icons';
import {TooltipDirective} from '../../directives/tooltip.directive';
import {SpaceXLaunch} from './models/spacex-models';
import {SpacexSubPanelComponent} from './spacex-sub-panel/spacex-sub-panel.component';
import {SpacexService} from './spacex.service';

@Component({
  selector: 'app-space-x',
  imports: [
    DatePipe,
    FaIconComponent,
    NgForOf,
    NgIf,
    TooltipDirective,
    SpacexSubPanelComponent
  ],
  templateUrl: './space-x.component.html',
  styles: ``
})
export class SpaceXComponent {
  launches: SpaceXLaunch[] = [];
  selectedLaunch: SpaceXLaunch = {
    fairings: undefined,
    links: {
      patch: {
        small: '',
        large: ''
      },
      reddit: {
        campaign: '',
        launch: '',
        media: '',
        recovery: ''
      },
      flickr: {
        small: [],
        original: []
      },
      presskit: '',
      webcast: '',
      youtube_id: '',
      article: '',
      wikipedia: ''
    },
    static_fire_date_utc: '',
    static_fire_date_unix: 0,
    tdb: false,
    net: false,
    window: 0,
    rocket: '',
    success: false,
    failures: [],
    details: '',
    crew: [],
    ships: [],
    capsules: [],
    payloads: [],
    launchpad: '',
    auto_update: false,
    flight_number: 0,
    name: '',
    date_utc: '',
    date_unix: 0,
    date_local: '',
    date_precision: '',
    upcoming: false,
    cores: [],
    id: ''
  };
  panel: string = 'images';
  itemId: string = '';
  showSidebar = false;
  showSubPanel = false;
  subPanel: string = 'rocket';
  subPanelItemId: string = '';

  currentIndex = 0;

  constructor(private spaceXService: SpacexService) {
    this.spaceXService.getAllLaunches().pipe(
      takeUntilDestroyed()
    ).subscribe((launchInfo: any) => {
      this.launches = launchInfo.sort((a: any, b: any) => a.flight_number - b.flight_number)
        .slice(0, 40).reverse() as SpaceXLaunch[];
      const launch = this.selectedLaunch = this.launches[this.currentIndex];
      this.spaceXService.setSelectLaunch(launch);
    });
  }

  loadPanel(panel = 'rocket', itemId: string) {
    this.panel = panel;
    this.itemId = itemId;
    this.spaceXService.setPanel(panel, itemId);
  }

  nextLaunch(): void {

    this.currentIndex = (this.currentIndex + 1) % this.launches.length;
    const launch = this.selectedLaunch = this.launches[this.currentIndex];
    this.checkDefaultPanel(launch);
    this.spaceXService.setSelectLaunch(launch);
  }

  private checkDefaultPanel(launch: SpaceXLaunch) {
    if (launch.links.flickr.original.length <= 0) {
      this.panel = 'rocket';
      this.itemId = launch.rocket;
      this.spaceXService.setPanel('rocket', launch.rocket);
    }
  }

  previousLaunch(): void {
    this.currentIndex = (this.currentIndex - 1 + this.launches.length) % this.launches.length;
    const launch = this.selectedLaunch = this.launches[this.currentIndex];
    this.checkDefaultPanel(launch);
    this.spaceXService.setSelectLaunch(launch);
  }

  protected readonly faThumbsUp = faThumbsUp;
  protected readonly faThumbsDown = faThumbsDown;
  protected readonly faYoutube = faYoutube;
  protected readonly faHackerNews = faHackerNews;
  protected readonly faFileArchive = faFileArchive;
  protected readonly faWikipediaW = faWikipediaW;
  protected readonly faForward = faForward;

  openImage(img: string) {
    window.open(img, '_blank', 'location=no width=600 height=600');
  }


  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;

  selectLaunch(launch: SpaceXLaunch) {
    this.selectedLaunch = launch;
  }

  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
  }

  toggleSubPanel() {
    this.showSubPanel = !this.showSubPanel;
  }

  toggleSubPanelItem(panel: string, itemId: string) {
    this.subPanel = panel;
    this.subPanelItemId = itemId;
    this.spaceXService.setPanel(panel, itemId);
    this.toggleSubPanel();
  }

  protected readonly faBars = faBars;
  protected readonly faSpinner = faSpinner;
}
