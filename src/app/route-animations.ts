import { trigger, transition, style, animate, query, group } from '@angular/animations';

export const fadeToBlackAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    group([
      // Fade out the current route
      query(':leave', [
        style({ opacity: 1 }),
        animate('300ms ease-out', style({ opacity: 0, background: 'black' }))
      ], { optional: true }),

      // Fade in the new route
      query(':enter', [
        style({ opacity: 0, background: 'black' }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ], { optional: true })
    ])
  ])
]);
