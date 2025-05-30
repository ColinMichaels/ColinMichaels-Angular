import {Component} from '@angular/core';
import {ScrollEffectsModule} from '../../modules/scroll/scroll-effects.module';

@Component({
  selector: 'app-main-sub-header',
  imports: [
    ScrollEffectsModule
  ],
  template: `
    <div class="container mx-auto text-center py-4 px-8"
         appScrollClassToggle
         enterClasses="blur-2xl opset-0"
         exitClasses="blur-0 opacity-100"
         [scrollThreshold]="50">
      <section class=" text-base sm:text-lg md:text-xl leading-relaxed   space-y-4">
        <h3 class="text-white text-lg md:text-xl
text-center tracking-tight">Thriving at the intersection of technology and creativity.</h3>
        <p class="text-sm text-emerald-400">With a strong foundation in software development, Specialize in crafting
          innovative solutions that not only meet functional requirements but also deliver engaging user
          experiences.</p>
      </section>
    </div>
  `
})
export class MainSubHeaderComponent {

}
