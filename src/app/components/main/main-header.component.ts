import {Component} from '@angular/core';
import {ScrollEffectsModule} from '../../modules/scroll/scroll-effects.module';


@Component({
  selector: 'app-main-header',
  imports: [
    ScrollEffectsModule
  ],
  template: `
    <header class="mx-auto text-center">
      <h1 class="text-4xl sm:text-5xl md:text-5xl font-bold "
          appScrollClassToggle
          exitClasses="text-4xl sm:text-5xl md:text-5xl text-white mt-2"
          enterClasses="text-sm text-teal-500/30 mt-2 absolute top-0 left-2">
      Colin Michaels
    </h1>
      <h2 class="md:text-2xl text-emerald-400 text-xl font-mono" appHideOnScroll><a
      href="https://en.wikipedia.org/wiki/Web_application_development" rel="nofollow" target="_blank"
      class="hover:underline" title="Application Developer">Developer</a></h2>
  </header>
  `
})
export class MainHeaderComponent {}
