// scroll-effects-playground.component.ts
import {Component} from '@angular/core';
import {ScrollEffectsModule} from '../scroll-effects.module';


@Component({
  selector: 'app-scroll-effects-playground',
  imports: [ScrollEffectsModule],
  standalone: true,
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div class="max-w-4xl mx-auto px-4 py-8 space-y-12">
        <section class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
          <h2 class="text-xl font-semibold mb-4">Sticky Header Demo</h2>
          <div
            appSticky
            [stickyTop]="'0px'"
            [zIndex]="'50'"
            class="bg-blue-500 text-white px-4 py-2 shadow fixed top-0 w-full"
          >
            I stick to the top when scrolling
          </div>
          <div class="mt-16 h-64 bg-gray-100 dark:bg-gray-800 rounded"></div>
        </section>

        <section class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
          <h2 class="text-xl font-semibold mb-4">Hide on Scroll Demo</h2>
          <div
            appHideOnScroll
            [scrollThreshold]="150"
            hideClass="-translate-y-full opacity-0"
            class="bg-red-500 text-white px-4 py-2 fixed top-0 w-full transition-all duration-300 z-40"
          >
            I hide when you scroll past 150px
          </div>
          <div class="mt-20 h-64 bg-gray-100 dark:bg-gray-800 rounded"></div>
        </section>

        <section class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
          <h2 class="text-xl font-semibold mb-4">Scroll Class Toggle Demo</h2>
          <div
            appScrollClassToggle
            [scrollThreshold]="300"
            enterClasses="bg-green-600 text-white translate-y-0 opacity-100"
            exitClasses="bg-white text-black"
            flyIn="top"
            leaveTo="bottom"
            class="transform opacity-0 translate-y-full transition-all duration-500 ease-in-out p-4 rounded"
          >
            I animate in when you scroll past 300px
          </div>
          <div class="mt-20 h-[500px] bg-gray-100 dark:bg-gray-800 rounded"></div>
        </section>
      </div>
    </div>
  `,
  styles: []
})
export class ScrollEffectsPlaygroundComponent {
}
