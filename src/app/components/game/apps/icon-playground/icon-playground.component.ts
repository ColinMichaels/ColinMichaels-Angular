import {Component, OnInit} from '@angular/core';
import {SvgService} from '../../services/svg.service'; // Adjust the path
import {NgFor} from '@angular/common';
import {FileExtensions, SvgIcons} from '../../services/file-system.service';
import {SvgIconComponent} from '../../templates/app-icon/svg-icon.component';
import {TooltipDirective} from '../../directives/tooltip.directive';

@Component({
  selector: 'app-icon-playground',
  standalone: true,
  imports: [NgFor, SvgIconComponent, TooltipDirective],
  template: `
    <div class="icon-gallery p-4 py-10">
      <div class="grid grid-cols-5 gap-2 gap-y-8 mt-4">
        <div *ngFor="let icon of iconsList"
             class="icon-item flex flex-col items-center">
          <div class="w-10 h-10" [appTooltip]="icon.name">
            <svg-icon [icon]="icon.icon"/>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IconPlaygroundComponent implements OnInit {

  iconsList!: any[];

  constructor( private svg: SvgService) {}

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

}
