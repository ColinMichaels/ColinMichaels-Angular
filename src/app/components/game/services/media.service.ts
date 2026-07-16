import { Injectable } from '@angular/core';
import {IconProp} from '@fortawesome/fontawesome-svg-core';
import {Observable} from 'rxjs';
import {SafeHtml} from '@angular/platform-browser';

// Define supported icon libraries/types
export type IconType = 'material' | 'fontawesome' | 'custom' | 'svg';

// Define the icon structure
export interface IconDefinition {
  type: IconType;
  name: string;          // icon name/id within the library
  className?: string;    // optional CSS classes
  svgPath?: IconProp | Observable<SafeHtml>;
  color?: string;       // optional color override
  size?: string | number; // optional size override
}

export class MediaItem implements IMediaItem {
  public readonly id: string;
  public readonly title: string;
  public readonly description?: string;
  public readonly content?: MediaContent;
  public readonly mediaType?: MediaType;
  public readonly url?: string;

  constructor(init: MediaItemInit) {
    this.id = init.id;
    this.title = init.title;
    this.description = init.description;
    if (!init.content) {
      throw new Error('Content is required for MediaItem');
    }

    this.content = init.content;
    this.mediaType = init.mediaType;
    this.url = init.url;
  }

  static createImage(id: string, title: string, imageUrl: string, alt?: string): MediaItem {
    return new MediaItem({
      id,
      title,
      content: {
        type: 'image',
        data: imageUrl,
        alt
      }
    });
  }

  static createIcon(id: string, title: string, iconDef: IconDefinition): MediaItem {
    return new MediaItem({
      id,
      title,
      content: {
        type: 'icon',
        data: iconDef
      }
    });
  }
}

type MediaType = 'video' | 'audio' | 'document';

interface MediaContent {
  type: 'image' | 'icon' | 'svg' | 'custom';
  data: string | IconDefinition;
  alt?: string;
}

interface MediaItemInit {
  id: string;
  title: string;
  description?: string;
  content?: MediaContent;
  mediaType?: MediaType;
  url?: string;
}

export interface IMediaItem {
  id: string;
  title: string;
  description?: string;
  content?: {
    type: 'image' | 'icon' | 'svg' | 'custom';
    data: string | IconDefinition; // URL for images, IconDefinition for icons
    alt?: string;
  };
  mediaType?: 'video' | 'audio' | 'document';
  url?: string;
}


@Injectable({ providedIn: 'root' })
export class MediaService {
  preload(media: MediaItem): void {
    if (!media?.content?.data) return;
    if (media.content.type === 'image') {
      const el = new Image();
      el.src = media.content.data as string;
    }
  }

  createFromType(type: string): MediaItem | null {
    // Optional: create randomized media for testing
    switch (type) {
      case 'image':
        return {
          id: 'image',
          title: 'image',
          content: {
            type: 'image',
            data: 'https://via.placeholder.com/150'
          },
        };
      case 'icon':
        return {
          id: 'icon',
          title: 'icon',
         content: {
           type: 'icon',
           data: 'fa fa-bell'
         }
        };
      default:
        return null;
    }
  }
}
