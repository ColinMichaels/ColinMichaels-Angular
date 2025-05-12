import { Component, Input } from '@angular/core';
import {IconDefinition, IMediaItem, MediaItem} from '../../services/media.service';
import {NgIf} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
// Move to shared/models

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  standalone: true,
  imports: [
    FontAwesomeModule,
    NgIf
  ],
  styles: `.media-image {
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
  `
})
export class MediaComponent {
  @Input({transform: (value: IMediaItem | undefined): MediaItem =>{
    return value ? new MediaItem(value) : new MediaItem({ id: '', title: '' });
    }})
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
