import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../../app-route-paths';
import {MidiSequencerComponent} from '../../../components/game/apps/music-apps/midi-sequencer/midi-sequencer.component';
import {PatchEditorComponent} from '../../../components/game/apps/music-apps/patch-editor/patch-editor.component';
import {SpaceXComponent} from '../../../components/game/apps/space-x/space-x.component';
import {TailwindPreviewComponent} from '../../../components/game/apps/tailwind-preview/tailwind-preview.component';
import {TaskAppComponent} from '../../../components/game/apps/task-app/task-app.component';
import {TooltipExamplesComponent} from '../../../components/game/apps/tooltip-examples/tooltip-examples.component';
import {WeatherComponent} from '../../../components/game/apps/weather/weather.component';
import {
  WindowHeaderComponent
} from '../../../components/game/templates/app-window/window-header/window-header.component';
import {ProjectItemComponent} from '../../../components/main/project-item/project-item.component';

interface LabEntry {
  title: string;
  description: string;
  route: string;
  status: string;
  action: string;
}

type ComponentLabId =
  'space-x'
  | 'weather'
  | 'patch-builder'
  | 'midi-sequencer'
  | 'task-app'
  | 'tooltip-examples'
  | 'tailwind-preview';

interface ComponentLabEntry {
  id: ComponentLabId;
  title: string;
  description: string;
  windowTitle: string;
}

@Component({
  selector: 'app-labs-index',
  imports: [
    MidiSequencerComponent,
    PatchEditorComponent,
    ProjectItemComponent,
    RouterLink,
    SpaceXComponent,
    TailwindPreviewComponent,
    TaskAppComponent,
    TooltipExamplesComponent,
    WeatherComponent,
    WindowHeaderComponent,
  ],
  template: `
    <main class="min-h-screen bg-neutral-950 pb-16 text-zinc-100">
      <section class="relative isolate overflow-hidden">
        <img
          src="/assets/images/backgrounds/night.webp"
          alt="Night landscape background"
          class="absolute inset-0 -z-20 h-full w-full object-cover"
        >
        <div class="absolute inset-0 -z-10 bg-neutral-950/82"></div>

        <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav class="flex items-center justify-between text-sm text-zinc-400">
            <a routerLink="/" class="hover:text-zinc-100">Home</a>
            <a routerLink="/blog" class="hover:text-zinc-100">Blog</a>
          </nav>

          <header class="max-w-3xl py-16">
            <p class="text-sm uppercase tracking-[0.3em] text-amber-300">Labs</p>
            <h1 class="mt-5 text-5xl font-semibold leading-none text-white sm:text-6xl">Experimental Systems</h1>
            <p class="mt-6 text-lg leading-8 text-zinc-300">
              Isolated visual, interaction, and interface experiments, including the project demos that used to live on
              the homepage.
            </p>
          </header>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="border-b border-white/10 pb-6">
          <p class="text-sm uppercase tracking-[0.28em] text-amber-300">Standalone</p>
          <h2 class="mt-3 text-3xl font-semibold text-zinc-50">Full-screen experiments</h2>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          @for (lab of standaloneLabs; track lab.title) {
            <article class="border border-white/10 bg-zinc-900 p-5">
              <p class="text-xs uppercase tracking-[0.24em] text-amber-300">{{ lab.status }}</p>
              <h3 class="mt-4 text-2xl font-semibold text-zinc-50">{{ lab.title }}</h3>
              <p class="mt-3 text-sm leading-6 text-zinc-400">{{ lab.description }}</p>
              <a
                [routerLink]="lab.route"
                class="mt-6 inline-flex border border-amber-300 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-300 hover:text-neutral-950"
              >
                {{ lab.action }}
              </a>
            </article>
          }
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="border-b border-white/10 pb-6">
          <p class="text-sm uppercase tracking-[0.28em] text-cyan-300">Component Labs</p>
          <h2 class="mt-3 text-3xl font-semibold text-zinc-50">Wrapped project demos</h2>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            These experiments are embedded in the page with their original project wrappers because they are component
            demos, not independent full-screen routes.
          </p>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(17rem,0.34fr)_minmax(0,1fr)]">
          <div class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            @for (lab of componentLabs; track lab.id) {
              <button
                type="button"
                class="border border-white/10 bg-zinc-900 p-4 text-left transition hover:border-cyan-300/80 hover:bg-zinc-800"
                [class.border-cyan-300]="activeDemoId === lab.id"
                [class.bg-cyan-300]="activeDemoId === lab.id"
                [class.text-neutral-950]="activeDemoId === lab.id"
                [class.text-zinc-100]="activeDemoId !== lab.id"
                [attr.aria-pressed]="activeDemoId === lab.id"
                (click)="openComponentLab(lab.id)"
              >
                <span
                  class="block text-xs uppercase tracking-[0.2em]"
                  [class.text-cyan-200]="activeDemoId !== lab.id"
                  [class.text-neutral-700]="activeDemoId === lab.id"
                >
                  Component Lab
                </span>
                <span class="mt-3 block text-xl font-semibold">{{ lab.title }}</span>
                <span
                  class="mt-2 block text-sm leading-6"
                  [class.text-zinc-400]="activeDemoId !== lab.id"
                  [class.text-neutral-700]="activeDemoId === lab.id"
                >
                  {{ lab.description }}
                </span>
              </button>
            }
          </div>

          <div class="min-w-0">
            @if (activeComponentLab; as lab) {
              <app-project-item [title]="lab.title" [description]="lab.description">
                <div class="w-full overflow-hidden rounded-b-lg border border-white/10 bg-black/30">
                  <app-window-header [title]="lab.windowTitle"></app-window-header>
                  <div class="max-h-[74vh] overflow-auto">
                    @switch (lab.id) {
                      @case ('space-x') {
                        @defer (when activeDemoId === 'space-x') {
                          <app-space-x></app-space-x>
                        } @placeholder {
                          <p class="p-5 text-sm text-zinc-400">Loading SpaceX lab...</p>
                        }
                      }
                      @case ('weather') {
                        @defer (when activeDemoId === 'weather') {
                          <app-weather></app-weather>
                        } @placeholder {
                          <p class="p-5 text-sm text-zinc-400">Loading Weather lab...</p>
                        }
                      }
                      @case ('patch-builder') {
                        @defer (when activeDemoId === 'patch-builder') {
                          <app-patch-editor></app-patch-editor>
                        } @placeholder {
                          <p class="p-5 text-sm text-zinc-400">Loading Patch Studio...</p>
                        }
                      }
                      @case ('midi-sequencer') {
                        @defer (when activeDemoId === 'midi-sequencer') {
                          <app-midi-sequencer></app-midi-sequencer>
                        } @placeholder {
                          <p class="p-5 text-sm text-zinc-400">Loading MIDI Sequencer...</p>
                        }
                      }
                      @case ('task-app') {
                        @defer (when activeDemoId === 'task-app') {
                          <app-task-app></app-task-app>
                        } @placeholder {
                          <p class="p-5 text-sm text-zinc-400">Loading Task lab...</p>
                        }
                      }
                      @case ('tooltip-examples') {
                        @defer (when activeDemoId === 'tooltip-examples') {
                          <app-tooltip-examples></app-tooltip-examples>
                        } @placeholder {
                          <p class="p-5 text-sm text-zinc-400">Loading Tooltip lab...</p>
                        }
                      }
                      @case ('tailwind-preview') {
                        @defer (when activeDemoId === 'tailwind-preview') {
                          <app-tailwind-preview></app-tailwind-preview>
                        } @placeholder {
                          <p class="p-5 text-sm text-zinc-400">Loading Tailwind lab...</p>
                        }
                      }
                    }
                  </div>
                </div>
              </app-project-item>
            } @else {
              <div class="flex min-h-80 items-center justify-center border border-dashed border-white/15 bg-zinc-900/40 p-8 text-center">
                <div>
                  <p class="text-sm uppercase tracking-[0.24em] text-zinc-500">Component Labs</p>
                  <p class="mt-3 text-2xl font-semibold text-zinc-100">Choose a lab to mount its demo.</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    </main>
  `,
})
export class LabsIndexComponent {
  protected activeDemoId: ComponentLabId | null = null;

  protected readonly standaloneLabs: readonly LabEntry[] = [
    {
      title: 'Full Screen Backgrounds',
      description: 'A prank scroll playground for image, video, overlay, parallax, and one very predictable payoff.',
      route: `/${PATH_NAMES.FS_BACKGROUND}`,
      status: 'Available',
      action: 'Open Lab',
    },
  ];

  protected readonly componentLabs: readonly ComponentLabEntry[] = [
    {
      id: 'space-x',
      title: 'SpaceX Launches',
      description: 'API-backed launch, rocket, launchpad, and crew data exploration from the old homepage.',
      windowTitle: 'Space X Api Demo',
    },
    {
      id: 'weather',
      title: 'Weather App',
      description: 'A compact current-condition and forecast UI experiment.',
      windowTitle: 'Weather App',
    },
    {
      id: 'patch-builder',
      title: 'Patch Studio',
      description: 'A standalone sound-generator editor for designing patches, testing controllers, and comparing audio drivers.',
      windowTitle: 'Patch Studio',
    },
    {
      id: 'midi-sequencer',
      title: 'MIDI Sequencer',
      description: 'A standalone multi-channel controller for building tempo-synced note loops and routing them to generators.',
      windowTitle: 'MIDI Sequencer',
    },
    {
      id: 'task-app',
      title: 'Task App',
      description: 'A local task tracker prototype for status, archive, completion, and lightweight interaction flows.',
      windowTitle: 'Task App',
    },
    {
      id: 'tooltip-examples',
      title: 'Tooltip Examples',
      description: 'Tooltip, notification, color, shape, and placement examples for shared interface primitives.',
      windowTitle: 'Tooltips & Notifications',
    },
    {
      id: 'tailwind-preview',
      title: 'Tailwind Class Generator',
      description: 'A utility-class playground for generating and previewing Tailwind text, background, and gradient combinations.',
      windowTitle: 'Tailwind Class Generator',
    },
  ];

  protected get activeComponentLab(): ComponentLabEntry | undefined {
    return this.componentLabs.find(lab => lab.id === this.activeDemoId);
  }

  protected openComponentLab(id: ComponentLabId): void {
    this.activeDemoId = id;
  }
}
