import {ChangeDetectorRef, Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BackgroundConfig, FullScreenBackgroundComponent, ParallaxElement} from './full-screen-background.component';
import {MainHeaderComponent} from '../../../main/main-header.component';
import {SocialsComponent} from '../../../main/socials/socials.component';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-background-example',
  standalone: true,
  imports: [CommonModule, FullScreenBackgroundComponent, MainHeaderComponent, SocialsComponent, RouterLink],
  template: `
    <div class="fixed top-0 flex justify-center w-full z-50">
      <app-main-header></app-main-header>
    </div>

    <main class="bg-purple-950 w-full h-full">
      <app-full-screen-background
        [config]="imageBackgroundConfig"
        [height]="'100vh'"
        [enableParallax]="true"
        [parallaxElements]="parallaxElements"
        [parallaxIntensity]="0.8">

        <!-- Content that will be affected by parallax -->
        <div class="content-container">
          <h1 id="main-title" class="hero-title">
            Welcome to the <span class="text-purple-500">Game</span>.
          </h1>

          <button type="button" id="floating-element"
               class="floating-card bg-white/10 hover:bg-purple-500 hover:text-white cursor-pointer"
               (click)="toggleBackground()">
            <p>This should do something shouldn't it?</p>
          </button>

          <div id="background-shapes" class="background-shapes">
            <div class="shape shape-1"></div>
            <div class="shape shape-2"></div>
            <div class="shape shape-3"></div>
          </div>
        </div>
      </app-full-screen-background>

      <!-- Additional content below -->
      <div class="video-section">
        <app-full-screen-background
          [config]="{
            type: 'video',
            videoProvider: { type: 'vimeo', videoId: '179939350', autoplay: true, muted: true, loop: true, controls: false },
            source: 'assets/images/backgrounds/night.webp',
            fallbackImage: 'assets/images/backgrounds/night.webp',
            opacity: 0.8,
            }"
        >
          <div class="content-container">

            <div id="main-title" class="hero-title">
              <h2 class="text-2xl sm:text-3xl md:text-5xl text-yellow-500 font-bold mb-12">More Content Below</h2>
            </div>

            <div id="floating-element">
              <h2 class="text-2xl sm:text-3xl md:text-5xl text-red-500 font-bold absolute animate-ping">More Content
                Below</h2>
              <p>Just keep scrolling you know you want to</p>
            </div>
          </div>
          <div id="background-shapes" class="background-shapes animate-pulse">
            <div class="shape shape-1"></div>
            <div class="shape shape-2"></div>
            <div class="shape shape-3"></div>
          </div>
        </app-full-screen-background>
      </div>

      <div class="w-full min-h-screen flex justify-center items-center bg-purple-950 text-gray-300 font-black">
        <h1 class="text-7xl text-pretty">SOMETHING SHOULD BE SAID HERE</h1>
      </div>

      @defer (on hover; prefetch on immediate) {
        <div class="video-section">
          <app-full-screen-background
            [config]="{ type: 'video', videoProvider: { type: 'youtube', videoId: 'dQw4w9WgXcQ', muted:false} }">
          </app-full-screen-background>
        </div>
      } @placeholder () {
        <div class="video-section">
          <h1>Hover to see effect!</h1>
        </div>
      }

    </main>
    <div
      class="w-full min-h-screen flex flex-col justify-center space-y-4 items-center bg-black text-gray-300 font-black">
      <h1 class="text-7xl text-pretty">YOU HAVE BEEN RICK ROLLED</h1>
      <p>Thanks for playing</p>
      <button class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" [routerLink]="'/'">BACK
      </button>
    </div>
    <app-socials></app-socials>
  `,
  styles: [`
    .content-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10;
    }

    .hero-title {
      font-size: 4rem;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      margin-bottom: 2rem;
      text-align: center;
    }

    .floating-card {
      backdrop-filter: blur(10px);
      border-radius: 1rem;
      padding: 2rem;
      margin: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .background-shapes {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
    }

    .shape {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
    }

    .shape-1 {
      width: 100px;
      height: 100px;
      top: 20%;
      left: 10%;
    }

    .shape-2 {
      width: 150px;
      height: 150px;
      top: 60%;
      right: 15%;
    }

    .shape-3 {
      width: 80px;
      height: 80px;
      top: 40%;
      left: 70%;
    }

    .additional-content {
      min-height: 100vh;
      padding: 4rem 2rem;
      @apply flex flex-col items-center justify-center bg-zinc-600 text-gray-200;
    }

    .video-section {
      @apply flex flex-col items-center justify-center w-full min-h-screen bg-black text-gray-300 font-mono;
    }

    .additional-content h2 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
  `]
})
export class BackgroundExampleComponent {
  // Video background configuration
  isDark = false;
  imageSrc = 'assets/images/backgrounds/night.webp';

  backgroundConfig: BackgroundConfig = {
    type: 'image',
    source: this.imageSrc,
    fallbackImage: this.imageSrc,
    opacity: 0.8,
    blur: 6,
    overlay: {
      color: '#000000',
      opacity: 0.3
    }
  };

  // Alternative configurations you can switch between
  imageBackgroundConfig: BackgroundConfig = {
    type: 'image',
    source: this.imageSrc,
    opacity: 1,
    blur: 2,
    overlay: {
      color: '#4f46e5',
      opacity: 0.4
    }
  };

  gradientBackgroundConfig: BackgroundConfig = {
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    opacity: 1
  };

  // Parallax elements configuration
  parallaxElements: ParallaxElement[] = [
    {
      id: 'main-title',
      speed: 0.3,
      direction: 'vertical',
      initialOffset: {x: 0, y: 0}
    },
    {
      id: 'floating-element',
      speed: 0.5,
      direction: 'vertical',
      initialOffset: {x: 0, y: 0}
    },
    {
      id: 'background-shapes',
      speed: 0.2,
      direction: 'both',
      initialOffset: {x: 0, y: 0}
    }
  ];

  constructor(private cd: ChangeDetectorRef) {

  }

  // Method to switch background types
  switchToVideo(): void {
    this.backgroundConfig = {
      type: 'video',
      source: 'assets/videos/background-video.mp4',
      fallbackImage: 'assets/images/fallback-bg.jpg',
      opacity: 0.8,
      overlay: {
        color: '#000000',
        opacity: 0.3
      }
    };
  }

  toggleBackground(): void {

    console.warn('TOGGLE BACKGROUND');
    this.isDark = !this.isDark;
    if (this.isDark) {
      this.imageSrc = 'assets/images/backgrounds/night.webp';
    } else {
      this.imageSrc = 'assets/images/backgrounds/day.webp';
    }
    this.cd.detectChanges();
  }

  switchToImage(): void {
    this.backgroundConfig = this.imageBackgroundConfig;
  }

  switchToGradient(): void {
    this.backgroundConfig = this.gradientBackgroundConfig;
  }
}
