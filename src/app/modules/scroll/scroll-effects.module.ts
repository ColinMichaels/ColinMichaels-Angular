// scroll-effects.module.ts
import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {StickyDirective} from './directives/sticky.directive';
import {HideOnScrollDirective} from './directives/hide-on-scroll.directive';
import {ScrollClassToggleDirective} from './directives/scroll-class-toggle.directive';

/**
 * The ScrollEffectsModule is an Angular module that provides directives
 * to enhance the user experience with scroll-based visual effects.
 *
 * This module includes the following directives:
 *
 * - StickyDirective: A directive that makes an element sticky upon scrolling.
 * - HideOnScrollDirective: A directive that hides an element when a scrolling action is detected.
 * - ScrollClassToggleDirective: A directive that toggles CSS classes based on scroll position.
 *
 *  See Each directive for usage and examples
 */
@NgModule({
  declarations: [
    StickyDirective,
    HideOnScrollDirective,
    ScrollClassToggleDirective
  ],
  imports: [CommonModule],
  exports: [
    StickyDirective,
    HideOnScrollDirective,
    ScrollClassToggleDirective
  ]
})
export class ScrollEffectsModule {
}
