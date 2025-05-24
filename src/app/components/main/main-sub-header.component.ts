import {Component} from '@angular/core';
import {ScrollEffectsModule} from '../../modules/scroll/scroll-effects.module';

@Component({
  selector: 'app-main-sub-header',
  imports: [
    ScrollEffectsModule
  ],
  template: `
    <div class="container mx-auto text-center py-4"
         appScrollClassToggle
         enterClasses="blur-2xl"
         exitClasses="blur-0"
         [scrollThreshold]="50">
      <section class="w-full mx-auto text-base sm:text-lg md:text-xl leading-relaxed   px-4 sm:px-6 lg:px-6 sm:w-4/5 xs:px-4 md:w-2/3  space-y-4">
        <h3 class="text-white text-lg md:text-xl
text-center tracking-tight">Thriving at the intersection of technology and creativity.</h3>
        <p class="text-sm text-emerald-400">With a strong foundation in software development, Specialize in crafting
          innovative
          solutions that not only meet functional requirements but also deliver engaging user experiences.</p>
      </section>
    </div>
  `
})
export class MainSubHeaderComponent {

}
