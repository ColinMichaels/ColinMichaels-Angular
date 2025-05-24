import {Component} from '@angular/core';
import {ScrollEffectsModule} from '../../modules/scroll/scroll-effects.module';


@Component({
  selector: 'app-main-header',
  imports: [
    ScrollEffectsModule
  ],
  template: `
    <header class="mx-auto px-2 sm:px-4 lg:px-6 py-2 text-center">
      <h1 class="text-4xl sm:text-5xl md:text-5xl font-bold "
          appScrollClassToggle
          exitClasses="text-4xl sm:text-5xl md:text-5xl text-white"
          enterClasses="text-lg text-teal-500/50">
      Colin Michaels
    </h1>
      <h2 class="md:text-2xl text-emerald-400 text-xl font-mono" appHideOnScroll><a
      href="https://en.wikipedia.org/wiki/Web_application_development" rel="nofollow" target="_blank"
      class="hover:underline" title="Application Developer">Developer</a></h2>
  </header>
  `
})
export class MainHeaderComponent {}
