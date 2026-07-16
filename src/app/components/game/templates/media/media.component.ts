import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {IconDefinition, IMediaItem, MediaItem} from '../../services/media.service';
import {NgIf} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {SvgIconComponent} from '../app-icon/svg-icon.component';
import {IconProp} from '@fortawesome/fontawesome-svg-core';
import {Observable} from 'rxjs';
import {SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    FontAwesomeModule,
    NgIf,
    SvgIconComponent
  ],
  styles: `
    .media-image {
      max-width: 100%;
      max-height: 200px;
      object-fit: contain;
    }

    .media-svg {
      display: inline-block;
      vertical-align: middle;
    }

    .media-unknown {
      color: #999;
      font-style: italic;
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ng-container *ngIf="media?.content as content">

      <!-- Image rendering -->
      <img *ngIf="isImage()"
           [src]="imageUrl"
           [alt]="altText"
           loading="lazy"
           class="media-image w-full h-full"/>

      <!-- Icon rendering -->
      <ng-container *ngIf="isIcon() && icon">
        <!-- Material Icons -->
        <!--    <mat-icon *ngIf="icon.type === 'material'"
                      [ngClass]="icon.className"
                      [style.color]="icon.color"
                      [style.fontSize.px]="icon.size || 24">
              {{ icon.name }}
            </mat-icon>-->

        <!-- FontAwesome Icons -->
        <fa-icon *ngIf="icon.type === 'fontawesome'"
                 [icon]="fontAwesomeIcon">
        </fa-icon>

        <!-- Custom Icons -->
        <i *ngIf="icon.type === 'custom'"
           [class]="icon.className || icon.name"
           [style.color]="icon.color"
           [style.font-size.px]="icon.size || 24">
        </i>
        <!-- Inline SVG -->
        <app-svg-icon *ngIf="icon.type === 'svg'"
                  [icon]="svgIcon"
                  [style.color]="icon.color"
                  class="media-svg w-8 h-8"
                  [style.width.px]="icon.size || 24"
                  [style.height.px]="icon.size || 24">
        </app-svg-icon>
      </ng-container>
    </ng-container>

    <!-- Optional fallback -->
<!--    <ng-container *ngIf="!media?.content">
      <i class="fa fa-bell text-sm"></i>
     <span class="media-unknown">[ No media content ]</span>
    </ng-container>-->
  `
})
export class MediaComponent {
  @Input({
    transform: (value: IMediaItem | undefined): MediaItem => {
      return value ? new MediaItem(value) : new MediaItem({id: '', title: ''});
    }
  })
  media!: MediaItem;

  isImage(): boolean {
    return this.media?.content?.type === 'image';
  }

  isIcon(): boolean {
    return this.media?.content?.type === 'icon';
  }

  get icon(): IconDefinition | null {
    return this.isIcon() ? this.media.content?.data as IconDefinition : null;
  }

  get fontAwesomeIcon(): IconProp {
    const icon = this.icon;
    if (!icon || icon.type !== 'fontawesome') {
      throw new Error('Font Awesome icon data is unavailable.');
    }
    const iconValue = icon.svgPath instanceof Observable ? icon.className : icon.svgPath ?? icon.className;
    if (!iconValue) {
      throw new Error('Font Awesome icons require a class name or SVG path.');
    }
    return iconValue as IconProp;
  }

  get svgIcon(): Observable<SafeHtml> {
    const icon = this.icon;
    if (!icon || icon.type !== 'svg' || !(icon.svgPath instanceof Observable)) {
      throw new Error('SVG icon data is unavailable.');
    }
    return icon.svgPath;
  }

  get imageUrl(): string | null {
    return this.isImage() ? this.media.content?.data as string : null;
  }

  get altText(): string {
    return this.media?.content?.alt || this.media?.title || 'media';
  }
}
