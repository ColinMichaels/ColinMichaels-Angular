import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {LoadedSvgIcon, SvgService} from '../../services/svg.service';
import {NgFor} from '@angular/common';
import {FileExtensions, SvgIcons} from '../../services/file-system.service';
import {SvgIconComponent} from '../../templates/app-icon/svg-icon.component';
import {TooltipDirective} from '../../directives/tooltip.directive';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-icon-playground',
  standalone: true,
  imports: [NgFor, SvgIconComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="icon-gallery p-4 py-10">
      <div class="grid grid-cols-5 gap-2 gap-y-8 mt-4">
        <button *ngFor="let icon of iconsList"
             type="button"
             class="icon-item flex flex-col items-center border-0 bg-transparent p-0 text-inherit"
             [attr.aria-label]="'Preview ' + icon.name + ' icon'"
             (click)="showNotify(icon.name, icon)">
          <div class="w-10 h-10 shadow-xl shadow-black/50 active:shadow-0" [appTooltip]="icon.name">
            <app-svg-icon [icon]="icon.icon"/>
          </div>
        </button>
      </div>
    </div>
  `
})
export class IconPlaygroundComponent implements OnInit {

  iconsList: LoadedSvgIcon[] = [];

  constructor(
    private readonly svg: SvgService,
    private readonly notify: NotificationService
    ) {}

  ngOnInit(): void {
    this.iconsList = this.getSystemIcons().concat(this.getFileIcons());
  }

  private getSystemIcons(): LoadedSvgIcon[] {
    const systemSvgIcons = Object.values(SvgIcons);
    return this.svg.loadIcons(systemSvgIcons, 'system');
  }

  private getFileIcons(): LoadedSvgIcon[] {
    const fileTypeIcons = Object.values(FileExtensions);
    return this.svg.loadIcons(fileTypeIcons, 'filetypes');
  }

  showNotify(message = '', icon: LoadedSvgIcon) {
    const test = this.svg.loadIcons([icon.name], icon.type)[0];
    console.warn('test',test);
    this.notify.show({
      title: 'Icon',
      message,
      media: {
        content: {
          type: "icon",
          data: {
            name: 'icon',
            type: 'svg',
            svgPath: test.icon
          }
        },
        id: 'icon-' + icon.name,
        title: 'Icon:' + icon.name
      }
    })
  }
}
