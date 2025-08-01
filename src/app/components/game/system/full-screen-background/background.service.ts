import {Injectable, signal} from '@angular/core';
import {BackgroundConfig, ParallaxElement, VideoProvider} from './full-screen-background.component';

export interface BackgroundPreset {
  id: string;
  name: string;
  config: BackgroundConfig;
  parallaxElements?: ParallaxElement[];
}

@Injectable({
  providedIn: 'root'
})
export class BackgroundService {
  private currentConfig = signal<BackgroundConfig>({type: 'solid', color: '#000000'});
  private currentParallaxElements = signal<ParallaxElement[]>([]);

  private presets: BackgroundPreset[] = [
    {
      id: 'youtube-hero',
      name: 'YouTube Hero Video',
      config: {
        type: 'video',
        videoProvider: {
          type: 'youtube',
          videoId: 'dQw4w9WgXcQ', // Example video ID
          autoplay: true,
          muted: true,
          loop: true,
          controls: false,
          quality: 'hd720'
        },
        fallbackImage: 'assets/images/youtube-fallback.jpg',
        opacity: 0.8,
        overlay: {color: '#000000', opacity: 0.3}
      }
    },
    {
      id: 'vimeo-cinematic',
      name: 'Vimeo Cinematic',
      config: {
        type: 'video',
        videoProvider: {
          type: 'vimeo',
          videoId: '148751763', // Example video ID
          autoplay: true,
          muted: true,
          loop: true,
          controls: false
        },
        fallbackImage: 'assets/images/vimeo-fallback.jpg',
        opacity: 1,
        overlay: {color: '#1a1a1a', opacity: 0.4}
      }
    }
  ];

  getCurrentConfig() {
    return this.currentConfig.asReadonly();
  }

  getCurrentParallaxElements() {
    return this.currentParallaxElements.asReadonly();
  }

  getPresets(): BackgroundPreset[] {
    return [...this.presets];
  }

  // YouTube URL parsing utilities
  extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  // Vimeo URL parsing utilities
  extractVimeoVideoId(url: string): string | null {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  createYouTubeConfigFromUrl(
    url: string,
    options?: {
      videoProvider?: Partial<Omit<VideoProvider, 'type' | 'videoId'>>;
      background?: Partial<Omit<BackgroundConfig, 'type' | 'videoProvider'>>;
    }
  ): BackgroundConfig | null {
    return this.createVideoConfigFromProviderUrl(url, 'youtube', options);
  }

  createVimeoConfigFromUrl(
    url: string,
    options?: {
      videoProvider?: Partial<Omit<VideoProvider, 'type' | 'videoId'>>;
      background?: Partial<Omit<BackgroundConfig, 'type' | 'videoProvider'>>;
    }
  ): BackgroundConfig | null {
    return this.createVideoConfigFromProviderUrl(url, 'vimeo', options);
  }


  createVideoConfigFromProviderUrl(
    url: string,
    providerType: 'youtube' | 'vimeo',
    options?: {
      videoProvider?: Partial<Omit<VideoProvider, 'type' | 'videoId'>>;
      background?: Partial<Omit<BackgroundConfig, 'type' | 'videoProvider'>>;
    }
  ): BackgroundConfig | null {
    // Extract video ID based on provider type
    const videoId = providerType === 'youtube'
      ? this.extractYouTubeVideoId(url)
      : this.extractVimeoVideoId(url);

    if (!videoId) return null;

    return {
      type: 'video',
      videoProvider: {
        type: providerType,
        videoId,
        autoplay: true,
        muted: true,
        loop: true,
        controls: false,
        ...options?.videoProvider
      },
      opacity: 1,
      ...options?.background
    };
  }


  private isDirectVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const lowercaseUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowercaseUrl.includes(ext));
  }

  // Existing methods...
  setConfig(config: BackgroundConfig): void {
    this.currentConfig.set(config);
  }

  setParallaxElements(elements: ParallaxElement[]): void {
    this.currentParallaxElements.set(elements);
  }

  applyPreset(presetId: string): boolean {
    const preset = this.getPreset(presetId);
    if (preset) {
      this.currentConfig.set(preset.config);
      if (preset.parallaxElements) {
        this.currentParallaxElements.set(preset.parallaxElements);
      }
      return true;
    }
    return false;
  }

  getPreset(id: string): BackgroundPreset | undefined {
    return this.presets.find(preset => preset.id === id);
  }

  addPreset(preset: BackgroundPreset): void {
    const existingIndex = this.presets.findIndex(p => p.id === preset.id);
    if (existingIndex > -1) {
      this.presets[existingIndex] = preset;
    } else {
      this.presets.push(preset);
    }
  }

  // YouTube-specific utilities
  getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
  }

  // Vimeo-specific utilities
  async getVimeoThumbnail(videoId: string): Promise<string | null> {
    try {
      const response = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
      const data = await response.json();
      return data[0]?.thumbnail_large || null;
    } catch (error) {
      console.error('Failed to fetch Vimeo thumbnail:', error);
      return null;
    }
  }
}
