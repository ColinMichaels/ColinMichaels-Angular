import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

export type PostPackageImportStage =
  | 'checking'
  | 'uploading'
  | 'processing'
  | 'applying'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface PostPackageImportProgress {
  stage: PostPackageImportStage;
  message: string;
  detail?: string;
  progress: number | null;
  completedImages: number;
  totalImages: number;
  currentFile?: string;
}

@Component({
  selector: 'app-post-package-import-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="space-y-3 border bg-zinc-900/60 p-4"
      [class.border-cyan-500/50]="isActive"
      [class.border-emerald-500/50]="progress.stage === 'complete'"
      [class.bg-emerald-950/20]="progress.stage === 'complete'"
      [class.border-red-500/50]="progress.stage === 'error'"
      [class.bg-red-950/20]="progress.stage === 'error'"
      [class.border-amber-500/50]="progress.stage === 'cancelled'"
      [attr.data-stage]="progress.stage"
      [attr.aria-busy]="isActive"
      data-testid="post-package-import-progress"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 space-y-1">
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em]"
            [class.text-cyan-300]="isActive"
            [class.text-emerald-300]="progress.stage === 'complete'"
            [class.text-red-300]="progress.stage === 'error'"
            [class.text-amber-300]="progress.stage === 'cancelled'"
          >
            {{ stageLabel }}
          </p>
          <p class="text-sm font-medium leading-5 text-zinc-100">{{ progress.message }}</p>
          @if (progress.detail) {
            <p class="text-xs leading-5 text-zinc-400" data-testid="post-package-import-detail">{{ progress.detail }}</p>
          }
        </div>

        @if (progress.progress !== null) {
          <span class="shrink-0 font-mono text-sm text-zinc-300">{{ roundedProgress }}%</span>
        }
      </div>

      <div class="space-y-2">
        <div
          class="h-2 overflow-hidden bg-zinc-800"
          role="progressbar"
          aria-label="Post package import progress"
          aria-valuemin="0"
          aria-valuemax="100"
          [attr.aria-valuenow]="progress.progress === null ? null : roundedProgress"
          [attr.aria-valuetext]="progressValueText"
        >
          @if (progress.progress === null) {
            @if (isActive) {
              <div class="package-progress-indeterminate h-full w-1/3 bg-cyan-300 motion-reduce:animate-none"></div>
            }
          } @else {
            <div
              class="h-full transition-[width,background-color] duration-200 motion-reduce:transition-none"
              [class.bg-cyan-300]="isActive"
              [class.bg-emerald-300]="progress.stage === 'complete'"
              [class.bg-red-300]="progress.stage === 'error'"
              [class.bg-amber-300]="progress.stage === 'cancelled'"
              [style.width.%]="roundedProgress"
            ></div>
          }
        </div>

        @if (progress.totalImages > 0) {
          <div
            class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-zinc-400"
            data-testid="post-package-import-image-count"
          >
            <span>{{ progress.completedImages }} of {{ progress.totalImages }} images ready</span>
            @if (progress.currentFile) {
              <span class="max-w-full truncate font-mono text-zinc-400" [title]="progress.currentFile">
                {{ progress.currentFile }}
              </span>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .package-progress-indeterminate {
      animation: package-progress-scan 1.1s ease-in-out infinite alternate;
    }

    @keyframes package-progress-scan {
      from {
        translate: -100% 0;
      }

      to {
        translate: 300% 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .package-progress-indeterminate {
        animation: none;
        translate: 100% 0;
      }
    }
  `],
})
export class PostPackageImportProgressComponent {
  @Input({required: true}) progress!: PostPackageImportProgress;

  protected get isActive(): boolean {
    return ['checking', 'uploading', 'processing', 'applying'].includes(this.progress.stage);
  }

  protected get progressValueText(): string {
    if (this.progress.progress === null) {
      return this.stageAnnouncement;
    }

    return `${this.stageLabel}: ${this.roundedProgress} percent; ${this.progress.completedImages} of ${this.progress.totalImages} images ready`;
  }

  protected get stageAnnouncement(): string {
    switch (this.progress.stage) {
      case 'checking':
        return 'Checking the post package.';
      case 'uploading':
        return 'Uploading post package media.';
      case 'processing':
        return 'Processing uploaded post package media.';
      case 'applying':
        return 'Preparing the imported draft.';
      case 'complete':
        return 'Post package import complete. The draft is loaded but has not been saved or published.';
      case 'error':
        return 'Post package import failed. Review the status details.';
      case 'cancelled':
        return 'Post package import canceled. The current draft was not changed.';
    }
  }

  protected get roundedProgress(): number {
    return Math.round(Math.min(100, Math.max(0, this.progress.progress ?? 0)));
  }

  protected get stageLabel(): string {
    switch (this.progress.stage) {
      case 'checking':
        return 'Checking package';
      case 'uploading':
        return 'Uploading media';
      case 'processing':
        return 'Processing media';
      case 'applying':
        return 'Preparing draft';
      case 'complete':
        return 'Package import complete';
      case 'error':
        return 'Package import stopped';
      case 'cancelled':
        return 'Package import canceled';
    }
  }
}
