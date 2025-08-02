import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
  ChangeDetectionStrategy,
  signal,
  computed,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {DomSanitizer} from '@angular/platform-browser';

export interface ParallaxElement {
  id: string;
  element?: HTMLElement;
  speed: number; // 0-1, where 1 is normal scroll speed
  direction?: 'vertical' | 'horizontal' | 'both';
  initialOffset?: { x: number; y: number };
}

export interface VideoProvider {
  type: 'youtube' | 'vimeo' | 'direct';
  videoId?: string; // For YouTube/Vimeo
  url?: string; // For direct video files
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  startTime?: number; // In seconds
  endTime?: number; // In seconds
  quality?: 'auto' | 'small' | 'medium' | 'large' | 'hd720' | 'hd1080';
}

export interface BackgroundConfig {
  type: 'video' | 'image' | 'gradient' | 'solid';
  source?: string; // video URL or image URL
  videoProvider?: VideoProvider; // For YouTube/Vimeo integration
  fallbackImage?: string; // fallback for video
  gradient?: string; // CSS gradient
  color?: string; // solid color
  opacity?: number;
  blur?: number;
  overlay?: {
    color: string;
    opacity: number;
  };
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    Vimeo: any;
  }
}

@Component({
  selector: 'app-full-screen-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fullscreen-background"
         [style.height.px]="containerHeight()"
         [style.background]="solidBackground()">

      <!-- Direct Video Background -->
      <video
        *ngIf="config.type === 'video' && config.videoProvider?.type === 'direct' && config.source"
        #videoElement
        class="background-media"
        [style.filter]="filterStyles()"
        [style.opacity]="config.opacity || 1"
        [src]="config.source"
        [poster]="config.fallbackImage"
        [autoplay]="config.videoProvider?.autoplay !== false"
        [muted]="config.videoProvider?.muted !== false"
        [loop]="config.videoProvider?.loop !== false"
        [controls]="config.videoProvider?.controls || false"
        playsinline
        (loadeddata)="onVideoLoaded()"
        (error)="onVideoError()">
      </video>

      <!-- YouTube Video Background -->
      <div
        *ngIf="config.type === 'video' && config.videoProvider?.type === 'youtube'"
        class="video-container"
        [style.filter]="filterStyles()"
        [style.opacity]="config.opacity || 1">
        <div #youtubePlayer class="youtube-player"></div>
        <img
          *ngIf="config.fallbackImage && !youtubeReady()"
          [src]="config.fallbackImage"
          class="background-media"
          alt="Video fallback">
      </div>

      <!-- Vimeo Video Background -->
      <div
        *ngIf="config.type === 'video' && config.videoProvider?.type === 'vimeo'"
        class="video-container"
        [style.filter]="filterStyles()"
        [style.opacity]="config.opacity || 1">
        <iframe
          #vimeoPlayer
          class="vimeo-player"
          [src]="vimeoEmbedUrl()"
          frameborder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen>
        </iframe>
        <img
          *ngIf="config.fallbackImage && !vimeoReady()"
          [src]="config.fallbackImage"
          class="background-media"
          alt="Video fallback">
      </div>

      <!-- Image Background -->
      <img
        *ngIf="config.type === 'image' && config.source"
        class="background-media"
        [style.filter]="filterStyles()"
        [style.opacity]="config.opacity || 1"
        [src]="config.source"
        alt="Background">

      <!-- Gradient Background -->
      <div
        *ngIf="config.type === 'gradient'"
        class="background-media"
        [style.background]="config.gradient"
        [style.opacity]="config.opacity || 1">
      </div>

      <!-- Overlay -->
      <div
        *ngIf="config.overlay"
        class="background-overlay"
        [style.background-color]="config.overlay.color"
        [style.opacity]="config.overlay.opacity">
      </div>

      <!-- Parallax Elements Container -->
      <div class="parallax-container" #parallaxContainer>
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .fullscreen-background {
      position: relative;
      width: 100vw;
      overflow: hidden;
      z-index: 0;
    }

    .background-media {
      position: absolute;
      top: 50%;
      left: 50%;
      min-width: 100%;
      min-height: 100%;
      width: auto;
      height: auto;
      transform: translate(-50%, -50%);
      object-fit: cover;
      z-index: -2;
    }

    .video-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -2;
    }

    .youtube-player {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100vw;
      height: 56.25vw; /* 16:9 aspect ratio */
      min-height: 100vh;
      min-width: 177.77vh; /* 16:9 aspect ratio */
      transform: translate(-50%, -50%);
    }

    .vimeo-player {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100vw;
      height: 56.25vw; /* 16:9 aspect ratio */
      min-height: 100vh;
      min-width: 177.77vh; /* 16:9 aspect ratio */
      transform: translate(-50%, -50%);
      border: none;
    }

    .background-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
    }

    .parallax-container {
      position: relative;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})

/**
 * Fullscreen background component.
 *
 * Supports:
 * - Solid background
 * - Video background
 * - Image background
 * - Gradient background
 * - Overlay
 * - Parallax elements
 * - YouTube video background
 * - Vimeo video background
 * - Blur filter
 *
 * Example Usage:
 *  <app-fullscreen-background
 *    [config]="{ type: 'solid', color: '#000000' }"
 *    [height]="100vh"
 *    [enableParallax]="true"
 *    [parallaxElements]="[
 *      { id: 'element-1', speed: 0.2, direction: 'vertical', initialOffset: { x: 0, y: 0 } },
 *      { id: 'element-2', speed: 0.1, direction: 'horizontal', initialOffset: { x: 0, y: 0 } }
 *    ]">
 *    <div id="element-1"></div>
 *    <div id="element-2"></div>
 *
 *    </app-fullscreen-background>
 *
 *  <app-fullscreen-background
 *    [config]="{ type: 'video', videoProvider: { type: 'youtube', videoId: 'dQw4w9WgXcQ' } }"
 *    [height]="100vh"
 *    [enableParallax]="true"
 *    [parallaxElements]="[
 *      { id: 'element-1', speed: 0.2, direction: 'vertical', initialOffset: { x: 0, y: 0 } }, // Vertical parallax
 *      { id: 'element-2', speed: 0.1, direction: 'horizontal', initialOffset: { x: 0, y: 0 } } // Horizontal parallax
 *
 *
 "
 >
 >
 *
 *
 */
export class FullScreenBackgroundComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: BackgroundConfig = {type: 'solid', color: '#000000'};
  @Input() height: number | string = '100vh';
  @Input() enableParallax = true;
  @Input() parallaxElements: ParallaxElement[] = [];
  @Input() parallaxIntensity = 1; // Global multiplier for parallax effects

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('youtubePlayer') youtubePlayerElement?: ElementRef<HTMLDivElement>;
  @ViewChild('vimeoPlayer') vimeoPlayerElement?: ElementRef<HTMLIFrameElement>;
  @ViewChild('parallaxContainer') parallaxContainer?: ElementRef<HTMLDivElement>;

  private scrollY = signal(0);
  private windowHeight = signal(window.innerHeight);
  protected youtubeReady = signal(false);
  protected vimeoReady = signal(false);
  private resizeObserver?: ResizeObserver;
  private animationFrame?: number;
  private youtubePlayer?: any;
  private vimeoPlayer?: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private sanitizer: DomSanitizer
  ) {
  }

  containerHeight = computed(() => {
    if (typeof this.height === 'number') {
      return this.height;
    }
    if (this.height === '100vh') {
      return this.windowHeight();
    }
    return parseInt(this.height) || this.windowHeight();
  });

  solidBackground = computed(() => {
    if (this.config.type === 'solid' && this.config.color) {
      return this.config.color;
    }
    return 'transparent';
  });

  filterStyles = computed(() => {
    const filters: string[] = [];
    if (this.config.blur) {
      filters.push(`blur(${this.config.blur}px)`);
    }
    return filters.join(' ');
  });

  vimeoEmbedUrl = computed(() => {
    if (this.config.videoProvider?.type === 'vimeo' && this.config.videoProvider.videoId) {
      const provider = this.config.videoProvider;
      const params = new URLSearchParams();

      params.set('autoplay', provider.autoplay !== false ? '1' : '0');
      params.set('muted', provider.muted !== false ? '1' : '0');
      params.set('loop', provider.loop !== false ? '1' : '0');
      params.set('controls', provider.controls ? '1' : '0');
      params.set('background', '1'); // Vimeo background mode

      if (provider.startTime) {
        params.set('t', `${provider.startTime}s`);
      }

      const url = `https://player.vimeo.com/video/${provider.videoId}?${params.toString()}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return null;
  });

  ngOnInit(): void {
    this.initializeParallaxElements();
  }

  ngAfterViewInit(): void {
    if (this.enableParallax) {
      this.setupParallaxListeners();
    }
    this.setupResizeObserver();

    if (isPlatformBrowser(this.platformId)) {
      this.initializeVideoProviders();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.youtubePlayer) {
      this.youtubePlayer.destroy();
    }
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
  }

  private async initializeVideoProviders(): Promise<void> {
    if (this.config.type === 'video' && this.config.videoProvider) {
      switch (this.config.videoProvider.type) {
        case 'youtube':
          await this.initializeYouTube();
          break;
        case 'vimeo':
          await this.initializeVimeo();
          break;
        default:
          // Direct video, no additional setup needed
          break;
      }
    }
  }

  private async initializeYouTube(): Promise<void> {
    if (!this.config.videoProvider?.videoId || !this.youtubePlayerElement) return;

    try {
      await this.loadYouTubeAPI();
      this.createYouTubePlayer();
    } catch (error) {
      console.error('Failed to initialize YouTube player:', error);
      this.onVideoError();
    }
  }

  private async initializeVimeo(): Promise<void> {
    if (!this.config.videoProvider?.videoId || !this.vimeoPlayerElement) return;

    try {
      await this.loadVimeoAPI();
      this.createVimeoPlayer();
    } catch (error) {
      console.error('Failed to initialize Vimeo player:', error);
      this.onVideoError();
    }
  }

  private loadYouTubeAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      window.onYouTubeIframeAPIReady = () => {
        resolve();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = reject;
        document.body.appendChild(script);
      }

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('YouTube API failed to load')), 10000);
    });
  }

  private loadVimeoAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Vimeo && window.Vimeo.Player) {
        resolve();
        return;
      }

      if (!document.querySelector('script[src*="player.vimeo.com"]')) {
        const script = document.createElement('script');
        script.src = 'https://player.vimeo.com/api/player.js';
        script.onload = () => resolve();
        script.onerror = reject;
        document.body.appendChild(script);
      } else {
        resolve();
      }

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Vimeo API failed to load')), 10000);
    });
  }

  private createYouTubePlayer(): void {
    if (!this.youtubePlayerElement || !this.config.videoProvider?.videoId) return;

    const provider = this.config.videoProvider;

    this.youtubePlayer = new window.YT.Player(this.youtubePlayerElement.nativeElement, {
      videoId: provider.videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: provider.autoplay !== false ? 1 : 0,
        mute: provider.muted !== false ? 1 : 0,
        loop: provider.loop !== false ? 1 : 0,
        controls: provider.controls ? 1 : 0,
        showinfo: 0,
        rel: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        start: provider.startTime || 0,
        end: provider.endTime || 0,
        hd: provider.quality === 'hd720' || provider.quality === 'hd1080' ? 1 : 0
      },
      events: {
        onReady: (event: any) => {
          this.youtubeReady.set(true);
          if (provider.autoplay !== false) {
            event.target.playVideo();
          }
          this.onVideoLoaded();
        },
        onStateChange: (event: any) => {
          // Loop the video if needed
          if (event.data === window.YT.PlayerState.ENDED && provider.loop !== false) {
            event.target.playVideo();
          }
        },
        onError: () => {
          this.onVideoError();
        }
      }
    });
  }

  private createVimeoPlayer(): void {
    if (!this.vimeoPlayerElement || !this.config.videoProvider?.videoId) return;

    const provider = this.config.videoProvider;

    this.vimeoPlayer = new window.Vimeo.Player(this.vimeoPlayerElement.nativeElement, {
      id: provider.videoId,
      width: '100%',
      height: '100%',
      autoplay: provider.autoplay !== false,
      muted: provider.muted !== false,
      loop: provider.loop !== false,
      controls: provider.controls || false,
      background: true
    });

    this.vimeoPlayer.ready().then(() => {
      this.vimeoReady.set(true);
      this.onVideoLoaded();
    }).catch(() => {
      this.onVideoError();
    });

    if (provider.startTime) {
      this.vimeoPlayer.setCurrentTime(provider.startTime);
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    if (this.enableParallax) {
      this.scrollY.set(window.pageYOffset);
      this.updateParallax();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.windowHeight.set(window.innerHeight);
  }

  private initializeParallaxElements(): void {
    this.parallaxElements.forEach(element => {
      if (!element.direction) {
        element.direction = 'vertical';
      }
      if (!element.initialOffset) {
        element.initialOffset = {x: 0, y: 0};
      }
    });
  }

  private setupParallaxListeners(): void {
    window.addEventListener('scroll', this.onScroll.bind(this), {passive: true});
    window.addEventListener('resize', this.onResize.bind(this), {passive: true});
  }

  private setupResizeObserver(): void {
    if (this.parallaxContainer) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateParallax();
      });
      this.resizeObserver.observe(this.parallaxContainer.nativeElement);
    }
  }

  private updateParallax(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = requestAnimationFrame(() => {
      this.parallaxElements.forEach(parallaxElement => {
        if (parallaxElement.element) {
          this.applyParallaxTransform(parallaxElement);
        } else {
          const element = document.getElementById(parallaxElement.id);
          if (element) {
            parallaxElement.element = element;
            this.applyParallaxTransform(parallaxElement);
          }
        }
      });
    });
  }

  private applyParallaxTransform(parallaxElement: ParallaxElement): void {
    if (!parallaxElement.element) return;

    const scrollY = this.scrollY();
    const speed = parallaxElement.speed * this.parallaxIntensity;
    const {x: initialX, y: initialY} = parallaxElement.initialOffset!;

    let transformX = initialX;
    let transformY = initialY;

    switch (parallaxElement.direction) {
      case 'vertical':
        transformY = initialY + (scrollY * speed);
        break;
      case 'horizontal':
        transformX = initialX + (scrollY * speed);
        break;
      case 'both':
        transformX = initialX + (scrollY * speed * 0.5);
        transformY = initialY + (scrollY * speed);
        break;
    }

    parallaxElement.element.style.transform =
      `translate3d(${transformX}px, ${transformY}px, 0)`;
  }

  // Video-specific methods
  onVideoLoaded(): void {
    console.log('Video background loaded successfully');
  }

  onVideoError(): void {
    console.warn('Video background failed to load, falling back to image');
  }

  // Public methods for external control
  playVideo(): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.play().catch(console.error);
    } else if (this.youtubePlayer) {
      this.youtubePlayer.playVideo();
    } else if (this.vimeoPlayer) {
      this.vimeoPlayer.play();
    }
  }

  pauseVideo(): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.pause();
    } else if (this.youtubePlayer) {
      this.youtubePlayer.pauseVideo();
    } else if (this.vimeoPlayer) {
      this.vimeoPlayer.pause();
    }
  }

  setVideoVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.volume = normalizedVolume;
    } else if (this.youtubePlayer) {
      this.youtubePlayer.setVolume(normalizedVolume * 100);
    } else if (this.vimeoPlayer) {
      this.vimeoPlayer.setVolume(normalizedVolume);
    }
  }

  muteVideo(): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.muted = true;
    } else if (this.youtubePlayer) {
      this.youtubePlayer.mute();
    } else if (this.vimeoPlayer) {
      this.vimeoPlayer.setVolume(0);
    }
  }

  unmuteVideo(): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.muted = false;
    } else if (this.youtubePlayer) {
      this.youtubePlayer.unMute();
    } else if (this.vimeoPlayer) {
      this.vimeoPlayer.setVolume(1);
    }
  }

  seekTo(timeInSeconds: number): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.currentTime = timeInSeconds;
    } else if (this.youtubePlayer) {
      this.youtubePlayer.seekTo(timeInSeconds);
    } else if (this.vimeoPlayer) {
      this.vimeoPlayer.setCurrentTime(timeInSeconds);
    }
  }

  // Parallax methods
  addParallaxElement(element: ParallaxElement): void {
    this.parallaxElements.push(element);
    this.initializeParallaxElements();
  }

  removeParallaxElement(id: string): void {
    const index = this.parallaxElements.findIndex(el => el.id === id);
    if (index > -1) {
      this.parallaxElements.splice(index, 1);
    }
  }

  updateParallaxIntensity(intensity: number): void {
    this.parallaxIntensity = intensity;
    this.updateParallax();
  }

  // Utility methods for creating video configs
  static createYouTubeConfig(videoId: string, options?: Partial<VideoProvider>): VideoProvider {
    return {
      type: 'youtube',
      videoId,
      autoplay: true,
      muted: true,
      loop: true,
      controls: false,
      ...options
    };
  }

  static createVimeoConfig(videoId: string, options?: Partial<VideoProvider>): VideoProvider {
    return {
      type: 'vimeo',
      videoId,
      autoplay: true,
      muted: true,
      loop: true,
      controls: false,
      ...options
    };
  }

  static createDirectVideoConfig(url: string, options?: Partial<VideoProvider>): VideoProvider {
    return {
      type: 'direct',
      url,
      autoplay: true,
      muted: true,
      loop: true,
      controls: false,
      ...options
    };
  }
}
