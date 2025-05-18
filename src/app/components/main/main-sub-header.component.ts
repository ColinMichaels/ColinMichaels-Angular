import {Component} from '@angular/core';

@Component({
  selector: 'app-main-sub-header',
  imports: [],
  template: `
    <div class="mx-auto text-center py-4 bg-zinc-700/50  shadow-inner shadow-black/50">
      <section class="w-full mx-auto text-base sm:text-lg md:text-xl leading-relaxed   px-4 sm:px-6 lg:px-6 sm:w-4/5 xs:px-4 md:w-2/3  space-y-4">
        <h3 class="text-pretty text-green-500">Thriving at the intersection of technology and creativity.</h3>
        <p class="text-sm text-white/90">With a strong foundation in software development, Specialize in crafting innovative
          solutions that not only meet functional requirements but also deliver engaging user experiences.</p>
      </section>
    </div>
  `
})
export class MainSubHeaderComponent {}
