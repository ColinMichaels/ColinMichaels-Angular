import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {OS_MIN_VIEWPORT_HEIGHT, OS_MIN_VIEWPORT_WIDTH} from '../../guards/os-device.guard';

@Component({
  selector: 'app-os-device-required',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="relative isolate flex min-h-[calc(100vh-4rem)] items-center overflow-hidden bg-neutral-950 px-4 py-12 text-white sm:px-6">
      <div class="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_42%)]"></div>
      <div class="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]"></div>

      <section class="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-neutral-950/90 p-6 shadow-2xl shadow-black/50 backdrop-blur sm:p-10">
        <p class="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Desktop workspace</p>
        <h1 class="mt-4 text-balance text-4xl font-black tracking-tight sm:text-5xl">The OS needs a little more room.</h1>
        <p class="mt-5 max-w-xl text-base leading-7 text-neutral-300 sm:text-lg">
          This interactive desktop uses movable windows, a dock, and hover controls. It is protected on phones, touch-only devices, and undersized browser windows so the experience does not load in a layout it cannot support.
        </p>

        <div class="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-neutral-300">
          Open this page on a laptop or desktop with a viewport of at least
          <strong class="font-semibold text-white">{{ minimumWidth }} × {{ minimumHeight }}</strong>
          and a mouse or trackpad.
        </div>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            [routerLink]="['/', pathNames.BLOG]"
            class="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-300 px-6 text-sm font-bold uppercase tracking-[0.16em] text-neutral-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          >
            Browse the blog
          </a>
          <a
            routerLink="/"
            class="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:border-white/35 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Return home
          </a>
        </div>
      </section>
    </main>
  `,
})
export class OsDeviceRequiredComponent {
  protected readonly minimumWidth = OS_MIN_VIEWPORT_WIDTH;
  protected readonly minimumHeight = OS_MIN_VIEWPORT_HEIGHT;
  protected readonly pathNames = PATH_NAMES;
}
