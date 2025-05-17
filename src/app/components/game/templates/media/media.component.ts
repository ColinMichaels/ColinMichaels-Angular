import {Component, Input} from '@angular/core';
import {IconDefinition, IMediaItem, MediaItem} from '../../services/media.service';
import {NgIf} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {SvgIconComponent} from '../app-icon/svg-icon.component';

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
  template: `
    <ng-container *ngIf="media?.content as content">

      <!-- Image rendering -->
      <img *ngIf="isImage()"
           [src]="imageUrl"
           [alt]="altText"
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
                 [icon]="icon.className || icon.svgPath">
        </fa-icon>

        <!-- Custom Icons -->
        <i *ngIf="icon.type === 'custom'"
           [class]="icon.className || icon.name"
           [style.color]="icon.color"
           [style.font-size.px]="icon.size || 24">
        </i>
        <!-- Inline SVG -->
        <svg-icon *ngIf="icon.type === 'svg'"
                  [icon]="icon.svgPath"
                  [style.color]="icon.color"
                  class="media-svg w-8 h-8"
                  [style.width.px]="icon.size || 24"
                  [style.height.px]="icon.size || 24">
        </svg-icon>
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

  get imageUrl(): string | null {
    return this.isImage() ? this.media.content?.data as string : null;
  }

  get altText(): string {
    return this.media?.content?.alt || this.media?.title || 'media';
  }
}
