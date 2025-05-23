import {Component, OnInit} from '@angular/core';
import {SvgService} from '../../services/svg.service'; // Adjust the path
import {NgFor} from '@angular/common';
import {FileExtensions, SvgIcons} from '../../services/file-system.service';
import {SvgIconComponent} from '../../templates/app-icon/svg-icon.component';
import {TooltipDirective} from '../../directives/tooltip.directive';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-icon-playground',
  standalone: true,
  imports: [NgFor, SvgIconComponent, TooltipDirective],
  template: `
    <div class="icon-gallery p-4 py-10">
      <div class="grid grid-cols-5 gap-2 gap-y-8 mt-4">
        <div *ngFor="let icon of iconsList"
             class="icon-item flex flex-col items-center" (click)="showNotify(icon.name, icon)">
          <div class="w-10 h-10 shadow-xl shadow-black/50 active:shadow-0" [appTooltip]="icon.name">
            <svg-icon [icon]="icon.icon"/>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IconPlaygroundComponent implements OnInit {

  iconsList!: any[];

  constructor(
    private readonly svg: SvgService,
    private readonly notify: NotificationService
    ) {}

  ngOnInit(): void {
    this.iconsList = this.getSystemIcons().concat(this.getFileIcons());
  }

  private getSystemIcons(): any[] {
    const systemSvgIcons = Object.values(SvgIcons);
    return this.svg.loadIcons(systemSvgIcons, 'system');
  }

  private getFileIcons(): any[] {
    const fileTypeIcons = Object.values(FileExtensions);
    return this.svg.loadIcons(fileTypeIcons, 'filetypes');
  }

  showNotify(message = '', icon: any) {
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
