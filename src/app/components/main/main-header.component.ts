import {Component} from '@angular/core';

@Component({
  selector: 'app-main-header',
  imports: [],
  template: `
    <header class="mx-auto px-2 sm:px-4 lg:px-6 py-2 text-center">
    <h1 class="text-3xl sm:text-4xl md:text-4xl font-bold text-white">
      Colin Michaels
    </h1>
    <h2 class="text-base  md:text-xl text-blue-500 font-mono"><a
      href="https://en.wikipedia.org/wiki/Web_application_development" rel="nofollow" target="_blank"
      class="hover:underline" title="Application Developer">App Developer</a></h2>
  </header>
  `
})
export class MainHeaderComponent {}
